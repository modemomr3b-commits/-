const fs = require('fs');
const file = 'src/components/admin/UserManager.tsx';
let content = fs.readFileSync(file, 'utf-8');

content = content.replace(
  /const filteredUsers = users\.filter\([^}]+\}\);/s,
  `const filteredUsers = users.filter(u => {
    if (!searchQuery) return true;
    const sq = searchQuery.toLowerCase();
    return (
      (u.username && String(u.username).toLowerCase().includes(sq)) ||
      (u.fullName && String(u.fullName).toLowerCase().includes(sq)) ||
      (u.phone && String(u.phone).toLowerCase().includes(sq)) ||
      (u.userNumber && String(u.userNumber).toLowerCase().includes(sq))
    );
  });`
);

content = content.replace(/setFetchError\([^;]+\);?/g, "");
content = content.replace(/\{fetchError && [^\}]+\}/g, "");
content = content.replace(/const \[fetchError[^;]+;/g, "");
content = content.replace(/if \(\!Array.isArray\(dbUsers\)\) \{.*?\} else \{ (setUsers[^;]+;) \}/g, "$1");

fs.writeFileSync(file, content);
