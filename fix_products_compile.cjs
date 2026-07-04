const fs = require('fs');
let code = fs.readFileSync('src/components/member/Products.tsx', 'utf8');

// fix import
if (!code.includes('import ImageViewer')) {
  code = code.replace(
    'import { PriceHistoryViewer } from "./PriceHistoryViewer";',
    'import { PriceHistoryViewer } from "./PriceHistoryViewer";\nimport ImageViewer from "../ImageViewer";'
  );
}

// remove setDisplayedCount useEffect logic
code = code.replace(
  /const savedScroll = sessionStorage\.getItem\(`scroll_\$\{categoryId \|\| 'all'\}`\);\n\s*if \(savedScroll\) \{\n\s*setDisplayedCount\(Math\.max\(30, Math\.ceil\(parseInt\(savedScroll\) \/ 200\) \* 4 \+ 10\)\);\n\s*setTimeout\(\(\) => window\.scrollTo\(0, parseInt\(savedScroll\)\), 100\);\n\s*\}/g,
  `const savedScroll = sessionStorage.getItem(\`scroll_\${categoryId || 'all'}\`);
        if (savedScroll) {
          setTimeout(() => window.scrollTo(0, parseInt(savedScroll)), 100);
        }`
);

fs.writeFileSync('src/components/member/Products.tsx', code);
