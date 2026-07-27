const fs = require('fs');
const file = 'index.html';
let content = fs.readFileSync(file, 'utf-8');

const swScript = `
    <script>
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(function(registrations) {
          let hasUnregistered = false;
          for(let registration of registrations) {
            registration.unregister();
            hasUnregistered = true;
          }
          if (hasUnregistered) {
            window.location.reload(true);
          }
        });
      }
    </script>
`;

if (!content.includes('registration.unregister()')) {
  content = content.replace('</head>', swScript + '</head>');
  fs.writeFileSync(file, content);
}
