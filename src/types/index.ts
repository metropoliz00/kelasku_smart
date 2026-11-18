export type UserRole = 'ADMIN' | 'KEPALA_SEKOLAH' | 'GURU' | 'ORANG_TUA';

export type MenuId =
  | 'dashboard'
  | 'siswa'
  | 'guru'
  | 'kelas'
  | 'mapel'
  | 'tahun-ajaran'
  | 'jadwal'
  | 'absensi'
  | 'rekap-absensi'
  | 'input-nilai'
  | 'rekap-nilai'
  | 'jurnal'
  | 'karakter'
  | 'kesehatan'
  | 'bimbingan'
  | 'prestasi'
  | 'piket'
  | 'agenda'
  | 'penghubung'
  | 'inventaris'
  | 'dokumentasi'
  | 'pengguna'
  | 'pengaturan'
  | 'laporan'
  | 'backup';

export type ConnectionMode = 'GAS' | 'LOCAL' | 'UNCONFIGURED';

export interface AuthUser {
  id_user: string;
  username: string;
  password?: string;
  nama_lengkap: string;
  role: UserRole;
  relasi_id: string;
  relasi_nama: string;
  status: 'Aktif' | 'Nonaktif';
  foto_url?: string;
  created_at: string;
  updated_at?: string;
}

export interface SessionData {
  token: string;
  user: AuthUser;
  expires_at: string;
}

export interface SchoolIdentity {
  id: string;
  nama_sekolah: string;
  npsn: string;
  alamat: string;
  kecamatan: string;
  kabupaten: string;
  provinsi: string;
  email: string;
  tahun_ajaran_aktif_id: string;
  tahun_ajaran_aktif: string;
  semester_aktif: 'Ganjil' | 'Genap';
  peringkat_aktif: 'Ya' | 'Tidak';
  updated_at: string;
}

export interface AcademicYear {
  id_tahun_ajaran: string;
  nama_tahun_ajaran: string;
  semester: 'Ganjil' | 'Genap';
  status: 'Aktif' | 'Arsip' | 'Draft';
  keterangan: string;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id_siswa: string;
  no?: string | number;
  nis: string;
  nisn: string;
  nama_lengkap: string;
  jenis_kelamin: 'L' | 'P';
  tempat_lahir: string;
  tanggal_lahir: string;
  nik?: string;
  agama?: string;
  alamat: string;
  rt?: string;
  rw?: string;
  dusun?: string;
  kelurahan?: string;
  kecamatan?: string;
  kode_pos?: string;
  jenis_tinggal?: string;
  alat_transportasi?: string;
  telepon?: string;
  hp?: string;
  email?: string;
  skhun?: string;
  penerima_kps?: string;
  no_kps?: string;
  id_kelas: string;
  nama_kelas: string; // Rombel Saat Ini
  nama_ayah: string;
  tahun_lahir_ayah?: string;
  pendidikan_ayah?: string;
  pekerjaan_ayah?: string;
  penghasilan_ayah?: string;
  nik_ayah?: string;
  nama_ibu: string;
  tahun_lahir_ibu?: string;
  pendidikan_ibu?: string;
  pekerjaan_ibu?: string;
  penghasilan_ibu?: string;
  nik_ibu?: string;
  nama_wali?: string;
  tahun_lahir_wali?: string;
  pendidikan_wali?: string;
  pekerjaan_wali?: string;
  penghasilan_wali?: string;
  nik_wali?: string;
  no_peserta_un?: string;
  no_seri_ijazah?: string;
  penerima_kip?: string;
  nomor_kip?: string;
  nama_di_kip?: string;
  nomor_kks?: string;
  no_registrasi_akta_lahir?: string;
  bank?: string;
  no_rekening_bank?: string;
  rekening_atas_nama?: string;
  layak_pip?: string;
  alasan_layak_pip?: string;
  kebutuhan_khusus?: string;
  sekolah_asal?: string;
  anak_ke?: string;
  lintang?: string;
  bujur?: string;
  no_kk?: string;
  berat_badan?: string;
  tinggi_badan?: string;
  lingkar_kepala?: string;
  jml_saudara_kandung?: string;
  jarak_rumah_km?: string;
  telepon_ortu: string;
  status_siswa: 'Aktif' | 'Pindah' | 'Lulus' | 'Nonaktif';
  foto_url: string;
  created_at: string;
  updated_at: string;
}

export interface Teacher {
  id_guru: string;
  no?: string | number;
  nip: string;
  nuptk: string;
  nama_guru: string;
  jenis_kelamin: 'L' | 'P';
  tempat_lahir?: string;
  tanggal_lahir?: string;
  ijazah_tertinggi?: string;
  jabatan: string;
  status_kepegawaian: 'PNS' | 'PPPK' | 'GTT' | 'GTY' | 'Honorer' | string;
  tmt_pengangkatan?: string;
  mulai_bekerja_disini?: string;
  pangkat_gol?: string;
  masa_kerja_thn?: string;
  masa_kerja_bln?: string;
  tanggal_no_sk_terakhir?: string;
  email_pribadi?: string;
  email_belajar?: string;
  mata_pelajaran: string;
  id_kelas?: string;
  wali_kelas_id: string;
  wali_kelas: string;
  telepon: string;
  username: string;
  status_akun: 'Aktif' | 'Nonaktif';
  foto_url?: string;
  created_at: string;
  updated_at: string;
}

export function isPaiOrPjok(mataPelajaran?: string, jabatan?: string): boolean {
  const str = `${mataPelajaran || ''} ${jabatan || ''}`.toLowerCase();
  return /pai\b|pendidikan agama|agama islam|\bagama\b|pjok\b|penjas|penjaskes|olahraga|pendidikan jasmani/.test(str);
}

export function isKepalaSekolah(mataPelajaran?: string, jabatan?: string): boolean {
  const str = `${mataPelajaran || ''} ${jabatan || ''}`.toLowerCase();
  return /kepala\s*sekolah|\bkepsek\b/.test(str);
}

export function isStaffTendik(mataPelajaran?: string, jabatan?: string): boolean {
  const str = `${mataPelajaran || ''} ${jabatan || ''}`.trim().toLowerCase();
  if (!str) return false;
  const cleanedForTeacherCheck = str.replace(/\b(?:non|bukan)[-\s]*guru\b/g, ' ');
  if (/\b(?:guru|pengajar|pendidik|wali\s*kelas)\b/.test(cleanedForTeacherCheck)) return false;
  return /\b(?:staff?|tata\s*usaha|tu|operator(?:\s*sekolah)?|tenaga\s*kependidikan|tendik|tenaga\s*administrasi|administrasi|pustakawan|perpustakaan|penjaga(?:\s*sekolah)?|satpam|keamanan|kebersihan|caraka|laboran|pegawai|bendahara|sekretaris)\b/.test(
    str
  );
}

export function isNonTeachingPersonnel(mataPelajaran?: string, jabatan?: string): boolean {
  return isKepalaSekolah(mataPelajaran, jabatan) || isStaffTendik(mataPelajaran, jabatan);
}

export function extractClassTingkatFromText(text?: string): string {
  const raw = String(text || '').trim().toLowerCase();
  if (!raw || isPaiOrPjok(raw) || isKepalaSekolah(raw)) return '';

  const digitMatch = raw.match(/(?:guru\s*kelas|wali\s*kelas|kelas|tematik)\s*([1-6])\b/i)
    || raw.match(/\bkelas\s*([1-6])[a-z]?\b/i);
  if (digitMatch?.[1]) return digitMatch[1];

  const romanMatch = raw.match(/\bkelas\s*(vi|iv|v|iii|ii|i)\b/i);
  if (romanMatch?.[1]) {
    const romanMap: Record<string, string> = {
      i: '1',
      ii: '2',
      iii: '3',
      iv: '4',
      v: '5',
      vi: '6',
    };
    return romanMap[romanMatch[1].toLowerCase()] || '';
  }

  return '';
}

export function isGuruMapel(mataPelajaran?: string, jabatan?: string): boolean {
  if (isKepalaSekolah(mataPelajaran, jabatan)) return false;
  if (isPaiOrPjok(mataPelajaran, jabatan)) return true;
  if (/\bguru\s*mapel\b|\bpengampu\s*mapel\b/i.test(jabatan || '')) return true;

  const rawMapel = String(mataPelajaran || '').trim();
  if (!rawMapel) return false;
  if (/\b(?:guru\s*kelas|wali\s*kelas|tematik|kelas)\b/i.test(rawMapel)) return false;
  if (/^[1-6][a-z]?$/i.test(rawMapel) || /^(?:i{1,3}|iv|vi?)$/i.test(rawMapel)) return false;
  if (extractClassTingkatFromText(rawMapel)) return false;

  return true;
}

export function isNonWaliTeacher(mataPelajaran?: string, jabatan?: string): boolean {
  return isGuruMapel(mataPelajaran, jabatan) || isKepalaSekolah(mataPelajaran, jabatan);
}

export function isGuruKelas(mataPelajaran?: string, jabatan?: string): boolean {
  if (isNonWaliTeacher(mataPelajaran, jabatan)) return false;
  const str = `${mataPelajaran || ''} ${jabatan || ''}`.toLowerCase();
  if (str.includes('kepala')) return false;
  return /guru kelas|wali kelas|kelas\s*([1-6]|i{1,3}|iv|vi?)|tematik/.test(str) || str.trim() === '';
}

export function findMatchingClassForSubject(
  mataPelajaran?: string,
  jabatan?: string,
  classes: ClassRoom[] = []
): ClassRoom | undefined {
  if (isNonWaliTeacher(mataPelajaran, jabatan) || classes.length === 0) return undefined;
  const combined = `${mataPelajaran || ''} ${jabatan || ''}`.trim().toLowerCase();

  // Prioritas 1: kecocokan nama kelas spesifik (mis. "Guru Kelas 3A" -> "Kelas 3A")
  const exactByName = classes.find((c) => {
    const cname = (c.nama_kelas || '').trim().toLowerCase();
    return cname !== '' && combined.includes(cname);
  });
  if (exactByName) return exactByName;

  // Prioritas 2: kecocokan tingkat kelas 1 s/d 6 dari mata pelajaran atau jabatan
  const tingkat = extractClassTingkatFromText(mataPelajaran) || extractClassTingkatFromText(jabatan);
  if (tingkat) {
    return (
      classes.find((c) => String(c.tingkat || '').trim() === tingkat) ||
      classes.find((c) => new RegExp(`\\b${tingkat}[a-z]?\\b`, 'i').test(c.nama_kelas || ''))
    );
  }

  return undefined;
}

export function isMapelGuruKelas(mataPelajaran?: string): boolean {
  return /\bguru\s*kelas\b/i.test(String(mataPelajaran || '').trim());
}

export function isExplicitNonWaliValue(value?: string): boolean {
  return /^(?:non\s*[-\s]?wali(?:\s*kelas)?|bukan\s*wali(?:\s*kelas)?|tidak)$/i.test(
    String(value || '').trim()
  );
}

export function resolveTeacherClassAssignment(
  input: {
    mata_pelajaran?: string;
    jabatan?: string;
    wali_kelas_id?: string;
    wali_kelas?: string;
    id_kelas?: string;
  },
  classes: ClassRoom[] = []
): {
  isPaiPjok: boolean;
  isGuruMapel: boolean;
  isKepalaSekolah: boolean;
  isWaliKelas: boolean;
  id_kelas: string;
  wali_kelas_id: string;
  wali_kelas: string;
} {
  const isKepsek = isKepalaSekolah(input.mata_pelajaran, input.jabatan);
  if (isKepsek) {
    return {
      isPaiPjok: false,
      isGuruMapel: false,
      isKepalaSekolah: true,
      isWaliKelas: false,
      id_kelas: 'SEMUA_KELAS',
      wali_kelas_id: '',
      wali_kelas: '',
    };
  }

  const isMapel = isGuruMapel(input.mata_pelajaran, input.jabatan);
  if (isMapel) {
    return {
      isPaiPjok: true,
      isGuruMapel: true,
      isKepalaSekolah: false,
      isWaliKelas: false,
      id_kelas: 'SEMUA_KELAS',
      wali_kelas_id: '',
      wali_kelas: '',
    };
  }

  const rawWaliId = String(input.wali_kelas_id || '').trim();
  if (isExplicitNonWaliValue(input.wali_kelas) && !rawWaliId) {
    return {
      isPaiPjok: false,
      isGuruMapel: false,
      isKepalaSekolah: false,
      isWaliKelas: false,
      id_kelas: '',
      wali_kelas_id: '',
      wali_kelas: '',
    };
  }

  const rawId =
    rawWaliId ||
    (input.id_kelas && input.id_kelas !== 'SEMUA_KELAS' && input.id_kelas !== 'ALL' ? input.id_kelas : '');

  const subjectMatched = findMatchingClassForSubject(input.mata_pelajaran, input.jabatan, classes);
  const explicitClass = rawId ? classes.find((c) => c.id_kelas === rawId) : undefined;
  const byWaliName =
    !explicitClass && input.wali_kelas
      ? classes.find(
          (c) => c.nama_kelas.trim().toLowerCase() === String(input.wali_kelas).trim().toLowerCase()
        )
      : undefined;

  const subjectTingkat =
    extractClassTingkatFromText(input.mata_pelajaran) || extractClassTingkatFromText(input.jabatan);

  let chosen = explicitClass || byWaliName;
  if (!chosen && subjectMatched) {
    chosen = subjectMatched;
  } else if (
    !explicitClass &&
    chosen &&
    subjectMatched &&
    subjectTingkat &&
    String(chosen.tingkat || '').trim() !== subjectTingkat
  ) {
    // Jika mata pelajaran menunjuk tingkat kelas berbeda dan belum ada kelas dipilih eksplisit, selaraskan ke kelas tingkat tersebut
    chosen = subjectMatched;
  }

  const finalId = chosen?.id_kelas || (subjectTingkat ? '' : rawId || '');
  const finalName = chosen?.nama_kelas || (finalId ? input.wali_kelas || '' : '');

  return {
    isPaiPjok: false,
    isGuruMapel: false,
    isKepalaSekolah: false,
    isWaliKelas: Boolean(finalId),
    id_kelas: finalId,
    wali_kelas_id: finalId,
    wali_kelas: finalName,
  };
}

export interface ClassRoom {
  id_kelas: string;
  nama_kelas: string;
  tingkat: string;
  wali_kelas_id: string;
  wali_kelas: string;
  id_tahun_ajaran: string;
  tahun_ajaran: string;
  jumlah_siswa?: number;
  created_at: string;
  updated_at: string;
}

export function generateNextClassId(classes: Partial<ClassRoom>[]): string {
  const usedIds = new Set(
    classes.map((c) => String(c.id_kelas || '').trim().toUpperCase()).filter(Boolean)
  );
  let maxNum = 0;
  for (const c of classes) {
    const raw = String(c.id_kelas || '').trim().toUpperCase();
    const match = raw.match(/^KLS[-_]?(\d+)$/);
    if (match) {
      const n = Number(match[1]);
      if (Number.isFinite(n) && n > maxNum) maxNum = n;
    }
  }
  let nextNum = Math.max(maxNum + 1, classes.length + 1, 1);
  let candidate = `KLS-${String(nextNum).padStart(3, '0')}`;
  while (usedIds.has(candidate)) {
    nextNum += 1;
    candidate = `KLS-${String(nextNum).padStart(3, '0')}`;
  }
  return candidate;
}

export function inferTingkatFromClassName(namaKelas?: string): string {
  const raw = String(namaKelas || '').trim();
  if (!raw) return '';
  const directMatch = raw.match(/^(?:kelas\s*)?([1-6])(?:\s*[a-z0-9-]*)?$/i);
  if (directMatch?.[1]) return directMatch[1];
  const anyDigit = raw.match(/\b(?:kelas\s*)?([1-6])[a-z]?\b/i);
  if (anyDigit?.[1]) return anyDigit[1];
  return extractClassTingkatFromText(raw);
}

export function naturalCompare(a: string, b: string): number {
  const ax = String(a || '').trim().toLowerCase().match(/(\d+|\D+)/g) || [];
  const bx = String(b || '').trim().toLowerCase().match(/(\d+|\D+)/g) || [];
  const len = Math.min(ax.length, bx.length);
  for (let i = 0; i < len; i++) {
    if (ax[i] === bx[i]) continue;
    const aNum = /^\d+$/.test(ax[i]);
    const bNum = /^\d+$/.test(bx[i]);
    if (aNum && bNum) {
      const diff = Number(ax[i]) - Number(bx[i]);
      if (diff !== 0) return diff;
    } else {
      if (ax[i] < bx[i]) return -1;
      if (ax[i] > bx[i]) return 1;
    }
  }
  return ax.length - bx.length;
}

export function compareClassesByName(
  a: Partial<ClassRoom>,
  b: Partial<ClassRoom>
): number {
  const nameA = String(a.nama_kelas || '').trim();
  const nameB = String(b.nama_kelas || '').trim();
  const tA = Number(inferTingkatFromClassName(nameA) || a.tingkat || '');
  const tB = Number(inferTingkatFromClassName(nameB) || b.tingkat || '');
  const hasTA = Number.isFinite(tA) && tA > 0;
  const hasTB = Number.isFinite(tB) && tB > 0;
  if (hasTA && hasTB && tA !== tB) return tA - tB;
  if (hasTA !== hasTB) return hasTA ? -1 : 1;
  const normA = nameA.replace(/^(kelas|rombel)\s+/i, '');
  const normB = nameB.replace(/^(kelas|rombel)\s+/i, '');
  const cmp = naturalCompare(normA, normB);
  if (cmp !== 0) return cmp;
  const yrCmp = naturalCompare(String(a.tahun_ajaran || ''), String(b.tahun_ajaran || ''));
  if (yrCmp !== 0) return yrCmp;
  return naturalCompare(String(a.id_kelas || ''), String(b.id_kelas || ''));
}

export function previewClassIdForName(
  namaKelas: string,
  tingkat: string | undefined,
  classes: Partial<ClassRoom>[],
  editingId?: string
): string {
  const cleanName = String(namaKelas || '').trim();
  if (!cleanName) return generateNextClassId(classes);
  const others = classes.filter((c) => !editingId || c.id_kelas !== editingId);
  const tempMarker = '__PREVIEW_TARGET__';
  const simulated = [
    ...others,
    {
      id_kelas: tempMarker,
      nama_kelas: cleanName,
      tingkat: tingkat || inferTingkatFromClassName(cleanName) || '1',
    },
  ].sort(compareClassesByName);
  const idx = simulated.findIndex((c) => c.id_kelas === tempMarker);
  const seq = idx >= 0 ? idx + 1 : simulated.length;
  return `KLS-${String(seq).padStart(3, '0')}`;
}

export interface Subject {
  id_mapel: string;
  kode_mapel: string;
  nama_mapel: string;
  kelompok: 'Wajib' | 'Muatan Lokal' | 'Pengembangan Diri';
  alokasi_waktu: number;
  status_aktif: 'Aktif' | 'Nonaktif';
  created_at: string;
  updated_at: string;
}

export function generateNextSubjectId(subjects: Partial<Subject>[]): string {
  const usedIds = new Set(
    subjects.map((s) => String(s.id_mapel || '').trim().toUpperCase()).filter(Boolean)
  );
  let maxNum = 0;
  for (const s of subjects) {
    const raw = String(s.id_mapel || '').trim().toUpperCase();
    const match = raw.match(/^MPL[-_]?(\d+)$/);
    if (match) {
      const n = Number(match[1]);
      if (Number.isFinite(n) && n > maxNum) maxNum = n;
    }
  }
  let nextNum = Math.max(maxNum + 1, subjects.length + 1, 1);
  let candidate = `MPL-${String(nextNum).padStart(3, '0')}`;
  while (usedIds.has(candidate)) {
    nextNum += 1;
    candidate = `MPL-${String(nextNum).padStart(3, '0')}`;
  }
  return candidate;
}

export function suggestSubjectCode(
  namaMapel: string,
  existingSubjects: Partial<Subject>[] = []
): string {
  const clean = String(namaMapel || '')
    .trim()
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ');
  if (!clean) return '';

  const lower = clean.toLowerCase();
  const knownMap: [RegExp, string][] = [
    [/pendidikan agama islam|agama islam|\bpai\b/, 'PAI'],
    [/pendidikan jasmani|\bpjok\b|penjas/, 'PJOK'],
    [/matematika|\bmtk\b/, 'MTK'],
    [/bahasa indonesia/, 'BIN'],
    [/bahasa inggris/, 'BIG'],
    [/bahasa jawa/, 'BJW'],
    [/bahasa sunda/, 'BSN'],
    [/bahasa arab/, 'BAR'],
    [/ilmu pengetahuan alam dan sosial|\bipas\b/, 'IPAS'],
    [/ilmu pengetahuan alam|\bipa\b/, 'IPA'],
    [/ilmu pengetahuan sosial|\bips\b/, 'IPS'],
    [/pendidikan pancasila|\bppkn\b|\bpkn\b/, 'PPKN'],
    [/seni budaya|\bsbdp\b/, 'SBDP'],
    [/informatika|\btik\b/, 'INF'],
    [/muatan lokal|\bmulok\b/, 'MLK'],
    [/projek penguatan|\bp5\b/, 'P5'],
  ];

  let base = '';
  for (const [pattern, code] of knownMap) {
    if (pattern.test(lower)) {
      base = code;
      break;
    }
  }

  if (!base) {
    const stopWords = new Set(['dan', 'atau', 'yang', 'di', 'ke', 'dari', 'untuk']);
    const words = clean.split(' ').filter((w) => w && !stopWords.has(w.toLowerCase()));
    if (words.length >= 2) {
      base = words
        .slice(0, 4)
        .map((w) => w[0].toUpperCase())
        .join('');
    } else {
      base = (words[0] || clean).slice(0, 3).toUpperCase();
    }
  }

  const usedCodes = new Set(
    existingSubjects.map((s) => String(s.kode_mapel || '').trim().toUpperCase()).filter(Boolean)
  );
  if (!usedCodes.has(base)) return base;

  let suffix = 2;
  while (usedCodes.has(`${base}${suffix}`)) {
    suffix += 1;
  }
  return `${base}${suffix}`;
}

export interface ScheduleItem {
  id_jadwal: string;
  id_tahun_ajaran: string;
  semester: 'Ganjil' | 'Genap';
  hari: 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu';
  jam_ke: string;
  waktu_mulai: string;
  waktu_selesai: string;
  id_kelas: string;
  nama_kelas: string;
  id_mapel: string;
  nama_mapel: string;
  id_guru: string;
  nama_guru: string;
  created_at: string;
  updated_at: string;
}

export interface PicketSchedule {
  id_piket: string;
  hari: 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu';
  id_kelas: string;
  nama_kelas: string;
  id_guru: string;
  nama_guru: string;
  id_siswa?: string;
  petugas_siswa: string;
  tugas: string;
  checklist_kebersihan?: string;
  keterangan: string;
  created_at: string;
  updated_at: string;
}

export type AttendanceStatus = 'Hadir' | 'Sakit' | 'Izin' | 'Alpha';

export interface AttendanceRecord {
  id_absensi: string;
  tanggal: string;
  id_tahun_ajaran: string;
  semester: 'Ganjil' | 'Genap';
  id_kelas: string;
  nama_kelas: string;
  id_siswa: string;
  nama_siswa: string;
  status: AttendanceStatus;
  keterangan: string;
  koreksi_catatan: string;
  diinput_oleh: string;
  created_at: string;
  updated_at: string;
}

export interface GradeRecord {
  id_nilai: string;
  id_tahun_ajaran: string;
  tahun_ajaran: string;
  semester: 'Ganjil' | 'Genap';
  id_kelas: string;
  nama_kelas: string;
  id_mapel: string;
  nama_mapel: string;
  id_guru: string;
  nama_guru: string;
  id_siswa: string;
  nama_siswa: string;
  sum_1: string | number;
  sum_2: string | number;
  sum_3: string | number;
  sum_4: string | number;
  sas: string | number;
  rata_rata: number | null;
  jumlah_komponen: number;
  catatan: string;
  created_at: string;
  updated_at: string;
}

export interface TeacherJournal {
  id_jurnal: string;
  tanggal: string;
  id_guru: string;
  nama_guru: string;
  id_kelas: string;
  nama_kelas: string;
  id_mapel: string;
  nama_mapel: string;
  materi: string;
  tujuan_pembelajaran: string;
  aktivitas: string;
  metode: string;
  refleksi: string;
  tindak_lanjut: string;
  created_at: string;
  updated_at: string;
}

export type CharacterAspect =
  | 'Keimanan dan Ketaqwaan terhadap Tuhan YME'
  | 'Kewargaan'
  | 'Penalaran Kritis'
  | 'Kreativitas'
  | 'Kolaborasi'
  | 'Kemandirian'
  | 'Kesehatan'
  | 'Komunikasi';

export const CHARACTER_ASPECTS: CharacterAspect[] = [
  'Keimanan dan Ketaqwaan terhadap Tuhan YME',
  'Kewargaan',
  'Penalaran Kritis',
  'Kreativitas',
  'Kolaborasi',
  'Kemandirian',
  'Kesehatan',
  'Komunikasi',
];

export function normalizeCharacterAspect(val: unknown): CharacterAspect {
  const raw = String(val ?? '').trim();
  const matched = CHARACTER_ASPECTS.find((a) => a.toLowerCase() === raw.toLowerCase());
  if (matched) return matched;
  const legacyMap: Record<string, CharacterAspect> = {
    religius: 'Keimanan dan Ketaqwaan terhadap Tuhan YME',
    'kepedulian sosial': 'Kewargaan',
    'tanggung jawab': 'Kewargaan',
    'bernalar kritis': 'Penalaran Kritis',
    kreatif: 'Kreativitas',
    'gotong royong': 'Kolaborasi',
    mandiri: 'Kemandirian',
    disiplin: 'Kemandirian',
  };
  return legacyMap[raw.toLowerCase()] || CHARACTER_ASPECTS[0];
}

export interface CharacterRecord {
  id_karakter: string;
  tanggal: string;
  id_siswa: string;
  nama_siswa: string;
  id_kelas: string;
  nama_kelas: string;
  aspek: CharacterAspect;
  nilai_perkembangan:
    | 'Membudaya'
    | 'Berkembang Sesuai Harapan'
    | 'Mulai Berkembang'
    | 'Perlu Bimbingan';
  catatan: string;
  id_guru: string;
  nama_guru: string;
  tindak_lanjut: string;
  created_at: string;
  updated_at: string;
}

export interface HealthRecord {
  id_kesehatan: string;
  tanggal: string;
  id_siswa: string;
  nama_siswa: string;
  id_kelas: string;
  nama_kelas: string;
  keluhan: string;
  hasil_pemeriksaan: string;
  tindak_lanjut: string;
  pemeriksa: string;
  created_at: string;
  updated_at: string;
}

export interface CounselingRecord {
  id_bimbingan: string;
  tanggal: string;
  id_siswa: string;
  nama_siswa: string;
  id_kelas: string;
  nama_kelas: string;
  jenis_permasalahan: string;
  catatan_konsultasi: string;
  tindak_lanjut: string;
  pembimbing: string;
  status: 'Proses' | 'Selesai' | 'Pantauan';
  created_at: string;
  updated_at: string;
}

export interface AchievementRecord {
  id_prestasi: string;
  id_siswa: string;
  nama_siswa: string;
  id_kelas: string;
  nama_kelas: string;
  nama_prestasi: string;
  jenis_lomba: string;
  tingkat: 'Sekolah' | 'Kecamatan' | 'Kabupaten/Kota' | 'Provinsi' | 'Nasional' | 'Internasional';
  peringkat: string;
  tanggal: string;
  dokumentasi_url: string;
  created_at: string;
  updated_at: string;
}

export interface AgendaItem {
  id_agenda: string;
  nama_kegiatan: string;
  tanggal: string;
  waktu: string;
  tempat: string;
  penanggung_jawab: string;
  deskripsi: string;
  dokumentasi_url: string;
  target_role: 'Semua' | 'Guru' | 'Orang Tua';
  id_kelas: string;
  created_at: string;
  updated_at: string;
}

export interface LiaisonMessage {
  id_penghubung: string;
  tanggal: string;
  id_siswa: string;
  nama_siswa: string;
  id_kelas: string;
  nama_kelas: string;
  pengirim_id: string;
  pengirim_nama: string;
  pengirim_role: UserRole;
  pesan: string;
  status_baca: 'Terkirim' | 'Dibaca' | 'Dikonfirmasi';
  catatan_konfirmasi: string;
  created_at: string;
  updated_at: string;
}

export interface InventoryItem {
  id_inventaris: string;
  kode_barang: string;
  nama_barang: string;
  kategori: string;
  jumlah: number;
  satuan: string;
  kondisi: 'Baik' | 'Rusak Ringan' | 'Rusak Berat';
  lokasi: string;
  tahun_perolehan: string;
  keterangan: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentationItem {
  id_dokumentasi: string;
  judul: string;
  kategori: string;
  tanggal: string;
  deskripsi: string;
  tautan_file: string;
  pengunggah: string;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id_log: string;
  waktu: string;
  id_user: string;
  username: string;
  role: string;
  aksi: string;
  modul: string;
  detail: string;
  created_at: string;
}

export interface DashboardSummary {
  total_siswa: number;
  total_guru: number;
  total_kelas: number;
  total_mapel: number;
  persentase_kehadiran: number;
  jumlah_tidak_hadir: number;
  siswa_per_kelas: { nama_kelas: string; jumlah: number; jumlah_l?: number; jumlah_p?: number }[];
  kehadiran_chart: { status: string; jumlah: number }[];
  perkembangan_nilai: { nama_mapel: string; rata_rata: number }[];
  prestasi_chart: { tingkat: string; jumlah: number }[];
  aktivitas_terbaru: ActivityLog[];
  agenda_terdekat: AgendaItem[];
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error_code?: string;
}

export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
}

export interface DesktopUpdateStatus {
  status: 'idle' | 'checking' | 'available' | 'not-available' | 'progress' | 'downloaded' | 'error';
  version?: string;
  percent?: number;
  message?: string;
}

export interface KelaskuDesktopBridge {
  isDesktop: boolean;
  platform: string;
  appVersion: string;
  isPackaged: boolean;
  initialGasUrl: string;
  initialLocalMode: boolean;
  configPath: string;
  externalUrlFilePath: string;
  getGasUrl: () => Promise<string>;
  setGasUrl: (url: string) => Promise<string>;
  setLocalMode: (enabled: boolean) => Promise<unknown>;
  resetGasUrl: () => Promise<string>;
  checkForUpdates: () => Promise<DesktopUpdateStatus>;
  installUpdate: () => Promise<boolean>;
  openExternal: (url: string) => Promise<boolean>;
  onUpdateStatus: (callback: (payload: DesktopUpdateStatus) => void) => () => void;
}

declare global {
  interface Window {
    KELASKU_CONFIG?: {
      APP_NAME?: string;
      TAGLINE?: string;
      GAS_WEB_APP_URL?: string;
      REQUEST_TIMEOUT_MS?: number;
    };
    kelaskuDesktop?: KelaskuDesktopBridge;
  }
}
