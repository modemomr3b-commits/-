import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// Fast helper to get Blob from any URL or data URL
async function fetchBlobFast(url: string, timeoutMs: number = 8000): Promise<Blob | null> {
  if (!url) return null;

  if (url.startsWith('data:')) {
    try {
      const parts = url.split(',');
      const mimeMatch = parts[0].match(/:(.*?);/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      const b64Data = parts[1];
      const byteCharacters = atob(b64Data);
      const byteArrays = new Uint8Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteArrays[i] = byteCharacters.charCodeAt(i);
      }
      return new Blob([byteArrays], { type: mimeType });
    } catch (e) {
      console.warn('Failed to parse base64 data url directly', e);
    }
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { signal: controller.signal, cache: 'force-cache' });
    clearTimeout(timer);
    if (res.ok) {
      return await res.blob();
    }
  } catch (err) {
    console.warn(`Failed to fetch image: ${url.slice(0, 50)}...`, err);
  }
  return null;
}

export const downloadAsZip = async (
  zipFilename: string,
  images: { url: string, folderName?: string, filename: string }[],
  onProgress?: (progress: number, total: number, message?: string) => void
): Promise<boolean> => {
  try {
    if (!images || images.length === 0) return false;

    const zip = new JSZip();
    let completed = 0;
    
    if (onProgress) onProgress(0, images.length, 'جاري تحضير وتنزيل الصور بالتوازي...');

    const usedNames = new Set<string>();

    // Pre-calculate unique filenames
    const preparedImages = images.map(img => {
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
      return {
        ...img,
        finalFilename
      };
    });

    // Parallel concurrent downloads (12 at once)
    const CONCURRENCY = 12;
    let itemIdx = 0;

    const worker = async () => {
      while (itemIdx < preparedImages.length) {
        const current = preparedImages[itemIdx++];
        if (!current) break;

        try {
          const blob = await fetchBlobFast(current.url, 8000);
          if (blob) {
            if (current.folderName) {
              zip.folder(current.folderName)?.file(current.finalFilename, blob);
            } else {
              zip.file(current.finalFilename, blob);
            }
          }
        } catch (e) {
          console.error(`Failed to fetch image ${current.url}`, e);
        } finally {
          completed++;
          if (onProgress) {
            onProgress(completed, images.length, `تم تحميل ${completed} من ${images.length}`);
          }
        }
      }
    };

    const workers = Array.from({ length: Math.min(CONCURRENCY, preparedImages.length) }, () => worker());
    await Promise.all(workers);

    if (completed === 0) return false;

    if (onProgress) onProgress(completed, images.length, 'جاري حفظ أرشيف الـ Zip الفوري...');

    // Use STORE mode for near instant zip file creation
    const zipBlob = await zip.generateAsync({ 
      type: 'blob',
      compression: 'STORE'
    });

    saveAs(zipBlob, `${zipFilename}.zip`);
    return true;
  } catch (error) {
    console.error('Error creating zip:', error);
    return false;
  }
};

