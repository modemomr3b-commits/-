let newProduct = { price: 109500, dozenPriceUsd: 73, piecesCount: 12, forceStandardCrush: false };
const target = newProduct;
const usdRate = 1500;
let customPieces = 18;
let forceStandardCrush = false;

let pieces = forceStandardCrush ? 12 : (customPieces || 12);
const calcPieces = forceStandardCrush ? 12 : pieces;

const usdValue = target.dozenPriceUsd || 0;
const iqdValue = target.price || 0;

const pieceUsd = calcPieces > 0 ? usdValue / calcPieces : 0;
const pieceIqd = calcPieces > 0 ? iqdValue / calcPieces : 0;

const updated = {
  ...target,
  packaging: "18",
  piecesCount: pieces,
  forceStandardCrush,
  piecePriceUsd: Number(pieceUsd.toFixed(2)),
  piecePriceIqd: pieceIqd,
};

console.log(updated);
