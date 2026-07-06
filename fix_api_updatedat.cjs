const fs = require('fs');
let code = fs.readFileSync('src/api.ts', 'utf8');

code = code.replace(
  /updatedAt: p\.size\?\.updatedAt \|\| p\.createdAt,\n\s*updatedAt: p\.size\?\.updatedAt \|\| p\.createdAt/g,
  `updatedAt: p.size?.updatedAt || p.createdAt`
);

fs.writeFileSync('src/api.ts', code);
