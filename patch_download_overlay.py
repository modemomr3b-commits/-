import sys

def patch():
    with open('src/utils/download.ts', 'r') as f:
        content = f.read()

    old_logic = """    if (isIOS && navigator.canShare && navigator.canShare({ files })) {
        try {
            await navigator.share({
                files
            });
            return true;
        } catch (shareError: any) {
            if (shareError.name === 'AbortError') return false; // user cancelled
            console.error("Share failed", shareError);
            // On iOS, falling back to a.download loop causes the browser to open the image in a new view
            // which breaks the experience. If share fails on iOS, we shouldn't fallback to clicking links.
            throw shareError; 
        }
    }
    
    // Fallback for Android/desktop when share fails or is not available
    for (const file of files) {"""

    new_logic = """    if (isIOS) {
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
    for (const file of files) {"""

    content = content.replace(old_logic, new_logic)

    with open('src/utils/download.ts', 'w') as f:
        f.write(content)

patch()
