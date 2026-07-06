const fs = require('fs');

let code = fs.readFileSync('src/api.ts', 'utf8');

// 1. Remove rate limit in createProduct
code = code.replace(
  /let history = \[\];[\s\S]*?if \(history\.length < 2\) \{([\s\S]*?)\n\s*history\.push\(now\);[\s\S]*?\} catch \(e\) \{\}\n\s*\}/,
  `$1
      } catch (e) {}`
);

// 2. Add notification for updateProduct when it becomes visible
// Need to find where updateProduct is defined
const updateProductRegex = /updateProduct: async \(id: string, data: any\) => \{/;
code = code.replace(updateProductRegex, `updateProduct: async (id: string, data: any) => {
    // Check if it's being made visible
    const wasHidden = data.isHidden === false; // If they passed isHidden: false
    let oldProduct = null;
    if (wasHidden) {
      const { data: op } = await supabase.from('products').select('size').match({ id }).single();
      if (op?.size?.isHidden) oldProduct = op;
    }
`);

const returnRegex = /const \{ data: r, error \} = await supabase\.from\('products'\)\.update\(safeData\)\.match\(\{ id \}\)\.select\(\)\.single\(\); \n\s*if \(error\) throw error;/;
code = code.replace(returnRegex, `const { data: r, error } = await supabase.from('products').update(safeData).match({ id }).select().single(); 
    if (error) throw error;
    
    if (oldProduct && !safeData.size?.isHidden) {
      try {
        fetch('/api/notify-publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: '🚨 الموديل متاح الآن!',
            body: 'الموديل ' + r.name + ' أصبح متوفراً الآن في متجر شركة الوفاء المتميز BRQ. تسوق الآن!'
          })
        });
      } catch (e) {}
    }
`);

fs.writeFileSync('src/api.ts', code);
