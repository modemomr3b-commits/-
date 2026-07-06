const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

if (!code.includes("import Messages from './components/member/Messages';")) {
  code = code.replace(
    /import Profile from '.\/components\/member\/Profile';/,
    "import Profile from './components/member/Profile';\nimport Messages from './components/member/Messages';"
  );
}

if (!code.includes('<Route path="messages" element={<Messages />} />')) {
  code = code.replace(
    /<Route path="profile" element=\{<Profile \/>\} \/>/,
    `<Route path="profile" element={<Profile />} />\n            <Route path="messages" element={<Messages />} />`
  );
}

fs.writeFileSync('src/App.tsx', code);
