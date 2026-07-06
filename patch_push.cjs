const fs = require('fs');
let code = fs.readFileSync('src/pushService.ts', 'utf8');

code = code.replace(
  /return !!subscription;/,
  `if (subscription) {
      fetch('/api/subscribe', {
        method: 'POST',
        body: JSON.stringify(subscription),
        headers: { 'Content-Type': 'application/json' }
      }).catch(console.error);
      return true;
    }
    return false;`
);

fs.writeFileSync('src/pushService.ts', code);
