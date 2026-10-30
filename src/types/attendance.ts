export type AttendanceStatus = 'hadir' | 'ijin' | 'sakit' | 'libur';

export interface Student {
  id: string;
  sekolah: string;
  kelas: string;
  nama: string;
}

export interface MonthInfo {
  key: string;
  nama: string;
  tahun: number;
  jumlahHari: number;
  hariMulai: number; // 0 = Minggu, 1 = Senin, ... 6 = Sabtu
}

export type StudentMonthAttendance = Record<number, AttendanceStatus>;

// Record key: `${studentId}_${monthKey}` -> { 1: 'hadir', 2: 'hadir', ... }
export type AttendanceDatabase = Record<string, StudentMonthAttendance>;

export interface StudentSummary {
  hadir: number;
  ijin: number;
  sakit: number;
  libur: number;
  totalAktif: number;
  persentase: number;
  isWarning: boolean;
}

export interface GasStudentRekap {
  nama: string;
  kelas: string;
  hadir: number;
  ijin: number;
  sakit: number;
}
