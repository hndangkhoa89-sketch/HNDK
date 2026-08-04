const fs = require('fs');
let code = fs.readFileSync('src/components/AdminTab.tsx', 'utf8');

code = code.replace(
  "    };\n\\n\\n  const handleDelete = async (id: string) => {",
  "    };\n  const handleDelete = async (id: string) => {"
);

fs.writeFileSync('src/components/AdminTab.tsx', code);
