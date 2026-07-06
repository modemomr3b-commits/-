const fs = require('fs');
let code = fs.readFileSync('src/components/member/ProductDetail.tsx', 'utf8');

code = code.replace(
  /<\/div>\n            <\/div>\n                <div className="glass-panel/g,
  `</div>
                <div className="glass-panel`
);

fs.writeFileSync('src/components/member/ProductDetail.tsx', code);
