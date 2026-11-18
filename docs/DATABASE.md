# STRUKTUR DATABASE GOOGLE SHEETS — KELASKU SMART

Database terdiri dari **21 Sheet** yang dibuat secara otomatis oleh fungsi `setupDatabase()` pada `gas-backend/Code.gs` tanpa menghapus data yang sudah ada dan tanpa memasukkan data dummy.

| No | Nama Sheet | Kolom Utama |
|---|---|---|
| 1 | `USERS` | `id_user`, `username`, `password`, `nama_lengkap`, `role`, `relasi_id`, `relasi_nama`, `status`, `created_at`, `updated_at`, `foto_url` |
| 2 | `IDENTITAS_SEKOLAH` | `id`, `nama_sekolah`, `npsn`, `alamat`, `kecamatan`, `kabupaten`, `provinsi`, `email`, `tahun_ajaran_aktif_id`, `tahun_ajaran_aktif`, `semester_aktif`, `peringkat_aktif`, `updated_at` |
| 3 | `TAHUN_AJARAN` | `id_tahun_ajaran`, `nama_tahun_ajaran`, `semester`, `status`, `keterangan`, `created_at`, `updated_at` |
| 4 | `SISWA` | Format 2 baris header (66 kolom utama + 6 kolom sistem): `No`, `Nama`, `NIS`, `JK`, `NISN`, `Tempat Lahir`, `Tanggal Lahir`, `NIK`, `Agama`, `Alamat`, `RT`, `RW`, `Dusun`, `Kelurahan`, `Kecamatan`, `Kode Pos`, `Jenis Tinggal`, `Alat Transportasi`, `Telepon`, `HP`, `E-Mail`, `SKHUN`, `Penerima KPS`, `No. KPS`, Grup `Data Ayah` (`Nama`, `Tahun Lahir`, `Jenjang Pendidikan`, `Pekerjaan`, `Penghasilan`, `NIK`), Grup `Data Ibu` (`Nama`, `Tahun Lahir`, `Jenjang Pendidikan`, `Pekerjaan`, `Penghasilan`, `NIK`), Grup `Data Wali` (`Nama`, `Tahun Lahir`, `Jenjang Pendidikan`, `Pekerjaan`, `Penghasilan`, `NIK`), `Rombel Saat Ini`, `No. Peserta Ujian Nasional`, `No. Seri Ijazah`, `Penerima KIP`, `Nomor KIP`, `Nama di KIP`, `Nomor KKS`, `No. Registrasi Akta Lahir`, `Bank`, `Nomor Rekening Bank`, `Rekening Atas Nama`, `Layak PIP (Usulan dari Sekolah)`, `Alasan Layak PIP`, `Kebutuhan Khusus`, `Sekolah Asal`, `Anak ke-berapa`, `Lintang`, `Bujur`, `No. KK`, `Berat Badan`, `Tinggi Badan`, `Lingkar Kepala`, `Jml. Saudara Kandung`, `Jarak Rumah ke Sekolah (KM)`, `Status Siswa`, `ID Kelas`, `ID Siswa`, `Foto URL`, `Created At`, `Updated At` |
| 5 | `GURU` | 18 kolom utama + 10 kolom sistem: `NO`, `NAMA`, `NIP`, `NUPTK`, `JENIS KELAMIN`, `TEMPAT LAHIR`, `TANGGAL LAHIR`, `IJAZAH TERTINGGI`, `JABATAN`, `STATUS`, `TMT PENGANGKATAN`, `MULAI BEKERJA DISINI`, `PANGKAT/GOL`, `MASA KERJA (THN)`, `MASA KERJA (BLN)`, `TANGGAL DAN NO SK TERAKHIR`, `EMAIL PRIBADI`, `EMAIL BELAJAR`, `MATA PELAJARAN`, `WALI KELAS ID`, `WALI KELAS`, `TELEPON`, `USERNAME`, `STATUS AKUN`, `ID GURU`, `CREATED AT`, `UPDATED AT`, `FOTO URL` |
| 6 | `KELAS` | `id_kelas`, `nama_kelas`, `tingkat`, `wali_kelas_id`, `wali_kelas`, `id_tahun_ajaran`, `tahun_ajaran`, `created_at`, `updated_at` |
| 7 | `MAPEL` | `id_mapel`, `kode_mapel`, `nama_mapel`, `kelompok`, `alokasi_waktu`, `status_aktif`, `created_at`, `updated_at` |
| 8 | `JADWAL` | `id_jadwal`, `id_tahun_ajaran`, `semester`, `hari`, `jam_ke`, `waktu_mulai`, `waktu_selesai`, `id_kelas`, `nama_kelas`, `id_mapel`, `nama_mapel`, `id_guru`, `nama_guru`, `created_at`, `updated_at` |
| 9 | `PIKET` | `id_piket`, `hari`, `id_kelas`, `nama_kelas`, `id_guru`, `nama_guru`, `id_siswa`, `petugas_siswa`, `tugas`, `checklist_kebersihan`, `keterangan`, `created_at`, `updated_at` |
| 10 | `ABSENSI` | `id_absensi`, `tanggal`, `id_tahun_ajaran`, `semester`, `id_kelas`, `nama_kelas`, `id_siswa`, `nama_siswa`, `status`, `keterangan`, `koreksi_catatan`, `diinput_oleh`, `created_at`, `updated_at` |
| 11 | `NILAI` | `id_nilai`, `id_tahun_ajaran`, `tahun_ajaran`, `semester`, `id_kelas`, `nama_kelas`, `id_mapel`, `nama_mapel`, `id_guru`, `nama_guru`, `id_siswa`, `nama_siswa`, `sum_1`, `sum_2`, `sum_3`, `sum_4`, `sas`, `rata_rata`, `jumlah_komponen`, `catatan`, `created_at`, `updated_at` |
| 12 | `JURNAL` | `id_jurnal`, `tanggal`, `id_guru`, `nama_guru`, `id_kelas`, `nama_kelas`, `id_mapel`, `nama_mapel`, `materi`, `tujuan_pembelajaran`, `aktivitas`, `metode`, `refleksi`, `tindak_lanjut`, `created_at`, `updated_at` |
| 13 | `KARAKTER` | `id_karakter`, `tanggal`, `id_siswa`, `nama_siswa`, `id_kelas`, `nama_kelas`, `aspek`, `nilai_perkembangan`, `catatan`, `id_guru`, `nama_guru`, `tindak_lanjut`, `created_at`, `updated_at` |
| 14 | `KESEHATAN` | `id_kesehatan`, `tanggal`, `id_siswa`, `nama_siswa`, `id_kelas`, `nama_kelas`, `keluhan`, `hasil_pemeriksaan`, `tindak_lanjut`, `pemeriksa`, `created_at`, `updated_at` |
| 15 | `BIMBINGAN` | `id_bimbingan`, `tanggal`, `id_siswa`, `nama_siswa`, `id_kelas`, `nama_kelas`, `jenis_permasalahan`, `catatan_konsultasi`, `tindak_lanjut`, `pembimbing`, `status`, `created_at`, `updated_at` |
| 16 | `PRESTASI` | `id_prestasi`, `id_siswa`, `nama_siswa`, `id_kelas`, `nama_kelas`, `nama_prestasi`, `jenis_lomba`, `tingkat`, `peringkat`, `tanggal`, `dokumentasi_url`, `created_at`, `updated_at` |
| 17 | `AGENDA` | `id_agenda`, `nama_kegiatan`, `tanggal`, `waktu`, `tempat`, `penanggung_jawab`, `deskripsi`, `dokumentasi_url`, `target_role`, `id_kelas`, `created_at`, `updated_at` |
| 18 | `PENGHUBUNG` | `id_penghubung`, `tanggal`, `id_siswa`, `nama_siswa`, `id_kelas`, `nama_kelas`, `pengirim_id`, `pengirim_nama`, `pengirim_role`, `pesan`, `status_baca`, `catatan_konfirmasi`, `created_at`, `updated_at` |
| 19 | `INVENTARIS` | `id_inventaris`, `kode_barang`, `nama_barang`, `kategori`, `jumlah`, `satuan`, `kondisi`, `lokasi`, `tahun_perolehan`, `keterangan`, `created_at`, `updated_at` |
| 20 | `DOKUMENTASI` | `id_dokumentasi`, `judul`, `kategori`, `tanggal`, `deskripsi`, `tautan_file`, `pengunggah`, `created_at`, `updated_at` |
| 21 | `LOG_AKTIVITAS` | `id_log`, `waktu`, `id_user`, `username`, `role`, `aksi`, `modul`, `detail`, `created_at` |

## Catatan Keamanan Password

Kolom `password` pada sheet `USERS` menggunakan teks biasa sesuai spesifikasi konfigurasi awal, dan **diblokir dari seluruh respons API, tabel pengguna, laporan, maupun ekspor backup**. Sebelum digunakan dengan data sekolah operasional, ganti pencocokan password di `Code.gs` menggunakan password hashing (misalnya `Utilities.computeDigest` + salt).
