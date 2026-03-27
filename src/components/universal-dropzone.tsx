"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CloudUpload, Cpu, ShieldCheck, Play, Settings2, Trash2 } from "lucide-react";
import { useQueueStore } from "@/store/useQueueStore";
import { cn } from "@/lib/utils";
import { ActionMode } from "@/lib/pipeline/FileAnalyzer";

export function UniversalDropzone() {
  const [isDragging, setIsDragging] = useState(false);
  const stageFile = useQueueStore((state) => state.stageFile);
  const tasks = useQueueStore((state) => state.tasks);
  const executePipeline = useQueueStore((state) => state.executePipeline);
  const updateStagedAction = useQueueStore((state) => state.updateStagedAction);
  const removeTask = useQueueStore((state) => state.removeTask);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const files = Array.from(e.dataTransfer.files);
        for (const file of files) {
          stageFile(file);
        }
      }
    },
    [stageFile]
  );

  const hasStagedFiles = tasks.some(t => t.status === "staged");

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center justify-center p-4 xl:p-0">
      <motion.div
        className={cn(
          "w-full h-80 sm:h-96 rounded-2xl border flex flex-col items-center justify-center relative overflow-hidden transition-all duration-200 cursor-pointer bg-neutral-900/30",
          isDragging
            ? "border-neutral-400 border-solid bg-neutral-900"
            : "border-neutral-800 border-dashed hover:border-neutral-600 hover:bg-neutral-900/80"
        )}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        whileHover={{ scale: 1.005 }}
        whileTap={{ scale: 0.995 }}
        onClick={() => document.getElementById("file-upload")?.click()}
      >
        
        <div className="z-10 flex flex-col items-center gap-6 group pointer-events-none">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: isDragging ? 1.05 : 1, y: isDragging ? -5 : 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="flex flex-col items-center"
          >
            <div className="p-4 rounded-xl bg-neutral-800/50 border border-neutral-700/50 group-hover:bg-neutral-800 transition-colors duration-200">
              <CloudUpload className={cn("w-10 h-10 transition-colors duration-200", isDragging ? "text-neutral-300" : "text-neutral-500 group-hover:text-neutral-300")} />
            </div>
          </motion.div>

          <div className="text-center space-y-2">
            <h3 className="text-xl font-medium text-neutral-200 tracking-tight">
              {isDragging ? "Drop files to stage" : "Select or drop files"}
            </h3>
            <p className="text-sm text-neutral-500 font-normal max-w-sm mx-auto">
              Auto-detecting Audio, Video, Docs, Excel, & Images.
            </p>
          </div>

          <div className="flex bg-black/40 backdrop-blur-md rounded-full px-4 py-2 mt-4 space-x-6 border border-white/5">
            <div className="flex items-center space-x-2 text-xs text-neutral-400">
               <ShieldCheck className="w-4 h-4 text-emerald-400" />
               <span>100% Private Local Edge</span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-neutral-400">
               <Cpu className="w-4 h-4 text-purple-400" />
               <span>Unlimited Wasm Compute</span>
            </div>
          </div>
        </div>
        
        <input
          id="file-upload"
          type="file"
          className="hidden"
          multiple
          onChange={(e) => {
            if (e.target.files) {
              const files = Array.from(e.target.files);
              for (const file of files) {
                stageFile(file);
              }
            }
          }}
        />
      </motion.div>

      {/* Action Hub / Staging UI */}
      {tasks.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full mt-8 flex flex-col gap-4"
        >
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
            <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-2">
               STAGING QUEUE ({tasks.length})
            </h4>
            {hasStagedFiles && (
              <button 
                onClick={executePipeline}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-neutral-100 text-neutral-900 hover:bg-white transition-colors rounded-lg text-sm font-semibold border border-transparent hover:border-neutral-300 shadow-sm"
              >
                <Play className="w-4 h-4 fill-current" /> Execute
              </button>
            )}
          </div>

          <div className="space-y-3">
             <AnimatePresence>
             {tasks.map((task) => (
                <motion.div 
                  key={task.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-neutral-900 hover:bg-neutral-800/80 transition-colors p-4 rounded-xl border border-neutral-800 gap-4"
                >
                   <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-base text-white font-medium truncate">{task.analyzed.originalFile?.name || task.id}</span>
                      <span className="text-xs text-neutral-500 font-medium">
                        {task.analyzed.extension.toUpperCase()} • {task.analyzed.sizeMB.toFixed(2)} MB {task.analyzed.isHeavy ? "(OPFS Routed)" : "(RAM Fast)"}
                      </span>
                   </div>

                   {task.status === "staged" ? (
                     <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        <select 
                          className="bg-neutral-950 text-xs text-neutral-300 border border-neutral-800 rounded-lg px-3 py-2 outline-none focus:border-neutral-500 transition-colors"
                          value={task.actionMode || ""}
                          onChange={(e) => {
                             const mode = e.target.value as ActionMode;
                             const firstTarget = task.analyzed.modeTargets[mode]?.[0] || "";
                             updateStagedAction(task.id, mode, firstTarget);
                          }}
                        >
                          {task.analyzed.availableModes.map(mode => (
                             <option key={mode} value={mode}>
                               {mode === "convert" ? "Swap Format" : mode === "compress" ? "Compress Size" : "AI Extract"}
                             </option>
                          ))}
                        </select>

                        <select 
                          className="bg-neutral-950 text-xs text-neutral-100 font-medium border border-neutral-800 rounded-lg px-3 py-2 outline-none focus:border-neutral-500 transition-colors"
                          value={task.actionTarget || ""}
                          onChange={(e) => updateStagedAction(task.id, task.actionMode!, e.target.value)}
                        >
                          {task.analyzed.modeTargets[task.actionMode as ActionMode]?.map(target => (
                             <option key={target} value={target}>{target}</option>
                          ))}
                        </select>

                        <button onClick={() => removeTask(task.id)} className="p-2 text-neutral-600 hover:text-red-500 transition-colors rounded-lg hover:bg-red-500/10 ml-2">
                          <Trash2 className="w-4 h-4" />
                        </button>
                     </div>
                   ) : (
                     <div className="flex items-center gap-4">
                        <span className="text-xs text-neutral-500 font-medium">
                          {task.actionMode === "convert" ? "Format" : task.actionMode === "compress" ? "Shrink" : "Neural"} ➔ <strong className="text-neutral-200 ml-1 font-mono">{task.actionTarget}</strong>
                        </span>

                        {task.status === "processing" && (
                          <div className="flex items-center gap-3">
                             <div className="w-32 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                               <div className="h-full bg-neutral-200 transition-all duration-200" style={{ width: `${task.progress}%` }} />
                             </div>
                             <span className="text-xs font-mono text-neutral-400 w-8">{task.progress}%</span>
                          </div>
                        )}

                        {task.status === "completed" && task.outputUrl && (
                          <a href={task.outputUrl} download={`mp33pm_output_${task.id.slice(0,5)}.${task.outputExtension || 'bin'}`} className="text-xs px-4 py-1.5 rounded-lg bg-neutral-800 text-neutral-200 font-medium border border-neutral-700 hover:bg-neutral-700 hover:text-white transition-all">
                             Download
                          </a>
                        )}

                        {task.status === "error" && (
                          <span className="text-xs px-4 py-1.5 rounded-lg bg-red-950/50 text-red-500 font-medium border border-red-900/50">
                             Engine Failed
                          </span>
                        )}

                        {(task.status === "routing" || task.status === "queued") && (
                          <span className="text-xs px-4 py-1.5 rounded-lg bg-neutral-800/50 text-neutral-400 font-medium border border-neutral-800 animate-pulse">
                             Routing...
                          </span>
                        )}
                     </div>
                   )}
                </motion.div>
             ))}
             </AnimatePresence>
          </div>
        </motion.div>
      )}
    </div>
  );
}
