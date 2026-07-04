const targetResult = 109496.4;
// Maybe usdValue * usdRate = targetResult
for (let rate = 1300; rate <= 1600; rate += 1) {
    const usd = targetResult / rate;
    if (Math.abs(usd - Math.round(usd * 100) / 100) < 0.0001) {
        console.log("Found rate:", rate, "usd:", usd);
    }
}
