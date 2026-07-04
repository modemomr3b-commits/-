const fs = require('fs');
let code = fs.readFileSync('src/components/admin/ProductManager.tsx', 'utf8');

const regexPrice = /const handlePriceAndPackaging = \([\s\S]*?const handleIqdPriceChange = \([\s\S]*?\}\n  \};\n/m;

const replacement = `const handleUsdPriceChange = (
    usdValue: number,
    isEditing: boolean = false
  ) => {
    const target = isEditing ? editingProduct : newProduct;
    if (!target) return;
    
    const iqdValue = usdValue * usdRate;
    const calcPieces = target.forceStandardCrush ? 12 : (target.piecesCount || 12);
    const pieceUsd = calcPieces > 0 ? usdValue / calcPieces : 0;
    const pieceIqd = calcPieces > 0 ? iqdValue / calcPieces : 0;

    const updated = {
      ...target,
      dozenPriceUsd: Number(usdValue.toFixed(2)),
      price: iqdValue,
      piecePriceUsd: Number(pieceUsd.toFixed(2)),
      piecePriceIqd: pieceIqd,
    };

    if (isEditing) setEditingProduct(updated as any);
    else setNewProduct(updated as any);
  };

  const handleIqdPriceChange = (
    iqdValue: number,
    isEditing: boolean = false
  ) => {
    const target = isEditing ? editingProduct : newProduct;
    if (!target) return;
    
    const usdValue = usdRate > 0 ? iqdValue / usdRate : 0;
    const calcPieces = target.forceStandardCrush ? 12 : (target.piecesCount || 12);
    const pieceUsd = calcPieces > 0 ? usdValue / calcPieces : 0;
    const pieceIqd = calcPieces > 0 ? iqdValue / calcPieces : 0;

    const updated = {
      ...target,
      dozenPriceUsd: Number(usdValue.toFixed(2)),
      price: iqdValue,
      piecePriceUsd: Number(pieceUsd.toFixed(2)),
      piecePriceIqd: pieceIqd,
    };

    if (isEditing) setEditingProduct(updated as any);
    else setNewProduct(updated as any);
  };

  const handlePackagingChange = (
    packaging: string,
    customPieces: number,
    forceStandardCrush: boolean,
    isEditing: boolean = false
  ) => {
    const target = isEditing ? editingProduct : newProduct;
    if (!target) return;
    
    let pieces = forceStandardCrush ? 12 : (customPieces || 12);
    const calcPieces = forceStandardCrush ? 12 : pieces;
    
    const usdValue = target.dozenPriceUsd || 0;
    const iqdValue = target.price || 0;
    
    const pieceUsd = calcPieces > 0 ? usdValue / calcPieces : 0;
    const pieceIqd = calcPieces > 0 ? iqdValue / calcPieces : 0;

    const updated = {
      ...target,
      packaging,
      piecesCount: pieces,
      forceStandardCrush,
      piecePriceUsd: Number(pieceUsd.toFixed(2)),
      piecePriceIqd: pieceIqd,
    };

    if (isEditing) setEditingProduct(updated as any);
    else setNewProduct(updated as any);
  };
`;

code = code.replace(regexPrice, replacement);
fs.writeFileSync('src/components/admin/ProductManager.tsx', code);
