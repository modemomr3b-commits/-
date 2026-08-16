export const downloadSingleImage = async (
  url: string,
  filename: string
): Promise<boolean> => {
  return downloadImages([{ url, filename }]);
};

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
    if (isIOS) {
        if (navigator.canShare && navigator.canShare({ files })) {
            return new Promise((resolve) => {
                const overlay = document.createElement('div');
                overlay.style.position = 'fixed';
                overlay.style.inset = '0';
                overlay.style.backgroundColor = 'rgba(0,0,0,0.7)';
                overlay.style.backdropFilter = 'blur(8px)';
                overlay.style.zIndex = '999999';
                overlay.style.display = 'flex';
                overlay.style.flexDirection = 'column';
                overlay.style.alignItems = 'center';
                overlay.style.justifyContent = 'center';
                overlay.style.opacity = '0';
                overlay.style.transition = 'opacity 0.3s ease';
                
                const box = document.createElement('div');
                box.style.backgroundColor = 'rgba(20,20,20,0.95)';
                box.style.border = '1px solid rgba(212,175,55,0.3)';
                box.style.padding = '32px 24px';
                box.style.borderRadius = '24px';
                box.style.textAlign = 'center';
                box.style.maxWidth = '85%';
                box.style.boxShadow = '0 20px 50px rgba(0,0,0,0.5)';
                box.style.transform = 'scale(0.9)';
                box.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                
                const icon = document.createElement('div');
                icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>';
                icon.style.marginBottom = '16px';
                icon.style.display = 'flex';
                icon.style.justifyContent = 'center';
                
                const title = document.createElement('h3');
                title.innerText = 'تم تجهيز الصور بنجاح';
                title.style.fontSize = '22px';
                title.style.fontWeight = 'bold';
                title.style.color = '#fff';
                title.style.marginBottom = '8px';
                title.dir = 'rtl';
                
                const subtitle = document.createElement('p');
                subtitle.innerText = `اضغط على الزر أدناه لحفظ ${files.length} صورة في الاستوديو الخاص بك`;
                subtitle.style.fontSize = '14px';
                subtitle.style.color = 'rgba(255,255,255,0.6)';
                subtitle.style.marginBottom = '24px';
                subtitle.dir = 'rtl';
                
                const btn = document.createElement('button');
                btn.innerText = 'حفظ الصور الآن';
                btn.style.background = 'linear-gradient(to right, #D4AF37, #FDE047)';
                btn.style.color = '#000';
                btn.style.fontWeight = 'bold';
                btn.style.padding = '14px 32px';
                btn.style.borderRadius = '12px';
                btn.style.fontSize = '16px';
                btn.style.border = 'none';
                btn.style.cursor = 'pointer';
                btn.style.boxShadow = '0 0 20px rgba(212,175,55,0.4)';
                btn.style.fontFamily = 'inherit';
                
                const cancelBtn = document.createElement('button');
                cancelBtn.innerText = 'إلغاء';
                cancelBtn.style.background = 'transparent';
                cancelBtn.style.color = 'rgba(255,255,255,0.5)';
                cancelBtn.style.padding = '12px';
                cancelBtn.style.marginTop = '8px';
                cancelBtn.style.border = 'none';
                cancelBtn.style.fontSize = '14px';
                
                btn.onclick = async () => {
                    try {
                        await navigator.share({ files });
                        resolve(true);
                    } catch (e: any) {
                        if (e.name !== 'AbortError') {
                            console.error('Share failed', e);
                        }
                        resolve(false);
                    } finally {
                        document.body.removeChild(overlay);
                    }
                };
                
                cancelBtn.onclick = () => {
                    document.body.removeChild(overlay);
                    resolve(false);
                };
                
                box.appendChild(icon);
                box.appendChild(title);
                box.appendChild(subtitle);
                box.appendChild(btn);
                box.appendChild(document.createElement('br'));
                box.appendChild(cancelBtn);
                overlay.appendChild(box);
                document.body.appendChild(overlay);
                
                // Trigger animation
                requestAnimationFrame(() => {
                    overlay.style.opacity = '1';
                    box.style.transform = 'scale(1)';
                });
            });
        } else {
            console.warn("navigator.canShare returned false for these files on iOS");
            // Don't fallback to a.download loop on iOS, it breaks the UI.
            return false;
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
