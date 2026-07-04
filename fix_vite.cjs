const fs = require('fs');
let code = fs.readFileSync('vite.config.ts', 'utf8');
code = code.replace('devOptions: {\n          enabled: true\n        }', 'devOptions: {\n          enabled: false\n        }');
fs.writeFileSync('vite.config.ts', code);
