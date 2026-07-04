const fs = require('fs');
let code = fs.readFileSync('src/components/admin/BatchProductUpload.tsx', 'utf8');

// The new implementation block starts with `const updateProductCalculations =`
// and ends right before `const handleImageUpload =`
// I'll replace everything between them with a clean version.

const newImplementation = `const updateProductCalculations = (
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
  };`;

// Replace from `const updateProductCalculations` to `const handleImageUpload`
const regex = /const updateProductCalculations = \([\s\S]*?(?=const handleImageUpload = )/;
code = code.replace(regex, newImplementation + '\n\n  ');

fs.writeFileSync('src/components/admin/BatchProductUpload.tsx', code);
