const fs = require('fs');
let code = fs.readFileSync('src/components/TeachersTab.tsx', 'utf8');

const handleEditCode = `  const handleEdit = (t: any) => {
    setNewId(t.id);
    setNewName(t.name);
    setNewGroupId(t.groupId);
    setNewRole(t.role || 'Đoàn viên');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };`;

code = code.replace(
  "  const handleDelete = async (id: string, name: string) => {",
  handleEditCode + "\n\n  const handleDelete = async (id: string, name: string) => {"
);

const oldButtons = `<td className="px-4 py-3 text-center">
                    <button 
                      onClick={() => handleDelete(t.id, t.name)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100"
                    >
                      Xóa
                    </button>
                  </td>`;

const newButtons = `<td className="px-4 py-3 text-center flex items-center justify-center gap-2">
                    <button 
                      onClick={() => handleEdit(t)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-600 hover:bg-blue-100"
                    >
                      Sửa
                    </button>
                    <button 
                      onClick={() => handleDelete(t.id, t.name)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100"
                    >
                      Xóa
                    </button>
                  </td>`;

code = code.replace(oldButtons, newButtons);

fs.writeFileSync('src/components/TeachersTab.tsx', code);
