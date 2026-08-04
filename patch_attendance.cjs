const fs = require('fs');
let code = fs.readFileSync('src/components/AttendanceTab.tsx', 'utf8');

// Add the two new handler functions
const newFunctions = `
  const handleCheckAllCurrentView = () => {
    const list = attendanceList.map(item => ({ ...item, present: true }));
    setAttendanceList(list);
    scheduleSave(list);
  };

  const handleCheckAllGlobal = async () => {
    try {
      const res = await Swal.fire({
        title: 'Xác nhận',
        text: 'Điểm danh CÓ MẶT cho TẤT CẢ công đoàn viên trong toàn trường?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Đồng ý',
        cancelButtonText: 'Hủy'
      });
      
      if (res.isConfirmed) {
        setSaving(true);
        const allRes = await request(\`/attendance/\${activityId}?groupId=ALL\`);
        const list = allRes.map((item: any) => ({ ...item, present: true }));
        
        await request(\`/attendance/\${activityId}\`, {
          method: 'POST',
          body: JSON.stringify({ rows: list }),
        });
        
        await loadAttendance();
        setSaving(false);
        Swal.fire('Thành công', 'Đã điểm danh tất cả', 'success');
      }
    } catch (err: any) {
      Swal.fire('Lỗi', err.message, 'error');
      setSaving(false);
    }
  };
`;

code = code.replace("  const scheduleSave = (list: any[]) => {", newFunctions + "\n  const scheduleSave = (list: any[]) => {");

// Add buttons
const buttonsHTML = `
        <div className="mt-4 flex flex-wrap items-center gap-3">
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

code = code.replace(/<div className="mt-4 flex items-center gap-3">[\s\S]*?<\/div>/, buttonsHTML.trim());

fs.writeFileSync('src/components/AttendanceTab.tsx', code);
