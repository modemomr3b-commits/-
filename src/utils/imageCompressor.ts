/**
 * Utility to compress images before upload or saving to reduce bandwidth & storage usage.
 * Compresses an image file or base64 data URL to JPEG/WebP format with max dimensions and quality.
 */
export async function compressImage(
  fileOrBase64: File | string,
  maxWidth = 1000,
  maxHeight = 1000,
  quality = 0.8
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();

    img.onload = () => {
      let width = img.width;
      let height = img.height;

      // Scale down dimensions if greater than max
      if (width > maxWidth || height > maxHeight) {
        if (width / height > maxWidth / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        // Fallback if canvas context fails
        if (typeof fileOrBase64 === 'string') {
          resolve(fileOrBase64);
        } else {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(fileOrBase64);
        }
        return;
      }

      // Smooth rendering
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Export as compressed JPEG base64
      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(compressedDataUrl);
    };

    img.onerror = () => {
      // Return original on error
      if (typeof fileOrBase64 === 'string') {
        resolve(fileOrBase64);
      } else {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(fileOrBase64);
      }
    };

    if (typeof fileOrBase64 === 'string') {
      img.src = fileOrBase64;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(fileOrBase64);
    }
  });
}
