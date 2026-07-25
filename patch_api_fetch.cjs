const fs = require('fs');
const file = 'src/api.ts';
let content = fs.readFileSync(file, 'utf-8');
content = content.replace(
  "if (!res.ok) throw new Error('Failed to fetch users');",
  "if (!res.ok) { const text = await res.text(); console.error('Error fetching users:', res.status, text); throw new Error('Failed to fetch users'); }"
);
fs.writeFileSync(file, content);
