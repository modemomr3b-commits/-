let newProduct = { price: 0, dozenPriceUsd: 0, piecesCount: 12, forceStandardCrush: false };
const usdRate = 1500;

const handleIqdPriceChange = (iqdValue) => {
  const usdValue = usdRate > 0 ? iqdValue / usdRate : 0;
  const calcPieces = newProduct.forceStandardCrush ? 12 : (newProduct.piecesCount || 12);
  const pieceUsd = calcPieces > 0 ? usdValue / calcPieces : 0;
  const pieceIqd = calcPieces > 0 ? iqdValue / calcPieces : 0;

  newProduct = {
    ...newProduct,
    dozenPriceUsd: Number(usdValue.toFixed(2)),
    price: iqdValue,
    piecePriceUsd: Number(pieceUsd.toFixed(2)),
    piecePriceIqd: pieceIqd,
  };
};

const handlePackagingChange = (packaging, customPieces, forceStandardCrush) => {
  let pieces = forceStandardCrush ? 12 : (customPieces || 12);
  const calcPieces = forceStandardCrush ? 12 : pieces;
  
  const usdValue = newProduct.dozenPriceUsd || 0;
  const iqdValue = newProduct.price || 0;
  
  const pieceUsd = calcPieces > 0 ? usdValue / calcPieces : 0;
  const pieceIqd = calcPieces > 0 ? iqdValue / calcPieces : 0;

  newProduct = {
    ...newProduct,
    packaging,
    piecesCount: pieces,
    forceStandardCrush,
    piecePriceUsd: Number(pieceUsd.toFixed(2)),
    piecePriceIqd: pieceIqd,
  };
};

handleIqdPriceChange(12500);
console.log("After IQD change:", newProduct);
handlePackagingChange("10", 10, false);
console.log("After packaging change:", newProduct);
