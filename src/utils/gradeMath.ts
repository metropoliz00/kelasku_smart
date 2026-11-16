import { GradeRecord, Student, Subject } from '../types';

export type GradeFieldKey = 'sum_1' | 'sum_2' | 'sum_3' | 'sum_4' | 'sas';

export const GRADE_FIELDS: { key: GradeFieldKey; label: string }[] = [
  { key: 'sum_1', label: 'SUM 1' },
  { key: 'sum_2', label: 'SUM 2' },
  { key: 'sum_3', label: 'SUM 3' },
  { key: 'sum_4', label: 'SUM 4' },
  { key: 'sas', label: 'SAS' },
];

/**
 * Memvalidasi nilai 0 sampai 100.
 * Nilai kosong ('', null, undefined) dianggap BELUM DIISI (bukan 0).
 */
export function parseValidGrade(raw: string | number | null | undefined): number | null {
  if (raw === '' || raw === null || raw === undefined) return null;
  const trimmed = typeof raw === 'string' ? raw.trim() : raw;
  if (trimmed === '') return null;
  const num = Number(trimmed);
  if (Number.isNaN(num) || !Number.isFinite(num)) return null;
  if (num < 0 || num > 100) return null;
  return Math.round(num * 100) / 100;
}

export function isGradeInputValid(raw: string | number | null | undefined): boolean {
  if (raw === '' || raw === null || raw === undefined) return true;
  if (typeof raw === 'string' && raw.trim() === '') return true;
  const num = Number(raw);
  return !Number.isNaN(num) && Number.isFinite(num) && num >= 0 && num <= 100;
}

/**
 * Menghitung rata-rata dan jumlah komponen yang terisi secara transparan.
 * Rumus: Jumlah seluruh nilai yang terisi / jumlah komponen nilai yang terisi.
 * Nilai kosong TIDAK dihitung sebagai 0.
 */
export function computeSubjectGradeStats(
  values: Partial<Record<GradeFieldKey, string | number | null | undefined>>
): { rata_rata: number | null; jumlah_komponen: number; total_skor: number } {
  const validValues: number[] = [];
  for (const field of GRADE_FIELDS) {
    const parsed = parseValidGrade(values[field.key]);
    if (parsed !== null) {
      validValues.push(parsed);
    }
  }
  const count = validValues.length;
  if (count === 0) {
    return { rata_rata: null, jumlah_komponen: 0, total_skor: 0 };
  }
  const total = validValues.reduce((acc, v) => acc + v, 0);
  const avg = Math.round((total / count) * 100) / 100;
  return { rata_rata: avg, jumlah_komponen: count, total_skor: total };
}

export interface StudentOverallRecapRow {
  id_siswa: string;
  nis: string;
  nama_lengkap: string;
  nama_kelas: string;
  subjectAverages: Record<string, number | null>;
  overallAverage: number | null;
  filledSubjectCount: number;
  rank: number | null;
}

/**
 * Menghitung rekap nilai seluruh mata pelajaran secara dinamis.
 * Nilai kosong pada suatu mata pelajaran tidak dihitung sebagai 0.
 */
export function computeOverallGradeRecap(
  students: Student[],
  subjects: Subject[],
  grades: GradeRecord[],
  enableRanking: boolean
): StudentOverallRecapRow[] {
  const activeSubjects = subjects.filter((s) => s.status_aktif === 'Aktif');
  const rows: StudentOverallRecapRow[] = students.map((student) => {
    const subjectAverages: Record<string, number | null> = {};
    const validSubjectScores: number[] = [];

    for (const subject of activeSubjects) {
      const record = grades.find(
        (g) => g.id_siswa === student.id_siswa && g.id_mapel === subject.id_mapel
      );
      if (record) {
        const stats = computeSubjectGradeStats(record);
        subjectAverages[subject.id_mapel] = stats.rata_rata;
        if (stats.rata_rata !== null) {
          validSubjectScores.push(stats.rata_rata);
        }
      } else {
        subjectAverages[subject.id_mapel] = null;
      }
    }

    const overallAverage =
      validSubjectScores.length > 0
        ? Math.round(
            (validSubjectScores.reduce((sum, val) => sum + val, 0) / validSubjectScores.length) *
              100
          ) / 100
        : null;

    return {
      id_siswa: student.id_siswa,
      nis: student.nis,
      nama_lengkap: student.nama_lengkap,
      nama_kelas: student.nama_kelas,
      subjectAverages,
      overallAverage,
      filledSubjectCount: validSubjectScores.length,
      rank: null,
    };
  });

  if (enableRanking) {
    const ranked = [...rows]
      .filter((r) => r.overallAverage !== null)
      .sort((a, b) => (b.overallAverage ?? 0) - (a.overallAverage ?? 0));
    ranked.forEach((item, idx) => {
      const target = rows.find((r) => r.id_siswa === item.id_siswa);
      if (target) {
        target.rank = idx + 1;
      }
    });
  }

  return rows;
}

export function formatGradeDisplay(val: number | string | null | undefined): string {
  const parsed = parseValidGrade(val);
  if (parsed === null) return '-';
  return Number.isInteger(parsed) ? String(parsed) : parsed.toFixed(2);
}
