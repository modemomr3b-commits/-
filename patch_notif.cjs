const fs = require('fs');
let code = fs.readFileSync('src/components/admin/NotificationManager.tsx', 'utf8');

code = code.replace(
  /await api\.createUpdate\(\{[\s\S]*?\.\.\.newNotif,[\s\S]*?\}\);/,
  `await api.createUpdate({
        ...newNotif,
      });

      // إرسال إشعار للمشتركين (Push Notification)
      try {
        await fetch('/api/notify-publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: newNotif.title,
            body: newNotif.message
          })
        });
      } catch (err) {
        console.error('Failed to send push notification:', err);
      }`
);

fs.writeFileSync('src/components/admin/NotificationManager.tsx', code);
