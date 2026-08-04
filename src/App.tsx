import React, { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import { Loader2, LogOut, CheckCircle, XCircle } from 'lucide-react';
import AttendanceTab from './components/AttendanceTab';
import AdminTab from './components/AdminTab';
import TeachersTab from './components/TeachersTab';
import ParticipantsTab from './components/ParticipantsTab';
import StatsTab from './components/StatsTab';
import MemberStatsTab from './components/MemberStatsTab';
import GroupsTab from './components/GroupsTab';
import AccountsTab from './components/AccountsTab';
import Swal from 'sweetalert2';

export default function App() {
  const { user, dbUser, isGuest, setGuest, login, register, resetPassword, logout, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('attendance');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsLoggingIn(true);
    try {
      if (false) {
        if (register) {
          await register(`${username}@system.local`, password + "_system");
        } else {
          setAuthError('Đăng ký không được hỗ trợ.');
        }
      } else {
        await login(`${username}@system.local`, password + "_system");
      }
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setAuthError('Email này đã được sử dụng.');
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setAuthError('Sai tài khoản hoặc mật khẩu.');
      } else if (err.code === 'auth/user-not-found') {
        setAuthError('Tài khoản không tồn tại.');
      } else {
        setAuthError(err.message || 'Lỗi đăng nhập/đăng ký');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleResetPassword = async () => {
    if (!username) {
      setAuthError('Vui lòng nhập tên đăng nhập để khôi phục mật khẩu.');
      return;
    }
    try {
      await resetPassword(`${username}@system.local`);
      Swal.fire('Thành công', 'Đã gửi email khôi phục mật khẩu, vui lòng kiểm tra hộp thư của bạn.', 'success');
    } catch (err: any) {
      setAuthError(err.message || 'Lỗi gửi email khôi phục.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
      </div>
    );
  }

  if (!user || !dbUser) {
    if (!isGuest) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 via-indigo-50 to-white flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-blue-100 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 via-purple-600 to-amber-500" />
            <h1 className="text-2xl font-bold text-center text-slate-900 mb-2">Đăng nhập Quản trị</h1>
            <p className="text-slate-500 text-center mb-8">Hệ thống điểm danh hoạt động công đoàn</p>
            
            <form onSubmit={handleAuth} className="space-y-4 mb-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Tên đăng nhập</label>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-xl border-slate-300 shadow-sm p-3 bg-white border focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Nhập tên đăng nhập"
                  required
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-bold text-slate-700">Mật khẩu</label>
                </div>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border-slate-300 shadow-sm p-3 bg-white border focus:border-blue-500 focus:ring-blue-500"
                  placeholder="••••••••"
                  required
                />
              </div>
              {authError && (
                <div className="text-red-500 text-sm bg-red-50 p-2 rounded-lg border border-red-100">
                  {authError}
                </div>
              )}
              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
              >
                {isLoggingIn && <Loader2 className="animate-spin h-4 w-4" />}
                Đăng nhập
              </button>
            </form>
            
            
            <div className="relative flex items-center py-4">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink-0 mx-4 text-slate-400 text-sm">Hoặc</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>
            
            <button
              onClick={() => { setGuest(true); setActiveTab('participants'); }}
              className="w-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold py-3 px-4 rounded-xl transition-colors"
            >
              Xem với tư cách Khách (Tổ trưởng)
            </button>
          </div>
        </div>
      );
    }
  }

  const isAdmin = !isGuest && dbUser?.role === 'ADMIN';
  const displayUser = isGuest ? { name: 'Tổ trưởng công đoàn', email: 'Khách', groupId: 'N/A' } : (dbUser || user);

  return (
    <div className="min-h-screen bg-slate-50 p-2 sm:p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        <header className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-4 sm:p-6 text-white shadow-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold m-0">ĐIỂM DANH HOẠT ĐỘNG CÔNG ĐOÀN</h1>
            <p className="text-white/80 text-sm sm:text-base mt-1">Quản lý số lượng đoàn viên tham gia, tỷ lệ tham gia theo tổ và theo hoạt động</p>
          </div>
          <div className="text-left sm:text-right">
            <div className="font-bold">{displayUser?.name || (user && user.displayName)}</div>
            <div className="text-xs text-white/80">{displayUser?.email}</div>
            <div className="inline-block mt-2 px-3 py-1 rounded-full bg-white/20 border border-white/30 text-xs font-bold shadow-sm">
              {isAdmin ? 'ADMIN' : (isGuest ? 'KHÁCH' : `TỔ TRƯỞNG - ${displayUser?.groupId || 'Chưa gán tổ'}`)}
            </div>
            <button
              onClick={logout}
              className="mt-3 sm:mt-2 sm:ml-4 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1 inline-flex"
            >
              <LogOut className="h-4 w-4" /> Đăng xuất
            </button>
          </div>
        </header>

        <nav className="flex flex-wrap gap-2">
          {!isGuest && <TabButton active={activeTab === 'attendance'} onClick={() => setActiveTab('attendance')}>Điểm danh</TabButton>}
          {isAdmin && (
            <>
              <TabButton active={activeTab === 'accounts'} onClick={() => setActiveTab('accounts')}>Quản lý tài khoản</TabButton>
              <TabButton active={activeTab === 'admin'} onClick={() => setActiveTab('admin')}>Quản trị hoạt động</TabButton>
              <TabButton active={activeTab === 'groups'} onClick={() => setActiveTab('groups')}>Quản lý tổ</TabButton>
              <TabButton active={activeTab === 'teachers'} onClick={() => setActiveTab('teachers')}>Quản lý giáo viên</TabButton>
            </>
          )}
          {(!isGuest || isGuest) && <TabButton active={activeTab === 'participants'} onClick={() => setActiveTab('participants')}>Danh sách tham gia</TabButton>}
          {(!isGuest || isGuest) && <TabButton active={activeTab === 'stats'} onClick={() => setActiveTab('stats')}>Thống kê Tổ</TabButton>}
          {(!isGuest || isGuest) && <TabButton active={activeTab === 'member_stats'} onClick={() => setActiveTab('member_stats')}>Thống kê Cá nhân</TabButton>}
        </nav>

        <main className="space-y-4">
          {activeTab === 'attendance' && !isGuest && <AttendanceTab />}
          {activeTab === 'accounts' && isAdmin && <AccountsTab />}
          {activeTab === 'admin' && isAdmin && <AdminTab />}
          {activeTab === 'groups' && isAdmin && <GroupsTab />}
          {activeTab === 'teachers' && isAdmin && <TeachersTab />}
          {activeTab === 'participants' && <ParticipantsTab />}
          {activeTab === 'stats' && <StatsTab />}
          {activeTab === 'member_stats' && <MemberStatsTab />}
        </main>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 border ${
        active
          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-transparent shadow-md shadow-indigo-500/20'
          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  );
}
