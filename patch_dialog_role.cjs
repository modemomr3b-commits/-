const fs = require('fs');
let code = fs.readFileSync('src/components/shared/CategoryDownloadDialog.tsx', 'utf8');

code = code.replace("const { showToast } = useStore();", "const { showToast, user } = useStore();");

const confirmMessageLogicOld = /message: \`هل تود البدء بتحميل جميع الصور المحددة؟.*?رجعالي\/رياضة\)\.\`,/m;
const confirmMessageLogicNew = `message: user?.role === 'normal' 
        ? \`هل تود البدء بتحميل جميع الصور المحددة؟ (العدد: \${imagesWithData.length} صورة). سيتم حفظ الصور مباشرة في الاستوديو الخاص بك.\`
        : \`هل تود البدء بتحميل جميع الصور المحددة؟ (العدد: \${imagesWithData.length} صورة). سيتم حفظ الملفات داخل مجلدات مقسمة حسب القسم الرئيسي ونوع المنتج بناءً على اسمه (مثال: رجالي/رياضة).\`,`;

code = code.replace(confirmMessageLogicOld, confirmMessageLogicNew);

const downloadLogicOld = /const \{ downloadAsZip \} = await import\('\.\.\/\.\.\/utils\/zipDownload'\);\s*const success = await downloadAsZip\(zipName, imagesToDownload, \(progress, total, message\) => \{\s*setDownloadProgress\(\{ progress, total, message \}\);\s*\}\);\s*if \(success\) \{\s*showToast\("تم تحميل الملف بنجاح", "success"\);\s*\} else \{\s*showToast\("حدث خطأ أثناء تحميل الملف", "error"\);\s*\}/m;

const downloadLogicNew = `if (user?.role === 'normal') {
          const { downloadImages } = await import('../../utils/download');
          const success = await downloadImages(imagesToDownload, (progress, total) => {
            setDownloadProgress({ progress, total, message: 'جاري تحميل الصور للاستوديو...' });
          });
          if (success) {
             showToast("تم حفظ الصور في الاستوديو بنجاح", "success");
          } else {
             showToast("حدث خطأ أثناء حفظ الصور أو تم إلغاء العملية", "error");
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
        }`;

code = code.replace(downloadLogicOld, downloadLogicNew);

fs.writeFileSync('src/components/shared/CategoryDownloadDialog.tsx', code);
