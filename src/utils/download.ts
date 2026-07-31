export const fetchImageFiles = async (
  images: { url: string; filename: string }[],
  onProgress?: (progress: number, total: number) => void
): Promise<File[]> => {
  const files: File[] = [];
  let completed = 0;

  for (const img of images) {
    try {
      const res = await fetch(img.url);
      const blob = await res.blob();
      // Ensure correct MIME type for iOS (mostly jpeg or png)
      let type = blob.type;
      if (!type || type === 'application/octet-stream') {
         if (img.filename.toLowerCase().endsWith('.png')) type = 'image/png';
         else if (img.filename.toLowerCase().endsWith('.webp')) type = 'image/webp';
         else type = 'image/jpeg';
      }
      
      files.push(new File([blob], img.filename, { type }));
      completed++;
      if (onProgress) {
        onProgress(completed, images.length);
      }
    } catch (e) {
      console.error(`Failed to fetch image ${img.url}`, e);
    }
  }
  return files;
};

export const shareFiles = async (files: File[]): Promise<boolean> => {
  if (files.length === 0) return false;

  try {
    if (navigator.canShare && navigator.canShare({ files })) {
      await navigator.share({
        files,
        title: 'حفظ الصور',
      });
      return true;
    } else {
      // Fallback for desktop/unsupported browsers or if canShare is false
      for (const file of files) {
        const objectUrl = URL.createObjectURL(file);
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(objectUrl);
        await new Promise(r => setTimeout(r, 200));
      }
      return true;
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return false; // User cancelled
    }
    console.error('Error sharing/downloading files:', error);
    return false;
  }
};

// Keep backwards compatibility if used elsewhere
export const downloadImages = async (
  images: { url: string; filename: string }[],
  onProgress?: (progress: number, total: number) => void
): Promise<boolean> => {
  const files = await fetchImageFiles(images, onProgress);
  return await shareFiles(files);
};
