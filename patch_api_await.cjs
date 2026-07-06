const fs = require('fs');

let code = fs.readFileSync('src/api.ts', 'utf8');

code = code.replace(
  /fetch\('\/api\/notify-publish', \{/,
  `await fetch('/api/notify-publish', {`
);

fs.writeFileSync('src/api.ts', code);
