const fs = require('fs');
let code = fs.readFileSync('src/components/admin/ProductManager.tsx', 'utf8');

code = code.replace(`                  )}
          </div>
                  )}`, `                  )}`);
fs.writeFileSync('src/components/admin/ProductManager.tsx', code);
