const fs = require('fs');
let code = fs.readFileSync('src/components/admin/ProductManager.tsx', 'utf8');

// For USD price input in new product
code = code.replace(
  /handlePriceAndPackaging\(\s*Number\(e\.target\.value\),\s*newProduct\.packaging \|\| "",\s*newProduct\.piecesCount \|\| 12,\s*false,\s*newProduct\.forceStandardCrush\s*\)/g,
  'handleUsdPriceChange(Number(e.target.value), false)'
);

// For IQD price input in new product
code = code.replace(
  /handleIqdPriceChange\(\s*Number\(e\.target\.value\),\s*newProduct\.packaging \|\| "",\s*newProduct\.piecesCount \|\| 12,\s*false,\s*newProduct\.forceStandardCrush\s*\)/g,
  'handleIqdPriceChange(Number(e.target.value), false)'
);

// For packaging text input in new product
code = code.replace(
  /handlePriceAndPackaging\(\s*newProduct\.dozenPriceUsd \|\| 0,\s*val,\s*num,\s*false,\s*newProduct\.forceStandardCrush\s*\);/g,
  'handlePackagingChange(val, num, newProduct.forceStandardCrush || false, false);'
);

// For standard crush checkbox in new product
code = code.replace(
  /handlePriceAndPackaging\(\s*newProduct\.dozenPriceUsd \|\| 0,\s*newProduct\.packaging \|\| "",\s*newProduct\.piecesCount \|\| 12,\s*false,\s*forceCrush\s*\);/g,
  'handlePackagingChange(newProduct.packaging || "", newProduct.piecesCount || 12, forceCrush, false);'
);

// For USD price input in edit product
code = code.replace(
  /handlePriceAndPackaging\(\s*Number\(e\.target\.value\),\s*editingProduct\.packaging \|\| "",\s*editingProduct\.piecesCount \|\| 12,\s*true,\s*editingProduct\.forceStandardCrush\s*\)/g,
  'handleUsdPriceChange(Number(e.target.value), true)'
);

// For IQD price input in edit product
code = code.replace(
  /handleIqdPriceChange\(\s*Number\(e\.target\.value\),\s*editingProduct\.packaging \|\| "",\s*editingProduct\.piecesCount \|\| 12,\s*true,\s*editingProduct\.forceStandardCrush\s*\)/g,
  'handleIqdPriceChange(Number(e.target.value), true)'
);

// For packaging text input in edit product
code = code.replace(
  /handlePriceAndPackaging\(\s*editingProduct\.dozenPriceUsd \|\| 0,\s*val,\s*num,\s*true,\s*editingProduct\.forceStandardCrush\s*\);/g,
  'handlePackagingChange(val, num, editingProduct.forceStandardCrush || false, true);'
);

// For standard crush checkbox in edit product
code = code.replace(
  /handlePriceAndPackaging\(\s*editingProduct\.dozenPriceUsd \|\| 0,\s*editingProduct\.packaging \|\| "",\s*editingProduct\.piecesCount \|\| 12,\s*true,\s*forceCrush\s*\);/g,
  'handlePackagingChange(editingProduct.packaging || "", editingProduct.piecesCount || 12, forceCrush, true);'
);

fs.writeFileSync('src/components/admin/ProductManager.tsx', code);
