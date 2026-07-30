const fs = require('fs');
let code = fs.readFileSync('src/components/shared/CategoryDownloadDialog.tsx', 'utf8');

const regex = /\) : \(\n                <input/g;

code = code.replace(regex, `) : (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="p-4 border-b border-white/10">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                <input`);
fs.writeFileSync('src/components/shared/CategoryDownloadDialog.tsx', code);
