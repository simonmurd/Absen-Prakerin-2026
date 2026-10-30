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
type DataSourceMode = 'local_calendar' | 'google_apps_script';

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
  const [dataSourceMode, setDataSourceMode] = useState<DataSourceMode>(gasData && gasData.length > 0 ? 'google_apps_script' : 'local_calendar');

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
          // fallback to calendar calculation
          map[student.id] = aggregateStudentSummaries(student.id, db, months);
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
    return filterStudents(students, searchKeyword, selectedClass, warningFilter, summaries);
  }, [students, searchKeyword, selectedClass, warningFilter, summaries]);

  // Sort students
  const sortedStudents = useMemo(() => {
    return [...filteredStudents].sort((a, b) => {
      const sumA = summaries[a.id];
      const sumB = summaries[b.id];

      let comp = 0;
      if (sortField === 'nama') {
        comp = a.nama.localeCompare(b.nama);
      } else if (sortField === 'kelas') {
        comp = a.kelas.localeCompare(b.kelas);
      } else if (sortField === 'hadir') {
        comp = (sumA?.hadir || 0) - (sumB?.hadir || 0);
      } else if (sortField === 'ijin') {
        comp = (sumA?.ijin || 0) - (sumB?.ijin || 0);
      } else if (sortField === 'sakit') {
        comp = (sumA?.sakit || 0) - (sumB?.sakit || 0);
      } else if (sortField === 'persentase') {
        comp = (sumA?.persentase || 0) - (sumB?.persentase || 0);
      }

      return sortOrder === 'asc' ? comp : -comp;
    });
  }, [filteredStudents, summaries, sortField, sortOrder]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder(field === 'nama' || field === 'kelas' ? 'asc' : 'desc');
    }
  };

  const periodLabel = selectedMonthKey === 'all' 
    ? 'Akumulasi Semua Bulan (Okt 2026 - Feb 2027)' 
    : `Bulan ${selectedMonthKey}`;

  // Export to CSV
  const handleExportCsv = () => {
    const csvContent = exportToCsvString(sortedStudents, summaries, periodLabel);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Rekap_Presensi_${selectedMonthKey}_${selectedClass}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print view
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner and Actions */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 rounded-3xl glass-panel shadow-2xl">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              Dashboard Rekapitulasi Presensi
            </h2>
            {gasData && gasData.length > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Apps Script Live ({gasData.length} Data)
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Laporan presensi siswa XII TJK SMK Negeri 1 Singkawang {lastSyncTime ? `• Terakhir disinkron: ${lastSyncTime}` : ''}
          </p>

          {/* Source Toggle */}
          <div className="flex items-center gap-2 mt-3">
            <span className="text-[11px] font-semibold text-slate-400">Sumber Data:</span>
            <div className="flex items-center gap-1 p-0.5 rounded-xl bg-black/40 border border-white/10">
              <button
                type="button"
                onClick={() => setDataSourceMode('google_apps_script')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  dataSourceMode === 'google_apps_script'
                    ? 'bg-emerald-500/20 text-[#00ff9d] border border-emerald-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Google Apps Script
              </button>
              <button
                type="button"
                onClick={() => setDataSourceMode('local_calendar')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  dataSourceMode === 'local_calendar'
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Kalender Interaktif
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {onRefreshData && (
            <button
              onClick={onRefreshData}
              disabled={isRefreshing}
              className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 font-semibold text-xs border border-white/10 flex items-center gap-1.5 transition-all"
              title="Sinkronisasi ulang dari Google Sheet"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          )}

          {userRole === 'admin' && (
            <>
              <button
                onClick={handleExportCsv}
                className="px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-[#00ff9d] border border-emerald-500/30 font-semibold text-xs flex items-center gap-1.5 transition-all glow-hadir"
                title="Download data sebagai file CSV / Excel"
              >
                <Download className="h-4 w-4" />
                <span>Ekspor CSV</span>
              </button>

              <button
                onClick={handlePrint}
                className="px-3.5 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 font-semibold text-xs flex items-center gap-1.5 transition-all"
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
      <div className="p-4 rounded-3xl glass-panel space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="🔍 Cari Nama Siswa..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl glass-input text-xs sm:text-sm font-medium"
            />
            {searchKeyword && (
              <button 
                onClick={() => setSearchKeyword('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* Month selector */}
          <div className="flex items-center gap-2 bg-black/30 border border-white/10 rounded-2xl px-3 py-2">
            <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
            <select
              value={selectedMonthKey}
              onChange={(e) => setSelectedMonthKey(e.target.value)}
              className="bg-transparent text-xs sm:text-sm text-white font-medium focus:outline-none w-full cursor-pointer"
            >
              <option value="all" className="bg-[#0b0f19] text-white">Semua Bulan (Akumulasi)</option>
              {months.map(m => (
                <option key={m.key} value={m.key} className="bg-[#0b0f19] text-white">
                  Bulan {m.nama} {m.tahun}
                </option>
              ))}
            </select>
          </div>

          {/* Class filter */}
          <div className="flex items-center gap-2 bg-black/30 border border-white/10 rounded-2xl px-3 py-2">
            <Filter className="h-4 w-4 text-slate-400 shrink-0" />
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="bg-transparent text-xs sm:text-sm text-white font-medium focus:outline-none w-full cursor-pointer"
            >
              <option value="all" className="bg-[#0b0f19] text-white">Semua Rombel (3 Kelas)</option>
              <option value="XII TJK 1" className="bg-[#0b0f19] text-white">XII TJK 1</option>
              <option value="XII TJK 2" className="bg-[#0b0f19] text-white">XII TJK 2</option>
              <option value="XII TJK 3" className="bg-[#0b0f19] text-white">XII TJK 3</option>
            </select>
          </div>

          {/* Status Warning filter */}
          <div className="flex items-center gap-2 bg-black/30 border border-white/10 rounded-2xl px-3 py-2">
            <UserCheck className="h-4 w-4 text-slate-400 shrink-0" />
            <select
              value={warningFilter}
              onChange={(e) => setWarningFilter(e.target.value as any)}
              className="bg-transparent text-xs sm:text-sm text-white font-medium focus:outline-none w-full cursor-pointer"
            >
              <option value="all" className="bg-[#0b0f19] text-white">Semua Status Presensi</option>
              <option value="warning" className="bg-[#0b0f19] text-[#ff0055]">⚠️ Peringatan (&lt; 80%)</option>
              <option value="safe" className="bg-[#0b0f19] text-[#00ff9d]">✅ Kehadiran Baik (≥ 80%)</option>
            </select>
          </div>

        </div>

        {/* Results Count indicator */}
        <div className="flex items-center justify-between text-xs text-slate-400 px-1 pt-1">
          <span>Menampilkan <strong>{sortedStudents.length}</strong> dari <strong>{students.length}</strong> siswa</span>
          <span className="text-[11px] text-slate-500">
            *Baris merah muda menandakan siswa dengan kehadiran di bawah ambang batas 80%
          </span>
        </div>
      </div>

      {/* Main Table Responsive Card */}
      <div className="rounded-3xl glass-panel overflow-hidden shadow-2xl border border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm" id="rekapTable">
            <thead>
              <tr className="bg-white/[0.04] border-b border-white/10 text-[11px] uppercase tracking-wider text-slate-400">
                <th className="py-3.5 px-4 font-semibold text-center w-12">No</th>
                <th 
                  onClick={() => toggleSort('nama')}
                  className="py-3.5 px-4 font-semibold cursor-pointer hover:text-white transition-colors select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Nama Lengkap</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-500" />
                  </div>
                </th>
                <th 
                  onClick={() => toggleSort('kelas')}
                  className="py-3.5 px-4 font-semibold cursor-pointer hover:text-white transition-colors select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Kelas</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-500" />
                  </div>
                </th>
                <th 
                  onClick={() => toggleSort('hadir')}
                  className="py-3.5 px-4 font-semibold text-center cursor-pointer hover:text-white transition-colors select-none"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Hadir</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-500" />
                  </div>
                </th>
                <th 
                  onClick={() => toggleSort('ijin')}
                  className="py-3.5 px-4 font-semibold text-center cursor-pointer hover:text-white transition-colors select-none"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Ijin</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-500" />
                  </div>
                </th>
                <th 
                  onClick={() => toggleSort('sakit')}
                  className="py-3.5 px-4 font-semibold text-center cursor-pointer hover:text-white transition-colors select-none"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Sakit</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-500" />
                  </div>
                </th>
                <th 
                  onClick={() => toggleSort('persentase')}
                  className="py-3.5 px-4 font-semibold text-right cursor-pointer hover:text-white transition-colors select-none"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>% Hadir</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-500" />
                  </div>
                </th>
                <th className="py-3.5 px-4 font-semibold text-center w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sortedStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <AlertTriangle className="h-8 w-8 text-slate-500 mx-auto mb-2" />
                    <p className="font-semibold text-base">Tidak ada data siswa yang sesuai filter.</p>
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
                          ? 'bg-pink-500/[0.08] hover:bg-pink-500/[0.14] border-l-4 border-l-[#ff0055]' 
                          : 'hover:bg-white/[0.04]'
                      }`}
                    >
                      <td className="py-3 px-4 text-center text-xs text-slate-500 font-mono">
                        {idx + 1}
                      </td>

                      <td className="py-3 px-4">
                        <div 
                          onClick={() => onOpenStudentDetail(student)}
                          className="font-bold text-white hover:text-blue-400 cursor-pointer transition-colors"
                        >
                          {student.nama}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {student.sekolah}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-300 font-medium whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/5 text-xs">
                          {student.kelas}
                        </span>
                      </td>

                      {/* Hadir badge */}
                      <td className="py-3 px-4 text-center">
                        <span className="inline-block min-w-8 px-2 py-0.5 rounded-lg bg-emerald-500/10 text-[#00ff9d] font-bold text-xs border border-emerald-500/20">
                          {sum.hadir}
                        </span>
                      </td>

                      {/* Ijin badge */}
                      <td className="py-3 px-4 text-center">
                        <span className="inline-block min-w-8 px-2 py-0.5 rounded-lg bg-amber-500/10 text-[#ffcc00] font-bold text-xs border border-amber-500/20">
                          {sum.ijin}
                        </span>
                      </td>

                      {/* Sakit badge */}
                      <td className="py-3 px-4 text-center">
                        <span className="inline-block min-w-8 px-2 py-0.5 rounded-lg bg-pink-500/10 text-[#ff0055] font-bold text-xs border border-pink-500/20">
                          {sum.sakit}
                        </span>
                      </td>

                      {/* Percentage */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className={`font-extrabold text-sm ${isWarning ? 'text-[#ff0055]' : 'text-[#00ff9d]'}`}>
                            {sum.persentase}%
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500">
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
                              className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/10 transition-colors"
                            >
                              <Calendar className="h-3.5 w-3.5" />
                            </button>
                          )}

                          {/* Detail modal (All users) */}
                          <button
                            onClick={() => onOpenStudentDetail(student)}
                            title="Lihat riwayat kalender lengkap"
                            className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 transition-colors"
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
                              className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-[#00ff9d] border border-emerald-500/30 transition-colors"
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
