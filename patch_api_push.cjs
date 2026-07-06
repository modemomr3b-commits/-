const fs = require('fs');
let code = fs.readFileSync('src/api.ts', 'utf8');

code = code.replace(
  /return \{ \.\.\.r, isHidden: r\.size\?\.isHidden \|\| false, oldPriceInfo: r\.size\?\.oldPriceInfo \|\| undefined, forceStandardCrush: r\.size\?\.forceStandardCrush \?\? true \};/,
  `
    try {
      fetch('/api/notify-publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'منتج جديد من الوفاء!',
          body: 'تمت إضافة ' + r.name + ' للتو، سارع لتفقد المتجر.'
        })
      });
    } catch (e) {}
    return { ...r, isHidden: r.size?.isHidden || false, oldPriceInfo: r.size?.oldPriceInfo || undefined, forceStandardCrush: r.size?.forceStandardCrush ?? true };`
);

fs.writeFileSync('src/api.ts', code);
