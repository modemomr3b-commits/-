const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  /async function saveSubscriptions\(\) \{[\s\S]*?\} catch \(e\) \{\}/,
  `async function saveSubscriptions() {
  try {
    const { error } = await supabaseAdmin.from('settings').upsert({ id: 'push_subs', data: subscriptions });
    if (error) console.error("Error saving subs:", error);
    else console.log("Saved subscriptions:", subscriptions.length);
  } catch (e) {
    console.error("Exception saving subs:", e);
  }`
);

fs.writeFileSync('server.ts', code);
