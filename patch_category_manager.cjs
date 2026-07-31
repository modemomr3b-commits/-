const fs = require('fs');
let code = fs.readFileSync('src/components/admin/CategoryManager.tsx', 'utf8');

const oldLogic = /const \{ downloadImages \} = await import\('\.\.\/\.\.\/utils\/download'\);\s*await downloadImages\(imagesToDownload, \(progress, total\) => \{\s*setDownloadProgress\(\{ id: catId, progress, total \}\);\s*\}\);/m;

const newLogic = `const { downloadAsZip } = await import('../../utils/zipDownload');
      await downloadAsZip(catName, imagesToDownload, (progress, total) => {
        setDownloadProgress({ id: catId, progress, total });
      });`;

code = code.replace(oldLogic, newLogic);
fs.writeFileSync('src/components/admin/CategoryManager.tsx', code);
