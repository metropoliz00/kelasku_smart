/**
 * ============================================================================
 * KELASKU SMART - GOOGLE APPS SCRIPT BACKEND (Code.gs)
 * ============================================================================
 * Sistem Administrasi dan Manajemen Sekolah Dasar Terintegrasi
 * Database: Google Spreadsheet (21 Sheets)
 *
 * CATATAN KEAMANAN PENTING:
 * Sesuai spesifikasi konfigurasi awal, kolom `password` pada sheet USERS
 * menggunakan teks biasa (plain text) untuk pencocokan langsung.
 * Untuk penggunaan operasional sekolah dengan data nyata, sangat disarankan
 * mengganti mekanisme autentikasi dengan password hashing (mis. SHA-256 + salt)
 * atau Google Workspace SSO. Password tidak pernah dikirim dalam respons API.
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
    'status_akun', 'id_guru', 'created_at', 'updated_at', 'foto_url'
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
    'petugas_siswa', 'tugas', 'keterangan', 'created_at', 'updated_at'
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
  'STATUS AKUN', 'ID GURU', 'CREATED AT', 'UPDATED AT', 'FOTO URL'
];

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
 * Setup struktur 21 sheet tanpa menghapus data yang ada dan tanpa data dummy.
 * Otomatis membuat akun ADMIN default (admin / admin123) jika belum ada admin aktif.
 * Aman dijalankan berulang kali.
 */
function setupDatabase(skipDefaultAdmin) {
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
          ensureColumnHeader_(sheet, 'foto_url', '#EDE9FE', '#000000', false);
        } else if (name === 'GURU') {
          ensureColumnHeader_(sheet, 'FOTO URL', '#EDE9FE', '#1E1B4B', true);
        }
      }
      verified.push(name);
    }
  }

  var defaultAdminCreated = false;
  if (!skipDefaultAdmin) {
    defaultAdminCreated = !!ensureDefaultAdmin_();
  }

  return {
    created_sheets: created,
    verified_sheets: verified,
    total_sheets: sheetNames.length,
    default_admin_created: defaultAdminCreated
  };
}

/**
 * Memastikan minimal ada 1 akun ADMIN aktif di sheet USERS.
 * Jika belum ada, otomatis membuat akun default (admin / admin123).
 */
function ensureDefaultAdmin_() {
  var users = readSheetObjects_('USERS');
  var hasActiveAdmin = users.some(function(u) {
    var role = String(u.role || '').trim().toUpperCase();
    var status = String(u.status || 'Aktif').trim().toLowerCase();
    var uname = String(u.username || '').trim();
    var pwd = String(u.password !== undefined && u.password !== null ? u.password : '').trim();
    return role === 'ADMIN' && status === 'aktif' && uname !== '' && pwd !== '';
  });
  if (hasActiveAdmin) {
    return null;
  }

  var now = nowIso_();
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
  return sanitizeUser_(defaultAdmin);
}

/**
 * Fungsi khusus untuk dijalankan manual dari Editor Google Apps Script
 * (Pilih fungsi "buatAkunAdmin" -> klik Run) guna membuat atau mereset
 * akun Administrator default (username: admin, password: admin123).
 */
function buatAkunAdmin() {
  setupDatabase(true);
  var users = readSheetObjects_('USERS');
  var existingAdmin = null;
  for (var i = 0; i < users.length; i++) {
    if (String(users[i].username || '').trim().toLowerCase() === DEFAULT_ADMIN_CONFIG.username.toLowerCase()) {
      existingAdmin = users[i];
      break;
    }
  }
  var now = nowIso_();
  if (existingAdmin && String(existingAdmin.id_user || '').trim() !== '') {
    var updated = updateRowById_('USERS', 'id_user', existingAdmin.id_user, {
      username: DEFAULT_ADMIN_CONFIG.username,
      password: DEFAULT_ADMIN_CONFIG.password,
      nama_lengkap: existingAdmin.nama_lengkap || DEFAULT_ADMIN_CONFIG.nama_lengkap,
      role: 'ADMIN',
      relasi_nama: existingAdmin.relasi_nama || 'Administrator Sekolah',
      status: 'Aktif',
      updated_at: now
    });
    Logger.log('Akun ADMIN berhasil diperbarui/diaktifkan. Username: ' + DEFAULT_ADMIN_CONFIG.username + ' | Password: ' + DEFAULT_ADMIN_CONFIG.password);
    return sanitizeUser_(updated);
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
  Logger.log('Akun ADMIN berhasil dibuat. Username: ' + DEFAULT_ADMIN_CONFIG.username + ' | Password: ' + DEFAULT_ADMIN_CONFIG.password);
  return sanitizeUser_(newAdmin);
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
      var usersList = readSheetObjects_('USERS');
      var userCount = usersList.length;
      var schoolInfo = getSchoolSettingsData_();
      return jsonResponse_(true, 'Terhubung ke Google Spreadsheet.', {
        status: 'connected',
        needs_initial_admin: userCount === 0,
        user_count: userCount,
        gas_version: '2026-admin-ready',
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
        if (freshUsers[fu].id_user === sessionUser.id_user) {
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
      return jsonResponse_(true, 'Dashboard dimuat.', buildDashboard_(user));

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
      return deleteById_('SISWA', 'id_siswa', payload.id_siswa, user, 'Hapus Siswa');
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
      return deleteById_('GURU', 'id_guru', payload.id_guru, user, 'Hapus Guru');
    case 'importTeachers':
      requireRole_(user, ['ADMIN']);
      return importTeachers_(payload, user);

    // Kelas
    case 'getClasses':
      return jsonResponse_(true, 'Data kelas dimuat.', getClassesWithCount_(user));
    case 'createClass':
      requireRole_(user, ['ADMIN']);
      return createGeneric_('KELAS', 'id_kelas', 'KLS', payload, user, 'Tambah Kelas');
    case 'updateClass':
      requireRole_(user, ['ADMIN']);
      return updateGeneric_('KELAS', 'id_kelas', payload, user, 'Edit Kelas');
    case 'deleteClass':
      requireRole_(user, ['ADMIN']);
      return deleteById_('KELAS', 'id_kelas', payload.id_kelas, user, 'Hapus Kelas');

    // Mapel
    case 'getSubjects':
      return jsonResponse_(true, 'Data mata pelajaran dimuat.', readSheetObjects_('MAPEL'));
    case 'createSubject':
      requireRole_(user, ['ADMIN']);
      return createSubject_(payload, user);
    case 'updateSubject':
      requireRole_(user, ['ADMIN']);
      return updateGeneric_('MAPEL', 'id_mapel', payload, user, 'Edit Mapel');
    case 'deleteSubject':
      requireRole_(user, ['ADMIN']);
      return deleteById_('MAPEL', 'id_mapel', payload.id_mapel, user, 'Hapus Mapel');

    // Jadwal & Piket
    case 'getSchedules':
      return jsonResponse_(true, 'Jadwal dimuat.', getScopedSchedules_(user));
    case 'createSchedule':
      requireRole_(user, ['ADMIN']);
      return createGeneric_('JADWAL', 'id_jadwal', 'JDW', payload, user, 'Tambah Jadwal');
    case 'updateSchedule':
      requireRole_(user, ['ADMIN']);
      return updateGeneric_('JADWAL', 'id_jadwal', payload, user, 'Edit Jadwal');
    case 'deleteSchedule':
      requireRole_(user, ['ADMIN']);
      return deleteById_('JADWAL', 'id_jadwal', payload.id_jadwal, user, 'Hapus Jadwal');

    case 'getPickets':
      requireRole_(user, ['ADMIN', 'KEPALA_SEKOLAH', 'GURU']);
      return jsonResponse_(true, 'Jadwal piket dimuat.', readSheetObjects_('PIKET'));
    case 'createPicket':
      requireRole_(user, ['ADMIN', 'GURU']);
      return createGeneric_('PIKET', 'id_piket', 'PKT', payload, user, 'Tambah Piket');
    case 'updatePicket':
      requireRole_(user, ['ADMIN', 'GURU']);
      return updateGeneric_('PIKET', 'id_piket', payload, user, 'Edit Piket');
    case 'deletePicket':
      requireRole_(user, ['ADMIN', 'GURU']);
      return deleteById_('PIKET', 'id_piket', payload.id_piket, user, 'Hapus Piket');

    // Absensi
    case 'getAttendance':
      return jsonResponse_(true, 'Data absensi dimuat.', getScopedByStudentOrClass_('ABSENSI', user));
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
      return createGeneric_('JURNAL', 'id_jurnal', 'JRN', payload, user, 'Tambah Jurnal');
    case 'updateJournal':
      requireRole_(user, ['ADMIN', 'GURU']);
      return updateGeneric_('JURNAL', 'id_jurnal', payload, user, 'Edit Jurnal');
    case 'deleteJournal':
      requireRole_(user, ['ADMIN', 'GURU']);
      return deleteById_('JURNAL', 'id_jurnal', payload.id_jurnal, user, 'Hapus Jurnal');

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
      var users = readSheetObjects_('USERS').map(sanitizeUser_);
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

    default:
      return jsonResponse_(false, 'Aksi API tidak dikenali: ' + action, null, 'UNKNOWN_ACTION');
  }
}

// ============================================================================
// AUTENTIKASI & SESSION
// ============================================================================

function handleLogin_(payload) {
  setupDatabase();
  var username = String(payload.username || '').trim();
  var password = String(payload.password || '').trim();

  if (!username || !password) {
    return jsonResponse_(false, 'Username dan password wajib diisi.', null, 'VALIDATION_ERROR');
  }

  var users = readSheetObjects_('USERS');
  var found = null;
  for (var i = 0; i < users.length; i++) {
    if (String(users[i].username || '').trim().toLowerCase() === username.toLowerCase()) {
      found = users[i];
      break;
    }
  }

  var storedPassword = found && found.password !== undefined && found.password !== null
    ? String(found.password).trim()
    : '';
  if (!found || storedPassword !== password) {
    return jsonResponse_(false, 'Username atau password tidak sesuai.', null, 'INVALID_CREDENTIALS');
  }

  var statusVal = String(found.status || 'Aktif').trim().toLowerCase();
  if (statusVal !== 'aktif') {
    return jsonResponse_(false, 'Akun pengguna sedang dinonaktifkan. Hubungi Administrator.', null, 'ACCOUNT_INACTIVE');
  }

  if (!found.id_user) {
    found.id_user = generateId_('USR');
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
  return {
    id_user: u.id_user || '',
    username: u.username || '',
    nama_lengkap: u.nama_lengkap || '',
    role: u.role || 'GURU',
    relasi_id: u.relasi_id || '',
    relasi_nama: u.relasi_nama || '',
    status: u.status || 'Aktif',
    foto_url: u.foto_url || '',
    created_at: u.created_at || '',
    updated_at: u.updated_at || ''
  };
}

function requireRole_(user, allowedRoles) {
  if (allowedRoles.indexOf(user.role) === -1) {
    throw new Error('Akses ditolak. Role Anda (' + user.role + ') tidak memiliki izin untuk aksi ini.');
  }
}

// ============================================================================
// HAK AKSES DATA (BACKEND SCOPING)
// ============================================================================

function getTeacherAssignedClassIds_(user) {
  if (user.role !== 'GURU') return null;
  var teacherId = user.relasi_id;
  var classIds = {};
  var classes = readSheetObjects_('KELAS');
  for (var i = 0; i < classes.length; i++) {
    if (classes[i].wali_kelas_id === teacherId) {
      classIds[classes[i].id_kelas] = true;
    }
  }
  var schedules = readSheetObjects_('JADWAL');
  for (var j = 0; j < schedules.length; j++) {
    if (schedules[j].id_guru === teacherId && schedules[j].id_kelas) {
      classIds[schedules[j].id_kelas] = true;
    }
  }
  return classIds;
}

function getScopedStudents_(user) {
  var all = readSheetObjects_('SISWA');
  if (user.role === 'ADMIN' || user.role === 'KEPALA_SEKOLAH') return all;
  if (user.role === 'ORANG_TUA') {
    return all.filter(function(s) { return s.id_siswa === user.relasi_id; });
  }
  if (user.role === 'GURU') {
    var allowed = getTeacherAssignedClassIds_(user);
    return all.filter(function(s) { return !!allowed[s.id_kelas]; });
  }
  return [];
}

function getClassesWithCount_(user) {
  var classes = readSheetObjects_('KELAS');
  var students = readSheetObjects_('SISWA');
  var counts = {};
  for (var i = 0; i < students.length; i++) {
    var cid = students[i].id_kelas;
    if (cid) counts[cid] = (counts[cid] || 0) + 1;
  }
  var result = classes.map(function(c) {
    c.jumlah_siswa = counts[c.id_kelas] || 0;
    return c;
  });
  if (user.role === 'GURU') {
    var allowed = getTeacherAssignedClassIds_(user);
    return result.filter(function(c) { return !!allowed[c.id_kelas]; });
  }
  if (user.role === 'ORANG_TUA') {
    var child = students.filter(function(s) { return s.id_siswa === user.relasi_id; })[0];
    if (!child) return [];
    return result.filter(function(c) { return c.id_kelas === child.id_kelas; });
  }
  return result;
}

function getScopedSchedules_(user) {
  var all = readSheetObjects_('JADWAL');
  if (user.role === 'ADMIN' || user.role === 'KEPALA_SEKOLAH') return all;
  if (user.role === 'GURU') {
    var allowed = getTeacherAssignedClassIds_(user);
    return all.filter(function(j) { return j.id_guru === user.relasi_id || !!allowed[j.id_kelas]; });
  }
  if (user.role === 'ORANG_TUA') {
    var child = readSheetObjects_('SISWA').filter(function(s) { return s.id_siswa === user.relasi_id; })[0];
    if (!child) return [];
    return all.filter(function(j) { return j.id_kelas === child.id_kelas; });
  }
  return [];
}

function getScopedByStudentOrClass_(sheetName, user) {
  var all = readSheetObjects_(sheetName);
  if (user.role === 'ADMIN' || user.role === 'KEPALA_SEKOLAH') return all;
  if (user.role === 'ORANG_TUA') {
    return all.filter(function(r) { return r.id_siswa === user.relasi_id; });
  }
  if (user.role === 'GURU') {
    var allowed = getTeacherAssignedClassIds_(user);
    return all.filter(function(r) { return !!allowed[r.id_kelas]; });
  }
  return [];
}

function getScopedJournals_(user) {
  var all = readSheetObjects_('JURNAL');
  if (user.role === 'ADMIN' || user.role === 'KEPALA_SEKOLAH') return all;
  if (user.role === 'GURU') {
    var allowed = getTeacherAssignedClassIds_(user);
    return all.filter(function(j) { return j.id_guru === user.relasi_id || !!allowed[j.id_kelas]; });
  }
  return [];
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
  payload.id_siswa = generateId_('SIS');
  payload.created_at = now;
  payload.updated_at = now;
  insertRow_('SISWA', payload);
  writeLog_(user, 'CREATE', 'SISWA', 'Menambah siswa ' + nama + ' (NIS: ' + nis + ')');
  return jsonResponse_(true, 'Data siswa berhasil ditambahkan.', payload);
}

function updateStudent_(payload, user) {
  var id = payload.id_siswa;
  var nis = String(payload.nis || '').trim();
  var nisn = String(payload.nisn || '').trim();
  var existing = readSheetObjects_('SISWA');
  for (var i = 0; i < existing.length; i++) {
    if (existing[i].id_siswa !== id) {
      if (nis && String(existing[i].nis).trim() === nis) {
        return jsonResponse_(false, 'NIS "' + nis + '" sudah digunakan siswa lain.', null, 'DUPLICATE_NIS');
      }
      if (nisn && String(existing[i].nisn).trim() === nisn) {
        return jsonResponse_(false, 'NISN "' + nisn + '" sudah digunakan siswa lain.', null, 'DUPLICATE_NISN');
      }
    }
  }
  resolveClassMeta_(payload);
  var hp = String(payload.hp || '').trim();
  var telp = String(payload.telepon || '').trim();
  var ortu = String(payload.telepon_ortu || '').trim();
  if (!hp && ortu) payload.hp = ortu;
  payload.telepon_ortu = ortu || hp || telp || '';
  payload.updated_at = nowIso_();
  var updated = updateRowById_('SISWA', 'id_siswa', id, payload);
  writeLog_(user, 'UPDATE', 'SISWA', 'Memperbarui siswa ' + updated.nama_lengkap);
  return jsonResponse_(true, 'Data siswa berhasil diperbarui.', updated);
}

function importStudents_(payload, user) {
  var rows = payload.rows || [];
  if (!rows.length) return jsonResponse_(false, 'Tidak ada data untuk diimpor.', null, 'EMPTY');
  var existing = readSheetObjects_('SISWA');
  var nisSet = {};
  var nisnSet = {};
  existing.forEach(function(s) {
    if (s.nis) nisSet[String(s.nis).trim()] = true;
    if (s.nisn) nisnSet[String(s.nisn).trim()] = true;
  });
  var inserted = [];
  var now = nowIso_();
  var seq = existing.length;
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    var nis = String(r.nis || '').trim();
    var nisn = String(r.nisn || '').trim();
    if (!nis || !r.nama_lengkap) continue;
    if (nisSet[nis] || (nisn && nisnSet[nisn])) continue;
    nisSet[nis] = true;
    if (nisn) nisnSet[nisn] = true;
    normalizeStudentPayload_(r, seq);
    seq++;
    r.id_siswa = generateId_('SIS');
    r.created_at = now;
    r.updated_at = now;
    insertRow_('SISWA', r);
    inserted.push(r);
  }
  writeLog_(user, 'IMPORT', 'SISWA', 'Mengimpor ' + inserted.length + ' siswa dari Excel');
  return jsonResponse_(true, inserted.length + ' data siswa berhasil diimpor.', { count: inserted.length });
}

function createTeacher_(payload, user) {
  var nama = String(payload.nama_guru || '').trim();
  if (!nama) return jsonResponse_(false, 'Nama guru wajib diisi.', null, 'VALIDATION_ERROR');
  var existing = readSheetObjects_('GURU');
  var now = nowIso_();
  if (payload.no === undefined || payload.no === null || String(payload.no).trim() === '') {
    payload.no = existing.length + 1;
  }
  payload.status_akun = payload.status_akun || 'Aktif';
  payload.id_guru = generateId_('GRU');
  payload.created_at = now;
  payload.updated_at = now;
  insertRow_('GURU', payload);
  writeLog_(user, 'CREATE', 'GURU', 'Menambah guru ' + nama);
  return jsonResponse_(true, 'Data guru berhasil ditambahkan.', payload);
}

function updateTeacher_(payload, user) {
  payload.updated_at = nowIso_();
  var updated = updateRowById_('GURU', 'id_guru', payload.id_guru, payload);
  writeLog_(user, 'UPDATE', 'GURU', 'Memperbarui guru ' + updated.nama_guru);
  return jsonResponse_(true, 'Data guru berhasil diperbarui.', updated);
}

function importTeachers_(payload, user) {
  var rows = payload.rows || [];
  var existing = readSheetObjects_('GURU');
  var now = nowIso_();
  var count = 0;
  var seq = existing.length;
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    if (!r.nama_guru) continue;
    if (r.no === undefined || r.no === null || String(r.no).trim() === '') {
      r.no = seq + 1;
    }
    seq++;
    r.id_guru = generateId_('GRU');
    r.status_akun = r.status_akun || 'Aktif';
    r.created_at = now;
    r.updated_at = now;
    insertRow_('GURU', r);
    count++;
  }
  writeLog_(user, 'IMPORT', 'GURU', 'Mengimpor ' + count + ' guru dari Excel');
  return jsonResponse_(true, count + ' data guru berhasil diimpor.', { count: count });
}

function createSubject_(payload, user) {
  var kode = String(payload.kode_mapel || '').trim();
  var nama = String(payload.nama_mapel || '').trim();
  if (!kode || !nama) return jsonResponse_(false, 'Kode dan Nama Mata Pelajaran wajib diisi.', null, 'VALIDATION_ERROR');
  var existing = readSheetObjects_('MAPEL');
  if (existing.some(function(m) { return String(m.kode_mapel).trim().toLowerCase() === kode.toLowerCase(); })) {
    return jsonResponse_(false, 'Kode mata pelajaran "' + kode + '" sudah digunakan.', null, 'DUPLICATE_CODE');
  }
  return createGeneric_('MAPEL', 'id_mapel', 'MPL', payload, user, 'Tambah Mata Pelajaran');
}

function saveAttendanceBatch_(payload, user) {
  var records = payload.records || [];
  if (!records.length) return jsonResponse_(false, 'Tidak ada data absensi untuk disimpan.', null, 'EMPTY');
  var existing = readSheetObjects_('ABSENSI');
  var now = nowIso_();
  var saved = [];

  for (var i = 0; i < records.length; i++) {
    var rec = records[i];
    var match = null;
    for (var j = 0; j < existing.length; j++) {
      if (existing[j].id_siswa === rec.id_siswa && existing[j].tanggal === rec.tanggal) {
        match = existing[j];
        break;
      }
    }
    if (match) {
      if (!rec.koreksi_catatan && match.status !== rec.status) {
        rec.koreksi_catatan = 'Koreksi oleh ' + user.nama_lengkap + ' pada ' + now;
      }
      rec.id_absensi = match.id_absensi;
      rec.created_at = match.created_at;
      rec.updated_at = now;
      rec.diinput_oleh = user.nama_lengkap;
      updateRowById_('ABSENSI', 'id_absensi', match.id_absensi, rec);
      saved.push(rec);
    } else {
      rec.id_absensi = generateId_('ABS');
      rec.diinput_oleh = user.nama_lengkap;
      rec.created_at = now;
      rec.updated_at = now;
      insertRow_('ABSENSI', rec);
      saved.push(rec);
    }
  }
  writeLog_(user, 'SAVE', 'ABSENSI', 'Menyimpan ' + saved.length + ' entri absensi');
  return jsonResponse_(true, saved.length + ' data absensi berhasil disimpan.', saved);
}

function saveGradesBatch_(payload, user) {
  var records = payload.records || [];
  if (!records.length) return jsonResponse_(false, 'Tidak ada data nilai untuk disimpan.', null, 'EMPTY');
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
  var username = String(payload.username || '').trim();
  var password = String(payload.password || '');
  if (!username || !password || !payload.nama_lengkap) {
    return jsonResponse_(false, 'Username, password, dan nama lengkap wajib diisi.', null, 'VALIDATION_ERROR');
  }
  var fotoUrl = String(payload.foto_url || '');
  if (fotoUrl.length > 49500) {
    return jsonResponse_(false, 'Ukuran data foto Base64 melebihi batas sel spreadsheet.', null, 'VALIDATION_ERROR');
  }
  var existing = readSheetObjects_('USERS');
  if (existing.some(function(u) { return String(u.username).trim() === username; })) {
    return jsonResponse_(false, 'Username "' + username + '" sudah digunakan.', null, 'DUPLICATE_USERNAME');
  }
  var now = nowIso_();
  var newUser = {
    id_user: generateId_('USR'),
    username: username,
    password: password,
    nama_lengkap: String(payload.nama_lengkap).trim(),
    role: payload.role || 'GURU',
    relasi_id: payload.relasi_id || '',
    relasi_nama: payload.relasi_nama || '',
    status: payload.status || 'Aktif',
    foto_url: fotoUrl,
    created_at: now,
    updated_at: now
  };
  insertRow_('USERS', newUser);
  writeLog_(user, 'CREATE', 'USERS', 'Menambah akun pengguna ' + username + ' (' + newUser.role + ')');
  return jsonResponse_(true, 'Pengguna berhasil ditambahkan.', sanitizeUser_(newUser));
}

function updateUser_(payload, user) {
  var id = payload.id_user;
  var existing = readSheetObjects_('USERS');
  var current = existing.filter(function(u) { return u.id_user === id; })[0];
  if (!current) return jsonResponse_(false, 'Pengguna tidak ditemukan.', null, 'NOT_FOUND');

  var username = String(payload.username || current.username).trim();
  if (existing.some(function(u) { return u.id_user !== id && String(u.username).trim() === username; })) {
    return jsonResponse_(false, 'Username "' + username + '" sudah digunakan pengguna lain.', null, 'DUPLICATE_USERNAME');
  }

  var nextFoto = payload.foto_url !== undefined ? String(payload.foto_url || '') : (current.foto_url || '');
  if (nextFoto.length > 49500) {
    return jsonResponse_(false, 'Ukuran data foto Base64 melebihi batas sel spreadsheet.', null, 'VALIDATION_ERROR');
  }

  var merged = {
    id_user: id,
    username: username,
    password: payload.new_password ? String(payload.new_password) : current.password,
    nama_lengkap: payload.nama_lengkap !== undefined ? payload.nama_lengkap : current.nama_lengkap,
    role: payload.role !== undefined ? payload.role : current.role,
    relasi_id: payload.relasi_id !== undefined ? payload.relasi_id : current.relasi_id,
    relasi_nama: payload.relasi_nama !== undefined ? payload.relasi_nama : current.relasi_nama,
    status: payload.status !== undefined ? payload.status : current.status,
    foto_url: nextFoto,
    created_at: current.created_at,
    updated_at: nowIso_()
  };
  updateRowById_('USERS', 'id_user', id, merged);
  writeLog_(user, 'UPDATE', 'USERS', 'Memperbarui akun ' + username);
  return jsonResponse_(true, 'Data pengguna berhasil diperbarui.', sanitizeUser_(merged));
}

function updateOwnProfile_(payload, user, token) {
  var existing = readSheetObjects_('USERS');
  var current = existing.filter(function(u) { return u.id_user === user.id_user; })[0];
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

function buildDashboard_(user) {
  var students = getScopedStudents_(user);
  var teachers = readSheetObjects_('GURU');
  var classes = getClassesWithCount_(user);
  var subjects = readSheetObjects_('MAPEL');
  var attendance = getScopedByStudentOrClass_('ABSENSI', user);
  var grades = getScopedByStudentOrClass_('NILAI', user);
  var achievements = getScopedByStudentOrClass_('PRESTASI', user);
  var agendas = getScopedAgendas_(user);
  var logs = (user.role === 'ADMIN' || user.role === 'KEPALA_SEKOLAH')
    ? readSheetObjects_('LOG_AKTIVITAS').slice(-10).reverse()
    : [];

  var totalHadir = 0;
  var totalTidakHadir = 0;
  var statusCounts = { Hadir: 0, Sakit: 0, Izin: 0, Alpa: 0, Terlambat: 0 };
  attendance.forEach(function(a) {
    if (statusCounts[a.status] !== undefined) statusCounts[a.status]++;
    if (a.status === 'Hadir' || a.status === 'Terlambat') totalHadir++;
    else totalTidakHadir++;
  });
  var pctKehadiran = attendance.length > 0 ? Math.round((totalHadir / attendance.length) * 1000) / 10 : 0;

  var siswaPerKelas = classes.map(function(c) {
    return { nama_kelas: c.nama_kelas, jumlah: c.jumlah_siswa || 0 };
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
    attendance: getScopedByStudentOrClass_('ABSENSI', user),
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
      result[name] = readSheetObjects_('USERS').map(sanitizeUser_);
    } else {
      result[name] = readSheetObjects_(name);
    }
  }
  writeLog_(user, 'BACKUP', 'DATABASE', 'Mengekspor cadangan seluruh database');
  return jsonResponse_(true, 'Backup database siap diunduh.', result);
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
  writeLog_(user, 'CREATE', sheetName, logTitle);
  return jsonResponse_(true, 'Data berhasil disimpan.', payload);
}

function updateGeneric_(sheetName, idField, payload, user, logTitle) {
  payload.updated_at = nowIso_();
  var updated = updateRowById_(sheetName, idField, payload[idField], payload);
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
      return {
        fields: hasGuruFoto
          ? SHEETS_SCHEMA.GURU
          : SHEETS_SCHEMA.GURU.filter(function(f) { return f !== 'foto_url'; }),
        dataStartRow: 1
      };
    }
  }
  if (sheetName === 'USERS') {
    return {
      fields: row0.map(function(h) {
        return String(h || '').trim().toLowerCase().replace(/\s+/g, '_');
      }),
      dataStartRow: 1
    };
  }
  return {
    fields: row0,
    dataStartRow: 1
  };
}

function deleteById_(sheetName, idField, idValue, user, logTitle) {
  if (!idValue) return jsonResponse_(false, 'ID data wajib disertakan.', null, 'VALIDATION_ERROR');
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
    if (String(data[r][idCol]) === String(idValue)) {
      sheet.deleteRow(r + 1);
      writeLog_(user, 'DELETE', sheetName, logTitle + ' (' + idValue + ')');
      return jsonResponse_(true, 'Data berhasil dihapus.', { id: idValue });
    }
  }
  return jsonResponse_(false, 'Data tidak ditemukan.', null, 'NOT_FOUND');
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

  var result = [];
  for (var r = startRow; r < values.length; r++) {
    var rowObj = {};
    var hasValue = false;
    for (var c = 0; c < fields.length; c++) {
      var val = c < values[r].length ? values[r][c] : '';
      if (val instanceof Date) {
        val = val.toISOString();
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
    if (hasValue) result.push(rowObj);
  }
  return result;
}

function insertRow_(sheetName, obj) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    setupDatabase();
    sheet = ss.getSheetByName(sheetName);
  }
  if (sheetName === 'USERS') {
    ensureColumnHeader_(sheet, 'foto_url', '#EDE9FE', '#000000', false);
  } else if (sheetName === 'GURU') {
    ensureColumnHeader_(sheet, 'FOTO URL', '#EDE9FE', '#1E1B4B', true);
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
          return sheetName === 'USERS' ? clean.toLowerCase().replace(/\s+/g, '_') : clean;
        });
      }
    }
  }
  var row = headers.map(function(h) {
    return obj[h] !== undefined && obj[h] !== null ? obj[h] : '';
  });
  sheet.appendRow(row);
}

function updateRowById_(sheetName, idField, idValue, obj) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName(sheetName);
  if (obj && obj.foto_url !== undefined) {
    if (sheetName === 'USERS') {
      ensureColumnHeader_(sheet, 'foto_url', '#EDE9FE', '#000000', false);
    } else if (sheetName === 'GURU') {
      ensureColumnHeader_(sheet, 'FOTO URL', '#EDE9FE', '#1E1B4B', true);
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
  for (var r = startRow; r < data.length; r++) {
    if (String(data[r][idCol]) === String(idValue)) {
      var updatedRow = fields.map(function(h, idx) {
        var existingVal = idx < data[r].length ? data[r][idx] : '';
        return obj[h] !== undefined ? obj[h] : existingVal;
      });
      sheet.getRange(r + 1, 1, 1, fields.length).setValues([updatedRow]);
      var resultObj = {};
      fields.forEach(function(h, idx) { resultObj[h] = updatedRow[idx]; });
      if (sheetName === 'SISWA' && !resultObj.telepon_ortu) {
        resultObj.telepon_ortu = resultObj.hp || resultObj.telepon || '';
      }
      return resultObj;
    }
  }
  throw new Error('Data dengan ID ' + idValue + ' tidak ditemukan pada ' + sheetName);
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

function generateId_(prefix) {
  return prefix + '-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
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
