# PANDUAN DEPLOYMENT — KELASKU SMART (GitHub Pages + Google Apps Script)

Aplikasi **KELASKU SMART** sudah dikonfigurasi agar siap di-deploy ke **GitHub Pages** menggunakan path relatif (`base: './'`), file `public/.nojekyll`, favicon bawaan (`public/favicon.svg`), serta workflow otomatis **GitHub Actions** (`.github/workflows/deploy.yml`).

---

## Bagian 1: Deploy Backend (Google Sheets + Google Apps Script)

> Lakukan langkah ini terlebih dahulu agar Anda memperoleh **URL Web App** untuk menghubungkan database sekolah.

1. Buka Google Drive sekolah, buat **Google Spreadsheet** baru (contoh nama: `DB_KELASKU_SMART`).
2. Di dalam Google Spreadsheet tersebut, klik menu **Extensions → Apps Script** (Ekstensi → Apps Script).
3. Hapus seluruh kode bawaan di file `Code.gs`.
4. Salin seluruh isi file `gas-backend/Code.gs` dari proyek ini, lalu tempel ke editor Apps Script.
5. Simpan proyek (Ctrl+S / Cmd+S) dan beri nama `KELASKU SMART API`.
6. Di bagian atas editor Apps Script, pilih fungsi `setupDatabase` pada dropdown fungsi, lalu klik **Run** (Jalankan) satu kali:
   - Saat muncul permintaan izin akses Google Spreadsheet, klik **Review permissions → Pilih akun Google Anda → Advanced → Go to KELASKU SMART API (unsafe) → Allow**.
   - Fungsi ini otomatis membuat **21 sheet** beserta header kolom resmi (termasuk format 2 baris Data Siswa dan kolom foto Base64) tanpa menghapus data lama dan tanpa data dummy.
   - Jika belum ada akun Administrator aktif, sistem otomatis membuat akun Admin awal di sheet `USERS` dengan kredensial:
     - **Username**: `admin`
     - **Password**: `admin123`
   - Anda juga dapat menjalankan fungsi `buatAkunAdmin` kapan saja dari dropdown fungsi GAS untuk membuat atau mereset akun `admin` / `admin123` (segera ubah password setelah berhasil masuk melalui menu **Manajemen Pengguna**).
7. Klik tombol **Deploy → New deployment**:
   - **Select type**: `Web app`
   - **Description**: `KELASKU SMART API v1`
   - **Execute as**: `Me` (akun pemilik spreadsheet)
   - **Who has access**: `Anyone` (Siapa saja — *wajib agar frontend GitHub Pages bisa mengakses API*)
8. Klik **Deploy**, lalu salin **Web app URL** yang berakhiran `/exec`, contoh:
   ```
   https://script.google.com/macros/s/AKfycbxxxxxxxxxxxxxxxxxxxx/exec
   ```

> **Catatan Penting jika Mengubah `Code.gs` di Kemudian Hari:**  
> Klik **Deploy → Manage deployments → ikon Pensil (Edit) → Version: New version → Deploy**. URL Web App tetap sama dan perubahan langsung aktif.

---

## Bagian 2: Deploy Frontend ke GitHub Pages

Anda memiliki **2 cara** untuk men-deploy frontend ke GitHub Pages. **Cara 1 (GitHub Actions)** adalah yang paling mudah dan otomatis.

### Cara 1: Otomatis via GitHub Actions (Direkomendasikan)

Workflow sudah tersedia di `.github/workflows/deploy.yml`. Anda cukup mengikuti langkah berikut:

1. **Siapkan URL Database (pilih salah satu):**
   - **Opsi A (langsung di file):** Edit `public/config.js`, isi `GAS_WEB_APP_URL` dengan URL Web App `/exec` dari Bagian 1.
   - **Opsi B (lewat GitHub Variable):** Di repositori GitHub Anda, buka **Settings → Secrets and variables → Actions → tab Variables → New repository variable**, buat variabel bernama `VITE_GAS_WEB_APP_URL` berisi URL `/exec` Anda.
   - **Opsi C (lewat Halaman Login):** Tidak perlu mengubah kode apa pun; setelah web live, isi URL `/exec` langsung melalui tombol **Koneksi GAS** di halaman Login.

2. **Upload / Push seluruh file proyek ke GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Deploy KELASKU SMART ke GitHub Pages"
   git branch -M main
   git remote add origin https://github.com/USERNAME_ANDA/NAMA_REPO.git
   git push -u origin main
   ```

3. **Aktifkan GitHub Pages dengan Source GitHub Actions:**
   - Buka repositori Anda di GitHub.
   - Masuk ke **Settings → Pages**.
   - Pada bagian **Build and deployment → Source**, pilih **GitHub Actions** (bukan *Deploy from a branch*).

4. **Tunggu Proses Build & Deploy Selesai:**
   - Buka tab **Actions** di GitHub dan lihat workflow **Deploy KELASKU SMART ke GitHub Pages**.
   - Setelah berstatus hijau (centang), alamat web Anda akan tampil, misalnya:
     ```
     https://USERNAME_ANDA.github.io/NAMA_REPO/
     ```

---

### Cara 2: Build Lokal & Upload Manual Folder `dist/`

Jika ingin membangun folder statis sendiri lalu meng-upload hasil build ke branch `gh-pages`:

1. (Opsional) Isi `GAS_WEB_APP_URL` di `public/config.js`.
2. Jalankan perintah build di komputer Anda:
   ```bash
   npm install
   npm run build
   ```
3. Hasil build siap pakai berada di dalam folder `dist/` (sudah mencakup `index.html`, `config.js`, `favicon.svg`, `.nojekyll`, dan aset JS/CSS dengan path relatif `./`).
4. Salin `dist/index.html` menjadi `dist/404.html` bila diperlukan, lalu publish isi folder `dist/` ke branch `gh-pages`, dan atur **Settings → Pages → Deploy from a branch (`gh-pages` / `/ (root)`)**.

---

## Bagian 3: Pengaturan Awal Setelah Website Live

1. Buka URL GitHub Pages Anda.
2. Jika `public/config.js` belum diisi, klik **Koneksi GAS** di halaman Login → tempel URL `/exec` Google Apps Script → klik **Tes & Simpan**.
3. Saat database masih kosong (0 pengguna), sistem menampilkan tombol **Buat Admin**. Klik tombol tersebut untuk membuat akun **Administrator** pertama sekolah.
4. Masuk sebagai Administrator, lalu buka menu:
   - **Tahun Ajaran**: tambah & aktifkan Tahun Ajaran berjalan.
   - **Pengaturan Sekolah**: lengkapi Nama Sekolah, NPSN, Alamat, dan Semester (Nama Sekolah akan otomatis tampil di halaman Login setelah tersimpan).
   - **Manajemen Pengguna** & **Data Master**: tambah akun Guru, Kepala Sekolah, Orang Tua, serta data Siswa dan Guru (termasuk upload foto profil maksimal 200 KB yang tersimpan sebagai Base64).

---

## Troubleshooting

- **Halaman kosong / aset JS/CSS gagal dimuat di GitHub Pages:**  
  Pastikan `vite.config.ts` menggunakan `base: './'` (sudah dikonfigurasi) dan file `public/.nojekyll` ikut ter-upload.
- **Gagal terhubung ke Google Apps Script (CORS / Error JSON):**  
  Pastikan saat Deploy Web App di Google Apps Script opsi **Who has access** dipilih **Anyone**, dan URL yang ditempel berakhiran `/exec` (bukan `/dev`).
- **Workflow GitHub Actions gagal karena izin Pages:**  
  Pastikan di GitHub **Settings → Pages → Source** sudah dipilih **GitHub Actions**, dan pada **Settings → Actions → General → Workflow permissions** diizinkan membaca/menulis sesuai konfigurasi workflow.
