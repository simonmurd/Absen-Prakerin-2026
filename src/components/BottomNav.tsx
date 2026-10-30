import React from 'react';
import { 
  CalendarDays, 
  LayoutDashboard, 
  FileSpreadsheet, 
  Users, 
  Lock, 
  ShieldCheck 
} from 'lucide-react';
import { ActiveTab } from './Navbar';
import { UserRole } from '../utils/auth';

interface BottomNavProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  userRole: UserRole;
  onOpenAdminLogin: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  userRole,
  onOpenAdminLogin,
}) => {
  return (
    <nav 
      aria-label="Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 sm:hidden bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-1.5 shadow-lg shadow-slate-900/5"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        
        {/* Tab 1: Calendar / Isi Absen (Primary focus for students) */}
        <button
          type="button"
          onClick={() => onSelectTab('calendar')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
            activeTab === 'calendar'
              ? 'text-blue-600 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <div className={`p-1.5 rounded-xl ${activeTab === 'calendar' ? 'bg-blue-50 text-blue-600' : ''}`}>
            <CalendarDays className="h-5 w-5" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight font-medium">
            {userRole === 'admin' ? 'Absensi' : 'Isi Absen'}
          </span>
        </button>

        {/* Tab 2: Dashboard / Info */}
        <button
          type="button"
          onClick={() => onSelectTab('dashboard')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
            activeTab === 'dashboard'
              ? 'text-blue-600 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <div className={`p-1.5 rounded-xl ${activeTab === 'dashboard' ? 'bg-blue-50 text-blue-600' : ''}`}>
            <LayoutDashboard className="h-5 w-5" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight font-medium">
            {userRole === 'admin' ? 'Dashboard' : 'Info'}
          </span>
        </button>

        {/* Tab 3: Rekapitulasi */}
        <button
          type="button"
          onClick={() => onSelectTab('rekap')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
            activeTab === 'rekap'
              ? 'text-blue-600 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <div className={`p-1.5 rounded-xl ${activeTab === 'rekap' ? 'bg-blue-50 text-blue-600' : ''}`}>
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight font-medium">
            Rekap
          </span>
        </button>

        {/* Tab 4: Siswa (Admin) / Login (Public) */}
        {userRole === 'admin' ? (
          <button
            type="button"
            onClick={() => onSelectTab('students')}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
              activeTab === 'students'
                ? 'text-blue-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className={`p-1.5 rounded-xl ${activeTab === 'students' ? 'bg-blue-50 text-blue-600' : ''}`}>
              <Users className="h-5 w-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight font-medium">
              Siswa
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenAdminLogin}
            className="flex flex-col items-center justify-center py-1 px-3 rounded-xl text-slate-500 hover:text-slate-800 transition-all"
          >
            <div className="p-1.5 rounded-xl">
              <Lock className="h-5 w-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight font-medium">
              Admin
            </span>
          </button>
        )}

      </div>
    </nav>
  );
};
