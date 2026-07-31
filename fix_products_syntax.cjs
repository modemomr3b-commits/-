const fs = require('fs');
let code = fs.readFileSync('src/components/member/Products.tsx', 'utf8');

const regex = /if \(\(user\?\.role !== 'admin' && user\?\.role !== 'sales'\)\) \{[\s\S]*?showToast\("تم تحميل الملف المضغوط بنجاح", "success"\);\s*\} else \{\s*showToast\("حدث خطأ أثناء التحميل", "error"\);\s*\}\s*\}/m;

const newBlock = `if ((user?.role !== 'admin' && user?.role !== 'sales')) {
                    const { fetchImageFiles } = await import('../../utils/download');
                    const files = await fetchImageFiles(imagesToDownload, (progress, total) => {
                      setDownloadProgress({ progress, total });
                    });
                    
                    if (files.length === 0) {
                       showToast("حدث خطأ أثناء تحميل الصور", "error");
                       setDownloadProgress(null);
                       return;
                    }
                    
                    setDownloadProgress(null);
                    
                    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
                    if (isIOS && files.length > 10) {
                       const chunks = [];
                       for (let i = 0; i < files.length; i += 10) {
                          chunks.push(files.slice(i, i + 10));
                       }
                       setShareChunks(chunks);
                    } else {
                       setReadyToShareFiles(files);
                    }
                  } else {
                    const { downloadAsZip } = await import('../../utils/zipDownload');
                    
                    const catName = activeCategory 
                      ? allCategories.find(c => c.id === activeCategory)?.name || "category"
                      : "category";

                    const success = await downloadAsZip(catName, imagesToDownload, (progress, total) => {
                      setDownloadProgress({ progress, total });
                    });
                    if (success) {
                       showToast("تم تحميل الملف المضغوط بنجاح", "success");
                    } else {
                       showToast("حدث خطأ أثناء التحميل", "error");
                    }
                  }`;

code = code.replace(regex, newBlock);
fs.writeFileSync('src/components/member/Products.tsx', code);
