# KELASKU SMART — SCHOOL MANAGEMENT PLATFORM

**Sistem Administrasi dan Manajemen Sekolah Terintegrasi**

KELASKU SMART adalah aplikasi web manajemen sekolah dasar di Indonesia berbasis **Frontend Statis (siap deploy di GitHub Pages)** dan **Backend Google Apps Script + Google Sheets** sebagai database utama sekolah (tanpa Firebase, Supabase, atau server Node.js produksi).

## Fitur Utama

1. **Autentikasi & Hak Akses 4 Role (RBAC di Backend)**
   - **Administrator**: Akses penuh seluruh modul, manajemen pengguna, tahun ajaran, pengaturan sekolah, import/export, dan backup.
   - **Kepala Sekolah**: Dashboard monitoring, data siswa, guru, kelas, absensi, rekap nilai, jurnal, karakter, kesehatan, konseling, prestasi, agenda, dan laporan.
   - **Guru**: Terbatas pada kelas dan mata pelajaran yang diampu (absensi, input nilai, rekap nilai, jurnal, karakter, buku penghubung).
   - **Orang Tua**: Terbatas pada data anak yang terhubung (biodata, kehadiran, nilai, karakter, prestasi, agenda, buku penghubung).
2. **Foto Profil Base64 (Max 200 KB) & Avatar Otomatis**
   - Semua akun, data siswa, dan data guru mendukung upload foto maksimal **200 KB** yang disimpan sebagai **Base64** di database, dengan fallback avatar inisial otomatis bila belum ada foto.
3. **Tanpa Data Dummy**
   - Database dimulai dalam keadaan kosong (`0` pada statistik, `"Belum ada data"` pada tabel).
   - Seluruh angka, grafik Chart.js, dan laporan dihitung langsung dari data aktual.
4. **Struktur Sheet Lengkap Data Siswa (66 Kolom) & Data Guru (18 Kolom)**
   - Mendukung **Tampilan Sheet Lengkap** dan **Tampilan Ringkas**, serta import/export Excel sesuai format kolom resmi.
5. **Sistem Penilaian SD Terintegrasi, Import/Export Excel (.xlsx), & Cetak PDF A4**
   - Komponen **SUM 1, SUM 2, SUM 3, SUM 4, dan SAS** (`0–100`), template Excel resmi **SheetJS**, serta laporan PDF **jsPDF + AutoTable**.
6. **Siap Deploy ke GitHub Pages**
   - Sudah dilengkapi `base: './'`, `public/.nojekyll`, `public/favicon.svg`, `public/config.js`, serta workflow otomatis **GitHub Actions** (`.github/workflows/deploy.yml`).

## Panduan Cepat Deploy ke GitHub Pages

1. Deploy `gas-backend/Code.gs` di Google Spreadsheet Anda sebagai **Web App** (`Execute as: Me`, `Who has access: Anyone`) dan jalankan fungsi `setupDatabase()` sekali.
2. Push repositori ini ke GitHub, lalu buka **Settings → Pages → Source: GitHub Actions**.
3. Workflow `.github/workflows/deploy.yml` otomatis membangun folder `dist/` dan mempublikasikannya ke GitHub Pages.
4. Setelah website terbuka, hubungkan URL Web App `/exec` melalui `public/config.js`, GitHub Variable `VITE_GAS_WEB_APP_URL`, atau langsung dari menu **Koneksi GAS** di halaman Login.

## Dokumentasi Lengkap

- Panduan Lengkap Deployment GitHub Pages & Google Apps Script: `docs/DEPLOYMENT.md`
- Struktur Database 21 Sheet: `docs/DATABASE.md`
- Kode Backend Google Apps Script: `gas-backend/Code.gs`
