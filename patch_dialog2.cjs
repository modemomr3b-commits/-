const fs = require('fs');
let code = fs.readFileSync('src/components/shared/CategoryDownloadDialog.tsx', 'utf8');

const importRegex = /import \{ ConfirmDialog \} from "\.\/ConfirmDialog";/m;
code = code.replace(importRegex, `import { ConfirmDialog } from "./ConfirmDialog";\nimport { ShareDialog } from "./ShareDialog";`);

const jsxRegex = /\{\/\* Share Files UI \*\/\}[\s\S]*?\)\}/m;
code = code.replace(jsxRegex, `
      <ShareDialog
        readyToShareFiles={readyToShareFiles}
        shareChunks={shareChunks}
        onClose={() => {
           setReadyToShareFiles(null);
           setShareChunks(null);
        }}
        showToast={showToast}
      />
`);

fs.writeFileSync('src/components/shared/CategoryDownloadDialog.tsx', code);
