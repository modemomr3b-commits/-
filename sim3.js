for (let rate = 1000; rate <= 2000; rate += 1) {
  const usdValue = Number((109500 / rate).toFixed(2));
  for (let pieces = 1; pieces <= 50; pieces++) {
     const pieceUsd = usdValue / pieces;
     const roundedPieceUsd = Number(pieceUsd.toFixed(2));
     
     // What if price is recalculated somewhere?
     // e.g. from roundedPieceUsd
     let possiblePrice1 = roundedPieceUsd * pieces * rate;
     if (Math.abs(possiblePrice1 - 109496.4) < 0.1) {
       console.log("Match1!", rate, pieces, roundedPieceUsd);
     }
  }
}
