import React, { useState } from 'react';
import { 
  X, 
  Calendar, 
  MessageCircle, 
  GraduationCap, 
  ExternalLink,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { Student, MonthInfo, AttendanceDatabase } from '../types/attendance';
import { 
  calculateStudentSummary, 
  aggregateStudentSummaries, 
  generateWhatsAppMessage 
} from '../utils/attendance';

interface StudentDetailModalProps {
  student: Student | null;
  months: MonthInfo[];
  db: AttendanceDatabase;
  onClose: () => void;
  onNavigateToCalendar: (studentId: string, monthKey: string) => void;
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
  student,
  months,
  db,
  onClose,
  onNavigateToCalendar,
}) => {
  if (!student) return null;

  const [activeMonthKey, setActiveMonthKey] = useState<string>('Desember');

  const currentMonth = months.find(m => m.key === activeMonthKey) || months[2];
  const recordKey = `${student.id}_${currentMonth.key}`;
  const monthRecord = db[recordKey] || {};

  const monthSummary = calculateStudentSummary(monthRecord);
  const overallSummary = aggregateStudentSummaries(student.id, db, months);

  const activePeriodLabel = `Bulan ${currentMonth.nama} ${currentMonth.tahun}`;
  const waUrl = `https://wa.me/?text=${generateWhatsAppMessage(student, monthSummary, activePeriodLabel)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">{student.nama}</h3>
              <p className="text-xs text-slate-500 font-medium">
                {student.kelas} • {student.sekolah}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Tutup Dialog"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Overall Attendance Stat Banner */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
            <div>
              <span className="text-[11px] uppercase tracking-wider font-bold text-slate-500">
                Akumulasi Presensi (Okt 2026 - Feb 2027)
              </span>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-700">
                <span>Hadir: <strong className="text-emerald-700 font-bold">{overallSummary.hadir}</strong></span>
                <span>•</span>
                <span>Ijin: <strong className="text-amber-700 font-bold">{overallSummary.ijin}</strong></span>
                <span>•</span>
                <span>Sakit: <strong className="text-rose-700 font-bold">{overallSummary.sakit}</strong></span>
              </div>
            </div>

            <div className="text-right">
              <span className={`text-2xl font-extrabold ${overallSummary.isWarning ? 'text-rose-600' : 'text-emerald-600'}`}>
                {overallSummary.persentase}%
              </span>
              <div className="text-[10px] text-slate-500 font-medium">persentase kehadiran</div>
            </div>
          </div>

          {/* Month Selector Tabs inside modal */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-blue-600" /> Riwayat Kalender Per Bulan
              </span>
              <button
                onClick={() => {
                  onNavigateToCalendar(student.id, currentMonth.key);
                  onClose();
                }}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>Buka di Editor Absensi</span>
                <ExternalLink className="h-3 w-3" />
              </button>
            </div>

            <div className="grid grid-cols-5 gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
              {months.map(m => (
                <button
                  key={m.key}
                  onClick={() => setActiveMonthKey(m.key)}
                  className={`py-1.5 px-2 text-center rounded-lg text-xs font-bold transition-all ${
                    m.key === activeMonthKey
                      ? 'bg-white text-blue-600 shadow-sm border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {m.nama}
                </button>
              ))}
            </div>
          </div>

          {/* Mini Calendar Visualization */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              <span className="text-rose-600">Min</span>
              <span>Sen</span>
              <span>Sel</span>
              <span>Rab</span>
              <span>Kam</span>
              <span>Jum</span>
              <span>Sab</span>
            </div>

            <div className="grid grid-cols-7 gap-1.5 text-center">
              {/* Blank tiles */}
              {Array.from({ length: currentMonth.hariMulai }).map((_, idx) => (
                <div key={`blank-${idx}`} className="aspect-square opacity-0" />
              ))}

              {/* Month Days */}
              {Array.from({ length: currentMonth.jumlahHari }).map((_, idx) => {
                const day = idx + 1;
                const status = monthRecord[day];
                const isSunday = (currentMonth.hariMulai + day - 1) % 7 === 0;

                let cls = 'bg-slate-50 text-slate-700 border border-slate-200';
                if (status === 'hadir') cls = 'bg-emerald-600 text-white font-bold shadow-sm';
                else if (status === 'ijin') cls = 'bg-amber-500 text-white font-bold shadow-sm';
                else if (status === 'sakit') cls = 'bg-rose-600 text-white font-bold shadow-sm';
                else if (status === 'libur') cls = 'bg-violet-600 text-white font-bold shadow-sm';
                else if (isSunday) cls = 'text-rose-600 bg-rose-50 border-rose-200 font-bold';

                return (
                  <div 
                    key={day}
                    className={`aspect-square rounded-lg flex items-center justify-center text-xs ${cls}`}
                    title={`Tgl ${day} ${currentMonth.nama} (${status || 'Belum diisi'})`}
                  >
                    {day}
                  </div>
                );
              })}
            </div>

            {/* Month Stats bar */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 text-xs font-medium">
              <div className="flex items-center gap-3">
                <span className="text-emerald-700 font-bold">H: {monthSummary.hadir}</span>
                <span className="text-amber-700 font-bold">I: {monthSummary.ijin}</span>
                <span className="text-rose-700 font-bold">S: {monthSummary.sakit}</span>
                <span className="text-violet-700 font-bold">L: {monthSummary.libur}</span>
              </div>
              <div className="font-extrabold text-sm text-right">
                <span className={monthSummary.isWarning ? 'text-rose-600' : 'text-emerald-600'}>
                  {monthSummary.persentase}% Hadir
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 gap-3">
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-sm"
          >
            <MessageCircle className="h-4 w-4" />
            <span>Kirim WhatsApp ke Wali Murid</span>
          </a>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
