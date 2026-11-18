import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Edit3,
  FileSpreadsheet,
  GraduationCap,
  LayoutGrid,
  List,
  Plus,
  Printer,
  RefreshCw,
  Save,
  Search,
  Trash2,
  Upload,
  User,
} from 'lucide-react';
import { callApi } from '../services/api';
import {
  AcademicYear,
  AttendanceRecord,
  AttendanceStatus,
  AuthUser,
  ClassRoom,
  GradeRecord,
  ScheduleItem,
  SchoolIdentity,
  Student,
  Subject,
  Teacher,
  TeacherJournal,
  isPaiOrPjok,
  isKepalaSekolah,
  isNonTeachingPersonnel,
  isNonWaliTeacher,
  findMatchingClassForSubject,
} from '../types';
import {
  ConfirmDialog,
  EmptyState,
  ExcelImportModal,
  Modal,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  StatusText,
  TableSkeleton,
} from '../components/UI';
import { ExcelColumnSpec, exportRowsToExcel } from '../utils/excel';
import type { RowInput } from 'jspdf-autotable';
import { generatePdfReport } from '../utils/pdf';
import {
  computeOverallGradeRecap,
  computeSubjectGradeStats,
  formatGradeDisplay,
  GRADE_FIELDS,
  GradeFieldKey,
  isGradeInputValid,
  parseValidGrade,
} from '../utils/gradeMath';

type ToastFn = (type: 'success' | 'error' | 'warning' | 'info', title: string, message?: string) => void;

function findLoggedTeacher(teachers: Teacher[], user: AuthUser): Teacher | undefined {
  const relId = (user.relasi_id || '').trim();
  const uname = (user.username || '').trim().toLowerCase();
  const relNama = (user.relasi_nama || '').trim().toLowerCase();
  return teachers.find(
    (t) =>
      (relId && t.id_guru === relId) ||
      (uname && (t.username || '').trim().toLowerCase() === uname) ||
      (uname && (t.nip || '').trim().toLowerCase() === uname) ||
      (relNama && (t.nama_guru || '').trim().toLowerCase() === relNama)
  );
}

function findMatchingSubjectForTeacher(
  teacher: Teacher | undefined,
  subjects: Subject[]
): Subject | undefined {
  if (!teacher || subjects.length === 0) return undefined;
  const mapelText = `${teacher.mata_pelajaran || ''} ${teacher.jabatan || ''}`.trim().toLowerCase();
  if (!mapelText) return undefined;

  const exact = subjects.find((m) => {
    const nama = (m.nama_mapel || '').trim().toLowerCase();
    const kode = (m.kode_mapel || '').trim().toLowerCase();
    return (
      (nama && mapelText.includes(nama)) ||
      (kode && new RegExp(`\\b${kode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(mapelText))
    );
  });
  if (exact) return exact;

  if (/pai\b|pendidikan agama|agama islam|\bagama\b/.test(mapelText)) {
    return subjects.find((m) => /pai\b|agama|pendidikan agama/i.test(`${m.kode_mapel} ${m.nama_mapel}`));
  }
  if (/pjok\b|penjas|penjaskes|olahraga|pendidikan jasmani/.test(mapelText)) {
    return subjects.find((m) => /pjok\b|penjas|olahraga|jasmani/i.test(`${m.kode_mapel} ${m.nama_mapel}`));
  }
  return undefined;
}

function getTodayLocalYmd(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getCurrentLocalYm(): string {
  return getTodayLocalYmd().slice(0, 7);
}

function normalizeRecordDateYmd(val?: string | number): string {
  if (typeof val === 'number' && !Number.isNaN(val) && val > 20000 && val < 80000) {
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  }
  const s = String(val ?? '').trim();
  if (!s) return '';
  if (/^\d{4}-\d{1,2}-\d{1,2}T.*(?:Z|[+-]\d{2}:?\d{2})$/i.test(s)) {
    const instant = new Date(s);
    if (!Number.isNaN(instant.getTime())) {
      const yyyy = instant.getFullYear();
      const mm = String(instant.getMonth() + 1).padStart(2, '0');
      const dd = String(instant.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
  }
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;
  }
  const dmy = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    const p1 = Number(dmy[1]);
    const p2 = Number(dmy[2]);
    const day = p2 > 12 && p1 <= 12 ? p2 : p1;
    const month = p2 > 12 && p1 <= 12 ? p1 : p2;
    return `${dmy[3]}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  if (/^\d{5}(\.\d+)?$/.test(s)) {
    const numVal = Number(s);
    if (numVal > 20000 && numVal < 80000) {
      const d = new Date(Math.round((numVal - 25569) * 86400 * 1000));
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    }
  }
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) {
    const yyyy = parsed.getFullYear();
    const mm = String(parsed.getMonth() + 1).padStart(2, '0');
    const dd = String(parsed.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  return s;
}

function normalizeAttStatus(val?: string): AttendanceStatus {
  const raw = String(val || '').trim().toLowerCase();
  if (raw === 'sakit' || raw === 's') return 'Sakit';
  if (raw === 'izin' || raw === 'i') return 'Izin';
  if (raw === 'alpa' || raw === 'alfa' || raw === 'alpha' || raw === 'a') return 'Alpha';
  if (raw === 'terlambat' || raw === 'telat' || raw === 't') return 'Hadir';
  return 'Hadir';
}

// ============================================================================
// 1. JADWAL PELAJARAN & KEGIATAN SEKOLAH (NON-PELAJARAN)
// ============================================================================

export interface SchoolActivityOption {
  id: string;
  name: string;
  defaultJamKe: string;
  defaultMulai: string;
  defaultSelesai: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  icon: string;
  defaultGuru: string;
}

export const NON_LESSON_ACTIVITIES: SchoolActivityOption[] = [
  {
    id: 'KEG-UPACARA',
    name: 'Upacara',
    defaultJamKe: '1',
    defaultMulai: '07:00',
    defaultSelesai: '07:45',
    badgeBg: 'bg-rose-50',
    badgeText: 'text-rose-700',
    badgeBorder: 'border-rose-200',
    icon: '🇮🇩',
    defaultGuru: 'Semua Guru / Pembina Upacara',
  },
  {
    id: 'KEG-PEMBIASAAN',
    name: 'Pembiasaan',
    defaultJamKe: '0',
    defaultMulai: '06:45',
    defaultSelesai: '07:15',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-800',
    badgeBorder: 'border-amber-200',
    icon: '🤲',
    defaultGuru: 'Wali Kelas / Guru Piket',
  },
  {
    id: 'KEG-LITNUM',
    name: 'Literasi-Numerasi',
    defaultJamKe: '1',
    defaultMulai: '07:00',
    defaultSelesai: '07:35',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    badgeBorder: 'border-emerald-200',
    icon: '📚',
    defaultGuru: 'Wali Kelas / Guru Pendamping',
  },
  {
    id: 'KEG-KOKURIKULER',
    name: 'Kokurikuler',
    defaultJamKe: '5',
    defaultMulai: '10:15',
    defaultSelesai: '11:45',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-700',
    badgeBorder: 'border-purple-200',
    icon: '🌟',
    defaultGuru: 'Tim Fasilitator P5 / Kokurikuler',
  },
  {
    id: 'KEG-SENAM',
    name: 'Senam Pagi',
    defaultJamKe: '1',
    defaultMulai: '07:00',
    defaultSelesai: '07:45',
    badgeBg: 'bg-cyan-50',
    badgeText: 'text-cyan-800',
    badgeBorder: 'border-cyan-200',
    icon: '🏃',
    defaultGuru: 'Guru PJOK / Semua Guru',
  },
  {
    id: 'KEG-ISTIRAHAT',
    name: 'Istirahat',
    defaultJamKe: '4',
    defaultMulai: '09:20',
    defaultSelesai: '09:40',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-700',
    badgeBorder: 'border-slate-200',
    icon: '☕',
    defaultGuru: 'Guru Piket',
  },
];

export function getNonLessonActivityInfo(mapelOrId?: string): SchoolActivityOption | undefined {
  if (!mapelOrId) return undefined;
  const target = mapelOrId.trim().toLowerCase();
  return NON_LESSON_ACTIVITIES.find(
    (act) =>
      act.id.toLowerCase() === target ||
      act.name.toLowerCase() === target ||
      target.includes(act.name.toLowerCase())
  );
}

export function getDefaultScheduleTimeSlot(jamKe?: string, isEnd = false): string {
  const num = parseInt(jamKe || '1', 10);
  const slots: Record<number, [string, string]> = {
    0: ['06:45', '07:15'],
    1: ['07:00', '07:45'],
    2: ['07:45', '08:30'],
    3: ['08:30', '09:15'],
    4: ['09:15', '10:00'],
    5: ['10:15', '11:00'],
    6: ['11:00', '11:45'],
    7: ['11:45', '12:30'],
    8: ['12:30', '13:15'],
    9: ['13:15', '14:00'],
  };
  const slot = slots[num] || ['07:00', '07:45'];
  return isEnd ? slot[1] : slot[0];
}

export function cleanScheduleTimeSlot(val?: string, jamKe?: string, isEnd = false): string {
  const raw = String(val ?? '').trim();
  if (!raw || raw.includes('1899-12-30')) {
    return getDefaultScheduleTimeSlot(jamKe, isEnd);
  }
  if (/^\d{1,2}:\d{2}$/.test(raw)) {
    const [h, m] = raw.split(':');
    return `${h.padStart(2, '0')}:${m}`;
  }
  if (/^\d{1,2}:\d{2}:\d{2}$/.test(raw)) {
    const [h, m] = raw.split(':');
    return `${h.padStart(2, '0')}:${m}`;
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(raw)) {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) {
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      return `${hh}:${mm}`;
    }
  }
  const match = raw.match(/^(\d{1,2}):(\d{2})/);
  if (match) {
    return `${match[1].padStart(2, '0')}:${match[2]}`;
  }
  return getDefaultScheduleTimeSlot(jamKe, isEnd);
}

export function formatScheduleTimeDisplay(
  waktuMulai?: string,
  waktuSelesai?: string,
  jamKe?: string
): string {
  const mulai = cleanScheduleTimeSlot(waktuMulai, jamKe, false);
  const selesai = cleanScheduleTimeSlot(waktuSelesai, jamKe, true);
  if (mulai && selesai) {
    return `${mulai} - ${selesai} WIB`;
  }
  if (mulai) {
    return `${mulai} WIB`;
  }
  return 'WIB';
}

const DAYS: ScheduleItem['hari'][] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export function JadwalModule({
  user,
  school,
  onToast,
}: {
  user: AuthUser;
  school: SchoolIdentity;
  onToast: ToastFn;
}) {
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);

  const [viewMode, setViewMode] = useState<'board' | 'table'>('board');
  const [filterClass, setFilterClass] = useState('');
  const [filterDay, setFilterDay] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ScheduleItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ScheduleItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<ScheduleItem>>({ hari: 'Senin', semester: 'Ganjil' });

  const canEdit = user.role === 'ADMIN';

  const loadData = async () => {
    setLoading(true);
    const [jRes, cRes, sRes, tRes, yRes] = await Promise.all([
      callApi<ScheduleItem[]>('getSchedules'),
      callApi<ClassRoom[]>('getClasses'),
      callApi<Subject[]>('getSubjects'),
      user.role !== 'ORANG_TUA'
        ? callApi<Teacher[]>('getTeachers')
        : Promise.resolve({ success: true, message: 'OK', data: [] as Teacher[] }),
      callApi<AcademicYear[]>('getAcademicYears'),
    ]);
    setLoading(false);
    if (jRes.success && jRes.data) setSchedules(jRes.data);
    else if (!jRes.success) onToast('error', 'Gagal memuat jadwal', jRes.message);
    if (cRes.success && cRes.data) setClasses(cRes.data);
    else if (!cRes.success) onToast('error', 'Gagal memuat kelas', cRes.message);
    if (sRes.success && sRes.data) setSubjects(sRes.data);
    else if (!sRes.success) onToast('error', 'Gagal memuat mata pelajaran', sRes.message);
    if (tRes.success && tRes.data) setTeachers(tRes.data);
    if (yRes.success && yRes.data) setYears(yRes.data);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Helper deteksi otomatis Guru Pengampu berdasarkan Kelas & Mata Pelajaran
  const detectTeacherForSelection = (kelasId: string, mapelId: string): Teacher | undefined => {
    if (teachers.length === 0) return undefined;
    const cls = classes.find((c) => c.id_kelas === kelasId);
    const sub = subjects.find((s) => s.id_mapel === mapelId);
    const subLabel = `${sub?.kode_mapel || ''} ${sub?.nama_mapel || ''}`.trim().toLowerCase();

    // 1. Jika mapel PAI -> cari guru PAI
    if (/\bpai\b|agama/i.test(subLabel)) {
      const paiTeacher = teachers.find((t) => {
        const text = `${t.mata_pelajaran || ''} ${t.jabatan || ''}`.toLowerCase();
        return /\bpai\b|agama/i.test(text);
      });
      if (paiTeacher) return paiTeacher;
    }

    // 2. Jika mapel PJOK -> cari guru PJOK
    if (/\bpjok\b|penjas|olahraga|jasmani/i.test(subLabel)) {
      const pjokTeacher = teachers.find((t) => {
        const text = `${t.mata_pelajaran || ''} ${t.jabatan || ''}`.toLowerCase();
        return /\bpjok\b|penjas|olahraga|jasmani/i.test(text);
      });
      if (pjokTeacher) return pjokTeacher;
    }

    // 3. Jika guru mengampu mapel spesifik yang cocok (selain Kepala Sekolah)
    if (sub) {
      const subName = (sub.nama_mapel || '').trim().toLowerCase();
      const subKode = (sub.kode_mapel || '').trim().toLowerCase();
      const subjectMatchedTeacher = teachers.find((t) => {
        if (isKepalaSekolah(t.mata_pelajaran, t.jabatan)) return false;
        const tMapel = (t.mata_pelajaran || '').trim().toLowerCase();
        const sameClass =
          !kelasId ||
          t.id_kelas === kelasId ||
          t.wali_kelas_id === kelasId ||
          t.id_kelas === 'SEMUA_KELAS' ||
          (!t.id_kelas && !t.wali_kelas_id);
        return (
          sameClass &&
          ((subName && tMapel.includes(subName)) ||
            (subKode && new RegExp(`\\b${subKode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(tMapel)))
        );
      });
      if (subjectMatchedTeacher) return subjectMatchedTeacher;
    }

    // 4. Deteksi Wali Kelas / Guru Kelas yang mengampu kelas terpilih
    if (cls) {
      const classTeacher =
        teachers.find((t) => cls.wali_kelas_id && t.id_guru === cls.wali_kelas_id) ||
        teachers.find(
          (t) =>
            !isNonWaliTeacher(t.mata_pelajaran, t.jabatan) &&
            (t.id_kelas === cls.id_kelas ||
              t.wali_kelas_id === cls.id_kelas ||
              (cls.nama_kelas &&
                (t.wali_kelas || '').trim().toLowerCase() === cls.nama_kelas.trim().toLowerCase()))
        ) ||
        teachers.find((t) => {
          if (isNonWaliTeacher(t.mata_pelajaran, t.jabatan)) return false;
          const inferredCls = findMatchingClassForSubject(t.mata_pelajaran, t.jabatan, classes);
          return inferredCls?.id_kelas === cls.id_kelas;
        });
      if (classTeacher) return classTeacher;
    }

    return undefined;
  };

  const openAddScheduleModal = (dayName: ScheduleItem['hari'] = 'Senin', jamKe = '1') => {
    const initialClassId = filterClass || classes[0]?.id_kelas || '';
    const initialClass = classes.find((c) => c.id_kelas === initialClassId);
    const initialSubject = subjects.find((s) => s.status_aktif !== 'Nonaktif') || subjects[0];
    const initialSubjectId = initialSubject?.id_mapel || '';
    const initialTeacher = detectTeacherForSelection(initialClassId, initialSubjectId) || teachers[0];

    const initialJamKe = jamKe || '1';
    setEditing(null);
    setForm({
      id_tahun_ajaran: school.tahun_ajaran_aktif_id || years[0]?.id_tahun_ajaran || '',
      semester: school.semester_aktif || 'Ganjil',
      hari: dayName,
      jam_ke: initialJamKe,
      waktu_mulai: getDefaultScheduleTimeSlot(initialJamKe, false),
      waktu_selesai: getDefaultScheduleTimeSlot(initialJamKe, true),
      id_kelas: initialClassId,
      nama_kelas: initialClass?.nama_kelas || '',
      id_mapel: initialSubjectId,
      nama_mapel: initialSubject?.nama_mapel || '',
      id_guru: initialTeacher?.id_guru || '',
      nama_guru: initialTeacher?.nama_guru || '',
    });
    setFormOpen(true);
  };

  const handleFormClassChange = (kelasId: string) => {
    const cls = classes.find((c) => c.id_kelas === kelasId);
    const detectedTeacher = detectTeacherForSelection(kelasId, form.id_mapel || '');
    setForm((prev) => ({
      ...prev,
      id_kelas: kelasId,
      nama_kelas: cls?.nama_kelas || '',
      id_guru: detectedTeacher?.id_guru || prev.id_guru || '',
      nama_guru: detectedTeacher?.nama_guru || prev.nama_guru || '',
    }));
  };

  const handleFormSubjectChange = (mapelId: string) => {
    const act = getNonLessonActivityInfo(mapelId);
    if (act) {
      const cls = classes.find((c) => c.id_kelas === form.id_kelas);
      const defaultTeacher =
        act.id === 'KEG-PEMBIASAAN' || act.id === 'KEG-LITNUM'
          ? cls?.wali_kelas || act.defaultGuru
          : act.defaultGuru;
      setForm((prev) => ({
        ...prev,
        id_mapel: act.id,
        nama_mapel: act.name,
        jam_ke: prev.jam_ke || act.defaultJamKe,
        waktu_mulai: act.defaultMulai,
        waktu_selesai: act.defaultSelesai,
        id_guru: prev.id_guru || act.id,
        nama_guru: prev.nama_guru || defaultTeacher,
      }));
      return;
    }

    const sub = subjects.find((s) => s.id_mapel === mapelId);
    const detectedTeacher = detectTeacherForSelection(form.id_kelas || '', mapelId);
    setForm((prev) => ({
      ...prev,
      id_mapel: mapelId,
      nama_mapel: sub?.nama_mapel || '',
      id_guru: detectedTeacher?.id_guru || prev.id_guru || '',
      nama_guru: detectedTeacher?.nama_guru || prev.nama_guru || '',
    }));
  };

  const handleFormTeacherChange = (guruId: string) => {
    if (guruId === 'GURU-SEMUA') {
      setForm((prev) => ({ ...prev, id_guru: 'GURU-SEMUA', nama_guru: 'Semua Guru / Pembina' }));
      return;
    }
    if (guruId === 'GURU-WALI') {
      const cls = classes.find((c) => c.id_kelas === form.id_kelas);
      setForm((prev) => ({
        ...prev,
        id_guru: cls?.wali_kelas_id || 'GURU-WALI',
        nama_guru: cls?.wali_kelas ? `Wali Kelas (${cls.wali_kelas})` : 'Wali Kelas',
      }));
      return;
    }
    if (guruId === 'GURU-PIKET') {
      setForm((prev) => ({ ...prev, id_guru: 'GURU-PIKET', nama_guru: 'Guru Piket' }));
      return;
    }

    const tch = teachers.find((t) => t.id_guru === guruId);
    if (!tch) {
      setForm((prev) => ({ ...prev, id_guru: guruId, nama_guru: '' }));
      return;
    }
    const isSpecial = isNonWaliTeacher(tch.mata_pelajaran, tch.jabatan);
    const matchedSub = findMatchingSubjectForTeacher(tch, subjects);
    const matchedCls = !isSpecial
      ? classes.find(
          (c) =>
            c.id_kelas === tch.wali_kelas_id ||
            c.id_kelas === tch.id_kelas ||
            c.wali_kelas_id === tch.id_guru
        ) || findMatchingClassForSubject(tch.mata_pelajaran, tch.jabatan, classes)
      : undefined;

    setForm((prev) => ({
      ...prev,
      id_guru: guruId,
      nama_guru: tch.nama_guru,
      id_kelas: matchedCls?.id_kelas || prev.id_kelas || '',
      nama_kelas: matchedCls?.nama_kelas || prev.nama_kelas || '',
      id_mapel:
        isSpecial && matchedSub
          ? matchedSub.id_mapel
          : (!prev.id_mapel && matchedSub ? matchedSub.id_mapel : prev.id_mapel || ''),
      nama_mapel:
        isSpecial && matchedSub
          ? matchedSub.nama_mapel
          : (!prev.nama_mapel && matchedSub ? matchedSub.nama_mapel : prev.nama_mapel || ''),
    }));
  };

  // Resolusi jadwal terhadap master Kelas, Mapel, dan Guru agar data sheet lama/parsial tetap terdeteksi lengkap
  const resolvedSchedules = useMemo(() => {
    return schedules.map((j) => {
      const cls = classes.find(
        (c) =>
          (j.id_kelas && c.id_kelas === j.id_kelas) ||
          (j.nama_kelas && (c.nama_kelas || '').trim().toLowerCase() === j.nama_kelas.trim().toLowerCase())
      );
      const sub = subjects.find(
        (m) =>
          (j.id_mapel && m.id_mapel === j.id_mapel) ||
          (j.nama_mapel && (m.nama_mapel || '').trim().toLowerCase() === j.nama_mapel.trim().toLowerCase()) ||
          (j.nama_mapel && (m.kode_mapel || '').trim().toLowerCase() === j.nama_mapel.trim().toLowerCase())
      );
      const tch = teachers.find(
        (t) =>
          (j.id_guru && t.id_guru === j.id_guru) ||
          (j.nama_guru && (t.nama_guru || '').trim().toLowerCase() === j.nama_guru.trim().toLowerCase())
      );
      return {
        ...j,
        id_kelas: cls?.id_kelas || j.id_kelas || '',
        nama_kelas: cls?.nama_kelas || j.nama_kelas || '',
        id_mapel: sub?.id_mapel || j.id_mapel || '',
        nama_mapel: sub?.nama_mapel || j.nama_mapel || '',
        id_guru: tch?.id_guru || j.id_guru || '',
        nama_guru: tch?.nama_guru || j.nama_guru || '',
      };
    });
  }, [schedules, classes, subjects, teachers]);

  const filtered = useMemo(() => {
    return resolvedSchedules.filter((j) => {
      if (filterClass && j.id_kelas !== filterClass) return false;
      if (filterDay && j.hari !== filterDay) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchMapel = (j.nama_mapel || '').toLowerCase().includes(q);
        const matchGuru = (j.nama_guru || '').toLowerCase().includes(q);
        const matchKelas = (j.nama_kelas || '').toLowerCase().includes(q);
        if (!matchMapel && !matchGuru && !matchKelas) return false;
      }
      return true;
    });
  }, [resolvedSchedules, filterClass, filterDay, searchQuery]);

  // Statistics
  const uniqueSubjectsCount = useMemo(() => {
    return new Set(resolvedSchedules.map((s) => s.id_mapel || s.nama_mapel).filter(Boolean)).size;
  }, [resolvedSchedules]);

  const uniqueTeachersCount = useMemo(() => {
    return new Set(resolvedSchedules.map((s) => s.id_guru || s.nama_guru).filter(Boolean)).size;
  }, [resolvedSchedules]);

  const uniqueClassesCount = useMemo(() => {
    return new Set(resolvedSchedules.map((s) => s.id_kelas || s.nama_kelas).filter(Boolean)).size;
  }, [resolvedSchedules]);

  // Sort helper for chronological periods
  const sortScheduleItems = (items: ScheduleItem[]) => {
    return [...items].sort((a, b) => {
      const jamA = parseInt(a.jam_ke, 10) || 0;
      const jamB = parseInt(b.jam_ke, 10) || 0;
      if (jamA !== jamB) return jamA - jamB;
      const cleanA = cleanScheduleTimeSlot(a.waktu_mulai, a.jam_ke, false);
      const cleanB = cleanScheduleTimeSlot(b.waktu_mulai, b.jam_ke, false);
      return cleanA.localeCompare(cleanB);
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const isNonLesson = getNonLessonActivityInfo(form.id_mapel || form.nama_mapel);
    const cls = classes.find((c) => c.id_kelas === form.id_kelas);
    const sub = subjects.find((s) => s.id_mapel === form.id_mapel);
    const tch = teachers.find((t) => t.id_guru === form.id_guru);

    if (!cls && !form.id_kelas) {
      onToast('warning', 'Kelas wajib dipilih');
      return;
    }
    if (!sub && !form.id_mapel && !isNonLesson && !form.nama_mapel) {
      onToast('warning', 'Mata pelajaran atau kegiatan wajib dipilih');
      return;
    }
    if (!tch && !form.id_guru && !form.nama_guru) {
      onToast('warning', 'Guru pengampu atau penanggung jawab wajib dipilih');
      return;
    }

    const cleanMulai = cleanScheduleTimeSlot(form.waktu_mulai, form.jam_ke, false);
    const cleanSelesai = cleanScheduleTimeSlot(form.waktu_selesai, form.jam_ke, true);

    const payload = {
      ...form,
      waktu_mulai: cleanMulai,
      waktu_selesai: cleanSelesai,
      id_kelas: cls?.id_kelas || form.id_kelas || '',
      nama_kelas: cls?.nama_kelas || form.nama_kelas || '',
      id_mapel: sub?.id_mapel || form.id_mapel || (isNonLesson ? isNonLesson.id : ''),
      nama_mapel: sub?.nama_mapel || form.nama_mapel || (isNonLesson ? isNonLesson.name : ''),
      id_guru: tch?.id_guru || form.id_guru || '',
      nama_guru: tch?.nama_guru || form.nama_guru || '',
    };
    setSaving(true);
    const res = editing
      ? await callApi('updateSchedule', payload)
      : await callApi('createSchedule', payload);
    setSaving(false);
    if (res.success) {
      onToast('success', editing ? 'Jadwal diperbarui' : 'Jadwal ditambahkan');
      setFormOpen(false);
      loadData();
    } else {
      onToast('error', 'Gagal menyimpan', res.message);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Jadwal Pelajaran"
        description="Pengaturan jadwal mengajar mingguan per kelas, mata pelajaran, dan guru pengampu."
        actions={
          <div className="flex items-center gap-2">
            <SecondaryButton
              disabled={filtered.length === 0}
              onClick={() =>
                generatePdfReport({
                  orientation: 'portrait',
                  title: 'JADWAL PELAJARAN',
                  school,
                  headers: ['No', 'Hari', 'Jam Ke', 'Waktu', 'Kelas', 'Mata Pelajaran', 'Guru'],
                  rows: filtered.map((j, i) => [
                    i + 1,
                    j.hari,
                    j.jam_ke,
                    formatScheduleTimeDisplay(j.waktu_mulai, j.waktu_selesai, j.jam_ke),
                    j.nama_kelas,
                    j.nama_mapel,
                    j.nama_guru,
                  ]),
                  filename: `Jadwal_Pelajaran_${new Date().toISOString().slice(0, 10)}.pdf`,
                })
              }
            >
              <Printer className="w-4 h-4" />
              Cetak PDF
            </SecondaryButton>
            {canEdit && (
              <PrimaryButton onClick={() => openAddScheduleModal('Senin', '1')}>
                <Plus className="w-4 h-4" />
                Tambah Jadwal
              </PrimaryButton>
            )}
          </div>
        }
      />

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#1E1B4B] tabular-nums">{schedules.length}</div>
            <div className="text-xs text-[#64748B]">Total Sesi Pelajaran</div>
          </div>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#1E1B4B] tabular-nums">{uniqueSubjectsCount}</div>
            <div className="text-xs text-[#64748B]">Mata Pelajaran Aktif</div>
          </div>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-violet-50 text-violet-700 flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#1E1B4B] tabular-nums">{uniqueTeachersCount}</div>
            <div className="text-xs text-[#64748B]">Guru Pengampu</div>
          </div>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#1E1B4B] tabular-nums">{uniqueClassesCount}</div>
            <div className="text-xs text-[#64748B]">Kelas Terjadwal</div>
          </div>
        </div>
      </div>

      {/* Filter and View Mode Switcher */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari mata pelajaran, guru, atau kelas..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white focus:outline-none focus:border-[#6D28D9]"
            />
          </div>
          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className="px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
          >
            <option value="">Semua Kelas</option>
            {classes.map((c) => (
              <option key={c.id_kelas} value={c.id_kelas}>
                {c.nama_kelas}
              </option>
            ))}
          </select>
          <select
            value={filterDay}
            onChange={(e) => setFilterDay(e.target.value)}
            className="px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
          >
            <option value="">Semua Hari</option>
            {DAYS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1 p-1 bg-[#F1F5F9] rounded-lg shrink-0 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('board')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              viewMode === 'board'
                ? 'bg-white text-[#1E1B4B] shadow-xs'
                : 'text-[#64748B] hover:text-[#1E1B4B]'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Kolom Hari
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              viewMode === 'table'
                ? 'bg-white text-[#1E1B4B] shadow-xs'
                : 'text-[#64748B] hover:text-[#1E1B4B]'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            Tabel Rinci
          </button>
        </div>
      </div>

      {loading ? (
        <TableSkeleton cols={6} rows={4} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Belum ada jadwal pelajaran"
          description={
            searchQuery || filterClass || filterDay
              ? 'Tidak ada jadwal yang sesuai dengan filter yang dipilih.'
              : 'Mulai susun jadwal pelajaran mingguan per hari dan kelas.'
          }
          action={
            canEdit ? (
              <PrimaryButton onClick={() => openAddScheduleModal('Senin', '1')}>
                <Plus className="w-4 h-4" />
                Tambah Jadwal Pertama
              </PrimaryButton>
            ) : undefined
          }
        />
      ) : viewMode === 'board' ? (
        /* ================= DAY COLUMNS / BOARD VIEW ================= */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-start">
          {DAYS.filter((d) => !filterDay || d === filterDay).map((dayName) => {
            const rawDayItems = filtered.filter((j) => j.hari === dayName);
            const dayItems = sortScheduleItems(rawDayItems);

            return (
              <div
                key={dayName}
                className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex flex-col min-h-[500px]"
              >
                {/* Column Day Header */}
                <div className="p-3 border-b border-[#E2E8F0] bg-white rounded-t-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-[#1E1B4B]">{dayName}</span>
                    <span className="text-xs text-[#64748B] tabular-nums">
                      {dayItems.length} sesi
                    </span>
                  </div>
                  {canEdit && (
                    <button
                      type="button"
                      title={`Tambah jadwal hari ${dayName}`}
                      onClick={() => openAddScheduleModal(dayName, String(dayItems.length + 1))}
                      className="p-1 rounded-md text-[#6D28D9] hover:bg-[#EDE9FE] transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Column Items */}
                <div className="p-2.5 space-y-2.5 flex-1 overflow-y-auto max-h-[700px]">
                  {dayItems.length === 0 ? (
                    <div className="py-8 px-3 text-center border border-dashed border-[#CBD5E1] rounded-lg">
                      <p className="text-xs text-[#94A3B8]">Tidak ada pelajaran</p>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => openAddScheduleModal(dayName, '1')}
                          className="mt-2 text-xs text-[#6D28D9] font-medium hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Tambah
                        </button>
                      )}
                    </div>
                  ) : (
                    dayItems.map((j) => (
                      <div
                        key={j.id_jadwal}
                        className="bg-white border border-[#E5E7EB] hover:border-[#DDD6FE] rounded-lg p-3 shadow-2xs hover:shadow-sm transition-all space-y-2"
                      >
                        {/* Time & Period Bar */}
                        <div className="flex items-center justify-between text-xs pb-1.5 border-b border-[#F1F5F9]">
                          <span className="font-semibold text-[#6D28D9] tabular-nums">
                            Jam ke-{j.jam_ke}
                          </span>
                          <span className="text-[#64748B] tabular-nums text-[11px] font-medium flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#94A3B8]" />
                            {formatScheduleTimeDisplay(j.waktu_mulai, j.waktu_selesai, j.jam_ke)}
                          </span>
                        </div>

                        {/* Subject / Activity Title */}
                        <div>
                          <div className="font-semibold text-sm text-[#1E1B4B] leading-tight flex items-start gap-1.5">
                            {(() => {
                              const act = getNonLessonActivityInfo(j.id_mapel || j.nama_mapel);
                              if (act) {
                                return (
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold border ${act.badgeBg} ${act.badgeText} ${act.badgeBorder}`}
                                    >
                                      <span>{act.icon}</span>
                                      <span>{j.nama_mapel || act.name}</span>
                                    </span>
                                    <span className="text-[10px] text-[#64748B] bg-[#F1F5F9] px-1.5 py-0.5 rounded font-medium">
                                      Kegiatan
                                    </span>
                                  </div>
                                );
                              }
                              return (
                                <>
                                  <BookOpen className="w-4 h-4 text-[#6D28D9] shrink-0 mt-0.5" />
                                  <span>{j.nama_mapel}</span>
                                </>
                              );
                            })()}
                          </div>
                          <div className="text-[11px] text-[#475569] mt-1 pl-5">
                            Kelas: <span className="font-medium text-[#1E1B4B]">{j.nama_kelas}</span>
                          </div>
                        </div>

                        {/* Teacher & Actions */}
                        <div className="flex items-center justify-between pt-1.5 border-t border-[#F1F5F9] text-xs">
                          <div className="flex items-center gap-1 text-[#64748B] truncate max-w-[130px]" title={j.nama_guru}>
                            <User className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" />
                            <span className="truncate">{j.nama_guru || '-'}</span>
                          </div>
                          {canEdit && (
                            <div className="inline-flex gap-0.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditing(j);
                                  setForm({
                                    ...j,
                                    waktu_mulai: cleanScheduleTimeSlot(j.waktu_mulai, j.jam_ke, false),
                                    waktu_selesai: cleanScheduleTimeSlot(j.waktu_selesai, j.jam_ke, true),
                                  });
                                  setFormOpen(true);
                                }}
                                title="Edit Jadwal"
                                className="p-1 rounded text-[#94A3B8] hover:text-[#6D28D9] hover:bg-[#EDE9FE] transition-colors cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(j)}
                                title="Hapus Jadwal"
                                className="p-1 rounded text-[#94A3B8] hover:text-[#DC2626] hover:bg-red-50 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ================= TABLE VIEW ================= */
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#EDE9FE] text-[#1E1B4B]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Hari</th>
                  <th className="px-4 py-3 font-semibold">Jam / Waktu (WIB)</th>
                  <th className="px-4 py-3 font-semibold">Kelas</th>
                  <th className="px-4 py-3 font-semibold">Mata Pelajaran / Kegiatan</th>
                  <th className="px-4 py-3 font-semibold">Guru Pengampu / Pembina</th>
                  {canEdit && <th className="px-4 py-3 font-semibold text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {filtered.map((j) => (
                  <tr key={j.id_jadwal} className="hover:bg-[#F5F3FF]/50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-[#1E1B4B]">{j.hari}</td>
                    <td className="px-4 py-3 tabular-nums text-xs">
                      <div className="font-medium text-[#1E1B4B]">Jam ke-{j.jam_ke}</div>
                      <div className="text-[#64748B] font-mono text-[11px] font-medium">
                        {formatScheduleTimeDisplay(j.waktu_mulai, j.waktu_selesai, j.jam_ke)}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-[#1E1B4B]">{j.nama_kelas}</td>
                    <td className="px-4 py-3 font-medium text-[#1E1B4B]">
                      {(() => {
                        const act = getNonLessonActivityInfo(j.id_mapel || j.nama_mapel);
                        if (act) {
                          return (
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border ${act.badgeBg} ${act.badgeText} ${act.badgeBorder}`}
                              >
                                <span>{act.icon}</span>
                                <span>{j.nama_mapel || act.name}</span>
                              </span>
                              <span className="text-[10px] text-[#64748B] bg-[#F1F5F9] px-1.5 py-0.5 rounded font-medium">
                                Kegiatan
                              </span>
                            </div>
                          );
                        }
                        return (
                          <div className="flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-[#6D28D9]" />
                            <span>{j.nama_mapel}</span>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 text-[#475569]">{j.nama_guru || '-'}</td>
                    {canEdit && (
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditing(j);
                              setForm({
                                ...j,
                                waktu_mulai: cleanScheduleTimeSlot(j.waktu_mulai, j.jam_ke, false),
                                waktu_selesai: cleanScheduleTimeSlot(j.waktu_selesai, j.jam_ke, true),
                              });
                              setFormOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#6D28D9] hover:bg-[#EDE9FE] cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(j)}
                            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#DC2626] hover:bg-red-50 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Schedule Modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit Jadwal Pelajaran' : 'Tambah Jadwal Pelajaran'}
      >
        <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1">Hari</label>
            <select
              value={form.hari || 'Senin'}
              onChange={(e) => setForm({ ...form, hari: e.target.value as ScheduleItem['hari'] })}
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
            >
              {DAYS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Jam Ke</label>
            <input
              type="text"
              required
              value={form.jam_ke || ''}
              onChange={(e) => {
                const nextJam = e.target.value;
                setForm((prev) => ({
                  ...prev,
                  jam_ke: nextJam,
                  waktu_mulai: prev.waktu_mulai || getDefaultScheduleTimeSlot(nextJam, false),
                  waktu_selesai: prev.waktu_selesai || getDefaultScheduleTimeSlot(nextJam, true),
                }));
              }}
              placeholder="Contoh: 1, 2, dst."
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Waktu Mulai (WIB) *</label>
            <input
              type="time"
              required
              value={form.waktu_mulai || ''}
              onChange={(e) => setForm({ ...form, waktu_mulai: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Waktu Selesai (WIB) *</label>
            <input
              type="time"
              required
              value={form.waktu_selesai || ''}
              onChange={(e) => setForm({ ...form, waktu_selesai: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Kelas *</label>
            <select
              required
              value={form.id_kelas || ''}
              onChange={(e) => handleFormClassChange(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
            >
              <option value="">-- Pilih Kelas --</option>
              {classes.map((c) => (
                <option key={c.id_kelas} value={c.id_kelas}>
                  {c.nama_kelas}
                </option>
              ))}
            </select>
            {classes.length === 0 && (
              <p className="text-[11px] text-[#D97706] mt-1">
                Data kelas belum tersedia. Tambahkan di menu Data Kelas terlebih dahulu.
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Mata Pelajaran / Kegiatan *</label>
            <select
              required
              value={form.id_mapel || ''}
              onChange={(e) => handleFormSubjectChange(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
            >
              <option value="">-- Pilih Mata Pelajaran / Kegiatan --</option>
              <optgroup label="Kegiatan Sekolah (Non-Pelajaran)">
                {NON_LESSON_ACTIVITIES.map((act) => (
                  <option key={act.id} value={act.id}>
                    {act.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Mata Pelajaran Reguler">
                {subjects.map((s) => (
                  <option key={s.id_mapel} value={s.id_mapel}>
                    {s.nama_mapel}
                    {s.status_aktif === 'Nonaktif' ? ' (Nonaktif)' : ''}
                  </option>
                ))}
              </optgroup>
            </select>
            {subjects.length === 0 && (
              <p className="text-[11px] text-[#D97706] mt-1">
                Mata pelajaran reguler belum tersedia. Anda tetap dapat memilih Kegiatan Non-Pelajaran di atas.
              </p>
            )}
          </div>
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold">Guru Pengampu / Pembina Kegiatan *</label>
              <button
                type="button"
                onClick={() => {
                  const detected = detectTeacherForSelection(form.id_kelas || '', form.id_mapel || '');
                  if (detected) {
                    setForm((prev) => ({
                      ...prev,
                      id_guru: detected.id_guru,
                      nama_guru: detected.nama_guru,
                    }));
                    onToast('info', 'Guru terdeteksi otomatis', detected.nama_guru);
                  } else {
                    onToast('warning', 'Belum ada guru yang cocok dengan kelas/mapel ini');
                  }
                }}
                className="text-[11px] font-semibold text-[#6D28D9] hover:underline cursor-pointer"
              >
                Deteksi Guru Otomatis
              </button>
            </div>
            <select
              required
              value={form.id_guru || ''}
              onChange={(e) => handleFormTeacherChange(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
            >
              <option value="">-- Pilih Guru / Pembina --</option>
              <optgroup label="Peran Umum / Kegiatan Non-Pelajaran">
                <option value="GURU-SEMUA">Semua Guru / Pembina</option>
                <option value="GURU-WALI">Wali Kelas</option>
                <option value="GURU-PIKET">Guru Piket</option>
              </optgroup>
              <optgroup label="Daftar Guru Pengampu">
                {teachers.map((t) => (
                  <option key={t.id_guru} value={t.id_guru}>
                    {t.nama_guru}
                  </option>
                ))}
              </optgroup>
            </select>
            {teachers.length === 0 ? (
              <p className="text-[11px] text-[#D97706] mt-1">
                Data guru belum tersedia. Anda dapat memilih peran umum seperti "Semua Guru / Pembina".
              </p>
            ) : (
              <p className="text-[11px] text-[#64748B] mt-1">
                Untuk kegiatan non-pelajaran (Upacara, Pembiasaan, dll), Anda dapat memilih peran seperti Semua Guru / Pembina atau Wali Kelas.
              </p>
            )}
          </div>
          <div className="sm:col-span-2 flex justify-end gap-2 pt-2 border-t border-[#E5E7EB]">
            <SecondaryButton onClick={() => setFormOpen(false)}>Batal</SecondaryButton>
            <PrimaryButton type="submit" loading={saving}>
              Simpan Jadwal
            </PrimaryButton>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          setSaving(true);
          const res = await callApi('deleteSchedule', { id_jadwal: deleteTarget.id_jadwal });
          setSaving(false);
          if (res.success) {
            onToast('success', 'Jadwal dihapus');
            setDeleteTarget(null);
            loadData();
          } else {
            onToast('error', 'Gagal menghapus', res.message);
          }
        }}
        loading={saving}
        title="Hapus Jadwal"
        message="Hapus entri jadwal pelajaran ini?"
      />
    </div>
  );
}

// ============================================================================
// 2. ABSENSI HARIAN SISWA
// ============================================================================

const ATTENDANCE_STATUSES: AttendanceStatus[] = ['Hadir', 'Sakit', 'Izin', 'Alpha'];

export function AbsensiModule({
  school,
  onToast,
}: {
  school: SchoolIdentity;
  onToast: ToastFn;
}) {
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => getTodayLocalYmd());
  const [draft, setDraft] = useState<
    Record<string, { status: AttendanceStatus; keterangan: string; koreksi_catatan: string; existing?: AttendanceRecord }>
  >({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [cRes, sRes, aRes] = await Promise.all([
      callApi<ClassRoom[]>('getClasses'),
      callApi<Student[]>('getStudents'),
      callApi<AttendanceRecord[]>('getAttendance'),
    ]);
    setLoading(false);
    if (cRes.success && cRes.data) {
      setClasses(cRes.data);
      if (!selectedClass && cRes.data.length === 1) setSelectedClass(cRes.data[0].id_kelas);
    } else if (!cRes.success) {
      onToast('error', 'Gagal memuat data kelas', cRes.message);
    }
    if (sRes.success && sRes.data) {
      setStudents(sRes.data);
    } else if (!sRes.success) {
      onToast('error', 'Gagal memuat data siswa', sRes.message);
    }
    if (aRes.success && aRes.data) {
      setAttendance(aRes.data);
    } else if (!aRes.success) {
      onToast('error', 'Gagal memuat data absensi', aRes.message);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const classStudents = useMemo(() => {
    const normStr = (v?: string) => String(v || '').trim().replace(/\s+/g, ' ').toLowerCase();
    const selectedClsObj = selectedClass
      ? classes.find((c) => c.id_kelas === selectedClass)
      : undefined;
    return students.filter((s) => {
      if (s.status_siswa !== 'Aktif') return false;
      if (!selectedClass) return true;
      if (String(s.id_kelas || '').trim() === selectedClass) return true;
      if (selectedClsObj && normStr(s.nama_kelas) === normStr(selectedClsObj.nama_kelas)) return true;
      return false;
    });
  }, [students, classes, selectedClass]);

  useEffect(() => {
    const normStr = (v?: string) => String(v || '').trim().replace(/\s+/g, ' ').toLowerCase();
    const nextDraft: typeof draft = {};
    for (const s of classStudents) {
      const sId = String(s.id_siswa || '').trim();
      const sName = normStr(s.nama_lengkap);
      const existing = attendance.find(
        (a) =>
          normalizeRecordDateYmd(a.tanggal) === selectedDate &&
          ((sId && String(a.id_siswa || '').trim() === sId) ||
            (sName && normStr(a.nama_siswa) === sName))
      );
      nextDraft[s.id_siswa] = {
        status: existing ? normalizeAttStatus(existing.status) : 'Hadir',
        keterangan: existing?.keterangan || '',
        koreksi_catatan: existing?.koreksi_catatan || '',
        existing,
      };
    }
    setDraft(nextDraft);
  }, [classStudents, attendance, selectedDate]);

  const handleSave = async () => {
    if (classStudents.length === 0) return;
    const records = classStudents.map((s) => {
      const stuCls = classes.find((c) => c.id_kelas === (s.id_kelas || selectedClass));
      const entry = draft[s.id_siswa] || { status: 'Hadir', keterangan: '', koreksi_catatan: '' };
      return {
        tanggal: selectedDate,
        id_tahun_ajaran: school.tahun_ajaran_aktif_id || '',
        semester: school.semester_aktif || 'Ganjil',
        id_kelas: s.id_kelas || selectedClass,
        nama_kelas: s.nama_kelas || stuCls?.nama_kelas || '',
        id_siswa: s.id_siswa,
        nama_siswa: s.nama_lengkap,
        status: entry.status,
        keterangan: entry.keterangan,
        koreksi_catatan: entry.koreksi_catatan,
      };
    });

    setSaving(true);
    const res = await callApi('saveAttendance', { records });
    setSaving(false);
    if (res.success) {
      onToast('success', 'Absensi disimpan', `${records.length} siswa tercatat untuk tanggal ${selectedDate}.`);
      loadData();
    } else {
      onToast('error', 'Gagal menyimpan absensi', res.message);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Absensi Siswa Harian"
        description="Input dan koreksi kehadiran harian per kelas. Duplikasi siswa pada tanggal yang sama dicegah otomatis dan perubahan tercatat sebagai koreksi."
        actions={
          <PrimaryButton onClick={handleSave} loading={saving} disabled={classStudents.length === 0}>
            <Save className="w-4 h-4" />
            Simpan Absensi
          </PrimaryButton>
        }
      />

      <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
        <div>
          <label className="block text-xs font-semibold text-[#1E1B4B] mb-1">Tanggal</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#1E1B4B] mb-1">Kelas</label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
          >
            <option value="">{classes.length > 1 ? 'Semua Kelas' : '-- Pilih Kelas --'}</option>
            {classes.map((c) => (
              <option key={c.id_kelas} value={c.id_kelas}>
                {c.nama_kelas}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <SecondaryButton
            disabled={classStudents.length === 0}
            onClick={() => {
              const allPresent = { ...draft };
              classStudents.forEach((s) => {
                allPresent[s.id_siswa] = { ...allPresent[s.id_siswa], status: 'Hadir' };
              });
              setDraft(allPresent);
            }}
          >
            <CheckCircle2 className="w-4 h-4" />
            Tandai Semua Hadir
          </SecondaryButton>
        </div>
      </div>

      {loading ? (
        <TableSkeleton cols={5} rows={5} />
      ) : classStudents.length === 0 ? (
        <EmptyState
          title="Belum ada siswa aktif pada kelas ini"
          description="Pastikan data kelas dan siswa telah ditambahkan terlebih dahulu."
        />
      ) : (
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#EDE9FE] text-[#1E1B4B]">
                <tr>
                  <th className="px-4 py-3 font-semibold w-12">No</th>
                  <th className="px-4 py-3 font-semibold">NIS</th>
                  <th className="px-4 py-3 font-semibold">Nama Siswa</th>
                  <th className="px-4 py-3 font-semibold">Status Kehadiran</th>
                  <th className="px-4 py-3 font-semibold">Keterangan / Catatan Koreksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {classStudents.map((s, idx) => {
                  const row = draft[s.id_siswa] || { status: 'Hadir', keterangan: '', koreksi_catatan: '' };
                  return (
                    <tr key={s.id_siswa} className="hover:bg-[#F5F3FF]/50">
                      <td className="px-4 py-3 tabular-nums text-[#64748B]">{idx + 1}</td>
                      <td className="px-4 py-3 font-mono text-xs tabular-nums">{s.nis}</td>
                      <td className="px-4 py-3 font-medium text-[#1E1B4B]">
                        <div>{s.nama_lengkap}</div>
                        <div className="text-[11px] text-[#64748B]">
                          {s.nama_kelas || '-'}
                          {row.existing ? ` · Sudah tercatat (${row.existing.status})` : ''}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {ATTENDANCE_STATUSES.map((st) => (
                            <button
                              key={st}
                              type="button"
                              onClick={() =>
                                setDraft((prev) => ({
                                  ...prev,
                                  [s.id_siswa]: { ...prev[s.id_siswa], status: st },
                                }))
                              }
                              className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition-colors cursor-pointer whitespace-nowrap ${
                                row.status === st
                                  ? 'bg-[#6D28D9] text-white border-[#6D28D9]'
                                  : 'bg-white text-[#64748B] border-[#E5E7EB] hover:border-[#6D28D9]'
                              }`}
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={row.keterangan}
                          onChange={(e) =>
                            setDraft((prev) => ({
                              ...prev,
                              [s.id_siswa]: { ...prev[s.id_siswa], keterangan: e.target.value },
                            }))
                          }
                          placeholder="Catatan opsional..."
                          className="w-full px-2.5 py-1.5 text-xs border border-[#E5E7EB] rounded-lg"
                        />
                        {row.koreksi_catatan && (
                          <div className="mt-1 text-[11px] text-[#B45309]">{row.koreksi_catatan}</div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 3. REKAP ABSENSI (MINGGUAN / BULANAN / SEMESTER)
// ============================================================================

export function RekapAbsensiModule({
  user,
  school,
  onToast,
}: {
  user: AuthUser;
  school: SchoolIdentity;
  onToast?: ToastFn;
}) {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [periodMode, setPeriodMode] = useState<'mingguan' | 'bulanan' | 'semester'>('bulanan');
  const [filterClass, setFilterClass] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => getCurrentLocalYm());
  const monthInitializedRef = useRef(false);

  const loadRecapData = async () => {
    setLoading(true);
    setErrorMsg(null);
    const [aRes, sRes, cRes] = await Promise.all([
      callApi<AttendanceRecord[]>('getAttendance'),
      callApi<Student[]>('getStudents'),
      callApi<ClassRoom[]>('getClasses'),
    ]);
    setLoading(false);

    const errors: string[] = [];
    if (aRes.success && Array.isArray(aRes.data)) {
      setAttendance(aRes.data);
      if (!monthInitializedRef.current && aRes.data.length > 0) {
        monthInitializedRef.current = true;
        const currentYm = getCurrentLocalYm();
        const months = aRes.data
          .map((item) => normalizeRecordDateYmd(item.tanggal).slice(0, 7))
          .filter((ym) => /^\d{4}-\d{2}$/.test(ym))
          .sort();
        if (months.length > 0 && !months.includes(currentYm)) {
          setSelectedMonth(months[months.length - 1]);
        }
      }
    } else if (!aRes.success) {
      errors.push(`Absensi: ${aRes.message || 'Gagal memuat data absensi'}`);
    }

    if (sRes.success && Array.isArray(sRes.data)) {
      setStudents(sRes.data);
    } else if (!sRes.success) {
      errors.push(`Siswa: ${sRes.message || 'Gagal memuat data siswa'}`);
    }

    if (cRes.success && Array.isArray(cRes.data)) {
      setClasses(cRes.data);
    } else if (!cRes.success) {
      errors.push(`Kelas: ${cRes.message || 'Gagal memuat data kelas'}`);
    }

    if (errors.length > 0) {
      const msg = errors.join(' | ');
      setErrorMsg(msg);
      onToast?.('error', 'Gagal memuat rekap absensi', msg);
    }
  };

  useEffect(() => {
    loadRecapData();
  }, []);

  const periodFilteredAttendance = useMemo(() => {
    const start = new Date();
    start.setDate(start.getDate() - 6);
    const sevenDaysAgo = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
    return attendance.filter((a) => {
      const dateYmd = normalizeRecordDateYmd(a.tanggal);
      if (periodMode === 'mingguan') return dateYmd !== '' && dateYmd >= sevenDaysAgo;
      if (periodMode === 'bulanan') return dateYmd.startsWith(selectedMonth);
      return true;
    });
  }, [attendance, periodMode, selectedMonth]);

  const recapRows = useMemo(() => {
    const normStr = (v?: string) => String(v || '').trim().replace(/\s+/g, ' ').toLowerCase();
    const selectedClsObj = filterClass
      ? classes.find((c) => c.id_kelas === filterClass)
      : undefined;
    const selectedClsName = normStr(selectedClsObj?.nama_kelas);

    const matchesSelectedClass = (idKelas?: string, namaKelas?: string) => {
      if (!filterClass) return true;
      if (String(idKelas || '').trim() === filterClass) return true;
      if (selectedClsName && normStr(namaKelas) === selectedClsName) return true;
      return false;
    };

    const studentById = new Map<string, Student>();
    const studentByNis = new Map<string, Student>();
    const studentsByName = new Map<string, Student[]>();

    for (const s of students) {
      const sId = String(s.id_siswa || '').trim();
      const sNis = String(s.nis || '').trim();
      const sName = normStr(s.nama_lengkap);
      if (sId) studentById.set(sId, s);
      if (sNis) studentByNis.set(sNis, s);
      if (sName) {
        const list = studentsByName.get(sName) || [];
        list.push(s);
        studentsByName.set(sName, list);
      }
    }

    const resolveStudentForRecord = (a: AttendanceRecord): Student | undefined => {
      const aId = String(a.id_siswa || '').trim();
      if (aId && studentById.has(aId)) return studentById.get(aId);
      if (aId && studentByNis.has(aId)) return studentByNis.get(aId);
      const aName = normStr(a.nama_siswa);
      if (aName && studentsByName.has(aName)) {
        const cands = studentsByName.get(aName)!;
        if (cands.length === 1) return cands[0];
        const aClsId = String(a.id_kelas || '').trim();
        const aClsName = normStr(a.nama_kelas);
        const clsMatch = cands.find(
          (c) =>
            (aClsId && String(c.id_kelas || '').trim() === aClsId) ||
            (aClsName && normStr(c.nama_kelas) === aClsName)
        );
        return clsMatch || cands[0];
      }
      return undefined;
    };

    const logsByStudentKey = new Map<string, AttendanceRecord[]>();
    const fallbackMetaByKey = new Map<
      string,
      { id_siswa: string; nis: string; nama_lengkap: string; nama_kelas: string; id_kelas: string }
    >();

    for (const a of periodFilteredAttendance) {
      const matchedStu = resolveStudentForRecord(a);
      if (matchedStu) {
        const key = String(matchedStu.id_siswa || '').trim() || `NAME:${normStr(matchedStu.nama_lengkap)}`;
        const arr = logsByStudentKey.get(key) || [];
        arr.push(a);
        logsByStudentKey.set(key, arr);
      } else {
        if (!matchesSelectedClass(a.id_kelas, a.nama_kelas)) continue;
        const rawKey =
          String(a.id_siswa || '').trim() ||
          `ORPHAN:${normStr(a.nama_siswa)}:${String(a.id_kelas || normStr(a.nama_kelas))}`;
        const arr = logsByStudentKey.get(rawKey) || [];
        arr.push(a);
        logsByStudentKey.set(rawKey, arr);
        if (!fallbackMetaByKey.has(rawKey)) {
          fallbackMetaByKey.set(rawKey, {
            id_siswa: rawKey,
            nis: '-',
            nama_lengkap: a.nama_siswa || a.id_siswa || 'Siswa',
            nama_kelas: a.nama_kelas || '-',
            id_kelas: a.id_kelas || '',
          });
        }
      }
    }

    const baseRows: {
      key: string;
      id_siswa: string;
      nis: string;
      nama_lengkap: string;
      nama_kelas: string;
    }[] = [];
    const includedKeys = new Set<string>();

    for (const s of students) {
      const key = String(s.id_siswa || '').trim() || `NAME:${normStr(s.nama_lengkap)}`;
      const logs = logsByStudentKey.get(key) || [];
      if (!matchesSelectedClass(s.id_kelas, s.nama_kelas)) continue;
      if (s.status_siswa !== 'Aktif' && logs.length === 0) continue;
      includedKeys.add(key);
      baseRows.push({
        key,
        id_siswa: s.id_siswa || key,
        nis: s.nis || '-',
        nama_lengkap: s.nama_lengkap,
        nama_kelas: s.nama_kelas || '-',
      });
    }

    for (const [key, meta] of fallbackMetaByKey.entries()) {
      if (includedKeys.has(key)) continue;
      baseRows.push({
        key,
        id_siswa: meta.id_siswa,
        nis: meta.nis,
        nama_lengkap: meta.nama_lengkap,
        nama_kelas: meta.nama_kelas,
      });
    }

    return baseRows.map((row) => {
      const logs = logsByStudentKey.get(row.key) || [];
      const count = (st: AttendanceStatus) =>
        logs.filter((l) => normalizeAttStatus(l.status) === st).length;
      const hadir = count('Hadir');
      const sakit = count('Sakit');
      const izin = count('Izin');
      const alpha = count('Alpha');
      const total = logs.length;
      const pct = total > 0 ? Math.round((hadir / total) * 1000) / 10 : 0;
      return {
        id_siswa: row.id_siswa,
        nis: row.nis,
        nama_lengkap: row.nama_lengkap,
        nama_kelas: row.nama_kelas,
        hadir,
        sakit,
        izin,
        alpha,
        total,
        pct,
      };
    });
  }, [students, classes, periodFilteredAttendance, filterClass]);

  const totalMatchedLogs = useMemo(
    () => recapRows.reduce((sum, r) => sum + r.total, 0),
    [recapRows]
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title={user.role === 'ORANG_TUA' ? 'Kehadiran Anak' : 'Rekap Absensi Siswa'}
        description="Rekapitulasi kehadiran siswa per minggu, bulan, atau semester beserta persentase kehadiran."
        actions={
          <>
            <SecondaryButton onClick={loadRecapData} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Muat Ulang
            </SecondaryButton>
            <SecondaryButton
              disabled={recapRows.length === 0}
              onClick={() =>
                exportRowsToExcel(
                  `Rekap_Absensi_${periodMode}_${new Date().toISOString().slice(0, 10)}.xlsx`,
                  'Rekap Absensi',
                  ['No', 'NIS', 'Nama Siswa', 'Kelas', 'Hadir', 'Sakit', 'Izin', 'Alpha', 'Total Hari', 'Persentase (%)'],
                  recapRows.map((r, i) => [
                    i + 1,
                    r.nis,
                    r.nama_lengkap,
                    r.nama_kelas,
                    r.hadir,
                    r.sakit,
                    r.izin,
                    r.alpha,
                    r.total,
                    r.pct,
                  ])
                )
              }
            >
              <FileSpreadsheet className="w-4 h-4" />
              Export Excel
            </SecondaryButton>
            <SecondaryButton
              disabled={recapRows.length === 0}
              onClick={() =>
                generatePdfReport({
                  orientation: 'landscape',
                  title: 'REKAPITULASI KEHADIRAN SISWA',
                  school,
                  metaPairs: [
                    { label: 'Periode', value: periodMode.toUpperCase() },
                    { label: 'Tahun Ajaran', value: school.tahun_ajaran_aktif || '-' },
                    { label: 'Semester', value: school.semester_aktif },
                  ],
                  headers: ['No', 'NIS', 'Nama Siswa', 'Kelas', 'Hadir', 'Sakit', 'Izin', 'Alpha', 'Total', 'Kehadiran (%)'],
                  rows: recapRows.map((r, i) => [
                    i + 1,
                    r.nis,
                    r.nama_lengkap,
                    r.nama_kelas,
                    r.hadir,
                    r.sakit,
                    r.izin,
                    r.alpha,
                    r.total,
                    `${r.pct}%`,
                  ]),
                  filename: `Rekap_Absensi_${new Date().toISOString().slice(0, 10)}.pdf`,
                })
              }
            >
              <Printer className="w-4 h-4" />
              Cetak PDF
            </SecondaryButton>
          </>
        }
      />

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div>
            <div className="font-semibold">Terjadi kendala saat memuat data rekap absensi</div>
            <div className="mt-0.5 text-red-700">{errorMsg}</div>
          </div>
          <SecondaryButton onClick={loadRecapData} disabled={loading}>
            <RefreshCw className="w-3.5 h-3.5" />
            Coba Lagi
          </SecondaryButton>
        </div>
      )}

      <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-[#F5F3FF] rounded-lg">
            {(['mingguan', 'bulanan', 'semester'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setPeriodMode(m)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md capitalize cursor-pointer ${
                  periodMode === m ? 'bg-white text-[#6D28D9] shadow-sm' : 'text-[#64748B]'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          {periodMode === 'bulanan' && (
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
            />
          )}
          {user.role !== 'ORANG_TUA' && (
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
            >
              <option value="">Semua Kelas</option>
              {classes.map((c) => (
                <option key={c.id_kelas} value={c.id_kelas}>
                  {c.nama_kelas}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="text-xs text-[#64748B] tabular-nums">
          Total catatan absensi terbaca:{' '}
          <span className="font-semibold text-[#1E1B4B]">{totalMatchedLogs}</span>
          {attendance.length > 0 && periodFilteredAttendance.length === 0 && (
            <span className="ml-1.5 text-[#B45309]">
              ({attendance.length} catatan tersimpan di periode/bulan lain)
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <TableSkeleton cols={8} rows={5} />
      ) : recapRows.length === 0 ? (
        <EmptyState title="Belum ada data rekap absensi" />
      ) : (
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#EDE9FE] text-[#1E1B4B]">
                <tr>
                  <th className="px-4 py-3 font-semibold">No</th>
                  <th className="px-4 py-3 font-semibold">Nama Siswa</th>
                  <th className="px-4 py-3 font-semibold">Kelas</th>
                  <th className="px-4 py-3 font-semibold text-right">Hadir</th>
                  <th className="px-4 py-3 font-semibold text-right">Sakit</th>
                  <th className="px-4 py-3 font-semibold text-right">Izin</th>
                  <th className="px-4 py-3 font-semibold text-right">Alpha</th>
                  <th className="px-4 py-3 font-semibold text-right">Persentase</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {recapRows.map((r, i) => (
                  <tr key={r.id_siswa} className="hover:bg-[#F5F3FF]/50">
                    <td className="px-4 py-3 tabular-nums text-[#64748B]">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-[#1E1B4B]">{r.nama_lengkap}</td>
                    <td className="px-4 py-3">{r.nama_kelas || '-'}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-[#16A34A] font-semibold">{r.hadir}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{r.sakit}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{r.izin}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-[#DC2626] font-semibold">{r.alpha}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums font-bold text-[#1E1B4B]">
                      {r.pct}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 4. INPUT NILAI SISWA (SUM 1, SUM 2, SUM 3, SUM 4, SAS)
// ============================================================================

const GRADE_EXCEL_COLS: ExcelColumnSpec[] = [
  { key: 'nis', header: 'NIS', required: true },
  { key: 'nama_siswa', header: 'Nama Siswa', required: true },
  { key: 'sum_1', header: 'SUM 1', type: 'number' },
  { key: 'sum_2', header: 'SUM 2', type: 'number' },
  { key: 'sum_3', header: 'SUM 3', type: 'number' },
  { key: 'sum_4', header: 'SUM 4', type: 'number' },
  { key: 'sas', header: 'SAS', type: 'number' },
  { key: 'catatan', header: 'Catatan' },
];

export function InputNilaiModule({
  user,
  school,
  onToast,
}: {
  user: AuthUser;
  school: SchoolIdentity;
  onToast: ToastFn;
}) {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<GradeRecord[]>([]);

  const [selectedYearId, setSelectedYearId] = useState(school.tahun_ajaran_aktif_id || '');
  const [selectedSemester, setSelectedSemester] = useState<'Ganjil' | 'Genap'>(
    school.semester_aktif || 'Ganjil'
  );
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState(user.relasi_id || '');

  const [draft, setDraft] = useState<
    Record<string, { sum_1: string; sum_2: string; sum_3: string; sum_4: string; sas: string; catatan: string }>
  >({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    const [yRes, cRes, mRes, tRes, sRes, gRes] = await Promise.all([
      callApi<AcademicYear[]>('getAcademicYears'),
      callApi<ClassRoom[]>('getClasses'),
      callApi<Subject[]>('getSubjects'),
      callApi<Teacher[]>('getTeachers'),
      callApi<Student[]>('getStudents'),
      callApi<GradeRecord[]>('getGrades'),
    ]);
    setLoading(false);
    if (yRes.success && yRes.data) {
      setYears(yRes.data);
      const active = yRes.data.find((y) => y.status === 'Aktif') || yRes.data[0];
      if (!selectedYearId && active) setSelectedYearId(active.id_tahun_ajaran);
    }
    if (cRes.success && cRes.data) {
      setClasses(cRes.data);
      if (!selectedClassId && cRes.data.length === 1) setSelectedClassId(cRes.data[0].id_kelas);
    }
    const loadedSubjects = mRes.success && mRes.data ? mRes.data : [];
    const loadedTeachers = tRes.success && tRes.data ? tRes.data : [];
    if (mRes.success && mRes.data) setSubjects(loadedSubjects);
    if (tRes.success && tRes.data) setTeachers(loadedTeachers);

    const matchedTeacher = user.role === 'GURU' ? findLoggedTeacher(loadedTeachers, user) : undefined;
    if (!selectedTeacherId) {
      if (matchedTeacher) setSelectedTeacherId(matchedTeacher.id_guru);
      else if (loadedTeachers.length > 0) setSelectedTeacherId(loadedTeachers[0].id_guru);
    }
    if (!selectedSubjectId && loadedSubjects.length > 0) {
      const matchedSubj = findMatchingSubjectForTeacher(matchedTeacher, loadedSubjects);
      setSelectedSubjectId(matchedSubj?.id_mapel || loadedSubjects[0].id_mapel);
    }
    if (sRes.success && sRes.data) setStudents(sRes.data);
    if (gRes.success && gRes.data) setGrades(gRes.data);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const classStudents = useMemo(
    () =>
      students.filter(
        (s) => s.status_siswa === 'Aktif' && (!selectedClassId || s.id_kelas === selectedClassId)
      ),
    [students, selectedClassId]
  );

  useEffect(() => {
    const next: typeof draft = {};
    for (const s of classStudents) {
      const existing = grades.find(
        (g) =>
          g.id_siswa === s.id_siswa &&
          g.id_mapel === selectedSubjectId &&
          (!selectedYearId || g.id_tahun_ajaran === selectedYearId) &&
          g.semester === selectedSemester
      );
      next[s.id_siswa] = {
        sum_1: existing && existing.sum_1 !== '' && existing.sum_1 !== undefined ? String(existing.sum_1) : '',
        sum_2: existing && existing.sum_2 !== '' && existing.sum_2 !== undefined ? String(existing.sum_2) : '',
        sum_3: existing && existing.sum_3 !== '' && existing.sum_3 !== undefined ? String(existing.sum_3) : '',
        sum_4: existing && existing.sum_4 !== '' && existing.sum_4 !== undefined ? String(existing.sum_4) : '',
        sas: existing && existing.sas !== '' && existing.sas !== undefined ? String(existing.sas) : '',
        catatan: existing?.catatan || '',
      };
    }
    setDraft(next);
  }, [classStudents, grades, selectedSubjectId, selectedYearId, selectedSemester]);

  const handleSave = async () => {
    if (!selectedSubjectId || classStudents.length === 0) {
      onToast('warning', 'Pilih Mata Pelajaran', 'Pastikan mata pelajaran dipilih dan terdapat siswa aktif.');
      return;
    }

    for (const s of classStudents) {
      const row = draft[s.id_siswa];
      if (!row) continue;
      for (const f of GRADE_FIELDS) {
        if (!isGradeInputValid(row[f.key])) {
          onToast(
            'error',
            'Validasi Nilai Gagal',
            `Nilai ${f.label} untuk ${s.nama_lengkap} harus di antara 0 sampai 100.`
          );
          return;
        }
      }
    }

    const yr = years.find((y) => y.id_tahun_ajaran === selectedYearId);
    const sub = subjects.find((m) => m.id_mapel === selectedSubjectId);
    const tch = teachers.find((t) => t.id_guru === selectedTeacherId);

    const records = classStudents.map((s) => {
      const stuCls = classes.find((c) => c.id_kelas === (s.id_kelas || selectedClassId));
      const row = draft[s.id_siswa] || { sum_1: '', sum_2: '', sum_3: '', sum_4: '', sas: '', catatan: '' };
      const stats = computeSubjectGradeStats(row);
      return {
        id_tahun_ajaran: selectedYearId,
        tahun_ajaran: yr?.nama_tahun_ajaran || school.tahun_ajaran_aktif || '',
        semester: selectedSemester,
        id_kelas: s.id_kelas || selectedClassId,
        nama_kelas: s.nama_kelas || stuCls?.nama_kelas || '',
        id_mapel: selectedSubjectId,
        nama_mapel: sub?.nama_mapel || '',
        id_guru: selectedTeacherId,
        nama_guru: tch?.nama_guru || user.nama_lengkap,
        id_siswa: s.id_siswa,
        nama_siswa: s.nama_lengkap,
        sum_1: parseValidGrade(row.sum_1) ?? '',
        sum_2: parseValidGrade(row.sum_2) ?? '',
        sum_3: parseValidGrade(row.sum_3) ?? '',
        sum_4: parseValidGrade(row.sum_4) ?? '',
        sas: parseValidGrade(row.sas) ?? '',
        rata_rata: stats.rata_rata,
        jumlah_komponen: stats.jumlah_komponen,
        catatan: row.catatan,
      };
    });

    setSaving(true);
    const res = await callApi('saveGrades', { records });
    setSaving(false);
    if (res.success) {
      onToast('success', 'Nilai berhasil disimpan', `${records.length} data nilai siswa diperbarui.`);
      loadAll();
    } else {
      onToast('error', 'Gagal menyimpan nilai', res.message);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Input Nilai Siswa"
        description="Input nilai SUM 1, SUM 2, SUM 3, SUM 4, dan SAS (0–100). Nilai kosong tidak dihitung sebagai 0 dalam rata-rata."
        actions={
          <>
            <SecondaryButton onClick={() => setImportOpen(true)} disabled={classStudents.length === 0}>
              <Upload className="w-4 h-4" />
              Import Excel
            </SecondaryButton>
            <PrimaryButton onClick={handleSave} loading={saving} disabled={classStudents.length === 0}>
              <Save className="w-4 h-4" />
              Simpan Nilai
            </PrimaryButton>
          </>
        }
      />

      {/* Context Selector */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div>
          <label className="block text-xs font-semibold mb-1">Tahun Ajaran</label>
          <select
            value={selectedYearId}
            onChange={(e) => setSelectedYearId(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
          >
            <option value="">-- Tahun Ajaran --</option>
            {years.map((y) => (
              <option key={y.id_tahun_ajaran} value={y.id_tahun_ajaran}>
                {y.nama_tahun_ajaran}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1">Semester</label>
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value as 'Ganjil' | 'Genap')}
            className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
          >
            <option value="Ganjil">Ganjil</option>
            <option value="Genap">Genap</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1">Kelas</label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
          >
            <option value="">{classes.length > 1 ? 'Semua Kelas' : '-- Pilih Kelas --'}</option>
            {classes.map((c) => (
              <option key={c.id_kelas} value={c.id_kelas}>
                {c.nama_kelas}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1">Mata Pelajaran</label>
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
          >
            <option value="">-- Pilih Mapel --</option>
            {subjects
              .filter((m) => m.status_aktif === 'Aktif')
              .map((m) => (
                <option key={m.id_mapel} value={m.id_mapel}>
                  {m.nama_mapel}
                </option>
              ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1">Guru Pengampu</label>
          <select
            value={selectedTeacherId}
            onChange={(e) => setSelectedTeacherId(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
          >
            <option value="">-- Pilih Guru --</option>
            {teachers.map((t) => (
              <option key={t.id_guru} value={t.id_guru}>
                {t.nama_guru}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <TableSkeleton cols={8} rows={5} />
      ) : classStudents.length === 0 ? (
        <EmptyState
          title="Belum ada siswa pada kelas yang dipilih"
          description="Pilih kelas yang memiliki siswa aktif atau tambahkan siswa terlebih dahulu."
        />
      ) : (
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#EDE9FE] text-[#1E1B4B]">
                <tr>
                  <th className="px-3 py-3 font-semibold w-12">No</th>
                  <th className="px-3 py-3 font-semibold min-w-[180px]">Nama Siswa</th>
                  {GRADE_FIELDS.map((f) => (
                    <th key={f.key} className="px-2 py-3 font-semibold text-center w-24">
                      {f.label}
                    </th>
                  ))}
                  <th className="px-3 py-3 font-semibold text-center">Komponen Terisi</th>
                  <th className="px-3 py-3 font-semibold text-right">Rata-rata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {classStudents.map((s, idx) => {
                  const row = draft[s.id_siswa] || {
                    sum_1: '',
                    sum_2: '',
                    sum_3: '',
                    sum_4: '',
                    sas: '',
                    catatan: '',
                  };
                  const stats = computeSubjectGradeStats(row);
                  return (
                    <tr key={s.id_siswa} className="hover:bg-[#F5F3FF]/50">
                      <td className="px-3 py-2.5 tabular-nums text-[#64748B]">{idx + 1}</td>
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-[#1E1B4B]">{s.nama_lengkap}</div>
                        <div className="text-[11px] font-mono text-[#64748B]">
                          {s.nis} · {s.nama_kelas || '-'}
                        </div>
                      </td>
                      {GRADE_FIELDS.map((f) => {
                        const valid = isGradeInputValid(row[f.key]);
                        return (
                          <td key={f.key} className="px-2 py-2.5">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step="0.01"
                              placeholder="-"
                              value={row[f.key]}
                              onChange={(e) =>
                                setDraft((prev) => ({
                                  ...prev,
                                  [s.id_siswa]: {
                                    ...prev[s.id_siswa],
                                    [f.key]: e.target.value,
                                  },
                                }))
                              }
                              className={`w-full px-2 py-1.5 text-center font-mono tabular-nums text-sm border rounded-lg focus:outline-none focus:ring-2 ${
                                valid
                                  ? 'border-[#E5E7EB] focus:ring-[#6D28D9]'
                                  : 'border-[#DC2626] bg-red-50 focus:ring-[#DC2626]'
                              }`}
                            />
                          </td>
                        );
                      })}
                      <td className="px-3 py-2.5 text-center font-mono tabular-nums text-xs text-[#64748B]">
                        {stats.jumlah_komponen} / 5
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums font-bold text-[#6D28D9]">
                        {stats.rata_rata !== null ? formatGradeDisplay(stats.rata_rata) : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ExcelImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import Nilai Mata Pelajaran dari Excel (.xlsx)"
        templateFilename={`Template_Nilai_${subjects.find((m) => m.id_mapel === selectedSubjectId)?.kode_mapel || 'MAPEL'}.xlsx`}
        sheetName="NILAI"
        columns={GRADE_EXCEL_COLS}
        onConfirmImport={async (rows) => {
          const updatedDraft = { ...draft };
          let matched = 0;
          for (const r of rows) {
            const stu = classStudents.find((s) => s.nis === r.nis);
            if (!stu) continue;
            updatedDraft[stu.id_siswa] = {
              sum_1: r.sum_1 || '',
              sum_2: r.sum_2 || '',
              sum_3: r.sum_3 || '',
              sum_4: r.sum_4 || '',
              sas: r.sas || '',
              catatan: r.catatan || '',
            };
            matched++;
          }
          setDraft(updatedDraft);
          onToast('info', 'Pratinjau Import Diterapkan', `${matched} baris nilai dimuat ke tabel. Klik "Simpan Nilai" untuk menyimpan data.`);
        }}
      />
    </div>
  );
}

// ============================================================================
// 5. REKAP NILAI (PER MAPEL, SELURUH MAPEL, GRAFIK, EXCEL & PDF)
// ============================================================================

export function RekapNilaiModule({
  user,
  school,
}: {
  user: AuthUser;
  school: SchoolIdentity;
}) {
  const [tab, setTab] = useState<'per-mapel' | 'semua-mapel' | 'grafik'>('per-mapel');
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<GradeRecord[]>([]);

  const [selectedYearId, setSelectedYearId] = useState(school.tahun_ajaran_aktif_id || '');
  const [selectedSemester, setSelectedSemester] = useState<'Ganjil' | 'Genap'>(
    school.semester_aktif || 'Ganjil'
  );
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [yRes, cRes, mRes, sRes, gRes] = await Promise.all([
        callApi<AcademicYear[]>('getAcademicYears'),
        callApi<ClassRoom[]>('getClasses'),
        callApi<Subject[]>('getSubjects'),
        callApi<Student[]>('getStudents'),
        callApi<GradeRecord[]>('getGradeRecap'),
      ]);
      setLoading(false);
      if (yRes.success && yRes.data) {
        setYears(yRes.data);
        const active = yRes.data.find((y) => y.status === 'Aktif') || yRes.data[0];
        if (!selectedYearId && active) setSelectedYearId(active.id_tahun_ajaran);
      }
      if (cRes.success && cRes.data) {
        setClasses(cRes.data);
        if (cRes.data.length === 1) setSelectedClassId(cRes.data[0].id_kelas);
      }
      if (mRes.success && mRes.data) {
        setSubjects(mRes.data);
        const activeSub = mRes.data.filter((m) => m.status_aktif === 'Aktif');
        if (activeSub.length > 0) setSelectedSubjectId(activeSub[0].id_mapel);
      }
      if (sRes.success && sRes.data) {
        setStudents(sRes.data);
        if (sRes.data.length > 0) setSelectedStudentId(sRes.data[0].id_siswa);
      }
      if (gRes.success && gRes.data) setGrades(gRes.data);
    };
    load();
  }, []);

  const activeSubjects = useMemo(
    () => subjects.filter((m) => m.status_aktif === 'Aktif'),
    [subjects]
  );

  const scopedStudents = useMemo(
    () =>
      students.filter((s) =>
        user.role === 'ORANG_TUA'
          ? true
          : !selectedClassId || s.id_kelas === selectedClassId
      ),
    [students, selectedClassId, user.role]
  );

  useEffect(() => {
    if (scopedStudents.length > 0 && !scopedStudents.some((s) => s.id_siswa === selectedStudentId)) {
      setSelectedStudentId(scopedStudents[0].id_siswa);
    }
  }, [scopedStudents, selectedStudentId]);

  const scopedGrades = useMemo(
    () =>
      grades.filter(
        (g) =>
          (!selectedYearId || g.id_tahun_ajaran === selectedYearId) &&
          g.semester === selectedSemester
      ),
    [grades, selectedYearId, selectedSemester]
  );

  // Per-Mapel rows
  const perMapelRows = useMemo(() => {
    return scopedStudents.map((s) => {
      const rec = scopedGrades.find(
        (g) => g.id_siswa === s.id_siswa && g.id_mapel === selectedSubjectId
      );
      const stats = rec ? computeSubjectGradeStats(rec) : { rata_rata: null, jumlah_komponen: 0 };
      return {
        student: s,
        sum_1: formatGradeDisplay(rec?.sum_1),
        sum_2: formatGradeDisplay(rec?.sum_2),
        sum_3: formatGradeDisplay(rec?.sum_3),
        sum_4: formatGradeDisplay(rec?.sum_4),
        sas: formatGradeDisplay(rec?.sas),
        jumlah_komponen: stats.jumlah_komponen,
        rata_rata: stats.rata_rata,
      };
    });
  }, [scopedStudents, scopedGrades, selectedSubjectId]);

  const classSubjectAverage = useMemo(() => {
    const valid = perMapelRows.filter((r) => r.rata_rata !== null).map((r) => r.rata_rata as number);
    if (valid.length === 0) return null;
    return Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 100) / 100;
  }, [perMapelRows]);

  // All-Subjects Recap
  const enableRanking = school.peringkat_aktif === 'Ya';
  const overallRows = useMemo(
    () => computeOverallGradeRecap(scopedStudents, activeSubjects, scopedGrades, enableRanking),
    [scopedStudents, activeSubjects, scopedGrades, enableRanking]
  );

  const selectedClassObj = classes.find((c) => c.id_kelas === selectedClassId);
  const selectedSubjectObj = activeSubjects.find((m) => m.id_mapel === selectedSubjectId);
  const selectedYearObj = years.find((y) => y.id_tahun_ajaran === selectedYearId);

  const exportPerMapelExcel = () => {
    exportRowsToExcel(
      `Rekap_Nilai_${selectedSubjectObj?.kode_mapel || 'Mapel'}_${selectedClassObj?.nama_kelas || 'Kelas'}.xlsx`,
      'Rekap Nilai Mapel',
      ['No', 'NIS', 'Nama Siswa', 'SUM 1', 'SUM 2', 'SUM 3', 'SUM 4', 'SAS', 'Komponen Terisi', 'Rata-rata'],
      perMapelRows.map((r, i) => [
        i + 1,
        r.student.nis,
        r.student.nama_lengkap,
        r.sum_1,
        r.sum_2,
        r.sum_3,
        r.sum_4,
        r.sas,
        `${r.jumlah_komponen}/5`,
        r.rata_rata !== null ? formatGradeDisplay(r.rata_rata) : '-',
      ])
    );
  };

  const exportPerMapelPdf = () => {
    generatePdfReport({
      orientation: 'landscape',
      title: 'REKAPITULASI NILAI PER MATA PELAJARAN',
      school,
      metaPairs: [
        { label: 'Tahun Ajaran', value: selectedYearObj?.nama_tahun_ajaran || school.tahun_ajaran_aktif || '-' },
        { label: 'Semester', value: selectedSemester },
        { label: 'Kelas', value: selectedClassObj?.nama_kelas || 'Semua Kelas' },
        { label: 'Mata Pelajaran', value: selectedSubjectObj?.nama_mapel || '-' },
      ],
      headers: ['No', 'NIS', 'Nama Siswa', 'SUM 1', 'SUM 2', 'SUM 3', 'SUM 4', 'SAS', 'Terisi', 'Rata-rata'],
      rows: perMapelRows.map((r, i) => [
        i + 1,
        r.student.nis,
        r.student.nama_lengkap,
        r.sum_1,
        r.sum_2,
        r.sum_3,
        r.sum_4,
        r.sas,
        `${r.jumlah_komponen}/5`,
        r.rata_rata !== null ? formatGradeDisplay(r.rata_rata) : '-',
      ]),
      waliKelasName: selectedClassObj?.wali_kelas || '______________________',
      filename: `Rekap_Nilai_${selectedSubjectObj?.kode_mapel || 'Mapel'}.pdf`,
    });
  };

  const exportAllSubjectsExcel = () => {
    const headers = [
      'No',
      'NIS',
      'Nama Siswa',
      ...activeSubjects.map((m) => m.nama_mapel),
      'Rata-rata Keseluruhan',
      ...(enableRanking ? ['Peringkat'] : []),
    ];
    const rows = overallRows.map((r, i) => [
      i + 1,
      r.nis,
      r.nama_lengkap,
      ...activeSubjects.map((m) =>
        r.subjectAverages[m.id_mapel] !== null && r.subjectAverages[m.id_mapel] !== undefined
          ? formatGradeDisplay(r.subjectAverages[m.id_mapel])
          : '-'
      ),
      r.overallAverage !== null ? formatGradeDisplay(r.overallAverage) : '-',
      ...(enableRanking ? [r.rank ?? '-'] : []),
    ]);
    exportRowsToExcel(
      `Rekap_Seluruh_Mapel_${selectedClassObj?.nama_kelas || 'Sekolah'}.xlsx`,
      'Rekap Seluruh Mapel',
      headers,
      rows
    );
  };

  const exportAllSubjectsPdf = () => {
    const headers = [
      'No',
      'Nama Siswa',
      ...activeSubjects.map((m) => m.kode_mapel || m.nama_mapel.slice(0, 8)),
      'Rata-rata',
      ...(enableRanking ? ['Rank'] : []),
    ];
    const rows = overallRows.map((r, i) => [
      i + 1,
      r.nama_lengkap,
      ...activeSubjects.map((m) =>
        r.subjectAverages[m.id_mapel] !== null && r.subjectAverages[m.id_mapel] !== undefined
          ? formatGradeDisplay(r.subjectAverages[m.id_mapel])
          : '-'
      ),
      r.overallAverage !== null ? formatGradeDisplay(r.overallAverage) : '-',
      ...(enableRanking ? [r.rank ?? '-'] : []),
    ]);
    generatePdfReport({
      orientation: 'landscape',
      title: 'REKAPITULASI NILAI SELURUH MATA PELAJARAN',
      school,
      metaPairs: [
        { label: 'Tahun Ajaran', value: selectedYearObj?.nama_tahun_ajaran || school.tahun_ajaran_aktif || '-' },
        { label: 'Semester', value: selectedSemester },
        { label: 'Kelas', value: selectedClassObj?.nama_kelas || 'Semua Kelas' },
      ],
      headers,
      rows,
      waliKelasName: selectedClassObj?.wali_kelas || '______________________',
      filename: `Rekap_Seluruh_Mapel_${new Date().toISOString().slice(0, 10)}.pdf`,
    });
  };

  const exportIndividualStudentPdf = () => {
    const target = students.find((s) => s.id_siswa === selectedStudentId) || scopedStudents[0];
    if (!target) return;
    const rows = activeSubjects.map((m, idx) => {
      const rec = scopedGrades.find(
        (g) => g.id_siswa === target.id_siswa && g.id_mapel === m.id_mapel
      );
      const stats = rec ? computeSubjectGradeStats(rec) : { rata_rata: null, jumlah_komponen: 0 };
      return [
        idx + 1,
        m.nama_mapel,
        formatGradeDisplay(rec?.sum_1),
        formatGradeDisplay(rec?.sum_2),
        formatGradeDisplay(rec?.sum_3),
        formatGradeDisplay(rec?.sum_4),
        formatGradeDisplay(rec?.sas),
        stats.rata_rata !== null ? formatGradeDisplay(stats.rata_rata) : '-',
      ];
    });
    generatePdfReport({
      orientation: 'portrait',
      title: 'LAPORAN HASIL BELAJAR SISWA',
      school,
      metaPairs: [
        { label: 'Nama Siswa', value: target.nama_lengkap },
        { label: 'NIS / NISN', value: `${target.nis} / ${target.nisn || '-'}` },
        { label: 'Kelas', value: target.nama_kelas || '-' },
        { label: 'Tahun Ajaran', value: `${selectedYearObj?.nama_tahun_ajaran || school.tahun_ajaran_aktif || '-'} (${selectedSemester})` },
      ],
      headers: ['No', 'Mata Pelajaran', 'SUM 1', 'SUM 2', 'SUM 3', 'SUM 4', 'SAS', 'Rata-rata'],
      rows,
      filename: `Laporan_Nilai_${target.nama_lengkap.replace(/\s+/g, '_')}.pdf`,
    });
  };

  const individualStudentChartData = useMemo(() => {
    const target = students.find((s) => s.id_siswa === selectedStudentId) || scopedStudents[0];
    if (!target) return [];
    return activeSubjects
      .map((m) => {
        const rec = scopedGrades.find(
          (g) => g.id_siswa === target.id_siswa && g.id_mapel === m.id_mapel
        );
        const stats = rec ? computeSubjectGradeStats(rec) : { rata_rata: null };
        return { label: m.nama_mapel, value: stats.rata_rata };
      })
      .filter((d) => d.value !== null);
  }, [students, scopedStudents, selectedStudentId, activeSubjects, scopedGrades]);

  return (
    <div className="space-y-5">
      <PageHeader
        title={user.role === 'ORANG_TUA' ? 'Nilai Akademik Anak' : 'Rekap & Laporan Nilai'}
        description="Rata-rata dihitung transparan hanya dari komponen nilai yang terisi (SUM 1–4 & SAS). Nilai kosong ditampilkan sebagai '-'."
        actions={
          tab === 'per-mapel' ? (
            <>
              <SecondaryButton onClick={exportPerMapelExcel} disabled={perMapelRows.length === 0}>
                <FileSpreadsheet className="w-4 h-4" />
                Export Excel
              </SecondaryButton>
              <PrimaryButton onClick={exportPerMapelPdf} disabled={perMapelRows.length === 0}>
                <Printer className="w-4 h-4" />
                PDF A4 Landscape
              </PrimaryButton>
            </>
          ) : tab === 'semua-mapel' ? (
            <>
              <SecondaryButton onClick={exportAllSubjectsExcel} disabled={overallRows.length === 0}>
                <FileSpreadsheet className="w-4 h-4" />
                Export Excel
              </SecondaryButton>
              <PrimaryButton onClick={exportAllSubjectsPdf} disabled={overallRows.length === 0}>
                <Printer className="w-4 h-4" />
                PDF A4 Landscape
              </PrimaryButton>
            </>
          ) : (
            <PrimaryButton onClick={exportIndividualStudentPdf} disabled={scopedStudents.length === 0}>
              <Printer className="w-4 h-4" />
              Cetak Rapor Siswa (PDF A4 Portrait)
            </PrimaryButton>
          )
        }
      />

      {/* Tabs + Filters */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-[#F5F3FF] rounded-lg w-fit">
          <button
            type="button"
            onClick={() => setTab('per-mapel')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md cursor-pointer ${
              tab === 'per-mapel' ? 'bg-white text-[#6D28D9] shadow-sm' : 'text-[#64748B]'
            }`}
          >
            Rekap Per Mata Pelajaran
          </button>
          <button
            type="button"
            onClick={() => setTab('semua-mapel')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md cursor-pointer ${
              tab === 'semua-mapel' ? 'bg-white text-[#6D28D9] shadow-sm' : 'text-[#64748B]'
            }`}
          >
            Rekap Seluruh Mata Pelajaran
          </button>
          <button
            type="button"
            onClick={() => setTab('grafik')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md cursor-pointer ${
              tab === 'grafik' ? 'bg-white text-[#6D28D9] shadow-sm' : 'text-[#64748B]'
            }`}
          >
            Laporan Per Siswa & Grafik
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <select
            value={selectedYearId}
            onChange={(e) => setSelectedYearId(e.target.value)}
            className="px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
          >
            <option value="">Semua Tahun Ajaran</option>
            {years.map((y) => (
              <option key={y.id_tahun_ajaran} value={y.id_tahun_ajaran}>
                {y.nama_tahun_ajaran}
              </option>
            ))}
          </select>
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value as 'Ganjil' | 'Genap')}
            className="px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
          >
            <option value="Ganjil">Semester Ganjil</option>
            <option value="Genap">Semester Genap</option>
          </select>
          {user.role !== 'ORANG_TUA' && (
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
            >
              <option value="">Semua Kelas</option>
              {classes.map((c) => (
                <option key={c.id_kelas} value={c.id_kelas}>
                  {c.nama_kelas}
                </option>
              ))}
            </select>
          )}
          {tab === 'per-mapel' && (
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
            >
              <option value="">-- Pilih Mata Pelajaran --</option>
              {activeSubjects.map((m) => (
                <option key={m.id_mapel} value={m.id_mapel}>
                  {m.nama_mapel}
                </option>
              ))}
            </select>
          )}
          {tab === 'grafik' && (
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
            >
              {scopedStudents.map((s) => (
                <option key={s.id_siswa} value={s.id_siswa}>
                  {s.nama_lengkap} ({s.nama_kelas})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {loading ? (
        <TableSkeleton cols={8} rows={5} />
      ) : tab === 'per-mapel' ? (
        perMapelRows.length === 0 ? (
          <EmptyState title="Belum ada data nilai pada filter ini" />
        ) : (
          <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E5E7EB] flex flex-wrap items-center justify-between gap-2 text-xs text-[#64748B]">
              <span>
                Mata Pelajaran: <strong className="text-[#1E1B4B]">{selectedSubjectObj?.nama_mapel || '-'}</strong>
              </span>
              <span className="tabular-nums">
                Rata-rata Kelas:{' '}
                <strong className="text-[#6D28D9]">
                  {classSubjectAverage !== null ? formatGradeDisplay(classSubjectAverage) : '-'}
                </strong>
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#EDE9FE] text-[#1E1B4B]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">No</th>
                    <th className="px-4 py-3 font-semibold">Nama Siswa</th>
                    <th className="px-3 py-3 font-semibold text-right">SUM 1</th>
                    <th className="px-3 py-3 font-semibold text-right">SUM 2</th>
                    <th className="px-3 py-3 font-semibold text-right">SUM 3</th>
                    <th className="px-3 py-3 font-semibold text-right">SUM 4</th>
                    <th className="px-3 py-3 font-semibold text-right">SAS</th>
                    <th className="px-3 py-3 font-semibold text-center">Terisi</th>
                    <th className="px-4 py-3 font-semibold text-right">Rata-rata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {perMapelRows.map((r, i) => (
                    <tr key={r.student.id_siswa} className="hover:bg-[#F5F3FF]/50">
                      <td className="px-4 py-3 tabular-nums text-[#64748B]">{i + 1}</td>
                      <td className="px-4 py-3 font-medium text-[#1E1B4B]">
                        <div>{r.student.nama_lengkap}</div>
                        <div className="text-[11px] text-[#64748B] font-normal">{r.student.nama_kelas || '-'}</div>
                      </td>
                      <td className="px-3 py-3 text-right font-mono tabular-nums">{r.sum_1}</td>
                      <td className="px-3 py-3 text-right font-mono tabular-nums">{r.sum_2}</td>
                      <td className="px-3 py-3 text-right font-mono tabular-nums">{r.sum_3}</td>
                      <td className="px-3 py-3 text-right font-mono tabular-nums">{r.sum_4}</td>
                      <td className="px-3 py-3 text-right font-mono tabular-nums">{r.sas}</td>
                      <td className="px-3 py-3 text-center font-mono tabular-nums text-xs text-[#64748B]">
                        {r.jumlah_komponen}/5
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums font-bold text-[#6D28D9]">
                        {r.rata_rata !== null ? formatGradeDisplay(r.rata_rata) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : tab === 'semua-mapel' ? (
        overallRows.length === 0 || activeSubjects.length === 0 ? (
          <EmptyState
            title="Belum ada data rekap seluruh mata pelajaran"
            description="Pastikan mata pelajaran aktif dan data siswa tersedia."
          />
        ) : (
          <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#EDE9FE] text-[#1E1B4B]">
                  <tr>
                    <th className="px-3 py-3 font-semibold">No</th>
                    <th className="px-4 py-3 font-semibold min-w-[180px]">Nama Siswa</th>
                    {activeSubjects.map((m) => (
                      <th key={m.id_mapel} className="px-3 py-3 font-semibold text-right whitespace-nowrap">
                        {m.nama_mapel}
                      </th>
                    ))}
                    <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">
                      Rata-rata Keseluruhan
                    </th>
                    {enableRanking && (
                      <th className="px-3 py-3 font-semibold text-center">Peringkat</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {overallRows.map((r, idx) => (
                    <tr key={r.id_siswa} className="hover:bg-[#F5F3FF]/50">
                      <td className="px-3 py-3 tabular-nums text-[#64748B]">{idx + 1}</td>
                      <td className="px-4 py-3 font-medium text-[#1E1B4B] whitespace-nowrap">
                        <div>{r.nama_lengkap}</div>
                        <div className="text-[11px] text-[#64748B] font-normal">
                          {students.find((s) => s.id_siswa === r.id_siswa)?.nama_kelas || '-'}
                        </div>
                      </td>
                      {activeSubjects.map((m) => {
                        const val = r.subjectAverages[m.id_mapel];
                        return (
                          <td key={m.id_mapel} className="px-3 py-3 text-right font-mono tabular-nums">
                            {val !== null && val !== undefined ? formatGradeDisplay(val) : '-'}
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-right font-mono tabular-nums font-bold text-[#6D28D9]">
                        {r.overallAverage !== null ? formatGradeDisplay(r.overallAverage) : '-'}
                      </td>
                      {enableRanking && (
                        <td className="px-3 py-3 text-center font-mono tabular-nums font-bold text-[#1E1B4B]">
                          {r.rank ?? '-'}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
          <h3 className="text-base font-bold text-[#1E1B4B] mb-1">
            Grafik Capaian Nilai Per Mata Pelajaran
          </h3>
          <p className="text-xs text-[#64748B] mb-4">
            Menampilkan rata-rata nilai aktual per mata pelajaran untuk siswa terpilih.
          </p>
          {individualStudentChartData.length > 0 ? (
            <div className="h-72">
              <Bar
                data={{
                  labels: individualStudentChartData.map((d) => d.label),
                  datasets: [
                    {
                      label: 'Rata-rata Nilai',
                      data: individualStudentChartData.map((d) => d.value),
                      backgroundColor: '#6D28D9',
                      borderRadius: 6,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: { y: { min: 0, max: 100 } },
                }}
              />
            </div>
          ) : (
            <EmptyState title="Belum ada nilai tercatat untuk siswa ini" />
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 6. JURNAL GURU
// ============================================================================

export function JurnalModule({
  user,
  school,
  onToast,
}: {
  user: AuthUser;
  school: SchoolIdentity;
  onToast: ToastFn;
}) {
  const [journals, setJournals] = useState<TeacherJournal[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterClass, setFilterClass] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TeacherJournal | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TeacherJournal | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<TeacherJournal>>({
    tanggal: new Date().toISOString().slice(0, 10),
  });

  const canEdit = user.role === 'ADMIN' || user.role === 'GURU';

  const loadData = async () => {
    setLoading(true);
    const [jRes, cRes, mRes, tRes] = await Promise.all([
      callApi<TeacherJournal[]>('getJournals'),
      callApi<ClassRoom[]>('getClasses'),
      callApi<Subject[]>('getSubjects'),
      callApi<Teacher[]>('getTeachers'),
    ]);
    setLoading(false);
    if (jRes.success && jRes.data) setJournals(jRes.data);
    else if (!jRes.success) onToast('error', 'Gagal memuat jurnal', jRes.message);
    if (cRes.success && cRes.data) setClasses(cRes.data);
    if (mRes.success && mRes.data) setSubjects(mRes.data);
    if (tRes.success && tRes.data) setTeachers(tRes.data);
  };

  useEffect(() => {
    loadData();
  }, []);

  const eligibleTeachers = useMemo(
    () => teachers.filter((t) => !isNonTeachingPersonnel(t.mata_pelajaran, t.jabatan)),
    [teachers]
  );

  const nonTeachingTeacherIds = useMemo(
    () =>
      new Set(
        teachers
          .filter((t) => isNonTeachingPersonnel(t.mata_pelajaran, t.jabatan))
          .map((t) => t.id_guru)
          .filter(Boolean)
      ),
    [teachers]
  );

  const nonTeachingTeacherNames = useMemo(
    () =>
      new Set(
        teachers
          .filter((t) => isNonTeachingPersonnel(t.mata_pelajaran, t.jabatan))
          .map((t) => (t.nama_guru || '').trim().toLowerCase())
          .filter(Boolean)
      ),
    [teachers]
  );

  const eligibleTeacherIds = useMemo(
    () => new Set(eligibleTeachers.map((t) => t.id_guru).filter(Boolean)),
    [eligibleTeachers]
  );

  const normText = (v?: string) => String(v || '').trim().replace(/\s+/g, ' ').toLowerCase();

  const filtered = journals.filter((j) => {
    if (j.id_guru && nonTeachingTeacherIds.has(j.id_guru)) return false;
    if (
      (!j.id_guru || !eligibleTeacherIds.has(j.id_guru)) &&
      j.nama_guru &&
      nonTeachingTeacherNames.has(normText(j.nama_guru))
    ) {
      return false;
    }
    if (filterClass) {
      const selectedClsObj = classes.find((c) => c.id_kelas === filterClass);
      const sameCls =
        j.id_kelas === filterClass ||
        (selectedClsObj && normText(j.nama_kelas) === normText(selectedClsObj.nama_kelas));
      if (!sameCls) return false;
    }
    if (filterSubject && j.id_mapel !== filterSubject) return false;
    return true;
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cls =
      classes.find((c) => c.id_kelas === form.id_kelas) ||
      classes.find(
        (c) => form.nama_kelas && normText(c.nama_kelas) === normText(form.nama_kelas)
      );
    const sub =
      subjects.find((s) => s.id_mapel === form.id_mapel) ||
      subjects.find(
        (s) => form.nama_mapel && normText(s.nama_mapel) === normText(form.nama_mapel)
      );
    const tch =
      eligibleTeachers.find((t) => t.id_guru === form.id_guru) ||
      eligibleTeachers.find(
        (t) => form.nama_guru && normText(t.nama_guru) === normText(form.nama_guru)
      );
    const targetJournalId = String(editing?.id_jurnal || form.id_jurnal || '').trim();
    if (editing && !targetJournalId) {
      onToast('error', 'Gagal memperbarui', 'ID jurnal tidak ditemukan. Muat ulang data terlebih dahulu.');
      return;
    }
    const payload: Partial<TeacherJournal> = {
      ...form,
      id_jurnal: editing ? targetJournalId : undefined,
      tanggal: normalizeRecordDateYmd(form.tanggal) || getTodayLocalYmd(),
      id_kelas: cls?.id_kelas || form.id_kelas || '',
      nama_kelas: cls?.nama_kelas || form.nama_kelas || '',
      id_mapel: sub?.id_mapel || form.id_mapel || '',
      nama_mapel: sub?.nama_mapel || form.nama_mapel || '',
      id_guru: tch?.id_guru || form.id_guru || '',
      nama_guru: tch?.nama_guru || form.nama_guru || user.nama_lengkap,
    };
    setSaving(true);
    const res = editing
      ? await callApi('updateJournal', payload)
      : await callApi('createJournal', payload);
    setSaving(false);
    if (res.success) {
      onToast('success', editing ? 'Jurnal diperbarui' : 'Jurnal ditambahkan');
      setFormOpen(false);
      setEditing(null);
      loadData();
    } else {
      onToast('error', 'Gagal menyimpan', res.message);
    }
  };

  const openEditJournal = (j: TeacherJournal) => {
    const matchedTeacher =
      eligibleTeachers.find((t) => j.id_guru && t.id_guru === j.id_guru) ||
      eligibleTeachers.find(
        (t) => j.nama_guru && normText(t.nama_guru) === normText(j.nama_guru)
      );
    const matchedClass =
      classes.find((c) => j.id_kelas && c.id_kelas === j.id_kelas) ||
      classes.find(
        (c) => j.nama_kelas && normText(c.nama_kelas) === normText(j.nama_kelas)
      );
    const matchedSubj =
      subjects.find((m) => j.id_mapel && m.id_mapel === j.id_mapel) ||
      subjects.find(
        (m) =>
          j.nama_mapel &&
          (normText(m.nama_mapel) === normText(j.nama_mapel) ||
            normText(m.kode_mapel) === normText(j.nama_mapel))
      );
    setEditing(j);
    setForm({
      ...j,
      id_jurnal: j.id_jurnal,
      tanggal: normalizeRecordDateYmd(j.tanggal) || getTodayLocalYmd(),
      id_guru: matchedTeacher?.id_guru || j.id_guru || '',
      nama_guru: matchedTeacher?.nama_guru || j.nama_guru || '',
      id_kelas: matchedClass?.id_kelas || j.id_kelas || '',
      nama_kelas: matchedClass?.nama_kelas || j.nama_kelas || '',
      id_mapel: matchedSubj?.id_mapel || j.id_mapel || '',
      nama_mapel: matchedSubj?.nama_mapel || j.nama_mapel || '',
    });
    setFormOpen(true);
  };

  const handlePrintPdf = () => {
    const uniqueTeachers = Array.from(
      new Set(filtered.map((j) => String(j.nama_guru || '').trim()).filter(Boolean))
    );
    const uniqueClasses = Array.from(
      new Set(filtered.map((j) => String(j.nama_kelas || '').trim()).filter(Boolean))
    );
    const selectedClsName = filterClass
      ? classes.find((c) => c.id_kelas === filterClass)?.nama_kelas || ''
      : '';
    const guruMeta =
      uniqueTeachers.length === 1
        ? uniqueTeachers[0]
        : uniqueTeachers.length > 1
        ? uniqueTeachers.slice(0, 3).join(', ') + (uniqueTeachers.length > 3 ? ', dll.' : '')
        : user.role === 'GURU'
        ? user.nama_lengkap
        : '-';
    const kelasMeta =
      selectedClsName ||
      (uniqueClasses.length === 1
        ? uniqueClasses[0]
        : uniqueClasses.length > 1
        ? uniqueClasses.join(', ')
        : 'Semua Kelas');

    const sortedJournals = filtered
      .map((item, idx) => ({
        item,
        idx,
        dateKey: normalizeRecordDateYmd(item.tanggal) || String(item.tanggal || '').trim() || '-',
      }))
      .sort((a, b) => {
        if (a.dateKey === '-' && b.dateKey !== '-') return 1;
        if (a.dateKey !== '-' && b.dateKey === '-') return -1;
        const cmp = a.dateKey.localeCompare(b.dateKey);
        return cmp !== 0 ? cmp : a.idx - b.idx;
      });

    const dateGroups: { dateLabel: string; items: TeacherJournal[] }[] = [];
    for (const entry of sortedJournals) {
      const lastGroup = dateGroups[dateGroups.length - 1];
      if (lastGroup && lastGroup.dateLabel === entry.dateKey) {
        lastGroup.items.push(entry.item);
      } else {
        dateGroups.push({ dateLabel: entry.dateKey, items: [entry.item] });
      }
    }

    const MAX_SPAN_PER_CHUNK = 8;
    const pdfRows: RowInput[] = [];
    let rowNumber = 1;

    for (const group of dateGroups) {
      for (let start = 0; start < group.items.length; start += MAX_SPAN_PER_CHUNK) {
        const chunk = group.items.slice(start, start + MAX_SPAN_PER_CHUNK);
        chunk.forEach((j, idxInChunk) => {
          const currentNo = rowNumber++;
          const tailCells = [
            j.nama_mapel || '-',
            j.materi || '-',
            j.tujuan_pembelajaran || '-',
            j.aktivitas || '-',
            j.metode || '-',
            j.refleksi || '-',
            j.tindak_lanjut || '-',
          ];
          if (idxInChunk === 0) {
            pdfRows.push([
              currentNo,
              chunk.length > 1
                ? {
                    content: group.dateLabel,
                    rowSpan: chunk.length,
                    styles: {
                      valign: 'middle',
                      halign: 'center',
                      fontStyle: 'bold',
                      fillColor: [255, 255, 255],
                    },
                  }
                : {
                    content: group.dateLabel,
                    styles: { halign: 'center' },
                  },
              ...tailCells,
            ]);
          } else {
            pdfRows.push([currentNo, ...tailCells]);
          }
        });
      }
    }

    generatePdfReport({
      orientation: 'landscape',
      title: 'JURNAL KEGIATAN MENGAJAR GURU',
      school,
      metaPairs: [
        { label: 'Nama Guru', value: guruMeta },
        { label: 'Kelas', value: kelasMeta },
        { label: 'Tahun Ajaran', value: school.tahun_ajaran_aktif || '-' },
        { label: 'Semester', value: school.semester_aktif },
      ],
      headers: [
        'No',
        'Tanggal',
        'Mapel',
        'Materi Pokok',
        'Tujuan Pembelajaran',
        'Aktivitas Pembelajaran',
        'Metode',
        'Refleksi',
        'Tindak Lanjut',
      ],
      rows: pdfRows,
      columnStyles: {
        0: { halign: 'center', cellWidth: 9 },
        1: { halign: 'center', cellWidth: 22 },
        2: { cellWidth: 28 },
      },
      waliKelasName: uniqueTeachers.length === 1 ? uniqueTeachers[0] : undefined,
      filename: `Jurnal_Guru_${new Date().toISOString().slice(0, 10)}.pdf`,
    });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Jurnal Mengajar Guru"
        description="Catatan materi, tujuan pembelajaran, aktivitas, metode, refleksi, dan tindak lanjut."
        actions={
          <>
            <SecondaryButton disabled={filtered.length === 0} onClick={handlePrintPdf}>
              <Printer className="w-4 h-4" />
              Cetak PDF
            </SecondaryButton>
            {canEdit && (
              <PrimaryButton
                onClick={() => {
                  const matchedTeacher =
                    user.role === 'GURU' ? findLoggedTeacher(eligibleTeachers, user) : undefined;
                  const defaultTeacher =
                    matchedTeacher ||
                    eligibleTeachers.find((t) => user.role === 'GURU' && t.id_guru === user.relasi_id) ||
                    eligibleTeachers[0];
                  const defaultClass = classes[0];
                  const matchedSubject =
                    findMatchingSubjectForTeacher(defaultTeacher, subjects) || subjects[0];
                  setEditing(null);
                  setForm({
                    tanggal: getTodayLocalYmd(),
                    id_guru: defaultTeacher?.id_guru || '',
                    nama_guru: defaultTeacher?.nama_guru || '',
                    id_kelas: defaultClass?.id_kelas || '',
                    nama_kelas: defaultClass?.nama_kelas || '',
                    id_mapel: matchedSubject?.id_mapel || '',
                    nama_mapel: matchedSubject?.nama_mapel || '',
                    materi: '',
                    tujuan_pembelajaran: '',
                    aktivitas: '',
                    metode: '',
                    refleksi: '',
                    tindak_lanjut: '',
                  });
                  setFormOpen(true);
                }}
              >
                <Plus className="w-4 h-4" />
                Tambah Jurnal
              </PrimaryButton>
            )}
          </>
        }
      />

      <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <select
          value={filterClass}
          onChange={(e) => setFilterClass(e.target.value)}
          className="px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
        >
          <option value="">Semua Kelas</option>
          {classes.map((c) => (
            <option key={c.id_kelas} value={c.id_kelas}>
              {c.nama_kelas}
            </option>
          ))}
        </select>
        <select
          value={filterSubject}
          onChange={(e) => setFilterSubject(e.target.value)}
          className="px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
        >
          <option value="">Semua Mata Pelajaran</option>
          {subjects.map((m) => (
            <option key={m.id_mapel} value={m.id_mapel}>
              {m.nama_mapel}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <TableSkeleton cols={6} rows={4} />
      ) : filtered.length === 0 ? (
        <EmptyState title="Belum ada catatan jurnal guru" />
      ) : (
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#EDE9FE] text-[#1E1B4B]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Tanggal</th>
                  <th className="px-4 py-3 font-semibold">Guru / Kelas</th>
                  <th className="px-4 py-3 font-semibold">Mata Pelajaran</th>
                  <th className="px-4 py-3 font-semibold">Materi & Tujuan</th>
                  <th className="px-4 py-3 font-semibold">Refleksi & Tindak Lanjut</th>
                  {canEdit && <th className="px-4 py-3 font-semibold text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {filtered.map((j, idx) => (
                  <tr key={j.id_jurnal || `${j.tanggal}-${idx}`} className="hover:bg-[#F5F3FF]/50 align-top">
                    <td className="px-4 py-3 font-mono text-xs tabular-nums whitespace-nowrap">
                      {j.tanggal}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="font-semibold text-[#1E1B4B]">{j.nama_guru}</div>
                      <div className="text-[#64748B]">{j.nama_kelas}</div>
                    </td>
                    <td className="px-4 py-3 font-medium">{j.nama_mapel}</td>
                    <td className="px-4 py-3 text-xs max-w-xs">
                      <div className="font-semibold text-[#1E1B4B]">{j.materi}</div>
                      <div className="text-[#64748B] mt-0.5">{j.tujuan_pembelajaran}</div>
                    </td>
                    <td className="px-4 py-3 text-xs max-w-xs text-[#64748B]">
                      <div>{j.refleksi || '-'}</div>
                      {j.tindak_lanjut && <div className="text-[#6D28D9] mt-0.5">TL: {j.tindak_lanjut}</div>}
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-1">
                          <button
                            type="button"
                            onClick={() => openEditJournal(j)}
                            title="Edit Jurnal"
                            aria-label="Edit Jurnal"
                            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#6D28D9] hover:bg-[#EDE9FE] cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(j)}
                            title="Hapus Jurnal"
                            aria-label="Hapus Jurnal"
                            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#DC2626] hover:bg-red-50 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        title={editing ? 'Edit Jurnal Guru' : 'Tambah Jurnal Guru'}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1">Tanggal</label>
            <input
              type="date"
              required
              value={form.tanggal || ''}
              onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Guru</label>
            <select
              required={eligibleTeachers.length > 0}
              value={form.id_guru || ''}
              onChange={(e) => {
                const nextId = e.target.value;
                const tch = eligibleTeachers.find((t) => t.id_guru === nextId);
                setForm((prev) => ({
                  ...prev,
                  id_guru: nextId,
                  nama_guru: tch?.nama_guru || prev.nama_guru || '',
                }));
              }}
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
            >
              <option value="">-- Pilih Guru --</option>
              {form.id_guru && !eligibleTeachers.some((t) => t.id_guru === form.id_guru) && (
                <option value={form.id_guru}>{form.nama_guru || form.id_guru}</option>
              )}
              {eligibleTeachers.map((t) => (
                <option key={t.id_guru} value={t.id_guru}>
                  {t.nama_guru}
                </option>
              ))}
            </select>
            {eligibleTeachers.length === 0 && (
              <p className="text-[11px] text-[#D97706] mt-1">
                Data guru pengajar belum tersedia.
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Kelas</label>
            <select
              required
              value={form.id_kelas || ''}
              onChange={(e) => {
                const nextId = e.target.value;
                const cls = classes.find((c) => c.id_kelas === nextId);
                setForm((prev) => ({
                  ...prev,
                  id_kelas: nextId,
                  nama_kelas: cls?.nama_kelas || prev.nama_kelas || '',
                }));
              }}
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
            >
              <option value="">-- Pilih Kelas --</option>
              {form.id_kelas && !classes.some((c) => c.id_kelas === form.id_kelas) && (
                <option value={form.id_kelas}>{form.nama_kelas || form.id_kelas}</option>
              )}
              {classes.map((c) => (
                <option key={c.id_kelas} value={c.id_kelas}>
                  {c.nama_kelas}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Mata Pelajaran</label>
            <select
              required
              value={form.id_mapel || ''}
              onChange={(e) => {
                const nextId = e.target.value;
                const sub = subjects.find((m) => m.id_mapel === nextId);
                setForm((prev) => ({
                  ...prev,
                  id_mapel: nextId,
                  nama_mapel: sub?.nama_mapel || prev.nama_mapel || '',
                }));
              }}
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
            >
              <option value="">-- Pilih Mapel --</option>
              {form.id_mapel && !subjects.some((m) => m.id_mapel === form.id_mapel) && (
                <option value={form.id_mapel}>{form.nama_mapel || form.id_mapel}</option>
              )}
              {subjects.map((m) => (
                <option key={m.id_mapel} value={m.id_mapel}>
                  {m.nama_mapel}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold mb-1">Materi Pokok *</label>
            <input
              type="text"
              required
              value={form.materi || ''}
              onChange={(e) => setForm({ ...form, materi: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold mb-1">Tujuan Pembelajaran</label>
            <textarea
              rows={2}
              value={form.tujuan_pembelajaran || ''}
              onChange={(e) => setForm({ ...form, tujuan_pembelajaran: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Aktivitas Pembelajaran</label>
            <textarea
              rows={2}
              value={form.aktivitas || ''}
              onChange={(e) => setForm({ ...form, aktivitas: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Metode Pembelajaran</label>
            <textarea
              rows={2}
              value={form.metode || ''}
              onChange={(e) => setForm({ ...form, metode: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Refleksi</label>
            <textarea
              rows={2}
              value={form.refleksi || ''}
              onChange={(e) => setForm({ ...form, refleksi: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Tindak Lanjut</label>
            <textarea
              rows={2}
              value={form.tindak_lanjut || ''}
              onChange={(e) => setForm({ ...form, tindak_lanjut: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
            />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-2 pt-2 border-t border-[#E5E7EB]">
            <SecondaryButton
              onClick={() => {
                setFormOpen(false);
                setEditing(null);
              }}
            >
              Batal
            </SecondaryButton>
            <PrimaryButton type="submit" loading={saving}>
              Simpan Jurnal
            </PrimaryButton>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          setSaving(true);
          const res = await callApi('deleteJournal', {
            id_jurnal: deleteTarget.id_jurnal,
            tanggal: deleteTarget.tanggal,
            materi: deleteTarget.materi,
          });
          setSaving(false);
          if (res.success) {
            onToast('success', 'Jurnal dihapus');
            setDeleteTarget(null);
            loadData();
          } else {
            onToast('error', 'Gagal menghapus jurnal', res.message);
          }
        }}
        loading={saving}
        title="Hapus Jurnal"
        message="Hapus catatan jurnal mengajar ini?"
      />
    </div>
  );
}
