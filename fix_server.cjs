const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/res\.json\(safeUsers\);\n\s*\} catch \(e\) \{ res\.status\(500\)\.json\(\{ error: e\.message \}\); \}\n\s*\}\);\n\s*\}\n\s*\}\);/,
`res.json(safeUsers);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });`
);
fs.writeFileSync('server.ts', code);
