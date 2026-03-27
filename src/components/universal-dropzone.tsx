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
          "w-full h-80 sm:h-96 rounded-[2rem] border-[1px] flex flex-col items-center justify-center relative overflow-hidden transition-all duration-500 cursor-pointer shadow-2xl backdrop-blur-3xl",
          isDragging
            ? "border-blue-400/60 bg-blue-500/10 shadow-[0_0_80px_rgba(59,130,246,0.15)]"
            : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 hover:shadow-[0_0_80px_rgba(255,255,255,0.03)]"
        )}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={() => document.getElementById("file-upload")?.click()}
      >
        <div className={cn("absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-blue-500/20 blur-[120px] rounded-full transition-opacity duration-700 pointer-events-none", isDragging ? "opacity-100" : "opacity-0")} />
        
        <div className="z-10 flex flex-col items-center gap-6 group pointer-events-none">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: isDragging ? 1.15 : 1, y: isDragging ? -10 : 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="flex flex-col items-center"
          >
            <div className="p-5 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/10 shadow-inner group-hover:bg-white/15 transition-all duration-300">
              <CloudUpload className={cn("w-12 h-12 transition-colors duration-300", isDragging ? "text-blue-400" : "text-neutral-300 group-hover:text-white")} />
            </div>
          </motion.div>

          <div className="text-center space-y-2">
            <h3 className="text-2xl font-semibold text-neutral-100 tracking-tight">
              {isDragging ? "Drop to Stage" : "Click or Drop Files"}
            </h3>
            <p className="text-sm sm:text-base text-neutral-400 font-medium max-w-sm mx-auto leading-relaxed">
              Auto-detects Audio, Video, Docs, Excel, & Images.
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
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <h4 className="text-sm font-medium text-neutral-300 uppercase tracking-widest flex items-center gap-2">
              <Settings2 className="w-4 h-4" /> Action Staging ({tasks.length})
            </h4>
            {hasStagedFiles && (
              <button 
                onClick={executePipeline}
                className="flex items-center gap-2 px-5 py-2 bg-white text-black hover:bg-neutral-200 transition-colors rounded-full text-sm font-bold shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)]"
              >
                <Play className="w-4 h-4 fill-current" /> Execute Pipeline
              </button>
            )}
          </div>

          <div className="space-y-4">
             <AnimatePresence>
             {tasks.map((task) => (
                <motion.div 
                  key={task.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white/[0.03] hover:bg-white/[0.06] transition-colors p-4 rounded-2xl border border-white/10 shadow-lg backdrop-blur-md gap-4"
                >
                   <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-base text-white font-medium truncate">{task.analyzed.originalFile?.name || task.id}</span>
                      <span className="text-xs text-neutral-500 font-medium">
                        {task.analyzed.extension.toUpperCase()} • {task.analyzed.sizeMB.toFixed(2)} MB {task.analyzed.isHeavy ? "(OPFS Routed)" : "(RAM Fast)"}
                      </span>
                   </div>

                   {task.status === "staged" ? (
                     <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                        <select 
                          className="bg-black/50 text-sm text-neutral-200 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-blue-500/50 transition-colors"
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
                          className="bg-black/50 text-sm text-white font-medium border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-purple-500/50 transition-colors"
                          value={task.actionTarget || ""}
                          onChange={(e) => updateStagedAction(task.id, task.actionMode!, e.target.value)}
                        >
                          {task.analyzed.modeTargets[task.actionMode as ActionMode]?.map(target => (
                             <option key={target} value={target}>{target}</option>
                          ))}
                        </select>

                        <button onClick={() => removeTask(task.id)} className="p-2 text-neutral-500 hover:text-red-400 transition-colors rounded-xl hover:bg-red-400/10">
                          <Trash2 className="w-5 h-5" />
                        </button>
                     </div>
                   ) : (
                     <div className="flex items-center gap-4">
                        <span className="text-xs text-neutral-400 font-medium">
                          {task.actionMode === "convert" ? "Swap" : task.actionMode === "compress" ? "Compress" : "AI"} ➔ <strong className="text-white ml-1">{task.actionTarget}</strong>
                        </span>

                        {task.status === "processing" && (
                          <div className="flex items-center gap-3">
                             <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden border border-white/5">
                               <div className="h-full bg-blue-500 transition-all duration-300 shadow-[0_0_10px_rgba(59,130,246,0.8)]" style={{ width: `${task.progress}%` }} />
                             </div>
                             <span className="text-xs font-mono text-blue-300 w-8">{task.progress}%</span>
                          </div>
                        )}

                        {task.status === "completed" && task.outputUrl && (
                          <a href={task.outputUrl} download={`mp33pm_${task.id}.${task.outputExtension || 'bin'}`} className="text-xs px-4 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 uppercase tracking-wider hover:bg-emerald-500/40 hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all">
                             Download
                          </a>
                        )}

                        {task.status === "error" && (
                          <span className="text-xs px-4 py-1.5 rounded-full bg-red-500/20 text-red-300 font-bold border border-red-500/30 uppercase tracking-wider">
                             Error Loading Engine
                          </span>
                        )}

                        {(task.status === "routing" || task.status === "queued") && (
                          <span className="text-xs px-4 py-1.5 rounded-full bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30 uppercase tracking-wider animate-pulse">
                             Routing Engine...
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
