import React, { useState, useEffect, useRef } from 'react';
import { useApi } from '../hooks/useApi';
import Swal from 'sweetalert2';
import { format } from 'date-fns';
import { exportToExcel, readExcel } from '../lib/excel';
import { Upload, Download, Trash2, Pencil } from 'lucide-react';

export default function AdminTab() {
  const { request } = useApi();
  const [activities, setActivities] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newNotes, setNewNotes] = useState('');

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    try {
      const res = await request('/dashboard');
      setActivities(res.activities || []);
    } catch (err: any) {
      Swal.fire('Lỗi', err.message, 'error');
    }
  };

  const handleAdd = async () => {
    if (!newName) {
      Swal.fire('Lỗi', 'Vui lòng nhập tên hoạt động', 'error');
      return;
    }
    
    // auto gen id if empty
    let finalId = newId;
    if (!finalId) {
      const nums = activities.map(a => {
        const m = a.id.match(/^HD(\d+)$/i);
        return m ? parseInt(m[1]) : 0;
      });
      const max = nums.length > 0 ? Math.max(...nums) : 0;
      finalId = `HD${max + 1}`;
    }

    try {
      await request('/activities', {
        method: 'POST',
        body: JSON.stringify({
          id: finalId,
          name: newName,
          date: newDate,
          notes: newNotes,
        }),
      });
      Swal.fire('Thành công', 'Đã lưu thông tin hoạt động', 'success');
      setNewId('');
      setNewName('');
      setNewDate('');
      setNewNotes('');
      loadActivities();
    } catch (err: any) {
      Swal.fire('Lỗi', err.message, 'error');
    }
  };

  const toggleApproval = async (id: string, currentStatus: string) => {
    const isApproved = currentStatus === 'APPROVED';
    const title = isApproved ? 'Bỏ duyệt hoạt động?' : 'Duyệt hoạt động?';
    const text = isApproved 
      ? 'Bỏ duyệt hoạt động để các tổ công đoàn có thể khai lại/chỉnh sửa lại điểm danh?'
      : 'Sau khi duyệt, tổ trưởng sẽ không sửa được điểm danh. Xác nhận duyệt?';
      
    const res = await Swal.fire({
      title, text, icon: isApproved ? 'warning' : 'question',
      showCancelButton: true, confirmButtonText: 'Đồng ý', cancelButtonText: 'Hủy'
    });
    
    if (res.isConfirmed) {
      try {
        await request(`/activities/${id}/approval`, {
          method: 'PUT',
          body: JSON.stringify({ approved: !isApproved })
        });
        Swal.fire('Thành công', 'Đã cập nhật trạng thái', 'success');
        loadActivities();
      } catch (err: any) {
        Swal.fire('Lỗi', err.message, 'error');
      }
    }
  };
  
const handleEditName = async (id: string, currentName: string) => {
    const { value: newName } = await Swal.fire({
      title: 'Đổi tên hoạt động',
      input: 'text',
      inputLabel: 'Tên hoạt động mới',
      inputValue: currentName,
      showCancelButton: true,
      confirmButtonText: 'Lưu',
      cancelButtonText: 'Hủy',
      inputValidator: (value) => {
        if (!value) {
          return 'Tên hoạt động không được để trống!';
        }
      }
    });

    if (newName && newName !== currentName) {
      try {
        await request(`/activities/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ name: newName })
        });
        Swal.fire('Thành công', 'Đã đổi tên hoạt động', 'success');
        loadActivities();
      } catch (err: any) {
        Swal.fire('Lỗi', err.message, 'error');
      }
    }
  };

  const handleDelete = async (id: string) => {
    const res = await Swal.fire({
      title: 'Xóa hoạt động?',
      text: 'Bạn không thể hoàn tác thao tác này. Dữ liệu điểm danh của hoạt động này cũng sẽ bị xóa!',
      icon: 'warning',
      showCancelButton: true, confirmButtonText: 'Có, xóa!', cancelButtonText: 'Hủy',
      confirmButtonColor: '#d33',
    });
    
    if (res.isConfirmed) {
      try {
        await request(`/activities/${id}`, {
          method: 'DELETE'
        });
        Swal.fire('Thành công', 'Đã xóa hoạt động', 'success');
        loadActivities();
      } catch (err: any) {
        Swal.fire('Lỗi', err.message, 'error');
      }
    }
  };

  const handleExport = () => {
    const columns = [
      { header: 'Mã HĐ', key: 'id', width: 15 },
      { header: 'Tên hoạt động', key: 'name', width: 40 },
      { header: 'Ngày', key: 'date', width: 20 },
      { header: 'Ghi chú', key: 'notes', width: 40 },
    ];
    
    const data = activities.map(a => ({
      id: a.id,
      name: a.name,
      date: a.date,
      notes: a.notes,
    }));
    
    exportToExcel('Danh_sach_hoat_dong', columns, data);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const rows = await readExcel(file);
      // Expected: Mã HĐ, Tên HĐ, Ngày, Ghi chú
      for (const row of rows) {
        if (!row[0] || !row[1]) continue;
        const id = String(row[0]).trim();
        const name = String(row[1]).trim();
        let date = '';
        if (row[2]) {
           if (row[2] instanceof Date) {
              date = format(row[2], 'yyyy-MM-dd');
           } else {
              date = String(row[2]).trim();
           }
        }
        const notes = row[3] ? String(row[3]).trim() : '';
        
        await request('/activities', {
          method: 'POST',
          body: JSON.stringify({ id, name, date, notes }),
        });
      }
      
      Swal.fire('Thành công', 'Đã nhập dữ liệu từ Excel', 'success');
      loadActivities();
    } catch (err: any) {
      Swal.fire('Lỗi', 'Không thể đọc file Excel: ' + err.message, 'error');
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Thêm/Cập nhật hoạt động công đoàn</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Mã hoạt động</label>
            <input 
              value={newId} onChange={e => setNewId(e.target.value)}
              className="w-full rounded-xl border-slate-300 shadow-sm p-2.5 bg-white border focus:border-blue-500 focus:ring-blue-500"
              placeholder="Ví dụ: HD1. Bỏ trống để tự tạo."
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Ngày hoạt động</label>
            <input 
              type="date"
              value={newDate} onChange={e => setNewDate(e.target.value)}
              className="w-full rounded-xl border-slate-300 shadow-sm p-2.5 bg-white border focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-bold text-slate-700 mb-1">Tên hoạt động</label>
          <input 
            value={newName} onChange={e => setNewName(e.target.value)}
            className="w-full rounded-xl border-slate-300 shadow-sm p-2.5 bg-white border focus:border-blue-500 focus:ring-blue-500"
            placeholder="Nhập tên hoạt động công đoàn"
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-bold text-slate-700 mb-1">Ghi chú</label>
          <textarea 
            value={newNotes} onChange={e => setNewNotes(e.target.value)}
            className="w-full rounded-xl border-slate-300 shadow-sm p-2.5 bg-white border focus:border-blue-500 focus:ring-blue-500 min-h-[80px]"
            placeholder="Ghi chú nếu có"
          />
        </div>
        
        <button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl transition-colors">
          Thêm/Cập nhật hoạt động
        </button>
      </div>

      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
          <h2 className="text-lg font-bold text-slate-800 m-0">Danh sách hoạt động và phê duyệt</h2>
          <div className="flex items-center gap-2">
            <input 
              type="file" 
              accept=".xlsx, .xls" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleImport}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-3 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors"
            >
              <Upload className="h-4 w-4" /> Nhập Excel
            </button>
            <button 
              onClick={handleExport}
              className="bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-3 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors"
            >
              <Download className="h-4 w-4" /> Xuất Excel
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Mã HĐ</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Tên hoạt động</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Ngày</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Người duyệt</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Thời gian duyệt</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {activities.map((a: any) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-bold text-slate-900">{a.id}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{a.name}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{a.date}</td>
                  <td className="px-4 py-3 text-sm">
                    {a.status === 'APPROVED' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800">ĐÃ DUYỆT</span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">ĐANG MỞ</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">{a.approvedBy}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{a.approvedAt ? format(new Date(a.approvedAt), 'dd/MM/yyyy HH:mm') : ''}</td>
                  <td className="px-4 py-3 text-center flex items-center justify-center gap-2">
                    <button 
                      onClick={() => toggleApproval(a.id, a.status)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold ${a.status === 'APPROVED' ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                    >
                      {a.status === 'APPROVED' ? 'Bỏ duyệt' : 'Duyệt'}
                    </button>
                    <button
                      onClick={() => handleEditName(a.id, a.name)}
                      className="text-blue-500 hover:text-blue-700 p-1.5 rounded-lg hover:bg-blue-50"
                      title="Sửa tên"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(a.id)}
                      className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50"
                      title="Xóa hoạt động"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {activities.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">Chưa có hoạt động.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
