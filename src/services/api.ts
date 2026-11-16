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
} from '../types';
import { computeSubjectGradeStats } from '../utils/gradeMath';

const STORAGE_KEYS = {
  GAS_URL: 'kelasku_smart_gas_url',
  LOCAL_MODE: 'kelasku_smart_local_mode',
  SESSION: 'kelasku_smart_session',
  LOCAL_DB: 'kelasku_smart_local_db_v1',
};

export function getConfiguredGasUrl(): string {
  const override = localStorage.getItem(STORAGE_KEYS.GAS_URL);
  if (override !== null && override.trim() !== '') {
    return override.trim();
  }
  const windowUrl = (window.KELASKU_CONFIG?.GAS_WEB_APP_URL || '').trim();
  if (windowUrl) {
    return windowUrl;
  }
  return (import.meta.env.VITE_GAS_WEB_APP_URL || '').trim();
}

export function setConfiguredGasUrl(url: string): void {
  const clean = url.trim();
  if (clean) {
    localStorage.setItem(STORAGE_KEYS.GAS_URL, clean);
    localStorage.removeItem(STORAGE_KEYS.LOCAL_MODE);
  } else {
    localStorage.removeItem(STORAGE_KEYS.GAS_URL);
  }
}

export function isLocalModeEnabled(): boolean {
  return localStorage.getItem(STORAGE_KEYS.LOCAL_MODE) === 'true' && !getConfiguredGasUrl();
}

export function enableLocalMode(): void {
  localStorage.removeItem(STORAGE_KEYS.GAS_URL);
  localStorage.setItem(STORAGE_KEYS.LOCAL_MODE, 'true');
}

export function disableLocalMode(): void {
  localStorage.removeItem(STORAGE_KEYS.LOCAL_MODE);
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

function getLocalTeacherClassIds(db: LocalDatabase, user: AuthUser): Set<string> {
  const set = new Set<string>();
  if (user.role !== 'GURU') return set;
  db.KELAS.forEach((c) => {
    if (c.wali_kelas_id === user.relasi_id) set.add(c.id_kelas);
  });
  db.JADWAL.forEach((j) => {
    if (j.id_guru === user.relasi_id && j.id_kelas) set.add(j.id_kelas);
  });
  return set;
}

function requireLocalRole(user: AuthUser, roles: UserRole[]): void {
  if (!roles.includes(user.role)) {
    throw new Error(`Akses ditolak untuk role ${user.role}.`);
  }
}

function handleLocalApi<T>(action: string, payload: Record<string, unknown> = {}): ApiResponse<T> {
  const db = loadLocalDb();
  const session = getStoredSession();
  const now = new Date().toISOString();

  if (action === 'ping' || action === 'checkInitialSetup' || action === 'setupDatabase') {
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
    const username = String(payload.username || '').trim();
    const password = String(payload.password || '');
    const found = db.USERS.find((u) => u.username === username);
    if (!found || found.password !== password) {
      return { success: false, message: 'Username atau password tidak sesuai.' };
    }
    if (found.status !== 'Aktif') {
      return { success: false, message: 'Akun pengguna sedang dinonaktifkan.' };
    }
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
    const teacherClasses = getLocalTeacherClassIds(db, user);
    const scopeStudentRows = <R extends { id_siswa?: string; id_kelas?: string }>(rows: R[]): R[] => {
      if (user.role === 'ADMIN' || user.role === 'KEPALA_SEKOLAH') return rows;
      if (user.role === 'ORANG_TUA') return rows.filter((r) => r.id_siswa === user.relasi_id);
      if (user.role === 'GURU') return rows.filter((r) => r.id_kelas && teacherClasses.has(r.id_kelas));
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
        const students = scopeStudentRows(db.SISWA);
        const classes = db.KELAS.map((c) => ({
          ...c,
          jumlah_siswa: db.SISWA.filter((s) => s.id_kelas === c.id_kelas).length,
        })).filter((c) => {
          if (user.role === 'GURU') return teacherClasses.has(c.id_kelas);
          if (user.role === 'ORANG_TUA') return students.some((s) => s.id_kelas === c.id_kelas);
          return true;
        });
        const attendance = scopeStudentRows(db.ABSENSI);
        const grades = scopeStudentRows(db.NILAI);
        const achievements = scopeStudentRows(db.PRESTASI);
        const agendas = db.AGENDA.filter((a) =>
          user.role === 'ORANG_TUA' ? a.target_role === 'Semua' || a.target_role === 'Orang Tua' : true
        );

        let hadir = 0;
        let tidakHadir = 0;
        const statusCounts: Record<string, number> = {
          Hadir: 0,
          Sakit: 0,
          Izin: 0,
          Alpa: 0,
          Terlambat: 0,
        };
        attendance.forEach((a) => {
          if (statusCounts[a.status] !== undefined) statusCounts[a.status]++;
          if (a.status === 'Hadir' || a.status === 'Terlambat') hadir++;
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

        const today = new Date().toISOString().slice(0, 10);
        const summary: DashboardSummary = {
          total_siswa: students.length,
          total_guru: user.role === 'ORANG_TUA' ? 0 : db.GURU.length,
          total_kelas: classes.length,
          total_mapel: db.MAPEL.filter((m) => m.status_aktif === 'Aktif').length,
          persentase_kehadiran: pct,
          jumlah_tidak_hadir: tidakHadir,
          siswa_per_kelas: classes.map((c) => ({ nama_kelas: c.nama_kelas, jumlah: c.jumlah_siswa || 0 })),
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
        const hpVal = String(raw.hp || raw.telepon_ortu || '').trim();
        const telpOrtu = String(raw.telepon_ortu || raw.hp || raw.telepon || '').trim();
        const item: Student = {
          ...(raw as Student),
          no: raw.no !== undefined && String(raw.no).trim() !== '' ? raw.no : db.SISWA.length + 1,
          id_siswa: genId('SIS'),
          id_kelas: matchedClass?.id_kelas || String(raw.id_kelas || ''),
          nama_kelas: matchedClass?.nama_kelas || String(raw.nama_kelas || ''),
          hp: hpVal,
          telepon_ortu: telpOrtu,
          status_siswa: (raw.status_siswa as Student['status_siswa']) || 'Aktif',
          foto_url: String(raw.foto_url || ''),
          created_at: now,
          updated_at: now,
        };
        db.SISWA.push(item);
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
        const mergedHp = raw.hp !== undefined ? String(raw.hp) : db.SISWA[idx].hp || '';
        const mergedTelp = raw.telepon !== undefined ? String(raw.telepon) : db.SISWA[idx].telepon || '';
        const mergedOrtu =
          raw.telepon_ortu !== undefined
            ? String(raw.telepon_ortu || mergedHp || mergedTelp)
            : mergedHp || mergedTelp || db.SISWA[idx].telepon_ortu || '';
        db.SISWA[idx] = {
          ...db.SISWA[idx],
          ...raw,
          id_kelas: matchedClass?.id_kelas || String(raw.id_kelas ?? db.SISWA[idx].id_kelas ?? ''),
          nama_kelas: matchedClass?.nama_kelas || String(raw.nama_kelas ?? db.SISWA[idx].nama_kelas ?? ''),
          hp: mergedHp || mergedOrtu,
          telepon_ortu: mergedOrtu,
          updated_at: now,
        } as Student;
        addLocalLog(db, user, 'UPDATE', 'SISWA', `Edit siswa ${db.SISWA[idx].nama_lengkap}`);
        saveLocalDb(db);
        return { success: true, message: 'Data siswa berhasil diperbarui.', data: db.SISWA[idx] as unknown as T };
      }
      case 'deleteStudent': {
        requireLocalRole(user, ['ADMIN']);
        db.SISWA = db.SISWA.filter((s) => s.id_siswa !== payload.id_siswa);
        addLocalLog(db, user, 'DELETE', 'SISWA', `Hapus siswa ${payload.id_siswa}`);
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
        const item: Teacher = {
          ...(raw as Teacher),
          no: raw.no !== undefined && String(raw.no).trim() !== '' ? raw.no : db.GURU.length + 1,
          status_akun: (raw.status_akun as Teacher['status_akun']) || 'Aktif',
          foto_url: String(raw.foto_url || ''),
          id_guru: genId('GRU'),
          created_at: now,
          updated_at: now,
        };
        db.GURU.push(item);
        addLocalLog(db, user, 'CREATE', 'GURU', `Tambah guru ${item.nama_guru}`);
        saveLocalDb(db);
        return { success: true, message: 'Data guru berhasil ditambahkan.', data: item as unknown as T };
      }
      case 'updateTeacher': {
        requireLocalRole(user, ['ADMIN']);
        const idx = db.GURU.findIndex((g) => g.id_guru === payload.id_guru);
        if (idx === -1) return { success: false, message: 'Guru tidak ditemukan.' };
        db.GURU[idx] = { ...db.GURU[idx], ...payload, updated_at: now } as Teacher;
        saveLocalDb(db);
        return { success: true, message: 'Data guru diperbarui.', data: db.GURU[idx] as unknown as T };
      }
      case 'deleteTeacher':
        requireLocalRole(user, ['ADMIN']);
        db.GURU = db.GURU.filter((g) => g.id_guru !== payload.id_guru);
        saveLocalDb(db);
        return { success: true, message: 'Data guru dihapus.' };
      case 'importTeachers': {
        requireLocalRole(user, ['ADMIN']);
        const rows = (payload.rows as Partial<Teacher>[]) || [];
        let count = 0;
        for (const r of rows) {
          if (!r.nama_guru) continue;
          const waliCls = r.wali_kelas
            ? db.KELAS.find((c) => c.nama_kelas.toLowerCase() === String(r.wali_kelas).trim().toLowerCase())
            : undefined;
          db.GURU.push({
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
            wali_kelas_id: waliCls?.id_kelas || String(r.wali_kelas_id || ''),
            wali_kelas: waliCls?.nama_kelas || String(r.wali_kelas || ''),
            telepon: String(r.telepon || ''),
            username: String(r.username || ''),
            status_akun: (r.status_akun as Teacher['status_akun']) || 'Aktif',
            foto_url: String(r.foto_url || ''),
            created_at: now,
            updated_at: now,
          });
          count++;
        }
        saveLocalDb(db);
        return { success: true, message: `${count} data guru berhasil diimpor.`, data: { count } as unknown as T };
      }

      case 'getClasses': {
        const list = db.KELAS.map((c) => ({
          ...c,
          jumlah_siswa: db.SISWA.filter((s) => s.id_kelas === c.id_kelas).length,
        })).filter((c) => {
          if (user.role === 'GURU') return teacherClasses.has(c.id_kelas);
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
        const item: ClassRoom = { ...(payload as unknown as ClassRoom), id_kelas: genId('KLS'), created_at: now, updated_at: now };
        db.KELAS.push(item);
        addLocalLog(db, user, 'CREATE', 'KELAS', `Tambah kelas ${item.nama_kelas}`);
        saveLocalDb(db);
        return { success: true, message: 'Data kelas berhasil ditambahkan.', data: item as unknown as T };
      }
      case 'updateClass': {
        requireLocalRole(user, ['ADMIN']);
        const idx = db.KELAS.findIndex((c) => c.id_kelas === payload.id_kelas);
        if (idx === -1) return { success: false, message: 'Kelas tidak ditemukan.' };
        db.KELAS[idx] = { ...db.KELAS[idx], ...payload, updated_at: now } as ClassRoom;
        saveLocalDb(db);
        return { success: true, message: 'Data kelas diperbarui.', data: db.KELAS[idx] as unknown as T };
      }
      case 'deleteClass':
        requireLocalRole(user, ['ADMIN']);
        db.KELAS = db.KELAS.filter((c) => c.id_kelas !== payload.id_kelas);
        saveLocalDb(db);
        return { success: true, message: 'Data kelas dihapus.' };

      case 'getSubjects':
        return { success: true, message: 'OK', data: db.MAPEL as unknown as T };
      case 'createSubject': {
        requireLocalRole(user, ['ADMIN']);
        const kode = String(payload.kode_mapel || '').trim();
        if (db.MAPEL.some((m) => m.kode_mapel.toLowerCase() === kode.toLowerCase())) {
          return { success: false, message: `Kode mata pelajaran "${kode}" sudah digunakan.` };
        }
        const item: Subject = { ...(payload as unknown as Subject), id_mapel: genId('MPL'), created_at: now, updated_at: now };
        db.MAPEL.push(item);
        addLocalLog(db, user, 'CREATE', 'MAPEL', `Tambah mapel ${item.nama_mapel}`);
        saveLocalDb(db);
        return { success: true, message: 'Mata pelajaran berhasil ditambahkan.', data: item as unknown as T };
      }
      case 'updateSubject': {
        requireLocalRole(user, ['ADMIN']);
        const idx = db.MAPEL.findIndex((m) => m.id_mapel === payload.id_mapel);
        if (idx === -1) return { success: false, message: 'Mapel tidak ditemukan.' };
        db.MAPEL[idx] = { ...db.MAPEL[idx], ...payload, updated_at: now } as Subject;
        saveLocalDb(db);
        return { success: true, message: 'Mata pelajaran diperbarui.', data: db.MAPEL[idx] as unknown as T };
      }
      case 'deleteSubject':
        requireLocalRole(user, ['ADMIN']);
        db.MAPEL = db.MAPEL.filter((m) => m.id_mapel !== payload.id_mapel);
        saveLocalDb(db);
        return { success: true, message: 'Mata pelajaran dihapus.' };

      case 'getSchedules': {
        const list = db.JADWAL.filter((j) => {
          if (user.role === 'GURU') return j.id_guru === user.relasi_id || teacherClasses.has(j.id_kelas);
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
        const item: ScheduleItem = { ...(payload as unknown as ScheduleItem), id_jadwal: genId('JDW'), created_at: now, updated_at: now };
        db.JADWAL.push(item);
        saveLocalDb(db);
        return { success: true, message: 'Jadwal berhasil ditambahkan.', data: item as unknown as T };
      }
      case 'updateSchedule': {
        requireLocalRole(user, ['ADMIN']);
        const idx = db.JADWAL.findIndex((j) => j.id_jadwal === payload.id_jadwal);
        if (idx === -1) return { success: false, message: 'Jadwal tidak ditemukan.' };
        db.JADWAL[idx] = { ...db.JADWAL[idx], ...payload, updated_at: now } as ScheduleItem;
        saveLocalDb(db);
        return { success: true, message: 'Jadwal diperbarui.', data: db.JADWAL[idx] as unknown as T };
      }
      case 'deleteSchedule':
        requireLocalRole(user, ['ADMIN']);
        db.JADWAL = db.JADWAL.filter((j) => j.id_jadwal !== payload.id_jadwal);
        saveLocalDb(db);
        return { success: true, message: 'Jadwal dihapus.' };

      case 'getPickets':
        requireLocalRole(user, ['ADMIN', 'KEPALA_SEKOLAH', 'GURU']);
        return { success: true, message: 'OK', data: db.PIKET as unknown as T };
      case 'createPicket': {
        requireLocalRole(user, ['ADMIN', 'GURU']);
        const item: PicketSchedule = { ...(payload as unknown as PicketSchedule), id_piket: genId('PKT'), created_at: now, updated_at: now };
        db.PIKET.push(item);
        saveLocalDb(db);
        return { success: true, message: 'Jadwal piket ditambahkan.', data: item as unknown as T };
      }
      case 'updatePicket': {
        requireLocalRole(user, ['ADMIN', 'GURU']);
        const idx = db.PIKET.findIndex((p) => p.id_piket === payload.id_piket);
        if (idx === -1) return { success: false, message: 'Data piket tidak ditemukan.' };
        db.PIKET[idx] = { ...db.PIKET[idx], ...payload, updated_at: now } as PicketSchedule;
        saveLocalDb(db);
        return { success: true, message: 'Jadwal piket diperbarui.', data: db.PIKET[idx] as unknown as T };
      }
      case 'deletePicket':
        requireLocalRole(user, ['ADMIN', 'GURU']);
        db.PIKET = db.PIKET.filter((p) => p.id_piket !== payload.id_piket);
        saveLocalDb(db);
        return { success: true, message: 'Jadwal piket dihapus.' };

      case 'getAttendance':
        return { success: true, message: 'OK', data: scopeStudentRows(db.ABSENSI) as unknown as T };
      case 'saveAttendance': {
        requireLocalRole(user, ['ADMIN', 'GURU']);
        const records = (payload.records as AttendanceRecord[]) || [];
        for (const rec of records) {
          const idx = db.ABSENSI.findIndex(
            (a) => a.id_siswa === rec.id_siswa && a.tanggal === rec.tanggal
          );
          if (idx !== -1) {
            const existing = db.ABSENSI[idx];
            const koreksi =
              rec.koreksi_catatan ||
              (existing.status !== rec.status
                ? `Koreksi oleh ${user.nama_lengkap} (${now.slice(0, 16).replace('T', ' ')})`
                : existing.koreksi_catatan);
            db.ABSENSI[idx] = {
              ...existing,
              ...rec,
              id_absensi: existing.id_absensi,
              koreksi_catatan: koreksi,
              diinput_oleh: user.nama_lengkap,
              updated_at: now,
            };
          } else {
            db.ABSENSI.push({
              ...rec,
              id_absensi: genId('ABS'),
              diinput_oleh: user.nama_lengkap,
              created_at: now,
              updated_at: now,
            });
          }
        }
        addLocalLog(db, user, 'SAVE', 'ABSENSI', `Simpan ${records.length} absensi siswa`);
        saveLocalDb(db);
        return { success: true, message: `${records.length} data absensi berhasil disimpan.` };
      }

      case 'getGrades':
      case 'getGradeRecap':
        return { success: true, message: 'OK', data: scopeStudentRows(db.NILAI) as unknown as T };
      case 'saveGrades': {
        requireLocalRole(user, ['ADMIN', 'GURU']);
        const records = (payload.records as GradeRecord[]) || [];
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

      case 'getJournals':
        requireLocalRole(user, ['ADMIN', 'KEPALA_SEKOLAH', 'GURU']);
        return {
          success: true,
          message: 'OK',
          data: db.JURNAL.filter((j) =>
            user.role === 'GURU' ? j.id_guru === user.relasi_id || teacherClasses.has(j.id_kelas) : true
          ) as unknown as T,
        };
      case 'createJournal': {
        requireLocalRole(user, ['ADMIN', 'GURU']);
        const item: TeacherJournal = { ...(payload as unknown as TeacherJournal), id_jurnal: genId('JRN'), created_at: now, updated_at: now };
        db.JURNAL.push(item);
        saveLocalDb(db);
        return { success: true, message: 'Jurnal guru ditambahkan.', data: item as unknown as T };
      }
      case 'updateJournal': {
        requireLocalRole(user, ['ADMIN', 'GURU']);
        const idx = db.JURNAL.findIndex((j) => j.id_jurnal === payload.id_jurnal);
        if (idx === -1) return { success: false, message: 'Jurnal tidak ditemukan.' };
        db.JURNAL[idx] = { ...db.JURNAL[idx], ...payload, updated_at: now } as TeacherJournal;
        saveLocalDb(db);
        return { success: true, message: 'Jurnal guru diperbarui.', data: db.JURNAL[idx] as unknown as T };
      }
      case 'deleteJournal':
        requireLocalRole(user, ['ADMIN', 'GURU']);
        db.JURNAL = db.JURNAL.filter((j) => j.id_jurnal !== payload.id_jurnal);
        saveLocalDb(db);
        return { success: true, message: 'Jurnal guru dihapus.' };

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

      case 'getUsers':
        requireLocalRole(user, ['ADMIN']);
        return { success: true, message: 'OK', data: db.USERS.map(sanitizeUser) as unknown as T };
      case 'createUser': {
        requireLocalRole(user, ['ADMIN']);
        const username = String(payload.username || '').trim();
        if (db.USERS.some((u) => u.username === username)) {
          return { success: false, message: `Username "${username}" sudah digunakan.` };
        }
        const newUser: LocalUserRow = {
          id_user: genId('USR'),
          username,
          password: String(payload.password || ''),
          nama_lengkap: String(payload.nama_lengkap || ''),
          role: (payload.role as UserRole) || 'GURU',
          relasi_id: String(payload.relasi_id || ''),
          relasi_nama: String(payload.relasi_nama || ''),
          status: (payload.status as 'Aktif' | 'Nonaktif') || 'Aktif',
          foto_url: String(payload.foto_url || ''),
          created_at: now,
          updated_at: now,
        };
        db.USERS.push(newUser);
        addLocalLog(db, user, 'CREATE', 'USERS', `Tambah user ${username}`);
        saveLocalDb(db);
        return { success: true, message: 'Pengguna berhasil ditambahkan.', data: sanitizeUser(newUser) as unknown as T };
      }
      case 'updateUser': {
        requireLocalRole(user, ['ADMIN']);
        const idx = db.USERS.findIndex((u) => u.id_user === payload.id_user);
        if (idx === -1) return { success: false, message: 'Pengguna tidak ditemukan.' };
        const username = String(payload.username || db.USERS[idx].username).trim();
        if (db.USERS.some((u) => u.id_user !== payload.id_user && u.username === username)) {
          return { success: false, message: `Username "${username}" sudah digunakan.` };
        }
        db.USERS[idx] = {
          ...db.USERS[idx],
          username,
          password: payload.new_password ? String(payload.new_password) : db.USERS[idx].password,
          nama_lengkap: payload.nama_lengkap !== undefined ? String(payload.nama_lengkap) : db.USERS[idx].nama_lengkap,
          role: (payload.role as UserRole) || db.USERS[idx].role,
          relasi_id: payload.relasi_id !== undefined ? String(payload.relasi_id) : db.USERS[idx].relasi_id,
          relasi_nama: payload.relasi_nama !== undefined ? String(payload.relasi_nama) : db.USERS[idx].relasi_nama,
          status: (payload.status as 'Aktif' | 'Nonaktif') || db.USERS[idx].status,
          foto_url: payload.foto_url !== undefined ? String(payload.foto_url || '') : db.USERS[idx].foto_url || '',
          updated_at: now,
        };
        addLocalLog(db, user, 'UPDATE', 'USERS', `Update user ${username}`);
        saveLocalDb(db);
        return { success: true, message: 'Pengguna diperbarui.', data: sanitizeUser(db.USERS[idx]) as unknown as T };
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
        const safeDb = { ...db, USERS: db.USERS.map(sanitizeUser) };
        addLocalLog(db, user, 'BACKUP', 'DATABASE', 'Ekspor cadangan database');
        saveLocalDb(db);
        return { success: true, message: 'Backup berhasil dibuat.', data: safeDb as unknown as T };
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
  const timeoutMs = window.KELASKU_CONFIG?.REQUEST_TIMEOUT_MS || 25000;

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
