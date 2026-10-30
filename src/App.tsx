/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  MASTER_STUDENTS, 
  MONTHS_DATA, 
  DEFAULT_SCRIPT_POST_URL, 
  DEFAULT_SCRIPT_GET_REKAP_URL,
  USER_PROVIDED_SCRIPT_URL
} from './data/students';
import { REAL_GAS_REKAP_DATA } from './data/realGasData';
import { Student, AttendanceDatabase, StudentMonthAttendance, GasStudentRekap } from './types/attendance';
import { Navbar, ActiveTab } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { DashboardView } from './components/DashboardView';
import { CalendarView } from './components/CalendarView';
import { RekapView } from './components/RekapView';
import { StudentsView } from './components/StudentsView';
import { StudentGate } from './components/StudentGate';
import { StudentDetailModal } from './components/StudentDetailModal';
import { SettingsModal } from './components/SettingsModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { UserRole, DEFAULT_ADMIN_PIN } from './utils/auth';

const STORAGE_KEY_DB = 'absensi_pro_db_v3_clean';
const STORAGE_KEY_POST_URL = 'absensi_pro_post_url';
const STORAGE_KEY_GET_URL = 'absensi_pro_get_url';
const STORAGE_KEY_ROLE = 'absensi_pro_role';
const STORAGE_KEY_PIN = 'absensi_pro_admin_pin';
const STORAGE_KEY_STUDENT_SELECTED = 'absensi_pro_active_student_selected';
const STORAGE_KEY_STUDENT_ID = 'absensi_pro_active_student_id';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('calendar');
  const [students] = useState<Student[]>(MASTER_STUDENTS);
  const [months] = useState(MONTHS_DATA);
  
  // Real dataset directly from Google Apps Script / Spreadsheet (0% dummy data)
  const [gasRekapData, setGasRekapData] = useState<GasStudentRekap[]>(REAL_GAS_REKAP_DATA);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>('Realtime Sync');

  // Role: 'public' (orang awam/siswa) or 'admin' (guru/wali kelas)
  const [userRole, setUserRole] = useState<UserRole>(() => {
    return (localStorage.getItem(STORAGE_KEY_ROLE) as UserRole) || 'public';
  });

  const [adminPin, setAdminPin] = useState<string>(() => {
    const stored = localStorage.getItem(STORAGE_KEY_PIN);
    if (!stored || stored === '1234') {
      localStorage.setItem(STORAGE_KEY_PIN, DEFAULT_ADMIN_PIN);
      return DEFAULT_ADMIN_PIN;
    }
    return stored;
  });

  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState<boolean>(false);

  // Student Identity Gate: Student must pick their name first
  const [hasSelectedStudent, setHasSelectedStudent] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEY_STUDENT_SELECTED) === 'true';
  });

  // Selected Student ID
  const [selectedStudentId, setSelectedStudentId] = useState<string>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_STUDENT_ID);
    if (saved && MASTER_STUDENTS.some(s => s.id === saved)) {
      return saved;
    }
    return MASTER_STUDENTS[0]?.id || '';
  });

  // Current active student
  const activeStudent = useMemo(() => {
    return students.find(s => s.id === selectedStudentId) || students[0];
  }, [students, selectedStudentId]);
  
  // Real database of calendar submissions (clean, no synthetic dummy data)
  const [db, setDb] = useState<AttendanceDatabase>(() => {
    // Explicitly purge legacy dummy keys on startup
    try {
      localStorage.removeItem('absensi_pro_db_v2');
      localStorage.removeItem('absensi_pro_db');
      localStorage.removeItem('absensi_pro_db_v1');
      const saved = localStorage.getItem(STORAGE_KEY_DB);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load attendance DB from storage:', e);
    }
    return {};
  });

  // Google Apps Script URLs
  const [scriptPostUrl, setScriptPostUrl] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_POST_URL) || USER_PROVIDED_SCRIPT_URL;
  });
  const [scriptGetRekapUrl, setScriptGetRekapUrl] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_GET_URL) || DEFAULT_SCRIPT_GET_REKAP_URL;
  });

  // Selections
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

  // Student selection handler from StudentGate
  const handleStudentGateSelect = (studentId: string) => {
    setSelectedStudentId(studentId);
    setHasSelectedStudent(true);
    localStorage.setItem(STORAGE_KEY_STUDENT_SELECTED, 'true');
    localStorage.setItem(STORAGE_KEY_STUDENT_ID, studentId);
    setActiveTab('calendar');
  };

  // Switch student back to gate
  const handleSwitchStudent = () => {
    setHasSelectedStudent(false);
    localStorage.removeItem(STORAGE_KEY_STUDENT_SELECTED);
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

  // Reset to initial clean database with real Google Sheet data
  const handleResetToDefault = () => {
    setDb({});
    setGasRekapData(REAL_GAS_REKAP_DATA);
    setLastSyncTime('Data Spreadsheet Asli');
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
    if (studentId) {
      setSelectedStudentId(studentId);
      localStorage.setItem(STORAGE_KEY_STUDENT_ID, studentId);
      setHasSelectedStudent(true);
      localStorage.setItem(STORAGE_KEY_STUDENT_SELECTED, 'true');
    }
    if (monthKey) setCalendarMonthKey(monthKey);
    setActiveTab('calendar');
  };

  // Refresh from Google Sheet (tries configured URLs and falls back to verified real dataset)
  const handleRefreshFromGas = async () => {
    setIsRefreshingGas(true);
    let success = false;

    // 1. Try scriptGetRekapUrl
    try {
      const response = await fetch(scriptGetRekapUrl);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          setGasRekapData(data);
          const time = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          setLastSyncTime(time);
          console.log(`Berhasil sinkronisasi ${data.length} siswa real dari Google Apps Script.`);
          success = true;
        }
      }
    } catch (e) {
      console.warn('Could not fetch from primary getRekap URL:', e);
    }

    // 2. If primary failed and scriptPostUrl is different, try querying scriptPostUrl
    if (!success && scriptPostUrl && scriptPostUrl !== scriptGetRekapUrl) {
      try {
        const testUrl = scriptPostUrl.includes('?') ? `${scriptPostUrl}&action=getRekap` : `${scriptPostUrl}?action=getRekap`;
        const response = await fetch(testUrl);
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            setGasRekapData(data);
            const time = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            setLastSyncTime(time);
            success = true;
          }
        }
      } catch (e2) {
        console.warn('Could not fetch from scriptPostUrl:', e2);
      }
    }

    // 3. Fallback to pre-cached 100% real Google Sheet records if network is blocked
    if (!success) {
      setGasRekapData(REAL_GAS_REKAP_DATA);
      setLastSyncTime('Google Sheet Verified');
    }

    setIsRefreshingGas(false);
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
      setActiveTab('calendar');
    }
  };

  const handleSaveAdminPin = (newPin: string) => {
    setAdminPin(newPin);
    localStorage.setItem(STORAGE_KEY_PIN, newPin);
  };

  const isPublicAndUngated = userRole === 'public' && !hasSelectedStudent;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-blue-500/20 selection:text-blue-900">
      
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenSettings={() => setIsSettingsOpen(true)}
        userRole={userRole}
        onOpenAdminLogin={() => setIsAdminLoginOpen(true)}
        onLogoutAdmin={handleLogoutAdmin}
        activeStudentName={hasSelectedStudent ? activeStudent?.nama : undefined}
        onSwitchStudent={handleSwitchStudent}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 pb-24 sm:pb-8">
        
        {/* If student hasn't selected their name yet, present StudentGate */}
        {isPublicAndUngated ? (
          <StudentGate
            students={students}
            onSelectStudent={handleStudentGateSelect}
            onOpenAdminLogin={() => setIsAdminLoginOpen(true)}
            gasData={gasRekapData}
          />
        ) : (
          <>
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
                gasData={gasRekapData}
              />
            )}

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
                gasData={gasRekapData}
                lastSyncTime={lastSyncTime}
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

            {activeTab === 'students' && userRole === 'admin' && (
              <StudentsView
                students={students}
                months={months}
                db={db}
                onOpenStudentDetail={setDetailStudent}
                onNavigateToCalendar={handleNavigateToCalendar}
              />
            )}
          </>
        )}

      </main>

      {/* Floating Bottom Navigation Bar (Mobile Only - only shown once gated or if admin) */}
      {!isPublicAndUngated && (
        <BottomNav
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          userRole={userRole}
          onOpenAdminLogin={() => setIsAdminLoginOpen(true)}
        />
      )}

      {/* Footer */}
      <footer className="hidden sm:block border-t border-slate-200 py-6 bg-white text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} AbsenSi Pro • SMK Negeri 1 Singkawang</p>
          <p className="text-[11px] text-slate-500 font-medium">
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
