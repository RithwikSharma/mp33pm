import { create } from "zustand";
import { analyzeFile, AnalyzedFile, ActionMode } from "@/lib/pipeline/FileAnalyzer";
import { StorageManager } from "@/lib/pipeline/StorageManager";

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
    const { tasks } = get();
    // Only lock in and route files that are currently staged
    const stagedTasks = tasks.filter(t => t.status === "staged");

    for (const task of stagedTasks) {
      // Move to routing
      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === task.id ? { ...t, status: "routing" } : t
        ),
      }));

      // Smart Route to OPFS if heavy
      if (task.analyzed.isHeavy && task.originalFile) {
        console.log(`[Pipeline] File ${task.analyzed.originalFile.name} routing to OPFS...`);
        const success = await StorageManager.saveToOPFS(task.originalFile, task.id);
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === task.id ? { ...t, originalFile: success ? null : t.originalFile, status: "queued" } : t
          ),
        }));
      } else {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === task.id ? { ...t, status: "queued" } : t
          ),
        }));
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
