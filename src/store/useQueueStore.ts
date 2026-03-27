import { create } from "zustand";

export type FileTask = {
  id: string;
  file: File;
  status: "queued" | "processing" | "completed" | "error";
  progress: number;
  outputUrl?: string;
  error?: string;
};

interface QueueStore {
  tasks: FileTask[];
  addTask: (file: File) => void;
  removeTask: (id: string) => void;
  updateTaskProgress: (id: string, progress: number) => void;
  setTaskStatus: (id: string, status: FileTask["status"], extra?: Partial<FileTask>) => void;
  clearCompleted: () => void;
}

export const useQueueStore = create<QueueStore>((set) => ({
  tasks: [],

  addTask: (file) =>
    set((state) => ({
      tasks: [
        ...state.tasks,
        {
          id: crypto.randomUUID(),
          file,
          status: "queued",
          progress: 0,
        },
      ],
    })),

  removeTask: (id) =>
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
    })),

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
