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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div 
        className="w-full max-w-2xl bg-[#0e1424] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{student.nama}</h3>
              <p className="text-xs text-slate-400">
                {student.kelas} • {student.sekolah}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Tutup Dialog"
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Overall Attendance Stat Banner */}
          <div className="p-4 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-between gap-4">
            <div>
              <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                Akumulasi Presensi (Okt 2026 - Feb 2027)
              </span>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-300">
                <span>Hadir: <strong className="text-[#00ff9d]">{overallSummary.hadir}</strong></span>
                <span>•</span>
                <span>Ijin: <strong className="text-[#ffcc00]">{overallSummary.ijin}</strong></span>
                <span>•</span>
                <span>Sakit: <strong className="text-[#ff0055]">{overallSummary.sakit}</strong></span>
              </div>
            </div>

            <div className="text-right">
              <span className={`text-2xl font-extrabold ${overallSummary.isWarning ? 'text-[#ff0055]' : 'text-[#00ff9d]'}`}>
                {overallSummary.persentase}%
              </span>
              <div className="text-[10px] text-slate-500">rata-rata hadir</div>
            </div>
          </div>

          {/* Month Selector Tabs inside modal */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-blue-400" /> Riwayat Kalender Per Bulan
              </span>
              <button
                onClick={() => {
                  onNavigateToCalendar(student.id, currentMonth.key);
                  onClose();
                }}
                className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
              >
                <span>Buka di Editor Absensi</span>
                <ExternalLink className="h-3 w-3" />
              </button>
            </div>

            <div className="grid grid-cols-5 gap-1 p-1 bg-black/40 rounded-xl border border-white/5">
              {months.map(m => (
                <button
                  key={m.key}
                  onClick={() => setActiveMonthKey(m.key)}
                  className={`py-1.5 px-2 text-center rounded-lg text-xs font-bold transition-all ${
                    m.key === activeMonthKey
                      ? 'bg-blue-600/30 text-white border border-blue-500/50 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {m.nama}
                </button>
              ))}
            </div>
          </div>

          {/* Mini Calendar Visualization */}
          <div className="p-4 rounded-2xl bg-black/30 border border-white/5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              <span className="text-[#ff4d4d]">Min</span>
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

                let cls = 'bg-white/[0.02] text-slate-400 border border-white/5';
                if (status === 'hadir') cls = 'bg-[#00ff9d] text-black font-bold shadow-sm';
                else if (status === 'ijin') cls = 'bg-[#ffcc00] text-black font-bold shadow-sm';
                else if (status === 'sakit') cls = 'bg-[#ff0055] text-white font-bold shadow-sm';
                else if (status === 'libur') cls = 'bg-[#a855f7] text-white font-bold shadow-sm';
                else if (isSunday) cls = 'text-[#ff4d4d] bg-red-500/[0.04] border-red-500/20';

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
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5 text-xs">
              <div className="flex items-center gap-3">
                <span className="text-[#00ff9d] font-bold">H: {monthSummary.hadir}</span>
                <span className="text-[#ffcc00] font-bold">I: {monthSummary.ijin}</span>
                <span className="text-[#ff0055] font-bold">S: {monthSummary.sakit}</span>
                <span className="text-[#a855f7] font-bold">L: {monthSummary.libur}</span>
              </div>
              <div className="font-extrabold text-sm text-right">
                <span className={monthSummary.isWarning ? 'text-[#ff0055]' : 'text-[#00ff9d]'}>
                  {monthSummary.persentase}% Hadir
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-white/10 flex items-center justify-between bg-white/[0.02] gap-3">
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-[#00ff9d] border border-emerald-500/30 text-xs font-bold flex items-center gap-2 transition-all"
          >
            <MessageCircle className="h-4 w-4" />
            <span>Kirim Pesan WhatsApp ke Wali Murid</span>
          </a>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-bold transition-colors"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
