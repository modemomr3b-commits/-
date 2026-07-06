const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/icon: '\/icon-192\.png'/g, "icon: '/logo.jpeg.jpeg'");

fs.writeFileSync('server.ts', code);
