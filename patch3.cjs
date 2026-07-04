const fs = require('fs');
let code = fs.readFileSync('src/components/admin/ProductManager.tsx', 'utf8');

code = code.replace(/let autoForceCrush = forceStandardCrush;[\s\S]*?const calcPieces = autoForceCrush \? 12 : pieces;/, 
`let pieces = customPieces || 12;
    const calcPieces = forceStandardCrush ? 12 : pieces;`);

code = code.replace(/forceStandardCrush: autoForceCrush,/, 
`forceStandardCrush: forceStandardCrush,`);

fs.writeFileSync('src/components/admin/ProductManager.tsx', code);
