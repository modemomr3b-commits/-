const fs = require('fs');

let code = fs.readFileSync('src/api.ts', 'utf8');

code = code.replace(
  /if \(oldProduct && !safeData\.size\?\.isHidden\) \{/,
  `console.log("oldProduct:", oldProduct, "safeData.size:", safeData.size);
    if (oldProduct && !safeData.size?.isHidden) {
      console.log("Sending visibility notification!");`
);

fs.writeFileSync('src/api.ts', code);
