const fs = require('fs');
let code = fs.readFileSync('src/components/shared/CategoryDownloadDialog.tsx', 'utf8');

const confirmOld = code.match(/message: \`هل تود البدء بتحميل جميع الصور المحددة؟.*?\`,/s)[0];

const confirmNew = `message: user?.role === 'normal' 
        ? \`هل تود البدء بتحميل جميع الصور المحددة؟ (العدد: \${imagesWithData.length} صورة). سيتم حفظ الصور مباشرة في الاستوديو الخاص بك.\`
        : \`هل تود البدء بتحميل جميع الصور المحددة؟ (العدد: \${imagesWithData.length} صورة). سيتم حفظ الملفات داخل مجلدات مقسمة حسب القسم الرئيسي ونوع المنتج بناءً على اسمه (مثال: رجالي/رياضة).\`,`;

code = code.replace(confirmOld, confirmNew);
fs.writeFileSync('src/components/shared/CategoryDownloadDialog.tsx', code);
