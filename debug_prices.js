const target = 109496.4;
for (let rate = 145000; rate <= 155000; rate += 10) {
  const r = rate / 100;
  for (let usd = 70; usd <= 80; usd += 0.01) {
    if (Math.abs(usd * r - target) < 0.001) {
      console.log("Found:", r, usd);
    }
  }
}
