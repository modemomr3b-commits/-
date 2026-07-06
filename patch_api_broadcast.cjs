const fs = require('fs');
let code = fs.readFileSync('src/api.ts', 'utf8');

// For createProduct
code = code.replace(
  /fetch\('\/api\/notify-publish', \{[\s\S]*?\}\);/g,
  (match) => {
    return `supabase.channel('public:announcements').send({
          type: 'broadcast',
          event: 'new_product',
          payload: r
        });\n        ${match}`;
  }
);

fs.writeFileSync('src/api.ts', code);
