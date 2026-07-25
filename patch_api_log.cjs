const fs = require('fs');
const file = 'src/api.ts';
let content = fs.readFileSync(file, 'utf-8');
content = content.replace(
  'return await res.json();',
  'const data = await res.json(); console.log("api.ts getUsers got data:", data); return data;'
);
fs.writeFileSync(file, content);
