import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import Swal from 'sweetalert2';
import { exportToExcel } from '../lib/excel';
import { Download } from 'lucide-react';

export default function MemberStatsTab() {
  const { request } = useApi();
  const [data, setData] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [filterGroupId, setFilterGroupId] = useState<string>('ALL');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [dashboardRes, statsRes] = await Promise.all([
        request('/dashboard'),
        request('/stats')
      ]);
      setData(dashboardRes);
      setStats(statsRes);
    } catch (err: any) {
      Swal.fire('Lỗi', err.message, 'error');
    }
  };

  const memberStats = stats?.members?.map((m: any) => {
    const group = data?.groups?.find((g: any) => g.id === m.groupId);
    
    // Count how many activities this member attended
    const presentCount = stats.attendance.filter((a: any) => 
      a.memberId === m.id && a.present
    ).length;

    const totalActivities = data?.activities?.length || 0;
    const percentage = totalActivities > 0 ? Math.round((presentCount / totalActivities) * 100) : 0;

    return {
      ...m,
      groupName: group ? group.name : m.groupId,
      presentCount,
      totalActivities,
      percentage
    };
  }) || [];

  // Filter by group
  const filteredMembers = memberStats.filter((m: any) => filterGroupId === 'ALL' || m.groupId === filterGroupId);

  // Sort by percentage descending, then by name
  const sortedMembers = [...filteredMembers].sort((a, b) => {
    if (b.percentage !== a.percentage) {
      return b.percentage - a.percentage;
    }
    return a.name.localeCompare(b.name);
  });

  const handleExport = () => {
    if (!data || !stats) return;
    
    const columns = [
      { header: 'STT', key: 'stt', width: 10 },
      { header: 'Tên giáo viên', key: 'name', width: 30 },
      { header: 'Tổ công đoàn', key: 'groupName', width: 25 },
      { header: 'Số hoạt động tham gia', key: 'presentCount', width: 25 },
      { header: 'Tổng số hoạt động', key: 'totalActivities', width: 25 },
      { header: 'Tỷ lệ', key: 'percentage', width: 15 },
    ];
    
    const exportData = sortedMembers.map((m: any, index: number) => ({
      stt: index + 1,
      name: m.name,
      groupName: m.groupName,
      presentCount: m.presentCount,
      totalActivities: m.totalActivities,
      percentage: m.percentage + '%'
    }));
    
    exportToExcel('Thong_ke_ca_nhan', columns, exportData);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800 mb-2">Thống kê số lượng hoạt động theo cá nhân</h2>
            <p className="text-sm text-slate-500">Hiển thị số hoạt động từng giáo viên đã tham gia.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
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
          </div>
        </div>
        
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-4 py-3 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">STT</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Tên giáo viên</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Tổ công đoàn</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">Số lần tham gia</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">Tổng số HĐ</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">Tỷ lệ</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {sortedMembers.map((m: any, index: number) => (
                <tr key={m.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-4 py-3 text-center text-sm font-medium text-slate-500">
                    {index + 1}
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-slate-800">{m.name}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{m.groupName}</td>
                  <td className="px-4 py-3 text-center text-sm font-bold text-emerald-600">{m.presentCount}</td>
                  <td className="px-4 py-3 text-center text-sm text-slate-500">{m.totalActivities}</td>
                  <td className="px-4 py-3 text-center text-sm font-bold text-blue-600">
                    {m.percentage}%
                  </td>
                </tr>
              ))}
              {sortedMembers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">Chưa có dữ liệu</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
