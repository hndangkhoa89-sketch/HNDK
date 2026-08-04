import React, { useState, useEffect, useRef } from 'react';
import { useApi } from '../hooks/useApi';
import Swal from 'sweetalert2';
import { exportToExcel, readExcel } from '../lib/excel';
import { Upload, Download } from 'lucide-react';

export default function TeachersTab() {
  const { request } = useApi();
  const [teachers, setTeachers] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');
  const [newGroupId, setNewGroupId] = useState('');
  const [newRole, setNewRole] = useState('Đoàn viên');
  const [filterGroupId, setFilterGroupId] = useState<string>('ALL');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await request('/teachers');
      setTeachers(res.teachers || []);
      setGroups(res.groups || []);
      setSelectedTeacherIds(new Set());
      if (res.groups?.length > 0 && !newGroupId) {
        setNewGroupId(res.groups[0].id);
      }
    } catch (err: any) {
      Swal.fire('Lỗi', err.message, 'error');
    }
  };

  const handleAdd = async () => {
    if (!newName || !newGroupId) {
      Swal.fire('Lỗi', 'Vui lòng nhập đủ tên và chọn tổ', 'error');
      return;
    }
    
    let finalId = newId;
    if (!finalId) {
      const nums = teachers.map(t => {
        const m = t.id.match(/^GV(\d+)$/i);
        return m ? parseInt(m[1]) : 0;
      });
      const max = nums.length > 0 ? Math.max(...nums) : 0;
      finalId = `GV${String(max + 1).padStart(3, '0')}`;
    }

    try {
      await request('/teachers', {
        method: 'POST',
        body: JSON.stringify({
          id: finalId,
          name: newName,
          groupId: newGroupId,
          role: newRole,
        }),
      });
      Swal.fire('Thành công', 'Đã thêm giáo viên', 'success');
      setNewId('');
      setNewName('');
      setNewRole('Đoàn viên');
      loadData();
    } catch (err: any) {
      Swal.fire('Lỗi', err.message, 'error');
    }
  };

  const handleEdit = (t: any) => {
    setNewId(t.id);
    setNewName(t.name);
    setNewGroupId(t.groupId);
    setNewRole(t.role || 'Đoàn viên');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string, name: string) => {
    const res = await Swal.fire({
      title: 'Xóa giáo viên?',
      text: `Xác nhận xóa giáo viên "${name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Đồng ý',
      cancelButtonText: 'Hủy'
    });
    
    if (res.isConfirmed) {
      try {
        await request(`/teachers/${id}`, {
          method: 'DELETE'
        });
        Swal.fire('Thành công', 'Đã xóa giáo viên', 'success');
        loadData();
      } catch (err: any) {
        Swal.fire('Lỗi', err.message, 'error');
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTeacherIds.size === 0) return;
    
    const res = await Swal.fire({
      title: 'Xóa các giáo viên đã chọn?',
      text: `Xác nhận xóa ${selectedTeacherIds.size} giáo viên?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Đồng ý',
      cancelButtonText: 'Hủy'
    });
    
    if (res.isConfirmed) {
      try {
        for (const id of selectedTeacherIds) {
          await request(`/teachers/${id}`, { method: 'DELETE' });
        }
        Swal.fire('Thành công', `Đã xóa ${selectedTeacherIds.size} giáo viên`, 'success');
        loadData();
      } catch (err: any) {
        Swal.fire('Lỗi', 'Có lỗi khi xóa: ' + err.message, 'error');
        loadData();
      }
    }
  };

  const toggleSelectAll = () => {
    if (selectedTeacherIds.size === filteredTeachers.length && filteredTeachers.length > 0) {
      setSelectedTeacherIds(new Set());
    } else {
      setSelectedTeacherIds(new Set(filteredTeachers.map((t: any) => t.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedTeacherIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedTeacherIds(newSelected);
  };

  const filteredTeachers = teachers.filter((t: any) => filterGroupId === 'ALL' || t.groupId === filterGroupId);

  const handleExport = () => {
    const columns = [
      { header: 'Mã GV', key: 'id', width: 15 },
      { header: 'Tên giáo viên', key: 'name', width: 30 },
      { header: 'Tổ công đoàn', key: 'groupName', width: 25 },
      { header: 'Chức vụ', key: 'role', width: 20 },
    ];
    
    const data = teachers.map(t => ({
      id: t.id,
      name: t.name,
      groupName: groups.find(g => g.id === t.groupId)?.name || t.groupId,
      role: t.role,
    }));
    
    exportToExcel('Danh_sach_giao_vien', columns, data);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const rows = await readExcel(file);
      // Expected: Mã GV, Tên giáo viên, Tổ công đoàn, Chức vụ
      for (const row of rows) {
        if (!row[0] || !row[1] || !row[2]) continue;
        const id = String(row[0]).trim();
        const name = String(row[1]).trim();
        const groupName = String(row[2]).trim();
        
        // Find group id by name if possible
        let matchedGroup = groups.find(g => g.name.toLowerCase() === groupName.toLowerCase());
        if (!matchedGroup) {
          try {
            const groupRes = await request('/groups', {
              method: 'POST',
              body: JSON.stringify({ id: groupName, name: groupName }),
            });
            groups.push(groupRes);
            matchedGroup = groupRes;
          } catch (err) {
            console.error("Failed to auto-create group", err);
          }
        }
        const groupId = matchedGroup ? matchedGroup.id : groupName;
        
        await request('/teachers', {
          method: 'POST',
          body: JSON.stringify({ id, name, groupId, role: row[3] ? String(row[3]).trim() : 'Đoàn viên' }),
        });
      }
      
      Swal.fire('Thành công', 'Đã nhập dữ liệu từ Excel', 'success');
      loadData();
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
        <h2 className="text-lg font-bold text-slate-800 mb-4">Quản lý giáo viên / đoàn viên</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Mã giáo viên (nội bộ)</label>
            <input 
              value={newId} onChange={e => setNewId(e.target.value)}
              className="w-full rounded-xl border-slate-300 shadow-sm p-2.5 bg-white border focus:border-blue-500 focus:ring-blue-500"
              placeholder="Bỏ trống để tự tạo, VD: GV001"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Tên giáo viên</label>
            <input 
              value={newName} onChange={e => setNewName(e.target.value)}
              className="w-full rounded-xl border-slate-300 shadow-sm p-2.5 bg-white border focus:border-blue-500 focus:ring-blue-500"
              placeholder="Nhập họ tên giáo viên"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Tổ công đoàn</label>
            <select 
              value={newGroupId} onChange={e => setNewGroupId(e.target.value)}
              className="w-full rounded-xl border-slate-300 shadow-sm p-2.5 bg-white border focus:border-blue-500 focus:ring-blue-500"
            >
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Chức vụ</label>
            <input 
              value={newRole} onChange={e => setNewRole(e.target.value)}
              className="w-full rounded-xl border-slate-300 shadow-sm p-2.5 bg-white border focus:border-blue-500 focus:ring-blue-500"
              placeholder="VD: Đoàn viên, Tổ trưởng"
            />
          </div>
        </div>
        
        <button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl transition-colors">
          Thêm/Cập nhật giáo viên
        </button>
      </div>

      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-slate-800 m-0">Danh sách giáo viên / đoàn viên</h2>
            {selectedTeacherIds.size > 0 && (
              <button 
                onClick={handleBulkDelete}
                className="bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-xl text-sm font-bold flex items-center gap-1 transition-colors"
              >
                Xóa {selectedTeacherIds.size} mục
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-700 whitespace-nowrap">Lọc tổ:</span>
            <select 
              value={filterGroupId}
              onChange={e => setFilterGroupId(e.target.value)}
              className="rounded-xl border-slate-300 shadow-sm p-2 bg-slate-50 border focus:border-blue-500 focus:ring-blue-500 text-sm font-bold"
            >
              <option value="ALL">Tất cả tổ công đoàn</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
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
                    checked={filteredTeachers.length > 0 && selectedTeacherIds.size === filteredTeachers.length}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Mã GV</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Tên giáo viên</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Tổ công đoàn</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Chức vụ</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filteredTeachers.map((t: any) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm">
                    <input 
                      type="checkbox" 
                      checked={selectedTeacherIds.has(t.id)}
                      onChange={() => toggleSelect(t.id)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-slate-900">{t.id}</td>
                  <td className="px-4 py-3 text-sm text-slate-900 font-semibold">{t.name}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{groups.find(g => g.id === t.groupId)?.name || t.groupId}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{t.role}</td>
                  <td className="px-4 py-3 text-center flex items-center justify-center gap-2">
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
                  </td>
                </tr>
              ))}
              {teachers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">Chưa có giáo viên.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
