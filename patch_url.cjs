const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  /url: '\/'/,
  "url: '/messages'"
);

fs.writeFileSync('server.ts', code);
