export const downloadImages = async (
  images: { url: string, filename: string }[],
  onProgress?: (progress: number, total: number) => void
): Promise<boolean> => {
  try {
    const files: File[] = [];
    let completed = 0;
    
    // Fetch all images and convert to File objects
    for (const img of images) {
      try {
        const res = await fetch(img.url);
        const blob = await res.blob();
        files.push(new File([blob], img.filename, { type: blob.type }));
        completed++;
        if (onProgress) {
          onProgress(completed, images.length);
        }
      } catch (e) {
        console.error(`Failed to fetch image ${img.url}`, e);
      }
    }

    if (files.length === 0) return false;

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    
    // Try to use native share (Share Sheet) ONLY on iOS devices for Gallery/Photos
    if (isIOS && navigator.canShare && navigator.canShare({ files })) {
        try {
            await navigator.share({
                files,
                title: 'حفظ الصور',
            });
            return true;
        } catch (shareError: any) {
            if (shareError.name === 'AbortError') return false; // user cancelled
            console.error("Share failed, falling back to a.download", shareError);
        }
    }
    
    // Fallback for Android/desktop when share fails or is not available
    for (const file of files) {
      const objectUrl = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
      
      // Delay to prevent browser blocking multiple downloads
      await new Promise(r => setTimeout(r, 400));
    }

    return true;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return false;
    }
    console.error('Error downloading images:', error);
    return false;
  }
};
