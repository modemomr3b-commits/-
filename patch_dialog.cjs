const fs = require('fs');
let code = fs.readFileSync('src/components/shared/CategoryDownloadDialog.tsx', 'utf8');

const stateRegex = /const \[confirmDialog.*?null\);/m;
const newState = `const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; message: string; onConfirm: () => void } | null>(null);
  const [readyToShareFiles, setReadyToShareFiles] = useState<File[] | null>(null);
  const [shareChunks, setShareChunks] = useState<File[][] | null>(null);`;
code = code.replace(stateRegex, newState);

const downloadLogicOld = /if \(\(user\?\.role !== 'admin' && user\?\.role !== 'sales'\)\) \{[\s\S]*?\} else \{/m;
const downloadLogicNew = `if ((user?.role !== 'admin' && user?.role !== 'sales')) {
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
        } else {`;
code = code.replace(downloadLogicOld, downloadLogicNew);

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
      
      {/* Share Files UI */}
      {(readyToShareFiles || shareChunks) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative bg-[#0a1128]/90 border border-brq-gold/30 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-300 w-full max-w-sm">
            <button 
              onClick={() => {
                 setReadyToShareFiles(null);
                 setShareChunks(null);
              }}
              className="absolute top-4 right-4 text-white/50 hover:text-white"
            >
              <X size={24} />
            </button>
            
            <div className="relative w-20 h-20 bg-gradient-to-br from-brq-gold/20 to-transparent rounded-2xl flex items-center justify-center mb-6 border border-brq-gold/20 shadow-[0_0_30px_rgba(212,175,55,0.15)]">
              <Download size={36} className="text-brq-gold drop-shadow-[0_0_10px_rgba(212,175,55,0.5)]" />
            </div>
            
            <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70 mb-3">
              الصور جاهزة للحفظ
            </h3>
            
            {readyToShareFiles && (
              <>
                <p className="text-white/70 mb-8">
                  تم تحضير {readyToShareFiles.length} صورة. اضغط على الزر أدناه لحفظها في الاستوديو.
                </p>
                <button
                  onClick={async () => {
                    const { shareFiles } = await import('../../utils/download');
                    const success = await shareFiles(readyToShareFiles);
                    if (success) {
                       showToast("تم فتح نافذة الحفظ", "success");
                       setReadyToShareFiles(null);
                    } else {
                       showToast("حدث خطأ أثناء المشاركة أو تم الإلغاء", "error");
                    }
                  }}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-brq-gold to-yellow-600 text-black hover:from-yellow-400 hover:to-yellow-500 transition-all font-bold flex items-center justify-center gap-2"
                >
                  <Download size={18} /> حفظ الصور في الاستوديو
                </button>
              </>
            )}
            
            {shareChunks && (
              <>
                <p className="text-white/70 mb-6 text-sm">
                  بسبب قيود نظام التشغيل، يجب حفظ الصور على دفعات ({shareChunks.length} دفعات).
                </p>
                <div className="w-full flex flex-col gap-3 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                  {shareChunks.map((chunk, index) => (
                    <button
                      key={index}
                      onClick={async () => {
                        const { shareFiles } = await import('../../utils/download');
                        await shareFiles(chunk);
                      }}
                      className="w-full py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white transition-all font-medium flex items-center justify-between"
                    >
                      <span>الدفعة {index + 1}</span>
                      <span className="text-sm text-brq-gold/70">{chunk.length} صور <Download size={14} className="inline ml-1" /></span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}`;
code = code.replace(jsxRegex, newJSX);

fs.writeFileSync('src/components/shared/CategoryDownloadDialog.tsx', code);
