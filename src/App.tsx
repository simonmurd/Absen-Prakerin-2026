/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  MASTER_STUDENTS, 
  MONTHS_DATA, 
  DEFAULT_SCRIPT_POST_URL, 
  DEFAULT_SCRIPT_GET_REKAP_URL, 
  generateSeedAttendance 
} from './data/students';
import { Student, AttendanceDatabase, StudentMonthAttendance, GasStudentRekap } from './types/attendance';
import { Navbar, ActiveTab } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { CalendarView } from './components/CalendarView';
import { RekapView } from './components/RekapView';
import { StudentsView } from './components/StudentsView';
import { StudentDetailModal } from './components/StudentDetailModal';
import { SettingsModal } from './components/SettingsModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { UserRole, DEFAULT_ADMIN_PIN } from './utils/auth';

const STORAGE_KEY_DB = 'absensi_pro_db_v2';
const STORAGE_KEY_POST_URL = 'absensi_pro_post_url';
const STORAGE_KEY_GET_URL = 'absensi_pro_get_url';
const STORAGE_KEY_ROLE = 'absensi_pro_role';
const STORAGE_KEY_PIN = 'absensi_pro_admin_pin';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [students] = useState<Student[]>(MASTER_STUDENTS);
  const [months] = useState(MONTHS_DATA);
  const [gasRekapData, setGasRekapData] = useState<GasStudentRekap[] | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Role: 'public' (orang awam/siswa) or 'admin' (guru/wali kelas)
  const [userRole, setUserRole] = useState<UserRole>(() => {
    return (localStorage.getItem(STORAGE_KEY_ROLE) as UserRole) || 'public';
  });

  const [adminPin, setAdminPin] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_PIN) || DEFAULT_ADMIN_PIN;
  });

  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState<boolean>(false);
  
  // Database of attendance records
  const [db, setDb] = useState<AttendanceDatabase>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DB);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load attendance DB from storage:', e);
    }
    // Default seed attendance so dashboard and rekap are richly populated
    return generateSeedAttendance(MASTER_STUDENTS);
  });

  // Google Apps Script URLs
  const [scriptPostUrl, setScriptPostUrl] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_POST_URL) || DEFAULT_SCRIPT_POST_URL;
  });
  const [scriptGetRekapUrl, setScriptGetRekapUrl] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_GET_URL) || DEFAULT_SCRIPT_GET_REKAP_URL;
  });

  // Selections
  const [selectedStudentId, setSelectedStudentId] = useState<string>(MASTER_STUDENTS[0]?.id || '');
  const [calendarMonthKey, setCalendarMonthKey] = useState<string>('Desember');
  const [dashboardMonthKey, setDashboardMonthKey] = useState<string>('all');
  const [dashboardClass, setDashboardClass] = useState<string>('all');

  // Modals
  const [detailStudent, setDetailStudent] = useState<Student | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isRefreshingGas, setIsRefreshingGas] = useState<boolean>(false);

  // Save to localStorage whenever db changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_DB, JSON.stringify(db));
    } catch (e) {
      console.warn('Failed to save DB to localStorage:', e);
    }
  }, [db]);

  const handleSavePostUrl = (url: string) => {
    setScriptPostUrl(url);
    localStorage.setItem(STORAGE_KEY_POST_URL, url);
  };

  const handleSaveGetUrl = (url: string) => {
    setScriptGetRekapUrl(url);
    localStorage.setItem(STORAGE_KEY_GET_URL, url);
  };

  // Update attendance handler
  const handleUpdateAttendance = async (
    studentId: string, 
    monthKey: string, 
    records: StudentMonthAttendance
  ): Promise<boolean> => {
    setDb(prev => {
      const next = { ...prev };
      const key = `${studentId}_${monthKey}`;
      next[key] = { ...records };
      return next;
    });
    return true;
  };

  // Reset to initial seed
  const handleResetToDefault = () => {
    const freshSeed = generateSeedAttendance(MASTER_STUDENTS);
    setDb(freshSeed);
    try {
      localStorage.removeItem(STORAGE_KEY_DB);
    } catch (e) {}
  };

  // Export JSON backup
  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `AbsenSi_Pro_Database_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import JSON backup
  const handleImportJson = (jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString);
      if (typeof parsed === 'object' && parsed !== null) {
        setDb(parsed);
        return true;
      }
    } catch (e) {
      console.error('Invalid JSON import:', e);
    }
    return false;
  };

  // Navigate to Calendar from another view
  const handleNavigateToCalendar = (studentId?: string, monthKey?: string) => {
    if (studentId) setSelectedStudentId(studentId);
    if (monthKey) setCalendarMonthKey(monthKey);
    setActiveTab('calendar');
  };

  // Refresh from Google Sheet
  const handleRefreshFromGas = async () => {
    setIsRefreshingGas(true);
    try {
      const response = await fetch(scriptGetRekapUrl);
      const data = await response.json();
      if (Array.isArray(data)) {
        setGasRekapData(data);
        const time = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLastSyncTime(time);
        console.log(`Berhasil mengambil ${data.length} data rekap dari Google Apps Script.`);
      }
    } catch (e) {
      console.warn('Could not connect to live GAS script, using local DB:', e);
    } finally {
      setIsRefreshingGas(false);
    }
  };

  // Automatically fetch from Google Apps Script on mount
  useEffect(() => {
    handleRefreshFromGas();
  }, [scriptGetRekapUrl]);

  // Role management handlers
  const handleLoginAdminSuccess = () => {
    setUserRole('admin');
    localStorage.setItem(STORAGE_KEY_ROLE, 'admin');
    setIsAdminLoginOpen(false);
  };

  const handleLogoutAdmin = () => {
    setUserRole('public');
    localStorage.setItem(STORAGE_KEY_ROLE, 'public');
    if (activeTab === 'students') {
      setActiveTab('dashboard');
    }
  };

  const handleSaveAdminPin = (newPin: string) => {
    setAdminPin(newPin);
    localStorage.setItem(STORAGE_KEY_PIN, newPin);
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-[#f8fafc] flex flex-col selection:bg-blue-600/30 selection:text-white">
      
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenSettings={() => setIsSettingsOpen(true)}
        userRole={userRole}
        onOpenAdminLogin={() => setIsAdminLoginOpen(true)}
        onLogoutAdmin={handleLogoutAdmin}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'dashboard' && (
          <DashboardView
            students={students}
            months={months}
            db={db}
            selectedMonthKey={dashboardMonthKey}
            onChangeMonth={setDashboardMonthKey}
            selectedClass={dashboardClass}
            onChangeClass={setDashboardClass}
            onNavigateToCalendar={handleNavigateToCalendar}
            onNavigateToRekap={() => setActiveTab('rekap')}
            onOpenStudentDetail={setDetailStudent}
            userRole={userRole}
          />
        )}

        {activeTab === 'calendar' && (
          <CalendarView
            students={students}
            months={months}
            db={db}
            onUpdateAttendance={handleUpdateAttendance}
            selectedStudentId={selectedStudentId}
            selectedMonthKey={calendarMonthKey}
            onSelectStudentId={setSelectedStudentId}
            onSelectMonthKey={setCalendarMonthKey}
            scriptPostUrl={scriptPostUrl}
            userRole={userRole}
          />
        )}

        {activeTab === 'rekap' && (
          <RekapView
            students={students}
            months={months}
            db={db}
            onOpenStudentDetail={setDetailStudent}
            onEditInCalendar={handleNavigateToCalendar}
            onRefreshData={handleRefreshFromGas}
            isRefreshing={isRefreshingGas}
            gasData={gasRekapData}
            lastSyncTime={lastSyncTime}
            userRole={userRole}
          />
        )}

        {activeTab === 'students' && (
          <StudentsView
            students={students}
            months={months}
            db={db}
            onOpenStudentDetail={setDetailStudent}
            onNavigateToCalendar={handleNavigateToCalendar}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-6 bg-black/40 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} AbsenSi Pro • SMK Negeri 1 Singkawang</p>
          <p className="text-[11px] text-slate-400">
            {userRole === 'admin' ? 'Mode Administrator Aktif (Guru / Wali Kelas)' : 'Portal Presensi Siswa & Orang Tua'}
          </p>
        </div>
      </footer>

      {/* Student Detail Modal */}
      <StudentDetailModal
        student={detailStudent}
        months={months}
        db={db}
        onClose={() => setDetailStudent(null)}
        onNavigateToCalendar={handleNavigateToCalendar}
      />

      {/* Admin Login PIN Modal */}
      <AdminLoginModal
        isOpen={isAdminLoginOpen}
        onClose={() => setIsAdminLoginOpen(false)}
        onLoginSuccess={handleLoginAdminSuccess}
        storedPin={adminPin}
      />

      {/* Settings Modal (Admin only) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        scriptPostUrl={scriptPostUrl}
        onSaveScriptPostUrl={handleSavePostUrl}
        scriptGetRekapUrl={scriptGetRekapUrl}
        onSaveScriptGetRekapUrl={handleSaveGetUrl}
        onResetToDefault={handleResetToDefault}
        onExportJson={handleExportJson}
        onImportJson={handleImportJson}
        adminPin={adminPin}
        onSaveAdminPin={handleSaveAdminPin}
      />

    </div>
  );
}
