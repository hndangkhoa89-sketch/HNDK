const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  "else if (req.dbUser?.role === 'ADMIN' && groupId && groupId !== 'ALL')",
  "else if (groupId && groupId !== 'ALL')"
);

fs.writeFileSync('server.ts', code);
