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
  Percent,
  Clock4
} from 'lucide-react';
import { Student, MonthInfo, AttendanceDatabase, StudentSummary } from '../types/attendance';
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
}) => {
  // Filter students based on selected class
  const filteredStudents = useMemo(() => {
    if (selectedClass === 'all') return students;
    return students.filter(s => s.kelas === selectedClass);
  }, [students, selectedClass]);

  // Compute summaries for filtered students
  const studentSummaries = useMemo(() => {
    const map: Record<string, StudentSummary> = {};

    filteredStudents.forEach(student => {
      if (selectedMonthKey === 'all') {
        map[student.id] = aggregateStudentSummaries(student.id, db, months);
      } else {
        const key = `${student.id}_${selectedMonthKey}`;
        map[student.id] = calculateStudentSummary(db[key]);
      }
    });

    return map;
  }, [filteredStudents, selectedMonthKey, db, months]);

  // Aggregate overall metrics
  const overallMetrics = useMemo(() => {
    let totalHadir = 0;
    let totalIjin = 0;
    let totalSakit = 0;
    let totalLibur = 0;
    let warningCount = 0;
    let totalPercentSum = 0;
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
          totalPercentSum += summary.persentase;
          activeStudentsCount++;
        }
      }
    });

    const averageRate = activeStudentsCount > 0 
      ? Math.round((totalPercentSum / activeStudentsCount) * 10) / 10 
      : 0;

    const totalLogs = totalHadir + totalIjin + totalSakit;

    return {
      totalHadir,
      totalIjin,
      totalSakit,
      totalLibur,
      totalLogs,
      warningCount,
      averageRate,
    };
  }, [filteredStudents, studentSummaries]);

  // Comparison metrics per class
  const classComparison = useMemo(() => {
    const classes = ['XII TJK 1', 'XII TJK 2', 'XII TJK 3'];
    return classes.map(cls => {
      const classStudents = students.filter(s => s.kelas === cls);
      let classHadir = 0;
      let classIjin = 0;
      let classSakit = 0;
      let classWarning = 0;
      let totalPerc = 0;

      classStudents.forEach(s => {
        let sum: StudentSummary;
        if (selectedMonthKey === 'all') {
          sum = aggregateStudentSummaries(s.id, db, months);
        } else {
          sum = calculateStudentSummary(db[`${s.id}_${selectedMonthKey}`]);
        }
        classHadir += sum.hadir;
        classIjin += sum.ijin;
        classSakit += sum.sakit;
        if (sum.isWarning) classWarning++;
        totalPerc += sum.persentase;
      });

      const avg = classStudents.length > 0 ? Math.round((totalPerc / classStudents.length) * 10) / 10 : 0;
      return {
        className: cls,
        count: classStudents.length,
        hadir: classHadir,
        ijin: classIjin,
        sakit: classSakit,
        warningCount: classWarning,
        averageRate: avg,
      };
    });
  }, [students, selectedMonthKey, db, months]);

  // Students needing attention (< 80%)
  const warningStudents = useMemo(() => {
    return filteredStudents
      .filter(s => studentSummaries[s.id]?.isWarning)
      .sort((a, b) => (studentSummaries[a.id]?.persentase || 0) - (studentSummaries[b.id]?.persentase || 0));
  }, [filteredStudents, studentSummaries]);

  // Top attendance students
  const topStudents = useMemo(() => {
    return filteredStudents
      .filter(s => (studentSummaries[s.id]?.persentase || 0) >= 95)
      .sort((a, b) => (studentSummaries[b.id]?.persentase || 0) - (studentSummaries[a.id]?.persentase || 0))
      .slice(0, 5);
  }, [filteredStudents, studentSummaries]);

  const activePeriodLabel = selectedMonthKey === 'all' 
    ? 'Akumulasi Semua Bulan (Okt 2026 - Feb 2027)' 
    : `Bulan ${selectedMonthKey} ${selectedMonthKey === 'Januari' || selectedMonthKey === 'Februari' ? '2027' : '2026'}`;

  return (
    <div className="space-y-6">
      
      {/* Top Header & Filter Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-3xl glass-panel shadow-2xl">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Dashboard Analitik Presensi
            </h2>
            <span className="px-2.5 py-0.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold">
              Live Overview
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Monitoring kehadiran siswa real-time dan sistem peringatan dini presensi rendah.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Month selector */}
          <div className="flex items-center gap-2 bg-black/30 border border-white/10 rounded-2xl px-3 py-1.5">
            <Calendar className="h-4 w-4 text-slate-400" />
            <select
              value={selectedMonthKey}
              onChange={(e) => onChangeMonth(e.target.value)}
              className="bg-transparent text-sm text-white font-medium focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-[#0b0f19] text-white">Semua Bulan (Akumulasi)</option>
              {months.map(m => (
                <option key={m.key} value={m.key} className="bg-[#0b0f19] text-white">
                  {m.nama} {m.tahun}
                </option>
              ))}
            </select>
          </div>

          {/* Class selector */}
          <div className="flex items-center gap-2 bg-black/30 border border-white/10 rounded-2xl px-3 py-1.5">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={selectedClass}
              onChange={(e) => onChangeClass(e.target.value)}
              className="bg-transparent text-sm text-white font-medium focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-[#0b0f19] text-white">Semua Kelas ({students.length})</option>
              <option value="XII TJK 1" className="bg-[#0b0f19] text-white">XII TJK 1</option>
              <option value="XII TJK 2" className="bg-[#0b0f19] text-white">XII TJK 2</option>
              <option value="XII TJK 3" className="bg-[#0b0f19] text-white">XII TJK 3</option>
            </select>
          </div>
        </div>
      </div>

      {/* Hero KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Students */}
        <div className="p-5 rounded-2xl glass-panel relative overflow-hidden group hover:border-blue-500/40 transition-all">
          <div className="absolute top-0 right-0 w-28 h-28 bg-blue-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-semibold tracking-wider text-slate-400">Total Siswa</span>
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-white tracking-tight">{filteredStudents.length}</div>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <span>{selectedClass === 'all' ? '3 Rombel Kelas XII' : selectedClass}</span>
            </p>
          </div>
        </div>

        {/* Average Attendance Rate */}
        <div className="p-5 rounded-2xl glass-panel relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-semibold tracking-wider text-slate-400">Rata-rata Kehadiran</span>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Percent className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-[#00ff9d] tracking-tight">
              {overallMetrics.averageRate}%
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
              <div 
                className="bg-[#00ff9d] h-full rounded-full transition-all duration-700 glow-hadir" 
                style={{ width: `${Math.min(overallMetrics.averageRate, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Total Hadir Logs */}
        <div className="p-5 rounded-2xl glass-panel relative overflow-hidden group hover:border-emerald-400/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-semibold tracking-wider text-slate-400">Total Hadir</span>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-white tracking-tight">
              {overallMetrics.totalHadir}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Dari {overallMetrics.totalLogs} catatan presensi aktif
            </p>
          </div>
        </div>

        {/* Warning Indicator (<80%) */}
        <div className={`p-5 rounded-2xl glass-panel relative overflow-hidden group transition-all ${
          overallMetrics.warningCount > 0 
            ? 'border-pink-500/40 bg-pink-500/[0.04]' 
            : 'hover:border-slate-700'
        }`}>
          <div className="absolute top-0 right-0 w-28 h-28 bg-pink-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-semibold tracking-wider text-slate-400">Peringatan (&lt;80%)</span>
            <div className={`p-2.5 rounded-xl border ${
              overallMetrics.warningCount > 0 
                ? 'bg-pink-500/20 text-[#ff0055] border-pink-500/40 glow-sakit' 
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}>
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-3xl font-extrabold tracking-tight ${
              overallMetrics.warningCount > 0 ? 'text-[#ff0055]' : 'text-slate-300'
            }`}>
              {overallMetrics.warningCount} Siswa
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {overallMetrics.warningCount > 0 ? 'Perlu tindakan & notifikasi wali' : 'Seluruh siswa aman'}
            </p>
          </div>
        </div>

      </div>

      {/* Class Comparison & Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Class Comparison Cards (2 cols) */}
        <div className="lg:col-span-2 p-6 rounded-3xl glass-panel">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-400" />
                Komparasi Kehadiran Antar Kelas
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {activePeriodLabel}
              </p>
            </div>
            <button
              onClick={onNavigateToRekap}
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
            >
              Lihat Detail Rekap <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-4">
            {classComparison.map((item) => (
              <div 
                key={item.className}
                className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-sm text-white">{item.className}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/5 text-slate-400">
                      {item.count} siswa
                    </span>
                    {item.warningCount > 0 && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-pink-500/20 text-[#ff0055] font-semibold border border-pink-500/30">
                        {item.warningCount} peringatan
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className={`text-base font-extrabold ${item.averageRate < 80 ? 'text-[#ff0055]' : 'text-[#00ff9d]'}`}>
                      {item.averageRate}%
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-800/80 rounded-full h-2.5 overflow-hidden flex">
                  <div 
                    className="bg-[#00ff9d] h-full transition-all duration-700" 
                    style={{ width: `${item.averageRate}%` }}
                    title={`Kehadiran: ${item.averageRate}%`}
                  ></div>
                </div>

                {/* Stats badge breakdown */}
                <div className="flex items-center gap-4 mt-2.5 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#00ff9d]"></span>
                    <span>Hadir: <strong className="text-slate-200">{item.hadir}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#ffcc00]"></span>
                    <span>Ijin: <strong className="text-slate-200">{item.ijin}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#ff0055]"></span>
                    <span>Sakit: <strong className="text-slate-200">{item.sakit}</strong></span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Status Distribution Summary (1 col) */}
        <div className="p-6 rounded-3xl glass-panel flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2 mb-1">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
              Komposisi Status Presensi
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Distribusi seluruh status kehadiran tercatat
            </p>

            <div className="space-y-4">
              {/* Hadir */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-[#00ff9d] flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#00ff9d]"></span> HADIR
                  </span>
                  <span className="text-white">
                    {overallMetrics.totalHadir} ({overallMetrics.totalLogs > 0 ? Math.round((overallMetrics.totalHadir / overallMetrics.totalLogs) * 100) : 0}%)
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-[#00ff9d] h-full glow-hadir" 
                    style={{ width: `${overallMetrics.totalLogs > 0 ? (overallMetrics.totalHadir / overallMetrics.totalLogs) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>

              {/* Ijin */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-[#ffcc00] flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#ffcc00]"></span> IJIN
                  </span>
                  <span className="text-white">
                    {overallMetrics.totalIjin} ({overallMetrics.totalLogs > 0 ? Math.round((overallMetrics.totalIjin / overallMetrics.totalLogs) * 100) : 0}%)
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-[#ffcc00] h-full glow-ijin" 
                    style={{ width: `${overallMetrics.totalLogs > 0 ? (overallMetrics.totalIjin / overallMetrics.totalLogs) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>

              {/* Sakit */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-[#ff0055] flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#ff0055]"></span> SAKIT
                  </span>
                  <span className="text-white">
                    {overallMetrics.totalSakit} ({overallMetrics.totalLogs > 0 ? Math.round((overallMetrics.totalSakit / overallMetrics.totalLogs) * 100) : 0}%)
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-[#ff0055] h-full glow-sakit" 
                    style={{ width: `${overallMetrics.totalLogs > 0 ? (overallMetrics.totalSakit / overallMetrics.totalLogs) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>

              {/* Libur */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-[#a855f7] flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#a855f7]"></span> LIBUR / MINGGU
                  </span>
                  <span className="text-white">{overallMetrics.totalLibur} hari</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div className="bg-[#a855f7] h-full glow-libur" style={{ width: '100%' }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/5">
            <button
              onClick={() => onNavigateToCalendar()}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs tracking-wider uppercase transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              Buka Form Input Absensi
            </button>
          </div>
        </div>

      </div>

      {/* Warning List (<80%) and High Performers split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Panel: Warning Attention List (Admin) OR Panduan Siswa (Public) */}
        {userRole === 'admin' ? (
          <div className="p-6 rounded-3xl glass-panel border-pink-500/20 bg-pink-500/[0.02]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-pink-500/20 text-[#ff0055] border border-pink-500/30 glow-sakit">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Siswa Perlu Perhatian Khusus
                  </h3>
                  <p className="text-xs text-slate-400">
                    Tingkat kehadiran di bawah 80% (Perlu pendampingan)
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-pink-500/20 text-[#ff0055] font-extrabold text-xs">
                {warningStudents.length} Siswa
              </span>
            </div>

            {warningStudents.length === 0 ? (
              <div className="p-8 text-center text-slate-400 bg-white/[0.02] rounded-2xl border border-white/5">
                <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2 opacity-80" />
                <p className="text-sm font-semibold text-slate-300">Tidak ada siswa dengan kehadiran di bawah 80%.</p>
                <p className="text-xs mt-1">Semua siswa dalam status aman.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {warningStudents.map(student => {
                  const sum = studentSummaries[student.id];
                  const waUrl = `https://wa.me/?text=${generateWhatsAppMessage(student, sum, activePeriodLabel)}`;

                  return (
                    <div 
                      key={student.id}
                      className="p-3.5 rounded-2xl bg-black/40 border border-pink-500/20 hover:border-pink-500/50 transition-all flex items-center justify-between gap-3"
                    >
                      <div 
                        onClick={() => onOpenStudentDetail(student)}
                        className="cursor-pointer flex-1 min-w-0"
                      >
                        <h4 className="text-xs sm:text-sm font-bold text-white truncate hover:text-blue-300 transition-colors">
                          {student.nama}
                        </h4>
                        <p className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span className="text-slate-300 font-medium">{student.kelas}</span>
                          <span>•</span>
                          <span>Sakit: <strong className="text-[#ff0055]">{sum.sakit}</strong></span>
                          <span>•</span>
                          <span>Ijin: <strong className="text-[#ffcc00]">{sum.ijin}</strong></span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <div className="text-right">
                          <span className="text-sm font-extrabold text-[#ff0055]">
                            {sum.persentase}%
                          </span>
                          <div className="text-[10px] text-slate-500">kehadiran</div>
                        </div>

                        {/* WhatsApp Trigger */}
                        <a 
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Kirim pesan peringatan via WhatsApp"
                          className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-[#00ff9d] border border-emerald-500/30 transition-all"
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
          <div className="p-6 rounded-3xl glass-panel flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Panduan &amp; Standar Kehadiran Siswa
                  </h3>
                  <p className="text-xs text-slate-400">
                    SMK Negeri 1 Singkawang • Tata Tertib Presensi
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-xs text-slate-300 mt-4 leading-relaxed">
                <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                  <strong className="text-white block mb-1">📌 Standar Minimal Kehadiran 80%</strong>
                  Siswa wajib memenuhi kehadiran minimal 80% dari total hari efektif sekolah untuk syarat kelayakan mengikuti ujian semester dan PKL.
                </div>

                <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                  <strong className="text-white block mb-1">📝 Prosedur Ijin &amp; Sakit</strong>
                  Surat keterangan sakit atau bukti ijin resmi wajib diserahkan kepada Wali Kelas maksimal 2 hari setelah tidak masuk sekolah.
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/5 flex items-center gap-3">
              <button
                onClick={onNavigateToRekap}
                className="flex-1 py-2.5 px-4 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-white font-bold text-xs transition-colors flex items-center justify-center gap-2"
              >
                <span>Cari Presensi Nama Saya</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Top Performers List */}
        <div className="p-6 rounded-3xl glass-panel">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-[#00ff9d] border border-emerald-500/30 glow-hadir">
                <Award className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Siswa Kehadiran Teladan (95%+)
                </h3>
                <p className="text-xs text-slate-400">
                  Presensi terbaik dan paling konsisten
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-[#00ff9d] font-extrabold text-xs">
              {topStudents.length} Teratas
            </span>
          </div>

          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {topStudents.map((student, idx) => {
              const sum = studentSummaries[student.id];
              return (
                <div 
                  key={student.id}
                  onClick={() => onOpenStudentDetail(student)}
                  className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-emerald-500/40 transition-all cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="h-6 w-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[#00ff9d] text-xs font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="truncate">
                      <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                        {student.nama}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {student.kelas} • Hadir {sum.hadir} dari {sum.totalAktif} hari aktif
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-sm font-extrabold text-[#00ff9d]">
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
