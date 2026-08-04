import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import Swal from 'sweetalert2';
import { format } from 'date-fns';

export default function ParticipantsTab() {
  const { request } = useApi();
  const [data, setData] = useState<any>(null);
  
  const [activityId, setActivityId] = useState('');
  const [groupId, setGroupId] = useState('ALL');
  
  const [participants, setParticipants] = useState<any[]>([]);

  useEffect(() => {
    loadDashboard();
  }, []);
  
  useEffect(() => {
    if (activityId) {
      loadParticipants();
    }
  }, [activityId, groupId]);

  const loadDashboard = async () => {
    try {
      const res = await request('/dashboard');
      setData(res);
      if (res.activities?.length > 0 && !activityId) {
        setActivityId(res.activities[0].id);
      }
    } catch (err: any) {
      Swal.fire('Lỗi', err.message, 'error');
    }
  };

  const loadParticipants = async () => {
    try {
      const res = await request(`/attendance/${activityId}?groupId=${groupId}`);
      const present = res.filter((r: any) => r.present);
      setParticipants(present);
    } catch (err: any) {
      Swal.fire('Lỗi', err.message, 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Danh sách giáo viên tham gia theo hoạt động, theo tổ</h2>
        
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
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl mt-6">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Tên giáo viên</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Tổ</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Chức vụ</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Ghi chú</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {participants.map((item) => (
                <tr key={item.memberId} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-bold text-slate-900">{item.name}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{item.groupId}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{item.role}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{item.notes}</td>
                </tr>
              ))}
              {participants.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">Chưa có giáo viên tham gia.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
