const fs = require('fs');
let code = fs.readFileSync('src/utils/zipDownload.ts', 'utf8');

const regex = /if \(img\.folderName\) \{[\s\S]*?\} else \{/m;
code = code.replace(regex, `if (img.folderName) {
          const folderParts = img.folderName.split('/');
          let currentFolder = zip;
          for (const part of folderParts) {
            currentFolder = currentFolder.folder(part);
          }
          currentFolder.file(img.filename, blob);
        } else {`);
fs.writeFileSync('src/utils/zipDownload.ts', code);
