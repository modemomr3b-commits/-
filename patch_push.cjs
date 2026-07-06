const fs = require('fs');
let code = fs.readFileSync('src/pushService.ts', 'utf8');

const replacement = `
      const vapidPublicKey = 'BLyNGvqb8WAkMzf7JPOzKihbeHnZR_fcVPCC3Hv1382Y1EoNhw3uDIBL4l6eF6lezioeP1XGmqr4Al2WPy--Qpk';
      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
`;

code = code.replace(
  /const response = await fetch\('\/api\/vapidPublicKey'\);\s*const vapidPublicKey = await response\.text\(\);\s*const convertedVapidKey = urlBase64ToUint8Array\(vapidPublicKey\);/,
  replacement
);

fs.writeFileSync('src/pushService.ts', code);
