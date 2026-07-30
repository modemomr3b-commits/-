const fs = require('fs');
let code = fs.readFileSync('src/utils/zipDownload.ts', 'utf8');

const regex = /if \(img\.folderName\) \{[\s\S]*?\} else \{/m;
code = code.replace(regex, `if (img.folderName) {
          zip.file(img.folderName + '/' + img.filename, blob);
        } else {`);
fs.writeFileSync('src/utils/zipDownload.ts', code);
