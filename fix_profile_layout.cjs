const fs = require('fs');
let code = fs.readFileSync('src/components/member/Profile.tsx', 'utf8');

// Ensure the button looks nice and fits the dark mode theme.
// It already uses bg-brq-gold etc. which is great.
