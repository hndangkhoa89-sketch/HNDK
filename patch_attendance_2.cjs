const fs = require('fs');
let code = fs.readFileSync('src/components/AttendanceTab.tsx', 'utf8');

const buttonsHTML = `
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <button 
            disabled={readOnly || saving}
            onClick={() => save()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-2 px-6 rounded-xl transition-colors"
          >
            Lưu ngay
          </button>
          
          <button 
            disabled={readOnly || saving || attendanceList.length === 0}
            onClick={handleCheckAllCurrentView}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-bold py-2 px-4 rounded-xl transition-colors"
          >
            Điểm danh hết tổ đang lọc
          </button>
          
          {isAdmin && (
            <button 
              disabled={readOnly || saving}
              onClick={handleCheckAllGlobal}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold py-2 px-4 rounded-xl transition-colors"
            >
              Điểm danh tất cả công đoàn viên
            </button>
          )}

          {saving && <span className="text-sm font-semibold text-slate-500 flex items-center gap-1"><Loader2 className="h-4 w-4 animate-spin" /> Đang lưu...</span>}
        </div>
`;

// Remove the old buttons at the end
code = code.replace(/<div className="mt-4 flex flex-wrap items-center gap-3">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*\);\s*}/, "      </div>\n    </div>\n  );\n}");

// Add the buttons right before the table
code = code.replace(
  /<div className="overflow-x-auto border border-slate-200 rounded-xl">/,
  buttonsHTML.trim() + '\n\n        <div className="overflow-x-auto border border-slate-200 rounded-xl">'
);

fs.writeFileSync('src/components/AttendanceTab.tsx', code);
