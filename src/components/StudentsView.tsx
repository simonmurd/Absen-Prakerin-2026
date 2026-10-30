import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  GraduationCap, 
  Calendar, 
  Award,
  ExternalLink,
  Plus,
  School
} from 'lucide-react';
import { Student, MonthInfo, AttendanceDatabase } from '../types/attendance';
import { aggregateStudentSummaries } from '../utils/attendance';

interface StudentsViewProps {
  students: Student[];
  months: MonthInfo[];
  db: AttendanceDatabase;
  onOpenStudentDetail: (student: Student) => void;
  onNavigateToCalendar: (studentId: string, monthKey: string) => void;
  onAddStudent?: (student: Omit<Student, 'id'>) => void;
}

export const StudentsView: React.FC<StudentsViewProps> = ({
  students,
  months,
  db,
  onOpenStudentDetail,
  onNavigateToCalendar,
}) => {
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      if (selectedClass !== 'all' && student.kelas !== selectedClass) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return student.nama.toLowerCase().includes(q) || student.kelas.toLowerCase().includes(q);
      }
      return true;
    });
  }, [students, selectedClass, searchQuery]);

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl glass-panel shadow-2xl">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Data Siswa &amp; Direktori Kelas
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              SMK Negeri 1 Singkawang • Kompetensi Keahlian Teknik Jaringan Komputer (XII TJK)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-semibold text-slate-300">
            Total {students.length} Siswa Terdaftar
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-3xl glass-panel flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari siswa atau nomor absen..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl glass-input text-xs sm:text-sm font-medium"
          />
        </div>

        {/* Class Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-black/30 border border-white/5 w-full sm:w-auto overflow-x-auto">
          {['all', 'XII TJK 1', 'XII TJK 2', 'XII TJK 3'].map((cls) => {
            const isActive = selectedClass === cls;
            const label = cls === 'all' ? 'Semua Kelas' : cls;
            return (
              <button
                key={cls}
                onClick={() => setSelectedClass(cls)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-blue-600/30 text-white border border-blue-500/50 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Student Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStudents.map((student) => {
          const sum = aggregateStudentSummaries(student.id, db, months);

          return (
            <div
              key={student.id}
              className="p-5 rounded-2xl glass-panel hover:border-white/20 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-white/5 text-[11px] font-semibold text-slate-300 border border-white/10">
                    {student.kelas}
                  </span>
                  <span className={`text-xs font-extrabold px-2 py-0.5 rounded-md ${
                    sum.isWarning 
                      ? 'bg-pink-500/20 text-[#ff0055] border border-pink-500/30' 
                      : 'bg-emerald-500/10 text-[#00ff9d] border border-emerald-500/20'
                  }`}>
                    {sum.persentase}% Hadir
                  </span>
                </div>

                <h3 
                  onClick={() => onOpenStudentDetail(student)}
                  className="font-bold text-white text-sm group-hover:text-blue-400 cursor-pointer transition-colors"
                >
                  {student.nama}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                  <School className="h-3 w-3" /> {student.sekolah}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                  <span>H: <strong className="text-slate-200">{sum.hadir}</strong></span>
                  <span>I: <strong className="text-slate-200">{sum.ijin}</strong></span>
                  <span>S: <strong className="text-slate-200">{sum.sakit}</strong></span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onNavigateToCalendar(student.id, 'Desember')}
                    className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white transition-colors"
                    title="Buka Kalender Absen"
                  >
                    <Calendar className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => onOpenStudentDetail(student)}
                    className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-colors"
                    title="Detail Siswa"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
