const fs = require('fs');
let code = fs.readFileSync('src/components/member/Products.tsx', 'utf8');

const importRegex = /import \{ ConfirmDialog \} from "\.\.\/shared\/ConfirmDialog";/;
code = code.replace(importRegex, `import { ConfirmDialog } from "../shared/ConfirmDialog";\nimport { DownloadModeDialog } from "../shared/DownloadModeDialog";`);

const stateRegex = /const \[confirmDialog, setConfirmDialog\] = useState<\{[^}]*\}\s*\|\s*null>\(null\);/;
code = code.replace(stateRegex, `const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; message: string; onConfirm: () => void } | null>(null);
  const [downloadModeState, setDownloadModeState] = useState<{ isOpen: boolean; imagesWithData: any[] } | null>(null);`);

const confirmRegex = /setConfirmDialog\(\{\s*isOpen: true,\s*message:[\s\S]*?onConfirm: async \(\) => \{\s*setConfirmDialog\(null\);\s*setDownloadProgress\(\{ progress: 0, total: imagesWithData.length \}\);\s*const imagesToDownload = imagesWithData/m;

const newStart = `setDownloadModeState({
                isOpen: true,
                imagesWithData
              });
            }}
             className="flex-[2] py-2 bg-brq-navy rounded-lg border border-brq-royal/50 flex gap-2 items-center justify-center text-xs text-brq-gold hover:bg-brq-navy/80 transition-colors disabled:opacity-50"
          >
            <Download size={14} /> {downloadProgress ? \`جاري التحميل \${downloadProgress.progress}/\${downloadProgress.total}\` : 'حفظ القسم'}
          </button>`;

code = code.replace(confirmRegex, `// Replaced setConfirmDialog with setDownloadModeState\nsetDownloadModeState({ isOpen: true, imagesWithData });`);
// Let's do it safer by parsing the button onClick
