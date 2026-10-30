import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  GraduationCap, 
  Calendar, 
  ExternalLink,
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Data Siswa &amp; Direktori Kelas
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              SMK Negeri 1 Singkawang • Kompetensi Keahlian Teknik Jaringan Komputer (XII TJK)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3.5 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700">
            Total {students.length} Siswa Terdaftar
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari siswa atau nomor absen..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs sm:text-sm font-medium focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
          />
        </div>

        {/* Class Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 border border-slate-200 w-full sm:w-auto overflow-x-auto">
          {['all', 'XII TJK 1', 'XII TJK 2', 'XII TJK 3'].map((cls) => {
            const isActive = selectedClass === cls;
            const label = cls === 'all' ? 'Semua Kelas' : cls;
            return (
              <button
                key={cls}
                onClick={() => setSelectedClass(cls)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-white text-blue-600 shadow-sm border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
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
              className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all flex flex-col justify-between group shadow-sm"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-[11px] font-bold text-slate-700 border border-slate-200">
                    {student.kelas}
                  </span>
                  <span className={`text-xs font-extrabold px-2 py-0.5 rounded-md ${
                    sum.isWarning 
                      ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}>
                    {sum.persentase}% Hadir
                  </span>
                </div>

                <h3 
                  onClick={() => onOpenStudentDetail(student)}
                  className="font-bold text-slate-900 text-sm group-hover:text-blue-600 cursor-pointer transition-colors"
                >
                  {student.nama}
                </h3>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5 flex items-center gap-1">
                  <School className="h-3 w-3" /> {student.sekolah}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-medium">
                <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                  <span>H: <strong className="text-slate-800">{sum.hadir}</strong></span>
                  <span>I: <strong className="text-slate-800">{sum.ijin}</strong></span>
                  <span>S: <strong className="text-slate-800">{sum.sakit}</strong></span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onNavigateToCalendar(student.id, 'Desember')}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                    title="Buka Kalender Absen"
                  >
                    <Calendar className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => onOpenStudentDetail(student)}
                    className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors cursor-pointer"
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
