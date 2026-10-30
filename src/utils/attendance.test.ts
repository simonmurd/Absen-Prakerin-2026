import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateStudentSummary, filterStudents } from './attendance.ts';
import { Student, AttendanceStatus } from '../types/attendance.ts';

test('calculateStudentSummary: correctly calculates counts, active total and percentage', () => {
  const record: Record<number, AttendanceStatus> = {
    1: 'hadir',
    2: 'hadir',
    3: 'hadir',
    4: 'hadir',
    5: 'ijin',
    6: 'sakit',
    7: 'libur', // Sunday, should not count towards active days
  };

  const summary = calculateStudentSummary(record);
  assert.equal(summary.hadir, 4);
  assert.equal(summary.ijin, 1);
  assert.equal(summary.sakit, 1);
  assert.equal(summary.libur, 1);
  assert.equal(summary.totalAktif, 6);
  // (4 / 6) * 100 = 66.7%
  assert.equal(summary.persentase, 66.7);
  assert.equal(summary.isWarning, true); // < 80%
});

test('calculateStudentSummary: handles 100% presence and empty records gracefully', () => {
  const empty = calculateStudentSummary({});
  assert.equal(empty.persentase, 0);
  assert.equal(empty.isWarning, false);

  const perfectRecord: Record<number, AttendanceStatus> = {
    1: 'hadir',
    2: 'hadir',
    3: 'hadir',
    4: 'hadir',
  };
  const perfect = calculateStudentSummary(perfectRecord);
  assert.equal(perfect.persentase, 100);
  assert.equal(perfect.isWarning, false);
});

test('filterStudents: correctly filters by name keyword and class', () => {
  const sampleStudents: Student[] = [
    { id: '1', nama: '01 ANANDIKHA FITHRA', kelas: 'XII TJK 3', sekolah: 'SMKN 1' },
    { id: '2', nama: '02 AGNES MARGARETTA', kelas: 'XII TJK 3', sekolah: 'SMKN 1' },
    { id: '3', nama: '01 ADE FIMANSYAN', kelas: 'XII TJK 2', sekolah: 'SMKN 1' },
  ];

  const filteredByName = filterStudents(sampleStudents, 'anandikha', 'all');
  assert.equal(filteredByName.length, 1);
  assert.equal(filteredByName[0].nama, '01 ANANDIKHA FITHRA');

  const filteredByClass = filterStudents(sampleStudents, '', 'XII TJK 2');
  assert.equal(filteredByClass.length, 1);
  assert.equal(filteredByClass[0].nama, '01 ADE FIMANSYAN');

  const filteredNone = filterStudents(sampleStudents, 'Unknown', 'all');
  assert.equal(filteredNone.length, 0);
});
