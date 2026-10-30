import React, { useEffect, useState } from 'react';
import { 
  LayoutDashboard, 
  CalendarDays, 
  FileSpreadsheet, 
  Users, 
  Settings, 
  GraduationCap, 
  Clock,
  ShieldCheck,
  Lock,
  LogOut,
  User,
  RefreshCw
} from 'lucide-react';
import { UserRole } from '../utils/auth';

export type ActiveTab = 'dashboard' | 'calendar' | 'rekap' | 'students';

interface NavbarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenSettings: () => void;
  userRole: UserRole;
  onOpenAdminLogin: () => void;
  onLogoutAdmin: () => void;
  isOnlineGas?: boolean;
  activeStudentName?: string;
  onSwitchStudent?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  onOpenSettings,
  userRole,
  onOpenAdminLogin,
  onLogoutAdmin,
  isOnlineGas = true,
  activeStudentName,
  onSwitchStudent,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/95 border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 sm:h-20 gap-3">
          
          {/* Logo & School identity */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight">
                  AbsenSi <span className="text-blue-600">Pro</span>
                </h1>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                  SMKN 1
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium hidden sm:block">
                SMK Negeri 1 Singkawang • XII TJK
              </p>
            </div>
          </div>

          {/* Navigation Tabs (Tablet & Desktop only; Mobile uses BottomNav) */}
          <nav className="hidden sm:flex items-center gap-1 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200" aria-label="Main Navigation">
            <button
              onClick={() => onSelectTab('calendar')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'calendar'
                  ? 'bg-white text-blue-600 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <CalendarDays className="h-4 w-4 text-blue-600" />
              <span>{userRole === 'admin' ? 'Input Absensi' : 'Isi Absen'}</span>
            </button>

            <button
              onClick={() => onSelectTab('dashboard')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-white text-blue-600 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden md:inline">{userRole === 'admin' ? 'Dashboard' : 'Informasi'}</span>
            </button>

            <button
              onClick={() => onSelectTab('rekap')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'rekap'
                  ? 'bg-white text-blue-600 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>{userRole === 'admin' ? 'Rekapitulasi' : 'Cek Rekap'}</span>
            </button>

            {/* Admin-only Tab: Data Siswa */}
            {userRole === 'admin' && (
              <button
                onClick={() => onSelectTab('students')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  activeTab === 'students'
                    ? 'bg-white text-blue-600 shadow-sm border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <Users className="h-4 w-4" />
                <span className="hidden md:inline">Data Siswa</span>
              </button>
            )}
          </nav>

          {/* Right utilities & Student / Role info */}
          <div className="flex items-center gap-2">
            
            {/* Active Student Pill with Ganti Siswa button */}
            {activeStudentName && userRole === 'public' && onSwitchStudent && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-700">
                <User className="h-3.5 w-3.5 text-blue-600" />
                <span className="font-bold max-w-[120px] sm:max-w-[160px] truncate" title={activeStudentName}>
                  {activeStudentName}
                </span>
                <button
                  type="button"
                  onClick={onSwitchStudent}
                  className="ml-1 text-[11px] text-blue-600 hover:text-blue-800 font-semibold underline cursor-pointer"
                  title="Ganti Siswa"
                >
                  Ganti
                </button>
              </div>
            )}

            {/* Clock */}
            <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-xs text-slate-600 font-mono">
              <Clock className="h-3.5 w-3.5 text-slate-500" />
              <span>{timeStr || '00:00:00'}</span>
            </div>

            {/* Role indicator & Login/Logout Action */}
            {userRole === 'public' ? (
              <button
                type="button"
                onClick={onOpenAdminLogin}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold transition-all cursor-pointer"
                title="Masuk dengan PIN Guru / Wali Kelas"
              >
                <Lock className="h-3.5 w-3.5 text-slate-500" />
                <span className="hidden sm:inline">Menu Admin</span>
                <span className="sm:hidden">Admin</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-700">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Admin Guru</span>
                </span>

                <button
                  onClick={onOpenSettings}
                  aria-label="Pengaturan Sistem"
                  title="Pengaturan Webhook & Database"
                  className="p-2 rounded-xl text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
                >
                  <Settings className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={onLogoutAdmin}
                  aria-label="Keluar dari Mode Admin"
                  title="Kembali ke Mode Siswa"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">Keluar</span>
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
