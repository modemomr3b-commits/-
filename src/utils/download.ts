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

    // Detect if the device is iOS (iPhone, iPad, iPod)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    // Only use share sheet for iOS (so they get the "Save to Photos" prompt)
    if (isIOS && navigator.canShare && navigator.canShare({ files })) {
      await navigator.share({
        files,
        title: 'حفظ الصور',
      });
      return true;
    } else {
      // Fallback for Android and desktop for direct download
      for (const file of files) {
        const objectUrl = URL.createObjectURL(file);
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(objectUrl);
        // Small delay to prevent browser blocking
        await new Promise(r => setTimeout(r, 200));
      }
      return true;
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      // User cancelled the share sheet
      return false;
    }
    console.error('Error downloading images:', error);
    return false;
  }
};
