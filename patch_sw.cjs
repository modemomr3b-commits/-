const fs = require('fs');
let code = fs.readFileSync('public/custom-sw.js', 'utf8');

if (!code.includes('clients.matchAll')) {
  code = code.replace(
    /self\.addEventListener\('push', function\(event\) \{/,
    `self.addEventListener('push', function(event) {
  event.waitUntil((async () => {
    const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    const isAdminOpen = clientList.some(client => client.url.includes('/admin'));
    if (isAdminOpen) return;
`
  );
  code = code.replace(
    /event\.waitUntil\(self\.registration\.showNotification\(title, options\)\);\n\}\);/,
    `await self.registration.showNotification(title, options);\n  })());\n});`
  );
  fs.writeFileSync('public/custom-sw.js', code);
}
