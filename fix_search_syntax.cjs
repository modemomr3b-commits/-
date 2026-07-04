const fs = require('fs');
let code = fs.readFileSync('src/components/member/SearchPage.tsx', 'utf8');

code = code.replace(
  '               )}\n             )}\n           </div>\n        </div>\n  );\n}',
  '               )}\n        </div>\n  );\n}'
);

fs.writeFileSync('src/components/member/SearchPage.tsx', code);
