export const downloadToFolder = async (
  images: { url: string, folderName?: string, filename: string }[],
  onProgress?: (progress: number, total: number, message?: string) => void
): Promise<boolean> => {
  try {
    if (!('showDirectoryPicker' in window)) {
      throw new Error('Directory Picker API not supported');
    }

    // @ts-ignore
    const dirHandle = await window.showDirectoryPicker({
      mode: 'readwrite'
    });

    let completed = 0;
    if (onProgress) onProgress(0, images.length, 'جاري تحضير الملفات...');

    for (const img of images) {
      try {
        const res = await fetch(img.url);
        const blob = await res.blob();
        
        let targetDirHandle = dirHandle;
        
        if (img.folderName) {
          const folderParts = img.folderName.split('/');
          for (const part of folderParts) {
            targetDirHandle = await targetDirHandle.getDirectoryHandle(part, { create: true });
          }
        }
        
        const fileHandle = await targetDirHandle.getFileHandle(img.filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        
        completed++;
        if (onProgress) {
          onProgress(completed, images.length, `جاري تحميل ${img.filename}...`);
        }
      } catch (e) {
        console.error(`Failed to save image ${img.filename}`, e);
      }
    }

    return true;
  } catch (error) {
    console.error('Error saving to folder:', error);
    return false;
  }
};
