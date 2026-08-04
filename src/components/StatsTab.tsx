import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import Swal from 'sweetalert2';
import { exportToExcel } from '../lib/excel';
import { Download } from 'lucide-react';

const COLORS = [
  { header: 'bg-blue-50 text-blue-700', cell: 'text-blue-700 bg-blue-50/30' },
  { header: 'bg-emerald-50 text-emerald-700', cell: 'text-emerald-700 bg-emerald-50/30' },
  { header: 'bg-purple-50 text-purple-700', cell: 'text-purple-700 bg-purple-50/30' },
  { header: 'bg-amber-50 text-amber-700', cell: 'text-amber-700 bg-amber-50/30' },
  { header: 'bg-rose-50 text-rose-700', cell: 'text-rose-700 bg-rose-50/30' },
  { header: 'bg-cyan-50 text-cyan-700', cell: 'text-cyan-700 bg-cyan-50/30' },
  { header: 'bg-indigo-50 text-indigo-700', cell: 'text-indigo-700 bg-indigo-50/30' },
];

export default function StatsTab() {
  const { request } = useApi();
  const [data, setData] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  
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

  const getAttendanceStats = (groupId: string, activityId: string) => {
    if (!stats) return { text: '-', count: 0, percentage: 0 };
    
    // Find all members in this group
    const groupMembers = stats.members.filter((m: any) => m.groupId === groupId);
    const totalCount = groupMembers.length;
    const memberIds = new Set(groupMembers.map((m: any) => m.id));
    
    // Find attendance records for this activity and members in this group
    const presentCount = stats.attendance.filter((a: any) => 
      a.activityId === activityId && 
      memberIds.has(a.memberId) && 
      a.present
    ).length;
    
    if (totalCount === 0) return { text: '-', count: 0, percentage: 0 };

    const percentage = Math.round((presentCount / totalCount) * 100);
    const text = `${presentCount}/${totalCount} (${percentage}%)`;
    
    return { text, count: presentCount, percentage };
  };


  // Pre-calculate stats for ranking
  const groupStats = data?.groups?.map((g: any) => {
    let totalPercentage = 0;
    const activityStats: any = {};
    
    data?.activities?.forEach((a: any) => {
      const stats = getAttendanceStats(g.id, a.id);
      activityStats[a.id] = stats;
      totalPercentage += stats.percentage;
    });
    
    return {
      ...g,
      totalPercentage,
      activityStats
    };
  }) || [];

  // Calculate ranks
  const sortedGroups = [...groupStats].sort((a, b) => b.totalPercentage - a.totalPercentage);
  const rankedGroups = groupStats.map((g: any) => {
    // Find rank (1-indexed), handling ties
    const rank = sortedGroups.findIndex((sg) => sg.totalPercentage === g.totalPercentage) + 1;
    return { ...g, rank };
  }).sort((a, b) => a.rank - b.rank);

  const handleExport = () => {
    if (!data || !stats) return;
    
    const columns = [
      { header: 'Hạng', key: 'rank', width: 10 },
      { header: 'Tổ công đoàn', key: 'groupName', width: 25 },
      { header: 'Tổng %', key: 'totalPercentage', width: 15 },
      ...data.activities.map((a: any) => ({
        header: a.name,
        key: a.id,
        width: 20
      }))
    ];
    
    const exportData = rankedGroups.map((g: any) => {
      const row: any = { 
        rank: g.rank,
        groupName: g.name,
        totalPercentage: g.totalPercentage + '%'
      };
      data.activities.forEach((a: any) => {
        row[a.id] = g.activityStats[a.id].text;
      });
      return row;
    });
    
    exportToExcel('Thong_ke_diem_danh', columns, exportData);
  };


  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800 mb-2">Bảng thống kê theo tổ cho từng hoạt động</h2>
            <p className="text-sm text-slate-500">Mỗi tổ hiển thị số lượng và tỷ lệ tham gia.</p>
          </div>
          <button 
            onClick={handleExport}
            className="bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-3 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors"
          >
            <Download className="h-4 w-4" /> Xuất Excel
          </button>
        </div>
        
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="min-w-full divide-y divide-slate-200">
            
            <thead className="bg-slate-100">
              <tr>
                <th className="px-4 py-3 text-center text-xs font-bold text-slate-600 uppercase tracking-wider sticky left-0 bg-slate-100 z-20 border-r border-slate-200">Hạng</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider sticky left-[60px] bg-slate-100 z-20 border-r border-slate-200">Tổ công đoàn</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-slate-600 uppercase tracking-wider sticky left-[180px] sm:left-[240px] bg-slate-100 z-20 border-r border-slate-200 shadow-[1px_0_0_0_rgba(226,232,240,1)]">Tổng %</th>
                {data?.activities?.map((a: any, index: number) => {
                  const colorIndex = index % COLORS.length;
                  return (
                    <th key={a.id} className={`px-4 py-3 text-center text-xs font-bold uppercase tracking-wider ${COLORS[colorIndex].header}`}>
                      {a.name}
                    </th>
                  );
                })}
              </tr>
            </thead>

            
            <tbody className="bg-white divide-y divide-slate-200">
              {rankedGroups.map((g: any) => (
                <tr key={g.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-4 py-3 text-center text-sm font-bold text-slate-600 sticky left-0 bg-white group-hover:bg-slate-50 border-r border-slate-100 z-10">
                    <span className={`inline-flex items-center justify-center rounded-full ${
                      g.rank === 1 
                        ? 'w-8 h-8 bg-gradient-to-br from-yellow-300 to-amber-500 text-amber-950 font-black shadow-md border border-yellow-400 text-base' 
                        : g.rank === 2 
                        ? 'w-7 h-7 bg-gradient-to-br from-slate-200 to-slate-400 text-slate-900 font-bold shadow border border-slate-300 text-sm' 
                        : g.rank === 3 
                        ? 'w-7 h-7 bg-gradient-to-br from-orange-300 to-red-400 text-red-950 font-bold shadow border border-orange-400 text-sm' 
                        : g.rank <= 6
                        ? 'w-6 h-6 bg-blue-100 text-blue-700 font-bold border border-blue-200 text-xs shadow-sm'
                        : 'w-6 h-6 bg-slate-100 text-slate-600 font-semibold border border-slate-200 text-xs'
                    }`}>
                      {g.rank}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-slate-800 sticky left-[60px] bg-white group-hover:bg-slate-50 border-r border-slate-100 z-10 whitespace-nowrap">{g.name}</td>
                  <td className="px-4 py-3 text-center text-sm font-bold text-blue-600 sticky left-[180px] sm:left-[240px] bg-white group-hover:bg-slate-50 shadow-[1px_0_0_0_rgba(226,232,240,1)] z-10">
                    {g.totalPercentage}%
                  </td>
                  {data?.activities?.map((a: any, index: number) => {
                    const colorIndex = index % COLORS.length;
                    const stats = g.activityStats[a.id];
                    return (
                      <td key={a.id} className={`px-4 py-3 text-center text-sm font-semibold ${COLORS[colorIndex].cell}`}>
                        <div className="flex flex-col items-center justify-center">
                          {stats.text !== '-' ? (
                            <>
                              <span className="text-base">{stats.count}</span>
                              <span className="text-xs opacity-75 mt-0.5">({stats.percentage}%)</span>
                            </>
                          ) : (
                            <span className="text-slate-400 font-normal">-</span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
              {rankedGroups.length === 0 && (
                <tr>
                  <td colSpan={(data?.activities?.length || 0) + 3} className="px-4 py-8 text-center text-slate-500">Chưa có dữ liệu</td>
                </tr>
              )}
            </tbody>

          </table>
        </div>
      </div>
    </div>
  );
}
