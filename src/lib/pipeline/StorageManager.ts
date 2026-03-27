/**
 * StorageManager: Manages Origin Private File System (OPFS) for caching Heavy files
 * This prevents the browser tab from running out of RAM (OOM) on large video/dataset conversions.
 */

export class StorageManager {
  static async saveToOPFS(file: File, fileName: string): Promise<boolean> {
    try {
      const root = await navigator.storage.getDirectory();
      const fileHandle = await root.getFileHandle(fileName, { create: true });
      // Request a writable stream
      // Note: createWritable() is part of the File System Access API which is available in OPFS
      const writable = await fileHandle.createWritable();
      await writable.write(file);
      await writable.close();
      console.log(`[OPFS] Saved ${fileName} successfully to high-speed local storage.`);
      return true;
    } catch (error) {
      console.error("[OPFS Error] Failed to save heavy file to OPFS:", error);
      return false; // Fallback to RAM if OPFS fails or is unsupported
    }
  }

  static async getFromOPFS(fileName: string): Promise<File | null> {
    try {
      const root = await navigator.storage.getDirectory();
      const fileHandle = await root.getFileHandle(fileName, { create: false });
      return await fileHandle.getFile();
    } catch (error) {
      console.error("[OPFS Error] File not found or read error:", error);
      return null;
    }
  }

  static async removeFromOPFS(fileName: string): Promise<void> {
    try {
      const root = await navigator.storage.getDirectory();
      await root.removeEntry(fileName);
      console.log(`[OPFS] Erased ${fileName} to free space.`);
    } catch (error: any) {
      if (error && error.name === "NotFoundError") return; // Silence harmless misses
      console.error("[OPFS Error] Could not remove file:", error);
    }
  }
}
