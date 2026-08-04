const fs = require('fs');
let code = fs.readFileSync('src/components/TeachersTab.tsx', 'utf8');

// Insert filteredTeachers
code = code.replace(
  "const handleExport = () => {",
  "const filteredTeachers = teachers.filter((t: any) => filterGroupId === 'ALL' || t.groupId === filterGroupId);\n\n  const handleExport = () => {"
);

// Update toggleSelectAll
code = code.replace(
  "  const toggleSelectAll = () => {\n    if (selectedTeacherIds.size === teachers.length) {\n      setSelectedTeacherIds(new Set());\n    } else {\n      setSelectedTeacherIds(new Set(teachers.map((t: any) => t.id)));\n    }\n  };",
  "  const toggleSelectAll = () => {\n    if (selectedTeacherIds.size === filteredTeachers.length && filteredTeachers.length > 0) {\n      setSelectedTeacherIds(new Set());\n    } else {\n      setSelectedTeacherIds(new Set(filteredTeachers.map((t: any) => t.id)));\n    }\n  };"
);

// Update select all checkbox checked condition
code = code.replace(
  "checked={teachers.length > 0 && selectedTeacherIds.size === teachers.length}",
  "checked={filteredTeachers.length > 0 && selectedTeacherIds.size === filteredTeachers.length}"
);

// Update table mapping
code = code.replace(
  "{teachers.filter(t => filterGroupId === 'ALL' || t.groupId === filterGroupId).map((t: any) => (",
  "{filteredTeachers.map((t: any) => ("
);

// Add Label to filter
code = code.replace(
  /<select \n\s*value=\{filterGroupId\}/,
  '<span className="text-sm font-bold text-slate-700 whitespace-nowrap">Lọc tổ:</span>\n            <select \n              value={filterGroupId}'
);

fs.writeFileSync('src/components/TeachersTab.tsx', code);
