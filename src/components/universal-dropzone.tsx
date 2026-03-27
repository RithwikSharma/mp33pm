"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { UploadCloud } from "lucide-react";
import { useQueueStore } from "@/store/useQueueStore";
import { cn } from "@/lib/utils";

export function UniversalDropzone() {
  const [isDragging, setIsDragging] = useState(false);
  const addTask = useQueueStore((state) => state.addTask);

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
        // No server mapping. Rely completely on local file handles
        const files = Array.from(e.dataTransfer.files);
        files.forEach((file) => {
          addTask(file);
        });
      }
    },
    [addTask]
  );

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center p-4">
      <motion.div
        className={cn(
          "w-full h-72 rounded-[2.5rem] border-[1px] flex flex-col items-center justify-center relative overflow-hidden transition-colors cursor-pointer antialiased shadow-2xl",
          isDragging
            ? "border-blue-500/50 bg-blue-500/5"
            : "border-white/10 bg-black/40 hover:bg-neutral-900/60 hover:border-white/20"
        )}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => document.getElementById("file-upload")?.click()}
      >
        <div className="z-10 flex flex-col items-center gap-6 group">
          <motion.div
            animate={{ scale: isDragging ? 1.1 : 1, y: isDragging ? -5 : 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <div className="p-4 rounded-full bg-white/5 backdrop-blur-md border border-white/5 shadow-inner">
              <UploadCloud className={cn("w-10 h-10 transition-colors duration-300", isDragging ? "text-blue-400" : "text-neutral-400 group-hover:text-neutral-300")} />
            </div>
          </motion.div>
          <div className="text-center space-y-1">
            <h3 className="text-lg font-medium text-neutral-200 tracking-wide">Drop anything here</h3>
            <p className="text-sm text-neutral-500 font-light">Zero limits. 100% Client-Side Private.</p>
          </div>
        </div>
        
        {/* Balanced Glow Architecture / Symmetrical effect */}
        <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-blue-500/5 to-transparent blur-[100px] pointer-events-none" />
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-indigo-500/5 to-transparent blur-[100px] pointer-events-none" />

        <input
          id="file-upload"
          type="file"
          className="hidden"
          multiple
          onChange={(e) => {
            if (e.target.files) {
              const files = Array.from(e.target.files);
              files.forEach((file) => addTask(file));
            }
          }}
        />
      </motion.div>
    </div>
  );
}
