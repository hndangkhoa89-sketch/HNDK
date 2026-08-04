const fs = require('fs');
let code = fs.readFileSync('src/components/AdminTab.tsx', 'utf8');

code = code.replace(/\\n/g, "\n");

fs.writeFileSync('src/components/AdminTab.tsx', code);
