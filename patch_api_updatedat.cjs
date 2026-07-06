const fs = require('fs');
let code = fs.readFileSync('src/api.ts', 'utf8');

// Insert mapping for updatedAt
code = code.replace(
  /if \(safeData\.forceStandardCrush \!== undefined\) safeData\.size\.forceStandardCrush = safeData\.forceStandardCrush;/g,
  `if (safeData.forceStandardCrush !== undefined) safeData.size.forceStandardCrush = safeData.forceStandardCrush;
    if (safeData.updatedAt !== undefined) { safeData.size.updatedAt = safeData.updatedAt; delete safeData.updatedAt; }`
);

// Map it out on getProducts
code = code.replace(
  /forceStandardCrush: p\.size\?\.forceStandardCrush \?\? true/g,
  `forceStandardCrush: p.size?.forceStandardCrush ?? true,
      updatedAt: p.size?.updatedAt || p.createdAt`
);

// Map it out on getProductById
code = code.replace(
  /forceStandardCrush: p\.size\?\.forceStandardCrush \?\? true/g,
  `forceStandardCrush: p.size?.forceStandardCrush ?? true,
      updatedAt: p.size?.updatedAt || p.createdAt`
);

fs.writeFileSync('src/api.ts', code);
