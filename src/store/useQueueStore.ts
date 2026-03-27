import { create } from "zustand";
import { analyzeFile, AnalyzedFile, ActionMode } from "@/lib/pipeline/FileAnalyzer";
import { StorageManager } from "@/lib/pipeline/StorageManager";
import { processMedia } from "@/lib/engine/MediaEngine";
import { processDocument } from "@/lib/engine/DocumentEngine";
import { processSpreadsheet } from "@/lib/engine/SpreadsheetEngine";
import { processImage } from "@/lib/engine/ImageEngine";
import { processAI } from "@/lib/engine/AIEngine";
import { processPresentation } from "@/lib/engine/PresentationEngine";
import { calculateSizeMetrics } from "@/lib/pipeline/compressionTargets";

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
  inputBytes?: number;
  outputBytes?: number;
  reductionPercent?: number;
  outputRatioPercent?: number;
  processMs?: number;
  completedAt?: string;
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
        const start = performance.now();
        const inputBytes = task.analyzed.originalFile.size;

        const finalize = async (url: string, extension: string) => {
         const outputBlob = await fetch(url).then((res) => res.blob());
         const metrics = calculateSizeMetrics(inputBytes, outputBlob.size);
         const isCompressMode = task.actionMode === "compress";
         setTaskStatus(task.id, "completed", {
          outputUrl: url,
          outputExtension: extension,
          inputBytes,
          outputBytes: outputBlob.size,
          reductionPercent: isCompressMode ? metrics.reductionPercent : undefined,
          outputRatioPercent: isCompressMode ? metrics.outputRatioPercent : undefined,
          processMs: Math.round(performance.now() - start),
          completedAt: new Date().toISOString(),
          progress: 100,
         });
        };

        // Override specifically for the AI Transcription/OCR pipeline targets
        if (task.actionMode === "ai_extract") {
          if (task.analyzed.category === "document") {
              const { url, extension } = await processDocument(
                 task.id, actualFile!, task.analyzed.extension, task.actionMode, task.actionTarget || "", 
                 (progress) => updateTaskProgress(task.id, progress)
              );
            await finalize(url, extension);
          } else if (task.analyzed.category === "presentation") {
            const { url, extension } = await processPresentation(
             task.id, actualFile!, task.analyzed.extension, task.actionMode, task.actionTarget || "",
             (progress) => updateTaskProgress(task.id, progress)
            );
            await finalize(url, extension);
          } else if (task.analyzed.category === "spreadsheet") {
            const { url, extension } = await processSpreadsheet(
             task.id, actualFile!, task.analyzed.extension, task.actionMode, task.actionTarget || "",
             (progress) => updateTaskProgress(task.id, progress)
            );
            await finalize(url, extension);
          } else if (task.analyzed.category === "video" || task.analyzed.category === "audio") {
            const { url, extension } = await processMedia(
             task.id,
             actualFile,
             task.analyzed.extension,
             task.actionMode,
             task.actionTarget || "",
             (progress) => updateTaskProgress(task.id, progress)
            );
            await finalize(url, extension);
           } else {
              const { url, extension } = await processAI(
                 task.id, actualFile!, task.analyzed.extension, task.actionMode, task.actionTarget || "", 
                 (progress) => updateTaskProgress(task.id, progress)
              );
            await finalize(url, extension);
           }
        } else if (task.analyzed.category === "video" || task.analyzed.category === "audio") {
          const { url, extension } = await processMedia(
            task.id, 
            actualFile,
            task.analyzed.extension,
            task.actionMode || "convert", 
            task.actionTarget || "", 
            (progress) => updateTaskProgress(task.id, progress)
          );
          await finalize(url, extension);
        } else if (task.analyzed.category === "document") {
          const { url, extension } = await processDocument(
            task.id, actualFile!, task.analyzed.extension, task.actionMode || "convert", task.actionTarget || "", 
            (progress) => updateTaskProgress(task.id, progress)
          );
          await finalize(url, extension);
        } else if (task.analyzed.category === "spreadsheet") {
          const { url, extension } = await processSpreadsheet(
            task.id, actualFile!, task.analyzed.extension, task.actionMode || "convert", task.actionTarget || "", 
            (progress) => updateTaskProgress(task.id, progress)
          );
          await finalize(url, extension);
        } else if (task.analyzed.category === "image") {
          const { url, extension } = await processImage(
            task.id, actualFile!, task.analyzed.extension, task.actionMode || "convert", task.actionTarget || "", 
            (progress) => updateTaskProgress(task.id, progress)
          );
          await finalize(url, extension);
        } else if (task.analyzed.category === "presentation") {
          const { url, extension } = await processPresentation(
            task.id, actualFile!, task.analyzed.extension, task.actionMode || "convert", task.actionTarget || "", 
            (progress) => updateTaskProgress(task.id, progress)
          );
          await finalize(url, extension);
        } else {
          // Fallback
          setTaskStatus(task.id, "error", { error: "Target conversion path queued for subsequent phase. Format unsupported." });
        }
      } catch (err: unknown) {
        console.error(err);
        const message = err instanceof Error ? err.message : "Unknown processing error";
        setTaskStatus(task.id, "error", { error: message });
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
