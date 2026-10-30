import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  Send, 
  CheckCheck, 
  Trash2, 
  Sparkles, 
  User, 
  Loader2, 
  ChevronLeft, 
  ChevronRight,
  ShieldAlert,
  Info
} from 'lucide-react';
import { Student, MonthInfo, AttendanceStatus, AttendanceDatabase, StudentMonthAttendance } from '../types/attendance';
import { calculateStudentSummary } from '../utils/attendance';
import { UserRole } from '../utils/auth';

interface CalendarViewProps {
  students: Student[];
  months: MonthInfo[];
  db: AttendanceDatabase;
  onUpdateAttendance: (studentId: string, monthKey: string, records: StudentMonthAttendance) => Promise<boolean>;
  selectedStudentId?: string;
  selectedMonthKey?: string;
  onSelectStudentId: (id: string) => void;
  onSelectMonthKey: (key: string) => void;
  scriptPostUrl: string;
  userRole?: UserRole;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  students,
  months,
  db,
  onUpdateAttendance,
  selectedStudentId,
  selectedMonthKey = 'Desember',
  onSelectStudentId,
  onSelectMonthKey,
  scriptPostUrl,
  userRole = 'public',
}) => {
  // Current active status tool
  const [activeStatus, setActiveStatus] = useState<AttendanceStatus>('hadir');
  // Local state for the calendar being edited
  const [localAttendance, setLocalAttendance] = useState<StudentMonthAttendance>({});
  // Filter class for student dropdown
  const [filterClass, setFilterClass] = useState<string>('all');
  // Student search input text
  const [studentInputText, setStudentInputText] = useState<string>('');
  // Loading submit state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  // Toast state
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success',
  });

  // Current month object
  const currentMonth = useMemo(() => {
    return months.find(m => m.key === selectedMonthKey) || months[2]; // default Desember
  }, [months, selectedMonthKey]);

  // Current active student
  const currentStudent = useMemo(() => {
    return students.find(s => s.id === selectedStudentId);
  }, [students, selectedStudentId]);

  // Filter students for suggestions
  const suggestedStudents = useMemo(() => {
    return students.filter(s => {
      if (filterClass !== 'all' && s.kelas !== filterClass) return false;
      return true;
    });
  }, [students, filterClass]);

  // Sync local attendance when student or month changes
  useEffect(() => {
    if (selectedStudentId) {
      const key = `${selectedStudentId}_${currentMonth.key}`;
      const existing = db[key] || {};
      setLocalAttendance({ ...existing });
      const found = students.find(s => s.id === selectedStudentId);
      if (found) {
        setStudentInputText(found.nama);
      }
    } else {
      setLocalAttendance({});
    }
  }, [selectedStudentId, currentMonth.key, db, students]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 3200);
  };

  // Day click handler
  const handleDayClick = (dayNumber: number) => {
    if (!selectedStudentId) {
      showToast('Pilih nama siswa terlebih dahulu!', 'error');
      return;
    }

    setLocalAttendance(prev => {
      const next = { ...prev };
      if (next[dayNumber] === activeStatus) {
        delete next[dayNumber];
      } else {
        next[dayNumber] = activeStatus;
      }
      return next;
    });
  };

  // Bulk actions
  const handleAutoFillWeekdays = () => {
    if (!selectedStudentId) {
      showToast('Pilih nama siswa terlebih dahulu!', 'error');
      return;
    }

    setLocalAttendance(prev => {
      const next = { ...prev };
      for (let day = 1; day <= currentMonth.jumlahHari; day++) {
        const dayOfWeek = (currentMonth.hariMulai + day - 1) % 7;
        if (dayOfWeek === 0) {
          next[day] = 'libur'; // Sunday
        } else {
          next[day] = 'hadir'; // Mon-Sat
        }
      }
      return next;
    });
    showToast('Seluruh hari kerja berhasil ditandai Hadir!');
  };

  const handleMarkSundaysHoliday = () => {
    if (!selectedStudentId) {
      showToast('Pilih nama siswa terlebih dahulu!', 'error');
      return;
    }

    setLocalAttendance(prev => {
      const next = { ...prev };
      for (let day = 1; day <= currentMonth.jumlahHari; day++) {
        const dayOfWeek = (currentMonth.hariMulai + day - 1) % 7;
        if (dayOfWeek === 0) {
          next[day] = 'libur';
        }
      }
      return next;
    });
    showToast('Hari Minggu berhasil ditandai Libur!');
  };

  const handleClearCalendar = () => {
    setLocalAttendance({});
    showToast('Catatan absen bulan ini telah dibersihkan.');
  };

  // Submit attendance handler
  const handleSubmitData = async () => {
    if (!currentStudent) {
      showToast('Harap pilih nama siswa terlebih dahulu!', 'error');
      return;
    }

    if (Object.keys(localAttendance).length === 0) {
      showToast('Harap pilih minimal 1 tanggal absen!', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      // Send payload to Google Apps Script
      const payload = {
        nama: currentStudent.nama,
        bulan: currentMonth.nama,
        absen: localAttendance,
      };

      // Call Google Apps Script endpoint in background (or fallback if offline)
      try {
        await fetch(scriptPostUrl, {
          method: 'POST',
          mode: 'no-cors', // standard Apps Script POST mode to bypass CORS
          body: JSON.stringify(payload),
          headers: {
            'Content-Type': 'text/plain;charset=utf-8',
          },
        });
      } catch (err) {
        console.warn('Network call to Google Apps Script skipped or offline:', err);
      }

      // Persist locally in state + localStorage
      await onUpdateAttendance(currentStudent.id, currentMonth.key, localAttendance);

      showToast(`Data presensi ${currentStudent.nama} berhasil dikirim!`, 'success');
    } catch (error) {
      console.error('Error submitting attendance:', error);
      showToast('Terjadi kesalahan saat menyimpan data!', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate live summary for this month
  const liveSummary = useMemo(() => {
    return calculateStudentSummary(localAttendance);
  }, [localAttendance]);

  // Month navigation
  const currentMonthIndex = months.findIndex(m => m.key === currentMonth.key);
  const handlePrevMonth = () => {
    if (currentMonthIndex > 0) {
      onSelectMonthKey(months[currentMonthIndex - 1].key);
    }
  };
  const handleNextMonth = () => {
    if (currentMonthIndex < months.length - 1) {
      onSelectMonthKey(months[currentMonthIndex + 1].key);
    }
  };

  return (
    <div className="relative max-w-2xl mx-auto space-y-6">
      
      {/* Toast Notification (replicates original custom toast with animated bounce) */}
      <div 
        className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ease-out flex items-center gap-2.5 px-5 py-3 rounded-2xl font-bold text-sm shadow-2xl backdrop-blur-xl ${
          toast.show ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-16 opacity-0 scale-90 pointer-events-none'
        } ${
          toast.type === 'error' 
            ? 'bg-pink-950/90 text-[#ff0055] border border-[#ff0055] glow-sakit' 
            : 'bg-emerald-950/90 text-[#00ff9d] border border-[#00ff9d] glow-hadir'
        }`}
      >
        {toast.type === 'error' ? <ShieldAlert className="h-5 w-5" /> : <CheckCheck className="h-5 w-5" />}
        <span>{toast.message}</span>
      </div>

      {/* Main Glass Container (matches original dimensions & aesthetics) */}
      <div className="p-6 sm:p-8 rounded-3xl glass-panel shadow-2xl relative overflow-hidden">
        
        {/* Ambient background glow */}
        <div className="absolute top-0 right-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Tab Navigasi Bulan (1-6 matching original tabs) */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
              <CalendarIcon className="h-3.5 w-3.5 text-blue-400" /> Pilih Periode Bulan
            </span>
            <div className="flex items-center gap-1">
              <button 
                onClick={handlePrevMonth}
                disabled={currentMonthIndex === 0}
                aria-label="Bulan sebelumnya"
                className="p-1 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent text-slate-400"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button 
                onClick={handleNextMonth}
                disabled={currentMonthIndex === months.length - 1}
                aria-label="Bulan berikutnya"
                className="p-1 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent text-slate-400"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-1.5 p-1 rounded-2xl bg-black/40 border border-white/5">
            {months.map((m) => {
              const isActive = m.key === currentMonth.key;
              return (
                <button
                  key={m.key}
                  onClick={() => onSelectMonthKey(m.key)}
                  className={`py-2 px-1 text-center rounded-xl font-bold text-xs sm:text-sm transition-all duration-300 ${
                    isActive
                      ? 'bg-blue-600/30 text-white border border-blue-500/60 shadow-[0_0_12px_rgba(59,130,246,0.4)]'
                      : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <span className="block truncate">{m.nama}</span>
                  <span className="text-[10px] font-normal opacity-60 block">{m.tahun}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Header Title */}
        <div className="text-center mb-6">
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-wider uppercase">
            Absensi {currentMonth.nama} {currentMonth.tahun}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Klik tanggal untuk menandai atau mengubah status kehadiran siswa
          </p>
        </div>

        {/* Student Selection with Class filter */}
        <div className="space-y-2 mb-6">
          <div className="flex items-center justify-between">
            <label htmlFor="studentInput" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-blue-400" />
              Nama Siswa
            </label>
            <div className="flex items-center gap-1 text-xs">
              <span className="text-slate-500 text-[11px]">Filter Rombel:</span>
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="bg-transparent text-blue-400 font-semibold focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-[#0b0f19] text-white">Semua Kelas</option>
                <option value="XII TJK 1" className="bg-[#0b0f19] text-white">XII TJK 1</option>
                <option value="XII TJK 2" className="bg-[#0b0f19] text-white">XII TJK 2</option>
                <option value="XII TJK 3" className="bg-[#0b0f19] text-white">XII TJK 3</option>
              </select>
            </div>
          </div>

          <div className="relative">
            <input
              id="studentInput"
              type="text"
              list="listSiswaDatalist"
              value={studentInputText}
              onChange={(e) => {
                const val = e.target.value;
                setStudentInputText(val);
                const match = students.find(s => s.nama.toLowerCase() === val.toLowerCase());
                if (match) {
                  onSelectStudentId(match.id);
                }
              }}
              placeholder="Ketik atau pilih Nama Siswa..."
              className="w-full px-4 py-3.5 rounded-2xl glass-input text-sm font-medium"
              autoComplete="off"
            />
            <datalist id="listSiswaDatalist">
              {suggestedStudents.map(student => (
                <option key={student.id} value={student.nama}>
                  {student.kelas} - {student.sekolah}
                </option>
              ))}
            </datalist>
          </div>

          {currentStudent && (
            <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/5 text-xs text-slate-400">
              <span>Kelas: <strong className="text-slate-200">{currentStudent.kelas}</strong></span>
              <span>{currentStudent.sekolah}</span>
            </div>
          )}
        </div>

        {/* Status Selector Buttons (replicates original HADIR, IJIN, SAKIT, LIBUR with neon glow) */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          <button
            type="button"
            onClick={() => setActiveStatus('hadir')}
            className={`py-3 px-2 rounded-2xl font-bold text-xs sm:text-sm tracking-wide transition-all ${
              activeStatus === 'hadir'
                ? 'text-[#00ff9d] border border-[#00ff9d] bg-[#00ff9d]/10 shadow-[0_0_15px_rgba(0,255,157,0.35)] scale-[1.02]'
                : 'text-slate-400 bg-white/[0.02] border border-white/10 hover:border-white/20 hover:text-white'
            }`}
          >
            HADIR
          </button>

          <button
            type="button"
            onClick={() => setActiveStatus('ijin')}
            className={`py-3 px-2 rounded-2xl font-bold text-xs sm:text-sm tracking-wide transition-all ${
              activeStatus === 'ijin'
                ? 'text-[#ffcc00] border border-[#ffcc00] bg-[#ffcc00]/10 shadow-[0_0_15px_rgba(255,204,0,0.35)] scale-[1.02]'
                : 'text-slate-400 bg-white/[0.02] border border-white/10 hover:border-white/20 hover:text-white'
            }`}
          >
            IJIN
          </button>

          <button
            type="button"
            onClick={() => setActiveStatus('sakit')}
            className={`py-3 px-2 rounded-2xl font-bold text-xs sm:text-sm tracking-wide transition-all ${
              activeStatus === 'sakit'
                ? 'text-[#ff0055] border border-[#ff0055] bg-[#ff0055]/10 shadow-[0_0_15px_rgba(255,0,85,0.35)] scale-[1.02]'
                : 'text-slate-400 bg-white/[0.02] border border-white/10 hover:border-white/20 hover:text-white'
            }`}
          >
            SAKIT
          </button>

          <button
            type="button"
            onClick={() => setActiveStatus('libur')}
            className={`py-3 px-2 rounded-2xl font-bold text-xs sm:text-sm tracking-wide transition-all ${
              activeStatus === 'libur'
                ? 'text-[#a855f7] border border-[#a855f7] bg-[#a855f7]/10 shadow-[0_0_15px_rgba(168,85,247,0.35)] scale-[1.02]'
                : 'text-slate-400 bg-white/[0.02] border border-white/10 hover:border-white/20 hover:text-white'
            }`}
          >
            LIBUR
          </button>
        </div>

        {/* Productivity Quick Tools (Admin Only) */}
        {userRole === 'admin' && (
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4 p-2.5 rounded-2xl bg-black/30 border border-white/5 text-xs">
            <span className="text-slate-400 font-medium flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-blue-400" /> Aksi Cepat Admin:
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleAutoFillWeekdays}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-[#00ff9d] border border-emerald-500/30 font-semibold transition-colors"
                title="Isi Senin-Sabtu Hadir, Minggu Libur"
              >
                Isi Hari Kerja
              </button>
              <button
                type="button"
                onClick={handleMarkSundaysHoliday}
                className="px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-[#a855f7] border border-purple-500/30 font-semibold transition-colors"
                title="Tandai seluruh hari Minggu Libur"
              >
                Minggu Libur
              </button>
              <button
                type="button"
                onClick={handleClearCalendar}
                className="p-1 rounded-lg hover:bg-pink-500/20 text-slate-400 hover:text-[#ff0055] transition-colors"
                title="Bersihkan Semua"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Calendar Grid (matches 7 columns with Sunday red styling) */}
        <div className="mb-6">
          {/* Day Labels */}
          <div className="grid grid-cols-7 gap-2 mb-2 text-center text-[11px] font-bold uppercase tracking-wider">
            <div className="text-[#ff4d4d]">Min</div>
            <div className="text-slate-400">Sen</div>
            <div className="text-slate-400">Sel</div>
            <div className="text-slate-400">Rab</div>
            <div className="text-slate-400">Kam</div>
            <div className="text-slate-400">Jum</div>
            <div className="text-slate-400">Sab</div>
          </div>

          {/* Calendar Day Squares */}
          <div className="grid grid-cols-7 gap-2">
            {/* Blank offset tiles */}
            {Array.from({ length: currentMonth.hariMulai }).map((_, idx) => (
              <div key={`blank-${idx}`} className="aspect-square opacity-0 pointer-events-none" />
            ))}

            {/* Days 1..jumlahHari */}
            {Array.from({ length: currentMonth.jumlahHari }).map((_, idx) => {
              const day = idx + 1;
              const isSunday = (currentMonth.hariMulai + day - 1) % 7 === 0;
              const status = localAttendance[day];

              // Determine classes for styling & glow
              let statusClasses = 'text-slate-300 hover:bg-white/10 border-white/5 bg-white/[0.02]';
              if (status === 'hadir') {
                statusClasses = 'bg-[#00ff9d] text-black font-extrabold shadow-[0_0_12px_rgba(0,255,157,0.5)] border-transparent scale-[1.03]';
              } else if (status === 'ijin') {
                statusClasses = 'bg-[#ffcc00] text-black font-extrabold shadow-[0_0_12px_rgba(255,204,0,0.5)] border-transparent scale-[1.03]';
              } else if (status === 'sakit') {
                statusClasses = 'bg-[#ff0055] text-white font-extrabold shadow-[0_0_12px_rgba(255,0,85,0.5)] border-transparent scale-[1.03]';
              } else if (status === 'libur') {
                statusClasses = 'bg-[#a855f7] text-white font-extrabold shadow-[0_0_12px_rgba(168,85,247,0.5)] border-transparent scale-[1.03]';
              } else if (isSunday) {
                statusClasses = 'text-[#ff4d4d] border-red-500/20 bg-red-500/[0.04] font-semibold';
              }

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleDayClick(day)}
                  className={`aspect-square rounded-xl border flex items-center justify-center text-xs sm:text-sm transition-all duration-200 select-none cursor-pointer ${statusClasses}`}
                  title={`Tanggal ${day} ${currentMonth.nama} - Status: ${status || (isSunday ? 'Minggu' : 'Kosong')}`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>

        {/* Month Summary Bar */}
        <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 mb-6 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="text-[#00ff9d] font-bold">H: {liveSummary.hadir}</span>
            <span className="text-[#ffcc00] font-bold">I: {liveSummary.ijin}</span>
            <span className="text-[#ff0055] font-bold">S: {liveSummary.sakit}</span>
            <span className="text-[#a855f7] font-bold">L: {liveSummary.libur}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Tingkat Kehadiran:</span>
            <span className={`font-extrabold text-sm ${liveSummary.isWarning ? 'text-[#ff0055]' : 'text-[#00ff9d]'}`}>
              {liveSummary.persentase}%
            </span>
          </div>
        </div>

        {/* Submit Button (replicates gradient button from original code) */}
        <button
          type="button"
          onClick={handleSubmitData}
          disabled={isSubmitting}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-base tracking-wider uppercase transition-all duration-300 shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2.5"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>MENGIRIM DATA...</span>
            </>
          ) : (
            <>
              <Send className="h-5 w-5" />
              <span>KIRIM DATA ABSENSI</span>
            </>
          )}
        </button>

        {/* Sync hint */}
        <p className="text-[11px] text-slate-500 text-center mt-3 flex items-center justify-center gap-1">
          <Info className="h-3 w-3" /> Data otomatis tersinkronisasi ke Google Apps Script & penyimpanan lokal
        </p>

      </div>

    </div>
  );
};
