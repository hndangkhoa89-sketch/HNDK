const fs = require('fs');
let code = fs.readFileSync('src/components/MemberStatsTab.tsx', 'utf8');

code = code.replace(
  "const [stats, setStats] = useState<any>(null);",
  "const [stats, setStats] = useState<any>(null);\n  const [filterGroupId, setFilterGroupId] = useState<string>('ALL');"
);

code = code.replace(
  "  // Sort by percentage descending, then by name\n  const sortedMembers = [...memberStats].sort((a, b) => {",
  "  // Filter by group\n  const filteredMembers = memberStats.filter((m: any) => filterGroupId === 'ALL' || m.groupId === filterGroupId);\n\n  // Sort by percentage descending, then by name\n  const sortedMembers = [...filteredMembers].sort((a, b) => {"
);

const htmlToReplace = `<button 
            onClick={handleExport}
            className="bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-3 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors"
          >
            <Download className="h-4 w-4" /> Xuất Excel
          </button>`;

const newHtml = `<div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-700 whitespace-nowrap">Lọc tổ:</span>
              <select 
                value={filterGroupId}
                onChange={e => setFilterGroupId(e.target.value)}
                className="rounded-xl border-slate-300 shadow-sm p-2 bg-slate-50 border focus:border-blue-500 focus:ring-blue-500 text-sm font-bold"
              >
                <option value="ALL">Tất cả tổ công đoàn</option>
                {data?.groups?.map((g: any) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
            <button 
              onClick={handleExport}
              className="bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-3 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors"
            >
              <Download className="h-4 w-4" /> Xuất Excel
            </button>
          </div>`;

code = code.replace(htmlToReplace, newHtml);

fs.writeFileSync('src/components/MemberStatsTab.tsx', code);
