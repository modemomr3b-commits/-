const fs = require('fs');
let code = fs.readFileSync('src/components/member/Products.tsx', 'utf8');

const shareDialogStart = code.indexOf('<ShareDialog');
const endOfFile = code.indexOf('          ))}');
const shareDialogCode = code.slice(shareDialogStart, code.indexOf('/>', shareDialogStart) + 2);

const regexToReplace = /<ShareDialog[\s\S]*\}\)\}/;

// Wait, the previous file had the full render logic. Let's just restore the file using git checkout if we could.
