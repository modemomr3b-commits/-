const fs = require('fs');
let code = fs.readFileSync('src/components/admin/ProductManager.tsx', 'utf8');

code = code.replace(/let pieces = forceStandardCrush \? 12 : \(customPieces \|\| 12\);/, 
`let autoForceCrush = forceStandardCrush;
    if (customPieces !== 12 && customPieces > 0 && packaging.trim() !== "12" && packaging.trim() !== "") {
      autoForceCrush = false;
    }
    let pieces = autoForceCrush ? 12 : (customPieces || 12);`);

code = code.replace(/const calcPieces = forceStandardCrush \? 12 : pieces;/, 
`const calcPieces = autoForceCrush ? 12 : pieces;`);

code = code.replace(/forceStandardCrush,/g, 
`forceStandardCrush: autoForceCrush,`);

fs.writeFileSync('src/components/admin/ProductManager.tsx', code);
