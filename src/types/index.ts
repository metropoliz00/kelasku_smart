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
  wali_kelas_id: string;
  wali_kelas: string;
  telepon: string;
  username: string;
  status_akun: 'Aktif' | 'Nonaktif';
  foto_url?: string;
  created_at: string;
  updated_at: string;
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
  petugas_siswa: string;
  tugas: string;
  keterangan: string;
  created_at: string;
  updated_at: string;
}

export type AttendanceStatus = 'Hadir' | 'Sakit' | 'Izin' | 'Alpa' | 'Terlambat';

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
  | 'Religius'
  | 'Disiplin'
  | 'Tanggung Jawab'
  | 'Mandiri'
  | 'Gotong Royong'
  | 'Bernalar Kritis'
  | 'Kreatif'
  | 'Kepedulian Sosial';

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
  siswa_per_kelas: { nama_kelas: string; jumlah: number }[];
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

declare global {
  interface Window {
    KELASKU_CONFIG?: {
      APP_NAME?: string;
      TAGLINE?: string;
      GAS_WEB_APP_URL?: string;
      REQUEST_TIMEOUT_MS?: number;
    };
  }
}
