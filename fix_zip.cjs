const fs = require('fs');
let code = fs.readFileSync('src/utils/zipDownload.ts', 'utf8');

const oldLogic = /const finalPath = img.folderName \? `\$\{img.folderName\}\/\$\{img.filename\}` : img.filename;\n\s*zip.file\(finalPath, blob\);/;
const newLogic = `if (img.folderName) {
          // By explicitly creating the folder first, we ensure it has a directory entry
          // which helps some extraction tools (like Windows Explorer) show the folders properly
          const folderParts = img.folderName.split('/');
          let currentFolder = zip;
          for (const part of folderParts) {
            currentFolder = currentFolder.folder(part);
          }
          currentFolder.file(img.filename, blob);
        } else {
          zip.file(img.filename, blob);
        }`;

code = code.replace(oldLogic, newLogic);
fs.writeFileSync('src/utils/zipDownload.ts', code);
