import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export const downloadAsZip = async (
  zipFilename: string,
  images: { url: string, folderName?: string, filename: string }[],
  onProgress?: (progress: number, total: number, message?: string) => void
): Promise<boolean> => {
  try {
    const zip = new JSZip();
    let completed = 0;
    
    if (onProgress) onProgress(0, images.length, 'جاري تحضير الملفات...');

    const usedNames = new Set<string>();

    // Fetch all images and add directly to root of ZIP
    for (const img of images) {
      try {
        const res = await fetch(img.url);
        const blob = await res.blob();
        
        // Ensure filename uniqueness at root
        let finalFilename = img.filename;
        if (usedNames.has(finalFilename)) {
          const parts = finalFilename.split('.');
          const ext = parts.pop() || 'jpg';
          const base = parts.join('.');
          let count = 1;
          while (usedNames.has(`${base}_${count}.${ext}`)) {
            count++;
          }
          finalFilename = `${base}_${count}.${ext}`;
        }
        usedNames.add(finalFilename);

        // Always put images directly in root of zip (no subfolders)
        zip.file(finalFilename, blob);
        
        completed++;
        if (onProgress) {
          onProgress(completed, images.length, `جاري تحميل ${finalFilename}...`);
        }
      } catch (e) {
        console.error(`Failed to fetch image ${img.url}`, e);
      }
    }

    if (completed === 0) return false;

    if (onProgress) onProgress(completed, images.length, 'جاري ضغط الملفات...');

    const zipBlob = await zip.generateAsync({ type: 'blob' });

    saveAs(zipBlob, `${zipFilename}.zip`);
    return true;
  } catch (error) {
    console.error('Error creating zip:', error);
    return false;
  }
};
