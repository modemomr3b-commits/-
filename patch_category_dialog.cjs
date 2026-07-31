const fs = require('fs');
let code = fs.readFileSync('src/components/shared/CategoryDownloadDialog.tsx', 'utf8');

// Add import
const importRegex = /import \{ ShareDialog \} from "\.\/ShareDialog";/;
code = code.replace(importRegex, `import { ShareDialog } from "./ShareDialog";\nimport { DownloadModeDialog } from "./DownloadModeDialog";`);

// Add state
const stateRegex = /const \[confirmDialog.*?null\);/m;
code = code.replace(stateRegex, `const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; message: string; onConfirm: () => void } | null>(null);
  const [downloadModeState, setDownloadModeState] = useState<{ isOpen: boolean; imagesWithData: any[]; zipName: string } | null>(null);`);

// Replace setConfirmDialog with setDownloadModeState
const confirmRegex = /setConfirmDialog\(\{\s*isOpen: true,\s*message:[\s\S]*?onConfirm: async \(\) => \{[\s\S]*?setConfirmDialog\(null\);\s*setDownloadProgress\(\{ progress: 0, total: imagesWithData.length, message: 'جاري تحضير الملفات\.\.\.' \}\);/m;

const newStart = `setDownloadModeState({
      isOpen: true,
      imagesWithData,
      zipName
    });
  };

  const executeDownload = async (mode: 'gallery' | 'zip') => {
    if (!downloadModeState) return;
    const { imagesWithData, zipName } = downloadModeState;
    setDownloadModeState(null);
    setDownloadProgress({ progress: 0, total: imagesWithData.length, message: 'جاري تحضير الملفات...' });
`;

code = code.replace(confirmRegex, newStart);

// Now fix the end of executeDownload. The old code had:
const oldLogic = /if \(\(user\?\.role !== 'admin' && user\?\.role !== 'sales'\)\) \{[\s\S]*?\/\/ setDownloadProgress\(null\); is not needed here as we handle it above or inside ShareDialog\s*\}\s*\}\);/m;

const newLogic = `if (mode === 'gallery') {
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
          setDownloadProgress(null);
        }
  };`;

code = code.replace(oldLogic, newLogic);

// Add DownloadModeDialog in JSX
const jsxRegex = /\{confirmDialog && \([\s\S]*?\}\)/m;
const newJSX = `{confirmDialog && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title="تأكيد التحميل"
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
      
      {downloadModeState && (
        <DownloadModeDialog
          isOpen={downloadModeState.isOpen}
          imageCount={downloadModeState.imagesWithData.length}
          onSelectOption={executeDownload}
          onCancel={() => setDownloadModeState(null)}
        />
      )}`;

code = code.replace(jsxRegex, newJSX);

fs.writeFileSync('src/components/shared/CategoryDownloadDialog.tsx', code);
