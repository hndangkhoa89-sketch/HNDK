import { useState, useEffect, useRef } from 'react';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../contexts/AuthContext';
import { CheckSquare, Square, AlertCircle, Loader2 } from 'lucide-react';
import Swal from 'sweetalert2';

export default function AttendanceTab() {
  const { dbUser } = useAuth();
  const { request } = useApi();
  const [data, setData] = useState<any>(null);
  const [activityId, setActivityId] = useState('');
  const [groupId, setGroupId] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [attendanceList, setAttendanceList] = useState<any[]>([]);
  
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);
  
  useEffect(() => {
    if (activityId) {
      loadAttendance();
    }
  }, [activityId, groupId]);

  const loadDashboard = async () => {
    try {
      const res = await request('/dashboard');
      setData(res);
      if (res.activities?.length > 0 && !activityId) {
        setActivityId(res.activities[0].id);
      }
      setLoading(false);
    } catch (err: any) {
      Swal.fire('Error', err.message, 'error');
    }
  };
  
  const loadAttendance = async () => {
    try {
      setLoading(true);
      const res = await request(`/attendance/${activityId}?groupId=${groupId}`);
      setAttendanceList(res);
      setLoading(false);
    } catch (err: any) {
      Swal.fire('Error', err.message, 'error');
      setLoading(false);
    }
  };
  
  const handleCheck = (index: number, val: boolean) => {
    const list = [...attendanceList];
    list[index].present = val;
    setAttendanceList(list);
    scheduleSave(list);
  };
  
  const handleNote = (index: number, val: string) => {
    const list = [...attendanceList];
    list[index].notes = val;
    setAttendanceList(list);
    scheduleSave(list);
  };
  

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
        const allRes = await request(`/attendance/${activityId}?groupId=ALL`);
        const list = allRes.map((item: any) => ({ ...item, present: true }));
        
        await request(`/attendance/${activityId}`, {
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

  const scheduleSave = (list: any[]) => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      save(list);
    }, 800);
  };
  
  const save = async (listToSave?: any[]) => {
    try {
      setSaving(true);
      const toSave = listToSave || attendanceList;
      await request(`/attendance/${activityId}`, {
        method: 'POST',
        body: JSON.stringify({ rows: toSave }),
      });
      setSaving(false);
    } catch (err: any) {
      Swal.fire('Lỗi', err.message, 'error');
      setSaving(false);
    }
  };

  if (loading && !data) return <div className="p-8 text-center"><Loader2 className="animate-spin h-6 w-6 mx-auto text-blue-500" /></div>;

  const currentActivity = data?.activities?.find((a: any) => a.id === activityId);
  const isApproved = currentActivity?.status === 'APPROVED';
  const isAdmin = dbUser?.role === 'ADMIN';
  const canFilterGroup = isAdmin || !dbUser?.groupId;
  const readOnly = isApproved && !isAdmin;

  const total = attendanceList.length;
  const present = attendanceList.filter(a => a.present).length;
  const percent = total > 0 ? (present / total) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Điểm danh giáo viên</h2>
        
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="flex-1">
            <label className="block text-sm font-bold text-slate-700 mb-1">Chọn hoạt động</label>
            <select 
              value={activityId} 
              onChange={e => setActivityId(e.target.value)}
              className="w-full rounded-xl border-slate-300 shadow-sm p-2.5 bg-slate-50 border focus:border-blue-500 focus:ring-blue-500"
            >
              {data?.activities?.map((a: any) => (
                <option key={a.id} value={a.id}>{a.id} - {a.name}</option>
              ))}
            </select>
          </div>
          
          {canFilterGroup && (
            <div className="flex-1">
              <label className="block text-sm font-bold text-slate-700 mb-1">Chọn tổ công đoàn</label>
              <select 
                value={groupId} 
                onChange={e => setGroupId(e.target.value)}
                className="w-full rounded-xl border-slate-300 shadow-sm p-2.5 bg-slate-50 border focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="ALL">Tất cả tổ công đoàn</option>
                {data?.groups?.map((g: any) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          )}
          
          <div className="flex items-end">
            <button onClick={loadAttendance} className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-4 py-2.5 rounded-xl font-semibold border border-indigo-100 transition-colors">
              Tải lại
            </button>
          </div>
        </div>

        {currentActivity && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4 mb-4">
            <div className="font-bold text-slate-800">
              HOẠT ĐỘNG: {currentActivity.id} - {currentActivity.name}
            </div>
            <div className="text-sm font-semibold text-slate-600 mt-1">
              Tổng: {total} | Tham gia: {present} | Tỷ lệ: {percent.toFixed(2)}%
            </div>
          </div>
        )}

        {isApproved && (
          <div className="bg-red-50 text-red-700 p-3 rounded-xl mb-4 font-semibold text-sm flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            {isAdmin 
              ? 'Hoạt động đã duyệt. Admin vẫn có thể điều chỉnh nếu cần.'
              : 'Hoạt động này đã được duyệt. Bạn không thể sửa điểm danh.'}
          </div>
        )}
        {!isApproved && (
          <div className="bg-blue-50 text-blue-700 p-3 rounded-xl mb-4 font-semibold text-sm flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            Hệ thống sẽ tự động lưu sau khi bạn thay đổi.
          </div>
        )}

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

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Tên giáo viên</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Tổ</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Chức vụ</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Tham gia</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Ghi chú</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {attendanceList.map((item, idx) => (
                <tr key={item.memberId} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-bold text-slate-900">{item.name}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{item.groupId}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{item.role}</td>
                  <td className="px-4 py-3 text-center">
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                      checked={item.present}
                      disabled={readOnly}
                      onChange={e => handleCheck(idx, e.target.checked)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input 
                      type="text"
                      className="w-full text-sm rounded-lg border-slate-300 focus:ring-blue-500 focus:border-blue-500 p-1.5 border disabled:bg-slate-50 disabled:text-slate-500"
                      placeholder="Ghi chú..."
                      value={item.notes}
                      disabled={readOnly}
                      onChange={e => handleNote(idx, e.target.value)}
                    />
                  </td>
                </tr>
              ))}
              {attendanceList.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500 font-medium">Không có giáo viên trong phạm vi xem.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
              </div>
    </div>
  );
}
