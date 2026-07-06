const fs = require('fs');
let code = fs.readFileSync('vite.config.ts', 'utf8');

code = code.replace(
  /workbox: {/,
  `workbox: {\n          importScripts: ['/custom-sw.js'],`
);

fs.writeFileSync('vite.config.ts', code);
