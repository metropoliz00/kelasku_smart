/**
 * ============================================================================
 * KELASKU SMART - GOOGLE APPS SCRIPT BACKEND (Code.gs)
 * ============================================================================
 * Sistem Administrasi dan Manajemen Sekolah Dasar Terintegrasi
 * Database: Google Spreadsheet (21 Sheets)
 *
 * CATATAN PENYIMPANAN PASSWORD:
 * Kolom `password` pada sheet USERS menggunakan teks biasa (plain text,
 * tanpa hashing) agar username & password terlihat jelas di database Google
 * Sheets serta di menu Manajemen Pengguna & ekspor cadangan Admin.
 * ============================================================================
 */

var DEFAULT_ADMIN_CONFIG = {
  username: 'admin',
  password: 'admin123',
  nama_lengkap: 'Administrator Sekolah'
};

var SHEETS_SCHEMA = {
  USERS: [
    'id_user', 'username', 'password', 'nama_lengkap', 'role',
    'relasi_id', 'relasi_nama', 'status', 'created_at', 'updated_at', 'foto_url'
  ],
  IDENTITAS_SEKOLAH: [
    'id', 'nama_sekolah', 'npsn', 'alamat', 'kecamatan', 'kabupaten',
    'provinsi', 'email', 'tahun_ajaran_aktif_id', 'tahun_ajaran_aktif',
    'semester_aktif', 'peringkat_aktif', 'updated_at'
  ],
  TAHUN_AJARAN: [
    'id_tahun_ajaran', 'nama_tahun_ajaran', 'semester', 'status',
    'keterangan', 'created_at', 'updated_at'
  ],
  SISWA: [
    'no', 'nama_lengkap', 'nis', 'jenis_kelamin', 'nisn', 'tempat_lahir', 'tanggal_lahir',
    'nik', 'agama', 'alamat', 'rt', 'rw', 'dusun', 'kelurahan', 'kecamatan', 'kode_pos',
    'jenis_tinggal', 'alat_transportasi', 'telepon', 'hp', 'email', 'skhun',
    'penerima_kps', 'no_kps',
    'nama_ayah', 'tahun_lahir_ayah', 'pendidikan_ayah', 'pekerjaan_ayah', 'penghasilan_ayah', 'nik_ayah',
    'nama_ibu', 'tahun_lahir_ibu', 'pendidikan_ibu', 'pekerjaan_ibu', 'penghasilan_ibu', 'nik_ibu',
    'nama_wali', 'tahun_lahir_wali', 'pendidikan_wali', 'pekerjaan_wali', 'penghasilan_wali', 'nik_wali',
    'nama_kelas', 'no_peserta_un', 'no_seri_ijazah', 'penerima_kip', 'nomor_kip', 'nama_di_kip',
    'nomor_kks', 'no_registrasi_akta_lahir', 'bank', 'no_rekening_bank', 'rekening_atas_nama',
    'layak_pip', 'alasan_layak_pip', 'kebutuhan_khusus', 'sekolah_asal', 'anak_ke',
    'lintang', 'bujur', 'no_kk', 'berat_badan', 'tinggi_badan', 'lingkar_kepala',
    'jml_saudara_kandung', 'jarak_rumah_km',
    'status_siswa', 'id_kelas', 'id_siswa', 'foto_url', 'created_at', 'updated_at'
  ],
  GURU: [
    'no', 'nama_guru', 'nip', 'nuptk', 'jenis_kelamin', 'tempat_lahir', 'tanggal_lahir',
    'ijazah_tertinggi', 'jabatan', 'status_kepegawaian', 'tmt_pengangkatan',
    'mulai_bekerja_disini', 'pangkat_gol', 'masa_kerja_thn', 'masa_kerja_bln',
    'tanggal_no_sk_terakhir', 'email_pribadi', 'email_belajar',
    'mata_pelajaran', 'wali_kelas_id', 'wali_kelas', 'telepon', 'username',
    'status_akun', 'id_guru', 'created_at', 'updated_at', 'foto_url', 'id_kelas'
  ],
  KELAS: [
    'id_kelas', 'nama_kelas', 'tingkat', 'wali_kelas_id', 'wali_kelas',
    'id_tahun_ajaran', 'tahun_ajaran', 'created_at', 'updated_at'
  ],
  MAPEL: [
    'id_mapel', 'kode_mapel', 'nama_mapel', 'kelompok', 'alokasi_waktu',
    'status_aktif', 'created_at', 'updated_at'
  ],
  JADWAL: [
    'id_jadwal', 'id_tahun_ajaran', 'semester', 'hari', 'jam_ke',
    'waktu_mulai', 'waktu_selesai', 'id_kelas', 'nama_kelas',
    'id_mapel', 'nama_mapel', 'id_guru', 'nama_guru', 'created_at', 'updated_at'
  ],
  PIKET: [
    'id_piket', 'hari', 'id_kelas', 'nama_kelas', 'id_guru', 'nama_guru',
    'id_siswa', 'petugas_siswa', 'tugas', 'checklist_kebersihan', 'keterangan',
    'created_at', 'updated_at'
  ],
  ABSENSI: [
    'id_absensi', 'tanggal', 'id_tahun_ajaran', 'semester', 'id_kelas',
    'nama_kelas', 'id_siswa', 'nama_siswa', 'status', 'keterangan',
    'koreksi_catatan', 'diinput_oleh', 'created_at', 'updated_at'
  ],
  NILAI: [
    'id_nilai', 'id_tahun_ajaran', 'tahun_ajaran', 'semester', 'id_kelas',
    'nama_kelas', 'id_mapel', 'nama_mapel', 'id_guru', 'nama_guru',
    'id_siswa', 'nama_siswa', 'sum_1', 'sum_2', 'sum_3', 'sum_4', 'sas',
    'rata_rata', 'jumlah_komponen', 'catatan', 'created_at', 'updated_at'
  ],
  JURNAL: [
    'id_jurnal', 'tanggal', 'id_guru', 'nama_guru', 'id_kelas', 'nama_kelas',
    'id_mapel', 'nama_mapel', 'materi', 'tujuan_pembelajaran', 'aktivitas',
    'metode', 'refleksi', 'tindak_lanjut', 'created_at', 'updated_at'
  ],
  KARAKTER: [
    'id_karakter', 'tanggal', 'id_siswa', 'nama_siswa', 'id_kelas',
    'nama_kelas', 'aspek', 'nilai_perkembangan', 'catatan', 'id_guru',
    'nama_guru', 'tindak_lanjut', 'created_at', 'updated_at'
  ],
  KESEHATAN: [
    'id_kesehatan', 'tanggal', 'id_siswa', 'nama_siswa', 'id_kelas',
    'nama_kelas', 'keluhan', 'hasil_pemeriksaan', 'tindak_lanjut',
    'pemeriksa', 'created_at', 'updated_at'
  ],
  BIMBINGAN: [
    'id_bimbingan', 'tanggal', 'id_siswa', 'nama_siswa', 'id_kelas',
    'nama_kelas', 'jenis_permasalahan', 'catatan_konsultasi',
    'tindak_lanjut', 'pembimbing', 'status', 'created_at', 'updated_at'
  ],
  PRESTASI: [
    'id_prestasi', 'id_siswa', 'nama_siswa', 'id_kelas', 'nama_kelas',
    'nama_prestasi', 'jenis_lomba', 'tingkat', 'peringkat', 'tanggal',
    'dokumentasi_url', 'created_at', 'updated_at'
  ],
  AGENDA: [
    'id_agenda', 'nama_kegiatan', 'tanggal', 'waktu', 'tempat',
    'penanggung_jawab', 'deskripsi', 'dokumentasi_url', 'target_role',
    'id_kelas', 'created_at', 'updated_at'
  ],
  PENGHUBUNG: [
    'id_penghubung', 'tanggal', 'id_siswa', 'nama_siswa', 'id_kelas',
    'nama_kelas', 'pengirim_id', 'pengirim_nama', 'pengirim_role',
    'pesan', 'status_baca', 'catatan_konfirmasi', 'created_at', 'updated_at'
  ],
  INVENTARIS: [
    'id_inventaris', 'kode_barang', 'nama_barang', 'kategori', 'jumlah',
    'satuan', 'kondisi', 'lokasi', 'tahun_perolehan', 'keterangan',
    'created_at', 'updated_at'
  ],
  DOKUMENTASI: [
    'id_dokumentasi', 'judul', 'kategori', 'tanggal', 'deskripsi',
    'tautan_file', 'pengunggah', 'created_at', 'updated_at'
  ],
  LOG_AKTIVITAS: [
    'id_log', 'waktu', 'id_user', 'username', 'role', 'aksi',
    'modul', 'detail', 'created_at'
  ]
};

var SISWA_ROW1_HEADERS = [
  'No', 'Nama', 'NIS', 'JK', 'NISN', 'Tempat Lahir', 'Tanggal Lahir',
  'NIK', 'Agama', 'Alamat', 'RT', 'RW', 'Dusun', 'Kelurahan', 'Kecamatan', 'Kode Pos',
  'Jenis Tinggal', 'Alat Transportasi', 'Telepon', 'HP', 'E-Mail', 'SKHUN',
  'Penerima KPS', 'No. KPS',
  'Data Ayah', '', '', '', '', '',
  'Data Ibu', '', '', '', '', '',
  'Data Wali', '', '', '', '', '',
  'Rombel Saat Ini', 'No. Peserta Ujian Nasional', 'No. Seri Ijazah', 'Penerima KIP',
  'Nomor KIP', 'Nama di KIP', 'Nomor KKS', 'No. Registrasi Akta Lahir', 'Bank',
  'Nomor Rekening Bank', 'Rekening Atas Nama', 'Layak PIP (Usulan dari Sekolah)',
  'Alasan Layak PIP', 'Kebutuhan Khusus', 'Sekolah Asal', 'Anak ke-berapa',
  'Lintang', 'Bujur', 'No. KK', 'Berat Badan', 'Tinggi Badan', 'Lingkar Kepala',
  'Jml. Saudara Kandung', 'Jarak Rumah ke Sekolah (KM)',
  'Status Siswa', 'ID Kelas', 'ID Siswa', 'Foto URL', 'Created At', 'Updated At'
];

var SISWA_ROW2_HEADERS = [
  '', '', '', '', '', '', '',
  '', '', '', '', '', '', '', '', '',
  '', '', '', '', '', '',
  '', '',
  'Nama', 'Tahun Lahir', 'Jenjang Pendidikan', 'Pekerjaan', 'Penghasilan', 'NIK',
  'Nama', 'Tahun Lahir', 'Jenjang Pendidikan', 'Pekerjaan', 'Penghasilan', 'NIK',
  'Nama', 'Tahun Lahir', 'Jenjang Pendidikan', 'Pekerjaan', 'Penghasilan', 'NIK',
  '', '', '', '',
  '', '', '', '', '',
  '', '', '',
  '', '', '', '',
  '', '', '', '', '', '',
  '', '',
  '', '', '', '', '', ''
];

var GURU_DISPLAY_HEADERS = [
  'NO', 'NAMA', 'NIP', 'NUPTK', 'JENIS KELAMIN', 'TEMPAT LAHIR', 'TANGGAL LAHIR',
  'IJAZAH TERTINGGI', 'JABATAN', 'STATUS', 'TMT PENGANGKATAN',
  'MULAI BEKERJA DISINI', 'PANGKAT/GOL', 'MASA KERJA (THN)', 'MASA KERJA (BLN)',
  'TANGGAL DAN NO SK TERAKHIR', 'EMAIL PRIBADI', 'EMAIL BELAJAR',
  'MATA PELAJARAN', 'WALI KELAS ID', 'WALI KELAS', 'TELEPON', 'USERNAME',
  'STATUS AKUN', 'ID GURU', 'CREATED AT', 'UPDATED AT', 'FOTO URL', 'ID KELAS'
];

/**
 * Setup struktur 21 sheet tanpa menghapus data yang ada dan tanpa data dummy.
 * Otomatis memastikan sheet USERS memiliki kolom `password` (plain text) dan
 * membuat/memperbaiki akun ADMIN default (admin / admin123) jika belum ada.
 * Aman dijalankan berulang kali dan ditempatkan di urutan atas agar tombol Run
 * default di Editor Apps Script langsung menjalankan fungsi ini.
 */
function setupDatabase(skipDefaultAdmin, skipSync) {
  var ss = getSpreadsheet_();
  var sheetNames = Object.keys(SHEETS_SCHEMA);
  var created = [];
  var verified = [];

  for (var i = 0; i < sheetNames.length; i++) {
    var name = sheetNames[i];
    var headers = SHEETS_SCHEMA[name];
    var sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      if (name === 'SISWA') {
        formatSiswaSheet_(sheet);
      } else if (name === 'GURU') {
        formatGuruSheet_(sheet);
      } else {
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#EDE9FE');
        sheet.setFrozenRows(1);
      }
      created.push(name);
    } else {
      var lastRow = sheet.getLastRow();
      if (lastRow === 0) {
        if (name === 'SISWA') {
          formatSiswaSheet_(sheet);
        } else if (name === 'GURU') {
          formatGuruSheet_(sheet);
        } else {
          sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
          sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#EDE9FE');
          sheet.setFrozenRows(1);
        }
      } else if (lastRow === 1 && name === 'SISWA') {
        formatSiswaSheet_(sheet);
      } else if (lastRow === 1 && name === 'GURU') {
        formatGuruSheet_(sheet);
      } else {
        if (name === 'USERS') {
          ensureUsersSheetStructure_(sheet);
        } else if (name === 'MAPEL') {
          ensureMapelSheetStructure_(sheet);
        } else if (name === 'KELAS') {
          ensureKelasSheetStructure_(sheet);
        } else if (name === 'JADWAL') {
          ensureJadwalSheetStructure_(sheet);
        } else if (name === 'PIKET') {
          ensurePiketSheetStructure_(sheet);
        } else if (name === 'ABSENSI') {
          ensureAbsensiSheetStructure_(sheet);
        } else if (name === 'JURNAL') {
          ensureJurnalSheetStructure_(sheet);
        } else if (name === 'GURU') {
          ensureColumnHeader_(sheet, 'FOTO URL', '#EDE9FE', '#1E1B4B', true);
          ensureColumnHeader_(sheet, 'ID KELAS', '#EDE9FE', '#1E1B4B', true);
        }
      }
      verified.push(name);
    }
  }

  var usersSheetFormat = ss.getSheetByName('USERS');
  if (usersSheetFormat) {
    ensureUsersSheetStructure_(usersSheetFormat);
  }

  var defaultAdminCreated = false;
  if (!skipDefaultAdmin) {
    defaultAdminCreated = !!ensureDefaultAdmin_();
  }

  var syncReport = null;
  if (!skipSync) {
    syncReport = syncAllRelatedIds_(null, true);
  }

  SpreadsheetApp.flush();

  return {
    created_sheets: created,
    verified_sheets: verified,
    total_sheets: sheetNames.length,
    default_admin_created: defaultAdminCreated,
    id_sync: syncReport
  };
}

function normalizeUsersHeaderKey_(rawHeader) {
  var k = String(rawHeader || '').trim().toLowerCase().replace(/\s+/g, '_');
  if (k === 'user' || k === 'nama_user') return 'username';
  if (k === 'password_hash' || k === 'pass' || k === 'kata_sandi' || k === 'sandi' || k === 'pwd') return 'password';
  return k;
}

function normalizeMapelHeaderKey_(rawHeader) {
  var k = String(rawHeader || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  if (k === 'id' || k === 'id_mapel' || k === 'mapel_id' || k === 'id_mata_pelajaran') return 'id_mapel';
  if (k === 'kode' || k === 'kode_mapel' || k === 'kode_mata_pelajaran' || k === 'kd_mapel') return 'kode_mapel';
  if (k === 'nama' || k === 'nama_mapel' || k === 'nama_mata_pelajaran' || k === 'mata_pelajaran' || k === 'mapel') return 'nama_mapel';
  if (k === 'kelompok' || k === 'kategori' || k === 'kelompok_mapel') return 'kelompok';
  if (k === 'alokasi_waktu' || k === 'alokasi' || k === 'alokasi_jp' || k === 'alokasi_waktu_jp' || k === 'jp' || k === 'jam_pelajaran') return 'alokasi_waktu';
  if (k === 'status_aktif' || k === 'status' || k === 'aktif') return 'status_aktif';
  if (k === 'created_at' || k === 'dibuat_pada') return 'created_at';
  if (k === 'updated_at' || k === 'diperbarui_pada') return 'updated_at';
  return k;
}

function ensureMapelSheetStructure_(sheet) {
  if (!sheet) return;
  var headers = SHEETS_SCHEMA.MAPEL;
  if (sheet.getLastRow() === 0 || sheet.getLastColumn() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#EDE9FE');
    sheet.setFrozenRows(1);
    return;
  }
  var lastCol = sheet.getLastColumn();
  var row0 = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var existingKeys = row0.map(function(h) { return normalizeMapelHeaderKey_(h); });
  for (var i = 0; i < headers.length; i++) {
    if (existingKeys.indexOf(headers[i]) === -1) {
      var nextCol = sheet.getLastColumn() + 1;
      sheet.getRange(1, nextCol).setValue(headers[i]).setFontWeight('bold').setBackground('#EDE9FE');
      existingKeys.push(headers[i]);
    }
  }
}

function normalizeKelasHeaderKey_(rawHeader) {
  var k = String(rawHeader || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  if (k === 'id' || k === 'id_kelas' || k === 'class_id' || k === 'kode_kelas') return 'id_kelas';
  if (k === 'nama' || k === 'nama_kelas' || k === 'kelas' || k === 'rombel' || k === 'nama_rombel') return 'nama_kelas';
  if (k === 'tingkat' || k === 'grade' || k === 'jenjang' || k === 'level') return 'tingkat';
  if (k === 'wali_kelas_id' || k === 'id_wali_kelas' || k === 'wali_id') return 'wali_kelas_id';
  if (k === 'wali_kelas' || k === 'nama_wali_kelas' || k === 'wali') return 'wali_kelas';
  if (k === 'id_tahun_ajaran' || k === 'tahun_ajaran_id') return 'id_tahun_ajaran';
  if (k === 'tahun_ajaran' || k === 'nama_tahun_ajaran' || k === 'tapel') return 'tahun_ajaran';
  if (k === 'created_at' || k === 'dibuat_pada') return 'created_at';
  if (k === 'updated_at' || k === 'diperbarui_pada') return 'updated_at';
  return k;
}

function ensureKelasSheetStructure_(sheet) {
  if (!sheet) return;
  var headers = SHEETS_SCHEMA.KELAS;
  if (sheet.getLastRow() === 0 || sheet.getLastColumn() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#EDE9FE');
    sheet.setFrozenRows(1);
    return;
  }
  var lastCol = sheet.getLastColumn();
  var row0 = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var existingKeys = row0.map(function(h) { return normalizeKelasHeaderKey_(h); });
  for (var i = 0; i < headers.length; i++) {
    if (existingKeys.indexOf(headers[i]) === -1) {
      var nextCol = sheet.getLastColumn() + 1;
      sheet.getRange(1, nextCol).setValue(headers[i]).setFontWeight('bold').setBackground('#EDE9FE');
      existingKeys.push(headers[i]);
    }
  }
}

function normalizeJadwalHeaderKey_(rawHeader) {
  var k = String(rawHeader || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  if (k === 'id' || k === 'id_jadwal' || k === 'jadwal_id') return 'id_jadwal';
  if (k === 'id_tahun_ajaran' || k === 'tahun_ajaran_id') return 'id_tahun_ajaran';
  if (k === 'semester') return 'semester';
  if (k === 'hari' || k === 'day') return 'hari';
  if (k === 'jam_ke' || k === 'jam' || k === 'jp_ke') return 'jam_ke';
  if (k === 'waktu_mulai' || k === 'jam_mulai' || k === 'mulai') return 'waktu_mulai';
  if (k === 'waktu_selesai' || k === 'jam_selesai' || k === 'selesai') return 'waktu_selesai';
  if (k === 'id_kelas' || k === 'class_id') return 'id_kelas';
  if (k === 'nama_kelas' || k === 'kelas' || k === 'rombel') return 'nama_kelas';
  if (k === 'id_mapel' || k === 'mapel_id') return 'id_mapel';
  if (k === 'nama_mapel' || k === 'mata_pelajaran' || k === 'mapel') return 'nama_mapel';
  if (k === 'id_guru' || k === 'guru_id') return 'id_guru';
  if (k === 'nama_guru' || k === 'guru_pengampu' || k === 'guru' || k === 'pengampu') return 'nama_guru';
  if (k === 'created_at' || k === 'dibuat_pada') return 'created_at';
  if (k === 'updated_at' || k === 'diperbarui_pada') return 'updated_at';
  return k;
}

function ensureJadwalSheetStructure_(sheet) {
  if (!sheet) return;
  var headers = SHEETS_SCHEMA.JADWAL;
  if (sheet.getLastRow() === 0 || sheet.getLastColumn() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#EDE9FE');
    sheet.setFrozenRows(1);
    return;
  }
  var lastCol = sheet.getLastColumn();
  var row0 = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var existingKeys = row0.map(function(h) { return normalizeJadwalHeaderKey_(h); });
  for (var i = 0; i < headers.length; i++) {
    if (existingKeys.indexOf(headers[i]) === -1) {
      var nextCol = sheet.getLastColumn() + 1;
      sheet.getRange(1, nextCol).setValue(headers[i]).setFontWeight('bold').setBackground('#EDE9FE');
      existingKeys.push(headers[i]);
    }
  }
}

function normalizePiketHeaderKey_(rawHeader) {
  var k = String(rawHeader || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  if (k === 'id' || k === 'id_piket' || k === 'piket_id') return 'id_piket';
  if (k === 'hari' || k === 'day') return 'hari';
  if (k === 'id_kelas' || k === 'class_id') return 'id_kelas';
  if (k === 'nama_kelas' || k === 'kelas' || k === 'rombel') return 'nama_kelas';
  if (k === 'id_guru' || k === 'guru_id') return 'id_guru';
  if (k === 'nama_guru' || k === 'guru' || k === 'guru_pembina' || k === 'pembina') return 'nama_guru';
  if (k === 'id_siswa' || k === 'siswa_id' || k === 'id_siswa_petugas' || k === 'petugas_siswa_id') return 'id_siswa';
  if (k === 'petugas_siswa' || k === 'nama_siswa' || k === 'siswa' || k === 'petugas') return 'petugas_siswa';
  if (k === 'tugas' || k === 'uraian_tugas' || k === 'daftar_tugas') return 'tugas';
  if (k === 'checklist_kebersihan' || k === 'checklist' || k === 'ceklist_kebersihan' || k === 'status_checklist') return 'checklist_kebersihan';
  if (k === 'keterangan' || k === 'waktu' || k === 'shift') return 'keterangan';
  if (k === 'created_at' || k === 'dibuat_pada') return 'created_at';
  if (k === 'updated_at' || k === 'diperbarui_pada') return 'updated_at';
  return k;
}

function ensurePiketSheetStructure_(sheet) {
  if (!sheet) return;
  var headers = SHEETS_SCHEMA.PIKET;
  if (sheet.getLastRow() === 0 || sheet.getLastColumn() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#EDE9FE');
    sheet.setFrozenRows(1);
    return;
  }
  var lastCol = sheet.getLastColumn();
  var row0 = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var existingKeys = row0.map(function(h) { return normalizePiketHeaderKey_(h); });
  for (var i = 0; i < headers.length; i++) {
    if (existingKeys.indexOf(headers[i]) === -1) {
      var nextCol = sheet.getLastColumn() + 1;
      sheet.getRange(1, nextCol).setValue(headers[i]).setFontWeight('bold').setBackground('#EDE9FE');
      existingKeys.push(headers[i]);
    }
  }
}

function normalizeAbsensiHeaderKey_(rawHeader) {
  var k = String(rawHeader || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  if (k === 'id' || k === 'id_absensi' || k === 'absensi_id') return 'id_absensi';
  if (k === 'tanggal' || k === 'tgl' || k === 'date' || k === 'tanggal_absen' || k === 'tanggal_absensi' || k === 'tgl_absen' || k === 'hari_tanggal') return 'tanggal';
  if (k === 'id_tahun_ajaran' || k === 'tahun_ajaran_id') return 'id_tahun_ajaran';
  if (k === 'semester' || k === 'smt') return 'semester';
  if (k === 'id_kelas' || k === 'class_id' || k === 'kelas_id') return 'id_kelas';
  if (k === 'nama_kelas' || k === 'kelas' || k === 'rombel' || k === 'rombel_saat_ini') return 'nama_kelas';
  if (k === 'id_siswa' || k === 'siswa_id') return 'id_siswa';
  if (k === 'nama_siswa' || k === 'nama_lengkap' || k === 'nama_lengkap_siswa' || k === 'siswa' || k === 'nama') return 'nama_siswa';
  if (k === 'status' || k === 'status_kehadiran' || k === 'kehadiran' || k === 'status_absen' || k === 'status_absensi') return 'status';
  if (k === 'keterangan' || k === 'catatan' || k === 'ket') return 'keterangan';
  if (k === 'koreksi_catatan' || k === 'catatan_koreksi' || k === 'koreksi') return 'koreksi_catatan';
  if (k === 'diinput_oleh' || k === 'input_by' || k === 'diinput_by' || k === 'input_oleh' || k === 'petugas') return 'diinput_oleh';
  if (k === 'created_at' || k === 'dibuat_pada') return 'created_at';
  if (k === 'updated_at' || k === 'diperbarui_pada') return 'updated_at';
  return k;
}

function ensureAbsensiSheetStructure_(sheet) {
  if (!sheet) return;
  var headers = SHEETS_SCHEMA.ABSENSI;
  if (sheet.getLastRow() === 0 || sheet.getLastColumn() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#EDE9FE');
    sheet.setFrozenRows(1);
    return;
  }
  var lastCol = sheet.getLastColumn();
  var row0 = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var existingKeys = row0.map(function(h) { return normalizeAbsensiHeaderKey_(h); });
  for (var i = 0; i < headers.length; i++) {
    if (existingKeys.indexOf(headers[i]) === -1) {
      var nextCol = sheet.getLastColumn() + 1;
      sheet.getRange(1, nextCol).setValue(headers[i]).setFontWeight('bold').setBackground('#EDE9FE');
      existingKeys.push(headers[i]);
    }
  }
}

function normalizeJurnalHeaderKey_(rawHeader) {
  var k = String(rawHeader || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  if (k === 'id' || k === 'id_jurnal' || k === 'jurnal_id' || k === 'kode_jurnal') return 'id_jurnal';
  if (k === 'tanggal' || k === 'tgl' || k === 'date' || k === 'tanggal_jurnal') return 'tanggal';
  if (k === 'id_guru' || k === 'guru_id') return 'id_guru';
  if (k === 'nama_guru' || k === 'guru' || k === 'pengajar' || k === 'nama_pengajar' || k === 'nama_lengkap_guru') return 'nama_guru';
  if (k === 'id_kelas' || k === 'class_id' || k === 'kelas_id') return 'id_kelas';
  if (k === 'nama_kelas' || k === 'kelas' || k === 'rombel' || k === 'rombel_saat_ini') return 'nama_kelas';
  if (k === 'id_mapel' || k === 'mapel_id' || k === 'id_mata_pelajaran') return 'id_mapel';
  if (k === 'nama_mapel' || k === 'mata_pelajaran' || k === 'mapel' || k === 'mapel_kegiatan') return 'nama_mapel';
  if (k === 'materi' || k === 'materi_pokok') return 'materi';
  if (k === 'tujuan_pembelajaran' || k === 'tujuan') return 'tujuan_pembelajaran';
  if (k === 'aktivitas' || k === 'aktivitas_pembelajaran' || k === 'kegiatan') return 'aktivitas';
  if (k === 'metode' || k === 'metode_pembelajaran') return 'metode';
  if (k === 'refleksi') return 'refleksi';
  if (k === 'tindak_lanjut' || k === 'tl') return 'tindak_lanjut';
  if (k === 'created_at' || k === 'dibuat_pada') return 'created_at';
  if (k === 'updated_at' || k === 'diperbarui_pada') return 'updated_at';
  return k;
}

function ensureJurnalSheetStructure_(sheet) {
  if (!sheet) return;
  var headers = SHEETS_SCHEMA.JURNAL;
  if (sheet.getLastRow() === 0 || sheet.getLastColumn() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#EDE9FE');
    sheet.setFrozenRows(1);
    return;
  }
  var lastCol = sheet.getLastColumn();
  var row0 = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var existingKeys = row0.map(function(h) { return normalizeJurnalHeaderKey_(h); });
  for (var i = 0; i < headers.length; i++) {
    if (existingKeys.indexOf(headers[i]) === -1) {
      var nextCol = sheet.getLastColumn() + 1;
      sheet.getRange(1, nextCol).setValue(headers[i]).setFontWeight('bold').setBackground('#EDE9FE');
      existingKeys.push(headers[i]);
    }
  }
}

/**
 * Memastikan header sheet USERS lengkap (termasuk kolom `username` dan `password`)
 * serta memformat kedua kolom tersebut sebagai Teks Biasa (@) agar password terlihat apa adanya.
 */
function ensureUsersSheetStructure_(sheet) {
  if (!sheet) return;
  var headers = SHEETS_SCHEMA.USERS;
  if (sheet.getLastRow() === 0 || sheet.getLastColumn() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#EDE9FE');
    sheet.setFrozenRows(1);
  } else {
    var lastCol = sheet.getLastColumn();
    var row0 = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    for (var c = 0; c < row0.length; c++) {
      var raw = String(row0[c] || '').trim();
      var normalized = normalizeUsersHeaderKey_(raw);
      if (normalized && raw !== normalized && (normalized === 'username' || normalized === 'password')) {
        sheet.getRange(1, c + 1).setValue(normalized).setFontWeight('bold').setBackground('#EDE9FE');
      }
    }
    for (var i = 0; i < headers.length; i++) {
      ensureColumnHeader_(sheet, headers[i], '#EDE9FE', '#000000', false);
    }
  }

  var finalLastCol = sheet.getLastColumn();
  if (finalLastCol >= 1) {
    var finalRow0 = sheet.getRange(1, 1, 1, finalLastCol).getValues()[0];
    var maxRows = Math.max(sheet.getMaxRows(), 2);
    for (var col = 0; col < finalRow0.length; col++) {
      var key = normalizeUsersHeaderKey_(finalRow0[col]);
      if (key === 'username' || key === 'password') {
        sheet.getRange(1, col + 1, maxRows, 1).setNumberFormat('@');
      }
    }
  }
}

function formatSiswaSheet_(sheet) {
  var totalCols = SISWA_ROW1_HEADERS.length;
  // Lepas baris/kolom beku lebih dulu agar merge header 2 baris tidak error
  if (sheet.getFrozenRows() > 0) sheet.setFrozenRows(0);
  if (sheet.getFrozenColumns() > 0) sheet.setFrozenColumns(0);
  if (sheet.getMaxRows() < 2) {
    sheet.insertRowsAfter(sheet.getMaxRows(), 2 - sheet.getMaxRows());
  }
  if (sheet.getMaxColumns() < totalCols) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), totalCols - sheet.getMaxColumns());
  }
  SpreadsheetApp.flush();

  sheet.getRange(1, 1, 2, totalCols).breakApart();
  sheet.getRange(1, 1, 2, totalCols).setValues([SISWA_ROW1_HEADERS, SISWA_ROW2_HEADERS]);

  // Merge group headers Data Ayah (25..30), Data Ibu (31..36), Data Wali (37..42)
  sheet.getRange(1, 25, 1, 6).merge();
  sheet.getRange(1, 31, 1, 6).merge();
  sheet.getRange(1, 37, 1, 6).merge();

  // Merge single columns vertically across row 1..2
  for (var c = 1; c <= totalCols; c++) {
    if (c >= 25 && c <= 42) continue;
    sheet.getRange(1, c, 2, 1).merge();
  }

  var headerRange = sheet.getRange(1, 1, 2, totalCols);
  headerRange
    .setFontWeight('bold')
    .setBackground('#EDE9FE')
    .setFontColor('#1E1B4B')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');
  sheet.setFrozenRows(2);
}

function formatGuruSheet_(sheet) {
  var totalCols = GURU_DISPLAY_HEADERS.length;
  if (sheet.getFrozenRows() > 0) sheet.setFrozenRows(0);
  if (sheet.getFrozenColumns() > 0) sheet.setFrozenColumns(0);
  if (sheet.getMaxColumns() < totalCols) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), totalCols - sheet.getMaxColumns());
  }
  SpreadsheetApp.flush();

  sheet.getRange(1, 1, 1, totalCols).breakApart();
  sheet.getRange(1, 1, 1, totalCols).setValues([GURU_DISPLAY_HEADERS]);
  sheet.getRange(1, 1, 1, totalCols)
    .setFontWeight('bold')
    .setBackground('#EDE9FE')
    .setFontColor('#1E1B4B')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');
  sheet.setFrozenRows(1);
}

/**
 * Mengambil Spreadsheet aktif (atau berdasarkan SPREADSHEET_ID pada ScriptProperties jika standalone)
 */
function getSpreadsheet_() {
  var props = PropertiesService.getScriptProperties();
  var ssId = props.getProperty('SPREADSHEET_ID');
  if (ssId) {
    return SpreadsheetApp.openById(ssId);
  }
  var active = SpreadsheetApp.getActiveSpreadsheet();
  if (!active) {
    throw new Error('Spreadsheet tidak ditemukan. Bind script ke Google Spreadsheet atau set SPREADSHEET_ID pada Script Properties.');
  }
  return active;
}

/**
 * Memperbarui baris tertentu di sheet USERS berdasarkan nomor baris sheet (1-indexed),
 * sehingga baris yang memiliki kolom `id_user` atau `password` kosong tetap bisa diperbaiki di tempat.
 */
function updateUsersSheetRowAt_(sheet, rowNumber, fields, updates) {
  var existingValues = sheet.getRange(rowNumber, 1, 1, fields.length).getValues()[0];
  var updatedRow = fields.map(function(h, idx) {
    var nextVal = updates[h] !== undefined ? updates[h] : (idx < existingValues.length ? existingValues[idx] : '');
    if (h === 'username' || h === 'password') {
      return String(nextVal !== undefined && nextVal !== null ? nextVal : '');
    }
    return nextVal;
  });
  var rowRange = sheet.getRange(rowNumber, 1, 1, fields.length);
  for (var col = 0; col < fields.length; col++) {
    if (fields[col] === 'username' || fields[col] === 'password') {
      sheet.getRange(rowNumber, col + 1).setNumberFormat('@');
    }
  }
  rowRange.setValues([updatedRow]);
  var resultObj = {};
  fields.forEach(function(h, idx) { resultObj[h] = updatedRow[idx]; });
  return resultObj;
}

/**
 * Memastikan minimal ada 1 akun ADMIN aktif dengan password plain-text terlihat di sheet USERS.
 * Jika ada baris `admin` yang kolom `password` / `id_user`-nya masih kosong, perbaiki di tempat.
 */
function ensureDefaultAdmin_() {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName('USERS');
  if (!sheet) return null;
  ensureUsersSheetStructure_(sheet);

  var data = sheet.getDataRange().getValues();
  var layout = resolveSheetLayout_('USERS', data);
  var fields = layout.fields;
  var startRow = layout.dataStartRow;

  var usernameCol = fields.indexOf('username');
  var passwordCol = fields.indexOf('password');
  var roleCol = fields.indexOf('role');
  var statusCol = fields.indexOf('status');
  var idCol = fields.indexOf('id_user');

  var hasValidActiveAdmin = false;
  var brokenAdminRow = -1;
  var brokenAdminData = {};

  for (var r = startRow; r < data.length; r++) {
    var row = data[r];
    var uname = usernameCol >= 0 ? String(row[usernameCol] || '').trim() : '';
    var pwd = passwordCol >= 0 && row[passwordCol] !== undefined && row[passwordCol] !== null ? String(row[passwordCol]).trim() : '';
    var role = roleCol >= 0 ? String(row[roleCol] || '').trim().toUpperCase() : '';
    var status = statusCol >= 0 ? String(row[statusCol] || 'Aktif').trim().toLowerCase() : 'aktif';
    var uid = idCol >= 0 ? String(row[idCol] || '').trim() : '';

    if (role === 'ADMIN' && status === 'aktif' && uname !== '' && pwd !== '') {
      hasValidActiveAdmin = true;
    }
    if (uname.toLowerCase() === DEFAULT_ADMIN_CONFIG.username.toLowerCase() && (pwd === '' || uid === '' || role !== 'ADMIN' || status !== 'aktif')) {
      if (brokenAdminRow === -1) {
        brokenAdminRow = r + 1;
        fields.forEach(function(f, idx) { brokenAdminData[f] = idx < row.length ? row[idx] : ''; });
      }
    }
  }

  var now = nowIso_();
  if (brokenAdminRow !== -1) {
    var repaired = updateUsersSheetRowAt_(sheet, brokenAdminRow, fields, {
      id_user: String(brokenAdminData.id_user || '').trim() || generateId_('USR'),
      username: DEFAULT_ADMIN_CONFIG.username,
      password: String(brokenAdminData.password !== undefined && brokenAdminData.password !== null ? brokenAdminData.password : '').trim() || DEFAULT_ADMIN_CONFIG.password,
      nama_lengkap: String(brokenAdminData.nama_lengkap || '').trim() || DEFAULT_ADMIN_CONFIG.nama_lengkap,
      role: 'ADMIN',
      relasi_nama: String(brokenAdminData.relasi_nama || '').trim() || 'Administrator Sekolah',
      status: 'Aktif',
      created_at: brokenAdminData.created_at || now,
      updated_at: now
    });
    SpreadsheetApp.flush();
    return serializeUserForAdmin_(repaired);
  }

  if (hasValidActiveAdmin) {
    return null;
  }

  var defaultAdmin = {
    id_user: generateId_('USR'),
    username: DEFAULT_ADMIN_CONFIG.username,
    password: DEFAULT_ADMIN_CONFIG.password,
    nama_lengkap: DEFAULT_ADMIN_CONFIG.nama_lengkap,
    role: 'ADMIN',
    relasi_id: '',
    relasi_nama: 'Administrator Sekolah',
    status: 'Aktif',
    foto_url: '',
    created_at: now,
    updated_at: now
  };
  insertRow_('USERS', defaultAdmin);
  SpreadsheetApp.flush();
  return serializeUserForAdmin_(defaultAdmin);
}

/**
 * Fungsi khusus untuk dijalankan manual dari Editor Google Apps Script
 * (Pilih fungsi "buatAkunAdmin" -> klik Run) guna membuat atau mereset
 * akun Administrator default (username: admin, password: admin123).
 */
function buatAkunAdmin() {
  setupDatabase(true, true);
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName('USERS');
  ensureUsersSheetStructure_(sheet);

  var data = sheet.getDataRange().getValues();
  var layout = resolveSheetLayout_('USERS', data);
  var fields = layout.fields;
  var startRow = layout.dataStartRow;
  var usernameCol = fields.indexOf('username');

  var targetRowNum = -1;
  var existingObj = {};
  for (var r = startRow; r < data.length; r++) {
    var uname = usernameCol >= 0 ? String(data[r][usernameCol] || '').trim() : '';
    if (uname.toLowerCase() === DEFAULT_ADMIN_CONFIG.username.toLowerCase()) {
      targetRowNum = r + 1;
      fields.forEach(function(f, idx) { existingObj[f] = idx < data[r].length ? data[r][idx] : ''; });
      break;
    }
  }

  var now = nowIso_();
  if (targetRowNum !== -1) {
    var updated = updateUsersSheetRowAt_(sheet, targetRowNum, fields, {
      id_user: String(existingObj.id_user || '').trim() || generateId_('USR'),
      username: DEFAULT_ADMIN_CONFIG.username,
      password: DEFAULT_ADMIN_CONFIG.password,
      nama_lengkap: String(existingObj.nama_lengkap || '').trim() || DEFAULT_ADMIN_CONFIG.nama_lengkap,
      role: 'ADMIN',
      relasi_nama: String(existingObj.relasi_nama || '').trim() || 'Administrator Sekolah',
      status: 'Aktif',
      created_at: existingObj.created_at || now,
      updated_at: now
    });
    SpreadsheetApp.flush();
    Logger.log('Akun ADMIN berhasil diperbarui/diaktifkan di sheet USERS. Username: ' + DEFAULT_ADMIN_CONFIG.username + ' | Password: ' + DEFAULT_ADMIN_CONFIG.password);
    return serializeUserForAdmin_(updated);
  }

  var newAdmin = {
    id_user: generateId_('USR'),
    username: DEFAULT_ADMIN_CONFIG.username,
    password: DEFAULT_ADMIN_CONFIG.password,
    nama_lengkap: DEFAULT_ADMIN_CONFIG.nama_lengkap,
    role: 'ADMIN',
    relasi_id: '',
    relasi_nama: 'Administrator Sekolah',
    status: 'Aktif',
    foto_url: '',
    created_at: now,
    updated_at: now
  };
  insertRow_('USERS', newAdmin);
  SpreadsheetApp.flush();
  Logger.log('Akun ADMIN berhasil dibuat di sheet USERS. Username: ' + DEFAULT_ADMIN_CONFIG.username + ' | Password: ' + DEFAULT_ADMIN_CONFIG.password);
  return serializeUserForAdmin_(newAdmin);
}

/**
 * Fungsi manual di Editor Google Apps Script untuk menghubungkan & menyelaraskan
 * seluruh ID relasi di seluruh 21 sheet berdasarkan data dokumen yang sudah ada.
 */
function sinkronkanSeluruhId() {
  setupDatabase(true, true);
  var report = syncAllRelatedIds_(null, true);
  Logger.log('Hasil sinkronisasi ID: ' + JSON.stringify(report));
  return report;
}

/**
 * Fungsi manual di Editor Google Apps Script untuk mengurutkan ulang Class ID
 * (KLS-001, KLS-002, ...) sesuai urutan Nama Kelas dan memperbarui seluruh sheet terkait.
 */
function urutkanClassId() {
  setupDatabase(true, true);
  var report = reorderClassIdsByName_(null, true);
  SpreadsheetApp.flush();
  Logger.log('Hasil pengurutan Class ID: ' + JSON.stringify(report));
  return report;
}

/**
 * HTTP GET Handler (Health check & ping)
 */
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'ping';
  if (action === 'ping') {
    return jsonResponse_(true, 'Koneksi Google Apps Script KELASKU SMART aktif.', {
      status: 'connected',
      timestamp: nowIso_()
    });
  }
  return jsonResponse_(false, 'Gunakan metode POST untuk memanggil API.', null, 'METHOD_NOT_ALLOWED');
}

/**
 * HTTP POST Handler (Router utama API)
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse_(false, 'Payload permintaan kosong.', null, 'BAD_REQUEST');
    }
    var req = JSON.parse(e.postData.contents);
    var action = req.action || '';
    var payload = req.payload || {};
    var token = req.token || '';

    // Endpoint publik sebelum login
    if (action === 'ping') {
      var ssPing = getSpreadsheet_();
      var usersSheetPing = ssPing.getSheetByName('USERS');
      if (!usersSheetPing) {
        setupDatabase();
      }
      var usersList = readSheetObjects_('USERS');
      var userCount = usersList.length;
      var usernames = usersList
        .map(function(u) { return String(u.username || '').trim(); })
        .filter(function(u) { return !!u; });
      var schoolInfo = getSchoolSettingsData_();
      return jsonResponse_(true, 'Terhubung ke Google Spreadsheet.', {
        status: 'connected',
        needs_initial_admin: userCount === 0,
        user_count: userCount,
        usernames: usernames,
        gas_version: '2026-admin-v4',
        nama_sekolah: String(schoolInfo.nama_sekolah || '').trim(),
        timestamp: nowIso_()
      });
    }

    if (action === 'setupDatabase') {
      var setupRes = setupDatabase();
      var countUsers = readSheetObjects_('USERS').length;
      setupRes.needs_initial_admin = countUsers === 0;
      return jsonResponse_(true, 'Struktur database Google Sheets berhasil diinisialisasi.', setupRes);
    }

    if (action === 'checkInitialSetup') {
      setupDatabase(true);
      var existingUsers = readSheetObjects_('USERS');
      return jsonResponse_(true, 'Status inisialisasi berhasil diperiksa.', {
        needs_initial_admin: existingUsers.length === 0
      });
    }

    if (action === 'createInitialAdmin') {
      setupDatabase(true);
      var currentUsers = readSheetObjects_('USERS');
      if (currentUsers.length > 0) {
        return jsonResponse_(false, 'Akun administrator awal sudah terdaftar. Silakan login.', null, 'ALREADY_INITIALIZED');
      }
      var adminUsername = String(payload.username || '').trim();
      var adminPassword = String(payload.password || '');
      var adminName = String(payload.nama_lengkap || '').trim();
      if (!adminUsername || !adminPassword || !adminName) {
        return jsonResponse_(false, 'Username, password, dan nama lengkap wajib diisi.', null, 'VALIDATION_ERROR');
      }
      var now = nowIso_();
      var newAdmin = {
        id_user: generateId_('USR'),
        username: adminUsername,
        password: adminPassword,
        nama_lengkap: adminName,
        role: 'ADMIN',
        relasi_id: '',
        relasi_nama: 'Administrator Sekolah',
        status: 'Aktif',
        foto_url: String(payload.foto_url || ''),
        created_at: now,
        updated_at: now
      };
      insertRow_('USERS', newAdmin);
      return jsonResponse_(true, 'Akun administrator awal berhasil dibuat.', sanitizeUser_(newAdmin));
    }

    if (action === 'loginUser') {
      return handleLogin_(payload);
    }

    if (action === 'logoutUser') {
      return handleLogout_(token);
    }

    // Semua endpoint di bawah ini WAJIB memiliki session valid
    var sessionUser = verifySessionToken_(token);
    if (!sessionUser) {
      return jsonResponse_(false, 'Sesi tidak valid atau telah berakhir. Silakan masuk kembali.', null, 'UNAUTHORIZED');
    }

    if (action === 'verifySession') {
      var freshUsers = readSheetObjects_('USERS');
      var freshMatch = null;
      for (var fu = 0; fu < freshUsers.length; fu++) {
        var sameId = sessionUser.id_user && freshUsers[fu].id_user === sessionUser.id_user;
        var sameUname = sessionUser.username && String(freshUsers[fu].username || '').trim().toLowerCase() === String(sessionUser.username).trim().toLowerCase();
        if (sameId || sameUname) {
          freshMatch = freshUsers[fu];
          break;
        }
      }
      return jsonResponse_(true, 'Sesi valid.', {
        user: freshMatch ? sanitizeUser_(freshMatch) : sanitizeUser_(sessionUser)
      });
    }

    return routeAuthenticatedAction_(action, payload, sessionUser, token);
  } catch (err) {
    return jsonResponse_(false, 'Terjadi kesalahan server: ' + err.message, null, 'SERVER_ERROR');
  }
}

function routeAuthenticatedAction_(action, payload, user, token) {
  switch (action) {
    // Sekolah & Tahun Ajaran
    case 'getSchoolSettings':
      return jsonResponse_(true, 'Identitas sekolah dimuat.', getSchoolSettingsData_());
    case 'updateSchoolSettings':
      requireRole_(user, ['ADMIN']);
      return updateSchoolSettings_(payload, user);
    case 'getAcademicYears':
      return jsonResponse_(true, 'Tahun ajaran dimuat.', readSheetObjects_('TAHUN_AJARAN'));
    case 'createAcademicYear':
      requireRole_(user, ['ADMIN']);
      return createAcademicYear_(payload, user);
    case 'updateAcademicYear':
      requireRole_(user, ['ADMIN']);
      return updateAcademicYear_(payload, user);
    case 'setActiveAcademicYear':
      requireRole_(user, ['ADMIN']);
      return setActiveAcademicYear_(payload, user);
    case 'deleteAcademicYear':
      requireRole_(user, ['ADMIN']);
      return deleteAcademicYear_(payload, user);

    // Dashboard
    case 'getDashboard':
      return jsonResponse_(true, 'Dashboard dimuat.', buildDashboard_(user, payload));

    // Siswa
    case 'getStudents':
      return jsonResponse_(true, 'Data siswa dimuat.', getScopedStudents_(user));
    case 'createStudent':
      requireRole_(user, ['ADMIN', 'GURU']);
      return createStudent_(payload, user);
    case 'updateStudent':
      requireRole_(user, ['ADMIN', 'GURU']);
      return updateStudent_(payload, user);
    case 'deleteStudent':
      requireRole_(user, ['ADMIN']);
      var delStuRes = deleteById_('SISWA', 'id_siswa', payload.id_siswa, user, 'Hapus Siswa');
      deleteUsersByRelasiId_(payload.id_siswa, ['ORANG_TUA']);
      return delStuRes;
    case 'importStudents':
      requireRole_(user, ['ADMIN']);
      return importStudents_(payload, user);

    // Guru
    case 'getTeachers':
      requireRole_(user, ['ADMIN', 'KEPALA_SEKOLAH', 'GURU']);
      return jsonResponse_(true, 'Data guru dimuat.', readSheetObjects_('GURU'));
    case 'createTeacher':
      requireRole_(user, ['ADMIN']);
      return createTeacher_(payload, user);
    case 'updateTeacher':
      requireRole_(user, ['ADMIN']);
      return updateTeacher_(payload, user);
    case 'deleteTeacher':
      requireRole_(user, ['ADMIN']);
      var delTchRes = deleteById_('GURU', 'id_guru', payload.id_guru, user, 'Hapus Guru');
      deleteUsersByRelasiId_(payload.id_guru, ['GURU', 'KEPALA_SEKOLAH']);
      patchSheetColumns_('KELAS', function(cRow) {
        if (cRow.wali_kelas_id === payload.id_guru) {
          return { wali_kelas_id: '', wali_kelas: '' };
        }
        return null;
      });
      return delTchRes;
    case 'importTeachers':
      requireRole_(user, ['ADMIN']);
      return importTeachers_(payload, user);

    // Kelas
    case 'getClasses':
      return jsonResponse_(true, 'Data kelas dimuat.', getClassesWithCount_(user));
    case 'createClass':
      requireRole_(user, ['ADMIN']);
      return createClass_(payload, user);
    case 'updateClass':
      requireRole_(user, ['ADMIN']);
      return updateClass_(payload, user);
    case 'deleteClass':
      requireRole_(user, ['ADMIN']);
      return deleteClass_(payload, user);
    case 'reorderClassIds':
      requireRole_(user, ['ADMIN']);
      return reorderClassIdsAction_(user);

    // Mapel
    case 'getSubjects':
      return jsonResponse_(true, 'Data mata pelajaran dimuat.', ensureMapelIdsAndGet_());
    case 'createSubject':
      requireRole_(user, ['ADMIN']);
      return createSubject_(payload, user);
    case 'updateSubject':
      requireRole_(user, ['ADMIN']);
      return updateSubject_(payload, user);
    case 'deleteSubject':
      requireRole_(user, ['ADMIN']);
      return deleteSubject_(payload, user);

    // Jadwal & Piket
    case 'getSchedules':
      return jsonResponse_(true, 'Jadwal dimuat.', getScopedSchedules_(user));
    case 'createSchedule':
      requireRole_(user, ['ADMIN']);
      return createSchedule_(payload, user);
    case 'updateSchedule':
      requireRole_(user, ['ADMIN']);
      return updateSchedule_(payload, user);
    case 'deleteSchedule':
      requireRole_(user, ['ADMIN']);
      return deleteById_('JADWAL', 'id_jadwal', payload.id_jadwal, user, 'Hapus Jadwal');

    case 'getPickets':
      requireRole_(user, ['ADMIN', 'KEPALA_SEKOLAH', 'GURU']);
      return jsonResponse_(true, 'Jadwal piket dimuat.', getScopedPickets_(user));
    case 'createPicket':
      requireRole_(user, ['ADMIN', 'GURU']);
      return createPicket_(payload, user);
    case 'updatePicket':
      requireRole_(user, ['ADMIN', 'GURU']);
      return updatePicket_(payload, user);
    case 'deletePicket':
      requireRole_(user, ['ADMIN', 'GURU']);
      return deleteById_('PIKET', 'id_piket', payload.id_piket, user, 'Hapus Piket');

    // Absensi
    case 'getAttendance':
      return jsonResponse_(true, 'Data absensi dimuat.', getScopedAttendance_(user));
    case 'saveAttendance':
      requireRole_(user, ['ADMIN', 'GURU']);
      return saveAttendanceBatch_(payload, user);

    // Nilai
    case 'getGrades':
      return jsonResponse_(true, 'Data nilai dimuat.', getScopedByStudentOrClass_('NILAI', user));
    case 'saveGrades':
      requireRole_(user, ['ADMIN', 'GURU']);
      return saveGradesBatch_(payload, user);
    case 'getGradeRecap':
      return jsonResponse_(true, 'Rekap nilai dimuat.', getScopedByStudentOrClass_('NILAI', user));

    // Jurnal
    case 'getJournals':
      requireRole_(user, ['ADMIN', 'KEPALA_SEKOLAH', 'GURU']);
      return jsonResponse_(true, 'Jurnal guru dimuat.', getScopedJournals_(user));
    case 'createJournal':
      requireRole_(user, ['ADMIN', 'GURU']);
      return createJournal_(payload, user);
    case 'updateJournal':
      requireRole_(user, ['ADMIN', 'GURU']);
      return updateJournal_(payload, user);
    case 'deleteJournal':
      requireRole_(user, ['ADMIN', 'GURU']);
      return deleteJournal_(payload, user);

    // Karakter
    case 'getCharacters':
      return jsonResponse_(true, 'Data karakter dimuat.', getScopedByStudentOrClass_('KARAKTER', user));
    case 'createCharacter':
      requireRole_(user, ['ADMIN', 'GURU']);
      return createGeneric_('KARAKTER', 'id_karakter', 'KRK', payload, user, 'Tambah Karakter');
    case 'updateCharacter':
      requireRole_(user, ['ADMIN', 'GURU']);
      return updateGeneric_('KARAKTER', 'id_karakter', payload, user, 'Edit Karakter');
    case 'deleteCharacter':
      requireRole_(user, ['ADMIN', 'GURU']);
      return deleteById_('KARAKTER', 'id_karakter', payload.id_karakter, user, 'Hapus Karakter');

    // Kesehatan & Bimbingan (terbatas pengguna berwenang)
    case 'getHealthRecords':
      requireRole_(user, ['ADMIN', 'KEPALA_SEKOLAH', 'GURU']);
      return jsonResponse_(true, 'Data kesehatan dimuat.', getScopedByStudentOrClass_('KESEHATAN', user));
    case 'createHealthRecord':
      requireRole_(user, ['ADMIN', 'GURU']);
      return createGeneric_('KESEHATAN', 'id_kesehatan', 'KES', payload, user, 'Tambah Kesehatan');
    case 'updateHealthRecord':
      requireRole_(user, ['ADMIN', 'GURU']);
      return updateGeneric_('KESEHATAN', 'id_kesehatan', payload, user, 'Edit Kesehatan');
    case 'deleteHealthRecord':
      requireRole_(user, ['ADMIN']);
      return deleteById_('KESEHATAN', 'id_kesehatan', payload.id_kesehatan, user, 'Hapus Kesehatan');

    case 'getCounselingRecords':
      requireRole_(user, ['ADMIN', 'KEPALA_SEKOLAH', 'GURU']);
      return jsonResponse_(true, 'Data bimbingan dimuat.', getScopedByStudentOrClass_('BIMBINGAN', user));
    case 'createCounselingRecord':
      requireRole_(user, ['ADMIN', 'GURU']);
      return createGeneric_('BIMBINGAN', 'id_bimbingan', 'BK', payload, user, 'Tambah Bimbingan');
    case 'updateCounselingRecord':
      requireRole_(user, ['ADMIN', 'GURU']);
      return updateGeneric_('BIMBINGAN', 'id_bimbingan', payload, user, 'Edit Bimbingan');
    case 'deleteCounselingRecord':
      requireRole_(user, ['ADMIN']);
      return deleteById_('BIMBINGAN', 'id_bimbingan', payload.id_bimbingan, user, 'Hapus Bimbingan');

    // Prestasi & Agenda
    case 'getAchievements':
      return jsonResponse_(true, 'Data prestasi dimuat.', getScopedByStudentOrClass_('PRESTASI', user));
    case 'createAchievement':
      requireRole_(user, ['ADMIN', 'GURU']);
      return createGeneric_('PRESTASI', 'id_prestasi', 'PRS', payload, user, 'Tambah Prestasi');
    case 'updateAchievement':
      requireRole_(user, ['ADMIN', 'GURU']);
      return updateGeneric_('PRESTASI', 'id_prestasi', payload, user, 'Edit Prestasi');
    case 'deleteAchievement':
      requireRole_(user, ['ADMIN', 'GURU']);
      return deleteById_('PRESTASI', 'id_prestasi', payload.id_prestasi, user, 'Hapus Prestasi');

    case 'getAgendas':
      return jsonResponse_(true, 'Agenda sekolah dimuat.', getScopedAgendas_(user));
    case 'createAgenda':
      requireRole_(user, ['ADMIN', 'KEPALA_SEKOLAH', 'GURU']);
      return createGeneric_('AGENDA', 'id_agenda', 'AGD', payload, user, 'Tambah Agenda');
    case 'updateAgenda':
      requireRole_(user, ['ADMIN', 'KEPALA_SEKOLAH', 'GURU']);
      return updateGeneric_('AGENDA', 'id_agenda', payload, user, 'Edit Agenda');
    case 'deleteAgenda':
      requireRole_(user, ['ADMIN', 'KEPALA_SEKOLAH']);
      return deleteById_('AGENDA', 'id_agenda', payload.id_agenda, user, 'Hapus Agenda');

    // Buku Penghubung
    case 'getLiaisonMessages':
      return jsonResponse_(true, 'Buku penghubung dimuat.', getScopedByStudentOrClass_('PENGHUBUNG', user));
    case 'createLiaisonMessage':
      return createLiaisonMessage_(payload, user);
    case 'confirmLiaisonMessage':
      return confirmLiaisonMessage_(payload, user);
    case 'deleteLiaisonMessage':
      requireRole_(user, ['ADMIN']);
      return deleteById_('PENGHUBUNG', 'id_penghubung', payload.id_penghubung, user, 'Hapus Pesan Penghubung');

    // Inventaris & Dokumentasi
    case 'getInventory':
      requireRole_(user, ['ADMIN', 'KEPALA_SEKOLAH', 'GURU']);
      return jsonResponse_(true, 'Data inventaris dimuat.', readSheetObjects_('INVENTARIS'));
    case 'createInventory':
      requireRole_(user, ['ADMIN']);
      return createGeneric_('INVENTARIS', 'id_inventaris', 'INV', payload, user, 'Tambah Inventaris');
    case 'updateInventory':
      requireRole_(user, ['ADMIN']);
      return updateGeneric_('INVENTARIS', 'id_inventaris', payload, user, 'Edit Inventaris');
    case 'deleteInventory':
      requireRole_(user, ['ADMIN']);
      return deleteById_('INVENTARIS', 'id_inventaris', payload.id_inventaris, user, 'Hapus Inventaris');

    case 'getDocumentation':
      requireRole_(user, ['ADMIN', 'KEPALA_SEKOLAH', 'GURU']);
      return jsonResponse_(true, 'Dokumentasi dimuat.', readSheetObjects_('DOKUMENTASI'));
    case 'createDocumentation':
      requireRole_(user, ['ADMIN', 'KEPALA_SEKOLAH', 'GURU']);
      return createGeneric_('DOKUMENTASI', 'id_dokumentasi', 'DOK', payload, user, 'Tambah Dokumentasi');
    case 'updateDocumentation':
      requireRole_(user, ['ADMIN', 'KEPALA_SEKOLAH', 'GURU']);
      return updateGeneric_('DOKUMENTASI', 'id_dokumentasi', payload, user, 'Edit Dokumentasi');
    case 'deleteDocumentation':
      requireRole_(user, ['ADMIN']);
      return deleteById_('DOKUMENTASI', 'id_dokumentasi', payload.id_dokumentasi, user, 'Hapus Dokumentasi');

    // Manajemen Pengguna & Profil Pribadi
    case 'updateOwnProfile':
      return updateOwnProfile_(payload, user, token);
    case 'getUsers':
      requireRole_(user, ['ADMIN']);
      syncUsersFromMasterData_();
      var users = readSheetObjects_('USERS').map(serializeUserForAdmin_);
      return jsonResponse_(true, 'Data pengguna dimuat.', users);
    case 'createUser':
      requireRole_(user, ['ADMIN']);
      return createUser_(payload, user);
    case 'updateUser':
      requireRole_(user, ['ADMIN']);
      return updateUser_(payload, user);
    case 'deleteUser':
      requireRole_(user, ['ADMIN']);
      return deleteById_('USERS', 'id_user', payload.id_user, user, 'Hapus Pengguna');

    // Laporan, Log & Backup
    case 'getReports':
      requireRole_(user, ['ADMIN', 'KEPALA_SEKOLAH', 'GURU']);
      return jsonResponse_(true, 'Data laporan dimuat.', buildReports_(user));
    case 'getLogs':
      requireRole_(user, ['ADMIN', 'KEPALA_SEKOLAH']);
      return jsonResponse_(true, 'Log aktivitas dimuat.', readSheetObjects_('LOG_AKTIVITAS'));
    case 'exportAllData':
      requireRole_(user, ['ADMIN']);
      return exportAllSafeData_(user);
    case 'syncAllIds':
      requireRole_(user, ['ADMIN']);
      return syncAllIdsAction_(user);

    default:
      return jsonResponse_(false, 'Aksi API tidak dikenali: ' + action, null, 'UNKNOWN_ACTION');
  }
}

// ============================================================================
// AUTENTIKASI & SESSION
// ============================================================================

function handleLogin_(payload) {
  var username = String(payload.username || '').trim();
  var password = String(payload.password || '').trim();

  if (!username || !password) {
    return jsonResponse_(false, 'Username dan password wajib diisi.', null, 'VALIDATION_ERROR');
  }

  var users = readSheetObjects_('USERS');
  var matches = [];
  for (var i = 0; i < users.length; i++) {
    if (String(users[i].username || '').trim().toLowerCase() === username.toLowerCase()) {
      matches.push(users[i]);
    }
  }

  if (matches.length === 0) {
    var autoSync = syncUsersFromMasterData_({ users: users });
    if (autoSync.total > 0) {
      users = readSheetObjects_('USERS');
      for (var j = 0; j < users.length; j++) {
        if (String(users[j].username || '').trim().toLowerCase() === username.toLowerCase()) {
          matches.push(users[j]);
        }
      }
    }
  }

  if (matches.length === 0) {
    var availableNames = users
      .map(function(u) { return String(u.username || '').trim(); })
      .filter(function(u) { return !!u; })
      .join(', ');
    return jsonResponse_(
      false,
      'Username "' + username + '" tidak ditemukan di sheet USERS (terdaftar: ' + (availableNames || 'kosong') + ').',
      null,
      'INVALID_CREDENTIALS'
    );
  }

  var found = null;
  for (var m = 0; m < matches.length; m++) {
    var candPwd = (matches[m].password !== undefined && matches[m].password !== null)
      ? String(matches[m].password).trim()
      : '';
    if (candPwd === password) {
      found = matches[m];
      break;
    }
  }

  if (!found) {
    return jsonResponse_(
      false,
      'Password untuk akun "' + matches[0].username + '" tidak sesuai dengan isi sheet USERS. Periksa kolom password di Google Sheets atau jalankan buatAkunAdmin() di Apps Script.',
      null,
      'INVALID_CREDENTIALS'
    );
  }

  var statusVal = String(found.status || 'Aktif').trim().toLowerCase();
  if (statusVal !== 'aktif') {
    return jsonResponse_(false, 'Akun pengguna sedang dinonaktifkan. Hubungi Administrator.', null, 'ACCOUNT_INACTIVE');
  }

  if (!found.id_user) {
    found.id_user = generateId_('USR');
  }

  if (String(found.role || '').trim().toUpperCase() === 'GURU') {
    var linkedTch = findTeacherRecordForUser_(found);
    if (linkedTch && isKepalaSekolahTeacher_(linkedTch)) {
      found.role = 'KEPALA_SEKOLAH';
      found.relasi_id = linkedTch.id_guru || found.relasi_id || '';
      found.relasi_nama = linkedTch.nama_guru || found.relasi_nama || '';
      found.updated_at = nowIso_();
      try {
        updateRowById_('USERS', 'id_user', found.id_user, found);
      } catch (syncRoleErr) {}
    }
  }

  var token = Utilities.getUuid();
  var expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
  var sessionObj = {
    user: sanitizeUser_(found),
    expires_at: expiresAt
  };

  CacheService.getScriptCache().put('SESSION_' + token, JSON.stringify(sessionObj), 21600);
  writeLog_(found, 'LOGIN', 'AUTENTIKASI', 'Pengguna berhasil masuk');

  return jsonResponse_(true, 'Login berhasil.', {
    token: token,
    user: sanitizeUser_(found),
    expires_at: expiresAt
  });
}

function handleLogout_(token) {
  if (token) {
    var user = verifySessionToken_(token);
    if (user) {
      writeLog_(user, 'LOGOUT', 'AUTENTIKASI', 'Pengguna keluar dari sistem');
    }
    CacheService.getScriptCache().remove('SESSION_' + token);
  }
  return jsonResponse_(true, 'Logout berhasil.', null);
}

function verifySessionToken_(token) {
  if (!token) return null;
  var raw = CacheService.getScriptCache().get('SESSION_' + token);
  if (!raw) return null;
  try {
    var parsed = JSON.parse(raw);
    if (!parsed || !parsed.user) return null;
    if (new Date(parsed.expires_at).getTime() < Date.now()) {
      CacheService.getScriptCache().remove('SESSION_' + token);
      return null;
    }
    return parsed.user;
  } catch (e) {
    return null;
  }
}

function sanitizeUser_(u) {
  var uname = String(u.username || '').trim();
  var rawRole = String(u.role || '').trim().toUpperCase();
  var resolvedRole = rawRole || (uname.toLowerCase() === 'admin' ? 'ADMIN' : 'GURU');
  return {
    id_user: u.id_user || '',
    username: uname,
    nama_lengkap: String(u.nama_lengkap || '').trim() || uname,
    role: resolvedRole,
    relasi_id: u.relasi_id || '',
    relasi_nama: u.relasi_nama || '',
    status: String(u.status || '').trim() || 'Aktif',
    foto_url: u.foto_url || '',
    created_at: u.created_at || '',
    updated_at: u.updated_at || ''
  };
}

function serializeUserForAdmin_(u) {
  var base = sanitizeUser_(u);
  base.password = (u.password !== undefined && u.password !== null) ? String(u.password) : '';
  return base;
}

function requireRole_(user, allowedRoles) {
  if (allowedRoles.indexOf(user.role) === -1) {
    throw new Error('Akses ditolak. Role Anda (' + user.role + ') tidak memiliki izin untuk aksi ini.');
  }
}

// ============================================================================
// HAK AKSES DATA (BACKEND SCOPING)
// ============================================================================

function isPaiOrPjokTeacher_(teacher) {
  if (!teacher) return false;
  var str = ((teacher.mata_pelajaran || '') + ' ' + (teacher.jabatan || '')).toLowerCase();
  return /pai\b|pendidikan agama|agama islam|\bagama\b|pjok\b|penjas|penjaskes|olahraga|pendidikan jasmani/.test(str);
}

function isKepalaSekolahTeacher_(teacher) {
  if (!teacher) return false;
  var str = ((teacher.mata_pelajaran || '') + ' ' + (teacher.jabatan || '')).toLowerCase();
  return /kepala\s*sekolah|\bkepsek\b/.test(str);
}

function isGuruMapelTeacher_(teacher) {
  if (!teacher) return false;
  if (isKepalaSekolahTeacher_(teacher)) return false;
  if (isPaiOrPjokTeacher_(teacher)) return true;
  var jab = String(teacher.jabatan || '').trim();
  if (/\bguru\s*mapel\b|\bpengampu\s*mapel\b/i.test(jab)) return true;
  var rawMapel = String(teacher.mata_pelajaran || '').trim();
  if (!rawMapel) return false;
  if (/\b(?:guru\s*kelas|wali\s*kelas|tematik|kelas)\b/i.test(rawMapel)) return false;
  if (/^[1-6][a-z]?$/i.test(rawMapel) || /^(?:i{1,3}|iv|vi?)$/i.test(rawMapel)) return false;
  if (extractClassTingkatFromText_(rawMapel)) return false;
  return true;
}

function isNonWaliTeacher_(teacher) {
  return isGuruMapelTeacher_(teacher) || isKepalaSekolahTeacher_(teacher);
}

function extractClassTingkatFromText_(text) {
  var raw = String(text || '').trim().toLowerCase();
  if (!raw || isPaiOrPjokTeacher_({ mata_pelajaran: raw }) || isKepalaSekolahTeacher_({ mata_pelajaran: raw })) return '';

  var digitMatch = raw.match(/(?:guru\s*kelas|wali\s*kelas|kelas|tematik)\s*([1-6])\b/i)
    || raw.match(/\bkelas\s*([1-6])[a-z]?\b/i);
  if (digitMatch && digitMatch[1]) return digitMatch[1];

  var romanMatch = raw.match(/\bkelas\s*(vi|iv|v|iii|ii|i)\b/i);
  if (romanMatch && romanMatch[1]) {
    var romanMap = { i: '1', ii: '2', iii: '3', iv: '4', v: '5', vi: '6' };
    return romanMap[romanMatch[1].toLowerCase()] || '';
  }
  return '';
}

function findMatchingClassForSubject_(mataPelajaran, jabatan, classes) {
  if (isNonWaliTeacher_({ mata_pelajaran: mataPelajaran, jabatan: jabatan }) || !classes || !classes.length) {
    return null;
  }
  var combined = (String(mataPelajaran || '') + ' ' + String(jabatan || '')).trim().toLowerCase();

  for (var i = 0; i < classes.length; i++) {
    var cname = String(classes[i].nama_kelas || '').trim().toLowerCase();
    if (cname && combined.indexOf(cname) !== -1) {
      return classes[i];
    }
  }

  var tingkat = extractClassTingkatFromText_(mataPelajaran) || extractClassTingkatFromText_(jabatan);
  if (tingkat) {
    for (var j = 0; j < classes.length; j++) {
      if (String(classes[j].tingkat || '').trim() === tingkat) return classes[j];
    }
    var rx = new RegExp('\\b' + tingkat + '[a-z]?\\b', 'i');
    for (var k = 0; k < classes.length; k++) {
      if (rx.test(String(classes[k].nama_kelas || ''))) return classes[k];
    }
  }
  return null;
}

function isExplicitNonWaliValue_(value) {
  return /^(?:non\s*[-\s]?wali(?:\s*kelas)?|bukan\s*wali(?:\s*kelas)?|tidak)$/i.test(
    String(value || '').trim()
  );
}

function resolveTeacherClassAssignment_(input, classes) {
  if (isKepalaSekolahTeacher_(input)) {
    return {
      isPaiPjok: false,
      isGuruMapel: false,
      isKepalaSekolah: true,
      isWaliKelas: false,
      id_kelas: 'SEMUA_KELAS',
      wali_kelas_id: '',
      wali_kelas: ''
    };
  }
  if (isGuruMapelTeacher_(input)) {
    return {
      isPaiPjok: true,
      isGuruMapel: true,
      isKepalaSekolah: false,
      isWaliKelas: false,
      id_kelas: 'SEMUA_KELAS',
      wali_kelas_id: '',
      wali_kelas: ''
    };
  }

  var list = classes || [];
  var rawWaliId = String(input.wali_kelas_id || '').trim();
  if (isExplicitNonWaliValue_(input.wali_kelas) && !rawWaliId) {
    return {
      isPaiPjok: false,
      isGuruMapel: false,
      isKepalaSekolah: false,
      isWaliKelas: false,
      id_kelas: '',
      wali_kelas_id: '',
      wali_kelas: ''
    };
  }
  var rawIdKelas = String(input.id_kelas || '').trim();
  var rawId = rawWaliId || (rawIdKelas && rawIdKelas !== 'SEMUA_KELAS' && rawIdKelas !== 'ALL' ? rawIdKelas : '');

  var subjectMatched = findMatchingClassForSubject_(input.mata_pelajaran, input.jabatan, list);
  var explicitClass = null;
  if (rawId) {
    for (var i = 0; i < list.length; i++) {
      if (list[i].id_kelas === rawId) {
        explicitClass = list[i];
        break;
      }
    }
  }
  var byWaliName = null;
  if (!explicitClass && input.wali_kelas) {
    var waliNameLower = String(input.wali_kelas).trim().toLowerCase();
    for (var j = 0; j < list.length; j++) {
      if (String(list[j].nama_kelas || '').trim().toLowerCase() === waliNameLower) {
        byWaliName = list[j];
        break;
      }
    }
  }

  var subjectTingkat = extractClassTingkatFromText_(input.mata_pelajaran) || extractClassTingkatFromText_(input.jabatan);
  var chosen = explicitClass || byWaliName;
  if (!chosen && subjectMatched) {
    chosen = subjectMatched;
  } else if (!explicitClass && chosen && subjectMatched && subjectTingkat && String(chosen.tingkat || '').trim() !== subjectTingkat) {
    chosen = subjectMatched;
  }

  var finalId = chosen ? chosen.id_kelas : (subjectTingkat ? '' : (rawId || ''));
  var finalName = chosen ? chosen.nama_kelas : (finalId ? String(input.wali_kelas || '') : '');

  return {
    isPaiPjok: false,
    isKepalaSekolah: false,
    isWaliKelas: !!finalId,
    id_kelas: finalId,
    wali_kelas_id: finalId,
    wali_kelas: finalName
  };
}

function findTeacherRecordForUser_(user, teachersList) {
  var teachers = teachersList || readSheetObjects_('GURU');
  var relId = String(user.relasi_id || '').trim();
  var uname = String(user.username || '').trim().toLowerCase();
  var relNama = String(user.relasi_nama || '').trim().toLowerCase();

  for (var i = 0; i < teachers.length; i++) {
    var t = teachers[i];
    if (relId && t.id_guru === relId) return t;
    if (uname && String(t.username || '').trim().toLowerCase() === uname) return t;
    if (uname && String(t.nip || '').trim().toLowerCase() === uname) return t;
    if (relNama && String(t.nama_guru || '').trim().toLowerCase() === relNama) return t;
  }
  return null;
}

function getTeacherAccessScope_(user) {
  var emptyScope = { isFullAccess: false, classIds: {}, teacher: null };
  if (!user || user.role !== 'GURU') return emptyScope;

  var classes = readSheetObjects_('KELAS');
  var teachers = readSheetObjects_('GURU');
  var teacher = findTeacherRecordForUser_(user, teachers);
  var teacherId = (teacher && teacher.id_guru) || user.relasi_id || '';
  var classIds = {};

  // Guru Mapel (PAI, PJOK, Mapel lain) dan Kepala Sekolah dapat mengakses seluruh kelas 1 s/d 6, bukan wali kelas
  var rawIdKelas = teacher ? String(teacher.id_kelas || '').trim().toUpperCase() : '';
  if (isNonWaliTeacher_(teacher) || rawIdKelas === 'SEMUA_KELAS' || rawIdKelas === 'ALL') {
    for (var k = 0; k < classes.length; k++) {
      classIds[classes[k].id_kelas] = true;
    }
    return { isFullAccess: true, classIds: classIds, teacher: teacher };
  }

  // Guru kelas 1 s/d 6: sebagai wali kelas sesuai kelasnya, plus kelas dari id_kelas / jadwal
  if (teacherId) {
    for (var i = 0; i < classes.length; i++) {
      if (classes[i].wali_kelas_id === teacherId) {
        classIds[classes[i].id_kelas] = true;
      }
    }
  }
  if (teacher && teacher.wali_kelas_id && teacher.wali_kelas_id !== 'SEMUA_KELAS' && teacher.wali_kelas_id !== 'ALL') {
    classIds[teacher.wali_kelas_id] = true;
  }
  if (teacher && teacher.id_kelas && teacher.id_kelas !== 'SEMUA_KELAS' && teacher.id_kelas !== 'ALL') {
    String(teacher.id_kelas)
      .split(',')
      .forEach(function(part) {
        var cid = String(part || '').trim();
        if (cid) classIds[cid] = true;
      });
  }
  if (Object.keys(classIds).length === 0 && teacher) {
    var inferred = findMatchingClassForSubject_(teacher.mata_pelajaran, teacher.jabatan, classes);
    if (inferred && inferred.id_kelas) {
      classIds[inferred.id_kelas] = true;
    }
  }
  if (teacherId) {
    var schedules = readSheetObjects_('JADWAL');
    for (var j = 0; j < schedules.length; j++) {
      if (schedules[j].id_guru === teacherId && schedules[j].id_kelas) {
        classIds[schedules[j].id_kelas] = true;
      }
    }
  }

  return { isFullAccess: false, classIds: classIds, teacher: teacher };
}

function getScopedStudents_(user) {
  var all = readSheetObjects_('SISWA');
  if (user.role === 'ADMIN' || user.role === 'KEPALA_SEKOLAH') return all;
  if (user.role === 'ORANG_TUA') {
    return all.filter(function(s) { return s.id_siswa === user.relasi_id; });
  }
  if (user.role === 'GURU') {
    var scope = getTeacherAccessScope_(user);
    if (scope.isFullAccess) return all;
    var classes = readSheetObjects_('KELAS');
    var allowedClassNames = {};
    var classByName = {};
    for (var i = 0; i < classes.length; i++) {
      var cid = String(classes[i].id_kelas || '').trim();
      var cname = normSyncText_(classes[i].nama_kelas);
      var ccomp = compactClassKey_(classes[i].nama_kelas);
      if (cname) classByName[cname] = classes[i];
      if (ccomp) classByName[ccomp] = classes[i];
      if (cid && scope.classIds[cid]) {
        if (cname) allowedClassNames[cname] = true;
        if (ccomp) allowedClassNames[ccomp] = true;
      }
    }
    return all.filter(function(s) {
      var sidKelas = String(s.id_kelas || '').trim();
      if (sidKelas && scope.classIds[sidKelas]) return true;
      var sname = normSyncText_(s.nama_kelas);
      var scomp = compactClassKey_(s.nama_kelas);
      if ((sname && allowedClassNames[sname]) || (scomp && allowedClassNames[scomp])) {
        var clsMatch = classByName[sname] || classByName[scomp];
        if (clsMatch && !sidKelas) s.id_kelas = clsMatch.id_kelas;
        return true;
      }
      return false;
    });
  }
  return [];
}

function getClassesWithCount_(user) {
  var classes = ensureKelasIdsAndGet_();
  var students = readSheetObjects_('SISWA');
  var countsById = {};
  var countsByName = {};
  for (var i = 0; i < students.length; i++) {
    var s = students[i];
    var cid = String(s.id_kelas || '').trim();
    if (cid) countsById[cid] = (countsById[cid] || 0) + 1;
    var cname = normSyncText_(s.nama_kelas);
    if (cname) countsByName[cname] = (countsByName[cname] || 0) + 1;
    var ccomp = compactClassKey_(s.nama_kelas);
    if (ccomp) countsByName[ccomp] = (countsByName[ccomp] || 0) + 1;
  }
  var result = classes.map(function(c) {
    var cId = String(c.id_kelas || '').trim();
    var cNameKey = normSyncText_(c.nama_kelas);
    var cCompKey = compactClassKey_(c.nama_kelas);
    var total = (cId && countsById[cId]) ||
      (cNameKey && countsByName[cNameKey]) ||
      (cCompKey && countsByName[cCompKey]) || 0;
    c.jumlah_siswa = total;
    return c;
  });
  if (user.role === 'GURU') {
    var scope = getTeacherAccessScope_(user);
    if (scope.isFullAccess) return result;
    return result.filter(function(c) { return !!scope.classIds[c.id_kelas]; });
  }
  if (user.role === 'ORANG_TUA') {
    var child = students.filter(function(s) { return s.id_siswa === user.relasi_id; })[0];
    if (!child) return [];
    return result.filter(function(c) { return c.id_kelas === child.id_kelas; });
  }
  return result;
}

function getDefaultScheduleTimeSlot_(jamKe, isEnd) {
  var num = parseInt(jamKe, 10);
  if (isNaN(num)) num = 1;
  var slots = {
    0: ['06:45', '07:15'],
    1: ['07:00', '07:45'],
    2: ['07:45', '08:30'],
    3: ['08:30', '09:15'],
    4: ['09:15', '10:00'],
    5: ['10:15', '11:00'],
    6: ['11:00', '11:45'],
    7: ['11:45', '12:30'],
    8: ['12:30', '13:15'],
    9: ['13:15', '14:00']
  };
  var pair = slots[num] || ['07:00', '07:45'];
  return isEnd ? pair[1] : pair[0];
}

function formatScheduleTimeValue_(val, jamKe, isEnd) {
  if (val instanceof Date) {
    var tz = Session.getScriptTimeZone() || 'Asia/Jakarta';
    return Utilities.formatDate(val, tz, 'HH:mm');
  }
  var raw = String(val === undefined || val === null ? '' : val).trim();
  if (!raw || raw.indexOf('1899-12-30') !== -1) {
    return getDefaultScheduleTimeSlot_(jamKe, isEnd);
  }
  if (/^\d{1,2}:\d{2}$/.test(raw)) {
    var parts = raw.split(':');
    return (parts[0].length === 1 ? '0' + parts[0] : parts[0]) + ':' + parts[1];
  }
  if (/^\d{1,2}:\d{2}:\d{2}$/.test(raw)) {
    var parts3 = raw.split(':');
    return (parts3[0].length === 1 ? '0' + parts3[0] : parts3[0]) + ':' + parts3[1];
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(raw)) {
    try {
      var dt = new Date(raw);
      if (!isNaN(dt.getTime())) {
        return Utilities.formatDate(dt, Session.getScriptTimeZone() || 'Asia/Jakarta', 'HH:mm');
      }
    } catch (e) {}
  }
  var match = raw.match(/^(\d{1,2}):(\d{2})/);
  if (match) {
    return (match[1].length === 1 ? '0' + match[1] : match[1]) + ':' + match[2];
  }
  return getDefaultScheduleTimeSlot_(jamKe, isEnd);
}

function enrichScheduleRow_(row, classes, subjects, teachers) {
  var idKelas = String(row.id_kelas || '').trim();
  var namaKelas = String(row.nama_kelas || '').trim();
  var cls = classes.filter(function(c) {
    return (idKelas && String(c.id_kelas || '') === idKelas) ||
      (namaKelas && String(c.nama_kelas || '').trim().toLowerCase() === namaKelas.toLowerCase());
  })[0];

  var idMapel = String(row.id_mapel || '').trim();
  var namaMapel = String(row.nama_mapel || '').trim();
  var sub = subjects.filter(function(m) {
    return (idMapel && String(m.id_mapel || '') === idMapel) ||
      (namaMapel && (
        String(m.nama_mapel || '').trim().toLowerCase() === namaMapel.toLowerCase() ||
        String(m.kode_mapel || '').trim().toLowerCase() === namaMapel.toLowerCase()
      ));
  })[0];

  var idGuru = String(row.id_guru || '').trim();
  var namaGuru = String(row.nama_guru || '').trim();
  var tch = teachers.filter(function(g) {
    return (idGuru && String(g.id_guru || '') === idGuru) ||
      (namaGuru && String(g.nama_guru || '').trim().toLowerCase() === namaGuru.toLowerCase());
  })[0];

  row.id_kelas = (cls && cls.id_kelas) || idKelas;
  row.nama_kelas = (cls && cls.nama_kelas) || namaKelas;
  row.id_mapel = (sub && sub.id_mapel) || idMapel;
  row.nama_mapel = (sub && sub.nama_mapel) || namaMapel;
  row.id_guru = (tch && tch.id_guru) || idGuru;
  row.nama_guru = (tch && tch.nama_guru) || namaGuru;
  row.waktu_mulai = formatScheduleTimeValue_(row.waktu_mulai, row.jam_ke, false);
  row.waktu_selesai = formatScheduleTimeValue_(row.waktu_selesai, row.jam_ke, true);
  return row;
}

function getScopedSchedules_(user) {
  var raw = readSheetObjects_('JADWAL');
  var classes = ensureKelasIdsAndGet_();
  var subjects = ensureMapelIdsAndGet_();
  var teachers = readSheetObjects_('GURU');
  var all = raw.map(function(r) {
    return enrichScheduleRow_(r, classes, subjects, teachers);
  });
  if (user.role === 'ADMIN' || user.role === 'KEPALA_SEKOLAH') return all;
  if (user.role === 'GURU') {
    var scope = getTeacherAccessScope_(user);
    if (scope.isFullAccess) return all;
    var teacherId = (scope.teacher && scope.teacher.id_guru) || user.relasi_id;
    return all.filter(function(j) { return j.id_guru === teacherId || !!scope.classIds[j.id_kelas]; });
  }
  if (user.role === 'ORANG_TUA') {
    var child = readSheetObjects_('SISWA').filter(function(s) { return s.id_siswa === user.relasi_id; })[0];
    if (!child) return [];
    return all.filter(function(j) { return j.id_kelas === child.id_kelas; });
  }
  return [];
}

function createSchedule_(payload, user) {
  var classes = ensureKelasIdsAndGet_();
  var subjects = ensureMapelIdsAndGet_();
  var teachers = readSheetObjects_('GURU');
  var jamKe = payload.jam_ke || '1';
  var waktuMulai = formatScheduleTimeValue_(payload.waktu_mulai, jamKe, false);
  var waktuSelesai = formatScheduleTimeValue_(payload.waktu_selesai, jamKe, true);
  var enriched = enrichScheduleRow_({
    id_tahun_ajaran: payload.id_tahun_ajaran || '',
    semester: payload.semester || 'Ganjil',
    hari: payload.hari || 'Senin',
    jam_ke: jamKe,
    waktu_mulai: waktuMulai,
    waktu_selesai: waktuSelesai,
    id_kelas: payload.id_kelas || '',
    nama_kelas: payload.nama_kelas || '',
    id_mapel: payload.id_mapel || '',
    nama_mapel: payload.nama_mapel || '',
    id_guru: payload.id_guru || '',
    nama_guru: payload.nama_guru || ''
  }, classes, subjects, teachers);
  return createGeneric_('JADWAL', 'id_jadwal', 'JDW', enriched, user, 'Tambah Jadwal');
}

function updateSchedule_(payload, user) {
  var classes = ensureKelasIdsAndGet_();
  var subjects = ensureMapelIdsAndGet_();
  var teachers = readSheetObjects_('GURU');
  var jamKe = payload.jam_ke || '1';
  payload.waktu_mulai = formatScheduleTimeValue_(payload.waktu_mulai, jamKe, false);
  payload.waktu_selesai = formatScheduleTimeValue_(payload.waktu_selesai, jamKe, true);
  var enriched = enrichScheduleRow_(payload, classes, subjects, teachers);
  return updateGeneric_('JADWAL', 'id_jadwal', enriched, user, 'Edit Jadwal');
}

function getScopedByStudentOrClass_(sheetName, user) {
  var all = readSheetObjects_(sheetName);
  if (user.role === 'ADMIN' || user.role === 'KEPALA_SEKOLAH') return all;
  if (user.role === 'ORANG_TUA') {
    return all.filter(function(r) { return r.id_siswa === user.relasi_id; });
  }
  if (user.role === 'GURU') {
    var scope = getTeacherAccessScope_(user);
    if (scope.isFullAccess) return all;
    return all.filter(function(r) { return !!scope.classIds[r.id_kelas]; });
  }
  return [];
}

function normalizeChecklistString_(raw) {
  if (raw === null || raw === undefined || raw === '') return '{}';
  if (typeof raw === 'object') {
    try {
      return JSON.stringify(raw);
    } catch (e) {
      return '{}';
    }
  }
  var str = String(raw).trim();
  if (!str) return '{}';
  try {
    var parsed = JSON.parse(str);
    if (parsed && typeof parsed === 'object') {
      return JSON.stringify(parsed);
    }
  } catch (e) {
    // fallback if plain comma-separated task names were stored
    var obj = {};
    str.split(/[\n,;]+/).forEach(function(item) {
      var clean = String(item || '').trim();
      if (clean) obj[clean] = true;
    });
    return JSON.stringify(obj);
  }
  return '{}';
}

function enrichPicketRow_(row, classes, teachers, students) {
  var idKelas = String(row.id_kelas || '').trim();
  var namaKelas = String(row.nama_kelas || '').trim();
  var cls = (classes || []).filter(function(c) {
    return (idKelas && String(c.id_kelas || '') === idKelas) ||
      (namaKelas && String(c.nama_kelas || '').trim().toLowerCase() === namaKelas.toLowerCase());
  })[0];

  var finalIdKelas = (cls && cls.id_kelas) || idKelas;
  var finalNamaKelas = (cls && cls.nama_kelas) || namaKelas;

  var idGuru = String(row.id_guru || '').trim();
  var namaGuru = String(row.nama_guru || '').trim();
  var tch = (teachers || []).filter(function(g) {
    return (idGuru && String(g.id_guru || '') === idGuru) ||
      (namaGuru && String(g.nama_guru || '').trim().toLowerCase() === namaGuru.toLowerCase());
  })[0];

  var rawIds = String(row.id_siswa || '').split(/[\n,]+/).map(function(s) { return s.trim(); }).filter(Boolean);
  var rawNames = String(row.petugas_siswa || '').split(/[\n,]+/).map(function(s) { return s.trim(); }).filter(Boolean);
  var resolvedIds = [];
  var resolvedNames = [];
  var seenIds = {};
  var seenNames = {};

  var allStudents = students || [];
  var addStudent = function(st, fallbackName) {
    if (st && st.id_siswa) {
      if (!seenIds[st.id_siswa]) {
        seenIds[st.id_siswa] = true;
        resolvedIds.push(st.id_siswa);
      }
      var canonicalName = String(st.nama_lengkap || fallbackName || '').trim();
      var lowerName = canonicalName.toLowerCase();
      if (canonicalName && !seenNames[lowerName]) {
        seenNames[lowerName] = true;
        resolvedNames.push(canonicalName);
      }
    } else if (fallbackName) {
      var lowerFallback = fallbackName.toLowerCase();
      if (!seenNames[lowerFallback]) {
        seenNames[lowerFallback] = true;
        resolvedNames.push(fallbackName);
      }
    }
  };

  for (var i = 0; i < rawIds.length; i++) {
    var sid = rawIds[i];
    var stById = allStudents.filter(function(s) { return String(s.id_siswa || '').trim() === sid; })[0];
    if (stById) {
      addStudent(stById, rawNames[i] || '');
    } else if (!seenIds[sid]) {
      seenIds[sid] = true;
      resolvedIds.push(sid);
    }
  }

  for (var j = 0; j < rawNames.length; j++) {
    var sname = rawNames[j];
    var lower = sname.toLowerCase();
    var cands = allStudents.filter(function(s) {
      return String(s.nama_lengkap || '').trim().toLowerCase() === lower;
    });
    var matchedSt = cands.filter(function(s) {
      return (finalIdKelas && String(s.id_kelas || '').trim() === finalIdKelas) ||
        (finalNamaKelas && String(s.nama_kelas || '').trim().toLowerCase() === finalNamaKelas.toLowerCase());
    })[0] || cands[0];
    addStudent(matchedSt, sname);
  }

  row.id_kelas = finalIdKelas;
  row.nama_kelas = finalNamaKelas;
  row.id_guru = (tch && tch.id_guru) || idGuru;
  row.nama_guru = (tch && tch.nama_guru) || namaGuru;
  row.id_siswa = resolvedIds.join(', ');
  row.petugas_siswa = resolvedNames.join(', ');
  row.checklist_kebersihan = normalizeChecklistString_(row.checklist_kebersihan);
  return row;
}

function getScopedPickets_(user) {
  var raw = readSheetObjects_('PIKET');
  var classes = ensureKelasIdsAndGet_();
  var teachers = readSheetObjects_('GURU');
  var students = readSheetObjects_('SISWA');
  var all = raw.map(function(p) {
    return enrichPicketRow_(p, classes, teachers, students);
  });
  if (user.role === 'ADMIN' || user.role === 'KEPALA_SEKOLAH') return all;
  if (user.role === 'GURU') {
    var scope = getTeacherAccessScope_(user);
    if (scope.isFullAccess) return all;
    var teacherId = (scope.teacher && scope.teacher.id_guru) || user.relasi_id;
    return all.filter(function(p) {
      return (p.id_kelas && !!scope.classIds[p.id_kelas]) || (!p.id_kelas && p.id_guru === teacherId);
    });
  }
  return [];
}

function createPicket_(payload, user) {
  var classes = ensureKelasIdsAndGet_();
  var teachers = readSheetObjects_('GURU');
  var students = readSheetObjects_('SISWA');
  var enriched = enrichPicketRow_({
    hari: payload.hari || 'Senin',
    id_kelas: payload.id_kelas || '',
    nama_kelas: payload.nama_kelas || '',
    id_guru: payload.id_guru || '',
    nama_guru: payload.nama_guru || '',
    id_siswa: payload.id_siswa || '',
    petugas_siswa: payload.petugas_siswa || '',
    tugas: payload.tugas || '',
    checklist_kebersihan: payload.checklist_kebersihan !== undefined ? payload.checklist_kebersihan : '{}',
    keterangan: payload.keterangan || ''
  }, classes, teachers, students);
  return createGeneric_('PIKET', 'id_piket', 'PKT', enriched, user, 'Tambah Piket');
}

function updatePicket_(payload, user) {
  var classes = ensureKelasIdsAndGet_();
  var teachers = readSheetObjects_('GURU');
  var students = readSheetObjects_('SISWA');
  var enriched = enrichPicketRow_(payload || {}, classes, teachers, students);
  if (!String(enriched.id_piket || '').trim()) {
    return createGeneric_('PIKET', 'id_piket', 'PKT', enriched, user, 'Tambah Piket');
  }
  return updateGeneric_('PIKET', 'id_piket', enriched, user, 'Edit Piket');
}

function normalizeYmdDateStr_(val) {
  var tz = Session.getScriptTimeZone() || 'Asia/Jakarta';
  if (val instanceof Date) {
    return Utilities.formatDate(val, tz, 'yyyy-MM-dd');
  }
  if (typeof val === 'number' && !isNaN(val) && val > 20000 && val < 80000) {
    var serialDate = new Date(Math.round((val - 25569) * 86400 * 1000));
    return Utilities.formatDate(serialDate, 'UTC', 'yyyy-MM-dd');
  }
  var s = String(val === undefined || val === null ? '' : val).trim();
  if (!s) return '';
  if (/^\d{4}-\d{1,2}-\d{1,2}T.*(?:Z|[+-]\d{2}:?\d{2})$/i.test(s)) {
    var isoInstant = new Date(s);
    if (!isNaN(isoInstant.getTime())) {
      return Utilities.formatDate(isoInstant, tz, 'yyyy-MM-dd');
    }
  }
  var iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    return iso[1] + '-' + ('0' + iso[2]).slice(-2) + '-' + ('0' + iso[3]).slice(-2);
  }
  var dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    var p1 = parseInt(dmy[1], 10);
    var p2 = parseInt(dmy[2], 10);
    var day = p1;
    var month = p2;
    if (p2 > 12 && p1 <= 12) {
      month = p1;
      day = p2;
    }
    return dmy[3] + '-' + ('0' + month).slice(-2) + '-' + ('0' + day).slice(-2);
  }
  if (/^\d{5}(\.\d+)?$/.test(s)) {
    var numVal = parseFloat(s);
    if (numVal > 20000 && numVal < 80000) {
      var numDate = new Date(Math.round((numVal - 25569) * 86400 * 1000));
      return Utilities.formatDate(numDate, 'UTC', 'yyyy-MM-dd');
    }
  }
  var parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    return Utilities.formatDate(parsed, tz, 'yyyy-MM-dd');
  }
  return s;
}

function normalizeAttendanceStatusStr_(val) {
  var raw = String(val || '').trim().toLowerCase();
  if (raw === 'sakit' || raw === 's') return 'Sakit';
  if (raw === 'izin' || raw === 'i') return 'Izin';
  if (raw === 'alpa' || raw === 'alfa' || raw === 'alpha' || raw === 'a') return 'Alpha';
  if (raw === 'terlambat' || raw === 'telat' || raw === 't') return 'Hadir';
  return 'Hadir';
}

function enrichAttendanceRow_(row, classes, students) {
  var out = {};
  for (var k in row) {
    if (Object.prototype.hasOwnProperty.call(row, k)) out[k] = row[k];
  }
  var idSiswa = String(out.id_siswa || '').trim();
  var namaSiswa = String(out.nama_siswa || '').trim();
  var idKelas = String(out.id_kelas || '').trim();
  var namaKelas = String(out.nama_kelas || '').trim();

  var cls = (classes || []).filter(function(c) {
    return (idKelas && String(c.id_kelas || '').trim() === idKelas) ||
      (namaKelas && String(c.nama_kelas || '').trim().toLowerCase() === namaKelas.toLowerCase());
  })[0];

  var std = (students || []).filter(function(s) {
    return idSiswa && String(s.id_siswa || '').trim() === idSiswa;
  })[0];
  if (!std && namaSiswa) {
    var nameCands = (students || []).filter(function(s) {
      return String(s.nama_lengkap || '').trim().toLowerCase() === namaSiswa.toLowerCase();
    });
    std = nameCands.filter(function(s) {
      return (cls && String(s.id_kelas || '').trim() === String(cls.id_kelas || '').trim()) ||
        (idKelas && String(s.id_kelas || '').trim() === idKelas) ||
        (namaKelas && String(s.nama_kelas || '').trim().toLowerCase() === namaKelas.toLowerCase());
    })[0] || nameCands[0];
  }

  if (!cls && std) {
    cls = (classes || []).filter(function(c) {
      return (std.id_kelas && String(c.id_kelas || '').trim() === String(std.id_kelas || '').trim()) ||
        (std.nama_kelas && String(c.nama_kelas || '').trim().toLowerCase() === String(std.nama_kelas || '').trim().toLowerCase());
    })[0];
  }

  out.id_absensi = String(out.id_absensi || '').trim();
  out.tanggal = normalizeYmdDateStr_(out.tanggal);
  out.status = normalizeAttendanceStatusStr_(out.status);
  out.id_siswa = (std && String(std.id_siswa || '').trim()) || idSiswa;
  out.nama_siswa = (std && String(std.nama_lengkap || '').trim()) || namaSiswa;
  out.id_kelas = (cls && String(cls.id_kelas || '').trim()) || (std && String(std.id_kelas || '').trim()) || idKelas;
  out.nama_kelas = (cls && String(cls.nama_kelas || '').trim()) || (std && String(std.nama_kelas || '').trim()) || namaKelas;
  return out;
}

function getScopedAttendance_(user) {
  var raw = readSheetObjects_('ABSENSI');
  var classes = readSheetObjects_('KELAS');
  var students = readSheetObjects_('SISWA');
  var all = raw.map(function(r) { return enrichAttendanceRow_(r, classes, students); });
  if (user.role === 'ADMIN' || user.role === 'KEPALA_SEKOLAH') return all;
  if (user.role === 'ORANG_TUA') {
    return all.filter(function(r) { return r.id_siswa === user.relasi_id; });
  }
  if (user.role === 'GURU') {
    var scope = getTeacherAccessScope_(user);
    if (scope.isFullAccess) return all;
    var allowedNames = {};
    for (var i = 0; i < classes.length; i++) {
      var cid = String(classes[i].id_kelas || '').trim();
      if (cid && scope.classIds[cid]) {
        var cname = normSyncText_(classes[i].nama_kelas);
        var ccomp = compactClassKey_(classes[i].nama_kelas);
        if (cname) allowedNames[cname] = true;
        if (ccomp) allowedNames[ccomp] = true;
      }
    }
    return all.filter(function(r) {
      if (r.id_kelas && scope.classIds[r.id_kelas]) return true;
      var rname = normSyncText_(r.nama_kelas);
      var rcomp = compactClassKey_(r.nama_kelas);
      return (rname && !!allowedNames[rname]) || (rcomp && !!allowedNames[rcomp]);
    });
  }
  return [];
}

function enrichJournalRow_(row, classes, subjects, teachers) {
  var out = {};
  for (var k in row) {
    if (Object.prototype.hasOwnProperty.call(row, k)) out[k] = row[k];
  }
  var idKelas = String(out.id_kelas || '').trim();
  var namaKelas = String(out.nama_kelas || '').trim();
  var cls = (classes || []).filter(function(c) {
    return (idKelas && String(c.id_kelas || '').trim() === idKelas) ||
      (namaKelas && normSyncText_(c.nama_kelas) === normSyncText_(namaKelas));
  })[0];

  var idMapel = String(out.id_mapel || '').trim();
  var namaMapel = String(out.nama_mapel || '').trim();
  var sub = (subjects || []).filter(function(m) {
    return (idMapel && String(m.id_mapel || '').trim() === idMapel) ||
      (namaMapel && (
        normSyncText_(m.nama_mapel) === normSyncText_(namaMapel) ||
        normSyncText_(m.kode_mapel) === normSyncText_(namaMapel)
      ));
  })[0];

  var idGuru = String(out.id_guru || '').trim();
  var namaGuru = String(out.nama_guru || '').trim();
  var tch = (teachers || []).filter(function(g) {
    return (idGuru && String(g.id_guru || '').trim() === idGuru) ||
      (namaGuru && normSyncText_(g.nama_guru) === normSyncText_(namaGuru));
  })[0];

  out.id_jurnal = String(out.id_jurnal || '').trim();
  out.tanggal = normalizeYmdDateStr_(out.tanggal);
  out.id_kelas = (cls && String(cls.id_kelas || '').trim()) || idKelas;
  out.nama_kelas = (cls && String(cls.nama_kelas || '').trim()) || namaKelas;
  out.id_mapel = (sub && String(sub.id_mapel || '').trim()) || idMapel;
  out.nama_mapel = (sub && String(sub.nama_mapel || '').trim()) || namaMapel;
  out.id_guru = (tch && String(tch.id_guru || '').trim()) || idGuru;
  out.nama_guru = (tch && String(tch.nama_guru || '').trim()) || namaGuru;
  return out;
}

function getScopedJournals_(user) {
  var raw = readSheetObjects_('JURNAL');
  var hasMissingId = raw.some(function(j) { return !String(j.id_jurnal || '').trim(); });
  if (hasMissingId) {
    patchSheetColumns_('JURNAL', function(row) {
      return !String(row.id_jurnal || '').trim() ? { id_jurnal: generateId_('JRN') } : null;
    });
    SpreadsheetApp.flush();
    raw = readSheetObjects_('JURNAL');
  }
  var classes = readSheetObjects_('KELAS');
  var subjects = readSheetObjects_('MAPEL');
  var teachers = readSheetObjects_('GURU');
  var all = raw.map(function(j) { return enrichJournalRow_(j, classes, subjects, teachers); });
  if (user.role === 'ADMIN' || user.role === 'KEPALA_SEKOLAH') return all;
  if (user.role === 'GURU') {
    var scope = getTeacherAccessScope_(user);
    if (scope.isFullAccess) return all;
    var teacherId = (scope.teacher && scope.teacher.id_guru) || user.relasi_id;
    return all.filter(function(j) { return j.id_guru === teacherId || !!scope.classIds[j.id_kelas]; });
  }
  return [];
}

function createJournal_(payload, user) {
  var classes = readSheetObjects_('KELAS');
  var subjects = readSheetObjects_('MAPEL');
  var teachers = readSheetObjects_('GURU');
  var enriched = enrichJournalRow_({
    tanggal: payload.tanggal || '',
    id_guru: payload.id_guru || '',
    nama_guru: payload.nama_guru || '',
    id_kelas: payload.id_kelas || '',
    nama_kelas: payload.nama_kelas || '',
    id_mapel: payload.id_mapel || '',
    nama_mapel: payload.nama_mapel || '',
    materi: payload.materi || '',
    tujuan_pembelajaran: payload.tujuan_pembelajaran || '',
    aktivitas: payload.aktivitas || '',
    metode: payload.metode || '',
    refleksi: payload.refleksi || '',
    tindak_lanjut: payload.tindak_lanjut || ''
  }, classes, subjects, teachers);
  return createGeneric_('JURNAL', 'id_jurnal', 'JRN', enriched, user, 'Tambah Jurnal');
}

function updateJournal_(payload, user) {
  var classes = readSheetObjects_('KELAS');
  var subjects = readSheetObjects_('MAPEL');
  var teachers = readSheetObjects_('GURU');
  var enriched = enrichJournalRow_(payload || {}, classes, subjects, teachers);
  var targetId = String(enriched.id_jurnal || '').trim();
  if (!targetId) {
    return jsonResponse_(false, 'ID jurnal tidak ditemukan. Muat ulang halaman lalu coba lagi.', null, 'VALIDATION_ERROR');
  }
  enriched.id_jurnal = targetId;
  return updateGeneric_('JURNAL', 'id_jurnal', enriched, user, 'Edit Jurnal');
}

function deleteJournal_(payload, user) {
  var idJurnal = String((payload && payload.id_jurnal) || '').trim();
  if (idJurnal) {
    return deleteById_('JURNAL', 'id_jurnal', idJurnal, user, 'Hapus Jurnal');
  }
  var targetTanggal = normalizeYmdDateStr_(payload && payload.tanggal);
  var targetMateri = normSyncText_(payload && payload.materi);
  if (!targetTanggal && !targetMateri) {
    return jsonResponse_(false, 'ID jurnal wajib disertakan.', null, 'VALIDATION_ERROR');
  }
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName('JURNAL');
  if (!sheet) return jsonResponse_(false, 'Sheet JURNAL tidak ditemukan.', null, 'NOT_FOUND');
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return jsonResponse_(false, 'Data jurnal tidak ditemukan.', null, 'NOT_FOUND');
  var layout = resolveSheetLayout_('JURNAL', data);
  var fields = layout.fields;
  var startRow = layout.dataStartRow;
  var tglCol = fields.indexOf('tanggal');
  var matCol = fields.indexOf('materi');
  for (var r = startRow; r < data.length; r++) {
    var rowTgl = tglCol !== -1 ? normalizeYmdDateStr_(data[r][tglCol]) : '';
    var rowMat = matCol !== -1 ? normSyncText_(data[r][matCol]) : '';
    if ((!targetTanggal || rowTgl === targetTanggal) && (!targetMateri || rowMat === targetMateri)) {
      sheet.deleteRow(r + 1);
      SpreadsheetApp.flush();
      writeLog_(user, 'DELETE', 'JURNAL', 'Hapus Jurnal (' + (targetMateri || targetTanggal) + ')');
      return jsonResponse_(true, 'Jurnal berhasil dihapus.', { id: '' });
    }
  }
  return jsonResponse_(false, 'Data jurnal tidak ditemukan.', null, 'NOT_FOUND');
}

function getScopedAgendas_(user) {
  var all = readSheetObjects_('AGENDA');
  if (user.role === 'ADMIN' || user.role === 'KEPALA_SEKOLAH') return all;
  if (user.role === 'ORANG_TUA') {
    return all.filter(function(a) { return a.target_role === 'Semua' || a.target_role === 'Orang Tua'; });
  }
  return all;
}

// ============================================================================
// FUNGSI BISNIS KHUSUS
// ============================================================================

function getSchoolSettingsData_() {
  var rows = readSheetObjects_('IDENTITAS_SEKOLAH');
  if (rows.length > 0) return rows[0];
  return {
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
    updated_at: ''
  };
}

function updateSchoolSettings_(payload, user) {
  var existing = readSheetObjects_('IDENTITAS_SEKOLAH');
  var now = nowIso_();
  var data = {
    id: 'SEKOLAH_UTAMA',
    nama_sekolah: String(payload.nama_sekolah || '').trim(),
    npsn: String(payload.npsn || '').trim(),
    alamat: String(payload.alamat || '').trim(),
    kecamatan: String(payload.kecamatan || '').trim(),
    kabupaten: String(payload.kabupaten || '').trim(),
    provinsi: String(payload.provinsi || '').trim(),
    email: String(payload.email || '').trim(),
    tahun_ajaran_aktif_id: String(payload.tahun_ajaran_aktif_id || '').trim(),
    tahun_ajaran_aktif: String(payload.tahun_ajaran_aktif || '').trim(),
    semester_aktif: payload.semester_aktif === 'Genap' ? 'Genap' : 'Ganjil',
    peringkat_aktif: payload.peringkat_aktif === 'Ya' ? 'Ya' : 'Tidak',
    updated_at: now
  };
  if (existing.length === 0) {
    insertRow_('IDENTITAS_SEKOLAH', data);
  } else {
    updateRowById_('IDENTITAS_SEKOLAH', 'id', existing[0].id, data);
  }
  writeLog_(user, 'UPDATE', 'PENGATURAN_SEKOLAH', 'Identitas sekolah diperbarui');
  return jsonResponse_(true, 'Identitas sekolah berhasil disimpan.', data);
}

function createAcademicYear_(payload, user) {
  var nama = String(payload.nama_tahun_ajaran || '').trim();
  if (!nama) return jsonResponse_(false, 'Nama tahun ajaran wajib diisi.', null, 'VALIDATION_ERROR');
  var now = nowIso_();
  var item = {
    id_tahun_ajaran: generateId_('TA'),
    nama_tahun_ajaran: nama,
    semester: payload.semester === 'Genap' ? 'Genap' : 'Ganjil',
    status: payload.status || 'Draft',
    keterangan: String(payload.keterangan || '').trim(),
    created_at: now,
    updated_at: now
  };
  if (item.status === 'Aktif') {
    deactivateAllAcademicYears_();
    syncActiveAcademicYearToSchool_(item);
  }
  insertRow_('TAHUN_AJARAN', item);
  writeLog_(user, 'CREATE', 'TAHUN_AJARAN', 'Menambah tahun ajaran ' + nama);
  return jsonResponse_(true, 'Tahun ajaran berhasil ditambahkan.', item);
}

function updateAcademicYear_(payload, user) {
  var id = payload.id_tahun_ajaran;
  if (!id) return jsonResponse_(false, 'ID tahun ajaran wajib ada.', null, 'VALIDATION_ERROR');
  if (payload.status === 'Aktif') {
    deactivateAllAcademicYears_();
  }
  payload.updated_at = nowIso_();
  var updated = updateRowById_('TAHUN_AJARAN', 'id_tahun_ajaran', id, payload);
  if (payload.status === 'Aktif') {
    syncActiveAcademicYearToSchool_(updated);
  }
  writeLog_(user, 'UPDATE', 'TAHUN_AJARAN', 'Memperbarui tahun ajaran ' + updated.nama_tahun_ajaran);
  return jsonResponse_(true, 'Tahun ajaran berhasil diperbarui.', updated);
}

function setActiveAcademicYear_(payload, user) {
  var id = payload.id_tahun_ajaran;
  var years = readSheetObjects_('TAHUN_AJARAN');
  var target = null;
  for (var i = 0; i < years.length; i++) {
    if (years[i].id_tahun_ajaran === id) {
      target = years[i];
      break;
    }
  }
  if (!target) return jsonResponse_(false, 'Tahun ajaran tidak ditemukan.', null, 'NOT_FOUND');
  deactivateAllAcademicYears_();
  target.status = 'Aktif';
  target.updated_at = nowIso_();
  updateRowById_('TAHUN_AJARAN', 'id_tahun_ajaran', id, target);
  syncActiveAcademicYearToSchool_(target);
  writeLog_(user, 'ACTIVATE', 'TAHUN_AJARAN', 'Mengaktifkan tahun ajaran ' + target.nama_tahun_ajaran + ' (' + target.semester + ')');
  return jsonResponse_(true, 'Tahun ajaran aktif berhasil diubah.', target);
}

function deleteAcademicYear_(payload, user) {
  var id = payload.id_tahun_ajaran;
  var classes = readSheetObjects_('KELAS');
  var grades = readSheetObjects_('NILAI');
  var att = readSheetObjects_('ABSENSI');
  var used = classes.some(function(c) { return c.id_tahun_ajaran === id; }) ||
             grades.some(function(g) { return g.id_tahun_ajaran === id; }) ||
             att.some(function(a) { return a.id_tahun_ajaran === id; });
  if (used) {
    return jsonResponse_(false, 'Tahun ajaran tidak dapat dihapus karena sudah digunakan pada data kelas, absensi, atau nilai.', null, 'IN_USE');
  }
  return deleteById_('TAHUN_AJARAN', 'id_tahun_ajaran', id, user, 'Hapus Tahun Ajaran');
}

function deactivateAllAcademicYears_() {
  var years = readSheetObjects_('TAHUN_AJARAN');
  for (var i = 0; i < years.length; i++) {
    if (years[i].status === 'Aktif') {
      years[i].status = 'Arsip';
      years[i].updated_at = nowIso_();
      updateRowById_('TAHUN_AJARAN', 'id_tahun_ajaran', years[i].id_tahun_ajaran, years[i]);
    }
  }
}

function syncActiveAcademicYearToSchool_(yearObj) {
  var school = getSchoolSettingsData_();
  school.tahun_ajaran_aktif_id = yearObj.id_tahun_ajaran;
  school.tahun_ajaran_aktif = yearObj.nama_tahun_ajaran;
  school.semester_aktif = yearObj.semester;
  school.updated_at = nowIso_();
  var existing = readSheetObjects_('IDENTITAS_SEKOLAH');
  if (existing.length === 0) {
    insertRow_('IDENTITAS_SEKOLAH', school);
  } else {
    updateRowById_('IDENTITAS_SEKOLAH', 'id', existing[0].id, school);
  }
}

function resolveClassMeta_(payload) {
  var idKelas = String(payload.id_kelas || '').trim();
  var namaKelas = String(payload.nama_kelas || '').trim();
  if ((!idKelas && namaKelas) || (idKelas && !namaKelas)) {
    var classes = readSheetObjects_('KELAS');
    for (var i = 0; i < classes.length; i++) {
      if (idKelas && classes[i].id_kelas === idKelas) {
        payload.nama_kelas = classes[i].nama_kelas || namaKelas;
        break;
      }
      if (!idKelas && namaKelas && String(classes[i].nama_kelas || '').trim().toLowerCase() === namaKelas.toLowerCase()) {
        payload.id_kelas = classes[i].id_kelas;
        payload.nama_kelas = classes[i].nama_kelas;
        break;
      }
    }
  }
}

function normalizeStudentPayload_(payload, existingCount) {
  resolveClassMeta_(payload);
  var hp = String(payload.hp || '').trim();
  var telp = String(payload.telepon || '').trim();
  var ortu = String(payload.telepon_ortu || '').trim();
  if (!hp && ortu) payload.hp = ortu;
  if (!ortu) payload.telepon_ortu = hp || telp || '';
  if (payload.no === undefined || payload.no === null || String(payload.no).trim() === '') {
    payload.no = existingCount + 1;
  }
  payload.status_siswa = payload.status_siswa || 'Aktif';
  return payload;
}

function createStudent_(payload, user) {
  var nis = String(payload.nis || '').trim();
  var nisn = String(payload.nisn || '').trim();
  var nama = String(payload.nama_lengkap || '').trim();
  if (!nis || !nama) {
    return jsonResponse_(false, 'NIS dan Nama Lengkap siswa wajib diisi.', null, 'VALIDATION_ERROR');
  }
  var existing = readSheetObjects_('SISWA');
  for (var i = 0; i < existing.length; i++) {
    if (String(existing[i].nis).trim() === nis) {
      return jsonResponse_(false, 'NIS "' + nis + '" sudah terdaftar.', null, 'DUPLICATE_NIS');
    }
    if (nisn && String(existing[i].nisn).trim() === nisn) {
      return jsonResponse_(false, 'NISN "' + nisn + '" sudah terdaftar.', null, 'DUPLICATE_NISN');
    }
  }
  var now = nowIso_();
  normalizeStudentPayload_(payload, existing.length);
  if (user.role === 'GURU') {
    var scope = getTeacherAccessScope_(user);
    if (!scope.isFullAccess && Object.keys(scope.classIds).length > 0 && payload.id_kelas && !scope.classIds[payload.id_kelas]) {
      return jsonResponse_(false, 'Anda hanya dapat menambahkan siswa pada kelas yang Anda ampu.', null, 'FORBIDDEN');
    }
  }
  payload.id_siswa = generateId_('SIS');
  payload.created_at = now;
  payload.updated_at = now;
  insertRow_('SISWA', payload);
  syncUsersFromMasterData_({
    students: existing.concat([payload]),
    syncStudentStatusId: payload.id_siswa
  });
  writeLog_(user, 'CREATE', 'SISWA', 'Menambah siswa ' + nama + ' (NIS: ' + nis + ')');
  return jsonResponse_(true, 'Data siswa berhasil ditambahkan.', payload);
}

function updateStudent_(payload, user) {
  var id = payload.id_siswa;
  var nis = String(payload.nis || '').trim();
  var nisn = String(payload.nisn || '').trim();
  var existing = readSheetObjects_('SISWA');
  var currentStudent = null;
  for (var i = 0; i < existing.length; i++) {
    if (existing[i].id_siswa === id) {
      currentStudent = existing[i];
    } else {
      if (nis && String(existing[i].nis).trim() === nis) {
        return jsonResponse_(false, 'NIS "' + nis + '" sudah digunakan siswa lain.', null, 'DUPLICATE_NIS');
      }
      if (nisn && String(existing[i].nisn).trim() === nisn) {
        return jsonResponse_(false, 'NISN "' + nisn + '" sudah digunakan siswa lain.', null, 'DUPLICATE_NISN');
      }
    }
  }
  resolveClassMeta_(payload);
  if (user.role === 'GURU') {
    var scope = getTeacherAccessScope_(user);
    if (!scope.isFullAccess && Object.keys(scope.classIds).length > 0) {
      var prevClassId = currentStudent ? String(currentStudent.id_kelas || '') : '';
      var nextClassId = String(payload.id_kelas !== undefined ? payload.id_kelas : prevClassId);
      if ((prevClassId && !scope.classIds[prevClassId]) || (nextClassId && !scope.classIds[nextClassId])) {
        return jsonResponse_(false, 'Anda hanya dapat memperbarui siswa pada kelas yang Anda ampu.', null, 'FORBIDDEN');
      }
    }
  }
  var hp = String(payload.hp || '').trim();
  var telp = String(payload.telepon || '').trim();
  var ortu = String(payload.telepon_ortu || '').trim();
  if (!hp && ortu) payload.hp = ortu;
  payload.telepon_ortu = ortu || hp || telp || '';
  payload.updated_at = nowIso_();
  var updated = updateRowById_('SISWA', 'id_siswa', id, payload);
  syncUsersFromMasterData_({ syncStudentStatusId: updated.id_siswa || id });
  writeLog_(user, 'UPDATE', 'SISWA', 'Memperbarui siswa ' + updated.nama_lengkap);
  return jsonResponse_(true, 'Data siswa berhasil diperbarui.', updated);
}

function importStudents_(payload, user) {
  var rows = payload.rows || [];
  if (!rows.length) return jsonResponse_(false, 'Tidak ada data untuk diimpor.', null, 'EMPTY');
  var existing = readSheetObjects_('SISWA');
  var classes = readSheetObjects_('KELAS');
  var classById = {};
  var classByName = {};
  var classByCompact = {};
  for (var ci = 0; ci < classes.length; ci++) {
    var c = classes[ci];
    if (c.id_kelas) classById[String(c.id_kelas).trim()] = c;
    var cnameKey = normSyncText_(c.nama_kelas);
    if (cnameKey && !classByName[cnameKey]) classByName[cnameKey] = c;
    var ccompKey = compactClassKey_(c.nama_kelas);
    if (ccompKey && !classByCompact[ccompKey]) classByCompact[ccompKey] = c;
  }

  var nisSet = {};
  var nisnSet = {};
  existing.forEach(function(s) {
    if (s.nis) nisSet[String(s.nis).trim()] = true;
    if (s.nisn) nisnSet[String(s.nisn).trim()] = true;
  });

  var inserted = [];
  var skipped = 0;
  var now = nowIso_();
  var seq = existing.length;
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    var nis = String(r.nis || '').trim();
    var nisn = String(r.nisn || '').trim();
    var nama = String(r.nama_lengkap || '').trim();
    if (!nis || !nama) continue;
    if (nisSet[nis] || (nisn && nisnSet[nisn])) {
      skipped++;
      continue;
    }
    nisSet[nis] = true;
    if (nisn) nisnSet[nisn] = true;

    var rawCid = String(r.id_kelas || '').trim();
    var rawCname = String(r.nama_kelas || '').trim();
    var matchedCls = (rawCid && classById[rawCid]) ||
      (rawCname && classByName[normSyncText_(rawCname)]) ||
      (rawCname && classByCompact[compactClassKey_(rawCname)]) ||
      null;
    if (matchedCls) {
      r.id_kelas = matchedCls.id_kelas;
      r.nama_kelas = matchedCls.nama_kelas;
    }

    var hp = String(r.hp || '').trim();
    var telp = String(r.telepon || '').trim();
    var ortu = String(r.telepon_ortu || '').trim();
    if (!hp && ortu) r.hp = ortu;
    if (!ortu) r.telepon_ortu = hp || telp || '';
    if (r.no === undefined || r.no === null || String(r.no).trim() === '') {
      r.no = seq + 1;
    }
    seq++;
    r.nis = nis;
    r.nisn = nisn;
    r.nama_lengkap = nama;
    r.status_siswa = r.status_siswa || 'Aktif';
    r.id_siswa = generateId_('SIS');
    r.created_at = now;
    r.updated_at = now;
    inserted.push(r);
  }

  if (inserted.length > 0) {
    insertRowsBatch_('SISWA', inserted);
  }

  if (!payload.skipSync) {
    syncUsersFromMasterData_({
      students: existing.concat(inserted)
    });
  }

  writeLog_(user, 'IMPORT', 'SISWA', 'Mengimpor ' + inserted.length + ' siswa dari Excel');
  return jsonResponse_(
    true,
    inserted.length + ' data siswa berhasil diimpor' + (skipped > 0 ? ' (' + skipped + ' duplikat dilewati).' : '.'),
    { count: inserted.length, skipped: skipped }
  );
}

function syncTeacherWithClasses_(teacher) {
  var isNonWali = isNonWaliTeacher_(teacher);
  var classes = readSheetObjects_('KELAS');
  for (var i = 0; i < classes.length; i++) {
    var cls = classes[i];
    if (cls.wali_kelas_id === teacher.id_guru && (isNonWali || cls.id_kelas !== teacher.wali_kelas_id)) {
      cls.wali_kelas_id = '';
      cls.wali_kelas = '';
      cls.updated_at = nowIso_();
      updateRowById_('KELAS', 'id_kelas', cls.id_kelas, cls);
    }
  }
  if (!isNonWali && teacher.wali_kelas_id) {
    var teachers = readSheetObjects_('GURU');
    for (var j = 0; j < teachers.length; j++) {
      var other = teachers[j];
      if (other.id_guru !== teacher.id_guru && other.wali_kelas_id === teacher.wali_kelas_id) {
        other.wali_kelas_id = '';
        other.wali_kelas = '';
        if (other.id_kelas === teacher.wali_kelas_id) other.id_kelas = '';
        other.updated_at = nowIso_();
        updateRowById_('GURU', 'id_guru', other.id_guru, other);
      }
    }
    for (var k = 0; k < classes.length; k++) {
      if (classes[k].id_kelas === teacher.wali_kelas_id) {
        classes[k].wali_kelas_id = teacher.id_guru;
        classes[k].wali_kelas = teacher.nama_guru;
        classes[k].updated_at = nowIso_();
        updateRowById_('KELAS', 'id_kelas', classes[k].id_kelas, classes[k]);
        break;
      }
    }
  }
}

function buildFallbackUsernameFromName_(name, fallbackId) {
  var cleaned = stripAcademicTitles_(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
  if (cleaned) return cleaned.slice(0, 20);
  return String(fallbackId || 'user')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function syncUsersFromMasterData_(options) {
  var opts = options || {};
  var teachers = opts.teachers || readSheetObjects_('GURU');
  var students = opts.students || readSheetObjects_('SISWA');
  var users = opts.users || readSheetObjects_('USERS');
  var now = nowIso_();

  var usedUsernames = {};
  for (var ui = 0; ui < users.length; ui++) {
    var un = normSyncText_(users[ui].username);
    if (un) usedUsernames[un] = true;
  }
  var matchedUserIds = {};

  function allocateUniqueUsername_(base, fallbackId) {
    var rawBase = String(base || '').trim() || buildFallbackUsernameFromName_('', fallbackId);
    var candidate = rawBase;
    var suffix = 2;
    while (usedUsernames[normSyncText_(candidate)]) {
      candidate = rawBase + '_' + suffix;
      suffix++;
    }
    usedUsernames[normSyncText_(candidate)] = true;
    return candidate;
  }

  var teacherUsers = [];
  var parentUsers = [];
  for (var uIdx = 0; uIdx < users.length; uIdx++) {
    var uRow = users[uIdx];
    var uRole = String(uRow.role || '').trim().toUpperCase();
    if (uRole === 'GURU' || uRole === 'KEPALA_SEKOLAH') {
      teacherUsers.push(uRow);
    } else if (uRole === 'ORANG_TUA') {
      parentUsers.push(uRow);
    }
  }

  var kepsekCount = 0;
  for (var ki = 0; ki < teachers.length; ki++) {
    if (isKepalaSekolahTeacher_(teachers[ki])) kepsekCount++;
  }

  var userPatchesById = {};
  var userPatchesByUsername = {};
  var usersToInsert = [];
  var teacherUsernamePatches = {};

  function queueUserPatch(uObj, patchObj) {
    if (Object.keys(patchObj).length === 0) return;
    patchObj.updated_at = now;
    if (uObj.id_user) {
      userPatchesById[uObj.id_user] = patchObj;
    } else if (uObj.username) {
      userPatchesByUsername[normSyncText_(uObj.username)] = patchObj;
    }
  }

  // 1. Sinkronkan setiap GURU -> USERS (role GURU / KEPALA_SEKOLAH)
  for (var ti = 0; ti < teachers.length; ti++) {
    var t = teachers[ti];
    if (!t || !t.id_guru) continue;
    var expectedRole = isKepalaSekolahTeacher_(t) ? 'KEPALA_SEKOLAH' : 'GURU';
    var cleanNip = String(t.nip || '').trim();
    var validNip = (cleanNip && cleanNip !== '-') ? cleanNip : '';
    var cleanUname = String(t.username || '').trim();
    var tNameNorm = normSyncText_(t.nama_guru);
    var tNameClean = stripAcademicTitles_(t.nama_guru);
    var expectedStatus = String(t.status_akun || 'Aktif').trim().toLowerCase() === 'nonaktif' ? 'Nonaktif' : 'Aktif';

    var matched = null;
    for (var pass = 0; pass < 5 && !matched; pass++) {
      for (var tu = 0; tu < teacherUsers.length; tu++) {
        var cand = teacherUsers[tu];
        var candKey = cand.id_user || ('UN:' + normSyncText_(cand.username));
        if (matchedUserIds[candKey]) continue;
        if (pass === 0 && cand.relasi_id === t.id_guru) {
          matched = cand; break;
        } else if (pass === 1 && cleanUname && normSyncText_(cand.username) === normSyncText_(cleanUname)) {
          matched = cand; break;
        } else if (pass === 2 && validNip && normSyncText_(cand.username) === normSyncText_(validNip)) {
          matched = cand; break;
        } else if (pass === 3 && !cand.relasi_id && (
          (tNameNorm && (normSyncText_(cand.relasi_nama) === tNameNorm || normSyncText_(cand.nama_lengkap) === tNameNorm)) ||
          (tNameClean && (stripAcademicTitles_(cand.relasi_nama) === tNameClean || stripAcademicTitles_(cand.nama_lengkap) === tNameClean))
        )) {
          matched = cand; break;
        } else if (pass === 4 && expectedRole === 'KEPALA_SEKOLAH' && kepsekCount === 1 &&
          String(cand.role || '').trim().toUpperCase() === 'KEPALA_SEKOLAH' && !cand.relasi_id) {
          matched = cand; break;
        }
      }
    }

    if (matched) {
      var mKey = matched.id_user || ('UN:' + normSyncText_(matched.username));
      matchedUserIds[mKey] = true;
      var uPatch = {};
      if (!String(matched.id_user || '').trim()) uPatch.id_user = generateId_('USR');
      if (matched.relasi_id !== t.id_guru) uPatch.relasi_id = t.id_guru;
      if (matched.relasi_nama !== t.nama_guru) uPatch.relasi_nama = t.nama_guru;
      if (String(matched.role || '').trim().toUpperCase() !== expectedRole) uPatch.role = expectedRole;
      if (!String(matched.nama_lengkap || '').trim() && t.nama_guru) uPatch.nama_lengkap = t.nama_guru;
      if (!String(matched.foto_url || '').trim() && t.foto_url) uPatch.foto_url = t.foto_url;
      if (!String(matched.password || '').trim()) {
        uPatch.password = validNip || String(matched.username || '').trim() || 'guru123';
      }
      if (opts.syncTeacherStatusId === t.id_guru && String(matched.status || 'Aktif') !== expectedStatus) {
        uPatch.status = expectedStatus;
      }
      if (!cleanUname && matched.username) {
        teacherUsernamePatches[t.id_guru] = String(matched.username).trim();
        t.username = teacherUsernamePatches[t.id_guru];
      }
      queueUserPatch(matched, uPatch);
    } else {
      var baseUname = cleanUname || validNip || buildFallbackUsernameFromName_(t.nama_guru, t.id_guru);
      var newUname = allocateUniqueUsername_(baseUname, t.id_guru);
      var newPwd = validNip || newUname || 'guru123';
      if (!cleanUname) {
        teacherUsernamePatches[t.id_guru] = newUname;
        t.username = newUname;
      }
      usersToInsert.push({
        id_user: generateId_('USR'),
        username: newUname,
        password: newPwd,
        nama_lengkap: String(t.nama_guru || newUname).trim(),
        role: expectedRole,
        relasi_id: t.id_guru,
        relasi_nama: String(t.nama_guru || '').trim(),
        status: expectedStatus,
        foto_url: String(t.foto_url || ''),
        created_at: now,
        updated_at: now
      });
    }
  }

  // 2. Sinkronkan setiap SISWA -> USERS (role ORANG_TUA)
  for (var si = 0; si < students.length; si++) {
    var s = students[si];
    if (!s || !s.id_siswa) continue;
    var cleanNis = String(s.nis || '').trim();
    var cleanNisn = String(s.nisn || '').trim();
    var sNameNorm = normSyncText_(s.nama_lengkap);
    var expectedStuStatus = (!s.status_siswa || s.status_siswa === 'Aktif') ? 'Aktif' : 'Nonaktif';

    var matchedStu = null;
    for (var spass = 0; spass < 4 && !matchedStu; spass++) {
      for (var pu = 0; pu < parentUsers.length; pu++) {
        var pcand = parentUsers[pu];
        var pKey = pcand.id_user || ('UN:' + normSyncText_(pcand.username));
        if (matchedUserIds[pKey]) continue;
        if (spass === 0 && pcand.relasi_id === s.id_siswa) {
          matchedStu = pcand; break;
        } else if (spass === 1 && cleanNis && normSyncText_(pcand.username) === normSyncText_(cleanNis)) {
          matchedStu = pcand; break;
        } else if (spass === 2 && cleanNisn && normSyncText_(pcand.username) === normSyncText_(cleanNisn)) {
          matchedStu = pcand; break;
        } else if (spass === 3 && !pcand.relasi_id && sNameNorm) {
          var cleanedParentName = String(pcand.relasi_nama || pcand.nama_lengkap || '')
            .replace(/^(wali\s+dari|orang\s+tua\s+dari|orang\s+tua|ortu)\s+/i, '')
            .trim();
          if (normSyncText_(cleanedParentName) === sNameNorm) {
            matchedStu = pcand; break;
          }
        }
      }
    }

    if (matchedStu) {
      var msKey = matchedStu.id_user || ('UN:' + normSyncText_(matchedStu.username));
      matchedUserIds[msKey] = true;
      var sPatch = {};
      if (!String(matchedStu.id_user || '').trim()) sPatch.id_user = generateId_('USR');
      if (matchedStu.relasi_id !== s.id_siswa) sPatch.relasi_id = s.id_siswa;
      if (matchedStu.relasi_nama !== s.nama_lengkap) sPatch.relasi_nama = s.nama_lengkap;
      if (!String(matchedStu.nama_lengkap || '').trim() && s.nama_lengkap) {
        sPatch.nama_lengkap = 'Wali dari ' + s.nama_lengkap;
      }
      if (!String(matchedStu.foto_url || '').trim() && s.foto_url) sPatch.foto_url = s.foto_url;
      if (!String(matchedStu.password || '').trim()) {
        sPatch.password = cleanNis || cleanNisn || String(matchedStu.username || '').trim() || 'siswa123';
      }
      if (opts.syncStudentStatusId === s.id_siswa && String(matchedStu.status || 'Aktif') !== expectedStuStatus) {
        sPatch.status = expectedStuStatus;
      }
      queueUserPatch(matchedStu, sPatch);
    } else {
      var baseStuUname = cleanNis || cleanNisn || buildFallbackUsernameFromName_(s.nama_lengkap, s.id_siswa);
      var newStuUname = allocateUniqueUsername_(baseStuUname, s.id_siswa);
      var newStuPwd = cleanNis || cleanNisn || newStuUname || 'siswa123';
      usersToInsert.push({
        id_user: generateId_('USR'),
        username: newStuUname,
        password: newStuPwd,
        nama_lengkap: 'Wali dari ' + String(s.nama_lengkap || newStuUname).trim(),
        role: 'ORANG_TUA',
        relasi_id: s.id_siswa,
        relasi_nama: String(s.nama_lengkap || '').trim(),
        status: expectedStuStatus,
        foto_url: String(s.foto_url || ''),
        created_at: now,
        updated_at: now
      });
    }
  }

  var updatedCount = 0;
  if (Object.keys(userPatchesById).length > 0 || Object.keys(userPatchesByUsername).length > 0) {
    updatedCount += patchSheetColumns_('USERS', function(uRow) {
      if (uRow.id_user && userPatchesById[uRow.id_user]) {
        return userPatchesById[uRow.id_user];
      }
      var unameKey = normSyncText_(uRow.username);
      if (unameKey && userPatchesByUsername[unameKey]) {
        return userPatchesByUsername[unameKey];
      }
      return null;
    });
  }

  var insertedCount = 0;
  if (usersToInsert.length > 0) {
    insertedCount = insertRowsBatch_('USERS', usersToInsert);
  }

  if (Object.keys(teacherUsernamePatches).length > 0) {
    patchSheetColumns_('GURU', function(gRow) {
      if (gRow.id_guru && teacherUsernamePatches[gRow.id_guru] && !String(gRow.username || '').trim()) {
        return { username: teacherUsernamePatches[gRow.id_guru] };
      }
      return null;
    });
  }

  return {
    inserted: insertedCount,
    updated: updatedCount,
    total: insertedCount + updatedCount
  };
}

function syncTeacherUserRole_(teacher) {
  if (!teacher || !teacher.id_guru) return;
  syncUsersFromMasterData_({ syncTeacherStatusId: teacher.id_guru });
}

function createTeacher_(payload, user) {
  var nama = String(payload.nama_guru || '').trim();
  if (!nama) return jsonResponse_(false, 'Nama guru wajib diisi.', null, 'VALIDATION_ERROR');
  var existing = readSheetObjects_('GURU');
  var classes = readSheetObjects_('KELAS');
  var now = nowIso_();
  if (payload.no === undefined || payload.no === null || String(payload.no).trim() === '') {
    payload.no = existing.length + 1;
  }
  var assignment = resolveTeacherClassAssignment_(payload, classes);
  payload.id_kelas = assignment.id_kelas;
  payload.wali_kelas_id = assignment.wali_kelas_id;
  payload.wali_kelas = assignment.wali_kelas;
  var nipCleanCreate = String(payload.nip || '').trim();
  if (!String(payload.username || '').trim() && nipCleanCreate && nipCleanCreate !== '-') {
    payload.username = nipCleanCreate;
  }
  payload.status_akun = payload.status_akun || 'Aktif';
  payload.id_guru = generateId_('GRU');
  payload.created_at = now;
  payload.updated_at = now;
  insertRow_('GURU', payload);
  syncTeacherWithClasses_(payload);
  syncUsersFromMasterData_({
    teachers: existing.concat([payload]),
    syncTeacherStatusId: payload.id_guru
  });
  writeLog_(user, 'CREATE', 'GURU', 'Menambah guru ' + nama);
  return jsonResponse_(true, 'Data guru berhasil ditambahkan.', payload);
}

function updateTeacher_(payload, user) {
  var teachers = readSheetObjects_('GURU');
  var current = null;
  for (var i = 0; i < teachers.length; i++) {
    if (teachers[i].id_guru === payload.id_guru) {
      current = teachers[i];
      break;
    }
  }
  if (!current) return jsonResponse_(false, 'Guru tidak ditemukan.', null, 'NOT_FOUND');

  var classes = readSheetObjects_('KELAS');
  var assignment = resolveTeacherClassAssignment_({
    mata_pelajaran: payload.mata_pelajaran !== undefined ? payload.mata_pelajaran : current.mata_pelajaran,
    jabatan: payload.jabatan !== undefined ? payload.jabatan : current.jabatan,
    wali_kelas_id: payload.wali_kelas_id !== undefined ? payload.wali_kelas_id : current.wali_kelas_id,
    wali_kelas: payload.wali_kelas !== undefined ? payload.wali_kelas : current.wali_kelas,
    id_kelas: payload.id_kelas !== undefined ? payload.id_kelas : current.id_kelas
  }, classes);

  payload.id_kelas = assignment.id_kelas;
  payload.wali_kelas_id = assignment.wali_kelas_id;
  payload.wali_kelas = assignment.wali_kelas;
  var nextNipUpd = String(payload.nip !== undefined ? payload.nip : current.nip || '').trim();
  var nextUnameUpd = String(payload.username !== undefined ? payload.username : current.username || '').trim();
  if (!nextUnameUpd && nextNipUpd && nextNipUpd !== '-') {
    payload.username = nextNipUpd;
  }
  payload.updated_at = nowIso_();
  var updated = updateRowById_('GURU', 'id_guru', payload.id_guru, payload);
  syncTeacherWithClasses_(updated);
  syncTeacherUserRole_(updated);
  writeLog_(user, 'UPDATE', 'GURU', 'Memperbarui guru ' + updated.nama_guru);
  return jsonResponse_(true, 'Data guru berhasil diperbarui.', updated);
}

function importTeachers_(payload, user) {
  var rows = payload.rows || [];
  if (!rows.length) return jsonResponse_(false, 'Tidak ada data untuk diimpor.', null, 'EMPTY');
  var existing = readSheetObjects_('GURU');
  var classes = readSheetObjects_('KELAS');
  var now = nowIso_();
  var inserted = [];
  var skipped = 0;
  var seq = existing.length;

  var existingNipSet = {};
  var existingNameSet = {};
  for (var ei = 0; ei < existing.length; ei++) {
    var ex = existing[ei];
    var exNip = normSyncText_(ex.nip);
    if (exNip) existingNipSet[exNip] = true;
    var exName = normSyncText_(ex.nama_guru);
    if (exName) existingNameSet[exName] = true;
  }

  var waliClaimsByClassId = {};
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    var nama = String(r.nama_guru || '').trim();
    if (!nama) continue;
    var nipKey = normSyncText_(r.nip);
    var nameKey = normSyncText_(nama);
    if ((nipKey && existingNipSet[nipKey]) || (!nipKey && existingNameSet[nameKey])) {
      skipped++;
      continue;
    }
    if (nipKey) existingNipSet[nipKey] = true;
    existingNameSet[nameKey] = true;

    if (r.no === undefined || r.no === null || String(r.no).trim() === '') {
      r.no = seq + 1;
    }
    seq++;
    var assignment = resolveTeacherClassAssignment_({
      mata_pelajaran: r.mata_pelajaran,
      jabatan: r.jabatan || 'Guru Kelas',
      wali_kelas_id: r.wali_kelas_id,
      wali_kelas: r.wali_kelas,
      id_kelas: r.id_kelas
    }, classes);
    r.nama_guru = nama;
    r.id_kelas = assignment.id_kelas;
    r.wali_kelas_id = assignment.wali_kelas_id;
    r.wali_kelas = assignment.wali_kelas;
    var nipCleanImp = String(r.nip || '').trim();
    if (!String(r.username || '').trim() && nipCleanImp && nipCleanImp !== '-') {
      r.username = nipCleanImp;
    }
    r.id_guru = generateId_('GRU');
    r.status_akun = r.status_akun || 'Aktif';
    r.created_at = now;
    r.updated_at = now;
    if (assignment.isWaliKelas && assignment.wali_kelas_id) {
      waliClaimsByClassId[assignment.wali_kelas_id] = {
        id_guru: r.id_guru,
        nama_guru: nama
      };
    }
    inserted.push(r);
  }

  if (inserted.length > 0) {
    insertRowsBatch_('GURU', inserted);
  }

  var claimedClassIds = Object.keys(waliClaimsByClassId);
  if (claimedClassIds.length > 0) {
    var hasTeacherConflict = existing.some(function(g) {
      return g.wali_kelas_id && waliClaimsByClassId[g.wali_kelas_id];
    });
    if (hasTeacherConflict) {
      patchSheetColumns_('GURU', function(gRow) {
        var claim = gRow.wali_kelas_id ? waliClaimsByClassId[gRow.wali_kelas_id] : null;
        if (claim && gRow.id_guru !== claim.id_guru) {
          var p = { wali_kelas_id: '', wali_kelas: '' };
          if (gRow.id_kelas === gRow.wali_kelas_id) p.id_kelas = '';
          return p;
        }
        return null;
      });
    }
    patchSheetColumns_('KELAS', function(cRow) {
      var claim = cRow.id_kelas ? waliClaimsByClassId[cRow.id_kelas] : null;
      if (!claim) return null;
      return {
        wali_kelas_id: claim.id_guru,
        wali_kelas: claim.nama_guru
      };
    });
  }

  if (!payload.skipSync) {
    syncUsersFromMasterData_({
      teachers: existing.concat(inserted)
    });
  }

  writeLog_(user, 'IMPORT', 'GURU', 'Mengimpor ' + inserted.length + ' guru dari Excel');
  return jsonResponse_(
    true,
    inserted.length + ' data guru berhasil diimpor' + (skipped > 0 ? ' (' + skipped + ' duplikat dilewati).' : '.'),
    { count: inserted.length, skipped: skipped }
  );
}

function padClassNum_(num) {
  return num < 10 ? '00' + num : (num < 100 ? '0' + num : String(num));
}

function generateNextClassId_(existing) {
  var used = {};
  var maxNum = 0;
  for (var i = 0; i < existing.length; i++) {
    var raw = String(existing[i].id_kelas || '').trim().toUpperCase();
    if (!raw) continue;
    used[raw] = true;
    var match = raw.match(/^KLS[-_]?(\d+)$/);
    if (match) {
      var n = Number(match[1]);
      if (!isNaN(n) && n > maxNum) maxNum = n;
    }
  }
  var nextNum = Math.max(maxNum + 1, existing.length + 1, 1);
  var candidate = 'KLS-' + padClassNum_(nextNum);
  while (used[candidate]) {
    nextNum += 1;
    candidate = 'KLS-' + padClassNum_(nextNum);
  }
  return candidate;
}

function inferTingkatFromClassName_(namaKelas) {
  var raw = String(namaKelas || '').trim();
  if (!raw) return '';
  var m = raw.match(/^(?:kelas\s*)?([1-6])(?:\s*[a-z0-9-]*)?$/i) || raw.match(/\b(?:kelas\s*)?([1-6])[a-z]?\b/i);
  if (m && m[1]) return m[1];
  return extractClassTingkatFromText_(raw);
}

function naturalCompare_(a, b) {
  var ax = String(a || '').trim().toLowerCase().match(/(\d+|\D+)/g) || [];
  var bx = String(b || '').trim().toLowerCase().match(/(\d+|\D+)/g) || [];
  var len = Math.min(ax.length, bx.length);
  for (var i = 0; i < len; i++) {
    if (ax[i] === bx[i]) continue;
    var aNum = /^\d+$/.test(ax[i]);
    var bNum = /^\d+$/.test(bx[i]);
    if (aNum && bNum) {
      var diff = Number(ax[i]) - Number(bx[i]);
      if (diff !== 0) return diff;
    } else {
      if (ax[i] < bx[i]) return -1;
      if (ax[i] > bx[i]) return 1;
    }
  }
  return ax.length - bx.length;
}

function compareClassesByName_(a, b) {
  var nameA = String((a && a.nama_kelas) || '').trim();
  var nameB = String((b && b.nama_kelas) || '').trim();
  var tA = Number(inferTingkatFromClassName_(nameA) || (a && a.tingkat) || '');
  var tB = Number(inferTingkatFromClassName_(nameB) || (b && b.tingkat) || '');
  var hasTA = !isNaN(tA) && tA > 0;
  var hasTB = !isNaN(tB) && tB > 0;
  if (hasTA && hasTB && tA !== tB) return tA - tB;
  if (hasTA !== hasTB) return hasTA ? -1 : 1;
  var normA = nameA.replace(/^(kelas|rombel)\s+/i, '');
  var normB = nameB.replace(/^(kelas|rombel)\s+/i, '');
  var cmp = naturalCompare_(normA, normB);
  if (cmp !== 0) return cmp;
  var yrCmp = naturalCompare_(String((a && a.tahun_ajaran) || ''), String((b && b.tahun_ajaran) || ''));
  if (yrCmp !== 0) return yrCmp;
  return naturalCompare_(String((a && a.id_kelas) || ''), String((b && b.id_kelas) || ''));
}

function cascadeClassIdRemap_(idRemap, classByNewId, classByName, classByCompact) {
  var details = {};
  var totalUpdated = 0;
  var addCount = function(sheetName, cnt) {
    if (cnt > 0) {
      details[sheetName] = (details[sheetName] || 0) + cnt;
      totalUpdated += cnt;
    }
  };

  var lookupFallbackClass = function(namaKelas) {
    var nk = normSyncText_(namaKelas);
    if (nk && classByName[nk]) return classByName[nk];
    var ck = compactClassKey_(namaKelas);
    if (ck && classByCompact[ck]) return classByCompact[ck];
    return null;
  };

  addCount('GURU', patchSheetColumns_('GURU', function(row) {
    var patch = {};
    if (isNonWaliTeacher_(row)) {
      if (String(row.id_kelas || '').trim() !== 'SEMUA_KELAS') patch.id_kelas = 'SEMUA_KELAS';
      if (String(row.wali_kelas_id || '').trim() !== '') patch.wali_kelas_id = '';
      if (String(row.wali_kelas || '').trim() !== '') patch.wali_kelas = '';
      return patch;
    }
    var oldWaliId = String(row.wali_kelas_id || '').trim();
    var nextWaliCls = null;
    if (oldWaliId && idRemap[oldWaliId]) {
      nextWaliCls = classByNewId[idRemap[oldWaliId]] || null;
      patch.wali_kelas_id = idRemap[oldWaliId];
      if (nextWaliCls) patch.wali_kelas = nextWaliCls.nama_kelas;
    } else if (oldWaliId && classByNewId[oldWaliId]) {
      nextWaliCls = classByNewId[oldWaliId];
    } else if (!oldWaliId && row.wali_kelas) {
      nextWaliCls = lookupFallbackClass(row.wali_kelas);
      if (nextWaliCls) {
        patch.wali_kelas_id = nextWaliCls.id_kelas;
        patch.wali_kelas = nextWaliCls.nama_kelas;
      }
    }

    var rawCid = String(row.id_kelas || '').trim();
    if (rawCid) {
      var tokens = rawCid.split(',').map(function(s) { return s.trim(); }).filter(function(s) { return !!s; });
      var mappedTokens = [];
      var seenTok = {};
      for (var ti = 0; ti < tokens.length; ti++) {
        var tok = tokens[ti];
        var nextTok = (tok.toUpperCase() === 'SEMUA_KELAS' || tok.toUpperCase() === 'ALL')
          ? tok
          : (idRemap[tok] || tok);
        if (!seenTok[nextTok]) {
          seenTok[nextTok] = true;
          mappedTokens.push(nextTok);
        }
      }
      var joined = mappedTokens.join(', ');
      if (joined !== rawCid) patch.id_kelas = joined;
    } else if (patch.wali_kelas_id || (nextWaliCls && nextWaliCls.id_kelas)) {
      patch.id_kelas = patch.wali_kelas_id || nextWaliCls.id_kelas;
    }
    return patch;
  }));

  var refSheets = ['SISWA', 'JADWAL', 'PIKET', 'ABSENSI', 'NILAI', 'JURNAL', 'KARAKTER', 'KESEHATAN', 'BIMBINGAN', 'PRESTASI', 'PENGHUBUNG'];
  for (var rs = 0; rs < refSheets.length; rs++) {
    (function(sheetName) {
      addCount(sheetName, patchSheetColumns_(sheetName, function(row) {
        var oldCid = String(row.id_kelas || '').trim();
        var cls = null;
        if (oldCid && idRemap[oldCid]) {
          cls = classByNewId[idRemap[oldCid]] || { id_kelas: idRemap[oldCid], nama_kelas: String(row.nama_kelas || '') };
        } else if ((!oldCid || !classByNewId[oldCid]) && row.nama_kelas) {
          cls = lookupFallbackClass(row.nama_kelas);
        }
        if (!cls) return null;
        var patch = {};
        if (String(row.id_kelas || '').trim() !== cls.id_kelas) patch.id_kelas = cls.id_kelas;
        if (cls.nama_kelas && row.nama_kelas !== undefined && String(row.nama_kelas || '').trim() !== cls.nama_kelas) {
          patch.nama_kelas = cls.nama_kelas;
        }
        return patch;
      }));
    })(refSheets[rs]);
  }

  addCount('AGENDA', patchSheetColumns_('AGENDA', function(row) {
    var rawCid = String(row.id_kelas || '').trim();
    if (!rawCid || rawCid.toUpperCase() === 'SEMUA' || rawCid.toUpperCase() === 'ALL') return null;
    if (idRemap[rawCid]) return { id_kelas: idRemap[rawCid] };
    if (!classByNewId[rawCid]) {
      var cls = lookupFallbackClass(rawCid);
      if (cls) return { id_kelas: cls.id_kelas };
    }
    return null;
  }));

  return { details: details, total_updated_rows: totalUpdated };
}

function reorderClassIdsByName_(actorUser, skipLog) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName('KELAS');
  if (!sheet) {
    return { classes: [], idRemap: {}, total_updated_rows: 0, updated_sheets: [], details: {} };
  }
  ensureKelasSheetStructure_(sheet);
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) {
    return { classes: [], idRemap: {}, total_updated_rows: 0, updated_sheets: [], details: {} };
  }
  var values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var layout = resolveSheetLayout_('KELAS', values);
  var fields = layout.fields;
  var startRow = layout.dataStartRow;
  if (values.length <= startRow) {
    return { classes: [], idRemap: {}, total_updated_rows: 0, updated_sheets: [], details: {} };
  }

  var idCol = fields.indexOf('id_kelas');
  var namaCol = fields.indexOf('nama_kelas');
  var tingkatCol = fields.indexOf('tingkat');

  var tz = ss.getSpreadsheetTimeZone() || Session.getScriptTimeZone() || 'Asia/Jakarta';
  var entries = [];
  for (var r = startRow; r < values.length; r++) {
    var rowArr = values[r].slice();
    while (rowArr.length < lastCol) rowArr.push('');
    var hasContent = false;
    var rowObj = {};
    for (var c = 0; c < fields.length; c++) {
      var val = c < rowArr.length ? rowArr[c] : '';
      if (val instanceof Date) val = formatSheetDateValue_(val, fields[c], tz);
      if (val !== '' && val !== null && val !== undefined) hasContent = true;
      rowObj[fields[c]] = val;
    }
    if (!hasContent) continue;
    entries.push({
      origIdx: entries.length,
      origRow: r,
      rowArr: rowArr,
      rowObj: rowObj
    });
  }

  if (entries.length === 0) {
    return { classes: [], idRemap: {}, total_updated_rows: 0, updated_sheets: [], details: {} };
  }

  var sorted = entries.slice().sort(function(a, b) {
    var cmp = compareClassesByName_(a.rowObj, b.rowObj);
    return cmp !== 0 ? cmp : (a.origIdx - b.origIdx);
  });

  var needsWrite = (values.length - startRow) !== sorted.length;
  var needsCascade = false;
  var idRemap = {};
  var classByNewId = {};
  var classByName = {};
  var classByCompact = {};

  for (var i = 0; i < sorted.length; i++) {
    var entry = sorted[i];
    var expectedId = 'KLS-' + padClassNum_(i + 1);
    var oldId = String(entry.rowObj.id_kelas || '').trim();
    var curTingkat = String(entry.rowObj.tingkat || '').trim();
    var nextTingkat = curTingkat || inferTingkatFromClassName_(entry.rowObj.nama_kelas) || '';

    if (entry.origIdx !== i || entry.origRow !== (startRow + i)) needsWrite = true;
    if (oldId !== expectedId) {
      needsWrite = true;
      needsCascade = true;
      if (oldId) idRemap[oldId] = expectedId;
    }
    if (tingkatCol !== -1 && curTingkat !== nextTingkat && nextTingkat !== '') {
      needsWrite = true;
    }

    if (idCol !== -1) entry.rowArr[idCol] = expectedId;
    entry.rowObj.id_kelas = expectedId;
    if (tingkatCol !== -1 && nextTingkat !== '') {
      entry.rowArr[tingkatCol] = nextTingkat;
      entry.rowObj.tingkat = nextTingkat;
    }

    classByNewId[expectedId] = entry.rowObj;
    var nk = normSyncText_(entry.rowObj.nama_kelas);
    if (nk && !classByName[nk]) classByName[nk] = entry.rowObj;
    var ck = compactClassKey_(entry.rowObj.nama_kelas);
    if (ck) {
      if (classByCompact[ck] === undefined) classByCompact[ck] = entry.rowObj;
      else if (classByCompact[ck] !== entry.rowObj) classByCompact[ck] = null;
    }
  }

  var classObjects = sorted.map(function(e) { return e.rowObj; });
  if (!needsWrite) {
    return { classes: classObjects, idRemap: {}, total_updated_rows: 0, updated_sheets: [], details: {} };
  }

  var matrix = sorted.map(function(e) { return e.rowArr; });
  sheet.getRange(startRow + 1, 1, matrix.length, lastCol).setValues(matrix);
  var extraRows = (values.length - startRow) - matrix.length;
  if (extraRows > 0) {
    sheet.getRange(startRow + 1 + matrix.length, 1, extraRows, lastCol).clearContent();
  }

  var cascadeRes = { details: {}, total_updated_rows: 0 };
  if (needsCascade) {
    cascadeRes = cascadeClassIdRemap_(idRemap, classByNewId, classByName, classByCompact);
  }
  var details = cascadeRes.details || {};
  details.KELAS = sorted.length;
  var updatedSheets = Object.keys(details);
  var totalUpdatedRows = updatedSheets.reduce(function(acc, k) { return acc + details[k]; }, 0);

  if (!skipLog && actorUser) {
    writeLog_(
      actorUser,
      'SYNC_ID',
      'KELAS',
      'Mengurutkan Class ID sesuai Nama Kelas (' + sorted.length + ' kelas, ' + totalUpdatedRows + ' baris diperbarui)'
    );
  }

  return {
    classes: classObjects,
    idRemap: idRemap,
    total_updated_rows: totalUpdatedRows,
    updated_sheets: updatedSheets,
    details: details
  };
}

function reorderClassIdsAction_(user) {
  var report = reorderClassIdsByName_(user, false);
  SpreadsheetApp.flush();
  var remappedCount = Object.keys(report.idRemap || {}).length;
  var msg = report.total_updated_rows > 0
    ? 'Class ID berhasil diurutkan sesuai Nama Kelas (' + report.classes.length + ' kelas' + (remappedCount > 0 ? ', ' + remappedCount + ' ID diperbarui' : '') + ').'
    : 'Seluruh Class ID sudah urut sesuai Nama Kelas.';
  return jsonResponse_(true, msg, {
    classes: report.classes,
    total_updated_rows: report.total_updated_rows,
    updated_sheets: report.updated_sheets,
    details: report.details
  });
}

function ensureKelasIdsAndGet_() {
  return reorderClassIdsByName_(null, true).classes;
}

function createClass_(payload, user) {
  var existing = ensureKelasIdsAndGet_();
  var namaKelas = String(payload.nama_kelas || '').trim();
  if (!namaKelas) {
    return jsonResponse_(false, 'Nama Kelas wajib diisi.', null, 'VALIDATION_ERROR');
  }
  var idTahunAjaran = String(payload.id_tahun_ajaran || '').trim();
  var duplicate = existing.some(function(c) {
    return String(c.nama_kelas || '').trim().toLowerCase() === namaKelas.toLowerCase() &&
      (!idTahunAjaran || !c.id_tahun_ajaran || String(c.id_tahun_ajaran) === idTahunAjaran);
  });
  if (duplicate) {
    return jsonResponse_(false, 'Kelas "' + namaKelas + '" sudah terdaftar.', null, 'DUPLICATE_CLASS');
  }

  var waliId = String(payload.wali_kelas_id || '').trim();
  var waliNama = String(payload.wali_kelas || '').trim();
  if (waliId) {
    var teachers = readSheetObjects_('GURU');
    var tch = teachers.filter(function(g) { return g.id_guru === waliId; })[0];
    if (tch && isNonWaliTeacher_(tch)) {
      return jsonResponse_(false, 'Guru Mapel (PAI, PJOK, Mapel Lain) dan Kepala Sekolah bukan sebagai Wali Kelas dan tidak dapat ditugaskan menjadi Wali Kelas.', null, 'VALIDATION_ERROR');
    }
    if (tch) waliNama = tch.nama_guru;
  } else {
    waliNama = '';
  }

  var tahunAjaranNama = String(payload.tahun_ajaran || '').trim();
  if (idTahunAjaran && !tahunAjaranNama) {
    var years = readSheetObjects_('TAHUN_AJARAN');
    var foundY = years.filter(function(y) { return y.id_tahun_ajaran === idTahunAjaran; })[0];
    if (foundY) tahunAjaranNama = foundY.nama_tahun_ajaran;
  }

  var tempId = generateNextClassId_(existing);
  var now = nowIso_();
  var rec = {
    id_kelas: tempId,
    nama_kelas: namaKelas,
    tingkat: String(payload.tingkat || '').trim() || inferTingkatFromClassName_(namaKelas) || '1',
    wali_kelas_id: waliId,
    wali_kelas: waliNama,
    id_tahun_ajaran: idTahunAjaran,
    tahun_ajaran: tahunAjaranNama,
    created_at: now,
    updated_at: now
  };
  insertRow_('KELAS', rec);

  var reordered = reorderClassIdsByName_(user, true);
  var finalId = reordered.idRemap[tempId] || tempId;
  var finalRec = reordered.classes.filter(function(c) { return c.id_kelas === finalId; })[0] || rec;
  writeLog_(user, 'CREATE', 'KELAS', 'Tambah Kelas: ' + finalRec.nama_kelas + ' (' + finalRec.id_kelas + ')');

  if (waliId) {
    var classesAfter = reordered.classes;
    var teachersAll = readSheetObjects_('GURU');
    var tchRow = teachersAll.filter(function(g) { return g.id_guru === waliId; })[0];
    if (tchRow) {
      if (tchRow.wali_kelas_id && tchRow.wali_kelas_id !== finalRec.id_kelas) {
        var prevCls = classesAfter.filter(function(c) { return c.id_kelas === tchRow.wali_kelas_id; })[0];
        if (prevCls && prevCls.wali_kelas_id === waliId) {
          prevCls.wali_kelas_id = '';
          prevCls.wali_kelas = '';
          prevCls.updated_at = nowIso_();
          updateRowById_('KELAS', 'id_kelas', prevCls.id_kelas, prevCls);
        }
      }
      tchRow.wali_kelas_id = finalRec.id_kelas;
      tchRow.wali_kelas = finalRec.nama_kelas;
      tchRow.id_kelas = finalRec.id_kelas;
      tchRow.updated_at = nowIso_();
      updateRowById_('GURU', 'id_guru', tchRow.id_guru, tchRow);
    }
  }
  return jsonResponse_(true, 'Data kelas berhasil ditambahkan.', finalRec);
}

function updateClass_(payload, user) {
  var existing = ensureKelasIdsAndGet_();
  var idKelas = String(payload.id_kelas || '').trim();
  var namaKelas = payload.nama_kelas !== undefined ? String(payload.nama_kelas || '').trim() : undefined;
  if (!idKelas && namaKelas) {
    var byNama = existing.filter(function(c) {
      return String(c.nama_kelas || '').trim().toLowerCase() === namaKelas.toLowerCase();
    })[0];
    if (byNama) idKelas = byNama.id_kelas;
  }
  if (!idKelas) {
    return jsonResponse_(false, 'Class ID (id_kelas) wajib disertakan.', null, 'VALIDATION_ERROR');
  }
  var currentCls = existing.filter(function(c) { return String(c.id_kelas) === idKelas; })[0];
  if (!currentCls) {
    return jsonResponse_(false, 'Data kelas tidak ditemukan.', null, 'NOT_FOUND');
  }
  var nextNama = namaKelas !== undefined ? namaKelas : String(currentCls.nama_kelas || '').trim();
  if (!nextNama) {
    return jsonResponse_(false, 'Nama Kelas wajib diisi.', null, 'VALIDATION_ERROR');
  }
  var nextYearId = payload.id_tahun_ajaran !== undefined ? String(payload.id_tahun_ajaran || '').trim() : String(currentCls.id_tahun_ajaran || '').trim();
  var duplicate = existing.some(function(c) {
    return String(c.id_kelas || '') !== idKelas &&
      String(c.nama_kelas || '').trim().toLowerCase() === nextNama.toLowerCase() &&
      (!nextYearId || !c.id_tahun_ajaran || String(c.id_tahun_ajaran) === nextYearId);
  });
  if (duplicate) {
    return jsonResponse_(false, 'Kelas "' + nextNama + '" sudah terdaftar.', null, 'DUPLICATE_CLASS');
  }

  var waliId = payload.wali_kelas_id !== undefined ? String(payload.wali_kelas_id || '').trim() : undefined;
  var teachers = readSheetObjects_('GURU');
  if (waliId) {
    var tch = teachers.filter(function(g) { return g.id_guru === waliId; })[0];
    if (tch && isNonWaliTeacher_(tch)) {
      return jsonResponse_(false, 'Guru Mapel (PAI, PJOK, Mapel Lain) dan Kepala Sekolah bukan sebagai Wali Kelas dan tidak dapat ditugaskan menjadi Wali Kelas.', null, 'VALIDATION_ERROR');
    }
    if (tch) payload.wali_kelas = tch.nama_guru;
  } else if (waliId === '') {
    payload.wali_kelas = '';
  }

  var nextTahunAjaran = payload.tahun_ajaran !== undefined ? String(payload.tahun_ajaran || '').trim() : String(currentCls.tahun_ajaran || '').trim();
  if (nextYearId && !nextTahunAjaran) {
    var years = readSheetObjects_('TAHUN_AJARAN');
    var foundY = years.filter(function(y) { return y.id_tahun_ajaran === nextYearId; })[0];
    if (foundY) nextTahunAjaran = foundY.nama_tahun_ajaran;
  }

  var nextPayload = {
    id_kelas: idKelas,
    nama_kelas: nextNama,
    tingkat: String(payload.tingkat !== undefined ? payload.tingkat : currentCls.tingkat || '').trim() || inferTingkatFromClassName_(nextNama) || '1',
    wali_kelas_id: waliId !== undefined ? waliId : (currentCls.wali_kelas_id || ''),
    wali_kelas: payload.wali_kelas !== undefined ? payload.wali_kelas : (currentCls.wali_kelas || ''),
    id_tahun_ajaran: nextYearId,
    tahun_ajaran: nextTahunAjaran,
    updated_at: nowIso_()
  };
  var updated = updateRowById_('KELAS', 'id_kelas', idKelas, nextPayload);

  // Kosongkan wali kelas lama yang sebelumnya memegang kelas ini
  for (var i = 0; i < teachers.length; i++) {
    var g = teachers[i];
    if (g.wali_kelas_id === idKelas && g.id_guru !== updated.wali_kelas_id) {
      g.wali_kelas_id = '';
      g.wali_kelas = '';
      if (g.id_kelas === idKelas) g.id_kelas = '';
      g.updated_at = nowIso_();
      updateRowById_('GURU', 'id_guru', g.id_guru, g);
    }
  }

  if (updated.wali_kelas_id) {
    var tchRow = teachers.filter(function(g) { return g.id_guru === updated.wali_kelas_id; })[0];
    if (tchRow) {
      if (tchRow.wali_kelas_id && tchRow.wali_kelas_id !== idKelas) {
        var classes = readSheetObjects_('KELAS');
        var prevCls = classes.filter(function(c) { return c.id_kelas === tchRow.wali_kelas_id; })[0];
        if (prevCls && prevCls.wali_kelas_id === updated.wali_kelas_id) {
          prevCls.wali_kelas_id = '';
          prevCls.wali_kelas = '';
          prevCls.updated_at = nowIso_();
          updateRowById_('KELAS', 'id_kelas', prevCls.id_kelas, prevCls);
        }
      }
      tchRow.wali_kelas_id = updated.id_kelas;
      tchRow.wali_kelas = updated.nama_kelas;
      tchRow.id_kelas = updated.id_kelas;
      tchRow.updated_at = nowIso_();
      updateRowById_('GURU', 'id_guru', tchRow.id_guru, tchRow);
    }
  }
  if (String(currentCls.nama_kelas || '').trim() !== nextNama) {
    var students = readSheetObjects_('SISWA');
    for (var sIdx = 0; sIdx < students.length; sIdx++) {
      if (students[sIdx].id_kelas === idKelas && students[sIdx].nama_kelas !== nextNama) {
        students[sIdx].nama_kelas = nextNama;
        students[sIdx].updated_at = nowIso_();
        updateRowById_('SISWA', 'id_siswa', students[sIdx].id_siswa, students[sIdx]);
      }
    }
  }
  var reordered = reorderClassIdsByName_(user, true);
  var finalId = reordered.idRemap[idKelas] || idKelas;
  var finalCls = reordered.classes.filter(function(c) { return c.id_kelas === finalId; })[0] || updated;
  writeLog_(user, 'UPDATE', 'KELAS', 'Edit Kelas: ' + finalCls.nama_kelas + ' (' + finalCls.id_kelas + ')');
  return jsonResponse_(true, 'Data kelas berhasil diperbarui.', finalCls);
}

function deleteClass_(payload, user) {
  var existing = ensureKelasIdsAndGet_();
  var idKelas = String(payload.id_kelas || '').trim();
  if (!idKelas && payload.nama_kelas) {
    var nama = String(payload.nama_kelas || '').trim().toLowerCase();
    var byNama = existing.filter(function(c) {
      return String(c.nama_kelas || '').trim().toLowerCase() === nama;
    })[0];
    if (byNama) idKelas = byNama.id_kelas;
  }
  var res = deleteById_('KELAS', 'id_kelas', idKelas, user, 'Hapus Kelas');
  if (idKelas) {
    var teachers = readSheetObjects_('GURU');
    for (var i = 0; i < teachers.length; i++) {
      var g = teachers[i];
      if (g.wali_kelas_id === idKelas || g.id_kelas === idKelas) {
        if (g.wali_kelas_id === idKelas) {
          g.wali_kelas_id = '';
          g.wali_kelas = '';
        }
        if (g.id_kelas === idKelas) g.id_kelas = '';
        g.updated_at = nowIso_();
        updateRowById_('GURU', 'id_guru', g.id_guru, g);
      }
    }
  }
  reorderClassIdsByName_(user, true);
  return res;
}

function generateNextSubjectId_(existing) {
  var used = {};
  var maxNum = 0;
  for (var i = 0; i < existing.length; i++) {
    var raw = String(existing[i].id_mapel || '').trim().toUpperCase();
    if (!raw) continue;
    used[raw] = true;
    var match = raw.match(/^MPL[-_]?(\d+)$/);
    if (match) {
      var n = Number(match[1]);
      if (!isNaN(n) && n > maxNum) maxNum = n;
    }
  }
  var nextNum = Math.max(maxNum + 1, existing.length + 1, 1);
  var pad = function(num) {
    return num < 10 ? '00' + num : (num < 100 ? '0' + num : String(num));
  };
  var candidate = 'MPL-' + pad(nextNum);
  while (used[candidate]) {
    nextNum += 1;
    candidate = 'MPL-' + pad(nextNum);
  }
  return candidate;
}

function suggestSubjectCode_(namaMapel, existing) {
  var clean = String(namaMapel || '').trim().replace(/[^a-zA-Z0-9\s]/g, ' ').replace(/\s+/g, ' ');
  if (!clean) return '';
  var words = clean.split(' ').filter(function(w) { return w; });
  var base = words.length >= 2
    ? words.slice(0, 4).map(function(w) { return w.charAt(0).toUpperCase(); }).join('')
    : clean.slice(0, 3).toUpperCase();
  var used = {};
  for (var i = 0; i < existing.length; i++) {
    var k = String(existing[i].kode_mapel || '').trim().toUpperCase();
    if (k) used[k] = true;
  }
  if (!used[base]) return base;
  var suffix = 2;
  while (used[base + suffix]) suffix += 1;
  return base + suffix;
}

function ensureMapelIdsAndGet_() {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName('MAPEL');
  if (!sheet) return [];
  ensureMapelSheetStructure_(sheet);
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return [];
  var values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var layout = resolveSheetLayout_('MAPEL', values);
  var fields = layout.fields;
  var startRow = layout.dataStartRow;
  var idCol = fields.indexOf('id_mapel');
  var statusCol = fields.indexOf('status_aktif');
  var rows = readSheetObjects_('MAPEL');
  var updated = false;

  if (idCol !== -1) {
    for (var r = startRow; r < values.length; r++) {
      var hasContent = false;
      for (var c = 0; c < values[r].length; c++) {
        if (values[r][c] !== '' && values[r][c] !== null && values[r][c] !== undefined) {
          hasContent = true;
          break;
        }
      }
      if (!hasContent) continue;
      var curId = String(values[r][idCol] || '').trim();
      if (!curId) {
        var newId = generateNextSubjectId_(rows);
        sheet.getRange(r + 1, idCol + 1).setValue(newId);
        values[r][idCol] = newId;
        rows.push({ id_mapel: newId });
        updated = true;
      }
      if (statusCol !== -1 && !String(values[r][statusCol] || '').trim()) {
        sheet.getRange(r + 1, statusCol + 1).setValue('Aktif');
        updated = true;
      }
    }
  }
  return updated ? readSheetObjects_('MAPEL') : rows;
}

function createSubject_(payload, user) {
  var existing = ensureMapelIdsAndGet_();
  var nama = String(payload.nama_mapel || '').trim();
  var kode = String(payload.kode_mapel || '').trim().toUpperCase();
  if (!kode && nama) {
    kode = suggestSubjectCode_(nama, existing);
  }
  if (!kode || !nama) {
    return jsonResponse_(false, 'Kode dan Nama Mata Pelajaran wajib diisi.', null, 'VALIDATION_ERROR');
  }
  if (existing.some(function(m) { return String(m.kode_mapel || '').trim().toLowerCase() === kode.toLowerCase(); })) {
    return jsonResponse_(false, 'Kode mata pelajaran "' + kode + '" sudah digunakan.', null, 'DUPLICATE_CODE');
  }
  var requestedId = String(payload.id_mapel || '').trim();
  var idExists = requestedId && existing.some(function(m) { return String(m.id_mapel || '').trim() === requestedId; });
  var now = nowIso_();
  var rec = {
    id_mapel: (requestedId && !idExists) ? requestedId : generateNextSubjectId_(existing),
    kode_mapel: kode,
    nama_mapel: nama,
    kelompok: payload.kelompok || 'Wajib',
    alokasi_waktu: Number(payload.alokasi_waktu) > 0 ? Number(payload.alokasi_waktu) : 2,
    status_aktif: payload.status_aktif || 'Aktif',
    created_at: now,
    updated_at: now
  };
  insertRow_('MAPEL', rec);
  writeLog_(user, 'CREATE', 'MAPEL', 'Tambah Mata Pelajaran: ' + rec.nama_mapel + ' (' + rec.id_mapel + ')');
  return jsonResponse_(true, 'Mata pelajaran berhasil ditambahkan.', rec);
}

function updateSubject_(payload, user) {
  var existing = ensureMapelIdsAndGet_();
  var targetId = String(payload.id_mapel || '').trim();
  var kode = String(payload.kode_mapel || '').trim().toUpperCase();
  var nama = String(payload.nama_mapel || '').trim();
  if (!targetId && kode) {
    var byKode = existing.filter(function(m) {
      return String(m.kode_mapel || '').trim().toUpperCase() === kode;
    })[0];
    if (byKode) targetId = byKode.id_mapel;
  }
  if (!targetId) {
    return jsonResponse_(false, 'ID Mata Pelajaran wajib disertakan.', null, 'VALIDATION_ERROR');
  }
  if (!kode || !nama) {
    return jsonResponse_(false, 'Kode dan Nama Mata Pelajaran wajib diisi.', null, 'VALIDATION_ERROR');
  }
  if (existing.some(function(m) {
    return String(m.id_mapel || '').trim() !== targetId &&
      String(m.kode_mapel || '').trim().toLowerCase() === kode.toLowerCase();
  })) {
    return jsonResponse_(false, 'Kode mata pelajaran "' + kode + '" sudah digunakan.', null, 'DUPLICATE_CODE');
  }
  var nextPayload = {
    id_mapel: targetId,
    kode_mapel: kode,
    nama_mapel: nama,
    kelompok: payload.kelompok || 'Wajib',
    alokasi_waktu: Number(payload.alokasi_waktu) > 0 ? Number(payload.alokasi_waktu) : 2,
    status_aktif: payload.status_aktif || 'Aktif',
    updated_at: nowIso_()
  };
  var updated = updateRowById_('MAPEL', 'id_mapel', targetId, nextPayload);
  writeLog_(user, 'UPDATE', 'MAPEL', 'Edit Mata Pelajaran: ' + nextPayload.nama_mapel + ' (' + targetId + ')');
  return jsonResponse_(true, 'Mata pelajaran berhasil diperbarui.', updated);
}

function deleteSubject_(payload, user) {
  var existing = ensureMapelIdsAndGet_();
  var targetId = String(payload.id_mapel || '').trim();
  if (!targetId && payload.kode_mapel) {
    var kode = String(payload.kode_mapel || '').trim().toUpperCase();
    var byKode = existing.filter(function(m) {
      return String(m.kode_mapel || '').trim().toUpperCase() === kode;
    })[0];
    if (byKode) targetId = byKode.id_mapel;
  }
  return deleteById_('MAPEL', 'id_mapel', targetId, user, 'Hapus Mapel');
}

function saveAttendanceBatch_(payload, user) {
  var records = payload.records || [];
  if (!records.length) return jsonResponse_(false, 'Tidak ada data absensi untuk disimpan.', null, 'EMPTY');
  var classes = readSheetObjects_('KELAS');
  var students = readSheetObjects_('SISWA');
  if (user.role === 'GURU') {
    var scope = getTeacherAccessScope_(user);
    if (!scope.isFullAccess && Object.keys(scope.classIds).length > 0) {
      for (var k = 0; k < records.length; k++) {
        var checkRec = enrichAttendanceRow_(records[k], classes, students);
        if (checkRec.id_kelas && !scope.classIds[checkRec.id_kelas]) {
          return jsonResponse_(false, 'Anda hanya dapat menyimpan absensi pada kelas yang Anda ampu.', null, 'FORBIDDEN');
        }
      }
    }
  }
  var existing = readSheetObjects_('ABSENSI').map(function(r) {
    return enrichAttendanceRow_(r, classes, students);
  });
  var now = nowIso_();
  var saved = [];
  var toInsert = [];

  for (var i = 0; i < records.length; i++) {
    var rec = enrichAttendanceRow_(records[i], classes, students);
    var match = null;
    for (var j = 0; j < existing.length; j++) {
      var ex = existing[j];
      var sameDate = ex.tanggal === rec.tanggal;
      if (!sameDate) continue;
      if (rec.id_siswa && ex.id_siswa === rec.id_siswa) {
        match = ex;
        break;
      }
      if (
        (!ex.id_siswa || !rec.id_siswa) &&
        rec.nama_siswa &&
        normSyncText_(ex.nama_siswa) === normSyncText_(rec.nama_siswa) &&
        (!rec.id_kelas || !ex.id_kelas || ex.id_kelas === rec.id_kelas)
      ) {
        match = ex;
        break;
      }
    }
    if (match && match.id_absensi) {
      if (!rec.koreksi_catatan && match.status !== rec.status) {
        rec.koreksi_catatan = 'Koreksi oleh ' + user.nama_lengkap + ' pada ' + now;
      }
      rec.id_absensi = match.id_absensi;
      rec.created_at = match.created_at || now;
      rec.updated_at = now;
      rec.diinput_oleh = user.nama_lengkap;
      var unchanged =
        match.status === rec.status &&
        String(match.keterangan || '') === String(rec.keterangan || '') &&
        String(match.koreksi_catatan || '') === String(rec.koreksi_catatan || '') &&
        String(match.id_siswa || '') === String(rec.id_siswa || '') &&
        String(match.id_kelas || '') === String(rec.id_kelas || '') &&
        String(match.nama_siswa || '') === String(rec.nama_siswa || '') &&
        String(match.nama_kelas || '') === String(rec.nama_kelas || '');
      if (!unchanged) {
        updateRowById_('ABSENSI', 'id_absensi', match.id_absensi, rec);
      }
      saved.push(rec);
    } else {
      rec.id_absensi = generateId_('ABS');
      rec.diinput_oleh = user.nama_lengkap;
      rec.created_at = now;
      rec.updated_at = now;
      toInsert.push(rec);
      saved.push(rec);
    }
  }
  if (toInsert.length > 0) {
    insertRowsBatch_('ABSENSI', toInsert);
  }
  SpreadsheetApp.flush();
  writeLog_(user, 'SAVE', 'ABSENSI', 'Menyimpan ' + saved.length + ' entri absensi');
  return jsonResponse_(true, saved.length + ' data absensi berhasil disimpan.', saved);
}

function saveGradesBatch_(payload, user) {
  var records = payload.records || [];
  if (!records.length) return jsonResponse_(false, 'Tidak ada data nilai untuk disimpan.', null, 'EMPTY');
  if (user.role === 'GURU') {
    var scope = getTeacherAccessScope_(user);
    if (!scope.isFullAccess && Object.keys(scope.classIds).length > 0) {
      for (var k = 0; k < records.length; k++) {
        if (records[k].id_kelas && !scope.classIds[records[k].id_kelas]) {
          return jsonResponse_(false, 'Anda hanya dapat menyimpan nilai pada kelas yang Anda ampu.', null, 'FORBIDDEN');
        }
      }
    }
  }
  var existing = readSheetObjects_('NILAI');
  var now = nowIso_();
  var saved = [];

  for (var i = 0; i < records.length; i++) {
    var rec = records[i];
    var fields = ['sum_1', 'sum_2', 'sum_3', 'sum_4', 'sas'];
    var sum = 0;
    var count = 0;
    for (var f = 0; f < fields.length; f++) {
      var val = rec[fields[f]];
      if (val !== '' && val !== null && val !== undefined) {
        var num = Number(val);
        if (isNaN(num) || num < 0 || num > 100) {
          return jsonResponse_(false, 'Nilai harus berada di rentang 0 sampai 100.', null, 'INVALID_GRADE');
        }
        sum += num;
        count++;
      }
    }
    rec.jumlah_komponen = count;
    rec.rata_rata = count > 0 ? Math.round((sum / count) * 100) / 100 : '';

    var match = null;
    for (var j = 0; j < existing.length; j++) {
      if (
        existing[j].id_siswa === rec.id_siswa &&
        existing[j].id_mapel === rec.id_mapel &&
        existing[j].id_tahun_ajaran === rec.id_tahun_ajaran &&
        existing[j].semester === rec.semester
      ) {
        match = existing[j];
        break;
      }
    }
    if (match) {
      rec.id_nilai = match.id_nilai;
      rec.created_at = match.created_at;
      rec.updated_at = now;
      updateRowById_('NILAI', 'id_nilai', match.id_nilai, rec);
    } else {
      rec.id_nilai = generateId_('NIL');
      rec.created_at = now;
      rec.updated_at = now;
      insertRow_('NILAI', rec);
    }
    saved.push(rec);
  }
  writeLog_(user, 'SAVE', 'NILAI', 'Menyimpan ' + saved.length + ' nilai siswa');
  return jsonResponse_(true, saved.length + ' data nilai berhasil disimpan.', saved);
}

function createLiaisonMessage_(payload, user) {
  if (user.role === 'ORANG_TUA' && payload.id_siswa !== user.relasi_id) {
    return jsonResponse_(false, 'Anda hanya dapat mengirim pesan untuk anak Anda.', null, 'FORBIDDEN');
  }
  var now = nowIso_();
  payload.id_penghubung = generateId_('PHB');
  payload.pengirim_id = user.id_user;
  payload.pengirim_nama = user.nama_lengkap;
  payload.pengirim_role = user.role;
  payload.status_baca = 'Terkirim';
  payload.created_at = now;
  payload.updated_at = now;
  insertRow_('PENGHUBUNG', payload);
  writeLog_(user, 'CREATE', 'PENGHUBUNG', 'Mengirim pesan buku penghubung untuk ' + payload.nama_siswa);
  return jsonResponse_(true, 'Pesan berhasil dikirim.', payload);
}

function confirmLiaisonMessage_(payload, user) {
  var rows = readSheetObjects_('PENGHUBUNG');
  var target = rows.filter(function(r) { return r.id_penghubung === payload.id_penghubung; })[0];
  if (!target) return jsonResponse_(false, 'Pesan tidak ditemukan.', null, 'NOT_FOUND');
  if (user.role === 'ORANG_TUA' && target.id_siswa !== user.relasi_id) {
    return jsonResponse_(false, 'Akses ditolak.', null, 'FORBIDDEN');
  }
  target.status_baca = payload.status_baca || 'Dikonfirmasi';
  target.catatan_konfirmasi = payload.catatan_konfirmasi || target.catatan_konfirmasi;
  target.updated_at = nowIso_();
  updateRowById_('PENGHUBUNG', 'id_penghubung', target.id_penghubung, target);
  return jsonResponse_(true, 'Status pesan diperbarui.', target);
}

function createUser_(payload, user) {
  var role = String(payload.role || 'GURU').trim().toUpperCase();
  var relasiId = String(payload.relasi_id || '').trim();
  var username = String(payload.username || '').trim();
  var password = String(payload.password || '').trim();
  var namaLengkap = String(payload.nama_lengkap || '').trim();

  var relasiNama = String(payload.relasi_nama || '').trim();

  if ((role === 'GURU' || role === 'KEPALA_SEKOLAH') && relasiId) {
    var teachers = readSheetObjects_('GURU');
    var foundT = teachers.filter(function(t) { return t.id_guru === relasiId; })[0];
    if (foundT) {
      if (foundT.nip) {
        username = String(foundT.nip).trim();
        password = String(foundT.nip).trim();
      }
      if (!namaLengkap) namaLengkap = foundT.nama_guru;
      if (!relasiNama) relasiNama = foundT.nama_guru;
    }
  } else if (role === 'ORANG_TUA' && relasiId) {
    var students = readSheetObjects_('SISWA');
    var foundS = students.filter(function(s) { return s.id_siswa === relasiId; })[0];
    if (foundS) {
      if (foundS.nis) {
        username = String(foundS.nis).trim();
        password = String(foundS.nis).trim();
      }
      if (!namaLengkap) namaLengkap = 'Wali dari ' + foundS.nama_lengkap;
      if (!relasiNama) relasiNama = foundS.nama_lengkap;
    }
  }

  if (!username || !password || !namaLengkap) {
    return jsonResponse_(false, 'Username, password, dan nama lengkap wajib diisi.', null, 'VALIDATION_ERROR');
  }

  var fotoUrl = String(payload.foto_url || '');
  if (fotoUrl.length > 49500) {
    return jsonResponse_(false, 'Ukuran data foto Base64 melebihi batas sel spreadsheet.', null, 'VALIDATION_ERROR');
  }
  var existing = readSheetObjects_('USERS');
  if (existing.some(function(u) { return String(u.username || '').trim().toLowerCase() === username.toLowerCase(); })) {
    return jsonResponse_(false, 'Username "' + username + '" sudah digunakan.', null, 'DUPLICATE_USERNAME');
  }
  var now = nowIso_();
  var newUser = {
    id_user: generateId_('USR'),
    username: username,
    password: password,
    nama_lengkap: namaLengkap,
    role: role,
    relasi_id: relasiId,
    relasi_nama: relasiNama,
    status: payload.status || 'Aktif',
    foto_url: fotoUrl,
    created_at: now,
    updated_at: now
  };
  insertRow_('USERS', newUser);
  writeLog_(user, 'CREATE', 'USERS', 'Menambah akun pengguna ' + username + ' (' + newUser.role + ')');
  return jsonResponse_(true, 'Pengguna berhasil ditambahkan.', serializeUserForAdmin_(newUser));
}

function updateUser_(payload, user) {
  var id = payload.id_user;
  var existing = readSheetObjects_('USERS');
  var current = existing.filter(function(u) { return u.id_user === id; })[0];
  if (!current) return jsonResponse_(false, 'Pengguna tidak ditemukan.', null, 'NOT_FOUND');

  var role = payload.role !== undefined ? String(payload.role).trim().toUpperCase() : current.role;
  var relasiId = payload.relasi_id !== undefined ? String(payload.relasi_id || '').trim() : current.relasi_id;
  var relasiChanged = payload.relasi_id !== undefined && String(payload.relasi_id || '').trim() !== String(current.relasi_id || '').trim();
  var hasNewPassword = payload.new_password !== undefined && String(payload.new_password).trim() !== '';
  var username = String(payload.username !== undefined ? payload.username : current.username).trim();
  var nextPassword = hasNewPassword ? String(payload.new_password).trim() : current.password;

  if ((role === 'GURU' || role === 'KEPALA_SEKOLAH') && relasiId) {
    var teachers = readSheetObjects_('GURU');
    var foundT = teachers.filter(function(t) { return t.id_guru === relasiId; })[0];
    if (foundT && foundT.nip && String(foundT.nip).trim() !== '-') {
      if (!username || (relasiChanged && payload.username === undefined)) username = String(foundT.nip).trim();
      if (!hasNewPassword && (!nextPassword || relasiChanged)) nextPassword = String(foundT.nip).trim();
    }
  } else if (role === 'ORANG_TUA' && relasiId) {
    var students = readSheetObjects_('SISWA');
    var foundS = students.filter(function(s) { return s.id_siswa === relasiId; })[0];
    if (foundS && foundS.nis) {
      if (!username || (relasiChanged && payload.username === undefined)) username = String(foundS.nis).trim();
      if (!hasNewPassword && (!nextPassword || relasiChanged)) nextPassword = String(foundS.nis).trim();
    }
  }

  if (existing.some(function(u) { return u.id_user !== id && String(u.username || '').trim().toLowerCase() === username.toLowerCase(); })) {
    return jsonResponse_(false, 'Username "' + username + '" sudah digunakan pengguna lain.', null, 'DUPLICATE_USERNAME');
  }

  var nextFoto = payload.foto_url !== undefined ? String(payload.foto_url || '') : (current.foto_url || '');
  if (nextFoto.length > 49500) {
    return jsonResponse_(false, 'Ukuran data foto Base64 melebihi batas sel spreadsheet.', null, 'VALIDATION_ERROR');
  }

  var merged = {
    id_user: id,
    username: username,
    password: nextPassword,
    nama_lengkap: payload.nama_lengkap !== undefined ? payload.nama_lengkap : current.nama_lengkap,
    role: role,
    relasi_id: relasiId,
    relasi_nama: payload.relasi_nama !== undefined ? payload.relasi_nama : current.relasi_nama,
    status: payload.status !== undefined ? payload.status : current.status,
    foto_url: nextFoto,
    created_at: current.created_at,
    updated_at: nowIso_()
  };
  updateRowById_('USERS', 'id_user', id, merged);
  writeLog_(user, 'UPDATE', 'USERS', 'Memperbarui akun ' + username);
  return jsonResponse_(true, 'Data pengguna berhasil diperbarui.', serializeUserForAdmin_(merged));
}

function updateOwnProfile_(payload, user, token) {
  var existing = readSheetObjects_('USERS');
  var current = existing.filter(function(u) {
    return (user.id_user && u.id_user === user.id_user) ||
      (user.username && String(u.username || '').trim().toLowerCase() === String(user.username).trim().toLowerCase());
  })[0];
  if (!current) return jsonResponse_(false, 'Akun pengguna tidak ditemukan.', null, 'NOT_FOUND');

  var nextFoto = payload.foto_url !== undefined ? String(payload.foto_url || '') : (current.foto_url || '');
  if (nextFoto.length > 49500) {
    return jsonResponse_(false, 'Ukuran data foto Base64 melebihi batas sel spreadsheet.', null, 'VALIDATION_ERROR');
  }

  var nextName = payload.nama_lengkap !== undefined && String(payload.nama_lengkap).trim() !== ''
    ? String(payload.nama_lengkap).trim()
    : current.nama_lengkap;

  var merged = {
    id_user: current.id_user,
    username: current.username,
    password: current.password,
    nama_lengkap: nextName,
    role: current.role,
    relasi_id: current.relasi_id,
    relasi_nama: current.relasi_nama,
    status: current.status,
    foto_url: nextFoto,
    created_at: current.created_at,
    updated_at: nowIso_()
  };
  updateRowById_('USERS', 'id_user', current.id_user, merged);

  var sanitized = sanitizeUser_(merged);
  if (token) {
    var cache = CacheService.getScriptCache();
    var raw = cache.get('SESSION_' + token);
    var expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
    if (raw) {
      try {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.expires_at) expiresAt = parsed.expires_at;
      } catch (e) {}
    }
    cache.put('SESSION_' + token, JSON.stringify({ user: sanitized, expires_at: expiresAt }), 21600);
  }

  writeLog_(user, 'UPDATE', 'PROFIL', 'Memperbarui profil & foto akun');
  return jsonResponse_(true, 'Profil akun berhasil diperbarui.', sanitized);
}

function buildDashboard_(user, payload) {
  var filterClassId = payload && payload.id_kelas ? String(payload.id_kelas).trim() : '';
  var baseStudents = getScopedStudents_(user);
  var teachers = readSheetObjects_('GURU');
  var allowedClasses = getClassesWithCount_(user);
  var hasAllowedFilter = filterClassId !== '' && allowedClasses.some(function(c) { return c.id_kelas === filterClassId; });
  var students = hasAllowedFilter ? baseStudents.filter(function(s) { return s.id_kelas === filterClassId; }) : baseStudents;
  var classes = hasAllowedFilter ? allowedClasses.filter(function(c) { return c.id_kelas === filterClassId; }) : allowedClasses;
  var subjects = readSheetObjects_('MAPEL');
  var attendance = getScopedAttendance_(user).filter(function(a) { return !hasAllowedFilter || a.id_kelas === filterClassId; });
  var grades = getScopedByStudentOrClass_('NILAI', user).filter(function(g) { return !hasAllowedFilter || g.id_kelas === filterClassId; });
  var achievements = getScopedByStudentOrClass_('PRESTASI', user).filter(function(p) { return !hasAllowedFilter || p.id_kelas === filterClassId; });
  var agendas = getScopedAgendas_(user);
  var logs = (user.role === 'ADMIN' || user.role === 'KEPALA_SEKOLAH')
    ? readSheetObjects_('LOG_AKTIVITAS').slice(-10).reverse()
    : [];

  var totalHadir = 0;
  var totalTidakHadir = 0;
  var statusCounts = { Hadir: 0, Sakit: 0, Izin: 0, Alpha: 0 };
  attendance.forEach(function(a) {
    var st = normalizeAttendanceStatusStr_(a.status);
    if (statusCounts[st] !== undefined) statusCounts[st]++;
    if (st === 'Hadir') totalHadir++;
    else totalTidakHadir++;
  });
  var pctKehadiran = attendance.length > 0 ? Math.round((totalHadir / attendance.length) * 1000) / 10 : 0;

  var siswaPerKelas = classes.map(function(c) {
    var cid = String(c.id_kelas || '').trim();
    var cname = normSyncText_(c.nama_kelas);
    var ccomp = compactClassKey_(c.nama_kelas);
    var countL = 0;
    var countP = 0;
    for (var si = 0; si < baseStudents.length; si++) {
      var st = baseStudents[si];
      var sCid = String(st.id_kelas || '').trim();
      var sCname = normSyncText_(st.nama_kelas);
      var sCcomp = compactClassKey_(st.nama_kelas);
      var inClass = (cid && sCid === cid) ||
        (cname && sCname === cname) ||
        (ccomp && sCcomp === ccomp);
      if (!inClass) continue;
      var jk = String(st.jenis_kelamin || '').trim().toLowerCase();
      if (jk === 'l' || jk === 'lk' || jk.indexOf('laki') === 0 || jk === 'pria' || jk === 'male' || jk === 'm') {
        countL++;
      } else if (jk === 'p' || jk === 'pr' || jk.indexOf('perempuan') === 0 || jk === 'wanita' || jk === 'female' || jk === 'f') {
        countP++;
      }
    }
    return {
      nama_kelas: c.nama_kelas,
      jumlah: c.jumlah_siswa || 0,
      jumlah_l: countL,
      jumlah_p: countP
    };
  });

  var mapelGradeMap = {};
  grades.forEach(function(g) {
    if (g.rata_rata !== '' && g.rata_rata !== null && g.rata_rata !== undefined && !isNaN(Number(g.rata_rata))) {
      var key = g.nama_mapel || g.id_mapel;
      if (!mapelGradeMap[key]) mapelGradeMap[key] = { sum: 0, count: 0 };
      mapelGradeMap[key].sum += Number(g.rata_rata);
      mapelGradeMap[key].count += 1;
    }
  });
  var perkembanganNilai = Object.keys(mapelGradeMap).map(function(k) {
    return { nama_mapel: k, rata_rata: Math.round((mapelGradeMap[k].sum / mapelGradeMap[k].count) * 100) / 100 };
  });

  var prestasiMap = {};
  achievements.forEach(function(p) {
    var t = p.tingkat || 'Sekolah';
    prestasiMap[t] = (prestasiMap[t] || 0) + 1;
  });
  var prestasiChart = Object.keys(prestasiMap).map(function(k) {
    return { tingkat: k, jumlah: prestasiMap[k] };
  });

  var today = new Date().toISOString().slice(0, 10);
  var upcomingAgendas = agendas
    .filter(function(a) { return !a.tanggal || a.tanggal >= today; })
    .sort(function(a, b) { return String(a.tanggal).localeCompare(String(b.tanggal)); })
    .slice(0, 5);

  return {
    total_siswa: students.length,
    total_guru: user.role === 'ORANG_TUA' ? 0 : teachers.length,
    total_kelas: classes.length,
    total_mapel: subjects.filter(function(m) { return m.status_aktif === 'Aktif'; }).length,
    persentase_kehadiran: pctKehadiran,
    jumlah_tidak_hadir: totalTidakHadir,
    siswa_per_kelas: siswaPerKelas,
    kehadiran_chart: Object.keys(statusCounts).map(function(s) { return { status: s, jumlah: statusCounts[s] }; }),
    perkembangan_nilai: perkembanganNilai,
    prestasi_chart: prestasiChart,
    aktivitas_terbaru: logs,
    agenda_terdekat: upcomingAgendas
  };
}

function buildReports_(user) {
  return {
    students: getScopedStudents_(user),
    classes: getClassesWithCount_(user),
    subjects: readSheetObjects_('MAPEL'),
    attendance: getScopedAttendance_(user),
    grades: getScopedByStudentOrClass_('NILAI', user),
    achievements: getScopedByStudentOrClass_('PRESTASI', user)
  };
}

function exportAllSafeData_(user) {
  var result = {};
  var names = Object.keys(SHEETS_SCHEMA);
  for (var i = 0; i < names.length; i++) {
    var name = names[i];
    if (name === 'USERS') {
      result[name] = readSheetObjects_('USERS').map(serializeUserForAdmin_);
    } else {
      result[name] = readSheetObjects_(name);
    }
  }
  writeLog_(user, 'BACKUP', 'DATABASE', 'Mengekspor cadangan seluruh database');
  return jsonResponse_(true, 'Backup database siap diunduh.', result);
}

// ============================================================================
// SINKRONISASI & KONEKSI SELURUH ID ANTAR DOKUMEN (21 SHEETS)
// ============================================================================

function normSyncText_(val) {
  return String(val === undefined || val === null ? '' : val)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function compactClassKey_(val) {
  return normSyncText_(val)
    .replace(/^(kelas|rombel|kls)\s+/i, '')
    .replace(/[\s\-_]+/g, '');
}

function stripAcademicTitles_(name) {
  var s = normSyncText_(name);
  if (!s) return '';
  s = s.replace(/^(drs\.?|dr\.?|prof\.?|ir\.?|h\.?|hj\.?)\s+/g, '');
  s = s.replace(/,\s*(s\.?pd\.?i?|m\.?pd|s\.?ag|s\.?or|s\.?kom|s\.?si|s\.?e|s\.?h|m\.?m|m\.?ag|gr\.?|a\.?ma).*$/g, '');
  return s.replace(/[.,]+/g, '').replace(/\s+/g, ' ').trim();
}

function patchSheetColumns_(sheetName, mutatorFn) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return 0;
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return 0;
  var values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var layout = resolveSheetLayout_(sheetName, values);
  var fields = layout.fields;
  var startRow = layout.dataStartRow;
  if (values.length <= startRow) return 0;

  var colIndexMap = {};
  for (var fi = 0; fi < fields.length; fi++) {
    if (fields[fi] && colIndexMap[fields[fi]] === undefined) {
      colIndexMap[fields[fi]] = fi;
    }
  }

  var tz = ss.getSpreadsheetTimeZone() || Session.getScriptTimeZone() || 'Asia/Jakarta';
  var dirtyCols = {};
  var updatedRowCount = 0;
  for (var r = startRow; r < values.length; r++) {
    var rowArr = values[r];
    var hasContent = false;
    var rowObj = {};
    for (var c = 0; c < fields.length; c++) {
      var rawVal = c < rowArr.length ? rowArr[c] : '';
      if (rawVal !== '' && rawVal !== null && rawVal !== undefined) hasContent = true;
      rowObj[fields[c]] = rawVal instanceof Date ? formatSheetDateValue_(rawVal, fields[c], tz) : rawVal;
    }
    if (!hasContent) continue;

    var patch = mutatorFn(rowObj, r);
    if (!patch) continue;
    var rowChanged = false;
    var patchKeys = Object.keys(patch);
    for (var k = 0; k < patchKeys.length; k++) {
      var key = patchKeys[k];
      var colIdx = colIndexMap[key];
      if (colIdx === undefined || colIdx === -1) continue;
      var nextVal = patch[key] !== undefined && patch[key] !== null ? patch[key] : '';
      var curRaw = colIdx < rowArr.length ? rowArr[colIdx] : '';
      var curCmp = curRaw instanceof Date
        ? formatSheetDateValue_(curRaw, key, tz)
        : String(curRaw !== undefined && curRaw !== null ? curRaw : '');
      var nextCmp = String(nextVal);
      if (curCmp !== nextCmp) {
        rowArr[colIdx] = nextVal;
        dirtyCols[colIdx] = true;
        rowChanged = true;
      }
    }
    if (rowChanged) updatedRowCount++;
  }

  var dirtyColIndices = Object.keys(dirtyCols);
  if (dirtyColIndices.length > 0) {
    var numDataRows = values.length - startRow;
    for (var d = 0; d < dirtyColIndices.length; d++) {
      var ci = Number(dirtyColIndices[d]);
      var colMatrix = [];
      for (var rr = startRow; rr < values.length; rr++) {
        colMatrix.push([values[rr][ci]]);
      }
      var colRange = sheet.getRange(startRow + 1, ci + 1, numDataRows, 1);
      if (sheetName === 'USERS' && (fields[ci] === 'username' || fields[ci] === 'password')) {
        colRange.setNumberFormat('@');
      }
      colRange.setValues(colMatrix);
    }
  }
  return updatedRowCount;
}

function buildSyncMaps_(years, classes, subjects, teachers, students, users) {
  var yearById = {};
  var yearByName = {};
  var activeYear = null;
  for (var yi = 0; yi < (years || []).length; yi++) {
    var y = years[yi];
    var yid = String(y.id_tahun_ajaran || '').trim();
    if (yid) yearById[yid] = y;
    var yname = normSyncText_(y.nama_tahun_ajaran);
    if (yname) {
      if (!yearByName[yname]) yearByName[yname] = [];
      yearByName[yname].push(y);
    }
    if (String(y.status || '').trim().toLowerCase() === 'aktif' && !activeYear) {
      activeYear = y;
    }
  }
  if (!activeYear && years && years.length > 0) activeYear = years[0];

  var classById = {};
  var classByName = {};
  var classByCompact = {};
  for (var ci = 0; ci < (classes || []).length; ci++) {
    var c = classes[ci];
    var cid = String(c.id_kelas || '').trim();
    if (cid) classById[cid] = c;
    var cname = normSyncText_(c.nama_kelas);
    if (cname && !classByName[cname]) classByName[cname] = c;
    var ccomp = compactClassKey_(c.nama_kelas);
    if (ccomp) {
      if (classByCompact[ccomp] === undefined) classByCompact[ccomp] = c;
      else if (classByCompact[ccomp] !== c) classByCompact[ccomp] = null;
    }
  }

  var subjectById = {};
  var subjectByName = {};
  var subjectByCode = {};
  for (var si = 0; si < (subjects || []).length; si++) {
    var m = subjects[si];
    var mid = String(m.id_mapel || '').trim();
    if (mid) subjectById[mid] = m;
    var mname = normSyncText_(m.nama_mapel);
    if (mname && !subjectByName[mname]) subjectByName[mname] = m;
    var mcode = normSyncText_(m.kode_mapel);
    if (mcode && !subjectByCode[mcode]) subjectByCode[mcode] = m;
  }

  var teacherById = {};
  var teacherByName = {};
  var teacherByNip = {};
  var teacherByUsername = {};
  var teacherByCleanName = {};
  for (var ti = 0; ti < (teachers || []).length; ti++) {
    var t = teachers[ti];
    var tid = String(t.id_guru || '').trim();
    if (tid) teacherById[tid] = t;
    var tname = normSyncText_(t.nama_guru);
    if (tname && !teacherByName[tname]) teacherByName[tname] = t;
    var tnip = normSyncText_(t.nip);
    if (tnip && !teacherByNip[tnip]) teacherByNip[tnip] = t;
    var tuname = normSyncText_(t.username);
    if (tuname && !teacherByUsername[tuname]) teacherByUsername[tuname] = t;
    var tclean = stripAcademicTitles_(t.nama_guru);
    if (tclean) {
      if (teacherByCleanName[tclean] === undefined) teacherByCleanName[tclean] = t;
      else if (teacherByCleanName[tclean] !== t) teacherByCleanName[tclean] = null;
    }
  }

  var studentById = {};
  var studentByNis = {};
  var studentByNisn = {};
  var studentByName = {};
  for (var sti = 0; sti < (students || []).length; sti++) {
    var s = students[sti];
    var sid = String(s.id_siswa || '').trim();
    if (sid) studentById[sid] = s;
    var snis = normSyncText_(s.nis);
    if (snis && !studentByNis[snis]) studentByNis[snis] = s;
    var snisn = normSyncText_(s.nisn);
    if (snisn && !studentByNisn[snisn]) studentByNisn[snisn] = s;
    var sname = normSyncText_(s.nama_lengkap);
    if (sname) {
      if (!studentByName[sname]) studentByName[sname] = [];
      studentByName[sname].push(s);
    }
  }

  var userById = {};
  var userByUsername = {};
  var userByName = {};
  for (var ui = 0; ui < (users || []).length; ui++) {
    var u = users[ui];
    var uid = String(u.id_user || '').trim();
    if (uid) userById[uid] = u;
    var uuname = normSyncText_(u.username);
    if (uuname && !userByUsername[uuname]) userByUsername[uuname] = u;
    var unama = normSyncText_(u.nama_lengkap);
    if (unama && !userByName[unama]) userByName[unama] = u;
  }

  return {
    years: years || [],
    classes: classes || [],
    subjects: subjects || [],
    teachers: teachers || [],
    students: students || [],
    users: users || [],
    yearById: yearById,
    yearByName: yearByName,
    activeYear: activeYear,
    classById: classById,
    classByName: classByName,
    classByCompact: classByCompact,
    subjectById: subjectById,
    subjectByName: subjectByName,
    subjectByCode: subjectByCode,
    teacherById: teacherById,
    teacherByName: teacherByName,
    teacherByNip: teacherByNip,
    teacherByUsername: teacherByUsername,
    teacherByCleanName: teacherByCleanName,
    studentById: studentById,
    studentByNis: studentByNis,
    studentByNisn: studentByNisn,
    studentByName: studentByName,
    userById: userById,
    userByUsername: userByUsername,
    userByName: userByName
  };
}

function matchYearFromMaps_(idVal, nameVal, semesterVal, maps, fallbackActive) {
  var idStr = String(idVal || '').trim();
  if (idStr && maps.yearById[idStr]) return maps.yearById[idStr];
  var nameKey = normSyncText_(nameVal);
  if (nameKey && maps.yearByName[nameKey] && maps.yearByName[nameKey].length) {
    var cands = maps.yearByName[nameKey];
    var semKey = normSyncText_(semesterVal);
    if (semKey) {
      for (var i = 0; i < cands.length; i++) {
        if (normSyncText_(cands[i].semester) === semKey) return cands[i];
      }
    }
    for (var j = 0; j < cands.length; j++) {
      if (normSyncText_(cands[j].status) === 'aktif') return cands[j];
    }
    return cands[0];
  }
  return fallbackActive ? maps.activeYear : null;
}

function matchClassFromMaps_(idVal, nameVal, maps) {
  var idStr = String(idVal || '').trim();
  if (idStr === 'SEMUA_KELAS' || idStr === 'ALL' || idStr === 'SEMUA') return null;
  if (idStr && maps.classById[idStr]) return maps.classById[idStr];
  var nameKey = normSyncText_(nameVal);
  if (nameKey && maps.classByName[nameKey]) return maps.classByName[nameKey];
  var compKey = compactClassKey_(nameVal || idVal);
  if (compKey && maps.classByCompact[compKey]) return maps.classByCompact[compKey];
  return null;
}

function matchSubjectFromMaps_(idVal, nameVal, maps) {
  var idStr = String(idVal || '').trim();
  if (idStr && maps.subjectById[idStr]) return maps.subjectById[idStr];
  var key = normSyncText_(nameVal);
  if (key && maps.subjectByName[key]) return maps.subjectByName[key];
  if (key && maps.subjectByCode[key]) return maps.subjectByCode[key];
  if (key) {
    if (/\bpai\b|pendidikan agama|agama islam/.test(key)) {
      for (var i = 0; i < maps.subjects.length; i++) {
        if (/\bpai\b|agama/.test(normSyncText_(maps.subjects[i].kode_mapel + ' ' + maps.subjects[i].nama_mapel))) {
          return maps.subjects[i];
        }
      }
    }
    if (/\bpjok\b|penjas|olahraga|jasmani/.test(key)) {
      for (var j = 0; j < maps.subjects.length; j++) {
        if (/\bpjok\b|penjas|olahraga|jasmani/.test(normSyncText_(maps.subjects[j].kode_mapel + ' ' + maps.subjects[j].nama_mapel))) {
          return maps.subjects[j];
        }
      }
    }
  }
  return null;
}

function matchTeacherFromMaps_(idVal, nameVal, maps) {
  var idStr = String(idVal || '').trim();
  if (idStr && maps.teacherById[idStr]) return maps.teacherById[idStr];
  var key = normSyncText_(nameVal);
  if (key && maps.teacherByName[key]) return maps.teacherByName[key];
  if (key && maps.teacherByNip[key]) return maps.teacherByNip[key];
  if (key && maps.teacherByUsername[key]) return maps.teacherByUsername[key];
  var clean = stripAcademicTitles_(nameVal);
  if (clean && maps.teacherByCleanName[clean]) return maps.teacherByCleanName[clean];
  return null;
}

function matchStudentFromMaps_(idVal, nameVal, classIdHint, classNameHint, maps) {
  var idStr = String(idVal || '').trim();
  if (idStr && maps.studentById[idStr]) return maps.studentById[idStr];
  var nisKey = normSyncText_(idVal || nameVal);
  if (nisKey && maps.studentByNis[nisKey]) return maps.studentByNis[nisKey];
  if (nisKey && maps.studentByNisn[nisKey]) return maps.studentByNisn[nisKey];
  var nameKey = normSyncText_(nameVal);
  if (nameKey && maps.studentByName[nameKey] && maps.studentByName[nameKey].length) {
    var cands = maps.studentByName[nameKey];
    if (cands.length === 1) return cands[0];
    var cidHint = String(classIdHint || '').trim();
    var cnameHint = normSyncText_(classNameHint);
    for (var i = 0; i < cands.length; i++) {
      if ((cidHint && String(cands[i].id_kelas || '').trim() === cidHint) ||
          (cnameHint && normSyncText_(cands[i].nama_kelas) === cnameHint)) {
        return cands[i];
      }
    }
    return cands[0];
  }
  return null;
}

function detectTeacherForClassSubject_(cls, sub, maps) {
  if (!maps || !maps.teachers || !maps.teachers.length) return null;
  var subLabel = normSyncText_((sub ? sub.kode_mapel : '') + ' ' + (sub ? sub.nama_mapel : ''));
  if (/\bpai\b|agama/.test(subLabel)) {
    for (var i = 0; i < maps.teachers.length; i++) {
      if (/\bpai\b|agama/.test(normSyncText_(maps.teachers[i].mata_pelajaran + ' ' + maps.teachers[i].jabatan))) {
        return maps.teachers[i];
      }
    }
  }
  if (/\bpjok\b|penjas|olahraga|jasmani/.test(subLabel)) {
    for (var j = 0; j < maps.teachers.length; j++) {
      if (/\bpjok\b|penjas|olahraga|jasmani/.test(normSyncText_(maps.teachers[j].mata_pelajaran + ' ' + maps.teachers[j].jabatan))) {
        return maps.teachers[j];
      }
    }
  }
  if (sub) {
    var sName = normSyncText_(sub.nama_mapel);
    var sKode = normSyncText_(sub.kode_mapel);
    for (var m = 0; m < maps.teachers.length; m++) {
      var gt = maps.teachers[m];
      if (isKepalaSekolahTeacher_(gt)) continue;
      var gMapel = normSyncText_(gt.mata_pelajaran);
      var sameCls = !cls || gt.id_kelas === cls.id_kelas || gt.wali_kelas_id === cls.id_kelas ||
        gt.id_kelas === 'SEMUA_KELAS' || (!gt.id_kelas && !gt.wali_kelas_id);
      if (sameCls && ((sName && gMapel.indexOf(sName) !== -1) ||
        (sKode && new RegExp('\\b' + sKode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(gMapel)))) {
        return gt;
      }
    }
  }
  if (cls) {
    if (cls.wali_kelas_id && maps.teacherById[cls.wali_kelas_id]) {
      return maps.teacherById[cls.wali_kelas_id];
    }
    for (var k = 0; k < maps.teachers.length; k++) {
      var t = maps.teachers[k];
      if (!isNonWaliTeacher_(t) && (t.wali_kelas_id === cls.id_kelas || t.id_kelas === cls.id_kelas)) {
        return t;
      }
    }
  }
  return null;
}

function syncAllRelatedIds_(actorUser, skipLog) {
  var ss = getSpreadsheet_();
  var details = {};
  var totalUpdatedRows = 0;

  var recordCount = function(name, cnt) {
    if (cnt > 0) {
      details[name] = (details[name] || 0) + cnt;
      totalUpdatedRows += cnt;
    }
  };

  // 1. Pastikan primary ID master sheets lengkap
  recordCount('TAHUN_AJARAN', patchSheetColumns_('TAHUN_AJARAN', function(row) {
    var patch = {};
    if (!String(row.id_tahun_ajaran || '').trim()) patch.id_tahun_ajaran = generateId_('TA');
    if (!String(row.status || '').trim()) patch.status = 'Draft';
    return patch;
  }));

  var classesBefore = ensureKelasIdsAndGet_();
  var subjectsBefore = ensureMapelIdsAndGet_();

  recordCount('GURU', patchSheetColumns_('GURU', function(row) {
    var patch = {};
    if (!String(row.id_guru || '').trim()) patch.id_guru = generateId_('GRU');
    if (!String(row.status_akun || '').trim()) patch.status_akun = 'Aktif';
    return patch;
  }));

  recordCount('SISWA', patchSheetColumns_('SISWA', function(row) {
    var patch = {};
    if (!String(row.id_siswa || '').trim()) patch.id_siswa = generateId_('SIS');
    if (!String(row.status_siswa || '').trim()) patch.status_siswa = 'Aktif';
    return patch;
  }));

  recordCount('USERS', patchSheetColumns_('USERS', function(row) {
    var patch = {};
    if (!String(row.id_user || '').trim()) patch.id_user = generateId_('USR');
    if (!String(row.status || '').trim()) patch.status = 'Aktif';
    return patch;
  }));

  // 2. Muat master terbaru & hubungkan relasi antar master
  var years = readSheetObjects_('TAHUN_AJARAN');
  var classes = classesBefore.length ? classesBefore : readSheetObjects_('KELAS');
  var subjects = subjectsBefore.length ? subjectsBefore : readSheetObjects_('MAPEL');
  var teachers = readSheetObjects_('GURU');
  var students = readSheetObjects_('SISWA');
  var users = readSheetObjects_('USERS');
  var maps = buildSyncMaps_(years, classes, subjects, teachers, students, users);

  // 2a. IDENTITAS_SEKOLAH <-> TAHUN_AJARAN
  recordCount('IDENTITAS_SEKOLAH', patchSheetColumns_('IDENTITAS_SEKOLAH', function(row) {
    var patch = {};
    if (!String(row.id || '').trim()) patch.id = 'SEKOLAH_UTAMA';
    var yr = matchYearFromMaps_(row.tahun_ajaran_aktif_id, row.tahun_ajaran_aktif, row.semester_aktif, maps, true);
    if (yr) {
      patch.tahun_ajaran_aktif_id = yr.id_tahun_ajaran;
      patch.tahun_ajaran_aktif = yr.nama_tahun_ajaran;
      if (!String(row.semester_aktif || '').trim()) patch.semester_aktif = yr.semester || 'Ganjil';
    }
    return patch;
  }));

  // 2b. GURU <-> KELAS (assign class ID & wali_kelas_id)
  // Bangun reverse index dari KELAS -> nama wali kelas
  var classByWaliTeacherId = {};
  var classByWaliTeacherName = {};
  for (var cIdx = 0; cIdx < classes.length; cIdx++) {
    var cItem = classes[cIdx];
    var wid = String(cItem.wali_kelas_id || '').trim();
    if (wid && !classByWaliTeacherId[wid]) classByWaliTeacherId[wid] = cItem;
    var wname = normSyncText_(cItem.wali_kelas);
    if (wname && !classByWaliTeacherName[wname]) classByWaliTeacherName[wname] = cItem;
  }

  recordCount('GURU', patchSheetColumns_('GURU', function(row) {
    var patch = {};
    var assign = resolveTeacherClassAssignment_(row, classes);
    if (!assign.isPaiPjok && !assign.isKepalaSekolah && !assign.id_kelas) {
      var revCls = classByWaliTeacherId[String(row.id_guru || '').trim()] ||
        classByWaliTeacherName[normSyncText_(row.nama_guru)];
      if (revCls) {
        assign = {
          isPaiPjok: false,
          isKepalaSekolah: false,
          isWaliKelas: true,
          id_kelas: revCls.id_kelas,
          wali_kelas_id: revCls.id_kelas,
          wali_kelas: revCls.nama_kelas
        };
      }
    }
    patch.id_kelas = assign.id_kelas;
    patch.wali_kelas_id = assign.wali_kelas_id;
    patch.wali_kelas = assign.wali_kelas;

    if (!String(row.username || '').trim()) {
      var matchedU = null;
      for (var ui = 0; ui < users.length; ui++) {
        var uRole = String(users[ui].role || '').trim().toUpperCase();
        if ((uRole === 'GURU' || uRole === 'KEPALA_SEKOLAH') &&
            ((users[ui].relasi_id && users[ui].relasi_id === row.id_guru) ||
             (normSyncText_(users[ui].nama_lengkap) === normSyncText_(row.nama_guru)) ||
             (row.nip && normSyncText_(users[ui].username) === normSyncText_(row.nip)))) {
          matchedU = users[ui];
          break;
        }
      }
      var cleanNipSync = String(row.nip || '').trim();
      if (matchedU && matchedU.username) {
        patch.username = matchedU.username;
      } else if (cleanNipSync && cleanNipSync !== '-') {
        patch.username = cleanNipSync;
      }
    }
    return patch;
  }));

  // Muat ulang GURU terbaru setelah assign kelas, lalu sinkronkan KELAS <-> GURU & TAHUN_AJARAN
  teachers = readSheetObjects_('GURU');
  maps = buildSyncMaps_(years, classes, subjects, teachers, students, users);

  var teacherByWaliClassId = {};
  for (var tIdx = 0; tIdx < teachers.length; tIdx++) {
    var tItem = teachers[tIdx];
    if (!isNonWaliTeacher_(tItem) && tItem.wali_kelas_id && !teacherByWaliClassId[tItem.wali_kelas_id]) {
      teacherByWaliClassId[tItem.wali_kelas_id] = tItem;
    }
  }

  recordCount('KELAS', patchSheetColumns_('KELAS', function(row) {
    var patch = {};
    var yr = matchYearFromMaps_(row.id_tahun_ajaran, row.tahun_ajaran, '', maps, true);
    if (yr) {
      patch.id_tahun_ajaran = yr.id_tahun_ajaran;
      patch.tahun_ajaran = yr.nama_tahun_ajaran;
    }
    if (!String(row.tingkat || '').trim() && row.nama_kelas) {
      var infTingkat = inferTingkatFromClassName_(row.nama_kelas);
      if (infTingkat) patch.tingkat = infTingkat;
    }
    var waliTch = matchTeacherFromMaps_(row.wali_kelas_id, row.wali_kelas, maps);
    if (waliTch && isNonWaliTeacher_(waliTch)) {
      waliTch = null;
    }
    if (!waliTch && row.id_kelas && teacherByWaliClassId[row.id_kelas]) {
      waliTch = teacherByWaliClassId[row.id_kelas];
    }
    if (waliTch) {
      patch.wali_kelas_id = waliTch.id_guru;
      patch.wali_kelas = waliTch.nama_guru;
    } else if (row.wali_kelas_id && maps.teacherById[row.wali_kelas_id] && isNonWaliTeacher_(maps.teacherById[row.wali_kelas_id])) {
      patch.wali_kelas_id = '';
      patch.wali_kelas = '';
    }
    return patch;
  }));

  // 2c. SISWA <-> KELAS
  classes = readSheetObjects_('KELAS');
  maps = buildSyncMaps_(years, classes, subjects, teachers, students, users);

  recordCount('SISWA', patchSheetColumns_('SISWA', function(row) {
    var cls = matchClassFromMaps_(row.id_kelas, row.nama_kelas, maps);
    if (!cls) return null;
    return {
      id_kelas: cls.id_kelas,
      nama_kelas: cls.nama_kelas
    };
  }));

  // 2d. USERS <-> GURU / SISWA (auto-provision akun guru & siswa/orang tua yang belum ada)
  students = readSheetObjects_('SISWA');
  var userSyncRes = syncUsersFromMasterData_({
    teachers: teachers,
    students: students,
    users: users
  });
  recordCount('USERS', userSyncRes.total);

  teachers = readSheetObjects_('GURU');
  users = readSheetObjects_('USERS');
  maps = buildSyncMaps_(years, classes, subjects, teachers, students, users);

  // 3. Sinkronkan seluruh sheet akademik, perkembangan, dan administrasi
  recordCount('JADWAL', patchSheetColumns_('JADWAL', function(row) {
    var patch = {};
    if (!String(row.id_jadwal || '').trim()) patch.id_jadwal = generateId_('JDW');
    var yr = matchYearFromMaps_(row.id_tahun_ajaran, '', row.semester, maps, true);
    if (yr) patch.id_tahun_ajaran = yr.id_tahun_ajaran;
    var cls = matchClassFromMaps_(row.id_kelas, row.nama_kelas, maps);
    if (cls) {
      patch.id_kelas = cls.id_kelas;
      patch.nama_kelas = cls.nama_kelas;
    }
    var sub = matchSubjectFromMaps_(row.id_mapel, row.nama_mapel, maps);
    if (sub) {
      patch.id_mapel = sub.id_mapel;
      patch.nama_mapel = sub.nama_mapel;
    }
    var tch = matchTeacherFromMaps_(row.id_guru, row.nama_guru, maps);
    if (!tch && (cls || sub)) {
      tch = detectTeacherForClassSubject_(cls, sub, maps);
    }
    if (tch) {
      patch.id_guru = tch.id_guru;
      patch.nama_guru = tch.nama_guru;
    }
    var rawMulai = String(row.waktu_mulai || '');
    var rawSelesai = String(row.waktu_selesai || '');
    if (rawMulai.indexOf('1899-12-30') !== -1 || !rawMulai.trim()) {
      patch.waktu_mulai = formatScheduleTimeValue_(rawMulai, row.jam_ke, false);
    }
    if (rawSelesai.indexOf('1899-12-30') !== -1 || !rawSelesai.trim()) {
      patch.waktu_selesai = formatScheduleTimeValue_(rawSelesai, row.jam_ke, true);
    }
    return patch;
  }));

  var schedules = readSheetObjects_('JADWAL');
  var scheduleTeacherByClassSubject = {};
  for (var jIdx = 0; jIdx < schedules.length; jIdx++) {
    var sch = schedules[jIdx];
    if (sch.id_kelas && sch.id_mapel && sch.id_guru) {
      var skey = sch.id_kelas + '::' + sch.id_mapel;
      if (!scheduleTeacherByClassSubject[skey]) scheduleTeacherByClassSubject[skey] = sch.id_guru;
    }
  }

  recordCount('PIKET', patchSheetColumns_('PIKET', function(row) {
    var patch = {};
    if (!String(row.id_piket || '').trim()) patch.id_piket = generateId_('PKT');
    var cls = matchClassFromMaps_(row.id_kelas, row.nama_kelas, maps);
    if (cls) {
      patch.id_kelas = cls.id_kelas;
      patch.nama_kelas = cls.nama_kelas;
    }
    var tch = matchTeacherFromMaps_(row.id_guru, row.nama_guru, maps);
    if (tch) {
      patch.id_guru = tch.id_guru;
      patch.nama_guru = tch.nama_guru;
    }
    var targetClsId = patch.id_kelas || row.id_kelas;
    var targetClsName = patch.nama_kelas || row.nama_kelas;
    var studentNames = String(row.petugas_siswa || '').split(/[\n,]+/).map(function(s) { return s.trim(); }).filter(Boolean);
    if (!String(row.id_siswa || '').trim() && studentNames.length > 0) {
      var matchedIds = [];
      for (var si = 0; si < studentNames.length; si++) {
        var st = matchStudentFromMaps_('', studentNames[si], targetClsId, targetClsName, maps);
        if (st && st.id_siswa && matchedIds.indexOf(st.id_siswa) === -1) {
          matchedIds.push(st.id_siswa);
        }
      }
      if (matchedIds.length > 0) {
        patch.id_siswa = matchedIds.join(', ');
      }
    }
    if (row.checklist_kebersihan === undefined || row.checklist_kebersihan === '') {
      patch.checklist_kebersihan = '{}';
    }
    return patch;
  }));

  recordCount('ABSENSI', patchSheetColumns_('ABSENSI', function(row) {
    var patch = {};
    if (!String(row.id_absensi || '').trim()) patch.id_absensi = generateId_('ABS');
    var yr = matchYearFromMaps_(row.id_tahun_ajaran, '', row.semester, maps, true);
    if (yr) patch.id_tahun_ajaran = yr.id_tahun_ajaran;
    var std = matchStudentFromMaps_(row.id_siswa, row.nama_siswa, row.id_kelas, row.nama_kelas, maps);
    if (std) {
      patch.id_siswa = std.id_siswa;
      patch.nama_siswa = std.nama_lengkap;
    }
    var cls = matchClassFromMaps_(row.id_kelas, row.nama_kelas, maps) ||
      (std ? matchClassFromMaps_(std.id_kelas, std.nama_kelas, maps) : null);
    if (cls) {
      patch.id_kelas = cls.id_kelas;
      patch.nama_kelas = cls.nama_kelas;
    }
    return patch;
  }));

  recordCount('NILAI', patchSheetColumns_('NILAI', function(row) {
    var patch = {};
    if (!String(row.id_nilai || '').trim()) patch.id_nilai = generateId_('NIL');
    var yr = matchYearFromMaps_(row.id_tahun_ajaran, row.tahun_ajaran, row.semester, maps, true);
    if (yr) {
      patch.id_tahun_ajaran = yr.id_tahun_ajaran;
      patch.tahun_ajaran = yr.nama_tahun_ajaran;
    }
    var std = matchStudentFromMaps_(row.id_siswa, row.nama_siswa, row.id_kelas, row.nama_kelas, maps);
    if (std) {
      patch.id_siswa = std.id_siswa;
      patch.nama_siswa = std.nama_lengkap;
    }
    var cls = matchClassFromMaps_(row.id_kelas, row.nama_kelas, maps) ||
      (std ? matchClassFromMaps_(std.id_kelas, std.nama_kelas, maps) : null);
    if (cls) {
      patch.id_kelas = cls.id_kelas;
      patch.nama_kelas = cls.nama_kelas;
    }
    var sub = matchSubjectFromMaps_(row.id_mapel, row.nama_mapel, maps);
    if (sub) {
      patch.id_mapel = sub.id_mapel;
      patch.nama_mapel = sub.nama_mapel;
    }
    var tch = matchTeacherFromMaps_(row.id_guru, row.nama_guru, maps);
    if (!tch && cls && sub && scheduleTeacherByClassSubject[cls.id_kelas + '::' + sub.id_mapel]) {
      tch = maps.teacherById[scheduleTeacherByClassSubject[cls.id_kelas + '::' + sub.id_mapel]] || null;
    }
    if (!tch && (cls || sub)) {
      tch = detectTeacherForClassSubject_(cls, sub, maps);
    }
    if (tch) {
      patch.id_guru = tch.id_guru;
      patch.nama_guru = tch.nama_guru;
    }
    return patch;
  }));

  recordCount('JURNAL', patchSheetColumns_('JURNAL', function(row) {
    var patch = {};
    if (!String(row.id_jurnal || '').trim()) patch.id_jurnal = generateId_('JRN');
    var cls = matchClassFromMaps_(row.id_kelas, row.nama_kelas, maps);
    if (cls) {
      patch.id_kelas = cls.id_kelas;
      patch.nama_kelas = cls.nama_kelas;
    }
    var sub = matchSubjectFromMaps_(row.id_mapel, row.nama_mapel, maps);
    if (sub) {
      patch.id_mapel = sub.id_mapel;
      patch.nama_mapel = sub.nama_mapel;
    }
    var tch = matchTeacherFromMaps_(row.id_guru, row.nama_guru, maps);
    if (tch) {
      patch.id_guru = tch.id_guru;
      patch.nama_guru = tch.nama_guru;
    }
    return patch;
  }));

  recordCount('KARAKTER', patchSheetColumns_('KARAKTER', function(row) {
    var patch = {};
    if (!String(row.id_karakter || '').trim()) patch.id_karakter = generateId_('KRK');
    var std = matchStudentFromMaps_(row.id_siswa, row.nama_siswa, row.id_kelas, row.nama_kelas, maps);
    if (std) {
      patch.id_siswa = std.id_siswa;
      patch.nama_siswa = std.nama_lengkap;
    }
    var cls = matchClassFromMaps_(row.id_kelas, row.nama_kelas, maps) ||
      (std ? matchClassFromMaps_(std.id_kelas, std.nama_kelas, maps) : null);
    if (cls) {
      patch.id_kelas = cls.id_kelas;
      patch.nama_kelas = cls.nama_kelas;
    }
    var tch = matchTeacherFromMaps_(row.id_guru, row.nama_guru, maps);
    if (tch) {
      patch.id_guru = tch.id_guru;
      patch.nama_guru = tch.nama_guru;
    }
    return patch;
  }));

  var studentClassSheets = [
    { name: 'KESEHATAN', idField: 'id_kesehatan', prefix: 'KES' },
    { name: 'BIMBINGAN', idField: 'id_bimbingan', prefix: 'BK' },
    { name: 'PRESTASI', idField: 'id_prestasi', prefix: 'PRS' }
  ];
  for (var sc = 0; sc < studentClassSheets.length; sc++) {
    (function(cfg) {
      recordCount(cfg.name, patchSheetColumns_(cfg.name, function(row) {
        var patch = {};
        if (!String(row[cfg.idField] || '').trim()) patch[cfg.idField] = generateId_(cfg.prefix);
        var std = matchStudentFromMaps_(row.id_siswa, row.nama_siswa, row.id_kelas, row.nama_kelas, maps);
        if (std) {
          patch.id_siswa = std.id_siswa;
          patch.nama_siswa = std.nama_lengkap;
        }
        var cls = matchClassFromMaps_(row.id_kelas, row.nama_kelas, maps) ||
          (std ? matchClassFromMaps_(std.id_kelas, std.nama_kelas, maps) : null);
        if (cls) {
          patch.id_kelas = cls.id_kelas;
          patch.nama_kelas = cls.nama_kelas;
        }
        return patch;
      }));
    })(studentClassSheets[sc]);
  }

  recordCount('AGENDA', patchSheetColumns_('AGENDA', function(row) {
    var patch = {};
    if (!String(row.id_agenda || '').trim()) patch.id_agenda = generateId_('AGD');
    var rawClass = String(row.id_kelas || '').trim();
    if (rawClass && rawClass.toUpperCase() !== 'SEMUA' && rawClass.toUpperCase() !== 'ALL') {
      var cls = matchClassFromMaps_(rawClass, rawClass, maps);
      if (cls) patch.id_kelas = cls.id_kelas;
    }
    return patch;
  }));

  recordCount('PENGHUBUNG', patchSheetColumns_('PENGHUBUNG', function(row) {
    var patch = {};
    if (!String(row.id_penghubung || '').trim()) patch.id_penghubung = generateId_('PHB');
    var std = matchStudentFromMaps_(row.id_siswa, row.nama_siswa, row.id_kelas, row.nama_kelas, maps);
    if (std) {
      patch.id_siswa = std.id_siswa;
      patch.nama_siswa = std.nama_lengkap;
    }
    var cls = matchClassFromMaps_(row.id_kelas, row.nama_kelas, maps) ||
      (std ? matchClassFromMaps_(std.id_kelas, std.nama_kelas, maps) : null);
    if (cls) {
      patch.id_kelas = cls.id_kelas;
      patch.nama_kelas = cls.nama_kelas;
    }
    var sender = maps.userById[String(row.pengirim_id || '').trim()] ||
      maps.userByUsername[normSyncText_(row.pengirim_id || row.pengirim_nama)] ||
      maps.userByName[normSyncText_(row.pengirim_nama)];
    if (sender) {
      patch.pengirim_id = sender.id_user;
      patch.pengirim_nama = sender.nama_lengkap;
    }
    return patch;
  }));

  recordCount('INVENTARIS', patchSheetColumns_('INVENTARIS', function(row) {
    return !String(row.id_inventaris || '').trim() ? { id_inventaris: generateId_('INV') } : null;
  }));

  recordCount('DOKUMENTASI', patchSheetColumns_('DOKUMENTASI', function(row) {
    return !String(row.id_dokumentasi || '').trim() ? { id_dokumentasi: generateId_('DOK') } : null;
  }));

  var updatedSheets = Object.keys(details);
  if (!skipLog && actorUser) {
    writeLog_(
      actorUser,
      'SYNC_ID',
      'DATABASE',
      'Sinkronisasi seluruh ID selesai: ' + totalUpdatedRows + ' baris pada ' + updatedSheets.length + ' sheet'
    );
  }

  return {
    total_updated_rows: totalUpdatedRows,
    updated_sheets: updatedSheets,
    details: details
  };
}

function syncAllIdsAction_(user) {
  setupDatabase(true, true);
  var report = syncAllRelatedIds_(user, false);
  SpreadsheetApp.flush();
  var msg = report.total_updated_rows > 0
    ? report.total_updated_rows + ' baris pada ' + report.updated_sheets.length + ' sheet berhasil dihubungkan.'
    : 'Seluruh ID antar dokumen sudah terhubung dan sinkron.';
  return jsonResponse_(true, msg, report);
}

// ============================================================================
// GENERIC CRUD & SPREADSHEET HELPERS
// ============================================================================

function createGeneric_(sheetName, idField, prefix, payload, user, logTitle) {
  var now = nowIso_();
  payload[idField] = generateId_(prefix);
  payload.created_at = now;
  payload.updated_at = now;
  insertRow_(sheetName, payload);
  SpreadsheetApp.flush();
  writeLog_(user, 'CREATE', sheetName, logTitle);
  return jsonResponse_(true, 'Data berhasil disimpan.', payload);
}

function updateGeneric_(sheetName, idField, payload, user, logTitle) {
  payload.updated_at = nowIso_();
  var updated = updateRowById_(sheetName, idField, payload[idField], payload);
  SpreadsheetApp.flush();
  writeLog_(user, 'UPDATE', sheetName, logTitle);
  return jsonResponse_(true, 'Data berhasil diperbarui.', updated);
}

function ensureColumnHeader_(sheet, headerTitle, bgColor, fontColor, centered) {
  var lastCol = sheet.getLastColumn();
  if (lastCol < 1) return;
  var row0 = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var targetLower = String(headerTitle).trim().toLowerCase();
  for (var i = 0; i < row0.length; i++) {
    if (String(row0[i] || '').trim().toLowerCase() === targetLower) {
      return;
    }
  }
  var cell = sheet.getRange(1, lastCol + 1);
  cell.setValue(headerTitle)
    .setFontWeight('bold')
    .setBackground(bgColor || '#EDE9FE')
    .setFontColor(fontColor || '#000000');
  if (centered) {
    cell.setHorizontalAlignment('center').setVerticalAlignment('middle');
  }
}

function resolveSheetLayout_(sheetName, values) {
  var row0 = values[0] || [];
  if (sheetName === 'SISWA') {
    var firstCell = String(row0[0] || '').trim().toLowerCase();
    var hasGroupRow = String(row0[24] || '').trim().toLowerCase() === 'data ayah';
    if (firstCell === 'no' || hasGroupRow) {
      return {
        fields: SHEETS_SCHEMA.SISWA,
        dataStartRow: 2
      };
    }
  }
  if (sheetName === 'GURU') {
    var g0 = String(row0[0] || '').trim();
    var g1 = String(row0[1] || '').trim();
    if (g0 === 'NO' && g1 === 'NAMA') {
      var hasGuruFoto = row0.some(function(h) {
        return String(h || '').trim().toUpperCase() === 'FOTO URL';
      });
      var hasGuruIdKelas = row0.some(function(h) {
        return String(h || '').trim().toUpperCase() === 'ID KELAS';
      });
      return {
        fields: SHEETS_SCHEMA.GURU.filter(function(f) {
          if (f === 'foto_url' && !hasGuruFoto) return false;
          if (f === 'id_kelas' && !hasGuruIdKelas) return false;
          return true;
        }),
        dataStartRow: 1
      };
    }
  }
  if (sheetName === 'USERS') {
    var normalizedUsersFields = row0.map(function(h) {
      return normalizeUsersHeaderKey_(h);
    });
    if (normalizedUsersFields.indexOf('username') === -1 && normalizedUsersFields.indexOf('id_user') === -1) {
      return {
        fields: SHEETS_SCHEMA.USERS,
        dataStartRow: 0
      };
    }
    return {
      fields: normalizedUsersFields,
      dataStartRow: 1
    };
  }
  if (sheetName === 'MAPEL') {
    var normalizedMapelFields = row0.map(function(h) {
      return normalizeMapelHeaderKey_(h);
    });
    if (normalizedMapelFields.indexOf('kode_mapel') === -1 && normalizedMapelFields.indexOf('nama_mapel') === -1) {
      return {
        fields: SHEETS_SCHEMA.MAPEL,
        dataStartRow: 0
      };
    }
    return {
      fields: normalizedMapelFields,
      dataStartRow: 1
    };
  }
  if (sheetName === 'KELAS') {
    var normalizedKelasFields = row0.map(function(h) {
      return normalizeKelasHeaderKey_(h);
    });
    if (normalizedKelasFields.indexOf('nama_kelas') === -1 && normalizedKelasFields.indexOf('id_kelas') === -1) {
      return {
        fields: SHEETS_SCHEMA.KELAS,
        dataStartRow: 0
      };
    }
    return {
      fields: normalizedKelasFields,
      dataStartRow: 1
    };
  }
  if (sheetName === 'JADWAL') {
    var normalizedJadwalFields = row0.map(function(h) {
      return normalizeJadwalHeaderKey_(h);
    });
    if (normalizedJadwalFields.indexOf('hari') === -1 && normalizedJadwalFields.indexOf('id_jadwal') === -1) {
      return {
        fields: SHEETS_SCHEMA.JADWAL,
        dataStartRow: 0
      };
    }
    return {
      fields: normalizedJadwalFields,
      dataStartRow: 1
    };
  }
  if (sheetName === 'PIKET') {
    var normalizedPiketFields = row0.map(function(h) {
      return normalizePiketHeaderKey_(h);
    });
    if (normalizedPiketFields.indexOf('hari') === -1 && normalizedPiketFields.indexOf('id_piket') === -1) {
      return {
        fields: SHEETS_SCHEMA.PIKET,
        dataStartRow: 0
      };
    }
    return {
      fields: normalizedPiketFields,
      dataStartRow: 1
    };
  }
  if (sheetName === 'ABSENSI') {
    var normalizedAbsensiFields = row0.map(function(h) {
      return normalizeAbsensiHeaderKey_(h);
    });
    if (
      normalizedAbsensiFields.indexOf('id_absensi') === -1 &&
      normalizedAbsensiFields.indexOf('id_siswa') === -1 &&
      normalizedAbsensiFields.indexOf('nama_siswa') === -1 &&
      normalizedAbsensiFields.indexOf('tanggal') === -1 &&
      normalizedAbsensiFields.indexOf('status') === -1
    ) {
      return {
        fields: SHEETS_SCHEMA.ABSENSI,
        dataStartRow: 0
      };
    }
    return {
      fields: normalizedAbsensiFields,
      dataStartRow: 1
    };
  }
  if (sheetName === 'JURNAL') {
    var normalizedJurnalFields = row0.map(function(h) {
      return normalizeJurnalHeaderKey_(h);
    });
    if (
      normalizedJurnalFields.indexOf('id_jurnal') === -1 &&
      normalizedJurnalFields.indexOf('materi') === -1 &&
      normalizedJurnalFields.indexOf('tanggal') === -1
    ) {
      return {
        fields: SHEETS_SCHEMA.JURNAL,
        dataStartRow: 0
      };
    }
    return {
      fields: normalizedJurnalFields,
      dataStartRow: 1
    };
  }
  return {
    fields: row0.map(function(h) { return String(h || '').trim(); }),
    dataStartRow: 1
  };
}

function deleteById_(sheetName, idField, idValue, user, logTitle) {
  var cleanId = String(idValue || '').trim();
  if (!cleanId) return jsonResponse_(false, 'ID data wajib disertakan.', null, 'VALIDATION_ERROR');
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return jsonResponse_(false, 'Sheet tidak ditemukan.', null, 'NOT_FOUND');
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return jsonResponse_(false, 'Data tidak ditemukan.', null, 'NOT_FOUND');
  var layout = resolveSheetLayout_(sheetName, data);
  var fields = layout.fields;
  var startRow = layout.dataStartRow;
  var idCol = fields.indexOf(idField);
  if (idCol === -1) return jsonResponse_(false, 'Kolom ID tidak ditemukan.', null, 'NOT_FOUND');
  for (var r = startRow; r < data.length; r++) {
    if (String(data[r][idCol] || '').trim() === cleanId) {
      sheet.deleteRow(r + 1);
      SpreadsheetApp.flush();
      writeLog_(user, 'DELETE', sheetName, logTitle + ' (' + cleanId + ')');
      return jsonResponse_(true, 'Data berhasil dihapus.', { id: cleanId });
    }
  }
  return jsonResponse_(false, 'Data tidak ditemukan.', null, 'NOT_FOUND');
}

function deleteUsersByRelasiId_(relasiId, roles) {
  if (!relasiId) return 0;
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName('USERS');
  if (!sheet) return 0;
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return 0;
  var layout = resolveSheetLayout_('USERS', data);
  var fields = layout.fields;
  var startRow = layout.dataStartRow;
  var relCol = fields.indexOf('relasi_id');
  var roleCol = fields.indexOf('role');
  if (relCol === -1) return 0;
  var targetRel = String(relasiId).trim();
  var deleted = 0;
  for (var r = data.length - 1; r >= startRow; r--) {
    var rowRel = String(data[r][relCol] || '').trim();
    var rowRole = roleCol !== -1 ? String(data[r][roleCol] || '').trim().toUpperCase() : '';
    if (rowRel === targetRel && (!roles || roles.indexOf(rowRole) !== -1)) {
      sheet.deleteRow(r + 1);
      deleted++;
    }
  }
  return deleted;
}

function formatSheetDateValue_(val, fieldName, timeZone) {
  if (!(val instanceof Date)) return val;
  var key = String(fieldName || '').trim().toLowerCase();
  if (key === 'created_at' || key === 'updated_at' || key === 'expires_at') {
    return val.toISOString();
  }
  var tz = timeZone || Session.getScriptTimeZone() || 'Asia/Jakarta';
  if (val.getFullYear() < 1950 || key.indexOf('waktu') !== -1 || key.indexOf('jam') !== -1) {
    return Utilities.formatDate(val, tz, 'HH:mm');
  }
  return Utilities.formatDate(val, tz, 'yyyy-MM-dd');
}

function readSheetObjects_(sheetName) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return [];
  var values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var layout = resolveSheetLayout_(sheetName, values);
  var fields = layout.fields;
  var startRow = layout.dataStartRow;
  if (values.length <= startRow) return [];

  var tz = ss.getSpreadsheetTimeZone() || Session.getScriptTimeZone() || 'Asia/Jakarta';
  var result = [];
  for (var r = startRow; r < values.length; r++) {
    var rowObj = {};
    var hasValue = false;
    for (var c = 0; c < fields.length; c++) {
      var val = c < values[r].length ? values[r][c] : '';
      if (val instanceof Date) {
        val = formatSheetDateValue_(val, fields[c], tz);
      }
      rowObj[fields[c]] = val;
      if (val !== '' && val !== null && val !== undefined) hasValue = true;
    }
    if (sheetName === 'SISWA') {
      if (!rowObj.telepon_ortu) {
        rowObj.telepon_ortu = rowObj.hp || rowObj.telepon || '';
      }
      if (!rowObj.status_siswa) {
        rowObj.status_siswa = 'Aktif';
      }
    }
    if (sheetName === 'GURU' && !rowObj.status_akun) {
      rowObj.status_akun = 'Aktif';
    }
    if (sheetName === 'MAPEL' && !rowObj.status_aktif) {
      rowObj.status_aktif = 'Aktif';
    }
    if (sheetName === 'TAHUN_AJARAN' && !rowObj.status) {
      rowObj.status = 'Draft';
    }
    if (hasValue) result.push(rowObj);
  }
  return result;
}

function getTextFields_(sheetName) {
  if (sheetName === 'SISWA') return ['nis', 'nisn', 'nik'];
  if (sheetName === 'GURU') return ['nip', 'nuptk'];
  if (sheetName === 'USERS') return ['username', 'password'];
  if (sheetName === 'JADWAL') return ['jam_ke', 'waktu_mulai', 'waktu_selesai'];
  if (sheetName === 'PIKET') return ['id_siswa', 'checklist_kebersihan'];
  if (sheetName === 'ABSENSI' || sheetName === 'JURNAL') return ['tanggal'];
  return [];
}

function insertRow_(sheetName, obj) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    setupDatabase();
    sheet = ss.getSheetByName(sheetName);
  }
  if (sheetName === 'USERS') {
    ensureUsersSheetStructure_(sheet);
  } else if (sheetName === 'MAPEL') {
    ensureMapelSheetStructure_(sheet);
  } else if (sheetName === 'KELAS') {
    ensureKelasSheetStructure_(sheet);
  } else if (sheetName === 'JADWAL') {
    ensureJadwalSheetStructure_(sheet);
  } else if (sheetName === 'PIKET') {
    ensurePiketSheetStructure_(sheet);
  } else if (sheetName === 'ABSENSI') {
    ensureAbsensiSheetStructure_(sheet);
  } else if (sheetName === 'JURNAL') {
    ensureJurnalSheetStructure_(sheet);
  } else if (sheetName === 'GURU') {
    ensureColumnHeader_(sheet, 'FOTO URL', '#EDE9FE', '#1E1B4B', true);
    ensureColumnHeader_(sheet, 'ID KELAS', '#EDE9FE', '#1E1B4B', true);
  }
  var headers = SHEETS_SCHEMA[sheetName];
  if (sheet.getLastRow() >= 1 && sheet.getLastColumn() >= 1) {
    var existingRow0 = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    if (sheetName === 'SISWA' && String(existingRow0[0] || '').trim() === 'id_siswa') {
      headers = existingRow0;
    } else if (sheetName === 'GURU' && String(existingRow0[0] || '').trim() === 'id_guru') {
      headers = existingRow0;
    } else if (sheetName !== 'SISWA' && sheetName !== 'GURU') {
      var hasAnyHeader = existingRow0.some(function(h) { return String(h || '').trim() !== ''; });
      if (hasAnyHeader) {
        headers = existingRow0.map(function(h) {
          var clean = String(h || '').trim();
          if (sheetName === 'USERS') return normalizeUsersHeaderKey_(clean);
          if (sheetName === 'MAPEL') return normalizeMapelHeaderKey_(clean);
          if (sheetName === 'KELAS') return normalizeKelasHeaderKey_(clean);
          if (sheetName === 'JADWAL') return normalizeJadwalHeaderKey_(clean);
          if (sheetName === 'PIKET') return normalizePiketHeaderKey_(clean);
          if (sheetName === 'ABSENSI') return normalizeAbsensiHeaderKey_(clean);
          if (sheetName === 'JURNAL') return normalizeJurnalHeaderKey_(clean);
          return clean;
        });
      }
    }
  }
  var textFields = getTextFields_(sheetName);
  var row = headers.map(function(h) {
    var val = obj[h] !== undefined && obj[h] !== null ? obj[h] : '';
    if (textFields.indexOf(h) !== -1) {
      return String(val);
    }
    return val;
  });
  if (textFields.length > 0) {
    var nextRow = Math.max(sheet.getLastRow() + 1, sheetName === 'SISWA' ? 3 : 2);
    for (var col = 0; col < headers.length; col++) {
      if (textFields.indexOf(headers[col]) !== -1) {
        sheet.getRange(nextRow, col + 1).setNumberFormat('@');
      }
    }
    sheet.getRange(nextRow, 1, 1, headers.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }
}

function insertRowsBatch_(sheetName, objects) {
  if (!objects || !objects.length) return 0;
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    setupDatabase(true, true);
    sheet = ss.getSheetByName(sheetName);
  }
  if (sheetName === 'USERS') {
    ensureUsersSheetStructure_(sheet);
  } else if (sheetName === 'MAPEL') {
    ensureMapelSheetStructure_(sheet);
  } else if (sheetName === 'KELAS') {
    ensureKelasSheetStructure_(sheet);
  } else if (sheetName === 'JADWAL') {
    ensureJadwalSheetStructure_(sheet);
  } else if (sheetName === 'PIKET') {
    ensurePiketSheetStructure_(sheet);
  } else if (sheetName === 'ABSENSI') {
    ensureAbsensiSheetStructure_(sheet);
  } else if (sheetName === 'JURNAL') {
    ensureJurnalSheetStructure_(sheet);
  } else if (sheetName === 'GURU') {
    ensureColumnHeader_(sheet, 'FOTO URL', '#EDE9FE', '#1E1B4B', true);
    ensureColumnHeader_(sheet, 'ID KELAS', '#EDE9FE', '#1E1B4B', true);
  }
  var headers = SHEETS_SCHEMA[sheetName];
  var isLegacySiswaHeader = false;
  if (sheet.getLastRow() >= 1 && sheet.getLastColumn() >= 1) {
    var existingRow0 = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    if (sheetName === 'SISWA' && String(existingRow0[0] || '').trim() === 'id_siswa') {
      headers = existingRow0;
      isLegacySiswaHeader = true;
    } else if (sheetName === 'GURU' && String(existingRow0[0] || '').trim() === 'id_guru') {
      headers = existingRow0;
    } else if (sheetName !== 'SISWA' && sheetName !== 'GURU') {
      var hasAnyHeader = existingRow0.some(function(h) { return String(h || '').trim() !== ''; });
      if (hasAnyHeader) {
        headers = existingRow0.map(function(h) {
          var clean = String(h || '').trim();
          if (sheetName === 'USERS') return normalizeUsersHeaderKey_(clean);
          if (sheetName === 'MAPEL') return normalizeMapelHeaderKey_(clean);
          if (sheetName === 'KELAS') return normalizeKelasHeaderKey_(clean);
          if (sheetName === 'JADWAL') return normalizeJadwalHeaderKey_(clean);
          if (sheetName === 'PIKET') return normalizePiketHeaderKey_(clean);
          if (sheetName === 'ABSENSI') return normalizeAbsensiHeaderKey_(clean);
          if (sheetName === 'JURNAL') return normalizeJurnalHeaderKey_(clean);
          return clean;
        });
      }
    }
  }
  var textFields = getTextFields_(sheetName);
  var matrix = [];
  for (var i = 0; i < objects.length; i++) {
    var obj = objects[i];
    var row = headers.map(function(h) {
      var val = obj[h] !== undefined && obj[h] !== null ? obj[h] : '';
      if (textFields.indexOf(h) !== -1) {
        return String(val);
      }
      return val;
    });
    matrix.push(row);
  }
  var minDataRow = (sheetName === 'SISWA' && !isLegacySiswaHeader) ? 3 : 2;
  var nextRow = Math.max(sheet.getLastRow() + 1, minDataRow);
  if (textFields.length > 0) {
    for (var col = 0; col < headers.length; col++) {
      if (textFields.indexOf(headers[col]) !== -1) {
        sheet.getRange(nextRow, col + 1, matrix.length, 1).setNumberFormat('@');
      }
    }
  }
  sheet.getRange(nextRow, 1, matrix.length, headers.length).setValues(matrix);
  return matrix.length;
}

function updateRowById_(sheetName, idField, idValue, obj) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName(sheetName);
  if (sheetName === 'USERS') {
    ensureUsersSheetStructure_(sheet);
  } else if (sheetName === 'MAPEL') {
    ensureMapelSheetStructure_(sheet);
  } else if (sheetName === 'KELAS') {
    ensureKelasSheetStructure_(sheet);
  } else if (sheetName === 'JADWAL') {
    ensureJadwalSheetStructure_(sheet);
  } else if (sheetName === 'PIKET') {
    ensurePiketSheetStructure_(sheet);
  } else if (sheetName === 'ABSENSI') {
    ensureAbsensiSheetStructure_(sheet);
  } else if (sheetName === 'JURNAL') {
    ensureJurnalSheetStructure_(sheet);
  } else if (sheetName === 'GURU') {
    if (obj && obj.foto_url !== undefined) {
      ensureColumnHeader_(sheet, 'FOTO URL', '#EDE9FE', '#1E1B4B', true);
    }
    if (obj && obj.id_kelas !== undefined) {
      ensureColumnHeader_(sheet, 'ID KELAS', '#EDE9FE', '#1E1B4B', true);
    }
  }
  var data = sheet.getDataRange().getValues();
  var layout = resolveSheetLayout_(sheetName, data);
  var fields = layout.fields;
  var startRow = layout.dataStartRow;
  var idCol = fields.indexOf(idField);
  if (idCol === -1) {
    throw new Error('Kolom ID ' + idField + ' tidak ditemukan pada ' + sheetName);
  }
  var textFields = getTextFields_(sheetName);
  var cleanId = String(idValue || '').trim();
  for (var r = startRow; r < data.length; r++) {
    if (String(data[r][idCol] || '').trim() === cleanId) {
      var updatedRow = fields.map(function(h, idx) {
        var existingVal = idx < data[r].length ? data[r][idx] : '';
        var nextVal = obj[h] !== undefined ? obj[h] : existingVal;
        if (textFields.indexOf(h) !== -1) {
          return String(nextVal !== undefined && nextVal !== null ? nextVal : '');
        }
        return nextVal;
      });
      if (textFields.length > 0) {
        for (var col = 0; col < fields.length; col++) {
          if (textFields.indexOf(fields[col]) !== -1) {
            sheet.getRange(r + 1, col + 1).setNumberFormat('@');
          }
        }
      }
      sheet.getRange(r + 1, 1, 1, fields.length).setValues([updatedRow]);
      SpreadsheetApp.flush();
      var resultObj = {};
      fields.forEach(function(h, idx) { resultObj[h] = updatedRow[idx]; });
      if (sheetName === 'SISWA' && !resultObj.telepon_ortu) {
        resultObj.telepon_ortu = resultObj.hp || resultObj.telepon || '';
      }
      return resultObj;
    }
  }
  throw new Error('Data dengan ID ' + cleanId + ' tidak ditemukan pada ' + sheetName);
}

function writeLog_(user, aksi, modul, detail) {
  try {
    var now = nowIso_();
    insertRow_('LOG_AKTIVITAS', {
      id_log: generateId_('LOG'),
      waktu: now,
      id_user: user.id_user || '',
      username: user.username || '',
      role: user.role || '',
      aksi: aksi,
      modul: modul,
      detail: detail,
      created_at: now
    });
  } catch (e) {
    // Abaikan kegagalan log agar tidak mengganggu transaksi utama
  }
}

var __ID_COUNTER__ = 0;

function generateId_(prefix) {
  __ID_COUNTER__ += 1;
  return prefix + '-' + Date.now().toString(36).toUpperCase() + '-' + __ID_COUNTER__.toString(36).toUpperCase() + Math.random().toString(36).substring(2, 5).toUpperCase();
}

function nowIso_() {
  return new Date().toISOString();
}

function jsonResponse_(success, message, data, errorCode) {
  var output = {
    success: success,
    message: message,
    data: data !== undefined ? data : null
  };
  if (errorCode) output.error_code = errorCode;
  return ContentService.createTextOutput(JSON.stringify(output)).setMimeType(ContentService.MimeType.JSON);
}
