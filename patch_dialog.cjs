const fs = require('fs');
let code = fs.readFileSync('src/components/shared/CategoryDownloadDialog.tsx', 'utf8');

const oldLogic = `            // Determine folder name based on subcategory
            let folderName = 'أخرى';
            if (p.subcategoryId) {
              const subCat = categories.find(c => c.id === p.subcategoryId);
              if (subCat) {
                folderName = subCat.name;
              }
            } else if (p.categoryId) {
               const cat = categories.find(c => c.id === p.categoryId);
               if (cat) folderName = cat.name;
            }`;

const newLogic = `            // Determine folder name based on main and subcategory
            let mainCatName = '';
            let subCatName = '';
            
            if (p.categoryId) {
              const mainCat = categories.find(c => c.id === p.categoryId);
              if (mainCat) mainCatName = mainCat.name;
            }
            if (p.subcategoryId) {
              const subCat = categories.find(c => c.id === p.subcategoryId);
              if (subCat) subCatName = subCat.name;
            }

            let folderName = 'أخرى';
            if (mainCatName && subCatName) {
              folderName = \`\${mainCatName}/\${subCatName}\`;
            } else if (subCatName) {
              folderName = subCatName;
            } else if (mainCatName) {
              folderName = \`\${mainCatName}/عام\`;
            }`;

code = code.replace(oldLogic, newLogic);
fs.writeFileSync('src/components/shared/CategoryDownloadDialog.tsx', code);
