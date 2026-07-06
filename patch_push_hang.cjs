const fs = require('fs');
let code = fs.readFileSync('src/pushService.ts', 'utf8');

code = code.replace(
  /const registration = await navigator\.serviceWorker\.ready;/,
  `
    let registration;
    try {
      registration = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Service Worker timeout - لم يتم العثور على Service Worker')), 5000))
      ]);
    } catch (swErr) {
      alert('خطأ: ' + swErr.message);
      return false;
    }
  `
);

code = code.replace(
  /function urlBase64ToUint8Array\(base64String: string\) \{/,
  `function urlBase64ToUint8Array(base64String: string) {
  base64String = base64String.trim();`
);

fs.writeFileSync('src/pushService.ts', code);
