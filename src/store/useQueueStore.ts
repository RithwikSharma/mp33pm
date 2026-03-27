import { create } from "zustand";
import { analyzeFile, AnalyzedFile, ActionMode } from "@/lib/pipeline/FileAnalyzer";
import { StorageManager } from "@/lib/pipeline/StorageManager";
import { processMedia } from "@/lib/engine/MediaEngine";

export type FileTask = {
  id: string;
  originalFile: File | null;
  analyzed: AnalyzedFile;
  status: "staged" | "routing" | "queued" | "processing" | "completed" | "error";
  progress: number;
  // User Configured Settings from Staging UI
  actionMode?: ActionMode;
  actionTarget?: string;
  outputUrl?: string;
  outputExtension?: string;
  error?: string;
};

interface QueueStore {
  tasks: FileTask[];
  stageFile: (file: File) => void;
  updateStagedAction: (id: string, mode: ActionMode, target: string) => void;
  executePipeline: () => Promise<void>;
  removeTask: (id: string) => void;
  updateTaskProgress: (id: string, progress: number) => void;
  setTaskStatus: (id: string, status: FileTask["status"], extra?: Partial<FileTask>) => void;
  clearCompleted: () => void;
}

export const useQueueStore = create<QueueStore>((set, get) => ({
  tasks: [],

  stageFile: (file) => {
    const analyzed = analyzeFile(file);
    const id = crypto.randomUUID();
    
    // Automatically set default action/target for UI
    const defaultMode = analyzed.availableModes[0];
    const defaultTarget = analyzed.modeTargets[defaultMode]?.[0] || "";

    set((state) => ({
      tasks: [
        ...state.tasks,
        {
          id,
          originalFile: file,
          analyzed,
          status: "staged", // Intercepted so UI can gather params
          progress: 0,
          actionMode: defaultMode,
          actionTarget: defaultTarget
        },
      ],
    }));
  },

  updateStagedAction: (id, mode, target) => {
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, actionMode: mode, actionTarget: target } : t
      ),
    }));
  },

  executePipeline: async () => {
    const { tasks, updateTaskProgress, setTaskStatus } = get();
    const stagedTasks = tasks.filter(t => t.status === "staged");

    for (const task of stagedTasks) {
      setTaskStatus(task.id, "routing");

      let actualFile = task.originalFile;
      if (task.analyzed.isHeavy && actualFile) {
        console.log(`[Pipeline] File ${task.analyzed.originalFile?.name} routing to OPFS...`);
        const success = await StorageManager.saveToOPFS(actualFile, task.id);
        if (success) actualFile = null; 
      }

      setTaskStatus(task.id, "processing", { originalFile: actualFile });

      try {
        if (task.analyzed.category === "video" || task.analyzed.category === "audio") {
          const { url, extension } = await processMedia(
            task.id, 
            actualFile,
            task.analyzed.extension,
            task.actionMode || "convert", 
            task.actionTarget || "", 
            (progress) => updateTaskProgress(task.id, progress)
          );
          setTaskStatus(task.id, "completed", { outputUrl: url, outputExtension: extension, progress: 100 });
        } else {
          // Fallback for document/spreadsheet until their engines hook in
          setTaskStatus(task.id, "error", { error: "Engine for this category explicitly queued for next Phase." });
        }
      } catch (err: any) {
        console.error(err);
        setTaskStatus(task.id, "error", { error: err.message });
      }
    }
  },

  removeTask: (id) => {
    StorageManager.removeFromOPFS(id);
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
    }));
  },

  updateTaskProgress: (id, progress) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, progress } : t
      ),
    })),

  setTaskStatus: (id, status, extra) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, status, ...extra } : t
      ),
    })),

  clearCompleted: () =>
    set((state) => ({
      tasks: state.tasks.filter((t) => t.status !== "completed"),
    })),
}));
