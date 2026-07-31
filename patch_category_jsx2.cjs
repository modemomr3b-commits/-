const fs = require('fs');
let code = fs.readFileSync('src/components/shared/CategoryDownloadDialog.tsx', 'utf8');

const regexToReplace = /\{\s*confirmDialog && \([\s\S]*?<\/ConfirmDialog>\s*\)\s*\}\s*<\/div>\s*\);\s*\}/m;

// wait, <ConfirmDialog is self closing!
const selfClosingRegex = /\{\s*confirmDialog && \([\s\S]*?<ConfirmDialog[\s\S]*?\/>\s*\)\s*\}\s*<\/div>\s*\);\s*\}/m;

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

code = code.replace(selfClosingRegex, newBlock);
fs.writeFileSync('src/components/shared/CategoryDownloadDialog.tsx', code);
