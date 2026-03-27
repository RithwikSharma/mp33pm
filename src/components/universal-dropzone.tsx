"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CloudUpload, Play, Trash2 } from "lucide-react";
import { useQueueStore } from "@/store/useQueueStore";
import { cn } from "@/lib/utils";
import { ActionMode } from "@/lib/pipeline/FileAnalyzer";

function formatBytes(bytes?: number) {
  if (!bytes || bytes <= 0) return "-";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

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
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center justify-center p-4 xl:p-0">
      <motion.div
        className={cn(
          "w-full h-80 sm:h-96 rounded-2xl border flex flex-col items-center justify-center relative overflow-hidden transition-all duration-200 cursor-pointer bg-[#121417]",
          isDragging
            ? "border-cyan-300/80 border-solid bg-[#191d23]"
            : "border-[#2a2f37] border-dashed hover:border-[#4a5360] hover:bg-[#171b21]"
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
            <div className="p-4 rounded-xl bg-[#1b2028] border border-[#2f3640] group-hover:bg-[#202632] transition-colors duration-200">
              <CloudUpload className={cn("w-10 h-10 transition-colors duration-200", isDragging ? "text-cyan-300" : "text-[#7d8998] group-hover:text-[#c2d0e2]")} />
            </div>
          </motion.div>

          <div className="text-center space-y-2">
            <h3 className="text-xl font-semibold text-[#eef3fb] tracking-tight">
              {isDragging ? "Drop files to build your batch" : "Select files or drag them here"}
            </h3>
            <p className="text-sm text-[#8c97a6] font-normal max-w-sm mx-auto">
              Assign each file its own target, then execute everything in one run.
            </p>
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
          <div className="flex items-center justify-between pb-3 border-b border-[#2b323c]">
            <h4 className="text-xs font-bold text-[#8693a2] uppercase tracking-widest flex items-center gap-2">
               ACTIVE BATCH ({tasks.length})
            </h4>
            {hasStagedFiles && (
              <button 
                onClick={executePipeline}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-cyan-200 text-slate-900 hover:bg-cyan-100 transition-colors rounded-lg text-sm font-semibold border border-cyan-100 shadow-sm"
              >
                <Play className="w-4 h-4 fill-current" /> Run Batch
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
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-[#131820] hover:bg-[#181f29] transition-colors p-4 rounded-xl border border-[#2a313b] gap-4"
                >
                   <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-base text-[#ecf1f9] font-medium truncate">{task.analyzed.originalFile?.name || task.id}</span>
                      <span className="text-xs text-[#8f9cad] font-medium">
                        {task.analyzed.extension.toUpperCase()} • {task.analyzed.sizeMB.toFixed(2)} MB {task.analyzed.isHeavy ? "(OPFS Routed)" : "(RAM Fast)"}
                      </span>
                   </div>

                   {task.status === "staged" ? (
                     <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        <select 
                          className="bg-[#0d1117] text-xs text-[#d8e1ee] border border-[#2a313b] rounded-lg px-3 py-2 outline-none focus:border-cyan-300 transition-colors"
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
                          className="bg-[#0d1117] text-xs text-[#f1f6ff] font-medium border border-[#2a313b] rounded-lg px-3 py-2 outline-none focus:border-cyan-300 transition-colors"
                          value={task.actionTarget || ""}
                          onChange={(e) => updateStagedAction(task.id, task.actionMode!, e.target.value)}
                        >
                          {task.analyzed.modeTargets[task.actionMode as ActionMode]?.map(target => (
                             <option key={target} value={target}>{target}</option>
                          ))}
                        </select>

                        <button onClick={() => removeTask(task.id)} className="p-2 text-[#6f7a8a] hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10 ml-2">
                          <Trash2 className="w-4 h-4" />
                        </button>
                     </div>
                   ) : (
                     <div className="flex items-center gap-4 w-full sm:w-auto">
                        <span className="text-xs text-[#8f9cad] font-medium">
                          {task.actionMode === "convert" ? "Format" : task.actionMode === "compress" ? "Shrink" : "Extract"} ➔ <strong className="text-[#e7eef9] ml-1 font-mono">{task.actionTarget}</strong>
                        </span>

                        {task.status === "processing" && (
                          <div className="flex items-center gap-3">
                             <div className="w-32 h-1.5 bg-[#283140] rounded-full overflow-hidden">
                               <div className="h-full bg-cyan-200 transition-all duration-200" style={{ width: `${task.progress}%` }} />
                             </div>
                             <span className="text-xs font-mono text-[#9ba8b9] w-8">{task.progress}%</span>
                          </div>
                        )}

                        {task.status === "completed" && task.outputUrl && (
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs px-2.5 py-1 rounded-md border border-[#2e3946] bg-[#0f141b] text-[#c4d1e2]">
                              {formatBytes(task.inputBytes)} {"->"} {formatBytes(task.outputBytes)}
                            </span>
                            {task.actionMode === "compress" && typeof task.reductionPercent === "number" && (
                              <span className="text-xs px-2.5 py-1 rounded-md border border-emerald-700/40 bg-emerald-900/20 text-emerald-300">
                                Reduced {task.reductionPercent.toFixed(1)}%
                              </span>
                            )}
                            {typeof task.processMs === "number" && (
                              <span className="text-xs px-2.5 py-1 rounded-md border border-[#2e3946] bg-[#0f141b] text-[#9ba8b9]">
                                {task.processMs} ms
                              </span>
                            )}
                            <a href={task.outputUrl} download={`mp33pm_output_${task.id.slice(0,5)}.${task.outputExtension || 'bin'}`} className="text-xs px-4 py-1.5 rounded-lg bg-[#1d2631] text-[#e3ecfa] font-medium border border-[#3a4758] hover:bg-[#253140] hover:text-white transition-all">
                              Download
                            </a>
                          </div>
                        )}

                        {task.status === "error" && (
                          <span className="text-xs px-4 py-1.5 rounded-lg bg-red-950/40 text-red-300 font-medium border border-red-800/50">
                             Engine Failed
                          </span>
                        )}

                        {(task.status === "routing" || task.status === "queued") && (
                          <span className="text-xs px-4 py-1.5 rounded-lg bg-[#1a232f] text-[#9ba8b9] font-medium border border-[#2a3442] animate-pulse">
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
