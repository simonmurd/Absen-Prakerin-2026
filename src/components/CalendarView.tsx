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
import { Student, MonthInfo, AttendanceStatus, AttendanceDatabase, StudentMonthAttendance, GasStudentRekap } from '../types/attendance';
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
  gasData?: GasStudentRekap[] | null;
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
  gasData,
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

  // Lookup real student attendance from Google Sheet
  const studentGasRecord = useMemo(() => {
    if (!currentStudent || !gasData) return null;
    const clean = currentStudent.nama.trim().toLowerCase();
    return gasData.find(g => g.nama.trim().toLowerCase() === clean) || null;
  }, [currentStudent, gasData]);

  // Autofill student's actual presence count from Google Sheet
  const handleFillFromGasRecord = () => {
    if (!studentGasRecord) return;
    const count = studentGasRecord.hadir;
    const next: StudentMonthAttendance = {};
    let filled = 0;
    for (let day = 1; day <= currentMonth.jumlahHari; day++) {
      const isSunday = (currentMonth.hariMulai + day - 1) % 7 === 0;
      if (isSunday) {
        next[day] = 'libur';
      } else if (filled < count) {
        next[day] = 'hadir';
        filled++;
      }
    }
    setLocalAttendance(next);
    showToast(`Diterapkan ${filled} hari Hadir sesuai catatan Google Sheet.`);
  };

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

  // Quick auto-fill weekdays as hadir
  const handleAutoFillWeekdays = () => {
    if (!selectedStudentId) {
      showToast('Pilih nama siswa terlebih dahulu!', 'error');
      return;
    }
    const next: StudentMonthAttendance = {};
    for (let day = 1; day <= currentMonth.jumlahHari; day++) {
      const isSunday = (currentMonth.hariMulai + day - 1) % 7 === 0;
      if (isSunday) {
        next[day] = 'libur';
      } else {
        next[day] = 'hadir';
      }
    }
    setLocalAttendance(next);
    showToast('Seluruh hari kerja (Senin-Sabtu) telah ditandai Hadir.');
  };

  // Quick mark Sundays as holiday
  const handleMarkSundaysHoliday = () => {
    setLocalAttendance(prev => {
      const next = { ...prev };
      for (let day = 1; day <= currentMonth.jumlahHari; day++) {
        const isSunday = (currentMonth.hariMulai + day - 1) % 7 === 0;
        if (isSunday) {
          next[day] = 'libur';
        }
      }
      return next;
    });
    showToast('Hari Minggu berhasil ditandai Libur.');
  };

  // Clear current calendar
  const handleClearCalendar = () => {
    setLocalAttendance({});
    showToast('Kalender berhasil dikosongkan.');
  };

  // Submit attendance to Google Apps Script and local DB
  const handleSubmit = async () => {
    if (!currentStudent) {
      showToast('Pilih nama siswa terlebih dahulu!', 'error');
      return;
    }

    if (Object.keys(localAttendance).length === 0) {
      showToast('Harap pilih minimal 1 tanggal absen!', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Save to local database state
      await onUpdateAttendance(currentStudent.id, currentMonth.key, localAttendance);

      // 2. Prepare payload matching original HTML
      const payload = {
        nama: currentStudent.nama,
        bulan: currentMonth.nama,
        absen: localAttendance,
      };

      // 3. Post to Google Apps Script
      if (scriptPostUrl) {
        await fetch(scriptPostUrl, {
          method: 'POST',
          mode: 'no-cors', // standard Apps Script cross-origin submission
          body: JSON.stringify(payload),
          headers: {
            'Content-Type': 'text/plain;charset=utf-8',
          },
        });
      }

      showToast(`Data presensi ${currentStudent.nama} berhasil dikirim!`);
    } catch (err: any) {
      console.warn('Network issue posting to Apps Script, saved locally:', err);
      showToast('Data tersimpan secara lokal (Periksa koneksi internet)', 'success');
    } finally {
      setIsSubmitting(false);
    }
  };

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

  // Calculate live stats for the current view
  const liveSummary = useMemo(() => {
    return calculateStudentSummary(localAttendance);
  }, [localAttendance]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      
      {/* Toast Notification */}
      <div 
        className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 font-bold text-xs sm:text-sm transition-all duration-300 ${
          toast.show ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10 pointer-events-none'
        } ${
          toast.type === 'error' 
            ? 'bg-rose-600 text-white shadow-rose-600/20' 
            : 'bg-emerald-600 text-white shadow-emerald-600/20'
        }`}
      >
        {toast.type === 'error' ? <ShieldAlert className="h-5 w-5" /> : <CheckCheck className="h-5 w-5" />}
        <span>{toast.message}</span>
      </div>

      {/* Main Container - Minimalist Bright White */}
      <div className="p-5 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-sm relative overflow-hidden">

        {/* Tab Navigasi Bulan */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase font-bold tracking-wider text-slate-500 flex items-center gap-1.5">
              <CalendarIcon className="h-3.5 w-3.5 text-blue-600" /> Pilih Periode Bulan
            </span>
            <div className="flex items-center gap-1">
              <button 
                onClick={handlePrevMonth}
                disabled={currentMonthIndex === 0}
                aria-label="Bulan sebelumnya"
                className="p-1 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent text-slate-500 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button 
                onClick={handleNextMonth}
                disabled={currentMonthIndex === months.length - 1}
                aria-label="Bulan berikutnya"
                className="p-1 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent text-slate-500 cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-1.5 p-1 rounded-2xl bg-slate-100 border border-slate-200">
            {months.map((m) => {
              const isActive = m.key === currentMonth.key;
              return (
                <button
                  key={m.key}
                  onClick={() => onSelectMonthKey(m.key)}
                  className={`py-2 px-1 text-center rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white text-blue-600 shadow-sm border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
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
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight uppercase">
            Absensi {currentMonth.nama} {currentMonth.tahun}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Klik tanggal untuk menandai atau mengubah status kehadiran siswa
          </p>
        </div>

        {/* Student Selection with Class filter */}
        <div className="space-y-2.5 mb-6">
          <div className="flex items-center justify-between">
            <label htmlFor="studentInput" className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-blue-600" />
              Nama Siswa
            </label>
            <div className="flex items-center gap-1 text-xs">
              <span className="text-slate-400 text-[11px]">Filter Rombel:</span>
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="bg-transparent text-blue-600 font-bold focus:outline-none cursor-pointer"
              >
                <option value="all">Semua Kelas</option>
                <option value="XII TJK 1">XII TJK 1</option>
                <option value="XII TJK 2">XII TJK 2</option>
                <option value="XII TJK 3">XII TJK 3</option>
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
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 shadow-sm"
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
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-700">
                <span>Kelas: <strong className="text-slate-900 font-bold">{currentStudent.kelas}</strong></span>
                <span className="text-slate-500 font-medium">{currentStudent.sekolah}</span>
              </div>

              {studentGasRecord ? (
                <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-slate-500 font-medium">Rekap Spreadsheet:</span>
                    <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[11px]">
                      {studentGasRecord.hadir} Hadir
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 font-bold text-[11px]">
                      {studentGasRecord.ijin} Ijin
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[11px]">
                      {studentGasRecord.sakit} Sakit
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-600">
                    Tingkat Kehadiran: <strong className={studentGasRecord.hadir + studentGasRecord.ijin + studentGasRecord.sakit > 0 && (studentGasRecord.hadir / (studentGasRecord.hadir + studentGasRecord.ijin + studentGasRecord.sakit)) < 0.8 ? 'text-rose-600' : 'text-emerald-600'}>
                      {studentGasRecord.hadir + studentGasRecord.ijin + studentGasRecord.sakit > 0 
                        ? `${Math.round((studentGasRecord.hadir / (studentGasRecord.hadir + studentGasRecord.ijin + studentGasRecord.sakit)) * 1000) / 10}%` 
                        : '0%'}
                    </strong>
                  </span>
                </div>
              ) : (
                <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500">
                  Belum ada rekaman kehadiran di Google Spreadsheet (0 hari).
                </div>
              )}
            </div>
          )}
        </div>

        {/* Status Selector Buttons (HADIR, IJIN, SAKIT, LIBUR) */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <button
            type="button"
            onClick={() => setActiveStatus('hadir')}
            className={`py-3 px-2 rounded-xl font-bold text-xs sm:text-sm tracking-wide transition-all border cursor-pointer ${
              activeStatus === 'hadir'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200'
            }`}
          >
            HADIR
          </button>

          <button
            type="button"
            onClick={() => setActiveStatus('ijin')}
            className={`py-3 px-2 rounded-xl font-bold text-xs sm:text-sm tracking-wide transition-all border cursor-pointer ${
              activeStatus === 'ijin'
                ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200'
            }`}
          >
            IJIN
          </button>

          <button
            type="button"
            onClick={() => setActiveStatus('sakit')}
            className={`py-3 px-2 rounded-xl font-bold text-xs sm:text-sm tracking-wide transition-all border cursor-pointer ${
              activeStatus === 'sakit'
                ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/20'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200'
            }`}
          >
            SAKIT
          </button>

          <button
            type="button"
            onClick={() => setActiveStatus('libur')}
            className={`py-3 px-2 rounded-xl font-bold text-xs sm:text-sm tracking-wide transition-all border cursor-pointer ${
              activeStatus === 'libur'
                ? 'bg-violet-600 text-white border-violet-600 shadow-md shadow-violet-600/20'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-violet-50 hover:text-violet-700 hover:border-violet-200'
            }`}
          >
            LIBUR
          </button>
        </div>

        {/* Quick Tools & Helper Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-500 font-semibold flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-blue-600" /> Bantuan:
            </span>
            {studentGasRecord && studentGasRecord.hadir > 0 && (
              <button
                type="button"
                onClick={handleFillFromGasRecord}
                className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold transition-colors cursor-pointer"
                title={`Tandai ${studentGasRecord.hadir} hari Hadir sesuai catatan spreadsheet`}
              >
                Tandai {studentGasRecord.hadir} Hari Hadir (Sheet)
              </button>
            )}
            <button
              type="button"
              onClick={handleMarkSundaysHoliday}
              className="px-2.5 py-1 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 font-bold transition-colors cursor-pointer"
              title="Tandai seluruh hari Minggu Libur"
            >
              Minggu Libur
            </button>
          </div>

          <button
            type="button"
            onClick={handleClearCalendar}
            className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold flex items-center gap-1 transition-colors cursor-pointer"
            title="Kosongkan seluruh tanggal di kalender ini"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Kosongkan Kalender</span>
          </button>
        </div>

        {/* Calendar Grid (7 columns) */}
        <div className="mb-6">
          {/* Day Labels */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
            <div className="text-rose-600">Min</div>
            <div className="text-slate-500">Sen</div>
            <div className="text-slate-500">Sel</div>
            <div className="text-slate-500">Rab</div>
            <div className="text-slate-500">Kam</div>
            <div className="text-slate-500">Jum</div>
            <div className="text-slate-500">Sab</div>
          </div>

          {/* Calendar Day Squares */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {/* Blank offset tiles */}
            {Array.from({ length: currentMonth.hariMulai }).map((_, idx) => (
              <div key={`blank-${idx}`} className="aspect-square opacity-0 pointer-events-none" />
            ))}

            {/* Days 1..jumlahHari */}
            {Array.from({ length: currentMonth.jumlahHari }).map((_, idx) => {
              const day = idx + 1;
              const isSunday = (currentMonth.hariMulai + day - 1) % 7 === 0;
              const status = localAttendance[day];

              // Determine classes for bright minimalist styling
              let statusClasses = 'text-slate-700 hover:bg-slate-100 border-slate-200 bg-slate-50';
              if (status === 'hadir') {
                statusClasses = 'bg-emerald-500 text-white font-extrabold shadow-sm border-emerald-600 scale-[1.02]';
              } else if (status === 'ijin') {
                statusClasses = 'bg-amber-400 text-amber-950 font-extrabold shadow-sm border-amber-500 scale-[1.02]';
              } else if (status === 'sakit') {
                statusClasses = 'bg-rose-500 text-white font-extrabold shadow-sm border-rose-600 scale-[1.02]';
              } else if (status === 'libur') {
                statusClasses = 'bg-violet-500 text-white font-extrabold shadow-sm border-violet-600 scale-[1.02]';
              } else if (isSunday) {
                statusClasses = 'text-rose-600 border-rose-200 bg-rose-50/70 font-bold';
              }

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleDayClick(day)}
                  className={`aspect-square rounded-xl border flex items-center justify-center text-xs sm:text-sm font-semibold transition-all duration-150 select-none cursor-pointer ${statusClasses}`}
                  title={`Tanggal ${day} ${currentMonth.nama} - Status: ${status || (isSunday ? 'Minggu' : 'Kosong')}`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>

        {/* Month Summary Bar */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 mb-6 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
              Hadir: {liveSummary.hadir}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-bold border border-amber-200">
              Ijin: {liveSummary.ijin}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-bold border border-rose-200">
              Sakit: {liveSummary.sakit}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 font-bold border border-violet-200">
              Libur: {liveSummary.libur}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Tingkat Kehadiran:</span>
            <span className={`font-extrabold text-sm ${liveSummary.isWarning ? 'text-rose-600' : 'text-emerald-600'}`}>
              {liveSummary.persentase}%
            </span>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || !selectedStudentId}
          className="w-full py-4 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-sm tracking-wide transition-all shadow-md shadow-blue-500/20 disabled:shadow-none flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Mengirim Data ke Spreadsheet...</span>
            </>
          ) : (
            <>
              <Send className="h-5 w-5" />
              <span>Kirim Data Absensi ke Google Apps Script</span>
            </>
          )}
        </button>

      </div>
    </div>
  );
};
