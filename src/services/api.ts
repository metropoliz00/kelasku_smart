import {
  AcademicYear,
  AchievementRecord,
  ActivityLog,
  AgendaItem,
  ApiResponse,
  AttendanceRecord,
  AuthUser,
  ClassRoom,
  ConnectionMode,
  CounselingRecord,
  DashboardSummary,
  DocumentationItem,
  GradeRecord,
  HealthRecord,
  InventoryItem,
  LiaisonMessage,
  PicketSchedule,
  ScheduleItem,
  SchoolIdentity,
  SessionData,
  Student,
  Subject,
  Teacher,
  TeacherJournal,
  UserRole,
  isPaiOrPjok,
  isKepalaSekolah,
  isNonWaliTeacher,
  findMatchingClassForSubject,
  resolveTeacherClassAssignment,
  generateNextSubjectId,
  suggestSubjectCode,
  generateNextClassId,
  inferTingkatFromClassName,
  compareClassesByName,
  AttendanceStatus,
} from '../types';
import { computeSubjectGradeStats } from '../utils/gradeMath';

const STORAGE_KEYS = {
  GAS_URL: 'kelasku_smart_gas_url',
  CONFIG_GAS_URL: 'kelasku_smart_config_gas_url',
  LOCAL_MODE: 'kelasku_smart_local_mode',
  SESSION: 'kelasku_smart_session',
  LOCAL_DB: 'kelasku_smart_local_db_v1',
};

let sessionLocalModeOverride: boolean | null = null;

export function getDefaultGasUrl(): string {
  const windowUrl = (window.KELASKU_CONFIG?.GAS_WEB_APP_URL || '').trim();
  if (windowUrl) return windowUrl;
  return (import.meta.env.VITE_GAS_WEB_APP_URL || '').trim();
}

export function getConfiguredGasUrl(): string {
  const windowUrl = (window.KELASKU_CONFIG?.GAS_WEB_APP_URL || '').trim();
  const desktopUrl = (window.kelaskuDesktop?.initialGasUrl || '').trim();
  const desktopLocalMode = Boolean(window.kelaskuDesktop?.initialLocalMode);
  const lastConfigUrl = localStorage.getItem(STORAGE_KEYS.CONFIG_GAS_URL);

  if (windowUrl && lastConfigUrl !== windowUrl) {
    localStorage.setItem(STORAGE_KEYS.CONFIG_GAS_URL, windowUrl);
    if (!desktopUrl && !desktopLocalMode) {
      localStorage.removeItem(STORAGE_KEYS.GAS_URL);
      localStorage.removeItem(STORAGE_KEYS.LOCAL_MODE);
    }
  }

  const override = localStorage.getItem(STORAGE_KEYS.GAS_URL);
  const isLocalActive =
    sessionLocalModeOverride !== null
      ? sessionLocalModeOverride
      : localStorage.getItem(STORAGE_KEYS.LOCAL_MODE) === 'true' ||
        (desktopLocalMode && (!override || override.trim() === ''));

  if (isLocalActive) {
    return '';
  }

  if (override !== null && override.trim() !== '') {
    return override.trim();
  }
  if (desktopUrl) {
    return desktopUrl;
  }
  if (windowUrl) {
    return windowUrl;
  }
  return (import.meta.env.VITE_GAS_WEB_APP_URL || '').trim();
}

export function isUsingCustomGasUrl(): boolean {
  const active = getConfiguredGasUrl();
  const def = getDefaultGasUrl();
  return Boolean(active && active !== def);
}

export function validateGasWebAppUrl(rawUrl: string): { valid: boolean; cleaned: string; message?: string } {
  const cleaned = rawUrl.trim();
  if (!cleaned) {
    return { valid: false, cleaned, message: 'Masukkan URL Web App Google Apps Script.' };
  }
  let parsed: URL;
  try {
    parsed = new URL(cleaned);
  } catch {
    return {
      valid: false,
      cleaned,
      message: 'Format URL tidak valid. Pastikan diawali https://script.google.com/macros/s/.../exec',
    };
  }
  if (!/^https?:$/i.test(parsed.protocol)) {
    return { valid: false, cleaned, message: 'URL harus menggunakan protokol https://.' };
  }
  if (/\/dev(?:$|\?)/i.test(parsed.pathname)) {
    return {
      valid: false,
      cleaned,
      message: 'URL berakhiran /dev adalah tautan uji coba. Gunakan URL Web App produksi yang berakhiran /exec.',
    };
  }
  return { valid: true, cleaned };
}

export function setConfiguredGasUrl(url: string): void {
  const clean = url.trim();
  const windowUrl = (window.KELASKU_CONFIG?.GAS_WEB_APP_URL || '').trim();
  if (windowUrl) {
    localStorage.setItem(STORAGE_KEYS.CONFIG_GAS_URL, windowUrl);
  }
  sessionLocalModeOverride = false;
  if (clean) {
    if (clean === windowUrl && !window.kelaskuDesktop?.isDesktop) {
      localStorage.removeItem(STORAGE_KEYS.GAS_URL);
    } else {
      localStorage.setItem(STORAGE_KEYS.GAS_URL, clean);
    }
    localStorage.removeItem(STORAGE_KEYS.LOCAL_MODE);
    void window.kelaskuDesktop?.setGasUrl?.(clean);
  } else {
    localStorage.removeItem(STORAGE_KEYS.GAS_URL);
    void window.kelaskuDesktop?.resetGasUrl?.();
  }
}

export function resetGasUrlToDefault(): string {
  sessionLocalModeOverride = false;
  localStorage.removeItem(STORAGE_KEYS.GAS_URL);
  localStorage.removeItem(STORAGE_KEYS.LOCAL_MODE);
  void window.kelaskuDesktop?.resetGasUrl?.();
  return getDefaultGasUrl();
}

export function isLocalModeEnabled(): boolean {
  const override = localStorage.getItem(STORAGE_KEYS.GAS_URL);
  if (sessionLocalModeOverride !== null) {
    return sessionLocalModeOverride;
  }
  const localFlag =
    localStorage.getItem(STORAGE_KEYS.LOCAL_MODE) === 'true' ||
    (Boolean(window.kelaskuDesktop?.initialLocalMode) && (!override || override.trim() === ''));
  return localFlag;
}

export function enableLocalMode(): void {
  sessionLocalModeOverride = true;
  localStorage.removeItem(STORAGE_KEYS.GAS_URL);
  localStorage.setItem(STORAGE_KEYS.LOCAL_MODE, 'true');
  void window.kelaskuDesktop?.setLocalMode?.(true);
}

export function disableLocalMode(): void {
  sessionLocalModeOverride = false;
  localStorage.removeItem(STORAGE_KEYS.LOCAL_MODE);
  void window.kelaskuDesktop?.setLocalMode?.(false);
}

export function getConnectionMode(): ConnectionMode {
  if (getConfiguredGasUrl()) return 'GAS';
  if (isLocalModeEnabled()) return 'LOCAL';
  return 'UNCONFIGURED';
}

export function getStoredSession(): SessionData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSION);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionData;
    if (!parsed?.token || !parsed?.user) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setStoredSession(session: SessionData | null): void {
  if (session) {
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
  } else {
    localStorage.removeItem(STORAGE_KEYS.SESSION);
  }
}

// ============================================================================
// LOCAL BROWSER STORAGE ENGINE (100% KOSONG AWAL - TANPA DATA DUMMY)
// Digunakan hanya jika pengguna mengaktifkan Mode Uji Lokal sebelum menghubungkan GAS
// ============================================================================

interface LocalUserRow extends AuthUser {
  password: string;
}

interface LocalDatabase {
  USERS: LocalUserRow[];
  IDENTITAS_SEKOLAH: SchoolIdentity[];
  TAHUN_AJARAN: AcademicYear[];
  SISWA: Student[];
  GURU: Teacher[];
  KELAS: ClassRoom[];
  MAPEL: Subject[];
  JADWAL: ScheduleItem[];
  PIKET: PicketSchedule[];
  ABSENSI: AttendanceRecord[];
  NILAI: GradeRecord[];
  JURNAL: TeacherJournal[];
  KARAKTER: Record<string, unknown>[];
  KESEHATAN: HealthRecord[];
  BIMBINGAN: CounselingRecord[];
  PRESTASI: AchievementRecord[];
  AGENDA: AgendaItem[];
  PENGHUBUNG: LiaisonMessage[];
  INVENTARIS: InventoryItem[];
  DOKUMENTASI: DocumentationItem[];
  LOG_AKTIVITAS: ActivityLog[];
}

function getEmptyLocalDb(): LocalDatabase {
  return {
    USERS: [],
    IDENTITAS_SEKOLAH: [],
    TAHUN_AJARAN: [],
    SISWA: [],
    GURU: [],
    KELAS: [],
    MAPEL: [],
    JADWAL: [],
    PIKET: [],
    ABSENSI: [],
    NILAI: [],
    JURNAL: [],
    KARAKTER: [],
    KESEHATAN: [],
    BIMBINGAN: [],
    PRESTASI: [],
    AGENDA: [],
    PENGHUBUNG: [],
    INVENTARIS: [],
    DOKUMENTASI: [],
    LOG_AKTIVITAS: [],
  };
}

function loadLocalDb(): LocalDatabase {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LOCAL_DB);
    if (!raw) return getEmptyLocalDb();
    return { ...getEmptyLocalDb(), ...JSON.parse(raw) };
  } catch {
    return getEmptyLocalDb();
  }
}

function saveLocalDb(db: LocalDatabase): void {
  localStorage.setItem(STORAGE_KEYS.LOCAL_DB, JSON.stringify(db));
}

function genId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .substring(2, 6)
    .toUpperCase()}`;
}

function pickSubjectField(raw: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    if (raw[k] !== undefined && raw[k] !== null && String(raw[k]).trim() !== '') {
      return raw[k];
    }
  }
  const normalizedEntries = Object.entries(raw).map(([k, v]) => [
    k
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, ''),
    v,
  ] as const);
  for (const k of keys) {
    const found = normalizedEntries.find(
      ([nk, v]) => nk === k && v !== undefined && v !== null && String(v).trim() !== ''
    );
    if (found) return found[1];
  }
  return undefined;
}

function normalizeSubjectRecord(
  raw: Record<string, unknown>,
  _idx: number,
  pool: Partial<Subject>[]
): Subject {
  const rawId = String(
    pickSubjectField(raw, ['id_mapel', 'id', 'mapel_id', 'id_mata_pelajaran']) ?? ''
  ).trim();
  const kode = String(
    pickSubjectField(raw, ['kode_mapel', 'kode', 'kode_mata_pelajaran', 'kd_mapel']) ?? ''
  )
    .trim()
    .toUpperCase();
  const nama = String(
    pickSubjectField(raw, ['nama_mapel', 'nama_mata_pelajaran', 'mata_pelajaran', 'mapel', 'nama']) ?? ''
  ).trim();
  const kelompokRaw = String(
    pickSubjectField(raw, ['kelompok', 'kategori', 'kelompok_mapel']) ?? 'Wajib'
  ).trim();
  const kelompok: Subject['kelompok'] =
    kelompokRaw === 'Muatan Lokal' || kelompokRaw === 'Pengembangan Diri'
      ? kelompokRaw
      : 'Wajib';
  const alokasiRaw = Number(
    pickSubjectField(raw, ['alokasi_waktu', 'alokasi', 'alokasi_jp', 'alokasi_waktu_jp', 'jp']) ?? 2
  );
  const statusRaw = String(
    pickSubjectField(raw, ['status_aktif', 'status', 'aktif']) ?? 'Aktif'
  ).trim();
  const status_aktif: Subject['status_aktif'] =
    statusRaw.toLowerCase() === 'nonaktif' ? 'Nonaktif' : 'Aktif';

  const id_mapel = rawId || generateNextSubjectId(pool);
  return {
    id_mapel,
    kode_mapel: kode || suggestSubjectCode(nama, pool),
    nama_mapel: nama,
    kelompok,
    alokasi_waktu: Number.isFinite(alokasiRaw) && alokasiRaw > 0 ? alokasiRaw : 2,
    status_aktif,
    created_at: String(pickSubjectField(raw, ['created_at', 'dibuat_pada']) ?? ''),
    updated_at: String(pickSubjectField(raw, ['updated_at', 'diperbarui_pada']) ?? ''),
  };
}

function normalizeSubjectList(list: Record<string, unknown>[]): Subject[] {
  const result: Subject[] = [];
  for (let i = 0; i < list.length; i++) {
    const normalized = normalizeSubjectRecord(list[i] || {}, i, result);
    result.push(normalized);
  }
  return result;
}

function normalizeClassRecord(
  raw: Record<string, unknown>,
  _idx: number,
  pool: Partial<ClassRoom>[]
): ClassRoom {
  const rawId = String(
    pickSubjectField(raw, ['id_kelas', 'class_id', 'id', 'kode_kelas']) ?? ''
  ).trim();
  const nama_kelas = String(
    pickSubjectField(raw, ['nama_kelas', 'kelas', 'nama', 'rombel', 'nama_rombel']) ?? ''
  ).trim();
  const rawTingkat = String(
    pickSubjectField(raw, ['tingkat', 'grade', 'jenjang', 'level']) ?? ''
  ).trim();
  const tingkat = rawTingkat || inferTingkatFromClassName(nama_kelas) || '1';
  const wali_kelas_id = String(
    pickSubjectField(raw, ['wali_kelas_id', 'id_wali_kelas', 'id_guru']) ?? ''
  ).trim();
  const wali_kelas = String(
    pickSubjectField(raw, ['wali_kelas', 'nama_wali_kelas']) ?? ''
  ).trim();
  const id_tahun_ajaran = String(
    pickSubjectField(raw, ['id_tahun_ajaran', 'tahun_ajaran_id']) ?? ''
  ).trim();
  const tahun_ajaran = String(
    pickSubjectField(raw, ['tahun_ajaran', 'nama_tahun_ajaran']) ?? ''
  ).trim();
  const jumlahRaw = pickSubjectField(raw, ['jumlah_siswa', 'total_siswa']);
  const jumlah_siswa =
    jumlahRaw !== undefined && !Number.isNaN(Number(jumlahRaw)) ? Number(jumlahRaw) : undefined;

  return {
    id_kelas: rawId || generateNextClassId(pool),
    nama_kelas,
    tingkat,
    wali_kelas_id,
    wali_kelas,
    id_tahun_ajaran,
    tahun_ajaran,
    ...(jumlah_siswa !== undefined ? { jumlah_siswa } : {}),
    created_at: String(pickSubjectField(raw, ['created_at', 'dibuat_pada']) ?? ''),
    updated_at: String(pickSubjectField(raw, ['updated_at', 'diperbarui_pada']) ?? ''),
  };
}

function normalizeClassList(list: Record<string, unknown>[]): ClassRoom[] {
  const result: ClassRoom[] = [];
  for (let i = 0; i < list.length; i++) {
    const normalized = normalizeClassRecord(list[i] || {}, i, result);
    result.push(normalized);
  }
  return result;
}

function getDefaultScheduleTime(jamKe?: string, isEnd = false): string {
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

function formatScheduleTime(val: unknown, jamKe?: string, isEnd = false): string {
  const raw = String(val ?? '').trim();
  if (!raw || raw.includes('1899-12-30')) {
    return getDefaultScheduleTime(jamKe, isEnd);
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
  return getDefaultScheduleTime(jamKe, isEnd);
}

function normalizeTeacherRecord(raw: Record<string, unknown>, idx: number): Teacher {
  const rawNo = pickSubjectField(raw, ['no']);
  const noValue: string | number =
    typeof rawNo === 'number' || (typeof rawNo === 'string' && rawNo.trim() !== '')
      ? rawNo
      : idx + 1;

  return {
    ...(raw as unknown as Teacher),
    no: noValue,
    id_guru: String(pickSubjectField(raw, ['id_guru', 'guru_id', 'id']) ?? '').trim(),
    nama_guru: String(pickSubjectField(raw, ['nama_guru', 'nama', 'guru']) ?? '').trim(),
    nip: String(pickSubjectField(raw, ['nip']) ?? '').trim(),
    nuptk: String(pickSubjectField(raw, ['nuptk']) ?? '').trim(),
    jabatan: String(pickSubjectField(raw, ['jabatan']) ?? '').trim(),
    mata_pelajaran: String(pickSubjectField(raw, ['mata_pelajaran', 'mapel', 'nama_mapel']) ?? '').trim(),
    id_kelas: String(pickSubjectField(raw, ['id_kelas', 'class_id']) ?? '').trim(),
    wali_kelas_id: String(pickSubjectField(raw, ['wali_kelas_id', 'id_wali_kelas']) ?? '').trim(),
    wali_kelas: String(pickSubjectField(raw, ['wali_kelas', 'nama_wali_kelas']) ?? '').trim(),
    username: String(pickSubjectField(raw, ['username']) ?? '').trim(),
    status_akun:
      String(pickSubjectField(raw, ['status_akun', 'status']) ?? 'Aktif').trim().toLowerCase() === 'nonaktif'
        ? 'Nonaktif'
        : 'Aktif',
    foto_url: String(pickSubjectField(raw, ['foto_url']) ?? '').trim(),
  };
}

function normalizeTeacherList(list: Record<string, unknown>[]): Teacher[] {
  return list.map((item, i) => normalizeTeacherRecord(item || {}, i));
}

function normalizeScheduleRecord(raw: Record<string, unknown>): ScheduleItem {
  const semRaw = String(pickSubjectField(raw, ['semester']) ?? 'Ganjil').trim().toLowerCase();
  const semester: ScheduleItem['semester'] = semRaw === 'genap' ? 'Genap' : 'Ganjil';
  const hariRaw = String(pickSubjectField(raw, ['hari', 'day']) ?? 'Senin').trim();
  const validDays: ScheduleItem['hari'][] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const matchedDay =
    validDays.find((d) => d.toLowerCase() === hariRaw.toLowerCase()) || 'Senin';

  return {
    id_jadwal: String(pickSubjectField(raw, ['id_jadwal', 'jadwal_id', 'id']) ?? '').trim(),
    id_tahun_ajaran: String(pickSubjectField(raw, ['id_tahun_ajaran', 'tahun_ajaran_id']) ?? '').trim(),
    semester,
    hari: matchedDay,
    jam_ke: String(pickSubjectField(raw, ['jam_ke', 'jam']) ?? '1').trim(),
    waktu_mulai: formatScheduleTime(
      pickSubjectField(raw, ['waktu_mulai', 'jam_mulai', 'mulai']),
      String(pickSubjectField(raw, ['jam_ke', 'jam']) ?? '1'),
      false
    ),
    waktu_selesai: formatScheduleTime(
      pickSubjectField(raw, ['waktu_selesai', 'jam_selesai', 'selesai']),
      String(pickSubjectField(raw, ['jam_ke', 'jam']) ?? '1'),
      true
    ),
    id_kelas: String(pickSubjectField(raw, ['id_kelas', 'class_id']) ?? '').trim(),
    nama_kelas: String(pickSubjectField(raw, ['nama_kelas', 'kelas']) ?? '').trim(),
    id_mapel: String(pickSubjectField(raw, ['id_mapel', 'mapel_id']) ?? '').trim(),
    nama_mapel: String(pickSubjectField(raw, ['nama_mapel', 'mata_pelajaran', 'mapel']) ?? '').trim(),
    id_guru: String(pickSubjectField(raw, ['id_guru', 'guru_id']) ?? '').trim(),
    nama_guru: String(pickSubjectField(raw, ['nama_guru', 'guru_pengampu', 'guru']) ?? '').trim(),
    created_at: String(pickSubjectField(raw, ['created_at']) ?? ''),
    updated_at: String(pickSubjectField(raw, ['updated_at']) ?? ''),
  };
}

function normalizeScheduleList(list: Record<string, unknown>[]): ScheduleItem[] {
  return list.map((item) => normalizeScheduleRecord(item || {}));
}

function normalizeChecklistField(raw: unknown): string {
  if (raw === null || raw === undefined || raw === '') return '{}';
  if (typeof raw === 'object') {
    try {
      return JSON.stringify(raw);
    } catch {
      return '{}';
    }
  }
  const str = String(raw).trim();
  if (!str) return '{}';
  try {
    const parsed = JSON.parse(str);
    if (parsed && typeof parsed === 'object') {
      return JSON.stringify(parsed);
    }
  } catch {
    const obj: Record<string, boolean> = {};
    str
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((t) => {
        obj[t] = true;
      });
    return JSON.stringify(obj);
  }
  return '{}';
}

function normalizePicketRecord(raw: Record<string, unknown>): PicketSchedule {
  const hariRaw = String(pickSubjectField(raw, ['hari', 'day']) ?? 'Senin').trim();
  const validDays: PicketSchedule['hari'][] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const matchedDay = validDays.find((d) => d.toLowerCase() === hariRaw.toLowerCase()) || 'Senin';

  return {
    id_piket: String(pickSubjectField(raw, ['id_piket', 'piket_id', 'id']) ?? '').trim(),
    hari: matchedDay,
    id_kelas: String(pickSubjectField(raw, ['id_kelas', 'class_id']) ?? '').trim(),
    nama_kelas: String(pickSubjectField(raw, ['nama_kelas', 'kelas', 'rombel']) ?? '').trim(),
    id_guru: String(pickSubjectField(raw, ['id_guru', 'guru_id']) ?? '').trim(),
    nama_guru: String(pickSubjectField(raw, ['nama_guru', 'guru_pembina', 'pembina', 'guru']) ?? '').trim(),
    id_siswa: String(
      pickSubjectField(raw, ['id_siswa', 'siswa_id', 'id_siswa_petugas', 'petugas_siswa_id']) ?? ''
    ).trim(),
    petugas_siswa: String(
      pickSubjectField(raw, ['petugas_siswa', 'nama_siswa', 'siswa', 'petugas']) ?? ''
    ).trim(),
    tugas: String(pickSubjectField(raw, ['tugas', 'uraian_tugas', 'daftar_tugas']) ?? '').trim(),
    checklist_kebersihan: normalizeChecklistField(
      pickSubjectField(raw, ['checklist_kebersihan', 'checklist', 'ceklist_kebersihan', 'status_checklist'])
    ),
    keterangan: String(pickSubjectField(raw, ['keterangan', 'waktu', 'shift']) ?? '').trim(),
    created_at: String(pickSubjectField(raw, ['created_at']) ?? ''),
    updated_at: String(pickSubjectField(raw, ['updated_at']) ?? ''),
  };
}

function normalizePicketList(list: Record<string, unknown>[]): PicketSchedule[] {
  return list.map((item) => normalizePicketRecord(item || {}));
}

function normalizeYmdDate(val: unknown): string {
  if (typeof val === 'number' && !Number.isNaN(val) && val > 20000 && val < 80000) {
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
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

function normalizeAttendanceStatus(val: unknown): AttendanceStatus {
  const raw = String(val ?? '').trim().toLowerCase();
  if (raw === 'sakit' || raw === 's') return 'Sakit';
  if (raw === 'izin' || raw === 'i') return 'Izin';
  if (raw === 'alpa' || raw === 'alfa' || raw === 'alpha' || raw === 'a') return 'Alpha';
  if (raw === 'terlambat' || raw === 'telat' || raw === 't') return 'Hadir';
  return 'Hadir';
}

function normalizeStudentRecord(raw: Record<string, unknown>): Student {
  const statusRaw = String(pickSubjectField(raw, ['status_siswa', 'status']) ?? 'Aktif').trim();
  const validStatuses: Student['status_siswa'][] = ['Aktif', 'Pindah', 'Lulus', 'Nonaktif'];
  const status_siswa =
    validStatuses.find((st) => st.toLowerCase() === statusRaw.toLowerCase()) || 'Aktif';
  return {
    ...(raw as unknown as Student),
    id_siswa: String(pickSubjectField(raw, ['id_siswa', 'siswa_id', 'id']) ?? '').trim(),
    nis: String(pickSubjectField(raw, ['nis']) ?? '').trim(),
    nisn: String(pickSubjectField(raw, ['nisn']) ?? '').trim(),
    nama_lengkap: String(
      pickSubjectField(raw, ['nama_lengkap', 'nama_siswa', 'nama']) ?? ''
    ).trim(),
    id_kelas: String(pickSubjectField(raw, ['id_kelas', 'class_id', 'kelas_id']) ?? '').trim(),
    nama_kelas: String(pickSubjectField(raw, ['nama_kelas', 'kelas', 'rombel']) ?? '').trim(),
    status_siswa,
  };
}

function normalizeStudentList(list: Record<string, unknown>[]): Student[] {
  return list.map((item) => normalizeStudentRecord(item || {}));
}

function normalizeAttendanceRecord(raw: Record<string, unknown>): AttendanceRecord {
  const semRaw = String(pickSubjectField(raw, ['semester', 'smt']) ?? 'Ganjil').trim().toLowerCase();
  const semester: AttendanceRecord['semester'] = semRaw === 'genap' ? 'Genap' : 'Ganjil';
  return {
    id_absensi: String(pickSubjectField(raw, ['id_absensi', 'absensi_id', 'id']) ?? '').trim(),
    tanggal: normalizeYmdDate(pickSubjectField(raw, ['tanggal', 'tgl', 'date'])),
    id_tahun_ajaran: String(
      pickSubjectField(raw, ['id_tahun_ajaran', 'tahun_ajaran_id']) ?? ''
    ).trim(),
    semester,
    id_kelas: String(pickSubjectField(raw, ['id_kelas', 'class_id', 'kelas_id']) ?? '').trim(),
    nama_kelas: String(pickSubjectField(raw, ['nama_kelas', 'kelas', 'rombel']) ?? '').trim(),
    id_siswa: String(pickSubjectField(raw, ['id_siswa', 'siswa_id']) ?? '').trim(),
    nama_siswa: String(
      pickSubjectField(raw, ['nama_siswa', 'nama_lengkap', 'siswa', 'nama']) ?? ''
    ).trim(),
    status: normalizeAttendanceStatus(
      pickSubjectField(raw, ['status', 'status_kehadiran', 'kehadiran'])
    ),
    keterangan: String(pickSubjectField(raw, ['keterangan', 'catatan', 'ket']) ?? '').trim(),
    koreksi_catatan: String(
      pickSubjectField(raw, ['koreksi_catatan', 'catatan_koreksi', 'koreksi']) ?? ''
    ).trim(),
    diinput_oleh: String(pickSubjectField(raw, ['diinput_oleh', 'input_by', 'petugas']) ?? '').trim(),
    created_at: String(pickSubjectField(raw, ['created_at', 'dibuat_pada']) ?? ''),
    updated_at: String(pickSubjectField(raw, ['updated_at', 'diperbarui_pada']) ?? ''),
  };
}

function normalizeAttendanceList(list: Record<string, unknown>[]): AttendanceRecord[] {
  return list.map((item) => normalizeAttendanceRecord(item || {}));
}

function normalizeJournalRecord(raw: Record<string, unknown>): TeacherJournal {
  return {
    id_jurnal: String(pickSubjectField(raw, ['id_jurnal', 'jurnal_id', 'id']) ?? '').trim(),
    tanggal: normalizeYmdDate(pickSubjectField(raw, ['tanggal', 'tgl', 'date'])),
    id_guru: String(pickSubjectField(raw, ['id_guru', 'guru_id']) ?? '').trim(),
    nama_guru: String(
      pickSubjectField(raw, ['nama_guru', 'guru', 'pengajar', 'nama_pengajar']) ?? ''
    ).trim(),
    id_kelas: String(pickSubjectField(raw, ['id_kelas', 'class_id', 'kelas_id']) ?? '').trim(),
    nama_kelas: String(pickSubjectField(raw, ['nama_kelas', 'kelas', 'rombel']) ?? '').trim(),
    id_mapel: String(
      pickSubjectField(raw, ['id_mapel', 'mapel_id', 'id_mata_pelajaran']) ?? ''
    ).trim(),
    nama_mapel: String(
      pickSubjectField(raw, ['nama_mapel', 'mata_pelajaran', 'mapel']) ?? ''
    ).trim(),
    materi: String(pickSubjectField(raw, ['materi', 'materi_pokok']) ?? '').trim(),
    tujuan_pembelajaran: String(
      pickSubjectField(raw, ['tujuan_pembelajaran', 'tujuan']) ?? ''
    ).trim(),
    aktivitas: String(
      pickSubjectField(raw, ['aktivitas', 'aktivitas_pembelajaran', 'kegiatan']) ?? ''
    ).trim(),
    metode: String(pickSubjectField(raw, ['metode', 'metode_pembelajaran']) ?? '').trim(),
    refleksi: String(pickSubjectField(raw, ['refleksi']) ?? '').trim(),
    tindak_lanjut: String(pickSubjectField(raw, ['tindak_lanjut', 'tl']) ?? '').trim(),
    created_at: String(pickSubjectField(raw, ['created_at', 'dibuat_pada']) ?? ''),
    updated_at: String(pickSubjectField(raw, ['updated_at', 'diperbarui_pada']) ?? ''),
  };
}

function normalizeJournalList(list: Record<string, unknown>[]): TeacherJournal[] {
  return list.map((item) => normalizeJournalRecord(item || {}));
}

function sanitizeUser(u: LocalUserRow): AuthUser {
  return {
    id_user: u.id_user,
    username: u.username,
    nama_lengkap: u.nama_lengkap,
    role: u.role,
    relasi_id: u.relasi_id || '',
    relasi_nama: u.relasi_nama || '',
    status: u.status,
    foto_url: u.foto_url || '',
    created_at: u.created_at,
    updated_at: u.updated_at,
  };
}

function addLocalLog(
  db: LocalDatabase,
  user: AuthUser,
  aksi: string,
  modul: string,
  detail: string
): void {
  const now = new Date().toISOString();
  db.LOG_AKTIVITAS.push({
    id_log: genId('LOG'),
    waktu: now,
    id_user: user.id_user,
    username: user.username,
    role: user.role,
    aksi,
    modul,
    detail,
    created_at: now,
  });
}

function findLocalTeacherRecord(db: LocalDatabase, user: AuthUser): Teacher | undefined {
  const uname = String(user.username || '').trim().toLowerCase();
  const relName = String(user.relasi_nama || '').trim().toLowerCase();
  return (
    db.GURU.find((g) => user.relasi_id && g.id_guru === user.relasi_id) ||
    db.GURU.find((g) => uname !== '' && String(g.username || '').trim().toLowerCase() === uname) ||
    db.GURU.find((g) => uname !== '' && String(g.nip || '').trim().toLowerCase() === uname) ||
    db.GURU.find((g) => relName !== '' && String(g.nama_guru || '').trim().toLowerCase() === relName)
  );
}

function getLocalTeacherAccessScope(
  db: LocalDatabase,
  user: AuthUser
): { isFullAccess: boolean; classIds: Set<string>; teacher?: Teacher } {
  const classIds = new Set<string>();
  if (user.role !== 'GURU') {
    return { isFullAccess: false, classIds };
  }

  const teacher = findLocalTeacherRecord(db, user);
  const teacherId = teacher?.id_guru || user.relasi_id;

  // Jika guru Mapel (PAI, PJOK, Mapel lain) atau Kepala Sekolah: akses semua kelas 1 s/d 6 (bukan wali kelas)
  const rawIdKelas = String(teacher?.id_kelas || '').trim().toUpperCase();
  if (
    isNonWaliTeacher(teacher?.mata_pelajaran, teacher?.jabatan) ||
    rawIdKelas === 'SEMUA_KELAS' ||
    rawIdKelas === 'ALL'
  ) {
    db.KELAS.forEach((c) => classIds.add(c.id_kelas));
    return { isFullAccess: true, classIds, teacher };
  }

  // Jika guru kelas 1 s/d 6: sebagai walikelas untuk kelasnya
  if (teacherId) {
    db.KELAS.forEach((c) => {
      if (c.wali_kelas_id === teacherId) classIds.add(c.id_kelas);
    });
  }
  if (teacher?.wali_kelas_id && teacher.wali_kelas_id !== 'SEMUA_KELAS' && teacher.wali_kelas_id !== 'ALL') {
    classIds.add(teacher.wali_kelas_id);
  }
  if (teacher?.id_kelas && teacher.id_kelas !== 'SEMUA_KELAS' && teacher.id_kelas !== 'ALL') {
    String(teacher.id_kelas)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((cid) => classIds.add(cid));
  }
  if (classIds.size === 0 && teacher) {
    const inferred = findMatchingClassForSubject(teacher.mata_pelajaran, teacher.jabatan, db.KELAS);
    if (inferred) classIds.add(inferred.id_kelas);
  }
  if (teacherId) {
    db.JADWAL.forEach((j) => {
      if (j.id_guru === teacherId && j.id_kelas) classIds.add(j.id_kelas);
    });
  }
  return { isFullAccess: false, classIds, teacher };
}

function syncLocalTeacherWithClasses(db: LocalDatabase, teacher: Teacher): void {
  const isNonWali = isNonWaliTeacher(teacher.mata_pelajaran, teacher.jabatan);
  db.KELAS.forEach((c) => {
    if (c.wali_kelas_id === teacher.id_guru && (isNonWali || c.id_kelas !== teacher.wali_kelas_id)) {
      c.wali_kelas_id = '';
      c.wali_kelas = '';
    }
  });
  if (!isNonWali && teacher.wali_kelas_id) {
    db.GURU.forEach((g) => {
      if (g.id_guru !== teacher.id_guru && g.wali_kelas_id === teacher.wali_kelas_id) {
        g.wali_kelas_id = '';
        g.wali_kelas = '';
        if (g.id_kelas === teacher.wali_kelas_id) g.id_kelas = '';
      }
    });
    const cIdx = db.KELAS.findIndex((c) => c.id_kelas === teacher.wali_kelas_id);
    if (cIdx !== -1) {
      db.KELAS[cIdx].wali_kelas_id = teacher.id_guru;
      db.KELAS[cIdx].wali_kelas = teacher.nama_guru;
    }
  }
}

function buildFallbackUsernameFromName(name: unknown, fallbackId: string): string {
  const cleaned = stripAcademicTitles(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
  if (cleaned) return cleaned.slice(0, 20);
  return String(fallbackId || 'user')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function syncLocalMasterUsers(
  db: LocalDatabase,
  options?: { syncTeacherStatusId?: string; syncStudentStatusId?: string }
): number {
  const now = new Date().toISOString();
  let changes = 0;

  db.GURU.forEach((g) => {
    if (!String(g.id_guru || '').trim()) {
      g.id_guru = genId('GRU');
      changes++;
    }
  });
  db.SISWA.forEach((s) => {
    if (!String(s.id_siswa || '').trim()) {
      s.id_siswa = genId('SIS');
      changes++;
    }
  });
  db.USERS.forEach((u) => {
    if (!String(u.id_user || '').trim()) {
      u.id_user = genId('USR');
      changes++;
    }
  });

  const usedUsernames = new Set<string>();
  db.USERS.forEach((u) => {
    const uname = normSyncText(u.username);
    if (uname) usedUsernames.add(uname);
  });
  const matchedUserIds = new Set<string>();

  const allocateUniqueUsername = (base: string, fallbackId: string): string => {
    const rawBase = String(base || '').trim() || buildFallbackUsernameFromName('', fallbackId);
    let candidate = rawBase;
    let suffix = 2;
    while (usedUsernames.has(normSyncText(candidate))) {
      candidate = `${rawBase}_${suffix}`;
      suffix++;
    }
    usedUsernames.add(normSyncText(candidate));
    return candidate;
  };

  const kepsekTeachers = db.GURU.filter((g) => isKepalaSekolah(g.mata_pelajaran, g.jabatan));

  // 1. Sinkronkan setiap GURU -> USERS (role GURU / KEPALA_SEKOLAH)
  db.GURU.forEach((t) => {
    const expectedRole: UserRole = isKepalaSekolah(t.mata_pelajaran, t.jabatan) ? 'KEPALA_SEKOLAH' : 'GURU';
    const cleanNip = String(t.nip || '').trim();
    const validNip = cleanNip && cleanNip !== '-' ? cleanNip : '';
    const cleanUname = String(t.username || '').trim();
    const tNameNorm = normSyncText(t.nama_guru);
    const tNameClean = stripAcademicTitles(t.nama_guru);
    const expectedStatus: 'Aktif' | 'Nonaktif' =
      String(t.status_akun || 'Aktif').trim().toLowerCase() === 'nonaktif' ? 'Nonaktif' : 'Aktif';

    const teacherUsers = db.USERS.filter(
      (u) => !matchedUserIds.has(u.id_user) && (u.role === 'GURU' || u.role === 'KEPALA_SEKOLAH')
    );

    let matched =
      teacherUsers.find((u) => u.relasi_id === t.id_guru) ||
      (cleanUname
        ? teacherUsers.find((u) => normSyncText(u.username) === normSyncText(cleanUname))
        : undefined) ||
      (validNip
        ? teacherUsers.find((u) => normSyncText(u.username) === normSyncText(validNip))
        : undefined) ||
      teacherUsers.find(
        (u) =>
          !u.relasi_id &&
          ((tNameNorm &&
            (normSyncText(u.relasi_nama) === tNameNorm || normSyncText(u.nama_lengkap) === tNameNorm)) ||
            (tNameClean &&
              (stripAcademicTitles(u.relasi_nama) === tNameClean ||
                stripAcademicTitles(u.nama_lengkap) === tNameClean)))
      );

    if (!matched && expectedRole === 'KEPALA_SEKOLAH' && kepsekTeachers.length === 1) {
      matched = teacherUsers.find((u) => u.role === 'KEPALA_SEKOLAH' && !u.relasi_id);
    }

    if (matched) {
      matchedUserIds.add(matched.id_user);
      let rowChanged = false;
      if (matched.relasi_id !== t.id_guru) {
        matched.relasi_id = t.id_guru;
        rowChanged = true;
      }
      if (matched.relasi_nama !== t.nama_guru) {
        matched.relasi_nama = t.nama_guru;
        rowChanged = true;
      }
      if (matched.role !== expectedRole) {
        matched.role = expectedRole;
        rowChanged = true;
      }
      if (!String(matched.nama_lengkap || '').trim() && t.nama_guru) {
        matched.nama_lengkap = t.nama_guru;
        rowChanged = true;
      }
      if (!String(matched.foto_url || '').trim() && t.foto_url) {
        matched.foto_url = t.foto_url;
        rowChanged = true;
      }
      if (!String(matched.password || '').trim()) {
        matched.password = validNip || matched.username || 'guru123';
        rowChanged = true;
      }
      if (options?.syncTeacherStatusId === t.id_guru && matched.status !== expectedStatus) {
        matched.status = expectedStatus;
        rowChanged = true;
      }
      if (!cleanUname && matched.username) {
        t.username = matched.username;
        changes++;
      }
      if (rowChanged) {
        matched.updated_at = now;
        changes++;
      }
    } else {
      const baseUsername =
        cleanUname || validNip || buildFallbackUsernameFromName(t.nama_guru, t.id_guru);
      const username = allocateUniqueUsername(baseUsername, t.id_guru);
      const password = validNip || username || 'guru123';
      if (!cleanUname) {
        t.username = username;
      }
      db.USERS.push({
        id_user: genId('USR'),
        username,
        password,
        nama_lengkap: String(t.nama_guru || username).trim(),
        role: expectedRole,
        relasi_id: t.id_guru,
        relasi_nama: String(t.nama_guru || '').trim(),
        status: expectedStatus,
        foto_url: String(t.foto_url || ''),
        created_at: now,
        updated_at: now,
      });
      changes++;
    }
  });

  // 2. Sinkronkan setiap SISWA -> USERS (role ORANG_TUA)
  db.SISWA.forEach((s) => {
    const cleanNis = String(s.nis || '').trim();
    const cleanNisn = String(s.nisn || '').trim();
    const sNameNorm = normSyncText(s.nama_lengkap);
    const expectedStatus: 'Aktif' | 'Nonaktif' =
      !s.status_siswa || s.status_siswa === 'Aktif' ? 'Aktif' : 'Nonaktif';

    const parentUsers = db.USERS.filter(
      (u) => !matchedUserIds.has(u.id_user) && u.role === 'ORANG_TUA'
    );

    const matched =
      parentUsers.find((u) => u.relasi_id === s.id_siswa) ||
      (cleanNis
        ? parentUsers.find((u) => normSyncText(u.username) === normSyncText(cleanNis))
        : undefined) ||
      (cleanNisn
        ? parentUsers.find((u) => normSyncText(u.username) === normSyncText(cleanNisn))
        : undefined) ||
      parentUsers.find((u) => {
        if (u.relasi_id) return false;
        const cleaned = String(u.relasi_nama || u.nama_lengkap || '')
          .replace(/^(wali\s+dari|orang\s+tua\s+dari|orang\s+tua|ortu)\s+/i, '')
          .trim();
        return sNameNorm !== '' && normSyncText(cleaned) === sNameNorm;
      });

    if (matched) {
      matchedUserIds.add(matched.id_user);
      let rowChanged = false;
      if (matched.relasi_id !== s.id_siswa) {
        matched.relasi_id = s.id_siswa;
        rowChanged = true;
      }
      if (matched.relasi_nama !== s.nama_lengkap) {
        matched.relasi_nama = s.nama_lengkap;
        rowChanged = true;
      }
      if (!String(matched.nama_lengkap || '').trim() && s.nama_lengkap) {
        matched.nama_lengkap = `Wali dari ${s.nama_lengkap}`;
        rowChanged = true;
      }
      if (!String(matched.foto_url || '').trim() && s.foto_url) {
        matched.foto_url = s.foto_url;
        rowChanged = true;
      }
      if (!String(matched.password || '').trim()) {
        matched.password = cleanNis || cleanNisn || matched.username || 'siswa123';
        rowChanged = true;
      }
      if (options?.syncStudentStatusId === s.id_siswa && matched.status !== expectedStatus) {
        matched.status = expectedStatus;
        rowChanged = true;
      }
      if (rowChanged) {
        matched.updated_at = now;
        changes++;
      }
    } else {
      const baseUsername =
        cleanNis || cleanNisn || buildFallbackUsernameFromName(s.nama_lengkap, s.id_siswa);
      const username = allocateUniqueUsername(baseUsername, s.id_siswa);
      const password = cleanNis || cleanNisn || username || 'siswa123';
      db.USERS.push({
        id_user: genId('USR'),
        username,
        password,
        nama_lengkap: `Wali dari ${String(s.nama_lengkap || username).trim()}`,
        role: 'ORANG_TUA',
        relasi_id: s.id_siswa,
        relasi_nama: String(s.nama_lengkap || '').trim(),
        status: expectedStatus,
        foto_url: String(s.foto_url || ''),
        created_at: now,
        updated_at: now,
      });
      changes++;
    }
  });

  return changes;
}

function syncLocalTeacherUserRole(db: LocalDatabase, teacher: Teacher): void {
  syncLocalMasterUsers(db, { syncTeacherStatusId: teacher.id_guru });
}

function requireLocalRole(user: AuthUser, roles: UserRole[]): void {
  if (!roles.includes(user.role)) {
    throw new Error(`Akses ditolak untuk role ${user.role}.`);
  }
}

function normSyncText(val: unknown): string {
  return String(val ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function compactClassKey(val: unknown): string {
  return normSyncText(val)
    .replace(/^(kelas|rombel|kls)\s+/i, '')
    .replace(/[\s\-_]+/g, '');
}

function stripAcademicTitles(name: unknown): string {
  let s = normSyncText(name);
  if (!s) return '';
  s = s.replace(/^(drs\.?|dr\.?|prof\.?|ir\.?|h\.?|hj\.?)\s+/g, '');
  s = s.replace(/,\s*(s\.?pd\.?i?|m\.?pd|s\.?ag|s\.?or|s\.?kom|s\.?si|s\.?e|s\.?h|m\.?m|m\.?ag|gr\.?|a\.?ma).*$/g, '');
  return s.replace(/[.,]+/g, '').replace(/\s+/g, ' ').trim();
}

interface IdSyncReport {
  total_updated_rows: number;
  updated_sheets: string[];
  details: Record<string, number>;
}

function reorderLocalClassIds(
  db: LocalDatabase,
  actorUser?: AuthUser
): {
  classes: ClassRoom[];
  idRemap: Record<string, string>;
  changed: boolean;
  classChangedCount: number;
  cascadeDetails: Record<string, number>;
  report: IdSyncReport;
} {
  const normalized = normalizeClassList(db.KELAS as unknown as Record<string, unknown>[]);
  const indexed = normalized.map((c, origIdx) => ({ c, origIdx }));
  indexed.sort((a, b) => {
    const cmp = compareClassesByName(a.c, b.c);
    return cmp !== 0 ? cmp : a.origIdx - b.origIdx;
  });

  let orderChanged = false;
  let idOrTingkatChanged = false;
  let classChangedCount = 0;
  const idRemap: Record<string, string> = {};
  const classByNewId = new Map<string, ClassRoom>();
  const classByName = new Map<string, ClassRoom>();
  const classByCompact = new Map<string, ClassRoom | null>();

  const sortedClasses: ClassRoom[] = indexed.map((entry, idx) => {
    if (entry.origIdx !== idx) orderChanged = true;
    const expectedId = `KLS-${String(idx + 1).padStart(3, '0')}`;
    const origRaw = db.KELAS[entry.origIdx];
    const origId = String(origRaw?.id_kelas || '').trim();
    const curTingkat = String(entry.c.tingkat || '').trim();
    const nextTingkat = curTingkat || inferTingkatFromClassName(entry.c.nama_kelas) || '1';

    if (origId !== expectedId) {
      idOrTingkatChanged = true;
      classChangedCount++;
      if (origId) idRemap[origId] = expectedId;
    } else if (String(origRaw?.tingkat || '').trim() !== nextTingkat) {
      idOrTingkatChanged = true;
      classChangedCount++;
    }

    const updatedCls: ClassRoom = {
      ...entry.c,
      id_kelas: expectedId,
      tingkat: nextTingkat,
    };
    classByNewId.set(expectedId, updatedCls);
    const nk = normSyncText(updatedCls.nama_kelas);
    if (nk && !classByName.has(nk)) classByName.set(nk, updatedCls);
    const ck = compactClassKey(updatedCls.nama_kelas);
    if (ck) {
      if (!classByCompact.has(ck)) classByCompact.set(ck, updatedCls);
      else if (classByCompact.get(ck) !== updatedCls) classByCompact.set(ck, null);
    }
    return updatedCls;
  });

  db.KELAS = sortedClasses;

  const cascadeDetails: Record<string, number> = {};
  const addCascade = (sheet: string, cnt: number) => {
    if (cnt > 0) cascadeDetails[sheet] = (cascadeDetails[sheet] || 0) + cnt;
  };

  if (Object.keys(idRemap).length > 0 || idOrTingkatChanged) {
    const lookupFallback = (nama?: string): ClassRoom | undefined => {
      const nk = normSyncText(nama);
      if (nk && classByName.has(nk)) return classByName.get(nk);
      const ck = compactClassKey(nama);
      return (ck && classByCompact.get(ck)) || undefined;
    };

    let guruCnt = 0;
    db.GURU.forEach((g) => {
      let rowChanged = false;
      if (isNonWaliTeacher(g.mata_pelajaran, g.jabatan)) {
        if (g.id_kelas !== 'SEMUA_KELAS') {
          g.id_kelas = 'SEMUA_KELAS';
          rowChanged = true;
        }
        if (g.wali_kelas_id) {
          g.wali_kelas_id = '';
          rowChanged = true;
        }
        if (g.wali_kelas) {
          g.wali_kelas = '';
          rowChanged = true;
        }
        if (rowChanged) guruCnt++;
        return;
      }

      const oldWali = String(g.wali_kelas_id || '').trim();
      let matchedWaliCls: ClassRoom | undefined;
      if (oldWali && idRemap[oldWali]) {
        g.wali_kelas_id = idRemap[oldWali];
        matchedWaliCls = classByNewId.get(g.wali_kelas_id);
        if (matchedWaliCls) g.wali_kelas = matchedWaliCls.nama_kelas;
        rowChanged = true;
      } else if (oldWali && classByNewId.has(oldWali)) {
        matchedWaliCls = classByNewId.get(oldWali);
      } else if (!oldWali && g.wali_kelas) {
        matchedWaliCls = lookupFallback(g.wali_kelas);
        if (matchedWaliCls) {
          g.wali_kelas_id = matchedWaliCls.id_kelas;
          g.wali_kelas = matchedWaliCls.nama_kelas;
          rowChanged = true;
        }
      }

      const rawCid = String(g.id_kelas || '').trim();
      if (rawCid) {
        const tokens = rawCid.split(',').map((s) => s.trim()).filter(Boolean);
        const mapped = Array.from(
          new Set(
            tokens.map((tok) =>
              tok.toUpperCase() === 'SEMUA_KELAS' || tok.toUpperCase() === 'ALL'
                ? tok
                : idRemap[tok] || tok
            )
          )
        );
        const joined = mapped.join(', ');
        if (joined !== rawCid) {
          g.id_kelas = joined;
          rowChanged = true;
        }
      } else if (matchedWaliCls) {
        g.id_kelas = matchedWaliCls.id_kelas;
        rowChanged = true;
      }
      if (rowChanged) guruCnt++;
    });
    addCascade('GURU', guruCnt);

    const remapClassRefRows = (
      rows: { id_kelas?: string; nama_kelas?: string }[],
      sheetName: string
    ) => {
      let cnt = 0;
      rows.forEach((r) => {
        const oldCid = String(r.id_kelas || '').trim();
        let cls: ClassRoom | undefined;
        if (oldCid && idRemap[oldCid]) {
          cls = classByNewId.get(idRemap[oldCid]);
        } else if ((!oldCid || !classByNewId.has(oldCid)) && r.nama_kelas) {
          cls = lookupFallback(r.nama_kelas);
        }
        if (!cls) return;
        let rowChanged = false;
        if (r.id_kelas !== cls.id_kelas) {
          r.id_kelas = cls.id_kelas;
          rowChanged = true;
        }
        if (cls.nama_kelas && 'nama_kelas' in r && r.nama_kelas !== cls.nama_kelas) {
          r.nama_kelas = cls.nama_kelas;
          rowChanged = true;
        }
        if (rowChanged) cnt++;
      });
      addCascade(sheetName, cnt);
    };

    remapClassRefRows(db.SISWA, 'SISWA');
    remapClassRefRows(db.JADWAL, 'JADWAL');
    remapClassRefRows(db.PIKET, 'PIKET');
    remapClassRefRows(db.ABSENSI, 'ABSENSI');
    remapClassRefRows(db.NILAI, 'NILAI');
    remapClassRefRows(db.JURNAL, 'JURNAL');
    remapClassRefRows(db.KARAKTER as { id_kelas?: string; nama_kelas?: string }[], 'KARAKTER');
    remapClassRefRows(db.KESEHATAN as { id_kelas?: string; nama_kelas?: string }[], 'KESEHATAN');
    remapClassRefRows(db.BIMBINGAN as { id_kelas?: string; nama_kelas?: string }[], 'BIMBINGAN');
    remapClassRefRows(db.PRESTASI as { id_kelas?: string; nama_kelas?: string }[], 'PRESTASI');
    remapClassRefRows(db.PENGHUBUNG as { id_kelas?: string; nama_kelas?: string }[], 'PENGHUBUNG');

    let agdCnt = 0;
    db.AGENDA.forEach((a) => {
      const rawCid = String(a.id_kelas || '').trim();
      if (!rawCid || rawCid.toUpperCase() === 'SEMUA' || rawCid.toUpperCase() === 'ALL') return;
      if (idRemap[rawCid]) {
        a.id_kelas = idRemap[rawCid];
        agdCnt++;
      } else if (!classByNewId.has(rawCid)) {
        const cls = lookupFallback(rawCid);
        if (cls) {
          a.id_kelas = cls.id_kelas;
          agdCnt++;
        }
      }
    });
    addCascade('AGENDA', agdCnt);
  }

  const details: Record<string, number> = { ...cascadeDetails };
  const changed = orderChanged || idOrTingkatChanged;
  if (changed && sortedClasses.length > 0) {
    details.KELAS = sortedClasses.length;
  }
  const updated_sheets = Object.keys(details);
  const total_updated_rows = updated_sheets.reduce((acc, k) => acc + details[k], 0);
  if (actorUser && changed) {
    addLocalLog(
      db,
      actorUser,
      'SYNC_ID',
      'KELAS',
      `Mengurutkan Class ID sesuai Nama Kelas (${sortedClasses.length} kelas, ${total_updated_rows} baris diperbarui)`
    );
  }

  return {
    classes: sortedClasses,
    idRemap,
    changed,
    classChangedCount,
    cascadeDetails,
    report: { total_updated_rows, updated_sheets, details },
  };
}

function syncAllLocalIds(db: LocalDatabase, actorUser?: AuthUser): IdSyncReport {
  const details: Record<string, number> = {};
  const addCount = (sheet: string, count: number) => {
    if (count > 0) {
      details[sheet] = (details[sheet] || 0) + count;
    }
  };

  // 1. Primary IDs on master collections
  let yearCount = 0;
  db.TAHUN_AJARAN.forEach((y) => {
    if (!String(y.id_tahun_ajaran || '').trim()) {
      y.id_tahun_ajaran = genId('TA');
      yearCount++;
    }
  });
  addCount('TAHUN_AJARAN', yearCount);

  const reorderRes = reorderLocalClassIds(db);
  let classCount = reorderRes.classChangedCount;
  Object.entries(reorderRes.cascadeDetails).forEach(([k, v]) => addCount(k, v));

  const normalizedSubjects = normalizeSubjectList(db.MAPEL as unknown as Record<string, unknown>[]);
  let subjectCount = 0;
  normalizedSubjects.forEach((ns, idx) => {
    const orig = db.MAPEL[idx];
    if (orig && (orig.id_mapel !== ns.id_mapel || orig.kode_mapel !== ns.kode_mapel)) subjectCount++;
  });
  db.MAPEL = normalizedSubjects;
  addCount('MAPEL', subjectCount);

  let teacherCount = 0;
  db.GURU.forEach((g) => {
    if (!String(g.id_guru || '').trim()) {
      g.id_guru = genId('GRU');
      teacherCount++;
    }
  });

  let studentCount = 0;
  db.SISWA.forEach((s) => {
    if (!String(s.id_siswa || '').trim()) {
      s.id_siswa = genId('SIS');
      studentCount++;
    }
  });

  let userCount = 0;
  db.USERS.forEach((u) => {
    if (!String(u.id_user || '').trim()) {
      u.id_user = genId('USR');
      userCount++;
    }
  });

  const activeYear =
    db.TAHUN_AJARAN.find((y) => String(y.status || '').toLowerCase() === 'aktif') || db.TAHUN_AJARAN[0];

  const findYear = (id?: string, name?: string, sem?: string) => {
    const idClean = String(id || '').trim();
    if (idClean) {
      const byId = db.TAHUN_AJARAN.find((y) => y.id_tahun_ajaran === idClean);
      if (byId) return byId;
    }
    const nKey = normSyncText(name);
    if (nKey) {
      const cands = db.TAHUN_AJARAN.filter((y) => normSyncText(y.nama_tahun_ajaran) === nKey);
      if (cands.length) {
        const sKey = normSyncText(sem);
        return (
          cands.find((y) => sKey && normSyncText(y.semester) === sKey) ||
          cands.find((y) => normSyncText(y.status) === 'aktif') ||
          cands[0]
        );
      }
    }
    return activeYear;
  };

  const compactClassMap = new Map<string, ClassRoom | null>();
  db.KELAS.forEach((c) => {
    const ck = compactClassKey(c.nama_kelas);
    if (!ck) return;
    if (!compactClassMap.has(ck)) compactClassMap.set(ck, c);
    else if (compactClassMap.get(ck) !== c) compactClassMap.set(ck, null);
  });

  const findClass = (id?: string, name?: string) => {
    const idClean = String(id || '').trim();
    if (idClean === 'SEMUA_KELAS' || idClean === 'ALL' || idClean === 'SEMUA') return undefined;
    if (idClean) {
      const byId = db.KELAS.find((c) => c.id_kelas === idClean);
      if (byId) return byId;
    }
    const nKey = normSyncText(name);
    if (nKey) {
      const byName = db.KELAS.find((c) => normSyncText(c.nama_kelas) === nKey);
      if (byName) return byName;
    }
    const ck = compactClassKey(name || id);
    return (ck && compactClassMap.get(ck)) || undefined;
  };

  const findSubject = (id?: string, name?: string) => {
    const idClean = String(id || '').trim();
    if (idClean) {
      const byId = db.MAPEL.find((m) => m.id_mapel === idClean);
      if (byId) return byId;
    }
    const key = normSyncText(name);
    if (!key) return undefined;
    return (
      db.MAPEL.find((m) => normSyncText(m.nama_mapel) === key || normSyncText(m.kode_mapel) === key) ||
      (/\bpai\b|agama/i.test(key)
        ? db.MAPEL.find((m) => /\bpai\b|agama/i.test(`${m.kode_mapel} ${m.nama_mapel}`))
        : /\bpjok\b|penjas|olahraga|jasmani/i.test(key)
        ? db.MAPEL.find((m) => /\bpjok\b|penjas|olahraga|jasmani/i.test(`${m.kode_mapel} ${m.nama_mapel}`))
        : undefined)
    );
  };

  const cleanTeacherMap = new Map<string, Teacher | null>();
  db.GURU.forEach((t) => {
    const ck = stripAcademicTitles(t.nama_guru);
    if (!ck) return;
    if (!cleanTeacherMap.has(ck)) cleanTeacherMap.set(ck, t);
    else if (cleanTeacherMap.get(ck) !== t) cleanTeacherMap.set(ck, null);
  });

  const findTeacher = (id?: string, name?: string) => {
    const idClean = String(id || '').trim();
    if (idClean) {
      const byId = db.GURU.find((t) => t.id_guru === idClean);
      if (byId) return byId;
    }
    const key = normSyncText(name);
    if (!key) return undefined;
    const exact = db.GURU.find(
      (t) => normSyncText(t.nama_guru) === key || normSyncText(t.nip) === key || normSyncText(t.username) === key
    );
    if (exact) return exact;
    const ck = stripAcademicTitles(name);
    return (ck && cleanTeacherMap.get(ck)) || undefined;
  };

  const findStudent = (id?: string, name?: string, classIdHint?: string, classNameHint?: string) => {
    const idClean = String(id || '').trim();
    if (idClean) {
      const byId = db.SISWA.find((s) => s.id_siswa === idClean);
      if (byId) return byId;
    }
    const codeKey = normSyncText(id || name);
    if (codeKey) {
      const byCode = db.SISWA.find((s) => normSyncText(s.nis) === codeKey || normSyncText(s.nisn) === codeKey);
      if (byCode) return byCode;
    }
    const nKey = normSyncText(name);
    if (!nKey) return undefined;
    const cands = db.SISWA.filter((s) => normSyncText(s.nama_lengkap) === nKey);
    if (cands.length <= 1) return cands[0];
    return (
      cands.find(
        (s) =>
          (classIdHint && s.id_kelas === classIdHint) ||
          (classNameHint && normSyncText(s.nama_kelas) === normSyncText(classNameHint))
      ) || cands[0]
    );
  };

  // 2a. IDENTITAS_SEKOLAH <-> TAHUN_AJARAN
  let schoolCount = 0;
  db.IDENTITAS_SEKOLAH.forEach((sch) => {
    const yr = findYear(sch.tahun_ajaran_aktif_id, sch.tahun_ajaran_aktif, sch.semester_aktif);
    if (yr && (sch.tahun_ajaran_aktif_id !== yr.id_tahun_ajaran || sch.tahun_ajaran_aktif !== yr.nama_tahun_ajaran)) {
      sch.tahun_ajaran_aktif_id = yr.id_tahun_ajaran;
      sch.tahun_ajaran_aktif = yr.nama_tahun_ajaran;
      schoolCount++;
    }
  });
  addCount('IDENTITAS_SEKOLAH', schoolCount);

  // 2b. GURU <-> KELAS
  db.GURU.forEach((g) => {
    let assign = resolveTeacherClassAssignment(
      {
        mata_pelajaran: g.mata_pelajaran,
        jabatan: g.jabatan,
        wali_kelas_id: g.wali_kelas_id,
        wali_kelas: g.wali_kelas,
        id_kelas: g.id_kelas,
      },
      db.KELAS
    );
    if (!assign.isGuruMapel && !assign.isPaiPjok && !assign.isKepalaSekolah && !assign.id_kelas) {
      const revCls = db.KELAS.find(
        (c) =>
          c.wali_kelas_id === g.id_guru ||
          (c.wali_kelas && normSyncText(c.wali_kelas) === normSyncText(g.nama_guru))
      );
      if (revCls) {
        assign = {
          isPaiPjok: false,
          isGuruMapel: false,
          isKepalaSekolah: false,
          isWaliKelas: true,
          id_kelas: revCls.id_kelas,
          wali_kelas_id: revCls.id_kelas,
          wali_kelas: revCls.nama_kelas,
        };
      }
    }
    let changed = false;
    if (g.id_kelas !== assign.id_kelas) {
      g.id_kelas = assign.id_kelas;
      changed = true;
    }
    if (g.wali_kelas_id !== assign.wali_kelas_id) {
      g.wali_kelas_id = assign.wali_kelas_id;
      changed = true;
    }
    if (g.wali_kelas !== assign.wali_kelas) {
      g.wali_kelas = assign.wali_kelas;
      changed = true;
    }
    if (!String(g.username || '').trim()) {
      const matchedU = db.USERS.find(
        (u) =>
          (u.role === 'GURU' || u.role === 'KEPALA_SEKOLAH') &&
          (u.relasi_id === g.id_guru ||
            normSyncText(u.nama_lengkap) === normSyncText(g.nama_guru) ||
            (g.nip && normSyncText(u.username) === normSyncText(g.nip)))
      );
      const cleanNip = String(g.nip || '').trim();
      if (matchedU?.username) {
        g.username = matchedU.username;
        changed = true;
      } else if (cleanNip && cleanNip !== '-') {
        g.username = cleanNip;
        changed = true;
      }
    }
    if (changed) teacherCount++;
  });
  addCount('GURU', teacherCount);

  db.KELAS.forEach((c) => {
    let changed = false;
    const yr = findYear(c.id_tahun_ajaran, c.tahun_ajaran);
    if (yr && (c.id_tahun_ajaran !== yr.id_tahun_ajaran || c.tahun_ajaran !== yr.nama_tahun_ajaran)) {
      c.id_tahun_ajaran = yr.id_tahun_ajaran;
      c.tahun_ajaran = yr.nama_tahun_ajaran;
      changed = true;
    }
    let wali = findTeacher(c.wali_kelas_id, c.wali_kelas);
    if (wali && isNonWaliTeacher(wali.mata_pelajaran, wali.jabatan)) wali = undefined;
    if (!wali) {
      wali = db.GURU.find((g) => !isNonWaliTeacher(g.mata_pelajaran, g.jabatan) && g.wali_kelas_id === c.id_kelas);
    }
    if (wali && (c.wali_kelas_id !== wali.id_guru || c.wali_kelas !== wali.nama_guru)) {
      c.wali_kelas_id = wali.id_guru;
      c.wali_kelas = wali.nama_guru;
      changed = true;
    }
    if (changed) classCount++;
  });
  addCount('KELAS', classCount);

  // 2c. SISWA <-> KELAS
  db.SISWA.forEach((s) => {
    const cls = findClass(s.id_kelas, s.nama_kelas);
    if (cls && (s.id_kelas !== cls.id_kelas || s.nama_kelas !== cls.nama_kelas)) {
      s.id_kelas = cls.id_kelas;
      s.nama_kelas = cls.nama_kelas;
      studentCount++;
    }
  });
  addCount('SISWA', studentCount);

  // 2d. USERS <-> GURU / SISWA (auto-provision akun guru & siswa/orang tua yang belum ada)
  userCount += syncLocalMasterUsers(db);
  addCount('USERS', userCount);

  // 3. Transactional collections
  const detectTeacher = (cls?: ClassRoom, sub?: Subject) => {
    const subLabel = normSyncText(`${sub?.kode_mapel || ''} ${sub?.nama_mapel || ''}`);
    if (/\bpai\b|agama/i.test(subLabel)) {
      return db.GURU.find((g) => /\bpai\b|agama/i.test(`${g.mata_pelajaran} ${g.jabatan}`));
    }
    if (/\bpjok\b|penjas|olahraga|jasmani/i.test(subLabel)) {
      return db.GURU.find((g) => /\bpjok\b|penjas|olahraga|jasmani/i.test(`${g.mata_pelajaran} ${g.jabatan}`));
    }
    if (sub) {
      const sName = normSyncText(sub.nama_mapel);
      const sKode = normSyncText(sub.kode_mapel);
      const mapelMatch = db.GURU.find((g) => {
        if (isKepalaSekolah(g.mata_pelajaran, g.jabatan)) return false;
        const gMapel = normSyncText(g.mata_pelajaran);
        const sameCls =
          !cls ||
          g.id_kelas === cls.id_kelas ||
          g.wali_kelas_id === cls.id_kelas ||
          g.id_kelas === 'SEMUA_KELAS' ||
          (!g.id_kelas && !g.wali_kelas_id);
        return (
          sameCls &&
          ((sName && gMapel.includes(sName)) ||
            (sKode && new RegExp(`\\b${sKode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(gMapel)))
        );
      });
      if (mapelMatch) return mapelMatch;
    }
    if (cls) {
      return (
        db.GURU.find((g) => cls.wali_kelas_id && g.id_guru === cls.wali_kelas_id) ||
        db.GURU.find(
          (g) => !isNonWaliTeacher(g.mata_pelajaran, g.jabatan) && (g.wali_kelas_id === cls.id_kelas || g.id_kelas === cls.id_kelas)
        )
      );
    }
    return undefined;
  };

  let jadwalCount = 0;
  db.JADWAL.forEach((j) => {
    let changed = false;
    if (!String(j.id_jadwal || '').trim()) {
      j.id_jadwal = genId('JDW');
      changed = true;
    }
    const yr = findYear(j.id_tahun_ajaran, '', j.semester);
    if (yr && j.id_tahun_ajaran !== yr.id_tahun_ajaran) {
      j.id_tahun_ajaran = yr.id_tahun_ajaran;
      changed = true;
    }
    const cls = findClass(j.id_kelas, j.nama_kelas);
    if (cls && (j.id_kelas !== cls.id_kelas || j.nama_kelas !== cls.nama_kelas)) {
      j.id_kelas = cls.id_kelas;
      j.nama_kelas = cls.nama_kelas;
      changed = true;
    }
    const sub = findSubject(j.id_mapel, j.nama_mapel);
    if (sub && (j.id_mapel !== sub.id_mapel || j.nama_mapel !== sub.nama_mapel)) {
      j.id_mapel = sub.id_mapel;
      j.nama_mapel = sub.nama_mapel;
      changed = true;
    }
    const tch = findTeacher(j.id_guru, j.nama_guru) || detectTeacher(cls, sub);
    if (tch && (j.id_guru !== tch.id_guru || j.nama_guru !== tch.nama_guru)) {
      j.id_guru = tch.id_guru;
      j.nama_guru = tch.nama_guru;
      changed = true;
    }
    if (changed) jadwalCount++;
  });
  addCount('JADWAL', jadwalCount);

  let piketCount = 0;
  db.PIKET.forEach((p) => {
    let changed = false;
    if (!String(p.id_piket || '').trim()) {
      p.id_piket = genId('PKT');
      changed = true;
    }
    const cls = findClass(p.id_kelas, p.nama_kelas);
    if (cls && (p.id_kelas !== cls.id_kelas || p.nama_kelas !== cls.nama_kelas)) {
      p.id_kelas = cls.id_kelas;
      p.nama_kelas = cls.nama_kelas;
      changed = true;
    }
    const tch = findTeacher(p.id_guru, p.nama_guru);
    if (tch && (p.id_guru !== tch.id_guru || p.nama_guru !== tch.nama_guru)) {
      p.id_guru = tch.id_guru;
      p.nama_guru = tch.nama_guru;
      changed = true;
    }
    const studentNames = String(p.petugas_siswa || '')
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!String(p.id_siswa || '').trim() && studentNames.length > 0) {
      const matchedIds: string[] = [];
      studentNames.forEach((sname) => {
        const st = findStudent('', sname, p.id_kelas, p.nama_kelas);
        if (st?.id_siswa && !matchedIds.includes(st.id_siswa)) {
          matchedIds.push(st.id_siswa);
        }
      });
      if (matchedIds.length > 0) {
        p.id_siswa = matchedIds.join(', ');
        changed = true;
      }
    }
    const normChecklist = normalizeChecklistField(p.checklist_kebersihan);
    if (p.checklist_kebersihan !== normChecklist) {
      p.checklist_kebersihan = normChecklist;
      changed = true;
    }
    if (changed) piketCount++;
  });
  addCount('PIKET', piketCount);

  let absCount = 0;
  db.ABSENSI.forEach((a) => {
    let changed = false;
    if (!String(a.id_absensi || '').trim()) {
      a.id_absensi = genId('ABS');
      changed = true;
    }
    const yr = findYear(a.id_tahun_ajaran, '', a.semester);
    if (yr && a.id_tahun_ajaran !== yr.id_tahun_ajaran) {
      a.id_tahun_ajaran = yr.id_tahun_ajaran;
      changed = true;
    }
    const std = findStudent(a.id_siswa, a.nama_siswa, a.id_kelas, a.nama_kelas);
    if (std && (a.id_siswa !== std.id_siswa || a.nama_siswa !== std.nama_lengkap)) {
      a.id_siswa = std.id_siswa;
      a.nama_siswa = std.nama_lengkap;
      changed = true;
    }
    const cls = findClass(a.id_kelas, a.nama_kelas) || (std ? findClass(std.id_kelas, std.nama_kelas) : undefined);
    if (cls && (a.id_kelas !== cls.id_kelas || a.nama_kelas !== cls.nama_kelas)) {
      a.id_kelas = cls.id_kelas;
      a.nama_kelas = cls.nama_kelas;
      changed = true;
    }
    if (changed) absCount++;
  });
  addCount('ABSENSI', absCount);

  let nilaiCount = 0;
  db.NILAI.forEach((n) => {
    let changed = false;
    if (!String(n.id_nilai || '').trim()) {
      n.id_nilai = genId('NIL');
      changed = true;
    }
    const yr = findYear(n.id_tahun_ajaran, n.tahun_ajaran, n.semester);
    if (yr && (n.id_tahun_ajaran !== yr.id_tahun_ajaran || n.tahun_ajaran !== yr.nama_tahun_ajaran)) {
      n.id_tahun_ajaran = yr.id_tahun_ajaran;
      n.tahun_ajaran = yr.nama_tahun_ajaran;
      changed = true;
    }
    const std = findStudent(n.id_siswa, n.nama_siswa, n.id_kelas, n.nama_kelas);
    if (std && (n.id_siswa !== std.id_siswa || n.nama_siswa !== std.nama_lengkap)) {
      n.id_siswa = std.id_siswa;
      n.nama_siswa = std.nama_lengkap;
      changed = true;
    }
    const cls = findClass(n.id_kelas, n.nama_kelas) || (std ? findClass(std.id_kelas, std.nama_kelas) : undefined);
    if (cls && (n.id_kelas !== cls.id_kelas || n.nama_kelas !== cls.nama_kelas)) {
      n.id_kelas = cls.id_kelas;
      n.nama_kelas = cls.nama_kelas;
      changed = true;
    }
    const sub = findSubject(n.id_mapel, n.nama_mapel);
    if (sub && (n.id_mapel !== sub.id_mapel || n.nama_mapel !== sub.nama_mapel)) {
      n.id_mapel = sub.id_mapel;
      n.nama_mapel = sub.nama_mapel;
      changed = true;
    }
    const schTeacherId =
      cls && sub ? db.JADWAL.find((j) => j.id_kelas === cls.id_kelas && j.id_mapel === sub.id_mapel && j.id_guru)?.id_guru : '';
    const tch = findTeacher(n.id_guru, n.nama_guru) || (schTeacherId ? findTeacher(schTeacherId) : undefined) || detectTeacher(cls, sub);
    if (tch && (n.id_guru !== tch.id_guru || n.nama_guru !== tch.nama_guru)) {
      n.id_guru = tch.id_guru;
      n.nama_guru = tch.nama_guru;
      changed = true;
    }
    if (changed) nilaiCount++;
  });
  addCount('NILAI', nilaiCount);

  let jurnalCount = 0;
  db.JURNAL.forEach((j) => {
    let changed = false;
    if (!String(j.id_jurnal || '').trim()) {
      j.id_jurnal = genId('JRN');
      changed = true;
    }
    const cls = findClass(j.id_kelas, j.nama_kelas);
    if (cls && (j.id_kelas !== cls.id_kelas || j.nama_kelas !== cls.nama_kelas)) {
      j.id_kelas = cls.id_kelas;
      j.nama_kelas = cls.nama_kelas;
      changed = true;
    }
    const sub = findSubject(j.id_mapel, j.nama_mapel);
    if (sub && (j.id_mapel !== sub.id_mapel || j.nama_mapel !== sub.nama_mapel)) {
      j.id_mapel = sub.id_mapel;
      j.nama_mapel = sub.nama_mapel;
      changed = true;
    }
    const tch = findTeacher(j.id_guru, j.nama_guru);
    if (tch && (j.id_guru !== tch.id_guru || j.nama_guru !== tch.nama_guru)) {
      j.id_guru = tch.id_guru;
      j.nama_guru = tch.nama_guru;
      changed = true;
    }
    if (changed) jurnalCount++;
  });
  addCount('JURNAL', jurnalCount);

  const syncStudentRows = (rows: Record<string, unknown>[], sheetName: string, idKey: string, prefix: string) => {
    let cnt = 0;
    rows.forEach((r) => {
      let changed = false;
      if (!String(r[idKey] || '').trim()) {
        r[idKey] = genId(prefix);
        changed = true;
      }
      const std = findStudent(String(r.id_siswa || ''), String(r.nama_siswa || ''), String(r.id_kelas || ''), String(r.nama_kelas || ''));
      if (std && (r.id_siswa !== std.id_siswa || r.nama_siswa !== std.nama_lengkap)) {
        r.id_siswa = std.id_siswa;
        r.nama_siswa = std.nama_lengkap;
        changed = true;
      }
      const cls =
        findClass(String(r.id_kelas || ''), String(r.nama_kelas || '')) ||
        (std ? findClass(std.id_kelas, std.nama_kelas) : undefined);
      if (cls && (r.id_kelas !== cls.id_kelas || r.nama_kelas !== cls.nama_kelas)) {
        r.id_kelas = cls.id_kelas;
        r.nama_kelas = cls.nama_kelas;
        changed = true;
      }
      if ('id_guru' in r || 'nama_guru' in r) {
        const tch = findTeacher(String(r.id_guru || ''), String(r.nama_guru || ''));
        if (tch && (r.id_guru !== tch.id_guru || r.nama_guru !== tch.nama_guru)) {
          r.id_guru = tch.id_guru;
          r.nama_guru = tch.nama_guru;
          changed = true;
        }
      }
      if (changed) cnt++;
    });
    addCount(sheetName, cnt);
  };

  syncStudentRows(db.KARAKTER, 'KARAKTER', 'id_karakter', 'KRK');
  syncStudentRows(db.KESEHATAN as unknown as Record<string, unknown>[], 'KESEHATAN', 'id_kesehatan', 'KES');
  syncStudentRows(db.BIMBINGAN as unknown as Record<string, unknown>[], 'BIMBINGAN', 'id_bimbingan', 'BK');
  syncStudentRows(db.PRESTASI as unknown as Record<string, unknown>[], 'PRESTASI', 'id_prestasi', 'PRS');
  syncStudentRows(db.PENGHUBUNG as unknown as Record<string, unknown>[], 'PENGHUBUNG', 'id_penghubung', 'PHB');

  let agendaCount = 0;
  db.AGENDA.forEach((a) => {
    let changed = false;
    if (!String(a.id_agenda || '').trim()) {
      a.id_agenda = genId('AGD');
      changed = true;
    }
    const rawCls = String(a.id_kelas || '').trim();
    if (rawCls && rawCls.toUpperCase() !== 'SEMUA' && rawCls.toUpperCase() !== 'ALL') {
      const cls = findClass(rawCls, rawCls);
      if (cls && a.id_kelas !== cls.id_kelas) {
        a.id_kelas = cls.id_kelas;
        changed = true;
      }
    }
    if (changed) agendaCount++;
  });
  addCount('AGENDA', agendaCount);

  const updated_sheets = Object.keys(details);
  const total_updated_rows = updated_sheets.reduce((acc, k) => acc + details[k], 0);
  if (actorUser && total_updated_rows > 0) {
    addLocalLog(
      db,
      actorUser,
      'SYNC_ID',
      'DATABASE',
      `Sinkronisasi seluruh ID: ${total_updated_rows} baris pada ${updated_sheets.length} sheet`
    );
  }
  return { total_updated_rows, updated_sheets, details };
}

function handleLocalApi<T>(action: string, payload: Record<string, unknown> = {}): ApiResponse<T> {
  const db = loadLocalDb();
  const session = getStoredSession();
  const now = new Date().toISOString();

  const ensureLocalDefaultAdmin = () => {
    const hasValidAdmin = db.USERS.some(
      (u) =>
        String(u.role || '').trim().toUpperCase() === 'ADMIN' &&
        String(u.status || 'Aktif').trim().toLowerCase() === 'aktif' &&
        String(u.username || '').trim() !== '' &&
        String(u.password || '').trim() !== ''
    );
    if (hasValidAdmin) return false;
    db.USERS.push({
      id_user: genId('USR'),
      username: 'admin',
      password: 'admin123',
      nama_lengkap: 'Administrator Sekolah',
      role: 'ADMIN',
      relasi_id: '',
      relasi_nama: 'Administrator Sekolah',
      status: 'Aktif',
      foto_url: '',
      created_at: now,
      updated_at: now,
    });
    saveLocalDb(db);
    return true;
  };

  if (action === 'ping' || action === 'checkInitialSetup' || action === 'setupDatabase') {
    let idSync: IdSyncReport | null = null;
    if (action === 'setupDatabase') {
      ensureLocalDefaultAdmin();
      idSync = syncAllLocalIds(db);
      saveLocalDb(db);
    }
    return {
      success: true,
      message: 'Mode Penyimpanan Browser Lokal aktif (Belum terhubung Database).',
      data: {
        status: 'local',
        needs_initial_admin: db.USERS.length === 0,
        nama_sekolah: (db.IDENTITAS_SEKOLAH[0]?.nama_sekolah || '').trim(),
        created_sheets: [],
        verified_sheets: Object.keys(db),
        total_sheets: 21,
        id_sync: idSync,
      } as unknown as T,
    };
  }

  if (action === 'createInitialAdmin') {
    if (db.USERS.length > 0) {
      return { success: false, message: 'Administrator awal sudah terdaftar.' };
    }
    const username = String(payload.username || '').trim();
    const password = String(payload.password || '');
    const nama = String(payload.nama_lengkap || '').trim();
    if (!username || !password || !nama) {
      return { success: false, message: 'Username, password, dan nama lengkap wajib diisi.' };
    }
    const newAdmin: LocalUserRow = {
      id_user: genId('USR'),
      username,
      password,
      nama_lengkap: nama,
      role: 'ADMIN',
      relasi_id: '',
      relasi_nama: 'Administrator Sekolah',
      status: 'Aktif',
      foto_url: String(payload.foto_url || ''),
      created_at: now,
      updated_at: now,
    };
    db.USERS.push(newAdmin);
    saveLocalDb(db);
    return { success: true, message: 'Akun Administrator awal berhasil dibuat.', data: sanitizeUser(newAdmin) as unknown as T };
  }

  if (action === 'loginUser') {
    ensureLocalDefaultAdmin();
    syncLocalMasterUsers(db);
    const username = String(payload.username || '').trim();
    const password = String(payload.password || '').trim();
    const found = db.USERS.find(
      (u) => String(u.username || '').trim().toLowerCase() === username.toLowerCase()
    );
    if (!found || String(found.password || '').trim() !== password) {
      return { success: false, message: 'Username atau password tidak sesuai.' };
    }
    if (String(found.status || 'Aktif').trim().toLowerCase() !== 'aktif') {
      return { success: false, message: 'Akun pengguna sedang dinonaktifkan.' };
    }
    syncAllLocalIds(db);
    const authUser = sanitizeUser(found);
    addLocalLog(db, authUser, 'LOGIN', 'AUTENTIKASI', 'Login ke Mode Lokal');
    saveLocalDb(db);
    return {
      success: true,
      message: 'Login berhasil.',
      data: {
        token: genId('SES'),
        user: authUser,
        expires_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
      } as unknown as T,
    };
  }

  if (action === 'logoutUser') {
    return { success: true, message: 'Logout berhasil.' };
  }

  if (!session?.user) {
    return { success: false, message: 'Sesi tidak valid. Silakan login kembali.', error_code: 'UNAUTHORIZED' };
  }
  const user = session.user;

  if (action === 'verifySession') {
    const freshRow = db.USERS.find((u) => u.id_user === user.id_user);
    const activeUser = freshRow ? sanitizeUser(freshRow) : user;
    if (freshRow && session) {
      setStoredSession({ ...session, user: activeUser });
    }
    return { success: true, message: 'Sesi valid.', data: { user: activeUser } as unknown as T };
  }

  try {
    const teacherScope = getLocalTeacherAccessScope(db, user);
    const teacherClasses = teacherScope.classIds;
    const scopeStudentRows = <R extends { id_siswa?: string; id_kelas?: string }>(rows: R[]): R[] => {
      if (user.role === 'ADMIN' || user.role === 'KEPALA_SEKOLAH') return rows;
      if (user.role === 'ORANG_TUA') return rows.filter((r) => r.id_siswa === user.relasi_id);
      if (user.role === 'GURU') {
        if (teacherScope.isFullAccess) return rows;
        return rows.filter((r) => r.id_kelas && teacherClasses.has(r.id_kelas));
      }
      return [];
    };

    switch (action) {
      case 'getSchoolSettings': {
        const s = db.IDENTITAS_SEKOLAH[0] || {
          id: 'SEKOLAH_UTAMA',
          nama_sekolah: '',
          npsn: '',
          alamat: '',
          kecamatan: '',
          kabupaten: '',
          provinsi: '',
          email: '',
          tahun_ajaran_aktif_id: '',
          tahun_ajaran_aktif: '',
          semester_aktif: 'Ganjil',
          peringkat_aktif: 'Tidak',
          updated_at: '',
        };
        return { success: true, message: 'OK', data: s as unknown as T };
      }
      case 'updateSchoolSettings': {
        requireLocalRole(user, ['ADMIN']);
        const updated: SchoolIdentity = {
          ...(payload as unknown as SchoolIdentity),
          id: 'SEKOLAH_UTAMA',
          updated_at: now,
        };
        db.IDENTITAS_SEKOLAH = [updated];
        addLocalLog(db, user, 'UPDATE', 'PENGATURAN_SEKOLAH', 'Memperbarui identitas sekolah');
        saveLocalDb(db);
        return { success: true, message: 'Identitas sekolah berhasil disimpan.', data: updated as unknown as T };
      }
      case 'getAcademicYears':
        return { success: true, message: 'OK', data: db.TAHUN_AJARAN as unknown as T };
      case 'createAcademicYear': {
        requireLocalRole(user, ['ADMIN']);
        const item: AcademicYear = {
          id_tahun_ajaran: genId('TA'),
          nama_tahun_ajaran: String(payload.nama_tahun_ajaran || '').trim(),
          semester: payload.semester === 'Genap' ? 'Genap' : 'Ganjil',
          status: (payload.status as AcademicYear['status']) || 'Draft',
          keterangan: String(payload.keterangan || ''),
          created_at: now,
          updated_at: now,
        };
        if (item.status === 'Aktif') {
          db.TAHUN_AJARAN.forEach((y) => {
            if (y.status === 'Aktif') y.status = 'Arsip';
          });
          if (db.IDENTITAS_SEKOLAH[0]) {
            db.IDENTITAS_SEKOLAH[0].tahun_ajaran_aktif_id = item.id_tahun_ajaran;
            db.IDENTITAS_SEKOLAH[0].tahun_ajaran_aktif = item.nama_tahun_ajaran;
            db.IDENTITAS_SEKOLAH[0].semester_aktif = item.semester;
          }
        }
        db.TAHUN_AJARAN.push(item);
        addLocalLog(db, user, 'CREATE', 'TAHUN_AJARAN', `Tambah tahun ajaran ${item.nama_tahun_ajaran}`);
        saveLocalDb(db);
        return { success: true, message: 'Tahun ajaran berhasil ditambahkan.', data: item as unknown as T };
      }
      case 'updateAcademicYear': {
        requireLocalRole(user, ['ADMIN']);
        const idx = db.TAHUN_AJARAN.findIndex((y) => y.id_tahun_ajaran === payload.id_tahun_ajaran);
        if (idx === -1) return { success: false, message: 'Tahun ajaran tidak ditemukan.' };
        if (payload.status === 'Aktif') {
          db.TAHUN_AJARAN.forEach((y) => {
            if (y.status === 'Aktif') y.status = 'Arsip';
          });
        }
        db.TAHUN_AJARAN[idx] = { ...db.TAHUN_AJARAN[idx], ...payload, updated_at: now } as AcademicYear;
        if (db.TAHUN_AJARAN[idx].status === 'Aktif' && db.IDENTITAS_SEKOLAH[0]) {
          db.IDENTITAS_SEKOLAH[0].tahun_ajaran_aktif_id = db.TAHUN_AJARAN[idx].id_tahun_ajaran;
          db.IDENTITAS_SEKOLAH[0].tahun_ajaran_aktif = db.TAHUN_AJARAN[idx].nama_tahun_ajaran;
          db.IDENTITAS_SEKOLAH[0].semester_aktif = db.TAHUN_AJARAN[idx].semester;
        }
        saveLocalDb(db);
        return { success: true, message: 'Tahun ajaran diperbarui.', data: db.TAHUN_AJARAN[idx] as unknown as T };
      }
      case 'setActiveAcademicYear': {
        requireLocalRole(user, ['ADMIN']);
        const target = db.TAHUN_AJARAN.find((y) => y.id_tahun_ajaran === payload.id_tahun_ajaran);
        if (!target) return { success: false, message: 'Tahun ajaran tidak ditemukan.' };
        db.TAHUN_AJARAN.forEach((y) => {
          if (y.status === 'Aktif') y.status = 'Arsip';
        });
        target.status = 'Aktif';
        target.updated_at = now;
        const baseSchool: SchoolIdentity = db.IDENTITAS_SEKOLAH[0] || {
          id: 'SEKOLAH_UTAMA',
          nama_sekolah: '',
          npsn: '',
          alamat: '',
          kecamatan: '',
          kabupaten: '',
          provinsi: '',
          email: '',
          tahun_ajaran_aktif_id: '',
          tahun_ajaran_aktif: '',
          semester_aktif: 'Ganjil',
          peringkat_aktif: 'Tidak',
          updated_at: now,
        };
        baseSchool.tahun_ajaran_aktif_id = target.id_tahun_ajaran;
        baseSchool.tahun_ajaran_aktif = target.nama_tahun_ajaran;
        baseSchool.semester_aktif = target.semester;
        baseSchool.updated_at = now;
        db.IDENTITAS_SEKOLAH = [baseSchool];
        addLocalLog(db, user, 'ACTIVATE', 'TAHUN_AJARAN', `Aktifkan ${target.nama_tahun_ajaran} ${target.semester}`);
        saveLocalDb(db);
        return { success: true, message: 'Tahun ajaran aktif berhasil diperbarui.', data: target as unknown as T };
      }
      case 'deleteAcademicYear': {
        requireLocalRole(user, ['ADMIN']);
        const id = String(payload.id_tahun_ajaran || '');
        const used =
          db.KELAS.some((c) => c.id_tahun_ajaran === id) ||
          db.NILAI.some((n) => n.id_tahun_ajaran === id) ||
          db.ABSENSI.some((a) => a.id_tahun_ajaran === id);
        if (used) {
          return { success: false, message: 'Tahun ajaran sedang digunakan oleh data kelas, absensi, atau nilai.' };
        }
        db.TAHUN_AJARAN = db.TAHUN_AJARAN.filter((y) => y.id_tahun_ajaran !== id);
        saveLocalDb(db);
        return { success: true, message: 'Tahun ajaran dihapus.' };
      }

      case 'getDashboard': {
        const filterClassId = String(payload.id_kelas || '').trim();
        const baseStudents = scopeStudentRows(db.SISWA);
        const allowedClasses = db.KELAS.map((c) => ({
          ...c,
          jumlah_siswa: db.SISWA.filter((s) => s.id_kelas === c.id_kelas).length,
        })).filter((c) => {
          if (user.role === 'GURU') return teacherScope.isFullAccess || teacherClasses.has(c.id_kelas);
          if (user.role === 'ORANG_TUA') return baseStudents.some((s) => s.id_kelas === c.id_kelas);
          return true;
        });
        const hasAllowedFilter = filterClassId !== '' && allowedClasses.some((c) => c.id_kelas === filterClassId);
        const students = hasAllowedFilter ? baseStudents.filter((s) => s.id_kelas === filterClassId) : baseStudents;
        const classes = hasAllowedFilter ? allowedClasses.filter((c) => c.id_kelas === filterClassId) : allowedClasses;
        const attendance = scopeStudentRows(db.ABSENSI).filter((a) => !hasAllowedFilter || a.id_kelas === filterClassId);
        const grades = scopeStudentRows(db.NILAI).filter((g) => !hasAllowedFilter || g.id_kelas === filterClassId);
        const achievements = scopeStudentRows(db.PRESTASI).filter((p) => !hasAllowedFilter || p.id_kelas === filterClassId);
        const agendas = db.AGENDA.filter((a) =>
          user.role === 'ORANG_TUA' ? a.target_role === 'Semua' || a.target_role === 'Orang Tua' : true
        );

        let hadir = 0;
        let tidakHadir = 0;
        const statusCounts: Record<string, number> = {
          Hadir: 0,
          Sakit: 0,
          Izin: 0,
          Alpha: 0,
        };
        attendance.forEach((a) => {
          const st = normalizeAttendanceStatus(a.status);
          if (statusCounts[st] !== undefined) statusCounts[st]++;
          if (st === 'Hadir') hadir++;
          else tidakHadir++;
        });
        const pct = attendance.length > 0 ? Math.round((hadir / attendance.length) * 1000) / 10 : 0;

        const mapelAgg: Record<string, { sum: number; count: number }> = {};
        grades.forEach((g) => {
          if (g.rata_rata !== null && g.rata_rata !== undefined && !Number.isNaN(Number(g.rata_rata))) {
            const k = g.nama_mapel || g.id_mapel;
            if (!mapelAgg[k]) mapelAgg[k] = { sum: 0, count: 0 };
            mapelAgg[k].sum += Number(g.rata_rata);
            mapelAgg[k].count += 1;
          }
        });

        const prestasiAgg: Record<string, number> = {};
        achievements.forEach((p) => {
          prestasiAgg[p.tingkat] = (prestasiAgg[p.tingkat] || 0) + 1;
        });

        const countGenderForClass = (cls: ClassRoom) => {
          const cid = String(cls.id_kelas || '').trim();
          const cname = normSyncText(cls.nama_kelas);
          let l = 0;
          let p = 0;
          baseStudents.forEach((s) => {
            const matchById = cid && String(s.id_kelas || '').trim() === cid;
            const matchByName = cname && normSyncText(s.nama_kelas) === cname;
            if (!matchById && !matchByName) return;
            const g = String(s.jenis_kelamin || '').trim().toLowerCase();
            if (g === 'l' || g === 'lk' || g.startsWith('laki') || g === 'pria' || g === 'male' || g === 'm') {
              l++;
            } else if (g === 'p' || g === 'pr' || g.startsWith('perempuan') || g === 'wanita' || g === 'female' || g === 'f') {
              p++;
            }
          });
          return { l, p };
        };

        const today = new Date().toISOString().slice(0, 10);
        const summary: DashboardSummary = {
          total_siswa: students.length,
          total_guru: user.role === 'ORANG_TUA' ? 0 : db.GURU.length,
          total_kelas: classes.length,
          total_mapel: db.MAPEL.filter((m) => m.status_aktif === 'Aktif').length,
          persentase_kehadiran: pct,
          jumlah_tidak_hadir: tidakHadir,
          siswa_per_kelas: classes.map((c) => {
            const gp = countGenderForClass(c);
            return {
              nama_kelas: c.nama_kelas,
              jumlah: c.jumlah_siswa || 0,
              jumlah_l: gp.l,
              jumlah_p: gp.p,
            };
          }),
          kehadiran_chart: Object.entries(statusCounts).map(([status, jumlah]) => ({ status, jumlah })),
          perkembangan_nilai: Object.entries(mapelAgg).map(([nama_mapel, v]) => ({
            nama_mapel,
            rata_rata: Math.round((v.sum / v.count) * 100) / 100,
          })),
          prestasi_chart: Object.entries(prestasiAgg).map(([tingkat, jumlah]) => ({ tingkat, jumlah })),
          aktivitas_terbaru:
            user.role === 'ADMIN' || user.role === 'KEPALA_SEKOLAH'
              ? [...db.LOG_AKTIVITAS].slice(-8).reverse()
              : [],
          agenda_terdekat: agendas
            .filter((a) => !a.tanggal || a.tanggal >= today)
            .sort((a, b) => a.tanggal.localeCompare(b.tanggal))
            .slice(0, 5),
        };
        return { success: true, message: 'OK', data: summary as unknown as T };
      }

      case 'getStudents':
        return { success: true, message: 'OK', data: scopeStudentRows(db.SISWA) as unknown as T };
      case 'createStudent': {
        requireLocalRole(user, ['ADMIN', 'GURU']);
        const nis = String(payload.nis || '').trim();
        const nisn = String(payload.nisn || '').trim();
        if (db.SISWA.some((s) => s.nis === nis)) {
          return { success: false, message: `NIS "${nis}" sudah terdaftar.` };
        }
        if (nisn && db.SISWA.some((s) => s.nisn === nisn)) {
          return { success: false, message: `NISN "${nisn}" sudah terdaftar.` };
        }
        const raw = payload as Partial<Student>;
        const matchedClass = db.KELAS.find(
          (c) =>
            (raw.id_kelas && c.id_kelas === raw.id_kelas) ||
            (raw.nama_kelas && c.nama_kelas.toLowerCase() === String(raw.nama_kelas).trim().toLowerCase())
        );
        const resolvedClassId = matchedClass?.id_kelas || String(raw.id_kelas || '');
        if (
          user.role === 'GURU' &&
          !teacherScope.isFullAccess &&
          teacherClasses.size > 0 &&
          resolvedClassId &&
          !teacherClasses.has(resolvedClassId)
        ) {
          return { success: false, message: 'Anda hanya dapat menambahkan siswa pada kelas yang Anda ampu.' };
        }
        const hpVal = String(raw.hp || raw.telepon_ortu || '').trim();
        const telpOrtu = String(raw.telepon_ortu || raw.hp || raw.telepon || '').trim();
        const item: Student = {
          ...(raw as Student),
          no: raw.no !== undefined && String(raw.no).trim() !== '' ? raw.no : db.SISWA.length + 1,
          id_siswa: genId('SIS'),
          id_kelas: resolvedClassId,
          nama_kelas: matchedClass?.nama_kelas || String(raw.nama_kelas || ''),
          hp: hpVal,
          telepon_ortu: telpOrtu,
          status_siswa: (raw.status_siswa as Student['status_siswa']) || 'Aktif',
          foto_url: String(raw.foto_url || ''),
          created_at: now,
          updated_at: now,
        };
        db.SISWA.push(item);
        syncLocalMasterUsers(db, { syncStudentStatusId: item.id_siswa });
        addLocalLog(db, user, 'CREATE', 'SISWA', `Tambah siswa ${item.nama_lengkap}`);
        saveLocalDb(db);
        return { success: true, message: 'Data siswa berhasil ditambahkan.', data: item as unknown as T };
      }
      case 'updateStudent': {
        requireLocalRole(user, ['ADMIN', 'GURU']);
        const id = String(payload.id_siswa || '');
        const nis = String(payload.nis || '').trim();
        const nisn = String(payload.nisn || '').trim();
        if (db.SISWA.some((s) => s.id_siswa !== id && s.nis === nis)) {
          return { success: false, message: `NIS "${nis}" sudah digunakan siswa lain.` };
        }
        if (nisn && db.SISWA.some((s) => s.id_siswa !== id && s.nisn === nisn)) {
          return { success: false, message: `NISN "${nisn}" sudah digunakan siswa lain.` };
        }
        const idx = db.SISWA.findIndex((s) => s.id_siswa === id);
        if (idx === -1) return { success: false, message: 'Siswa tidak ditemukan.' };
        const raw = payload as Partial<Student>;
        const matchedClass = db.KELAS.find(
          (c) =>
            (raw.id_kelas && c.id_kelas === raw.id_kelas) ||
            (raw.nama_kelas && c.nama_kelas.toLowerCase() === String(raw.nama_kelas).trim().toLowerCase())
        );
        const resolvedClassId = matchedClass?.id_kelas || String(raw.id_kelas ?? db.SISWA[idx].id_kelas ?? '');
        if (
          user.role === 'GURU' &&
          !teacherScope.isFullAccess &&
          teacherClasses.size > 0 &&
          ((db.SISWA[idx].id_kelas && !teacherClasses.has(db.SISWA[idx].id_kelas)) ||
            (resolvedClassId && !teacherClasses.has(resolvedClassId)))
        ) {
          return { success: false, message: 'Anda hanya dapat memperbarui siswa pada kelas yang Anda ampu.' };
        }
        const mergedHp = raw.hp !== undefined ? String(raw.hp) : db.SISWA[idx].hp || '';
        const mergedTelp = raw.telepon !== undefined ? String(raw.telepon) : db.SISWA[idx].telepon || '';
        const mergedOrtu =
          raw.telepon_ortu !== undefined
            ? String(raw.telepon_ortu || mergedHp || mergedTelp)
            : mergedHp || mergedTelp || db.SISWA[idx].telepon_ortu || '';
        db.SISWA[idx] = {
          ...db.SISWA[idx],
          ...raw,
          id_kelas: resolvedClassId,
          nama_kelas: matchedClass?.nama_kelas || String(raw.nama_kelas ?? db.SISWA[idx].nama_kelas ?? ''),
          hp: mergedHp || mergedOrtu,
          telepon_ortu: mergedOrtu,
          updated_at: now,
        } as Student;
        syncLocalMasterUsers(db, { syncStudentStatusId: db.SISWA[idx].id_siswa });
        addLocalLog(db, user, 'UPDATE', 'SISWA', `Edit siswa ${db.SISWA[idx].nama_lengkap}`);
        saveLocalDb(db);
        return { success: true, message: 'Data siswa berhasil diperbarui.', data: db.SISWA[idx] as unknown as T };
      }
      case 'deleteStudent': {
        requireLocalRole(user, ['ADMIN']);
        const targetId = String(payload.id_siswa || '');
        db.SISWA = db.SISWA.filter((s) => s.id_siswa !== targetId);
        db.USERS = db.USERS.filter((u) => !(u.role === 'ORANG_TUA' && u.relasi_id === targetId));
        addLocalLog(db, user, 'DELETE', 'SISWA', `Hapus siswa ${targetId}`);
        saveLocalDb(db);
        return { success: true, message: 'Data siswa berhasil dihapus.' };
      }
      case 'importStudents': {
        requireLocalRole(user, ['ADMIN']);
        const rows = (payload.rows as Partial<Student>[]) || [];
        let count = 0;
        for (const r of rows) {
          const nis = String(r.nis || '').trim();
          const nisn = String(r.nisn || '').trim();
          if (!nis || !r.nama_lengkap) continue;
          if (db.SISWA.some((s) => s.nis === nis || (nisn && s.nisn === nisn))) continue;
          const matchedClass = db.KELAS.find(
            (c) =>
              (r.id_kelas && c.id_kelas === r.id_kelas) ||
              (r.nama_kelas && c.nama_kelas.toLowerCase() === String(r.nama_kelas).trim().toLowerCase())
          );
          const hpVal = String(r.hp || r.telepon_ortu || '').trim();
          const telpOrtu = String(r.telepon_ortu || r.hp || r.telepon || '').trim();
          db.SISWA.push({
            ...(r as Student),
            no: r.no !== undefined && String(r.no).trim() !== '' ? r.no : db.SISWA.length + 1,
            id_siswa: genId('SIS'),
            nis,
            nisn,
            nama_lengkap: String(r.nama_lengkap),
            jenis_kelamin: r.jenis_kelamin === 'P' ? 'P' : 'L',
            tempat_lahir: String(r.tempat_lahir || ''),
            tanggal_lahir: String(r.tanggal_lahir || ''),
            alamat: String(r.alamat || ''),
            id_kelas: matchedClass?.id_kelas || String(r.id_kelas || ''),
            nama_kelas: matchedClass?.nama_kelas || String(r.nama_kelas || ''),
            nama_ayah: String(r.nama_ayah || ''),
            nama_ibu: String(r.nama_ibu || ''),
            hp: hpVal,
            telepon_ortu: telpOrtu,
            status_siswa: (r.status_siswa as Student['status_siswa']) || 'Aktif',
            foto_url: String(r.foto_url || ''),
            created_at: now,
            updated_at: now,
          });
          count++;
        }
        if (!payload.skipSync) {
          syncAllLocalIds(db);
        }
        addLocalLog(db, user, 'IMPORT', 'SISWA', `Import ${count} siswa dari Excel`);
        saveLocalDb(db);
        return { success: true, message: `${count} data siswa berhasil diimpor.`, data: { count } as unknown as T };
      }

      case 'getTeachers':
        requireLocalRole(user, ['ADMIN', 'KEPALA_SEKOLAH', 'GURU']);
        return { success: true, message: 'OK', data: db.GURU as unknown as T };
      case 'createTeacher': {
        requireLocalRole(user, ['ADMIN']);
        const raw = payload as Partial<Teacher>;
        const assignment = resolveTeacherClassAssignment(
          {
            mata_pelajaran: raw.mata_pelajaran,
            jabatan: raw.jabatan,
            wali_kelas_id: raw.wali_kelas_id,
            wali_kelas: raw.wali_kelas,
            id_kelas: raw.id_kelas,
          },
          db.KELAS
        );
        const cleanRawNip = String(raw.nip || '').trim();
        const autoUsername =
          String(raw.username || '').trim() || (cleanRawNip && cleanRawNip !== '-' ? cleanRawNip : '');
        const item: Teacher = {
          ...(raw as Teacher),
          no: raw.no !== undefined && String(raw.no).trim() !== '' ? raw.no : db.GURU.length + 1,
          username: autoUsername,
          status_akun: (raw.status_akun as Teacher['status_akun']) || 'Aktif',
          foto_url: String(raw.foto_url || ''),
          id_kelas: assignment.id_kelas,
          wali_kelas_id: assignment.wali_kelas_id,
          wali_kelas: assignment.wali_kelas,
          id_guru: genId('GRU'),
          created_at: now,
          updated_at: now,
        };
        db.GURU.push(item);
        syncLocalTeacherWithClasses(db, item);
        syncLocalTeacherUserRole(db, item);
        addLocalLog(db, user, 'CREATE', 'GURU', `Tambah guru ${item.nama_guru}`);
        saveLocalDb(db);
        return { success: true, message: 'Data guru berhasil ditambahkan.', data: item as unknown as T };
      }
      case 'updateTeacher': {
        requireLocalRole(user, ['ADMIN']);
        const idx = db.GURU.findIndex((g) => g.id_guru === payload.id_guru);
        if (idx === -1) return { success: false, message: 'Guru tidak ditemukan.' };
        const current = db.GURU[idx];
        const nextMapel =
          payload.mata_pelajaran !== undefined ? String(payload.mata_pelajaran) : current.mata_pelajaran;
        const nextJabatan =
          payload.jabatan !== undefined ? String(payload.jabatan) : current.jabatan;
        const assignment = resolveTeacherClassAssignment(
          {
            mata_pelajaran: nextMapel,
            jabatan: nextJabatan,
            wali_kelas_id:
              payload.wali_kelas_id !== undefined ? String(payload.wali_kelas_id) : current.wali_kelas_id,
            wali_kelas:
              payload.wali_kelas !== undefined ? String(payload.wali_kelas) : current.wali_kelas,
            id_kelas:
              payload.id_kelas !== undefined ? String(payload.id_kelas) : current.id_kelas,
          },
          db.KELAS
        );
        const nextNip = String(payload.nip !== undefined ? payload.nip : current.nip || '').trim();
        const nextUsernameInput = String(
          payload.username !== undefined ? payload.username : current.username || ''
        ).trim();
        const resolvedUsername =
          nextUsernameInput || (nextNip && nextNip !== '-' ? nextNip : '');
        const updatedTeacher: Teacher = {
          ...current,
          ...payload,
          username: resolvedUsername,
          id_kelas: assignment.id_kelas,
          wali_kelas_id: assignment.wali_kelas_id,
          wali_kelas: assignment.wali_kelas,
          updated_at: now,
        };
        db.GURU[idx] = updatedTeacher;
        syncLocalTeacherWithClasses(db, updatedTeacher);
        syncLocalTeacherUserRole(db, updatedTeacher);
        saveLocalDb(db);
        return { success: true, message: 'Data guru diperbarui.', data: db.GURU[idx] as unknown as T };
      }
      case 'deleteTeacher': {
        requireLocalRole(user, ['ADMIN']);
        const targetId = String(payload.id_guru || '');
        db.GURU = db.GURU.filter((g) => g.id_guru !== targetId);
        db.KELAS.forEach((c) => {
          if (c.wali_kelas_id === targetId) {
            c.wali_kelas_id = '';
            c.wali_kelas = '';
          }
        });
        db.USERS = db.USERS.filter(
          (u) => !((u.role === 'GURU' || u.role === 'KEPALA_SEKOLAH') && u.relasi_id === targetId)
        );
        saveLocalDb(db);
        return { success: true, message: 'Data guru dihapus.' };
      }
      case 'importTeachers': {
        requireLocalRole(user, ['ADMIN']);
        const rows = (payload.rows as Partial<Teacher>[]) || [];
        let count = 0;
        let skipped = 0;
        for (const r of rows) {
          if (!r.nama_guru) continue;
          const nipKey = String(r.nip || '').trim().toLowerCase();
          const nameKey = String(r.nama_guru || '').trim().toLowerCase();
          const isDup = db.GURU.some((g) => {
            const gNip = String(g.nip || '').trim().toLowerCase();
            const gName = String(g.nama_guru || '').trim().toLowerCase();
            return (nipKey && gNip === nipKey) || (!nipKey && gName === nameKey);
          });
          if (isDup) {
            skipped++;
            continue;
          }
          const assignment = resolveTeacherClassAssignment(
            {
              mata_pelajaran: r.mata_pelajaran,
              jabatan: r.jabatan || 'Guru Kelas',
              wali_kelas_id: r.wali_kelas_id,
              wali_kelas: r.wali_kelas,
              id_kelas: r.id_kelas,
            },
            db.KELAS
          );
          const item: Teacher = {
            ...(r as Teacher),
            no: r.no !== undefined && String(r.no).trim() !== '' ? r.no : db.GURU.length + 1,
            id_guru: genId('GRU'),
            nip: String(r.nip || ''),
            nuptk: String(r.nuptk || ''),
            nama_guru: String(r.nama_guru),
            jenis_kelamin: r.jenis_kelamin === 'P' ? 'P' : 'L',
            jabatan: String(r.jabatan || 'Guru Kelas'),
            status_kepegawaian: (r.status_kepegawaian as Teacher['status_kepegawaian']) || 'PNS',
            mata_pelajaran: String(r.mata_pelajaran || ''),
            id_kelas: assignment.id_kelas,
            wali_kelas_id: assignment.wali_kelas_id,
            wali_kelas: assignment.wali_kelas,
            telepon: String(r.telepon || ''),
            username:
              String(r.username || '').trim() ||
              (String(r.nip || '').trim() && String(r.nip || '').trim() !== '-'
                ? String(r.nip || '').trim()
                : ''),
            status_akun: (r.status_akun as Teacher['status_akun']) || 'Aktif',
            foto_url: String(r.foto_url || ''),
            created_at: now,
            updated_at: now,
          };
          db.GURU.push(item);
          syncLocalTeacherWithClasses(db, item);
          count++;
        }
        if (!payload.skipSync) {
          syncAllLocalIds(db);
        }
        saveLocalDb(db);
        return {
          success: true,
          message: `${count} data guru berhasil diimpor${skipped > 0 ? ` (${skipped} duplikat dilewati).` : '.'}`,
          data: { count, skipped } as unknown as T,
        };
      }

      case 'getClasses': {
        const reorderRes = reorderLocalClassIds(db);
        if (reorderRes.changed) saveLocalDb(db);
        const list = reorderRes.classes
          .map((c) => {
            const count = db.SISWA.filter((s) => {
              const sCid = String(s.id_kelas || '').trim();
              const cCid = String(c.id_kelas || '').trim();
              if (sCid && cCid && sCid === cCid) return true;
              const sName = normSyncText(s.nama_kelas);
              const cName = normSyncText(c.nama_kelas);
              if (sName && cName && sName === cName) return true;
              const sComp = compactClassKey(s.nama_kelas);
              const cComp = compactClassKey(c.nama_kelas);
              if (sComp && cComp && sComp === cComp) return true;
              return false;
            }).length;
            return {
              ...c,
              jumlah_siswa: count,
            };
          })
          .filter((c) => {
            if (user.role === 'GURU') return teacherScope.isFullAccess || teacherClasses.has(c.id_kelas);
            if (user.role === 'ORANG_TUA') {
              const child = db.SISWA.find((s) => s.id_siswa === user.relasi_id);
              return child ? c.id_kelas === child.id_kelas : false;
            }
            return true;
          });
        return { success: true, message: 'OK', data: list as unknown as T };
      }
      case 'createClass': {
        requireLocalRole(user, ['ADMIN']);
        reorderLocalClassIds(db);
        const rawClass = { ...(payload as unknown as ClassRoom) };
        const namaKelas = String(rawClass.nama_kelas || '').trim();
        if (!namaKelas) {
          return { success: false, message: 'Nama Kelas wajib diisi.' };
        }
        const idTahunAjaran = String(rawClass.id_tahun_ajaran || '').trim();
        const duplicate = db.KELAS.some(
          (c) =>
            String(c.nama_kelas || '').trim().toLowerCase() === namaKelas.toLowerCase() &&
            (!idTahunAjaran || !c.id_tahun_ajaran || c.id_tahun_ajaran === idTahunAjaran)
        );
        if (duplicate) {
          return { success: false, message: `Kelas "${namaKelas}" sudah terdaftar.` };
        }
        if (rawClass.wali_kelas_id) {
          const tch = db.GURU.find((g) => g.id_guru === rawClass.wali_kelas_id);
          if (tch && isNonWaliTeacher(tch.mata_pelajaran, tch.jabatan)) {
            return {
              success: false,
              message: 'Guru Mapel (PAI, PJOK, Mapel Lain) dan Kepala Sekolah bukan sebagai Wali Kelas dan tidak dapat ditugaskan menjadi Wali Kelas.',
            };
          }
          if (tch) rawClass.wali_kelas = tch.nama_guru;
        }
        const tempId = generateNextClassId(db.KELAS);
        const yearRow = db.TAHUN_AJARAN.find((y) => y.id_tahun_ajaran === idTahunAjaran);
        const item: ClassRoom = {
          ...rawClass,
          id_kelas: tempId,
          nama_kelas: namaKelas,
          tingkat: String(rawClass.tingkat || '').trim() || inferTingkatFromClassName(namaKelas) || '1',
          wali_kelas_id: String(rawClass.wali_kelas_id || '').trim(),
          wali_kelas: String(rawClass.wali_kelas || '').trim(),
          id_tahun_ajaran: idTahunAjaran,
          tahun_ajaran: String(rawClass.tahun_ajaran || yearRow?.nama_tahun_ajaran || '').trim(),
          created_at: now,
          updated_at: now,
        };
        db.KELAS.push(item);
        const reorderRes = reorderLocalClassIds(db);
        const finalId = reorderRes.idRemap[tempId] || tempId;
        const finalItem = reorderRes.classes.find((c) => c.id_kelas === finalId) || item;
        if (finalItem.wali_kelas_id) {
          const tchIdx = db.GURU.findIndex((g) => g.id_guru === finalItem.wali_kelas_id);
          if (tchIdx !== -1) {
            const prevClassId = db.GURU[tchIdx].wali_kelas_id;
            if (prevClassId && prevClassId !== finalItem.id_kelas) {
              const prevCls = db.KELAS.find((c) => c.id_kelas === prevClassId);
              if (prevCls && prevCls.wali_kelas_id === finalItem.wali_kelas_id) {
                prevCls.wali_kelas_id = '';
                prevCls.wali_kelas = '';
              }
            }
            db.GURU[tchIdx].wali_kelas_id = finalItem.id_kelas;
            db.GURU[tchIdx].wali_kelas = finalItem.nama_kelas;
            db.GURU[tchIdx].id_kelas = finalItem.id_kelas;
          }
        }
        addLocalLog(db, user, 'CREATE', 'KELAS', `Tambah kelas ${finalItem.nama_kelas} (${finalItem.id_kelas})`);
        saveLocalDb(db);
        return { success: true, message: 'Data kelas berhasil ditambahkan.', data: finalItem as unknown as T };
      }
      case 'updateClass': {
        requireLocalRole(user, ['ADMIN']);
        reorderLocalClassIds(db);
        const targetId = String(payload.id_kelas || '').trim();
        const idx = db.KELAS.findIndex((c) => c.id_kelas === targetId);
        if (idx === -1) return { success: false, message: 'Kelas tidak ditemukan.' };
        const rawClass = { ...payload } as Partial<ClassRoom>;
        const nextNama = String(rawClass.nama_kelas ?? db.KELAS[idx].nama_kelas ?? '').trim();
        if (!nextNama) {
          return { success: false, message: 'Nama Kelas wajib diisi.' };
        }
        const nextYearId = String(rawClass.id_tahun_ajaran ?? db.KELAS[idx].id_tahun_ajaran ?? '').trim();
        const duplicate = db.KELAS.some(
          (c, i) =>
            i !== idx &&
            String(c.nama_kelas || '').trim().toLowerCase() === nextNama.toLowerCase() &&
            (!nextYearId || !c.id_tahun_ajaran || c.id_tahun_ajaran === nextYearId)
        );
        if (duplicate) {
          return { success: false, message: `Kelas "${nextNama}" sudah terdaftar.` };
        }
        if (rawClass.wali_kelas_id) {
          const tch = db.GURU.find((g) => g.id_guru === rawClass.wali_kelas_id);
          if (tch && isNonWaliTeacher(tch.mata_pelajaran, tch.jabatan)) {
            return {
              success: false,
              message: 'Guru Mapel (PAI, PJOK, Mapel Lain) dan Kepala Sekolah bukan sebagai Wali Kelas dan tidak dapat ditugaskan menjadi Wali Kelas.',
            };
          }
          if (tch) rawClass.wali_kelas = tch.nama_guru;
        } else if (rawClass.wali_kelas_id === '') {
          rawClass.wali_kelas = '';
        }
        const yearRow = db.TAHUN_AJARAN.find((y) => y.id_tahun_ajaran === nextYearId);
        const updatedClass: ClassRoom = {
          ...db.KELAS[idx],
          ...rawClass,
          id_kelas: db.KELAS[idx].id_kelas || generateNextClassId(db.KELAS),
          nama_kelas: nextNama,
          tingkat:
            String(rawClass.tingkat ?? db.KELAS[idx].tingkat ?? '').trim() ||
            inferTingkatFromClassName(nextNama) ||
            '1',
          id_tahun_ajaran: nextYearId,
          tahun_ajaran: String(rawClass.tahun_ajaran ?? yearRow?.nama_tahun_ajaran ?? db.KELAS[idx].tahun_ajaran ?? '').trim(),
          updated_at: now,
        };
        db.KELAS[idx] = updatedClass;
        db.SISWA.forEach((s) => {
          if (s.id_kelas === updatedClass.id_kelas) {
            s.nama_kelas = updatedClass.nama_kelas;
          }
        });
        db.GURU.forEach((g) => {
          if (g.wali_kelas_id === updatedClass.id_kelas && g.id_guru !== updatedClass.wali_kelas_id) {
            g.wali_kelas_id = '';
            g.wali_kelas = '';
            if (g.id_kelas === updatedClass.id_kelas) g.id_kelas = '';
          }
        });
        if (updatedClass.wali_kelas_id) {
          const tchIdx = db.GURU.findIndex((g) => g.id_guru === updatedClass.wali_kelas_id);
          if (tchIdx !== -1) {
            const prevClassId = db.GURU[tchIdx].wali_kelas_id;
            if (prevClassId && prevClassId !== updatedClass.id_kelas) {
              const prevCls = db.KELAS.find((c) => c.id_kelas === prevClassId);
              if (prevCls && prevCls.wali_kelas_id === updatedClass.wali_kelas_id) {
                prevCls.wali_kelas_id = '';
                prevCls.wali_kelas = '';
              }
            }
            db.GURU[tchIdx].wali_kelas_id = updatedClass.id_kelas;
            db.GURU[tchIdx].wali_kelas = updatedClass.nama_kelas;
            db.GURU[tchIdx].id_kelas = updatedClass.id_kelas;
          }
        }
        const reorderRes = reorderLocalClassIds(db);
        const finalId = reorderRes.idRemap[updatedClass.id_kelas] || updatedClass.id_kelas;
        const finalCls = reorderRes.classes.find((c) => c.id_kelas === finalId) || updatedClass;
        addLocalLog(db, user, 'UPDATE', 'KELAS', `Edit kelas ${finalCls.nama_kelas} (${finalCls.id_kelas})`);
        saveLocalDb(db);
        return { success: true, message: 'Data kelas diperbarui.', data: finalCls as unknown as T };
      }
      case 'deleteClass':
        requireLocalRole(user, ['ADMIN']);
        db.KELAS = db.KELAS.filter((c) => c.id_kelas !== payload.id_kelas);
        db.GURU.forEach((g) => {
          if (g.wali_kelas_id === payload.id_kelas) {
            g.wali_kelas_id = '';
            g.wali_kelas = '';
            if (g.id_kelas === payload.id_kelas) g.id_kelas = '';
          }
        });
        reorderLocalClassIds(db);
        saveLocalDb(db);
        return { success: true, message: 'Data kelas dihapus.' };
      case 'reorderClassIds': {
        requireLocalRole(user, ['ADMIN']);
        const reorderRes = reorderLocalClassIds(db, user);
        saveLocalDb(db);
        const remappedCount = Object.keys(reorderRes.idRemap).length;
        const msg = reorderRes.changed
          ? `Class ID berhasil diurutkan sesuai Nama Kelas (${reorderRes.classes.length} kelas${
              remappedCount > 0 ? `, ${remappedCount} ID diperbarui` : ''
            }).`
          : 'Seluruh Class ID sudah urut sesuai Nama Kelas.';
        return {
          success: true,
          message: msg,
          data: {
            classes: reorderRes.classes,
            ...reorderRes.report,
          } as unknown as T,
        };
      }

      case 'getSubjects':
        return {
          success: true,
          message: 'OK',
          data: db.MAPEL.map((m, i) => normalizeSubjectRecord(m as unknown as Record<string, unknown>, i, db.MAPEL)) as unknown as T,
        };
      case 'createSubject': {
        requireLocalRole(user, ['ADMIN']);
        const nama = String(payload.nama_mapel || '').trim();
        if (!nama) {
          return { success: false, message: 'Nama Mata Pelajaran wajib diisi.' };
        }
        const kodeInput = String(payload.kode_mapel || '').trim().toUpperCase();
        const kode = kodeInput || suggestSubjectCode(nama, db.MAPEL);
        if (!kode) {
          return { success: false, message: 'Kode Mata Pelajaran wajib diisi.' };
        }
        if (db.MAPEL.some((m) => String(m.kode_mapel || '').trim().toLowerCase() === kode.toLowerCase())) {
          return { success: false, message: `Kode mata pelajaran "${kode}" sudah digunakan.` };
        }
        const requestedId = String(payload.id_mapel || '').trim();
        const idExists = requestedId !== '' && db.MAPEL.some((m) => m.id_mapel === requestedId);
        const autoId = requestedId && !idExists ? requestedId : generateNextSubjectId(db.MAPEL);
        const item: Subject = {
          id_mapel: autoId,
          kode_mapel: kode,
          nama_mapel: nama,
          kelompok: (payload.kelompok as Subject['kelompok']) || 'Wajib',
          alokasi_waktu: Number(payload.alokasi_waktu) > 0 ? Number(payload.alokasi_waktu) : 2,
          status_aktif: (payload.status_aktif as Subject['status_aktif']) || 'Aktif',
          created_at: now,
          updated_at: now,
        };
        db.MAPEL.push(item);
        addLocalLog(db, user, 'CREATE', 'MAPEL', `Tambah mapel ${item.nama_mapel} (${item.id_mapel})`);
        saveLocalDb(db);
        return { success: true, message: 'Mata pelajaran berhasil ditambahkan.', data: item as unknown as T };
      }
      case 'updateSubject': {
        requireLocalRole(user, ['ADMIN']);
        const targetId = String(payload.id_mapel || '').trim();
        const idx = db.MAPEL.findIndex((m) => m.id_mapel === targetId);
        if (idx === -1) return { success: false, message: 'Mapel tidak ditemukan.' };
        const nextKode = String(payload.kode_mapel ?? db.MAPEL[idx].kode_mapel ?? '').trim().toUpperCase();
        const nextNama = String(payload.nama_mapel ?? db.MAPEL[idx].nama_mapel ?? '').trim();
        if (!nextKode || !nextNama) {
          return { success: false, message: 'Kode dan Nama Mata Pelajaran wajib diisi.' };
        }
        if (
          db.MAPEL.some(
            (m, i) => i !== idx && String(m.kode_mapel || '').trim().toLowerCase() === nextKode.toLowerCase()
          )
        ) {
          return { success: false, message: `Kode mata pelajaran "${nextKode}" sudah digunakan.` };
        }
        db.MAPEL[idx] = {
          ...db.MAPEL[idx],
          ...payload,
          id_mapel: db.MAPEL[idx].id_mapel || generateNextSubjectId(db.MAPEL),
          kode_mapel: nextKode,
          nama_mapel: nextNama,
          kelompok: (payload.kelompok as Subject['kelompok']) || db.MAPEL[idx].kelompok || 'Wajib',
          alokasi_waktu: Number(payload.alokasi_waktu ?? db.MAPEL[idx].alokasi_waktu) || 2,
          status_aktif: (payload.status_aktif as Subject['status_aktif']) || db.MAPEL[idx].status_aktif || 'Aktif',
          updated_at: now,
        } as Subject;
        saveLocalDb(db);
        return { success: true, message: 'Mata pelajaran diperbarui.', data: db.MAPEL[idx] as unknown as T };
      }
      case 'deleteSubject':
        requireLocalRole(user, ['ADMIN']);
        db.MAPEL = db.MAPEL.filter((m) => m.id_mapel !== payload.id_mapel);
        saveLocalDb(db);
        return { success: true, message: 'Mata pelajaran dihapus.' };

      case 'getSchedules': {
        const list = db.JADWAL.map((raw) => {
          const j = normalizeScheduleRecord(raw as unknown as Record<string, unknown>);
          const cls = db.KELAS.find(
            (c) =>
              (j.id_kelas && c.id_kelas === j.id_kelas) ||
              (j.nama_kelas && String(c.nama_kelas || '').trim().toLowerCase() === j.nama_kelas.toLowerCase())
          );
          const sub = db.MAPEL.find(
            (m) =>
              (j.id_mapel && m.id_mapel === j.id_mapel) ||
              (j.nama_mapel && String(m.nama_mapel || '').trim().toLowerCase() === j.nama_mapel.toLowerCase())
          );
          const tch = db.GURU.find(
            (g) =>
              (j.id_guru && g.id_guru === j.id_guru) ||
              (j.nama_guru && String(g.nama_guru || '').trim().toLowerCase() === j.nama_guru.toLowerCase())
          );
          return {
            ...j,
            id_kelas: cls?.id_kelas || j.id_kelas,
            nama_kelas: cls?.nama_kelas || j.nama_kelas,
            id_mapel: sub?.id_mapel || j.id_mapel,
            nama_mapel: sub?.nama_mapel || j.nama_mapel,
            id_guru: tch?.id_guru || j.id_guru,
            nama_guru: tch?.nama_guru || j.nama_guru,
          };
        }).filter((j) => {
          if (user.role === 'GURU') {
            if (teacherScope.isFullAccess) return true;
            return j.id_guru === (teacherScope.teacher?.id_guru || user.relasi_id) || teacherClasses.has(j.id_kelas);
          }
          if (user.role === 'ORANG_TUA') {
            const child = db.SISWA.find((s) => s.id_siswa === user.relasi_id);
            return child ? j.id_kelas === child.id_kelas : false;
          }
          return true;
        });
        return { success: true, message: 'OK', data: list as unknown as T };
      }
      case 'createSchedule': {
        requireLocalRole(user, ['ADMIN']);
        const raw = normalizeScheduleRecord(payload);
        const cls = db.KELAS.find(
          (c) =>
            (raw.id_kelas && c.id_kelas === raw.id_kelas) ||
            (raw.nama_kelas && String(c.nama_kelas || '').trim().toLowerCase() === raw.nama_kelas.toLowerCase())
        );
        const sub = db.MAPEL.find(
          (m) =>
            (raw.id_mapel && m.id_mapel === raw.id_mapel) ||
            (raw.nama_mapel && String(m.nama_mapel || '').trim().toLowerCase() === raw.nama_mapel.toLowerCase())
        );
        const tch = db.GURU.find(
          (g) =>
            (raw.id_guru && g.id_guru === raw.id_guru) ||
            (raw.nama_guru && String(g.nama_guru || '').trim().toLowerCase() === raw.nama_guru.toLowerCase())
        );
        const item: ScheduleItem = {
          ...raw,
          id_jadwal: genId('JDW'),
          id_kelas: cls?.id_kelas || raw.id_kelas,
          nama_kelas: cls?.nama_kelas || raw.nama_kelas,
          id_mapel: sub?.id_mapel || raw.id_mapel,
          nama_mapel: sub?.nama_mapel || raw.nama_mapel,
          id_guru: tch?.id_guru || raw.id_guru,
          nama_guru: tch?.nama_guru || raw.nama_guru,
          created_at: now,
          updated_at: now,
        };
        db.JADWAL.push(item);
        saveLocalDb(db);
        return { success: true, message: 'Jadwal berhasil ditambahkan.', data: item as unknown as T };
      }
      case 'updateSchedule': {
        requireLocalRole(user, ['ADMIN']);
        const idx = db.JADWAL.findIndex((j) => j.id_jadwal === payload.id_jadwal);
        if (idx === -1) return { success: false, message: 'Jadwal tidak ditemukan.' };
        const mergedRaw = { ...db.JADWAL[idx], ...payload };
        const norm = normalizeScheduleRecord(mergedRaw);
        const cls = db.KELAS.find(
          (c) =>
            (norm.id_kelas && c.id_kelas === norm.id_kelas) ||
            (norm.nama_kelas && String(c.nama_kelas || '').trim().toLowerCase() === norm.nama_kelas.toLowerCase())
        );
        const sub = db.MAPEL.find(
          (m) =>
            (norm.id_mapel && m.id_mapel === norm.id_mapel) ||
            (norm.nama_mapel && String(m.nama_mapel || '').trim().toLowerCase() === norm.nama_mapel.toLowerCase())
        );
        const tch = db.GURU.find(
          (g) =>
            (norm.id_guru && g.id_guru === norm.id_guru) ||
            (norm.nama_guru && String(g.nama_guru || '').trim().toLowerCase() === norm.nama_guru.toLowerCase())
        );
        db.JADWAL[idx] = {
          ...norm,
          id_kelas: cls?.id_kelas || norm.id_kelas,
          nama_kelas: cls?.nama_kelas || norm.nama_kelas,
          id_mapel: sub?.id_mapel || norm.id_mapel,
          nama_mapel: sub?.nama_mapel || norm.nama_mapel,
          id_guru: tch?.id_guru || norm.id_guru,
          nama_guru: tch?.nama_guru || norm.nama_guru,
          updated_at: now,
        } as ScheduleItem;
        saveLocalDb(db);
        return { success: true, message: 'Jadwal diperbarui.', data: db.JADWAL[idx] as unknown as T };
      }
      case 'deleteSchedule':
        requireLocalRole(user, ['ADMIN']);
        db.JADWAL = db.JADWAL.filter((j) => j.id_jadwal !== payload.id_jadwal);
        saveLocalDb(db);
        return { success: true, message: 'Jadwal dihapus.' };

      case 'getPickets': {
        requireLocalRole(user, ['ADMIN', 'KEPALA_SEKOLAH', 'GURU']);
        const pickets = (
          user.role === 'GURU' && !teacherScope.isFullAccess
            ? db.PIKET.filter(
                (p) =>
                  (p.id_kelas && teacherClasses.has(p.id_kelas)) ||
                  (!p.id_kelas && p.id_guru === (teacherScope.teacher?.id_guru || user.relasi_id))
              )
            : db.PIKET
        ).map((p) => normalizePicketRecord(p as unknown as Record<string, unknown>));
        return { success: true, message: 'OK', data: pickets as unknown as T };
      }
      case 'createPicket': {
        requireLocalRole(user, ['ADMIN', 'GURU']);
        const rawIds = String(payload.id_siswa || '')
          .split(/[\n,]+/)
          .map((s) => s.trim())
          .filter(Boolean);
        const rawNames = String(payload.petugas_siswa || '')
          .split(/[\n,]+/)
          .map((s) => s.trim())
          .filter(Boolean);
        const resolvedIds = [...new Set(rawIds)];
        if (resolvedIds.length === 0 && rawNames.length > 0) {
          rawNames.forEach((nm) => {
            const st = db.SISWA.find(
              (s) =>
                s.nama_lengkap.trim().toLowerCase() === nm.toLowerCase() &&
                (!payload.id_kelas || s.id_kelas === payload.id_kelas)
            ) || db.SISWA.find((s) => s.nama_lengkap.trim().toLowerCase() === nm.toLowerCase());
            if (st?.id_siswa && !resolvedIds.includes(st.id_siswa)) resolvedIds.push(st.id_siswa);
          });
        }
        const item: PicketSchedule = {
          ...(payload as unknown as PicketSchedule),
          id_piket: genId('PKT'),
          id_siswa: resolvedIds.join(', '),
          checklist_kebersihan: normalizeChecklistField(payload.checklist_kebersihan),
          created_at: now,
          updated_at: now,
        };
        db.PIKET.push(item);
        saveLocalDb(db);
        return { success: true, message: 'Jadwal piket ditambahkan.', data: item as unknown as T };
      }
      case 'updatePicket': {
        requireLocalRole(user, ['ADMIN', 'GURU']);
        const idx = db.PIKET.findIndex((p) => p.id_piket === payload.id_piket);
        if (idx === -1) return { success: false, message: 'Data piket tidak ditemukan.' };
        const merged = { ...db.PIKET[idx], ...payload };
        const rawIds = String(merged.id_siswa || '')
          .split(/[\n,]+/)
          .map((s) => s.trim())
          .filter(Boolean);
        const rawNames = String(merged.petugas_siswa || '')
          .split(/[\n,]+/)
          .map((s) => s.trim())
          .filter(Boolean);
        const resolvedIds = [...new Set(rawIds)];
        if (resolvedIds.length === 0 && rawNames.length > 0) {
          rawNames.forEach((nm) => {
            const st = db.SISWA.find(
              (s) =>
                s.nama_lengkap.trim().toLowerCase() === nm.toLowerCase() &&
                (!merged.id_kelas || s.id_kelas === merged.id_kelas)
            ) || db.SISWA.find((s) => s.nama_lengkap.trim().toLowerCase() === nm.toLowerCase());
            if (st?.id_siswa && !resolvedIds.includes(st.id_siswa)) resolvedIds.push(st.id_siswa);
          });
        }
        db.PIKET[idx] = {
          ...merged,
          id_siswa: resolvedIds.join(', '),
          checklist_kebersihan: normalizeChecklistField(merged.checklist_kebersihan),
          updated_at: now,
        } as PicketSchedule;
        saveLocalDb(db);
        return { success: true, message: 'Jadwal piket diperbarui.', data: db.PIKET[idx] as unknown as T };
      }
      case 'deletePicket':
        requireLocalRole(user, ['ADMIN', 'GURU']);
        db.PIKET = db.PIKET.filter((p) => p.id_piket !== payload.id_piket);
        saveLocalDb(db);
        return { success: true, message: 'Jadwal piket dihapus.' };

      case 'getAttendance': {
        const enriched = db.ABSENSI.map((raw) => {
          const norm = normalizeAttendanceRecord(raw as unknown as Record<string, unknown>);
          const cls = db.KELAS.find(
            (c) =>
              (norm.id_kelas && c.id_kelas === norm.id_kelas) ||
              (norm.nama_kelas && normSyncText(c.nama_kelas) === normSyncText(norm.nama_kelas))
          );
          const std =
            db.SISWA.find((s) => norm.id_siswa && s.id_siswa === norm.id_siswa) ||
            db.SISWA.find(
              (s) =>
                norm.nama_siswa &&
                normSyncText(s.nama_lengkap) === normSyncText(norm.nama_siswa) &&
                (!cls || s.id_kelas === cls.id_kelas || normSyncText(s.nama_kelas) === normSyncText(cls.nama_kelas))
            );
          const finalCls =
            cls ||
            (std
              ? db.KELAS.find(
                  (c) =>
                    (std.id_kelas && c.id_kelas === std.id_kelas) ||
                    (std.nama_kelas && normSyncText(c.nama_kelas) === normSyncText(std.nama_kelas))
                )
              : undefined);
          return {
            ...norm,
            id_siswa: std?.id_siswa || norm.id_siswa,
            nama_siswa: std?.nama_lengkap || norm.nama_siswa,
            id_kelas: finalCls?.id_kelas || std?.id_kelas || norm.id_kelas,
            nama_kelas: finalCls?.nama_kelas || std?.nama_kelas || norm.nama_kelas,
          };
        });
        return { success: true, message: 'OK', data: scopeStudentRows(enriched) as unknown as T };
      }
      case 'saveAttendance': {
        requireLocalRole(user, ['ADMIN', 'GURU']);
        const records = ((payload.records as Record<string, unknown>[]) || []).map((r) =>
          normalizeAttendanceRecord(r)
        );
        if (
          user.role === 'GURU' &&
          !teacherScope.isFullAccess &&
          teacherClasses.size > 0 &&
          records.some((r) => r.id_kelas && !teacherClasses.has(r.id_kelas))
        ) {
          return { success: false, message: 'Anda hanya dapat menyimpan absensi pada kelas yang Anda ampu.' };
        }
        const saved: AttendanceRecord[] = [];
        for (const rec of records) {
          const cls = db.KELAS.find(
            (c) =>
              (rec.id_kelas && c.id_kelas === rec.id_kelas) ||
              (rec.nama_kelas && normSyncText(c.nama_kelas) === normSyncText(rec.nama_kelas))
          );
          const std =
            db.SISWA.find((s) => rec.id_siswa && s.id_siswa === rec.id_siswa) ||
            db.SISWA.find(
              (s) =>
                rec.nama_siswa &&
                normSyncText(s.nama_lengkap) === normSyncText(rec.nama_siswa) &&
                (!cls || s.id_kelas === cls.id_kelas || normSyncText(s.nama_kelas) === normSyncText(cls.nama_kelas))
            );
          const enrichedRec: AttendanceRecord = {
            ...rec,
            id_siswa: std?.id_siswa || rec.id_siswa,
            nama_siswa: std?.nama_lengkap || rec.nama_siswa,
            id_kelas: cls?.id_kelas || std?.id_kelas || rec.id_kelas,
            nama_kelas: cls?.nama_kelas || std?.nama_kelas || rec.nama_kelas,
          };
          const idx = db.ABSENSI.findIndex((a) => {
            if (normalizeYmdDate(a.tanggal) !== enrichedRec.tanggal) return false;
            if (enrichedRec.id_siswa && a.id_siswa === enrichedRec.id_siswa) return true;
            if (
              (!a.id_siswa || !enrichedRec.id_siswa) &&
              enrichedRec.nama_siswa &&
              normSyncText(a.nama_siswa) === normSyncText(enrichedRec.nama_siswa) &&
              (!enrichedRec.id_kelas || !a.id_kelas || a.id_kelas === enrichedRec.id_kelas)
            ) {
              return true;
            }
            return false;
          });
          if (idx !== -1) {
            const existing = db.ABSENSI[idx];
            const koreksi =
              enrichedRec.koreksi_catatan ||
              (normalizeAttendanceStatus(existing.status) !== enrichedRec.status
                ? `Koreksi oleh ${user.nama_lengkap} (${now.slice(0, 16).replace('T', ' ')})`
                : existing.koreksi_catatan);
            db.ABSENSI[idx] = {
              ...existing,
              ...enrichedRec,
              id_absensi: existing.id_absensi || genId('ABS'),
              koreksi_catatan: koreksi,
              diinput_oleh: user.nama_lengkap,
              updated_at: now,
            };
            saved.push(db.ABSENSI[idx]);
          } else {
            const newItem: AttendanceRecord = {
              ...enrichedRec,
              id_absensi: genId('ABS'),
              diinput_oleh: user.nama_lengkap,
              created_at: now,
              updated_at: now,
            };
            db.ABSENSI.push(newItem);
            saved.push(newItem);
          }
        }
        addLocalLog(db, user, 'SAVE', 'ABSENSI', `Simpan ${records.length} absensi siswa`);
        saveLocalDb(db);
        return { success: true, message: `${records.length} data absensi berhasil disimpan.`, data: saved as unknown as T };
      }

      case 'getGrades':
      case 'getGradeRecap':
        return { success: true, message: 'OK', data: scopeStudentRows(db.NILAI) as unknown as T };
      case 'saveGrades': {
        requireLocalRole(user, ['ADMIN', 'GURU']);
        const records = (payload.records as GradeRecord[]) || [];
        if (
          user.role === 'GURU' &&
          !teacherScope.isFullAccess &&
          teacherClasses.size > 0 &&
          records.some((r) => r.id_kelas && !teacherClasses.has(r.id_kelas))
        ) {
          return { success: false, message: 'Anda hanya dapat menyimpan nilai pada kelas yang Anda ampu.' };
        }
        for (const rec of records) {
          const stats = computeSubjectGradeStats(rec);
          const idx = db.NILAI.findIndex(
            (n) =>
              n.id_siswa === rec.id_siswa &&
              n.id_mapel === rec.id_mapel &&
              n.id_tahun_ajaran === rec.id_tahun_ajaran &&
              n.semester === rec.semester
          );
          if (idx !== -1) {
            db.NILAI[idx] = {
              ...db.NILAI[idx],
              ...rec,
              id_nilai: db.NILAI[idx].id_nilai,
              rata_rata: stats.rata_rata,
              jumlah_komponen: stats.jumlah_komponen,
              updated_at: now,
            };
          } else {
            db.NILAI.push({
              ...rec,
              id_nilai: genId('NIL'),
              rata_rata: stats.rata_rata,
              jumlah_komponen: stats.jumlah_komponen,
              created_at: now,
              updated_at: now,
            });
          }
        }
        addLocalLog(db, user, 'SAVE', 'NILAI', `Simpan ${records.length} nilai siswa`);
        saveLocalDb(db);
        return { success: true, message: `${records.length} nilai siswa berhasil disimpan.` };
      }

      case 'getJournals': {
        requireLocalRole(user, ['ADMIN', 'KEPALA_SEKOLAH', 'GURU']);
        let mutated = false;
        const enriched = db.JURNAL.map((raw) => {
          const norm = normalizeJournalRecord(raw as unknown as Record<string, unknown>);
          if (!norm.id_jurnal) {
            norm.id_jurnal = genId('JRN');
            raw.id_jurnal = norm.id_jurnal;
            mutated = true;
          }
          const cls = db.KELAS.find(
            (c) =>
              (norm.id_kelas && c.id_kelas === norm.id_kelas) ||
              (norm.nama_kelas && normSyncText(c.nama_kelas) === normSyncText(norm.nama_kelas))
          );
          const sub = db.MAPEL.find(
            (m) =>
              (norm.id_mapel && m.id_mapel === norm.id_mapel) ||
              (norm.nama_mapel &&
                (normSyncText(m.nama_mapel) === normSyncText(norm.nama_mapel) ||
                  normSyncText(m.kode_mapel) === normSyncText(norm.nama_mapel)))
          );
          const tch = db.GURU.find(
            (g) =>
              (norm.id_guru && g.id_guru === norm.id_guru) ||
              (norm.nama_guru && normSyncText(g.nama_guru) === normSyncText(norm.nama_guru))
          );
          return {
            ...norm,
            id_kelas: cls?.id_kelas || norm.id_kelas,
            nama_kelas: cls?.nama_kelas || norm.nama_kelas,
            id_mapel: sub?.id_mapel || norm.id_mapel,
            nama_mapel: sub?.nama_mapel || norm.nama_mapel,
            id_guru: tch?.id_guru || norm.id_guru,
            nama_guru: tch?.nama_guru || norm.nama_guru,
          };
        });
        if (mutated) saveLocalDb(db);
        return {
          success: true,
          message: 'OK',
          data: enriched.filter((j) =>
            user.role === 'GURU'
              ? teacherScope.isFullAccess ||
                j.id_guru === (teacherScope.teacher?.id_guru || user.relasi_id) ||
                teacherClasses.has(j.id_kelas)
              : true
          ) as unknown as T,
        };
      }
      case 'createJournal': {
        requireLocalRole(user, ['ADMIN', 'GURU']);
        const raw = normalizeJournalRecord(payload);
        const cls = db.KELAS.find(
          (c) =>
            (raw.id_kelas && c.id_kelas === raw.id_kelas) ||
            (raw.nama_kelas && normSyncText(c.nama_kelas) === normSyncText(raw.nama_kelas))
        );
        const sub = db.MAPEL.find(
          (m) =>
            (raw.id_mapel && m.id_mapel === raw.id_mapel) ||
            (raw.nama_mapel && normSyncText(m.nama_mapel) === normSyncText(raw.nama_mapel))
        );
        const tch = db.GURU.find(
          (g) =>
            (raw.id_guru && g.id_guru === raw.id_guru) ||
            (raw.nama_guru && normSyncText(g.nama_guru) === normSyncText(raw.nama_guru))
        );
        const item: TeacherJournal = {
          ...raw,
          id_jurnal: genId('JRN'),
          id_kelas: cls?.id_kelas || raw.id_kelas,
          nama_kelas: cls?.nama_kelas || raw.nama_kelas,
          id_mapel: sub?.id_mapel || raw.id_mapel,
          nama_mapel: sub?.nama_mapel || raw.nama_mapel,
          id_guru: tch?.id_guru || raw.id_guru,
          nama_guru: tch?.nama_guru || raw.nama_guru,
          created_at: now,
          updated_at: now,
        };
        db.JURNAL.push(item);
        addLocalLog(db, user, 'CREATE', 'JURNAL', `Tambah jurnal ${item.nama_guru || item.materi}`);
        saveLocalDb(db);
        return { success: true, message: 'Jurnal guru ditambahkan.', data: item as unknown as T };
      }
      case 'updateJournal': {
        requireLocalRole(user, ['ADMIN', 'GURU']);
        const raw = normalizeJournalRecord(payload);
        const targetId = String(raw.id_jurnal || '').trim();
        const idx = targetId
          ? db.JURNAL.findIndex((j) => String(j.id_jurnal || '').trim() === targetId)
          : -1;
        if (!targetId || idx === -1) {
          return { success: false, message: 'Data jurnal tidak ditemukan untuk diperbarui.' };
        }
        const base = db.JURNAL[idx];
        const merged = normalizeJournalRecord({ ...base, ...raw } as unknown as Record<string, unknown>);
        const cls = db.KELAS.find(
          (c) =>
            (merged.id_kelas && c.id_kelas === merged.id_kelas) ||
            (merged.nama_kelas && normSyncText(c.nama_kelas) === normSyncText(merged.nama_kelas))
        );
        const sub = db.MAPEL.find(
          (m) =>
            (merged.id_mapel && m.id_mapel === merged.id_mapel) ||
            (merged.nama_mapel && normSyncText(m.nama_mapel) === normSyncText(merged.nama_mapel))
        );
        const tch = db.GURU.find(
          (g) =>
            (merged.id_guru && g.id_guru === merged.id_guru) ||
            (merged.nama_guru && normSyncText(g.nama_guru) === normSyncText(merged.nama_guru))
        );
        const finalItem: TeacherJournal = {
          ...merged,
          id_jurnal: targetId,
          id_kelas: cls?.id_kelas || merged.id_kelas,
          nama_kelas: cls?.nama_kelas || merged.nama_kelas,
          id_mapel: sub?.id_mapel || merged.id_mapel,
          nama_mapel: sub?.nama_mapel || merged.nama_mapel,
          id_guru: tch?.id_guru || merged.id_guru,
          nama_guru: tch?.nama_guru || merged.nama_guru,
          created_at: base.created_at || merged.created_at || now,
          updated_at: now,
        };
        db.JURNAL[idx] = finalItem;
        addLocalLog(db, user, 'UPDATE', 'JURNAL', `Edit jurnal ${finalItem.nama_guru || finalItem.materi}`);
        saveLocalDb(db);
        return { success: true, message: 'Jurnal guru diperbarui.', data: finalItem as unknown as T };
      }
      case 'deleteJournal': {
        requireLocalRole(user, ['ADMIN', 'GURU']);
        const targetId = String(payload.id_jurnal || '').trim();
        const beforeLen = db.JURNAL.length;
        if (targetId) {
          db.JURNAL = db.JURNAL.filter((j) => String(j.id_jurnal || '').trim() !== targetId);
        } else {
          const targetTgl = normalizeYmdDate(payload.tanggal);
          const targetMat = normSyncText(payload.materi);
          let removed = false;
          db.JURNAL = db.JURNAL.filter((j) => {
            if (!removed && (!targetTgl || normalizeYmdDate(j.tanggal) === targetTgl) && (!targetMat || normSyncText(j.materi) === targetMat)) {
              removed = true;
              return false;
            }
            return true;
          });
        }
        if (db.JURNAL.length === beforeLen) {
          return { success: false, message: 'Data jurnal tidak ditemukan untuk dihapus.' };
        }
        addLocalLog(db, user, 'DELETE', 'JURNAL', `Hapus jurnal (${targetId || String(payload.materi || '')})`);
        saveLocalDb(db);
        return { success: true, message: 'Jurnal guru dihapus.' };
      }

      case 'getCharacters':
        return { success: true, message: 'OK', data: scopeStudentRows(db.KARAKTER as { id_siswa?: string; id_kelas?: string }[]) as unknown as T };
      case 'createCharacter': {
        requireLocalRole(user, ['ADMIN', 'GURU']);
        const item = { ...payload, id_karakter: genId('KRK'), created_at: now, updated_at: now };
        db.KARAKTER.push(item);
        saveLocalDb(db);
        return { success: true, message: 'Catatan karakter disimpan.', data: item as unknown as T };
      }
      case 'updateCharacter': {
        requireLocalRole(user, ['ADMIN', 'GURU']);
        const idx = db.KARAKTER.findIndex((c) => c.id_karakter === payload.id_karakter);
        if (idx === -1) return { success: false, message: 'Data tidak ditemukan.' };
        db.KARAKTER[idx] = { ...db.KARAKTER[idx], ...payload, updated_at: now };
        saveLocalDb(db);
        return { success: true, message: 'Catatan karakter diperbarui.', data: db.KARAKTER[idx] as unknown as T };
      }
      case 'deleteCharacter':
        requireLocalRole(user, ['ADMIN', 'GURU']);
        db.KARAKTER = db.KARAKTER.filter((c) => c.id_karakter !== payload.id_karakter);
        saveLocalDb(db);
        return { success: true, message: 'Catatan karakter dihapus.' };

      case 'getHealthRecords':
        requireLocalRole(user, ['ADMIN', 'KEPALA_SEKOLAH', 'GURU']);
        return { success: true, message: 'OK', data: scopeStudentRows(db.KESEHATAN) as unknown as T };
      case 'createHealthRecord': {
        requireLocalRole(user, ['ADMIN', 'GURU']);
        const item: HealthRecord = { ...(payload as unknown as HealthRecord), id_kesehatan: genId('KES'), created_at: now, updated_at: now };
        db.KESEHATAN.push(item);
        saveLocalDb(db);
        return { success: true, message: 'Catatan kesehatan ditambahkan.', data: item as unknown as T };
      }
      case 'updateHealthRecord': {
        requireLocalRole(user, ['ADMIN', 'GURU']);
        const idx = db.KESEHATAN.findIndex((h) => h.id_kesehatan === payload.id_kesehatan);
        if (idx === -1) return { success: false, message: 'Data tidak ditemukan.' };
        db.KESEHATAN[idx] = { ...db.KESEHATAN[idx], ...payload, updated_at: now } as HealthRecord;
        saveLocalDb(db);
        return { success: true, message: 'Catatan kesehatan diperbarui.', data: db.KESEHATAN[idx] as unknown as T };
      }
      case 'deleteHealthRecord':
        requireLocalRole(user, ['ADMIN']);
        db.KESEHATAN = db.KESEHATAN.filter((h) => h.id_kesehatan !== payload.id_kesehatan);
        saveLocalDb(db);
        return { success: true, message: 'Catatan kesehatan dihapus.' };

      case 'getCounselingRecords':
        requireLocalRole(user, ['ADMIN', 'KEPALA_SEKOLAH', 'GURU']);
        return { success: true, message: 'OK', data: scopeStudentRows(db.BIMBINGAN) as unknown as T };
      case 'createCounselingRecord': {
        requireLocalRole(user, ['ADMIN', 'GURU']);
        const item: CounselingRecord = { ...(payload as unknown as CounselingRecord), id_bimbingan: genId('BK'), created_at: now, updated_at: now };
        db.BIMBINGAN.push(item);
        saveLocalDb(db);
        return { success: true, message: 'Catatan bimbingan ditambahkan.', data: item as unknown as T };
      }
      case 'updateCounselingRecord': {
        requireLocalRole(user, ['ADMIN', 'GURU']);
        const idx = db.BIMBINGAN.findIndex((b) => b.id_bimbingan === payload.id_bimbingan);
        if (idx === -1) return { success: false, message: 'Data tidak ditemukan.' };
        db.BIMBINGAN[idx] = { ...db.BIMBINGAN[idx], ...payload, updated_at: now } as CounselingRecord;
        saveLocalDb(db);
        return { success: true, message: 'Catatan bimbingan diperbarui.', data: db.BIMBINGAN[idx] as unknown as T };
      }
      case 'deleteCounselingRecord':
        requireLocalRole(user, ['ADMIN']);
        db.BIMBINGAN = db.BIMBINGAN.filter((b) => b.id_bimbingan !== payload.id_bimbingan);
        saveLocalDb(db);
        return { success: true, message: 'Catatan bimbingan dihapus.' };

      case 'getAchievements':
        return { success: true, message: 'OK', data: scopeStudentRows(db.PRESTASI) as unknown as T };
      case 'createAchievement': {
        requireLocalRole(user, ['ADMIN', 'GURU']);
        const item: AchievementRecord = { ...(payload as unknown as AchievementRecord), id_prestasi: genId('PRS'), created_at: now, updated_at: now };
        db.PRESTASI.push(item);
        saveLocalDb(db);
        return { success: true, message: 'Prestasi siswa ditambahkan.', data: item as unknown as T };
      }
      case 'updateAchievement': {
        requireLocalRole(user, ['ADMIN', 'GURU']);
        const idx = db.PRESTASI.findIndex((p) => p.id_prestasi === payload.id_prestasi);
        if (idx === -1) return { success: false, message: 'Data tidak ditemukan.' };
        db.PRESTASI[idx] = { ...db.PRESTASI[idx], ...payload, updated_at: now } as AchievementRecord;
        saveLocalDb(db);
        return { success: true, message: 'Prestasi diperbarui.', data: db.PRESTASI[idx] as unknown as T };
      }
      case 'deleteAchievement':
        requireLocalRole(user, ['ADMIN', 'GURU']);
        db.PRESTASI = db.PRESTASI.filter((p) => p.id_prestasi !== payload.id_prestasi);
        saveLocalDb(db);
        return { success: true, message: 'Prestasi dihapus.' };

      case 'getAgendas':
        return {
          success: true,
          message: 'OK',
          data: db.AGENDA.filter((a) =>
            user.role === 'ORANG_TUA' ? a.target_role === 'Semua' || a.target_role === 'Orang Tua' : true
          ) as unknown as T,
        };
      case 'createAgenda': {
        requireLocalRole(user, ['ADMIN', 'KEPALA_SEKOLAH', 'GURU']);
        const item: AgendaItem = { ...(payload as unknown as AgendaItem), id_agenda: genId('AGD'), created_at: now, updated_at: now };
        db.AGENDA.push(item);
        saveLocalDb(db);
        return { success: true, message: 'Agenda sekolah ditambahkan.', data: item as unknown as T };
      }
      case 'updateAgenda': {
        requireLocalRole(user, ['ADMIN', 'KEPALA_SEKOLAH', 'GURU']);
        const idx = db.AGENDA.findIndex((a) => a.id_agenda === payload.id_agenda);
        if (idx === -1) return { success: false, message: 'Agenda tidak ditemukan.' };
        db.AGENDA[idx] = { ...db.AGENDA[idx], ...payload, updated_at: now } as AgendaItem;
        saveLocalDb(db);
        return { success: true, message: 'Agenda diperbarui.', data: db.AGENDA[idx] as unknown as T };
      }
      case 'deleteAgenda':
        requireLocalRole(user, ['ADMIN', 'KEPALA_SEKOLAH']);
        db.AGENDA = db.AGENDA.filter((a) => a.id_agenda !== payload.id_agenda);
        saveLocalDb(db);
        return { success: true, message: 'Agenda dihapus.' };

      case 'getLiaisonMessages':
        return { success: true, message: 'OK', data: scopeStudentRows(db.PENGHUBUNG) as unknown as T };
      case 'createLiaisonMessage': {
        if (user.role === 'ORANG_TUA' && payload.id_siswa !== user.relasi_id) {
          return { success: false, message: 'Anda hanya dapat mengirim pesan untuk anak Anda.' };
        }
        const item: LiaisonMessage = {
          ...(payload as unknown as LiaisonMessage),
          id_penghubung: genId('PHB'),
          pengirim_id: user.id_user,
          pengirim_nama: user.nama_lengkap,
          pengirim_role: user.role,
          status_baca: 'Terkirim',
          created_at: now,
          updated_at: now,
        };
        db.PENGHUBUNG.push(item);
        saveLocalDb(db);
        return { success: true, message: 'Pesan buku penghubung terkirim.', data: item as unknown as T };
      }
      case 'confirmLiaisonMessage': {
        const idx = db.PENGHUBUNG.findIndex((m) => m.id_penghubung === payload.id_penghubung);
        if (idx === -1) return { success: false, message: 'Pesan tidak ditemukan.' };
        if (user.role === 'ORANG_TUA' && db.PENGHUBUNG[idx].id_siswa !== user.relasi_id) {
          return { success: false, message: 'Akses ditolak.' };
        }
        db.PENGHUBUNG[idx] = {
          ...db.PENGHUBUNG[idx],
          status_baca: (payload.status_baca as LiaisonMessage['status_baca']) || 'Dikonfirmasi',
          catatan_konfirmasi: String(payload.catatan_konfirmasi || db.PENGHUBUNG[idx].catatan_konfirmasi || ''),
          updated_at: now,
        };
        saveLocalDb(db);
        return { success: true, message: 'Status pesan diperbarui.', data: db.PENGHUBUNG[idx] as unknown as T };
      }
      case 'deleteLiaisonMessage':
        requireLocalRole(user, ['ADMIN']);
        db.PENGHUBUNG = db.PENGHUBUNG.filter((m) => m.id_penghubung !== payload.id_penghubung);
        saveLocalDb(db);
        return { success: true, message: 'Pesan dihapus.' };

      case 'getInventory':
        requireLocalRole(user, ['ADMIN', 'KEPALA_SEKOLAH', 'GURU']);
        return { success: true, message: 'OK', data: db.INVENTARIS as unknown as T };
      case 'createInventory': {
        requireLocalRole(user, ['ADMIN']);
        const item: InventoryItem = { ...(payload as unknown as InventoryItem), id_inventaris: genId('INV'), created_at: now, updated_at: now };
        db.INVENTARIS.push(item);
        saveLocalDb(db);
        return { success: true, message: 'Inventaris ditambahkan.', data: item as unknown as T };
      }
      case 'updateInventory': {
        requireLocalRole(user, ['ADMIN']);
        const idx = db.INVENTARIS.findIndex((i) => i.id_inventaris === payload.id_inventaris);
        if (idx === -1) return { success: false, message: 'Barang tidak ditemukan.' };
        db.INVENTARIS[idx] = { ...db.INVENTARIS[idx], ...payload, updated_at: now } as InventoryItem;
        saveLocalDb(db);
        return { success: true, message: 'Inventaris diperbarui.', data: db.INVENTARIS[idx] as unknown as T };
      }
      case 'deleteInventory':
        requireLocalRole(user, ['ADMIN']);
        db.INVENTARIS = db.INVENTARIS.filter((i) => i.id_inventaris !== payload.id_inventaris);
        saveLocalDb(db);
        return { success: true, message: 'Inventaris dihapus.' };

      case 'getDocumentation':
        requireLocalRole(user, ['ADMIN', 'KEPALA_SEKOLAH', 'GURU']);
        return { success: true, message: 'OK', data: db.DOKUMENTASI as unknown as T };
      case 'createDocumentation': {
        requireLocalRole(user, ['ADMIN', 'KEPALA_SEKOLAH', 'GURU']);
        const item: DocumentationItem = { ...(payload as unknown as DocumentationItem), id_dokumentasi: genId('DOK'), created_at: now, updated_at: now };
        db.DOKUMENTASI.push(item);
        saveLocalDb(db);
        return { success: true, message: 'Dokumentasi ditambahkan.', data: item as unknown as T };
      }
      case 'updateDocumentation': {
        requireLocalRole(user, ['ADMIN', 'KEPALA_SEKOLAH', 'GURU']);
        const idx = db.DOKUMENTASI.findIndex((d) => d.id_dokumentasi === payload.id_dokumentasi);
        if (idx === -1) return { success: false, message: 'Data tidak ditemukan.' };
        db.DOKUMENTASI[idx] = { ...db.DOKUMENTASI[idx], ...payload, updated_at: now } as DocumentationItem;
        saveLocalDb(db);
        return { success: true, message: 'Dokumentasi diperbarui.', data: db.DOKUMENTASI[idx] as unknown as T };
      }
      case 'deleteDocumentation':
        requireLocalRole(user, ['ADMIN']);
        db.DOKUMENTASI = db.DOKUMENTASI.filter((d) => d.id_dokumentasi !== payload.id_dokumentasi);
        saveLocalDb(db);
        return { success: true, message: 'Dokumentasi dihapus.' };

      case 'updateOwnProfile': {
        const idx = db.USERS.findIndex((u) => u.id_user === user.id_user);
        if (idx === -1) return { success: false, message: 'Akun pengguna tidak ditemukan.' };
        const nextName =
          payload.nama_lengkap !== undefined && String(payload.nama_lengkap).trim() !== ''
            ? String(payload.nama_lengkap).trim()
            : db.USERS[idx].nama_lengkap;
        const nextFoto =
          payload.foto_url !== undefined ? String(payload.foto_url || '') : db.USERS[idx].foto_url || '';
        db.USERS[idx] = {
          ...db.USERS[idx],
          nama_lengkap: nextName,
          foto_url: nextFoto,
          updated_at: now,
        };
        const updatedUser = sanitizeUser(db.USERS[idx]);
        if (session) {
          setStoredSession({ ...session, user: updatedUser });
        }
        addLocalLog(db, user, 'UPDATE', 'PROFIL', 'Memperbarui profil & foto akun');
        saveLocalDb(db);
        return { success: true, message: 'Profil akun berhasil diperbarui.', data: updatedUser as unknown as T };
      }

      case 'getUsers': {
        requireLocalRole(user, ['ADMIN']);
        const syncedCount = syncLocalMasterUsers(db);
        if (syncedCount > 0) saveLocalDb(db);
        return {
          success: true,
          message: 'OK',
          data: db.USERS.map((u) => ({ ...sanitizeUser(u), password: u.password || '' })) as unknown as T,
        };
      }
      case 'createUser': {
        requireLocalRole(user, ['ADMIN']);
        const role = (payload.role as UserRole) || 'GURU';
        const relasi_id = String(payload.relasi_id || '');
        let username = String(payload.username || '').trim();
        let password = String(payload.password || '').trim();
        let nama_lengkap = String(payload.nama_lengkap || '').trim();

        if (role === 'GURU' && relasi_id) {
          const t = db.GURU.find((item) => item.id_guru === relasi_id);
          if (t?.nip) {
            username = String(t.nip).trim();
            password = String(t.nip).trim();
            if (!nama_lengkap) nama_lengkap = t.nama_guru;
          }
        } else if (role === 'KEPALA_SEKOLAH' && relasi_id) {
          const t = db.GURU.find((item) => item.id_guru === relasi_id);
          if (t) {
            if (!username && t.nip) username = String(t.nip).trim();
            if (!password && t.nip) password = String(t.nip).trim();
            if (!nama_lengkap) nama_lengkap = t.nama_guru;
          }
        } else if (role === 'ORANG_TUA' && relasi_id) {
          const s = db.SISWA.find((item) => item.id_siswa === relasi_id);
          if (s?.nis) {
            username = String(s.nis).trim();
            password = String(s.nis).trim();
            if (!nama_lengkap) nama_lengkap = `Wali dari ${s.nama_lengkap}`;
          }
        }

        if (!username || !password) {
          return { success: false, message: 'Username dan password wajib diisi.' };
        }

        if (db.USERS.some((u) => String(u.username || '').trim().toLowerCase() === username.toLowerCase())) {
          return { success: false, message: `Username "${username}" sudah digunakan.` };
        }
        const newUser: LocalUserRow = {
          id_user: genId('USR'),
          username,
          password,
          nama_lengkap,
          role,
          relasi_id,
          relasi_nama: String(payload.relasi_nama || ''),
          status: (payload.status as 'Aktif' | 'Nonaktif') || 'Aktif',
          foto_url: String(payload.foto_url || ''),
          created_at: now,
          updated_at: now,
        };
        db.USERS.push(newUser);
        addLocalLog(db, user, 'CREATE', 'USERS', `Tambah user ${username}`);
        saveLocalDb(db);
        return {
          success: true,
          message: 'Pengguna berhasil ditambahkan.',
          data: { ...sanitizeUser(newUser), password: newUser.password } as unknown as T,
        };
      }
      case 'updateUser': {
        requireLocalRole(user, ['ADMIN']);
        const idx = db.USERS.findIndex((u) => u.id_user === payload.id_user);
        if (idx === -1) return { success: false, message: 'Pengguna tidak ditemukan.' };
        const current = db.USERS[idx];
        const role = payload.role !== undefined ? (payload.role as UserRole) : current.role;
        const relasi_id = payload.relasi_id !== undefined ? String(payload.relasi_id || '') : current.relasi_id;
        const relasiChanged =
          payload.relasi_id !== undefined && String(payload.relasi_id || '') !== String(current.relasi_id || '');
        const hasNewPassword =
          payload.new_password !== undefined && String(payload.new_password).trim() !== '';
        let username = String(payload.username !== undefined ? payload.username : current.username).trim();
        let password = hasNewPassword ? String(payload.new_password).trim() : current.password;

        if ((role === 'GURU' || role === 'KEPALA_SEKOLAH') && relasi_id) {
          const t = db.GURU.find((item) => item.id_guru === relasi_id);
          if (t?.nip && t.nip !== '-') {
            if (!username || (relasiChanged && payload.username === undefined)) username = String(t.nip).trim();
            if (!hasNewPassword && (!password || relasiChanged)) password = String(t.nip).trim();
          }
        } else if (role === 'ORANG_TUA' && relasi_id) {
          const s = db.SISWA.find((item) => item.id_siswa === relasi_id);
          if (s?.nis) {
            if (!username || (relasiChanged && payload.username === undefined)) username = String(s.nis).trim();
            if (!hasNewPassword && (!password || relasiChanged)) password = String(s.nis).trim();
          }
        }

        if (
          db.USERS.some(
            (u) =>
              u.id_user !== payload.id_user &&
              String(u.username || '').trim().toLowerCase() === username.toLowerCase()
          )
        ) {
          return { success: false, message: `Username "${username}" sudah digunakan.` };
        }
        db.USERS[idx] = {
          ...db.USERS[idx],
          username,
          password,
          nama_lengkap: payload.nama_lengkap !== undefined ? String(payload.nama_lengkap) : db.USERS[idx].nama_lengkap,
          role,
          relasi_id,
          relasi_nama: payload.relasi_nama !== undefined ? String(payload.relasi_nama) : db.USERS[idx].relasi_nama,
          status: (payload.status as 'Aktif' | 'Nonaktif') || db.USERS[idx].status,
          foto_url: payload.foto_url !== undefined ? String(payload.foto_url || '') : db.USERS[idx].foto_url || '',
          updated_at: now,
        };
        addLocalLog(db, user, 'UPDATE', 'USERS', `Update user ${username}`);
        saveLocalDb(db);
        return {
          success: true,
          message: 'Pengguna diperbarui.',
          data: { ...sanitizeUser(db.USERS[idx]), password: db.USERS[idx].password } as unknown as T,
        };
      }
      case 'deleteUser':
        requireLocalRole(user, ['ADMIN']);
        db.USERS = db.USERS.filter((u) => u.id_user !== payload.id_user);
        saveLocalDb(db);
        return { success: true, message: 'Pengguna dihapus.' };

      case 'getLogs':
        requireLocalRole(user, ['ADMIN', 'KEPALA_SEKOLAH']);
        return { success: true, message: 'OK', data: [...db.LOG_AKTIVITAS].reverse() as unknown as T };

      case 'exportAllData': {
        requireLocalRole(user, ['ADMIN']);
        const safeDb = {
          ...db,
          USERS: db.USERS.map((u) => ({ ...sanitizeUser(u), password: u.password || '' })),
        };
        addLocalLog(db, user, 'BACKUP', 'DATABASE', 'Ekspor cadangan database');
        saveLocalDb(db);
        return { success: true, message: 'Backup berhasil dibuat.', data: safeDb as unknown as T };
      }

      case 'syncAllIds': {
        requireLocalRole(user, ['ADMIN']);
        const report = syncAllLocalIds(db, user);
        saveLocalDb(db);
        const msg =
          report.total_updated_rows > 0
            ? `${report.total_updated_rows} baris pada ${report.updated_sheets.length} sheet berhasil dihubungkan.`
            : 'Seluruh ID antar dokumen sudah terhubung dan sinkron.';
        return { success: true, message: msg, data: report as unknown as T };
      }

      default:
        return { success: false, message: `Aksi tidak dikenal: ${action}` };
    }
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Terjadi kesalahan.' };
  }
}

// ============================================================================
// CLIENT API CALLER (GAS WEB APP + LOCAL FALLBACK)
// ============================================================================

export async function callApi<T = unknown>(
  action: string,
  payload: Record<string, unknown> = {}
): Promise<ApiResponse<T>> {
  const mode = getConnectionMode();

  if (mode === 'UNCONFIGURED') {
    return {
      success: false,
      message:
        'Database belum terhubung. Silakan masukkan URL Google Apps Script Web App pada Pengaturan Koneksi.',
      error_code: 'NOT_CONNECTED',
    };
  }

  if (mode === 'LOCAL') {
    return handleLocalApi<T>(action, payload);
  }

  const gasUrl = getConfiguredGasUrl();
  const session = getStoredSession();
  const baseTimeoutMs = window.KELASKU_CONFIG?.REQUEST_TIMEOUT_MS || 90000;
  const isHeavyAction =
    action === 'importStudents' ||
    action === 'importTeachers' ||
    action === 'syncAllIds' ||
    action === 'setupDatabase' ||
    action === 'exportBackup' ||
    action === 'reorderClassIds';
  const timeoutMs = isHeavyAction ? Math.max(baseTimeoutMs, 120000) : baseTimeoutMs;

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Menggunakan text/plain;charset=utf-8 agar menjadi CORS simple request
    // dan terhindar dari preflight OPTIONS yang tidak didukung Google Apps Script.
    const response = await fetch(gasUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action,
        token: session?.token || '',
        payload,
      }),
      redirect: 'follow',
      signal: controller.signal,
    });

    window.clearTimeout(timer);

    if (!response.ok) {
      return {
        success: false,
        message: `Server Google Apps Script merespons dengan kode HTTP ${response.status}.`,
        error_code: 'HTTP_ERROR',
      };
    }

    const text = await response.text();
    try {
      const parsed = JSON.parse(text) as ApiResponse<T>;
      if (parsed.error_code === 'UNAUTHORIZED') {
        setStoredSession(null);
      }
      if (parsed.success && parsed.data) {
        if (action === 'getSubjects' && Array.isArray(parsed.data)) {
          parsed.data = normalizeSubjectList(parsed.data as Record<string, unknown>[]) as unknown as T;
        } else if (
          (action === 'createSubject' || action === 'updateSubject') &&
          typeof parsed.data === 'object'
        ) {
          parsed.data = normalizeSubjectRecord(parsed.data as Record<string, unknown>, 0, []) as unknown as T;
        } else if (action === 'getClasses' && Array.isArray(parsed.data)) {
          parsed.data = normalizeClassList(parsed.data as Record<string, unknown>[]).sort(
            compareClassesByName
          ) as unknown as T;
        } else if (
          (action === 'createClass' || action === 'updateClass') &&
          typeof parsed.data === 'object'
        ) {
          parsed.data = normalizeClassRecord(parsed.data as Record<string, unknown>, 0, []) as unknown as T;
        } else if (action === 'getTeachers' && Array.isArray(parsed.data)) {
          parsed.data = normalizeTeacherList(parsed.data as Record<string, unknown>[]) as unknown as T;
        } else if (action === 'getSchedules' && Array.isArray(parsed.data)) {
          parsed.data = normalizeScheduleList(parsed.data as Record<string, unknown>[]) as unknown as T;
        } else if (
          (action === 'createSchedule' || action === 'updateSchedule') &&
          typeof parsed.data === 'object'
        ) {
          parsed.data = normalizeScheduleRecord(parsed.data as Record<string, unknown>) as unknown as T;
        } else if (action === 'getPickets' && Array.isArray(parsed.data)) {
          parsed.data = normalizePicketList(parsed.data as Record<string, unknown>[]) as unknown as T;
        } else if (
          (action === 'createPicket' || action === 'updatePicket') &&
          typeof parsed.data === 'object'
        ) {
          parsed.data = normalizePicketRecord(parsed.data as Record<string, unknown>) as unknown as T;
        } else if (action === 'getStudents' && Array.isArray(parsed.data)) {
          parsed.data = normalizeStudentList(parsed.data as Record<string, unknown>[]) as unknown as T;
        } else if (action === 'getAttendance' || action === 'saveAttendance') {
          const wrapped = parsed.data as unknown as { records?: Record<string, unknown>[] } | null;
          const attArr = Array.isArray(parsed.data)
            ? (parsed.data as Record<string, unknown>[])
            : Array.isArray(wrapped?.records)
            ? wrapped.records
            : null;
          if (attArr) {
            parsed.data = normalizeAttendanceList(attArr) as unknown as T;
          }
        } else if (action === 'getJournals' && Array.isArray(parsed.data)) {
          parsed.data = normalizeJournalList(parsed.data as Record<string, unknown>[]) as unknown as T;
        } else if (
          (action === 'createJournal' || action === 'updateJournal') &&
          typeof parsed.data === 'object'
        ) {
          parsed.data = normalizeJournalRecord(parsed.data as Record<string, unknown>) as unknown as T;
        }
      }
      return parsed;
    } catch {
      return {
        success: false,
        message:
          'Respons Google Apps Script bukan JSON yang valid. Pastikan Web App di-deploy dengan akses "Anyone" (Siapa saja).',
        error_code: 'INVALID_JSON',
      };
    }
  } catch (err) {
    window.clearTimeout(timer);
    if (err instanceof Error && err.name === 'AbortError') {
      return {
        success: false,
        message: 'Koneksi ke Google Apps Script melebihi batas waktu (timeout). Periksa jaringan Anda.',
        error_code: 'TIMEOUT',
      };
    }
    return {
      success: false,
      message: `Gagal terhubung ke Google Apps Script: ${
        err instanceof Error ? err.message : 'Kesalahan jaringan'
      }`,
      error_code: 'NETWORK_ERROR',
    };
  }
}
