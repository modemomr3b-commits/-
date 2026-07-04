const targetResult = 109496.4;
for (let r = 1400; r <= 1600; r+=0.1) {
  const u = Number((109500 / r).toFixed(2));
  if (Math.abs(u * r - targetResult) < 0.001) {
    console.log("Found rate:", r, "usdValue:", u);
  }
}
