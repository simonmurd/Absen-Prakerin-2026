import { AttendanceStatus, MonthInfo, Student, StudentMonthAttendance, StudentSummary, AttendanceDatabase } from '../types/attendance';

/**
 * Calculates student attendance summary from day records based on standard Indonesian school attendance logic:
 * Total Aktif = Hadir + Ijin + Sakit (Libur is excluded from active schooling days)
 * Persentase = (Hadir / Total Aktif) * 100
 * Peringatan / Warning = Persentase < 80%
 */
export function calculateStudentSummary(record?: StudentMonthAttendance): StudentSummary {
  if (!record || Object.keys(record).length === 0) {
    return {
      hadir: 0,
      ijin: 0,
      sakit: 0,
      libur: 0,
      totalAktif: 0,
      persentase: 0,
      isWarning: false,
    };
  }

  let hadir = 0;
  let ijin = 0;
  let sakit = 0;
  let libur = 0;

  for (const day in record) {
    const status = record[day];
    if (status === 'hadir') hadir++;
    else if (status === 'ijin') ijin++;
    else if (status === 'sakit') sakit++;
    else if (status === 'libur') libur++;
  }

  const totalAktif = hadir + ijin + sakit;
  const persentase = totalAktif > 0 ? Math.round((hadir / totalAktif) * 1000) / 10 : 0;
  const isWarning = totalAktif > 0 && persentase < 80;

  return {
    hadir,
    ijin,
    sakit,
    libur,
    totalAktif,
    persentase,
    isWarning,
  };
}

/**
 * Aggregates attendance summary across multiple months for a given student
 */
export function aggregateStudentSummaries(
  studentId: string,
  db: AttendanceDatabase,
  months: MonthInfo[]
): StudentSummary {
  let hadir = 0;
  let ijin = 0;
  let sakit = 0;
  let libur = 0;

  months.forEach(month => {
    const key = `${studentId}_${month.key}`;
    const record = db[key];
    if (record) {
      const summary = calculateStudentSummary(record);
      hadir += summary.hadir;
      ijin += summary.ijin;
      sakit += summary.sakit;
      libur += summary.libur;
    }
  });

  const totalAktif = hadir + ijin + sakit;
  const persentase = totalAktif > 0 ? Math.round((hadir / totalAktif) * 1000) / 10 : 0;
  const isWarning = totalAktif > 0 && persentase < 80;

  return {
    hadir,
    ijin,
    sakit,
    libur,
    totalAktif,
    persentase,
    isWarning,
  };
}

/**
 * Filter students by search term, class name, and attendance threshold
 */
export function filterStudents(
  students: Student[],
  search: string,
  classFilter: string,
  warningFilter: 'all' | 'warning' | 'safe' = 'all',
  summaries?: Record<string, StudentSummary>
): Student[] {
  const keyword = search.trim().toLowerCase();

  return students.filter(student => {
    // Class filter check
    if (classFilter !== 'all' && student.kelas !== classFilter) {
      return false;
    }

    // Keyword search check
    if (keyword) {
      const matchName = student.nama.toLowerCase().includes(keyword);
      const matchClass = student.kelas.toLowerCase().includes(keyword);
      if (!matchName && !matchClass) {
        return false;
      }
    }

    // Warning threshold filter
    if (warningFilter !== 'all' && summaries) {
      const summary = summaries[student.id];
      if (summary) {
        if (warningFilter === 'warning' && !summary.isWarning) return false;
        if (warningFilter === 'safe' && summary.isWarning) return false;
      }
    }

    return true;
  });
}

/**
 * Generates an official notice message ready for WhatsApp to parents/wali murid
 */
export function generateWhatsAppMessage(
  student: Student,
  summary: StudentSummary,
  periodName: string
): string {
  const statusNote = summary.isWarning
    ? `⚠️ *PERHATIAN:* Tingkat kehadiran Ananda berada di bawah ambang batas minimum 80%. Mohon kerja sama Bapak/Ibu untuk memantau kehadiran Ananda di sekolah.`
    : `✅ Kehadiran Ananda telah memenuhi standar kehadiran sekolah.`;

  return encodeURIComponent(
`Yth. Orang Tua / Wali dari:
*${student.nama}* (${student.kelas})
${student.sekolah}

Berikut adalah rekapitulasi kehadiran siswa periode *${periodName}*:
• Hadir: ${summary.hadir} hari
• Ijin: ${summary.ijin} hari
• Sakit: ${summary.sakit} hari
• Total Hari Aktif: ${summary.totalAktif} hari
• Persentase Kehadiran: *${summary.persentase}%*

${statusNote}

Terima kasih atas perhatian dan kerja samanya.
_Wali Kelas & Guru BK ${student.sekolah}_`
  );
}

/**
 * Generate CSV data string for export
 */
export function exportToCsvString(
  students: Student[],
  summaries: Record<string, StudentSummary>,
  periodName: string
): string {
  const headers = ['No', 'Sekolah', 'Kelas', 'Nama Siswa', 'Hadir', 'Ijin', 'Sakit', 'Total Hari Efektif', 'Persentase Kehadiran (%)', 'Status'];
  
  const rows = students.map((s, idx) => {
    const sum = summaries[s.id] || { hadir: 0, ijin: 0, sakit: 0, totalAktif: 0, persentase: 0, isWarning: false };
    const statusText = sum.isWarning ? 'Perlu Perhatian (<80%)' : 'Aman';
    return [
      idx + 1,
      `"${s.sekolah}"`,
      `"${s.kelas}"`,
      `"${s.nama}"`,
      sum.hadir,
      sum.ijin,
      sum.sakit,
      sum.totalAktif,
      sum.persentase,
      `"${statusText}"`
    ].join(',');
  });

  return [
    `Rekapitulasi Kehadiran Siswa - Periode ${periodName}`,
    headers.join(','),
    ...rows
  ].join('\r\n');
}
