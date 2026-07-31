const fs = require('fs');
let code = fs.readFileSync('src/components/member/Products.tsx', 'utf8');

// 1. Add imports
const importRegex = /import \{ ConfirmDialog \} from "\.\.\/shared\/ConfirmDialog";/;
code = code.replace(importRegex, `import { ConfirmDialog } from "../shared/ConfirmDialog";\nimport { DownloadModeDialog } from "../shared/DownloadModeDialog";`);

// 2. Add state
const stateRegex = /const \[downloadProgress, setDownloadProgress\] = useState<\{[^}]*\}\s*\|\s*null>\(null\);/m;
code = code.replace(stateRegex, `const [downloadProgress, setDownloadProgress] = useState<{ progress: number, total: number } | null>(null);
  const [downloadModeState, setDownloadModeState] = useState<{ isOpen: boolean; imagesWithData: any[] } | null>(null);`);

// 3. Replace the onClick logic for "حفظ القسم" (Download category)
const onClickRegex = /setConfirmDialog\(\{\s*isOpen: true,\s*message:[\s\S]*?setDownloadProgress\(null\);\s*\}\s*\}\);\s*\}\}\s*className="flex-\[2\] py-2 bg-brq-navy/m;

const newOnClick = `setDownloadModeState({
                isOpen: true,
                imagesWithData
              });
            }}
             className="flex-[2] py-2 bg-brq-navy`;

code = code.replace(onClickRegex, newOnClick);

// 4. Add the executeDownload function near other functions
const functionInsertionRegex = /const toggleSelection = \(productId: string\) => \{/m;
const executeDownloadCode = `const executeDownload = async (mode: 'gallery' | 'zip') => {
    if (!downloadModeState) return;
    const { imagesWithData } = downloadModeState;
    setDownloadModeState(null);
    setDownloadProgress({ progress: 0, total: imagesWithData.length });
    
    const imagesToDownload = imagesWithData
      .filter(p => p.finalImageUrl || p.imageUrl)
      .map(p => {
        const imgUrl = p.finalImageUrl || p.imageUrl;
        const ext = imgUrl!.split('.').pop()?.split('?')[0] || 'jpg';
        const safeName = (p.productCode || p.name || 'product').replace(/[\\/\\?<>\\\\:\\*\\|":]/g, '-');
        const filename = \`\${safeName}.\${ext}\`;
        
        let mainCatName = 'عام';
        if (p.categoryId) {
          const mainCat = allCategories.find(c => c.id === p.categoryId);
          if (mainCat) mainCatName = mainCat.name;
        }
        
        const getProductType = (name: string) => {
          if (!name) return 'أخرى';
          const lowerName = name.toLowerCase();
          if (lowerName.includes('رياض')) return 'رياضة';
          if (lowerName.includes('شحاط')) return 'شحاطة';
          if (lowerName.includes('صندل') || lowerName.includes('صنادل')) return 'صندل';
          if (lowerName.includes('سليبر')) return 'سليبر';
          if (lowerName.includes('حذاء') || lowerName.includes('احذية') || lowerName.includes('أحذية')) return 'أحذية';
          if (lowerName.includes('لاستيك')) return 'لاستيك';
          if (lowerName.includes('ايفا') || lowerName.includes('إيفا')) return 'ايفا';
          if (lowerName.includes('قندر') || lowerName.includes('قنادر')) return 'قنادر';
          if (lowerName.includes('بوت') || lowerName.includes('جزم') || lowerName.includes('بسطال')) return 'بوت وجزم';
          if (lowerName.includes('نص')) return 'نصف';
          return 'أخرى';
        };
        const productType = getProductType(p.name);
        const folderName = \`\${mainCatName}/\${productType}\`;
        return { url: imgUrl!, filename, folderName };
      });
      
    if (mode === 'gallery') {
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
    } else {
      const { downloadAsZip } = await import('../../utils/zipDownload');
      
      const catName = activeCategory 
        ? allCategories.find(c => c.id === activeCategory)?.name || "category"
        : "category";
      const success = await downloadAsZip(catName, imagesToDownload, (progress, total) => {
        setDownloadProgress({ progress, total });
      });
      if (success) {
         showToast("تم تحميل الملف المضغوط بنجاح", "success");
      } else {
         showToast("حدث خطأ أثناء التحميل", "error");
      }
      setDownloadProgress(null);
    }
  };

  const toggleSelection = (productId: string) => {`;
code = code.replace(functionInsertionRegex, executeDownloadCode);

// 5. Add DownloadModeDialog to JSX
const jsxInsertion = /\{isDownloadDialogOpen && \(/m;
const newJsx = `{downloadModeState && (
        <DownloadModeDialog
          isOpen={downloadModeState.isOpen}
          imageCount={downloadModeState.imagesWithData.length}
          onSelectOption={executeDownload}
          onCancel={() => setDownloadModeState(null)}
        />
      )}
      {isDownloadDialogOpen && (`;
code = code.replace(jsxInsertion, newJsx);

fs.writeFileSync('src/components/member/Products.tsx', code);
