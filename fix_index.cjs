const fs = require('fs');
let content = fs.readFileSync('index.html', 'utf-8');
content = content.replace(/<script>\s*if \('serviceWorker' in navigator\).*?<\/script>/s, '');
fs.writeFileSync('index.html', content);
