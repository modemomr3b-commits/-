const fs = require('fs');
const file = 'src/components/admin/UserManager.tsx';
let content = fs.readFileSync(file, 'utf-8');

content = content.replace(
  'return (\\n<UserManagerErrorBoundary>\\n) => {',
  'return () => {'
);
content = content.replace(
  'return (\\n<UserManagerErrorBoundary>\\n) => {',
  'return () => {'
);
content = content.replace(
  '<UserManagerErrorBoundary>\\n) => {',
  ') => {'
);
// wait, the actual text is:
// console.log("Rendering UserManager, users length:", users.length, "filtered:", filteredUsers.length);\n  return (\n<UserManagerErrorBoundary>\n) => {
content = content.replace(
  /console\.log\("Rendering UserManager[^\n]+\n\s*return \(\n<UserManagerErrorBoundary>\n\) => \{/g,
  'return () => {'
);
fs.writeFileSync(file, content);
