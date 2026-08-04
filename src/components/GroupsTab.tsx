import React, { useState, useEffect, useRef } from 'react';
import { useApi } from '../hooks/useApi';
import Swal from 'sweetalert2';
import { exportToExcel, readExcel } from '../lib/excel';
import { Upload, Download } from 'lucide-react';

export default function GroupsTab() {
  const { request } = useApi();
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [newName, setNewName] = useState('');

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      const res = await request('/dashboard');
      setGroups(res.groups || []);
      setSelectedGroupIds(new Set());
    } catch (err: any) {
      Swal.fire('Lỗi', err.message, 'error');
    }
  };

  const handleAdd = async () => {
    if (!newName) {
      Swal.fire('Lỗi', 'Vui lòng nhập tên tổ', 'error');
      return;
    }

    try {
      await request('/groups', {
        method: 'POST',
        body: JSON.stringify({
          id: newName,
          name: newName,
        }),
      });
      Swal.fire('Thành công', 'Đã thêm tổ công đoàn', 'success');
      setNewName('');
      loadGroups();
    } catch (err: any) {
      Swal.fire('Lỗi', err.message, 'error');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const res = await Swal.fire({
      title: 'Xóa tổ công đoàn?',
      text: `Xác nhận xóa tổ "${name}"? Thao tác này có thể lỗi nếu tổ đang có giáo viên.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Đồng ý',
      cancelButtonText: 'Hủy'
    });
    
    if (res.isConfirmed) {
      try {
        await request(`/groups/${id}`, {
          method: 'DELETE',
        });
        Swal.fire('Thành công', 'Đã xóa tổ', 'success');
        loadGroups();
      } catch (err: any) {
        Swal.fire('Lỗi', err.message, 'error');
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedGroupIds.size === 0) return;
    
    const res = await Swal.fire({
      title: 'Xóa các tổ đã chọn?',
      text: `Xác nhận xóa ${selectedGroupIds.size} tổ công đoàn?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Đồng ý',
      cancelButtonText: 'Hủy'
    });
    
    if (res.isConfirmed) {
      try {
        for (const id of selectedGroupIds) {
          await request(`/groups/${id}`, { method: 'DELETE' });
        }
        Swal.fire('Thành công', `Đã xóa ${selectedGroupIds.size} tổ`, 'success');
        loadGroups();
      } catch (err: any) {
        Swal.fire('Lỗi', 'Có lỗi khi xóa: ' + err.message, 'error');
        loadGroups();
      }
    }
  };

  const toggleSelectAll = () => {
    if (selectedGroupIds.size === groups.length) {
      setSelectedGroupIds(new Set());
    } else {
      setSelectedGroupIds(new Set(groups.map((g: any) => g.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedGroupIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedGroupIds(newSelected);
  };

  const handleExport = () => {
    const columns = [
      { header: 'Tên Tổ', key: 'name', width: 40 },
    ];
    
    const data = groups.map(g => ({
      name: g.name,
    }));
    
    exportToExcel('Danh_sach_to_cong_doan', columns, data);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const rows = await readExcel(file);
      // Expected: Tên Tổ
      for (const row of rows) {
        let name = '';
        if (row.length >= 2 && row[1]) {
          name = String(row[1]).trim();
        } else if (row[0]) {
          name = String(row[0]).trim();
        }
        
        if (!name) continue;
        
        await request('/groups', {
          method: 'POST',
          body: JSON.stringify({ id: name, name }),
        });
      }
      
      Swal.fire('Thành công', 'Đã nhập dữ liệu từ Excel', 'success');
      loadGroups();
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
        <h2 className="text-lg font-bold text-slate-800 mb-4">Quản lý Tổ công đoàn</h2>
        
        <div className="grid grid-cols-1 mb-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Tên Tổ công đoàn</label>
            <input 
              value={newName} onChange={e => setNewName(e.target.value)}
              className="w-full rounded-xl border-slate-300 shadow-sm p-2.5 bg-white border focus:border-blue-500 focus:ring-blue-500"
              placeholder="Nhập tên Tổ công đoàn"
            />
          </div>
        </div>
        
        <button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl transition-colors">
          Thêm/Cập nhật tổ
        </button>
      </div>

      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-slate-800 m-0">Danh sách Tổ công đoàn</h2>
            {selectedGroupIds.size > 0 && (
              <button 
                onClick={handleBulkDelete}
                className="bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-xl text-sm font-bold flex items-center gap-1 transition-colors"
              >
                Xóa {selectedGroupIds.size} mục
              </button>
            )}
          </div>
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
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 w-12">
                  <input 
                    type="checkbox" 
                    checked={groups.length > 0 && selectedGroupIds.size === groups.length}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Tên Tổ công đoàn</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {groups.map((g: any) => (
                <tr key={g.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm">
                    <input 
                      type="checkbox" 
                      checked={selectedGroupIds.has(g.id)}
                      onChange={() => toggleSelect(g.id)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-slate-900">{g.name}</td>
                  <td className="px-4 py-3 text-center">
                    <button 
                      onClick={() => handleDelete(g.id, g.name)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
              {groups.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-slate-500">Chưa có tổ công đoàn.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
