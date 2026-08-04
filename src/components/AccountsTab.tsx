import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import Swal from 'sweetalert2';
import { Trash2, UserPlus } from 'lucide-react';

export default function AccountsTab() {
  const { request } = useApi();
  const [users, setUsers] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);

  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('TOTRUONG');
  const [newGroupId, setNewGroupId] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usersRes, dashboardRes] = await Promise.all([
        request('/users'),
        request('/dashboard')
      ]);
      setUsers(usersRes || []);
      setGroups(dashboardRes.groups || []);
    } catch (err: any) {
      Swal.fire('Lỗi', err.message, 'error');
    }
  };

  const handleUpdate = async (uid: string, role: string, groupId: string | null, active: boolean) => {
    try {
      await request(`/users/${uid}`, {
        method: 'PUT',
        body: JSON.stringify({ role, groupId, active }),
      });
      Swal.fire({
        title: 'Thành công',
        text: 'Đã cập nhật tài khoản',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
      });
      loadData();
    } catch (err: any) {
      Swal.fire('Lỗi', err.message, 'error');
    }
  };

  const handleDelete = async (uid: string) => {
    const result = await Swal.fire({
      title: 'Xóa tài khoản?',
      text: 'Bạn không thể hoàn tác thao tác này!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Có, xóa!',
      cancelButtonText: 'Hủy'
    });

    if (result.isConfirmed) {
      try {
        await request(`/users/${uid}`, { method: 'DELETE' });
        Swal.fire('Đã xóa', 'Tài khoản đã bị xóa', 'success');
        loadData();
      } catch (err: any) {
        Swal.fire('Lỗi', err.message, 'error');
      }
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newPassword) {
      Swal.fire('Lỗi', 'Vui lòng nhập tên đăng nhập và mật khẩu', 'warning');
      return;
    }
    
    if (newRole === 'TOTRUONG' && !newGroupId) {
      Swal.fire('Lỗi', 'Vui lòng chọn tổ cho Tổ trưởng', 'warning');
      return;
    }

    try {
      setIsAdding(true);
      await request('/users', {
        method: 'POST',
        body: JSON.stringify({
          username: newUsername,
          password: newPassword,
          role: newRole,
          groupId: newRole === 'TOTRUONG' ? newGroupId : null
        })
      });
      
      Swal.fire({
        title: 'Thành công',
        text: 'Đã thêm tài khoản',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
      });
      
      setNewUsername('');
      setNewPassword('');
      setNewRole('TOTRUONG');
      setNewGroupId('');
      loadData();
    } catch (err: any) {
      Swal.fire('Lỗi', err.message, 'error');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Thêm Tài khoản Mới</h2>
        <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div className="col-span-1">
            <label className="block text-sm font-semibold text-slate-700 mb-1">Tên đăng nhập</label>
            <input 
              type="text" 
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="Ví dụ: to1"
              className="w-full rounded-lg border-slate-300 shadow-sm p-2 border focus:border-blue-500 focus:ring-blue-500 text-sm"
              required
            />
          </div>
          <div className="col-span-1">
            <label className="block text-sm font-semibold text-slate-700 mb-1">Mật khẩu</label>
            <input 
              type="text" 
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nhập mật khẩu"
              className="w-full rounded-lg border-slate-300 shadow-sm p-2 border focus:border-blue-500 focus:ring-blue-500 text-sm"
              required
            />
          </div>
          <div className="col-span-1">
            <label className="block text-sm font-semibold text-slate-700 mb-1">Quyền</label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="w-full rounded-lg border-slate-300 shadow-sm p-2 border focus:border-blue-500 focus:ring-blue-500 text-sm"
            >
              <option value="TOTRUONG">TỔ TRƯỞNG</option>
              <option value="ADMIN">ADMIN</option>
              <option value="USER">USER</option>
            </select>
          </div>
          <div className="col-span-1">
            <label className="block text-sm font-semibold text-slate-700 mb-1">Tổ (nếu Tổ trưởng)</label>
            <select
              value={newGroupId}
              onChange={(e) => setNewGroupId(e.target.value)}
              disabled={newRole !== 'TOTRUONG'}
              className="w-full rounded-lg border-slate-300 shadow-sm p-2 border focus:border-blue-500 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-400 text-sm"
            >
              <option value="">- Chọn tổ -</option>
              {groups.map((g: any) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
          <div className="col-span-1">
            <button 
              type="submit"
              disabled={isAdding}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-70 text-sm h-[38px]"
            >
              <UserPlus className="w-4 h-4" /> Thêm
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Danh sách Tài khoản</h2>
        
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Tên đăng nhập</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Phân quyền</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Tổ (nếu là Tổ trưởng)</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {users.map((u: any) => (
                <tr key={u.uid} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm text-slate-900 font-medium">
                    {u.email.replace('@system.local', '')}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <select
                      value={u.role || 'USER'}
                      onChange={(e) => handleUpdate(u.uid, e.target.value, u.groupId, u.active)}
                      className="rounded-lg border-slate-300 text-sm shadow-sm p-1.5 border bg-white focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="USER">USER</option>
                      <option value="TOTRUONG">TỔ TRƯỞNG</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <select
                      value={u.groupId || ''}
                      onChange={(e) => handleUpdate(u.uid, u.role, e.target.value || null, u.active)}
                      disabled={u.role !== 'TOTRUONG'}
                      className="rounded-lg border-slate-300 text-sm shadow-sm p-1.5 border bg-white focus:border-blue-500 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      <option value="">- Chọn tổ -</option>
                      {groups.map((g: any) => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleUpdate(u.uid, u.role, u.groupId, !u.active)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold ${u.active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                    >
                      {u.active ? 'ĐANG MỞ' : 'ĐÃ KHÓA'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleDelete(u.uid)}
                      disabled={u.uid === 'admin-local'}
                      className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 disabled:opacity-50 disabled:hover:bg-transparent"
                      title="Xóa tài khoản"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">Chưa có tài khoản.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
