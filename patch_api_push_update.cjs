const fs = require('fs');
let code = fs.readFileSync('src/api.ts', 'utf8');

code = code.replace(
  /createUpdate: async \(data: any\) => \{\s*const \{ data: r, error \} = await supabase\.from\('updates'\)\.insert\(data\)\.select\(\)\.single\(\);\s*if \(error\) throw error;\s*return r;\s*\}/,
  `createUpdate: async (data: any) => { 
    const { data: r, error } = await supabase.from('updates').insert(data).select().single(); 
    if (error) throw error; 
    
    try {
      fetch('/api/notify-publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: r.title,
          body: r.message
        })
      });
    } catch (e) {}

    return r; 
  }`
);

fs.writeFileSync('src/api.ts', code);
