import React, { useEffect, useState } from 'react';
import { 
  LayoutDashboard, 
  CalendarDays, 
  FileSpreadsheet, 
  Users, 
  Settings, 
  GraduationCap, 
  CloudCheck, 
  Clock,
  ShieldCheck,
  Lock,
  LogOut,
  UserCheck
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
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  onOpenSettings,
  userRole,
  onOpenAdminLogin,
  onLogoutAdmin,
  isOnlineGas = true,
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
    <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-[#0b0f19]/85 border-b border-white/10 shadow-lg shadow-black/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-4">
          
          {/* Logo & School identity */}
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-400 p-0.5 shadow-lg shadow-blue-500/20">
              <div className="h-full w-full bg-[#0b0f19] rounded-[10px] flex items-center justify-center">
                <GraduationCap className="h-6 w-6 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg sm:text-xl text-white tracking-wide flex items-center gap-1.5">
                  AbsenSi <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-blue-400 font-extrabold">Pro</span>
                </h1>
                <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  v2.5
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium hidden sm:block">
                SMK Negeri 1 Singkawang • Teknik Jaringan Komputer
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 sm:gap-1.5 bg-white/[0.03] p-1.5 rounded-2xl border border-white/10" aria-label="Main Navigation">
            <button
              onClick={() => onSelectTab('dashboard')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 ${
                activeTab === 'dashboard'
                  ? 'bg-blue-600/20 text-white border border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.35)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.06] border border-transparent'
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden md:inline">{userRole === 'admin' ? 'Dashboard' : 'Informasi'}</span>
            </button>

            <button
              onClick={() => onSelectTab('calendar')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 ${
                activeTab === 'calendar'
                  ? 'bg-blue-600/20 text-white border border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.35)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.06] border border-transparent'
              }`}
            >
              <CalendarDays className="h-4 w-4" />
              <span>{userRole === 'admin' ? 'Input Absensi' : 'Isi Absen'}</span>
            </button>

            <button
              onClick={() => onSelectTab('rekap')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 ${
                activeTab === 'rekap'
                  ? 'bg-blue-600/20 text-white border border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.35)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.06] border border-transparent'
              }`}
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>{userRole === 'admin' ? 'Rekapitulasi' : 'Cek Rekap'}</span>
            </button>

            {/* Admin-only Tab: Data Siswa */}
            {userRole === 'admin' && (
              <button
                onClick={() => onSelectTab('students')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 ${
                  activeTab === 'students'
                    ? 'bg-blue-600/20 text-white border border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.35)]'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.06] border border-transparent'
                }`}
              >
                <Users className="h-4 w-4" />
                <span className="hidden md:inline">Data Siswa</span>
              </button>
            )}
          </nav>

          {/* Right utilities & Role Management */}
          <div className="flex items-center gap-2">
            {/* Clock */}
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/5 text-xs text-slate-300 font-mono">
              <Clock className="h-3.5 w-3.5 text-blue-400" />
              <span>{timeStr || '00:00:00'}</span>
            </div>

            {/* Role indicator & Login/Logout Action */}
            {userRole === 'public' ? (
              <button
                type="button"
                onClick={onOpenAdminLogin}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 text-xs font-bold transition-all shadow-sm hover:shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                title="Masuk dengan PIN Guru / Wali Kelas"
              >
                <Lock className="h-3.5 w-3.5 text-blue-400" />
                <span className="hidden sm:inline">Menu Admin</span>
                <span className="sm:hidden">Admin</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                {/* Admin active badge */}
                <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-[11px] font-bold text-[#00ff9d] glow-hadir">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Admin</span>
                </span>

                {/* Settings Button */}
                <button
                  onClick={onOpenSettings}
                  aria-label="Pengaturan Sistem"
                  title="Pengaturan Webhook & Database"
                  className="p-2 rounded-xl text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-colors"
                >
                  <Settings className="h-4 w-4" />
                </button>

                {/* Logout Button */}
                <button
                  type="button"
                  onClick={onLogoutAdmin}
                  aria-label="Keluar dari Mode Admin"
                  title="Kembali ke Mode Publik / Siswa"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-pink-500/10 hover:bg-pink-500/20 text-[#ff0055] border border-pink-500/30 text-xs font-bold transition-all"
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
