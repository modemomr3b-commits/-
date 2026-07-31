const fs = require('fs');
let code = fs.readFileSync('src/components/shared/CategoryDownloadDialog.tsx', 'utf8');

const regex = /if \(\(user\?\.role !== 'admin' && user\?\.role !== 'sales'\)\) \{[\s\S]*?\} else \{\s*showToast\("حدث خطأ أثناء تحميل الملف", "error"\);\s*\}\s*\}\s*setDownloadProgress\(null\);\s*\}\s*\}\);/m;

const newBlock = `if ((user?.role !== 'admin' && user?.role !== 'sales')) {
          const { fetchImageFiles } = await import('../../utils/download');
          const files = await fetchImageFiles(imagesToDownload, (progress, total) => {
            setDownloadProgress({ progress, total, message: 'جاري تحضير الصور للاستوديو...' });
          });
          
          if (files.length === 0) {
             showToast("حدث خطأ أثناء تحميل الصور", "error");
             setDownloadProgress(null);
             return;
          }
          
          setDownloadProgress(null);
          
          // Check if we need to chunk for iOS (limit to 10-15 per share)
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
          const success = await downloadAsZip(zipName, imagesToDownload, (progress, total, message) => {
            setDownloadProgress({ progress, total, message });
          });
          
          if (success) {
             showToast("تم تحميل الملف بنجاح", "success");
          } else {
             showToast("حدث خطأ أثناء تحميل الملف", "error");
          }
        }
        
        // setDownloadProgress(null); is not needed here as we handle it above or inside ShareDialog
      }
    });`;

code = code.replace(regex, newBlock);
fs.writeFileSync('src/components/shared/CategoryDownloadDialog.tsx', code);
