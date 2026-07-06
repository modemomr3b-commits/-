const fs = require('fs');

let code = fs.readFileSync('src/components/GlobalNotifications.tsx', 'utf8');

code = code.replace(
  /if \(user\?\.role === 'admin'\) return;/g,
  `// if (user?.role === 'admin') return; // Commented out so admin can see notifications for testing`
);

code = code.replace(
  /const channel = supabase[\s\S]*?\.subscribe\(\);/,
  `const channel = supabase
      .channel('public:announcements')
      .on('broadcast', { event: 'new_product' }, (payload) => {
        const newProduct = payload.payload;
        setNotifications(prev => [...prev, newProduct]);
        setTimeout(() => {
          setNotifications(prev => prev.filter(n => n.id !== newProduct.id));
        }, 8000);
      })
      .subscribe();`
);

fs.writeFileSync('src/components/GlobalNotifications.tsx', code);
