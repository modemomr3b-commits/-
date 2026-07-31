const fs = require('fs');
let code = fs.readFileSync('src/components/shared/CategoryDownloadDialog.tsx', 'utf8');

const regexToReplace = /\{confirmDialog && \([\s\S]*?\}\s*\)\}\s*<\/div>\s*\);\s*\}/;

const newBlock = `{confirmDialog && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title="تحميل الصور"
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
      )}
    </div>
  );
}`;

code = code.replace(regexToReplace, newBlock);
fs.writeFileSync('src/components/shared/CategoryDownloadDialog.tsx', code);
