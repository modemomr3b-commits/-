const fs = require('fs');
let code = fs.readFileSync('src/components/admin/BatchProductUpload.tsx', 'utf8');

// Replace handlePriceAndPackaging and handleIqdPriceChange
code = code.replace(
  /const handlePriceAndPackaging = \([\s\S]*?return newProducts;\n    \}\);\n  \};/,
  `const updateProductCalculations = (
    index: number,
    updates: Partial<Product>
  ) => {
    setProducts(prev => {
      const newProducts = [...prev];
      const target = { ...newProducts[index], ...updates };

      const usdValue = target.dozenPriceUsd || 0;
      const iqdValue = target.price || 0;
      
      const calcPieces = target.forceStandardCrush ? 12 : (target.piecesCount || 12);
      
      const pieceUsd = calcPieces > 0 ? usdValue / calcPieces : 0;
      const pieceIqd = calcPieces > 0 ? iqdValue / calcPieces : 0;

      newProducts[index] = {
        ...target,
        piecePriceUsd: Number(pieceUsd.toFixed(2)),
        piecePriceIqd: pieceIqd,
      };
      return newProducts;
    });
  };

  const handleUsdPriceChange = (index: number, usdValue: number) => {
    const iqdValue = usdValue * usdRate;
    updateProductCalculations(index, { dozenPriceUsd: usdValue, price: iqdValue });
  };

  const handleIqdPriceChange = (index: number, iqdValue: number) => {
    const usdValue = usdRate > 0 ? iqdValue / usdRate : 0;
    updateProductCalculations(index, { dozenPriceUsd: Number(usdValue.toFixed(2)), price: iqdValue });
  };

  const handlePackagingTextChange = (index: number, packaging: string) => {
    setProducts(prev => {
      const newProducts = [...prev];
      newProducts[index] = { ...newProducts[index], packaging };
      return newProducts;
    });
  };

  const handleForceCrushChange = (index: number, forceStandardCrush: boolean) => {
    updateProductCalculations(index, { forceStandardCrush });
  };

  const handlePiecesCountChange = (index: number, piecesCount: number) => {
    updateProductCalculations(index, { piecesCount });
  };`
);

// We still need to remove the old handleIqdPriceChange since the regex above only matched until the end of handlePriceAndPackaging
code = code.replace(
  /const handleIqdPriceChange = \([\s\S]*?return newProducts;\n    \}\);\n  \};/,
  ``
);

// Now update the form inputs

// USD Input
code = code.replace(
  /onChange=\{\(e\) =>\s*handlePriceAndPackaging\(\s*idx,\s*Number\(e\.target\.value\),\s*product\.packaging \|\| '',\s*product\.piecesCount \|\| 12,\s*product\.forceStandardCrush\s*\)\s*\}/,
  `onChange={(e) => handleUsdPriceChange(idx, Number(e.target.value))}`
);

// IQD Input
code = code.replace(
  /onChange=\{\(e\) => handleIqdPriceChange\(\s*idx,\s*Number\(e\.target\.value\),\s*product\.packaging \|\| "",\s*product\.piecesCount \|\| 12,\s*product\.forceStandardCrush\s*\)\}/,
  `onChange={(e) => handleIqdPriceChange(idx, Number(e.target.value))}`
);

// Packaging text input
code = code.replace(
  /onChange=\{\(e\) => \{\s*const val = e\.target\.value;\s*const num = product\.piecesCount \|\| 12;\s*handlePriceAndPackaging\([\s\S]*?\);\s*\}\}/,
  `onChange={(e) => handlePackagingTextChange(idx, e.target.value)}`
);

// Force Crush Select
code = code.replace(
  /onChange=\{\(e\) => \{\s*const forceCrush = e\.target\.value === 'yes';\s*handlePriceAndPackaging\([\s\S]*?\);\s*\}\}/,
  `onChange={(e) => handleForceCrushChange(idx, e.target.value === 'yes')}`
);

// Pieces Count Input
code = code.replace(
  /onChange=\{\(e\) => \{\s*const num = parseInt\(e\.target\.value\) \|\| 1;\s*handlePriceAndPackaging\([\s\S]*?\);\s*\}\}/,
  `onChange={(e) => handlePiecesCountChange(idx, parseInt(e.target.value) || 1)}`
);

fs.writeFileSync('src/components/admin/BatchProductUpload.tsx', code);
