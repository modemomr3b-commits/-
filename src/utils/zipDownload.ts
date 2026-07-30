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

    // Fetch all images and add to zip
    for (const img of images) {
      try {
        const res = await fetch(img.url);
        const blob = await res.blob();
        
        const finalPath = img.folderName ? `${img.folderName}/${img.filename}` : img.filename;
        zip.file(finalPath, blob);
        
        completed++;
        if (onProgress) {
          onProgress(completed, images.length, `جاري تحميل ${img.filename}...`);
        }
      } catch (e) {
        console.error(`Failed to fetch image ${img.url}`, e);
      }
    }

    if (completed === 0) return false;

    if (onProgress) onProgress(completed, images.length, 'جاري ضغط الملفات...');

    const zipBlob = await zip.generateAsync({ type: 'blob' }, (metadata) => {
      // metadata.percent is the compression progress (0-100)
    });

    saveAs(zipBlob, `${zipFilename}.zip`);
    return true;
  } catch (error) {
    console.error('Error creating zip:', error);
    return false;
  }
};
