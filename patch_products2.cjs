const fs = require('fs');
let code = fs.readFileSync('src/components/member/Products.tsx', 'utf8');

const importRegex = /import \{ CategoryDownloadDialog \} from "\.\.\/shared\/CategoryDownloadDialog";/m;
code = code.replace(importRegex, `import { CategoryDownloadDialog } from "../shared/CategoryDownloadDialog";\nimport { ShareDialog } from "../shared/ShareDialog";`);

const stateRegex = /const \[downloadProgress, setDownloadProgress\] = useState<\{[^}]*\}\s*\|\s*null>\(null\);/m;
code = code.replace(stateRegex, `const [downloadProgress, setDownloadProgress] = useState<{ progress: number, total: number } | null>(null);
  const [readyToShareFiles, setReadyToShareFiles] = useState<File[] | null>(null);
  const [shareChunks, setShareChunks] = useState<File[][] | null>(null);`);

const downloadLogicOld = /if \(\(user\?\.role !== 'admin' && user\?\.role !== 'sales'\)\) \{[\s\S]*?\} else \{/m;
const downloadLogicNew = `if ((user?.role !== 'admin' && user?.role !== 'sales')) {
                    const { fetchImageFiles } = await import('../../utils/download');
                    const files = await fetchImageFiles(imagesToDownload, (progress, total) => {
                      setDownloadProgress({ progress, total });
                    });
                    
                    if (files.length === 0) {
                       showToast("حدث خطأ أثناء تحميل الصور", "error");
                       setDownloadProgress(null);
                       return;
                    }
                    
                    setDownloadProgress(null);
                    
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
                  } else {`;
code = code.replace(downloadLogicOld, downloadLogicNew);

const jsxRegex = /\{isDownloadDialogOpen && \([\s\S]*?\}\)/m;
code = code.replace(jsxRegex, `{isDownloadDialogOpen && (
        <CategoryDownloadDialog 
          categories={allCategories}
          products={products}
          onClose={() => setIsDownloadDialogOpen(false)}
        />
      )}
      <ShareDialog
        readyToShareFiles={readyToShareFiles}
        shareChunks={shareChunks}
        onClose={() => {
           setReadyToShareFiles(null);
           setShareChunks(null);
        }}
        showToast={showToast}
      />`);

fs.writeFileSync('src/components/member/Products.tsx', code);
