for (let rate = 1300; rate <= 1600; rate++) {
    const usd = 109500 / rate;
    const pieceUsd = Number((usd / 18).toFixed(2));
    const backIqd = pieceUsd * 18 * rate;
    if (Math.abs(backIqd - 109496.4) < 1) {
       console.log("Found rate:", rate, "pieceUsd:", pieceUsd, "backIqd:", backIqd);
    }
}
