import React, { useMemo } from 'react';
import { 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Award, 
  MessageCircle, 
  ChevronRight, 
  Calendar, 
  Filter, 
  BarChart3,
  Percent
} from 'lucide-react';
import { Student, MonthInfo, AttendanceDatabase, StudentSummary, GasStudentRekap } from '../types/attendance';
import { calculateStudentSummary, aggregateStudentSummaries, generateWhatsAppMessage } from '../utils/attendance';
import { UserRole } from '../utils/auth';

interface DashboardViewProps {
  students: Student[];
  months: MonthInfo[];
  db: AttendanceDatabase;
  selectedMonthKey: string; // 'all' or month key like 'Desember'
  onChangeMonth: (monthKey: string) => void;
  selectedClass: string; // 'all' or 'XII TJK 1'
  onChangeClass: (cls: string) => void;
  onNavigateToCalendar: (studentId?: string, monthKey?: string) => void;
  onNavigateToRekap: () => void;
  onOpenStudentDetail: (student: Student) => void;
  userRole?: UserRole;
  gasData?: GasStudentRekap[] | null;
  lastSyncTime?: string | null;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  students,
  months,
  db,
  selectedMonthKey,
  onChangeMonth,
  selectedClass,
  onChangeClass,
  onNavigateToCalendar,
  onNavigateToRekap,
  onOpenStudentDetail,
  userRole = 'public',
  gasData,
  lastSyncTime,
}) => {
  // Filter students based on selected class
  const filteredStudents = useMemo(() => {
    if (selectedClass === 'all') return students;
    return students.filter(s => s.kelas === selectedClass);
  }, [students, selectedClass]);

  // Compute summaries for filtered students (prioritizing live Google Apps Script data)
  const studentSummaries = useMemo(() => {
    const map: Record<string, StudentSummary> = {};

    if (gasData && gasData.length > 0) {
      const gasMap = new Map<string, GasStudentRekap>();
      gasData.forEach(item => {
        gasMap.set(item.nama.trim().toLowerCase(), item);
      });

      filteredStudents.forEach(student => {
        const gasItem = gasMap.get(student.nama.trim().toLowerCase());
        if (gasItem) {
          const totalAktif = gasItem.hadir + gasItem.ijin + gasItem.sakit;
          const persentase = totalAktif > 0 ? Math.round((gasItem.hadir / totalAktif) * 1000) / 10 : 0;
          map[student.id] = {
            hadir: gasItem.hadir,
            ijin: gasItem.ijin,
            sakit: gasItem.sakit,
            libur: 0,
            totalAktif,
            persentase,
            isWarning: totalAktif > 0 && persentase < 80,
          };
        } else {
          map[student.id] = aggregateStudentSummaries(student.id, db, months);
        }
      });
      return map;
    }

    filteredStudents.forEach(student => {
      if (selectedMonthKey === 'all') {
        map[student.id] = aggregateStudentSummaries(student.id, db, months);
      } else {
        const key = `${student.id}_${selectedMonthKey}`;
        map[student.id] = calculateStudentSummary(db[key]);
      }
    });

    return map;
  }, [filteredStudents, selectedMonthKey, db, months, gasData]);

  // Aggregate overall metrics
  const overallMetrics = useMemo(() => {
    let totalHadir = 0;
    let totalIjin = 0;
    let totalSakit = 0;
    let totalLibur = 0;
    let warningCount = 0;
    let activeStudentsCount = 0;

    filteredStudents.forEach(student => {
      const summary = studentSummaries[student.id];
      if (summary) {
        totalHadir += summary.hadir;
        totalIjin += summary.ijin;
        totalSakit += summary.sakit;
        totalLibur += summary.libur;
        if (summary.isWarning) warningCount++;
        if (summary.totalAktif > 0) {
          activeStudentsCount++;
        }
      }
    });

    const totalLogs = totalHadir + totalIjin + totalSakit;
    // Mathematically exact: (Total Hadir / Total Catatan Presensi Aktif) * 100
    const averageRate = totalLogs > 0 
      ? Math.round((totalHadir / totalLogs) * 1000) / 10 
      : 0;

    return {
      totalHadir,
      totalIjin,
      totalSakit,
      totalLibur,
      totalLogs,
      warningCount,
      averageRate,
      activeStudentsCount,
    };
  }, [filteredStudents, studentSummaries]);

  // Comparison metrics per class (computed directly from processed real data)
  const classComparison = useMemo(() => {
    const classes = ['XII TJK 1', 'XII TJK 2', 'XII TJK 3'];
    return classes.map(cls => {
      const classStudents = students.filter(s => s.kelas === cls);
      let classHadir = 0;
      let classIjin = 0;
      let classSakit = 0;
      let classWarning = 0;
      let activeCount = 0;

      classStudents.forEach(s => {
        const sum = studentSummaries[s.id] || { hadir: 0, ijin: 0, sakit: 0, libur: 0, totalAktif: 0, persentase: 0, isWarning: false };
        classHadir += sum.hadir;
        classIjin += sum.ijin;
        classSakit += sum.sakit;
        if (sum.isWarning) classWarning++;
        if (sum.totalAktif > 0) {
          activeCount++;
        }
      });

      const classTotalLogs = classHadir + classIjin + classSakit;
      const avg = classTotalLogs > 0 
        ? Math.round((classHadir / classTotalLogs) * 1000) / 10 
        : 0;

      return {
        className: cls,
        count: classStudents.length,
        activeCount,
        hadir: classHadir,
        ijin: classIjin,
        sakit: classSakit,
        warningCount: classWarning,
        averageRate: avg,
      };
    });
  }, [students, studentSummaries]);

  // Students needing attention (< 80%) with active records
  const warningStudents = useMemo(() => {
    return filteredStudents
      .filter(s => {
        const sum = studentSummaries[s.id];
        return sum && sum.totalAktif > 0 && sum.persentase < 80;
      })
      .sort((a, b) => (studentSummaries[a.id]?.persentase || 0) - (studentSummaries[b.id]?.persentase || 0));
  }, [filteredStudents, studentSummaries]);

  // Top attendance students (ranked by highest real Hadir days and %)
  const topStudents = useMemo(() => {
    return filteredStudents
      .filter(s => {
        const sum = studentSummaries[s.id];
        return sum && sum.totalAktif > 0 && sum.persentase >= 80;
      })
      .sort((a, b) => {
        const sumA = studentSummaries[a.id] || { hadir: 0, persentase: 0 };
        const sumB = studentSummaries[b.id] || { hadir: 0, persentase: 0 };
        if (sumB.hadir !== sumA.hadir) return sumB.hadir - sumA.hadir;
        return sumB.persentase - sumA.persentase;
      })
      .slice(0, 6);
  }, [filteredStudents, studentSummaries]);

  const activePeriodLabel = 'Rekapitulasi Real-Time Google Spreadsheet (SMK Negeri 1 Singkawang)';

  return (
    <div className="space-y-6">
      
      {/* Top Header & Filter Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-white border border-slate-200 shadow-sm">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Dashboard Analitik Presensi
            </h2>
            <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold">
              Real-Time
            </span>
            {gasData && gasData.length > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Google Sheet Terhubung ({gasData.length} Siswa)
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            Monitoring kehadiran siswa real-time dan evaluasi presensi sekolah. {lastSyncTime ? `• Sinkron: ${lastSyncTime}` : ''}
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Class selector */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs">
            <Filter className="h-3.5 w-3.5 text-slate-500" />
            <select
              value={selectedClass}
              onChange={(e) => onChangeClass(e.target.value)}
              className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer"
            >
              <option value="all">Semua Kelas ({students.length})</option>
              <option value="XII TJK 1">XII TJK 1</option>
              <option value="XII TJK 2">XII TJK 2</option>
              <option value="XII TJK 3">XII TJK 3</option>
            </select>
          </div>
        </div>
      </div>

      {/* Hero KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Students */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold tracking-wider text-slate-500">Total Siswa</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight">{filteredStudents.length}</div>
            <p className="text-xs text-slate-500 mt-1">
              <span>{selectedClass === 'all' ? '3 Rombel Kelas XII TJK' : selectedClass}</span>
            </p>
          </div>
        </div>

        {/* Average Attendance Rate */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold tracking-wider text-slate-500">Rata-rata Kehadiran</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <Percent className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-emerald-600 tracking-tight">
              {overallMetrics.averageRate}%
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 mt-2.5 overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-700" 
                style={{ width: `${Math.min(overallMetrics.averageRate, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Total Hadir Logs */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold tracking-wider text-slate-500">Total Hadir</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {overallMetrics.totalHadir}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Dari {overallMetrics.totalLogs} catatan presensi aktif
            </p>
          </div>
        </div>

        {/* Warning Indicator (<80%) */}
        <div className={`p-5 rounded-2xl border shadow-sm transition-all ${
          overallMetrics.warningCount > 0 
            ? 'bg-rose-50/50 border-rose-200' 
            : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold tracking-wider text-slate-500">Peringatan (&lt;80%)</span>
            <div className={`p-2 rounded-xl border ${
              overallMetrics.warningCount > 0 
                ? 'bg-rose-100 text-rose-600 border-rose-200' 
                : 'bg-slate-100 text-slate-400 border-slate-200'
            }`}>
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-3xl font-extrabold tracking-tight ${overallMetrics.warningCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
              {overallMetrics.warningCount}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {overallMetrics.warningCount > 0 ? 'Siswa memerlukan perhatian' : 'Semua siswa di atas 80%'}
            </p>
          </div>
        </div>

      </div>

      {/* Class Comparison & Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Class Comparison Cards (2 cols) */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                Komparasi Kehadiran Antar Kelas
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {activePeriodLabel}
              </p>
            </div>
            <button
              onClick={onNavigateToRekap}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors cursor-pointer"
            >
              Lihat Detail Rekap <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-3.5">
            {classComparison.map((item) => (
              <div 
                key={item.className}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-bold text-sm text-slate-900">{item.className}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 font-medium">
                      {item.activeCount} / {item.count} siswa tercatat
                    </span>
                    {item.warningCount > 0 && (
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-bold border border-rose-200">
                        {item.warningCount} peringatan (&lt;80%)
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className={`text-base font-extrabold ${item.averageRate < 80 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {item.averageRate}%
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden flex">
                  <div 
                    className="bg-emerald-500 h-full transition-all duration-700" 
                    style={{ width: `${item.averageRate}%` }}
                    title={`Kehadiran: ${item.averageRate}%`}
                  ></div>
                </div>

                {/* Stats badge breakdown */}
                <div className="flex items-center gap-4 mt-2.5 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                    <span>Hadir: <strong className="text-slate-900">{item.hadir}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                    <span>Ijin: <strong className="text-slate-900">{item.ijin}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                    <span>Sakit: <strong className="text-slate-900">{item.sakit}</strong></span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Status Distribution Summary (1 col) */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-1">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              Komposisi Status Presensi
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Distribusi seluruh status kehadiran di spreadsheet
            </p>

            <div className="space-y-4">
              {/* Hadir */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-emerald-700 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500"></span> HADIR
                  </span>
                  <span className="text-slate-900 font-bold">
                    {overallMetrics.totalHadir} ({overallMetrics.totalLogs > 0 ? Math.round((overallMetrics.totalHadir / overallMetrics.totalLogs) * 100) : 0}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full" 
                    style={{ width: `${overallMetrics.totalLogs > 0 ? (overallMetrics.totalHadir / overallMetrics.totalLogs) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>

              {/* Ijin */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-amber-700 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-amber-500"></span> IJIN
                  </span>
                  <span className="text-slate-900 font-bold">
                    {overallMetrics.totalIjin} ({overallMetrics.totalLogs > 0 ? Math.round((overallMetrics.totalIjin / overallMetrics.totalLogs) * 100) : 0}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-amber-500 h-full" 
                    style={{ width: `${overallMetrics.totalLogs > 0 ? (overallMetrics.totalIjin / overallMetrics.totalLogs) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>

              {/* Sakit */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-rose-700 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-rose-500"></span> SAKIT
                  </span>
                  <span className="text-slate-900 font-bold">
                    {overallMetrics.totalSakit} ({overallMetrics.totalLogs > 0 ? Math.round((overallMetrics.totalSakit / overallMetrics.totalLogs) * 100) : 0}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-rose-500 h-full" 
                    style={{ width: `${overallMetrics.totalLogs > 0 ? (overallMetrics.totalSakit / overallMetrics.totalLogs) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>

              {/* Libur */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-violet-700 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-violet-500"></span> LIBUR MINGGU
                  </span>
                  <span className="text-slate-900 font-bold">{overallMetrics.totalLibur} hari</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-violet-400 h-full" style={{ width: '100%' }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <button
              onClick={() => onNavigateToCalendar()}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs tracking-wider uppercase transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Calendar className="h-4 w-4" />
              Buka Form Isi Absen
            </button>
          </div>
        </div>

      </div>

      {/* Warning List (<80%) and High Performers split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Panel: Warning Attention List (Admin) OR Panduan Siswa (Public) */}
        {userRole === 'admin' ? (
          <div className="p-6 rounded-3xl bg-white border border-rose-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Siswa Perlu Perhatian Khusus
                  </h3>
                  <p className="text-xs text-slate-500">
                    Tingkat kehadiran di bawah 80% (Perlu pendampingan)
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 font-extrabold text-xs border border-rose-200">
                {warningStudents.length} Siswa
              </span>
            </div>

            {warningStudents.length === 0 ? (
              <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-2xl border border-slate-200">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">Tidak ada siswa dengan kehadiran di bawah 80%.</p>
                <p className="text-xs mt-1">Semua siswa dalam status aman.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {warningStudents.map(student => {
                  const sum = studentSummaries[student.id];
                  const waUrl = `https://wa.me/?text=${generateWhatsAppMessage(student, sum, activePeriodLabel)}`;

                  return (
                    <div 
                      key={student.id}
                      className="p-3.5 rounded-2xl bg-slate-50 border border-rose-100 hover:border-rose-300 transition-all flex items-center justify-between gap-3"
                    >
                      <div 
                        onClick={() => onOpenStudentDetail(student)}
                        className="cursor-pointer flex-1 min-w-0"
                      >
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate hover:text-blue-600 transition-colors">
                          {student.nama}
                        </h4>
                        <p className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span className="text-slate-700 font-semibold">{student.kelas}</span>
                          <span>•</span>
                          <span>Sakit: <strong className="text-rose-600">{sum.sakit}</strong></span>
                          <span>•</span>
                          <span>Ijin: <strong className="text-amber-600">{sum.ijin}</strong></span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <div className="text-right">
                          <span className="text-sm font-extrabold text-rose-600">
                            {sum.persentase}%
                          </span>
                          <div className="text-[10px] text-slate-400">kehadiran</div>
                        </div>

                        {/* WhatsApp Trigger */}
                        <a 
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Kirim pesan peringatan via WhatsApp"
                          className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-all cursor-pointer"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Public Guide Card */
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Panduan &amp; Standar Presensi Siswa
                  </h3>
                  <p className="text-xs text-slate-500">
                    SMK Negeri 1 Singkawang • Tata Tertib Kehadiran
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-xs text-slate-600 mt-4 leading-relaxed">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <strong className="text-slate-900 block mb-1">📌 Standar Minimal Kehadiran 80%</strong>
                  Siswa wajib memenuhi kehadiran minimal 80% dari total hari efektif sekolah untuk syarat kelayakan ujian semester dan PKL.
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <strong className="text-slate-900 block mb-1">📝 Prosedur Ijin &amp; Sakit</strong>
                  Surat keterangan sakit atau bukti ijin resmi wajib diserahkan kepada Wali Kelas maksimal 2 hari setelah tidak masuk sekolah.
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-3">
              <button
                onClick={onNavigateToRekap}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Cari Presensi Nama Saya di Rekap</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Top Performers List */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <Award className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Siswa Kehadiran Teladan (95%+)
                </h3>
                <p className="text-xs text-slate-500">
                  Presensi terbaik dan paling konsisten
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs">
              {topStudents.length} Teratas
            </span>
          </div>

          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
            {topStudents.map((student, idx) => {
              const sum = studentSummaries[student.id];
              return (
                <div 
                  key={student.id}
                  onClick={() => onOpenStudentDetail(student)}
                  className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-emerald-300 transition-all cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="h-6 w-6 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="truncate">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                        {student.nama}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {student.kelas} • Hadir {sum.hadir} dari {sum.totalAktif} hari tercatat
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-sm font-extrabold text-emerald-600">
                      {sum.persentase}%
                    </span>
                    <div className="text-[10px] text-slate-400">kehadiran</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
};
