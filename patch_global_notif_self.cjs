const fs = require('fs');
let code = fs.readFileSync('src/components/GlobalNotifications.tsx', 'utf8');

code = code.replace(
  /\.channel\('public:announcements'\)/,
  `.channel('public:announcements', { config: { broadcast: { self: true } } })`
);

fs.writeFileSync('src/components/GlobalNotifications.tsx', code);
