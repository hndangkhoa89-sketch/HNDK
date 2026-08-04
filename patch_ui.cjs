const fs = require('fs');
let code = fs.readFileSync('src/components/AttendanceTab.tsx', 'utf8');

code = code.replace(
  "const isAdmin = dbUser?.role === 'ADMIN';",
  "const isAdmin = dbUser?.role === 'ADMIN';\n  const canFilterGroup = isAdmin || !dbUser?.groupId;"
);

// Replace {isAdmin && ( with {canFilterGroup && ( specifically for the select group dropdown
code = code.replace(
  /{isAdmin && \(\s*<div className="flex-1">\s*<label className="block text-sm font-bold text-slate-700 mb-1">Chọn tổ công đoàn<\/label>/,
  "{canFilterGroup && (\n            <div className=\"flex-1\">\n              <label className=\"block text-sm font-bold text-slate-700 mb-1\">Chọn tổ công đoàn</label>"
);

fs.writeFileSync('src/components/AttendanceTab.tsx', code);
