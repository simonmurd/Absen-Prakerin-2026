import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Download, 
  Printer, 
  Calendar, 
  Filter, 
  AlertTriangle, 
  CheckCircle2, 
  MessageCircle, 
  ExternalLink,
  RefreshCw,
  ArrowUpDown,
  UserCheck
} from 'lucide-react';
import { Student, MonthInfo, AttendanceDatabase, StudentSummary, GasStudentRekap } from '../types/attendance';
import { UserRole } from '../utils/auth';
import { 
  calculateStudentSummary, 
  aggregateStudentSummaries, 
  filterStudents, 
  generateWhatsAppMessage, 
  exportToCsvString 
} from '../utils/attendance';

interface RekapViewProps {
  students: Student[];
  months: MonthInfo[];
  db: AttendanceDatabase;
  onOpenStudentDetail: (student: Student) => void;
  onEditInCalendar: (studentId: string, monthKey: string) => void;
  onRefreshData?: () => void;
  isRefreshing?: boolean;
  gasData?: GasStudentRekap[] | null;
  lastSyncTime?: string | null;
  userRole?: UserRole;
}

type SortField = 'nama' | 'kelas' | 'hadir' | 'ijin' | 'sakit' | 'persentase';
type SortOrder = 'asc' | 'desc';
type DataSourceMode = 'google_apps_script' | 'local_calendar';

export const RekapView: React.FC<RekapViewProps> = ({
  students,
  months,
  db,
  onOpenStudentDetail,
  onEditInCalendar,
  onRefreshData,
  isRefreshing = false,
  gasData,
  lastSyncTime,
  userRole = 'public',
}) => {
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [warningFilter, setWarningFilter] = useState<'all' | 'warning' | 'safe'>('all');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('persentase');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [dataSourceMode, setDataSourceMode] = useState<DataSourceMode>('google_apps_script');

  // Compute summaries based on selected source mode
  const summaries = useMemo(() => {
    const map: Record<string, StudentSummary> = {};

    if (dataSourceMode === 'google_apps_script' && gasData && gasData.length > 0) {
      // Build lookup from Google Apps Script live data
      const gasMap = new Map<string, GasStudentRekap>();
      gasData.forEach(item => {
        const cleanName = item.nama.trim().toLowerCase();
        gasMap.set(cleanName, item);
      });

      students.forEach(student => {
        const cleanName = student.nama.trim().toLowerCase();
        const gasItem = gasMap.get(cleanName);
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
          // If not found in sheet, check local calendar submissions or clean 0
          const calSummary = aggregateStudentSummaries(student.id, db, months);
          map[student.id] = calSummary;
        }
      });
      return map;
    }

    // Default calendar-based computation
    students.forEach(student => {
      if (selectedMonthKey === 'all') {
        map[student.id] = aggregateStudentSummaries(student.id, db, months);
      } else {
        const key = `${student.id}_${selectedMonthKey}`;
        map[student.id] = calculateStudentSummary(db[key]);
      }
    });
    return map;
  }, [students, selectedMonthKey, db, months, dataSourceMode, gasData]);

  // Filter students
  const filteredStudents = useMemo(() => {
    let result = filterStudents(students, searchKeyword, selectedClass);

    if (warningFilter === 'warning') {
      result = result.filter(s => summaries[s.id]?.isWarning);
    } else if (warningFilter === 'safe') {
      result = result.filter(s => {
        const sum = summaries[s.id];
        return sum && !sum.isWarning;
      });
    }

    return result;
  }, [students, searchKeyword, selectedClass, warningFilter, summaries]);

  // Sort students
  const sortedStudents = useMemo(() => {
    return [...filteredStudents].sort((a, b) => {
      let valA: any;
      let valB: any;

      if (sortField === 'nama') {
        valA = a.nama;
        valB = b.nama;
        return sortOrder === 'asc' 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      }

      if (sortField === 'kelas') {
        valA = a.kelas;
        valB = b.kelas;
        return sortOrder === 'asc' 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      }

      const sumA = summaries[a.id] || { hadir: 0, ijin: 0, sakit: 0, persentase: 0 };
      const sumB = summaries[b.id] || { hadir: 0, ijin: 0, sakit: 0, persentase: 0 };

      if (sortField === 'hadir') {
        valA = sumA.hadir;
        valB = sumB.hadir;
      } else if (sortField === 'ijin') {
        valA = sumA.ijin;
        valB = sumB.ijin;
      } else if (sortField === 'sakit') {
        valA = sumA.sakit;
        valB = sumB.sakit;
      } else {
        valA = sumA.persentase;
        valB = sumB.persentase;
      }

      return sortOrder === 'asc' ? valA - valB : valB - valA;
    });
  }, [filteredStudents, sortField, sortOrder, summaries]);

  // Toggle sort
  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'nama' || field === 'kelas' ? 'asc' : 'desc');
    }
  };

  const periodLabel = selectedMonthKey === 'all' 
    ? 'Semester Berjalan' 
    : `Bulan ${selectedMonthKey}`;

  // Export CSV
  const handleExportCsv = () => {
    const csv = exportToCsvString(sortedStudents, summaries, periodLabel);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Rekap_Presensi_SMKN1_${selectedClass}_${selectedMonthKey}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print report
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-white border border-slate-200 shadow-sm">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Rekapitulasi Presensi
            </h2>
            {gasData && gasData.length > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Google Sheet Live ({gasData.length} Siswa)
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Laporan kehadiran siswa XII TJK SMK Negeri 1 Singkawang {lastSyncTime ? `• Sinkron: ${lastSyncTime}` : ''}
          </p>

          {/* Source Toggle */}
          <div className="flex items-center gap-2 mt-3">
            <span className="text-[11px] font-semibold text-slate-400">Sumber:</span>
            <div className="flex items-center gap-1 p-0.5 rounded-xl bg-slate-100 border border-slate-200">
              <button
                type="button"
                onClick={() => setDataSourceMode('google_apps_script')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  dataSourceMode === 'google_apps_script'
                    ? 'bg-white text-emerald-700 shadow-sm border border-slate-200'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Google Apps Script
              </button>
              <button
                type="button"
                onClick={() => setDataSourceMode('local_calendar')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  dataSourceMode === 'local_calendar'
                    ? 'bg-white text-blue-700 shadow-sm border border-slate-200'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Kalender Lokal
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {onRefreshData && (
            <button
              onClick={onRefreshData}
              disabled={isRefreshing}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 flex items-center gap-1.5 transition-all cursor-pointer"
              title="Sinkronisasi ulang dari Google Sheet"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
              <span className="hidden sm:inline">Refresh Data</span>
            </button>
          )}

          {userRole === 'admin' && (
            <>
              <button
                onClick={handleExportCsv}
                className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                title="Download data sebagai file CSV / Excel"
              >
                <Download className="h-4 w-4" />
                <span>Ekspor CSV</span>
              </button>

              <button
                onClick={handlePrint}
                className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                title="Cetak laporan"
              >
                <Printer className="h-4 w-4" />
                <span className="hidden sm:inline">Cetak</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Cari Nama Siswa..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs sm:text-sm font-medium focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
            />
            {searchKeyword && (
              <button 
                onClick={() => setSearchKeyword('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Month selector */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs">
            <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
            <select
              value={selectedMonthKey}
              onChange={(e) => setSelectedMonthKey(e.target.value)}
              className="bg-transparent text-slate-800 font-semibold focus:outline-none w-full cursor-pointer"
            >
              <option value="all">Semua Bulan (Semester)</option>
              {months.map(m => (
                <option key={m.key} value={m.key}>
                  Bulan {m.nama} {m.tahun}
                </option>
              ))}
            </select>
          </div>

          {/* Class filter */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs">
            <Filter className="h-4 w-4 text-slate-400 shrink-0" />
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="bg-transparent text-slate-800 font-semibold focus:outline-none w-full cursor-pointer"
            >
              <option value="all">Semua Rombel (3 Kelas)</option>
              <option value="XII TJK 1">XII TJK 1</option>
              <option value="XII TJK 2">XII TJK 2</option>
              <option value="XII TJK 3">XII TJK 3</option>
            </select>
          </div>

          {/* Status Warning filter */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs">
            <UserCheck className="h-4 w-4 text-slate-400 shrink-0" />
            <select
              value={warningFilter}
              onChange={(e) => setWarningFilter(e.target.value as any)}
              className="bg-transparent text-slate-800 font-semibold focus:outline-none w-full cursor-pointer"
            >
              <option value="all">Semua Status Presensi</option>
              <option value="warning">Peringatan (&lt; 80%)</option>
              <option value="safe">Kehadiran Baik (≥ 80%)</option>
            </select>
          </div>

        </div>

        {/* Results Count indicator */}
        <div className="flex items-center justify-between text-xs text-slate-500 px-1 pt-1">
          <span>Menampilkan <strong>{sortedStudents.length}</strong> dari <strong>{students.length}</strong> siswa</span>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            *Baris dengan batas merah menandakan siswa di bawah ambang batas 80%
          </span>
        </div>
      </div>

      {/* Mobile Card View (Smartphone only: block md:hidden) */}
      <div className="block md:hidden space-y-3">
        {sortedStudents.length === 0 ? (
          <div className="p-8 text-center text-slate-500 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <AlertTriangle className="h-8 w-8 text-slate-400 mx-auto mb-2" />
            <p className="font-bold text-sm text-slate-700">Tidak ada data siswa yang sesuai.</p>
            <p className="text-xs mt-1 text-slate-500">Sesuaikan filter atau kata kunci pencarian.</p>
          </div>
        ) : (
          sortedStudents.map((student, idx) => {
            const sum = summaries[student.id];
            const isWarning = sum.isWarning;
            const waUrl = `https://wa.me/?text=${generateWhatsAppMessage(student, sum, periodLabel)}`;

            return (
              <div 
                key={student.id}
                className={`p-4 rounded-2xl bg-white border transition-all shadow-sm ${
                  isWarning ? 'border-rose-200 bg-rose-50/20' : 'border-slate-200'
                }`}
              >
                {/* Card Top: Number, Name, Class & Percentage */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className="h-6 w-6 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 text-xs font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <h4 
                        onClick={() => onOpenStudentDetail(student)}
                        className="font-bold text-slate-900 text-sm truncate hover:text-blue-600 cursor-pointer"
                      >
                        {student.nama}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] text-slate-700 font-semibold">
                          {student.kelas}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {student.sekolah}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className={`text-base font-extrabold ${isWarning ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {sum.persentase}%
                    </span>
                    <div className="text-[10px] text-slate-400">
                      {sum.totalAktif} hari aktif
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-100 rounded-full h-1.5 my-3 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      isWarning ? 'bg-rose-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(sum.persentase, 100)}%` }}
                  ></div>
                </div>

                {/* Card Bottom: Badges (H, I, S) & Action Buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                      H: {sum.hadir}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200">
                      I: {sum.ijin}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200">
                      S: {sum.sakit}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onOpenStudentDetail(student)}
                      className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 text-xs flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>Detail</span>
                    </button>

                    {userRole === 'admin' && (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Kirim rekap ke WhatsApp Wali Murid"
                        className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-pointer"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Main Table Responsive Card (Desktop & Tablet only: hidden md:block) */}
      <div className="hidden md:block rounded-3xl bg-white border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm" id="rekapTable">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                <th className="py-3.5 px-4 text-center w-12">No</th>
                <th 
                  onClick={() => toggleSort('nama')}
                  className="py-3.5 px-4 cursor-pointer hover:text-slate-900 transition-colors select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Nama Lengkap</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </div>
                </th>
                <th 
                  onClick={() => toggleSort('kelas')}
                  className="py-3.5 px-4 cursor-pointer hover:text-slate-900 transition-colors select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Kelas</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </div>
                </th>
                <th 
                  onClick={() => toggleSort('hadir')}
                  className="py-3.5 px-4 text-center cursor-pointer hover:text-slate-900 transition-colors select-none"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Hadir</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </div>
                </th>
                <th 
                  onClick={() => toggleSort('ijin')}
                  className="py-3.5 px-4 text-center cursor-pointer hover:text-slate-900 transition-colors select-none"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Ijin</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </div>
                </th>
                <th 
                  onClick={() => toggleSort('sakit')}
                  className="py-3.5 px-4 text-center cursor-pointer hover:text-slate-900 transition-colors select-none"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Sakit</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </div>
                </th>
                <th 
                  onClick={() => toggleSort('persentase')}
                  className="py-3.5 px-4 text-right cursor-pointer hover:text-slate-900 transition-colors select-none"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>% Hadir</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3.5 px-4 text-center w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <AlertTriangle className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                    <p className="font-bold text-base text-slate-800">Tidak ada data siswa yang sesuai filter.</p>
                    <p className="text-xs mt-1">Coba sesuaikan kata kunci pencarian atau ganti filter kelas.</p>
                  </td>
                </tr>
              ) : (
                sortedStudents.map((student, idx) => {
                  const sum = summaries[student.id];
                  const isWarning = sum.isWarning;
                  const waUrl = `https://wa.me/?text=${generateWhatsAppMessage(student, sum, periodLabel)}`;

                  return (
                    <tr 
                      key={student.id}
                      className={`transition-colors ${
                        isWarning 
                          ? 'bg-rose-50/40 hover:bg-rose-50/70 border-l-4 border-l-rose-500' 
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-3 px-4 text-center text-xs text-slate-400 font-mono">
                        {idx + 1}
                      </td>

                      <td className="py-3 px-4">
                        <div 
                          onClick={() => onOpenStudentDetail(student)}
                          className="font-bold text-slate-900 hover:text-blue-600 cursor-pointer transition-colors"
                        >
                          {student.nama}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {student.sekolah}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-700 font-medium whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-xs font-semibold">
                          {student.kelas}
                        </span>
                      </td>

                      {/* Hadir badge */}
                      <td className="py-3 px-4 text-center">
                        <span className="inline-block min-w-8 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200">
                          {sum.hadir}
                        </span>
                      </td>

                      {/* Ijin badge */}
                      <td className="py-3 px-4 text-center">
                        <span className="inline-block min-w-8 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-bold text-xs border border-amber-200">
                          {sum.ijin}
                        </span>
                      </td>

                      {/* Sakit badge */}
                      <td className="py-3 px-4 text-center">
                        <span className="inline-block min-w-8 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-bold text-xs border border-rose-200">
                          {sum.sakit}
                        </span>
                      </td>

                      {/* Percentage */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className={`font-extrabold text-sm ${isWarning ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {sum.persentase}%
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          dari {sum.totalAktif} hari aktif
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Calendar view & edit (Admin only) */}
                          {userRole === 'admin' && (
                            <button
                              onClick={() => onEditInCalendar(student.id, selectedMonthKey === 'all' ? 'Desember' : selectedMonthKey)}
                              title="Edit presensi di kalender"
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-200 transition-colors cursor-pointer"
                            >
                              <Calendar className="h-3.5 w-3.5" />
                            </button>
                          )}

                          {/* Detail modal (All users) */}
                          <button
                            onClick={() => onOpenStudentDetail(student)}
                            title="Lihat riwayat kalender lengkap"
                            className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors cursor-pointer"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </button>

                          {/* WhatsApp alert for parent (Admin only) */}
                          {userRole === 'admin' && (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Kirim rekap ke WhatsApp Wali Murid"
                              className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors cursor-pointer"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
