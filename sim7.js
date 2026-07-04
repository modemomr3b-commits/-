const target = 109496.4;
for (let rate = 1450; rate <= 1550; rate += 0.01) {
    const usd = 109500 / rate;
    const pieceUsd = Number((usd / 18).toFixed(2));
    
    // Check possible recalculations
    const v1 = Number(usd.toFixed(2)) * rate;
    const v2 = pieceUsd * 18 * rate;
    const v3 = Number(usd.toFixed(2)) * 18;
    
    if (Math.abs(v1 - target) < 0.1) console.log("v1 match", rate, v1);
    if (Math.abs(v2 - target) < 0.1) console.log("v2 match", rate, v2);
}
