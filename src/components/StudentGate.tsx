import React, { useState, useMemo } from 'react';
import { GraduationCap, User, ArrowRight, ShieldCheck, CheckCircle2, Search, BookOpen } from 'lucide-react';
import { Student, GasStudentRekap } from '../types/attendance';
import { CLASSES } from '../data/students';

interface StudentGateProps {
  students: Student[];
  onSelectStudent: (studentId: string) => void;
  onOpenAdminLogin: () => void;
  gasData?: GasStudentRekap[];
}

export const StudentGate: React.FC<StudentGateProps> = ({
  students,
  onSelectStudent,
  onOpenAdminLogin,
  gasData = [],
}) => {
  const [selectedClass, setSelectedClass] = useState<string>('XII TJK 1');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [chosenStudentId, setChosenStudentId] = useState<string>('');

  // Filter students based on chosen class & search
  const classStudents = useMemo(() => {
    return students.filter(s => s.kelas === selectedClass);
  }, [students, selectedClass]);

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return classStudents;
    const q = searchQuery.toLowerCase();
    return classStudents.filter(s => s.nama.toLowerCase().includes(q));
  }, [classStudents, searchQuery]);

  const activeStudent = useMemo(() => {
    return students.find(s => s.id === chosenStudentId) || null;
  }, [students, chosenStudentId]);

  // Lookup GAS summary
  const studentGas = useMemo(() => {
    if (!activeStudent || !gasData.length) return null;
    const clean = activeStudent.nama.trim().toLowerCase();
    return gasData.find(g => g.nama.trim().toLowerCase() === clean) || null;
  }, [activeStudent, gasData]);

  const handleProceed = () => {
    if (chosenStudentId) {
      onSelectStudent(chosenStudentId);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-3xl shadow-xl shadow-slate-200/50 p-6 sm:p-10 relative overflow-hidden">
        
        {/* Subtle accent bar on top */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500"></div>

        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 mb-4 shadow-sm">
            <GraduationCap className="h-7 w-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Portal Presensi Siswa
          </h1>
          <p className="text-sm text-slate-600 mt-1 font-medium">
            SMK Negeri 1 Singkawang • Teknik Jaringan Komputer
          </p>
          <div className="inline-block mt-3 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
            Silakan pilih nama Anda sebelum mengisi absensi
          </div>
        </div>

        {/* Step 1: Pilih Kelas */}
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              1. Pilih Rombongan Belajar (Kelas)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {CLASSES.map((cls) => {
                const isActive = selectedClass === cls;
                return (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => {
                      setSelectedClass(cls);
                      setChosenStudentId('');
                    }}
                    className={`py-2.5 px-2 rounded-xl text-xs sm:text-sm font-bold transition-all border ${
                      isActive
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    {cls}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Cari & Pilih Siswa */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="studentSelect" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                2. Pilih Nama Siswa ({filteredStudents.length} siswa)
              </label>
            </div>

            {/* Search Box */}
            <div className="relative mb-2">
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ketik nama siswa untuk mencari..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs sm:text-sm focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
              />
            </div>

            {/* Select Box */}
            <select
              id="studentSelect"
              value={chosenStudentId}
              onChange={(e) => setChosenStudentId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 shadow-sm cursor-pointer"
            >
              <option value="">-- Klik untuk memilih nama Anda --</option>
              {filteredStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nama}
                </option>
              ))}
            </select>
          </div>

          {/* Student Status Preview (if chosen) */}
          {activeStudent && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-slate-900">{activeStudent.nama}</div>
                  <div className="text-xs text-slate-500">{activeStudent.kelas} • {activeStudent.sekolah}</div>
                </div>
                <span className="h-7 w-7 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
              </div>

              {studentGas && (
                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-600">
                  <span className="text-[11px]">Rekap Google Sheet:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-emerald-700">{studentGas.hadir} Hadir</span>
                    <span>•</span>
                    <span className="font-semibold text-amber-700">{studentGas.ijin} Ijin</span>
                    <span>•</span>
                    <span className="font-semibold text-rose-700">{studentGas.sakit} Sakit</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Button */}
          <button
            type="button"
            onClick={handleProceed}
            disabled={!chosenStudentId}
            className="w-full py-3.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-sm tracking-wide transition-all shadow-lg shadow-blue-600/20 disabled:shadow-none flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          >
            <span>Lanjut ke Kalender Presensi</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {/* Footer: Admin Login */}
        <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5 text-slate-400" />
            Fokus pengisian absensi harian
          </span>
          <button
            type="button"
            onClick={onOpenAdminLogin}
            className="font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Login Guru/Admin (PIN)</span>
          </button>
        </div>

      </div>
    </div>
  );
};
