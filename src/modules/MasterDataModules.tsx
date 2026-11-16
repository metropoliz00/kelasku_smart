import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Edit3,
  Eye,
  FileSpreadsheet,
  LayoutList,
  Plus,
  Printer,
  Search,
  Table2,
  Trash2,
  Upload,
} from 'lucide-react';
import { callApi } from '../services/api';
import {
  AcademicYear,
  AuthUser,
  ClassRoom,
  SchoolIdentity,
  Student,
  Subject,
  Teacher,
} from '../types';
import {
  ConfirmDialog,
  EmptyState,
  ExcelImportModal,
  Modal,
  PageHeader,
  PhotoUploadField,
  PrimaryButton,
  SecondaryButton,
  StatusText,
  TableSkeleton,
  UserAvatar,
} from '../components/UI';
import {
  ExcelColumnSpec,
  exportGroupedRowsToExcel,
  exportRowsToExcel,
} from '../utils/excel';
import { generatePdfReport } from '../utils/pdf';

type ToastFn = (type: 'success' | 'error' | 'warning' | 'info', title: string, message?: string) => void;

// ============================================================================
// 1. MODUL DATA SISWA (66 KOLOM SHEET + 2-ROW GROUPED HEADERS)
// ============================================================================

const STUDENT_EXCEL_COLS: ExcelColumnSpec[] = [
  { key: 'no', header: 'No' },
  { key: 'nama_lengkap', header: 'Nama', required: true },
  { key: 'nis', header: 'NIS', required: true },
  { key: 'jenis_kelamin', header: 'JK', required: true, type: 'gender' },
  { key: 'nisn', header: 'NISN' },
  { key: 'tempat_lahir', header: 'Tempat Lahir' },
  { key: 'tanggal_lahir', header: 'Tanggal Lahir' },
  { key: 'nik', header: 'NIK' },
  { key: 'agama', header: 'Agama' },
  { key: 'alamat', header: 'Alamat' },
  { key: 'rt', header: 'RT' },
  { key: 'rw', header: 'RW' },
  { key: 'dusun', header: 'Dusun' },
  { key: 'kelurahan', header: 'Kelurahan' },
  { key: 'kecamatan', header: 'Kecamatan' },
  { key: 'kode_pos', header: 'Kode Pos' },
  { key: 'jenis_tinggal', header: 'Jenis Tinggal' },
  { key: 'alat_transportasi', header: 'Alat Transportasi' },
  { key: 'telepon', header: 'Telepon' },
  { key: 'hp', header: 'HP' },
  { key: 'email', header: 'E-Mail' },
  { key: 'skhun', header: 'SKHUN' },
  { key: 'penerima_kps', header: 'Penerima KPS' },
  { key: 'no_kps', header: 'No. KPS' },
  { key: 'nama_ayah', header: 'Nama', group: 'Data Ayah' },
  { key: 'tahun_lahir_ayah', header: 'Tahun Lahir', group: 'Data Ayah' },
  { key: 'pendidikan_ayah', header: 'Jenjang Pendidikan', group: 'Data Ayah' },
  { key: 'pekerjaan_ayah', header: 'Pekerjaan', group: 'Data Ayah' },
  { key: 'penghasilan_ayah', header: 'Penghasilan', group: 'Data Ayah' },
  { key: 'nik_ayah', header: 'NIK', group: 'Data Ayah' },
  { key: 'nama_ibu', header: 'Nama', group: 'Data Ibu' },
  { key: 'tahun_lahir_ibu', header: 'Tahun Lahir', group: 'Data Ibu' },
  { key: 'pendidikan_ibu', header: 'Jenjang Pendidikan', group: 'Data Ibu' },
  { key: 'pekerjaan_ibu', header: 'Pekerjaan', group: 'Data Ibu' },
  { key: 'penghasilan_ibu', header: 'Penghasilan', group: 'Data Ibu' },
  { key: 'nik_ibu', header: 'NIK', group: 'Data Ibu' },
  { key: 'nama_wali', header: 'Nama', group: 'Data Wali' },
  { key: 'tahun_lahir_wali', header: 'Tahun Lahir', group: 'Data Wali' },
  { key: 'pendidikan_wali', header: 'Jenjang Pendidikan', group: 'Data Wali' },
  { key: 'pekerjaan_wali', header: 'Pekerjaan', group: 'Data Wali' },
  { key: 'penghasilan_wali', header: 'Penghasilan', group: 'Data Wali' },
  { key: 'nik_wali', header: 'NIK', group: 'Data Wali' },
  { key: 'nama_kelas', header: 'Rombel Saat Ini' },
  { key: 'no_peserta_un', header: 'No. Peserta Ujian Nasional' },
  { key: 'no_seri_ijazah', header: 'No. Seri Ijazah' },
  { key: 'penerima_kip', header: 'Penerima KIP' },
  { key: 'nomor_kip', header: 'Nomor KIP' },
  { key: 'nama_di_kip', header: 'Nama di KIP' },
  { key: 'nomor_kks', header: 'Nomor KKS' },
  { key: 'no_registrasi_akta_lahir', header: 'No. Registrasi Akta Lahir' },
  { key: 'bank', header: 'Bank' },
  { key: 'no_rekening_bank', header: 'Nomor Rekening Bank' },
  { key: 'rekening_atas_nama', header: 'Rekening Atas Nama' },
  { key: 'layak_pip', header: 'Layak PIP (Usulan dari Sekolah)' },
  { key: 'alasan_layak_pip', header: 'Alasan Layak PIP' },
  { key: 'kebutuhan_khusus', header: 'Kebutuhan Khusus' },
  { key: 'sekolah_asal', header: 'Sekolah Asal' },
  { key: 'anak_ke', header: 'Anak ke-berapa' },
  { key: 'lintang', header: 'Lintang' },
  { key: 'bujur', header: 'Bujur' },
  { key: 'no_kk', header: 'No. KK' },
  { key: 'berat_badan', header: 'Berat Badan' },
  { key: 'tinggi_badan', header: 'Tinggi Badan' },
  { key: 'lingkar_kepala', header: 'Lingkar Kepala' },
  { key: 'jml_saudara_kandung', header: 'Jml. Saudara Kandung' },
  { key: 'jarak_rumah_km', header: 'Jarak Rumah ke Sekolah (KM)' },
];

const STUDENT_NUMERIC_KEYS = new Set([
  'no', 'nis', 'nisn', 'nik', 'rt', 'rw', 'kode_pos', 'telepon', 'hp', 'no_kps',
  'tahun_lahir_ayah', 'nik_ayah', 'tahun_lahir_ibu', 'nik_ibu', 'tahun_lahir_wali', 'nik_wali',
  'no_peserta_un', 'no_seri_ijazah', 'nomor_kip', 'nomor_kks', 'no_rekening_bank',
  'anak_ke', 'lintang', 'bujur', 'no_kk', 'berat_badan', 'tinggi_badan',
  'lingkar_kepala', 'jml_saudara_kandung', 'jarak_rumah_km',
]);

type StudentFormTab = 'identitas' | 'ayah' | 'ibu' | 'wali' | 'akademik';

const EMPTY_STUDENT_FORM: Partial<Student> = {
  no: '',
  nis: '',
  nisn: '',
  nama_lengkap: '',
  jenis_kelamin: 'L',
  tempat_lahir: '',
  tanggal_lahir: '',
  nik: '',
  agama: '',
  alamat: '',
  rt: '',
  rw: '',
  dusun: '',
  kelurahan: '',
  kecamatan: '',
  kode_pos: '',
  jenis_tinggal: '',
  alat_transportasi: '',
  telepon: '',
  hp: '',
  email: '',
  skhun: '',
  penerima_kps: 'Tidak',
  no_kps: '',
  id_kelas: '',
  nama_kelas: '',
  nama_ayah: '',
  tahun_lahir_ayah: '',
  pendidikan_ayah: '',
  pekerjaan_ayah: '',
  penghasilan_ayah: '',
  nik_ayah: '',
  nama_ibu: '',
  tahun_lahir_ibu: '',
  pendidikan_ibu: '',
  pekerjaan_ibu: '',
  penghasilan_ibu: '',
  nik_ibu: '',
  nama_wali: '',
  tahun_lahir_wali: '',
  pendidikan_wali: '',
  pekerjaan_wali: '',
  penghasilan_wali: '',
  nik_wali: '',
  no_peserta_un: '',
  no_seri_ijazah: '',
  penerima_kip: 'Tidak',
  nomor_kip: '',
  nama_di_kip: '',
  nomor_kks: '',
  no_registrasi_akta_lahir: '',
  bank: '',
  no_rekening_bank: '',
  rekening_atas_nama: '',
  layak_pip: 'Tidak',
  alasan_layak_pip: '',
  kebutuhan_khusus: 'Tidak Ada',
  sekolah_asal: '',
  anak_ke: '',
  lintang: '',
  bujur: '',
  no_kk: '',
  berat_badan: '',
  tinggi_badan: '',
  lingkar_kepala: '',
  jml_saudara_kandung: '',
  jarak_rumah_km: '',
  telepon_ortu: '',
  status_siswa: 'Aktif',
  foto_url: '',
};

function FieldInput({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
  placeholder,
}: {
  label: string;
  value?: string | number;
  onChange: (val: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[#1E1B4B] mb-1">
        {label}
        {required ? ' *' : ''}
      </label>
      <input
        type={type}
        required={required}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
      />
    </div>
  );
}

function DetailPair({ label, value, mono = false }: { label: string; value?: string | number; mono?: boolean }) {
  return (
    <div>
      <span className="text-[#64748B] block text-[11px]">{label}</span>
      <span className={`font-semibold text-[#1E1B4B] text-xs break-words ${mono ? 'font-mono tabular-nums' : ''}`}>
        {value !== undefined && value !== null && String(value).trim() !== '' ? String(value) : '-'}
      </span>
    </div>
  );
}

export function SiswaModule({
  user,
  school,
  onToast,
}: {
  user: AuthUser;
  school: SchoolIdentity;
  onToast: ToastFn;
}) {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterGender, setFilterGender] = useState('');
  const [viewMode, setViewMode] = useState<'sheet' | 'compact'>('sheet');

  const [formOpen, setFormOpen] = useState(false);
  const [formTab, setFormTab] = useState<StudentFormTab>('identitas');
  const [editing, setEditing] = useState<Student | null>(null);
  const [detailItem, setDetailItem] = useState<Student | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<Partial<Student>>(EMPTY_STUDENT_FORM);

  const canEdit = user.role === 'ADMIN' || user.role === 'GURU';
  const canDelete = user.role === 'ADMIN';

  const loadData = async () => {
    setLoading(true);
    const [sRes, cRes] = await Promise.all([
      callApi<Student[]>('getStudents'),
      callApi<ClassRoom[]>('getClasses'),
    ]);
    setLoading(false);
    if (sRes.success && sRes.data) setStudents(sRes.data);
    if (cRes.success && cRes.data) setClasses(cRes.data);
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = students.filter((s) => {
    const q = search.toLowerCase();
    const matchQ =
      !q ||
      (s.nama_lengkap || '').toLowerCase().includes(q) ||
      (s.nis || '').toLowerCase().includes(q) ||
      (s.nisn || '').toLowerCase().includes(q) ||
      (s.nik || '').toLowerCase().includes(q);
    const matchClass = !filterClass || s.id_kelas === filterClass;
    const matchGender = !filterGender || s.jenis_kelamin === filterGender;
    return matchQ && matchClass && matchGender;
  });

  const openAdd = () => {
    setEditing(null);
    setForm({
      ...EMPTY_STUDENT_FORM,
      no: students.length + 1,
    });
    setFormTab('identitas');
    setFormOpen(true);
  };

  const openEdit = (item: Student) => {
    setEditing(item);
    setForm({
      ...EMPTY_STUDENT_FORM,
      ...item,
    });
    setFormTab('identitas');
    setFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nis?.trim() || !form.nama_lengkap?.trim()) {
      setFormTab('identitas');
      onToast('warning', 'Validasi', 'NIS dan Nama Lengkap wajib diisi.');
      return;
    }
    const selectedClass = classes.find((c) => c.id_kelas === form.id_kelas);
    const hpVal = String(form.hp || form.telepon_ortu || '').trim();
    const payload = {
      ...form,
      hp: hpVal,
      telepon_ortu: hpVal || String(form.telepon || '').trim(),
      nama_kelas: selectedClass ? selectedClass.nama_kelas : form.nama_kelas || '',
    };

    setSaving(true);
    const res = editing
      ? await callApi('updateStudent', payload)
      : await callApi('createStudent', payload);
    setSaving(false);

    if (res.success) {
      onToast('success', editing ? 'Data siswa diperbarui' : 'Siswa ditambahkan');
      setFormOpen(false);
      loadData();
    } else {
      onToast('error', 'Gagal menyimpan', res.message);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    const res = await callApi('deleteStudent', { id_siswa: deleteTarget.id_siswa });
    setSaving(false);
    if (res.success) {
      onToast('success', 'Data siswa dihapus');
      setDeleteTarget(null);
      loadData();
    } else {
      onToast('error', 'Gagal menghapus', res.message);
    }
  };

  const handleExportExcel = () => {
    exportGroupedRowsToExcel(
      `Data_Siswa_${new Date().toISOString().slice(0, 10)}.xlsx`,
      'SISWA',
      STUDENT_EXCEL_COLS,
      filtered.map((s, idx) =>
        STUDENT_EXCEL_COLS.map((col) => {
          if (col.key === 'no') return s.no ?? idx + 1;
          if (col.key === 'hp') return s.hp || s.telepon_ortu || '';
          const val = (s as unknown as Record<string, string | number | undefined>)[col.key];
          return val ?? '';
        })
      )
    );
  };

  const handleExportPdf = () => {
    generatePdfReport({
      orientation: 'landscape',
      title: 'DAFTAR DATA PESERTA DIDIK',
      school,
      metaPairs: [
        { label: 'Tahun Ajaran', value: school.tahun_ajaran_aktif || '-' },
        { label: 'Semester', value: school.semester_aktif },
        {
          label: 'Filter Kelas',
          value: filterClass ? classes.find((c) => c.id_kelas === filterClass)?.nama_kelas || '-' : 'Semua Kelas',
        },
        { label: 'Total Siswa', value: String(filtered.length) },
      ],
      headers: ['No', 'NIS', 'NISN', 'Nama', 'JK', 'TTL', 'Rombel Saat Ini', 'Orang Tua', 'HP', 'Status'],
      rows: filtered.map((s, idx) => [
        s.no || idx + 1,
        s.nis,
        s.nisn || '-',
        s.nama_lengkap,
        s.jenis_kelamin,
        `${s.tempat_lahir || '-'}, ${s.tanggal_lahir || '-'}`,
        s.nama_kelas || '-',
        `${s.nama_ayah || '-'} / ${s.nama_ibu || '-'}`,
        s.hp || s.telepon_ortu || s.telepon || '-',
        s.status_siswa,
      ]),
      filename: `Laporan_Data_Siswa_${new Date().toISOString().slice(0, 10)}.pdf`,
    });
  };

  const handleImportConfirm = async (validRows: Record<string, string>[]) => {
    const mapped = validRows.map((r) => {
      const cls = classes.find(
        (c) => c.nama_kelas.toLowerCase() === (r.nama_kelas || '').trim().toLowerCase()
      );
      return {
        ...r,
        id_kelas: cls?.id_kelas || '',
        nama_kelas: cls?.nama_kelas || r.nama_kelas || '',
        telepon_ortu: r.hp || r.telepon || '',
        status_siswa: 'Aktif',
      };
    });
    const res = await callApi('importStudents', { rows: mapped });
    if (res.success) {
      onToast('success', 'Import Berhasil', res.message);
      loadData();
    } else {
      onToast('error', 'Import Gagal', res.message);
    }
  };

  // Precompute top-level column header segments for 2-row table thead
  const preGroupCols = STUDENT_EXCEL_COLS.slice(0, 24);
  const ayahCols = STUDENT_EXCEL_COLS.slice(24, 30);
  const ibuCols = STUDENT_EXCEL_COLS.slice(30, 36);
  const waliCols = STUDENT_EXCEL_COLS.slice(36, 42);
  const postGroupCols = STUDENT_EXCEL_COLS.slice(42, 66);

  return (
    <div className="space-y-5">
      <PageHeader
        title={user.role === 'ORANG_TUA' ? 'Data Anak' : 'Data Siswa'}
        description="Struktur lengkap 66 kolom peserta didik sesuai format sheet database, import Excel, dan cetak PDF."
        actions={
          <>
            {user.role === 'ADMIN' && (
              <SecondaryButton onClick={() => setImportOpen(true)}>
                <Upload className="w-4 h-4" />
                Import Excel
              </SecondaryButton>
            )}
            <SecondaryButton onClick={handleExportExcel} disabled={filtered.length === 0}>
              <FileSpreadsheet className="w-4 h-4" />
              Export Excel
            </SecondaryButton>
            <SecondaryButton onClick={handleExportPdf} disabled={filtered.length === 0}>
              <Printer className="w-4 h-4" />
              Cetak PDF
            </SecondaryButton>
            {canEdit && (
              <PrimaryButton onClick={openAdd}>
                <Plus className="w-4 h-4" />
                Tambah Siswa
              </PrimaryButton>
            )}
          </>
        }
      />

      {/* Filters & View Mode Toggle */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {user.role !== 'ORANG_TUA' ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
            <div className="relative">
              <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama, NIS, NISN, atau NIK..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
              />
            </div>
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
            >
              <option value="">Semua Rombel / Kelas</option>
              {classes.map((c) => (
                <option key={c.id_kelas} value={c.id_kelas}>
                  {c.nama_kelas}
                </option>
              ))}
            </select>
            <select
              value={filterGender}
              onChange={(e) => setFilterGender(e.target.value)}
              className="px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
            >
              <option value="">Semua Jenis Kelamin</option>
              <option value="L">Laki-laki (L)</option>
              <option value="P">Perempuan (P)</option>
            </select>
          </div>
        ) : (
          <div />
        )}

        <div className="inline-flex items-center p-1 bg-[#F5F3FF] border border-[#EDE9FE] rounded-lg self-start lg:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('sheet')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              viewMode === 'sheet'
                ? 'bg-[#6D28D9] text-white'
                : 'text-[#6D28D9] hover:bg-white/70'
            }`}
          >
            <Table2 className="w-3.5 h-3.5" />
            Tampilan Sheet Lengkap
          </button>
          <button
            type="button"
            onClick={() => setViewMode('compact')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              viewMode === 'compact'
                ? 'bg-[#6D28D9] text-white'
                : 'text-[#6D28D9] hover:bg-white/70'
            }`}
          >
            <LayoutList className="w-3.5 h-3.5" />
            Tampilan Ringkas
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <TableSkeleton cols={7} rows={5} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Belum ada data siswa"
          description="Tambahkan data siswa secara manual atau impor menggunakan template Excel (.xlsx)."
          action={
            canEdit ? (
              <PrimaryButton onClick={openAdd}>
                <Plus className="w-4 h-4" />
                Tambah Siswa Pertama
              </PrimaryButton>
            ) : undefined
          }
        />
      ) : viewMode === 'sheet' ? (
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          <div className="px-4 py-2 bg-[#F8FAFC] border-b border-[#E5E7EB] flex items-center justify-between text-xs text-[#64748B]">
            <span>Menampilkan {filtered.length} peserta didik · 66 kolom struktur database</span>
            <span className="hidden sm:inline">Geser tabel ke samping untuk melihat semua kolom</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-max min-w-full text-xs text-left border-collapse">
              <thead className="bg-[#EDE9FE] text-[#1E1B4B]">
                <tr>
                  {preGroupCols.map((col, idx) => {
                    const stickyClass =
                      idx === 0
                        ? 'sticky left-0 z-20 bg-[#EDE9FE] w-12 min-w-[48px] text-center'
                        : idx === 1
                          ? 'sticky left-12 z-20 bg-[#EDE9FE] min-w-[180px]'
                          : '';
                    return (
                      <th
                        key={col.key}
                        rowSpan={2}
                        className={`px-3 py-2.5 font-semibold border border-[#DDD6FE] whitespace-nowrap align-middle ${stickyClass}`}
                      >
                        {col.header}
                      </th>
                    );
                  })}
                  <th
                    colSpan={6}
                    className="px-3 py-2 font-bold border border-[#DDD6FE] text-center whitespace-nowrap bg-[#DDD6FE]/60"
                  >
                    Data Ayah
                  </th>
                  <th
                    colSpan={6}
                    className="px-3 py-2 font-bold border border-[#DDD6FE] text-center whitespace-nowrap bg-[#DDD6FE]/60"
                  >
                    Data Ibu
                  </th>
                  <th
                    colSpan={6}
                    className="px-3 py-2 font-bold border border-[#DDD6FE] text-center whitespace-nowrap bg-[#DDD6FE]/60"
                  >
                    Data Wali
                  </th>
                  {postGroupCols.map((col) => (
                    <th
                      key={col.key}
                      rowSpan={2}
                      className="px-3 py-2.5 font-semibold border border-[#DDD6FE] whitespace-nowrap align-middle"
                    >
                      {col.header}
                    </th>
                  ))}
                  <th
                    rowSpan={2}
                    className="px-3 py-2.5 font-semibold border border-[#DDD6FE] whitespace-nowrap align-middle"
                  >
                    Status
                  </th>
                  <th
                    rowSpan={2}
                    className="sticky right-0 z-20 bg-[#EDE9FE] px-3 py-2.5 font-semibold border border-[#DDD6FE] text-center whitespace-nowrap align-middle"
                  >
                    Aksi
                  </th>
                </tr>
                <tr>
                  {[...ayahCols, ...ibuCols, ...waliCols].map((col) => (
                    <th
                      key={col.key}
                      className="px-3 py-2 font-semibold border border-[#DDD6FE] whitespace-nowrap bg-[#F5F3FF]"
                    >
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, idx) => {
                  const rec = s as unknown as Record<string, string | number | undefined>;
                  return (
                    <tr key={s.id_siswa} className="group hover:bg-[#F5F3FF]/60 transition-colors">
                      {STUDENT_EXCEL_COLS.map((col, cIdx) => {
                        let rawVal: string | number | undefined = rec[col.key];
                        if (col.key === 'no') rawVal = s.no ?? idx + 1;
                        if (col.key === 'hp') rawVal = s.hp || s.telepon_ortu || '';
                        const displayVal =
                          rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== ''
                            ? String(rawVal)
                            : '-';
                        const stickyClass =
                          cIdx === 0
                            ? 'sticky left-0 z-10 bg-white group-hover:bg-[#F5F3FF] w-12 min-w-[48px] text-center text-[#64748B]'
                            : cIdx === 1
                              ? 'sticky left-12 z-10 bg-white group-hover:bg-[#F5F3FF] min-w-[180px] font-semibold text-[#1E1B4B]'
                              : '';
                        const numClass = STUDENT_NUMERIC_KEYS.has(col.key) ? 'tabular-nums' : '';
                        return (
                          <td
                            key={col.key}
                            className={`px-3 py-2 border border-[#E5E7EB] whitespace-nowrap ${stickyClass} ${numClass}`}
                          >
                            {cIdx === 1 ? (
                              <div className="flex items-center gap-2">
                                <UserAvatar src={s.foto_url} name={s.nama_lengkap} size="xs" />
                                <span className="truncate">{displayVal}</span>
                              </div>
                            ) : (
                              displayVal
                            )}
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 border border-[#E5E7EB] whitespace-nowrap">
                        <StatusText status={s.status_siswa} />
                      </td>
                      <td className="sticky right-0 z-10 bg-white group-hover:bg-[#F5F3FF] px-3 py-2 border border-[#E5E7EB] whitespace-nowrap text-center">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setDetailItem(s)}
                            title="Detail Siswa"
                            className="p-1 rounded-md text-[#64748B] hover:text-[#6D28D9] hover:bg-[#EDE9FE] cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => openEdit(s)}
                              title="Edit Siswa"
                              className="p-1 rounded-md text-[#64748B] hover:text-[#6D28D9] hover:bg-[#EDE9FE] cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(s)}
                              title="Hapus Siswa"
                              className="p-1 rounded-md text-[#64748B] hover:text-[#DC2626] hover:bg-red-50 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#EDE9FE] text-[#1E1B4B]">
                <tr>
                  <th className="px-4 py-3 font-semibold w-12">No</th>
                  <th className="px-4 py-3 font-semibold">NIS / NISN</th>
                  <th className="px-4 py-3 font-semibold">Nama</th>
                  <th className="px-4 py-3 font-semibold">JK</th>
                  <th className="px-4 py-3 font-semibold">Rombel Saat Ini</th>
                  <th className="px-4 py-3 font-semibold">Orang Tua / HP</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {filtered.map((s, idx) => (
                  <tr key={s.id_siswa} className="hover:bg-[#F5F3FF]/50 transition-colors">
                    <td className="px-4 py-3 tabular-nums text-[#64748B]">{s.no || idx + 1}</td>
                    <td className="px-4 py-3 tabular-nums font-mono text-xs">
                      <div className="font-semibold text-[#1E1B4B]">{s.nis}</div>
                      <div className="text-[#64748B]">{s.nisn || '-'}</div>
                    </td>
                    <td className="px-4 py-3 font-medium text-[#1E1B4B]">
                      <div className="flex items-center gap-2.5">
                        <UserAvatar src={s.foto_url} name={s.nama_lengkap} size="sm" />
                        <div className="min-w-0">
                          <div>{s.nama_lengkap}</div>
                          {s.nik && <div className="text-xs text-[#64748B] font-mono tabular-nums">NIK: {s.nik}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">{s.jenis_kelamin}</td>
                    <td className="px-4 py-3">{s.nama_kelas || '-'}</td>
                    <td className="px-4 py-3 text-xs text-[#64748B]">
                      <div className="text-[#1E1B4B]">{s.nama_ayah || s.nama_ibu || '-'}</div>
                      <div className="tabular-nums">{s.hp || s.telepon_ortu || s.telepon || '-'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusText status={s.status_siswa} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setDetailItem(s)}
                          title="Detail Siswa"
                          className="p-1.5 rounded-lg text-[#64748B] hover:text-[#6D28D9] hover:bg-[#EDE9FE] cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => openEdit(s)}
                            title="Edit Siswa"
                            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#6D28D9] hover:bg-[#EDE9FE] cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(s)}
                            title="Hapus Siswa"
                            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#DC2626] hover:bg-red-50 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Form Add/Edit (5 Tabbed Sections covering all 66 columns) */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit Data Siswa' : 'Tambah Data Siswa'}
        subtitle="Lengkapi formulir sesuai struktur 66 kolom database peserta didik."
        maxWidth="max-w-4xl"
      >
        <form onSubmit={handleSave} className="space-y-5">
          <div className="flex flex-wrap gap-1.5 p-1 bg-[#F5F3FF] border border-[#EDE9FE] rounded-xl">
            {(
              [
                ['identitas', 'Identitas & Alamat'],
                ['ayah', 'Data Ayah'],
                ['ibu', 'Data Ibu'],
                ['wali', 'Data Wali'],
                ['akademik', 'Akademik, KIP/PIP & Fisik'],
              ] as [StudentFormTab, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFormTab(key)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  formTab === key
                    ? 'bg-[#6D28D9] text-white'
                    : 'text-[#6D28D9] hover:bg-white/70'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {formTab === 'identitas' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="sm:col-span-2 lg:col-span-3">
                <PhotoUploadField
                  value={form.foto_url}
                  name={form.nama_lengkap}
                  label="Foto Siswa (Opsional · Max 200 KB)"
                  onChange={(v) => setForm({ ...form, foto_url: v })}
                  onError={(msg) => onToast('error', 'Upload Foto Gagal', msg)}
                />
              </div>
              <FieldInput
                label="No Urut"
                value={form.no}
                onChange={(v) => setForm({ ...form, no: v })}
              />
              <FieldInput
                label="NIS"
                required
                value={form.nis}
                onChange={(v) => setForm({ ...form, nis: v })}
              />
              <FieldInput
                label="NISN"
                value={form.nisn}
                onChange={(v) => setForm({ ...form, nisn: v })}
              />
              <div className="sm:col-span-2">
                <FieldInput
                  label="Nama Lengkap"
                  required
                  value={form.nama_lengkap}
                  onChange={(v) => setForm({ ...form, nama_lengkap: v })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1E1B4B] mb-1">JK *</label>
                <select
                  value={form.jenis_kelamin || 'L'}
                  onChange={(e) => setForm({ ...form, jenis_kelamin: e.target.value as 'L' | 'P' })}
                  className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
                >
                  <option value="L">Laki-laki (L)</option>
                  <option value="P">Perempuan (P)</option>
                </select>
              </div>
              <FieldInput
                label="Tempat Lahir"
                value={form.tempat_lahir}
                onChange={(v) => setForm({ ...form, tempat_lahir: v })}
              />
              <FieldInput
                label="Tanggal Lahir"
                type="date"
                value={form.tanggal_lahir}
                onChange={(v) => setForm({ ...form, tanggal_lahir: v })}
              />
              <FieldInput
                label="NIK"
                value={form.nik}
                onChange={(v) => setForm({ ...form, nik: v })}
              />
              <FieldInput
                label="Agama"
                value={form.agama}
                onChange={(v) => setForm({ ...form, agama: v })}
                placeholder="Islam / Kristen / Katolik / Hindu / Buddha / Konghucu"
              />
              <FieldInput
                label="Telepon"
                value={form.telepon}
                onChange={(v) => setForm({ ...form, telepon: v })}
              />
              <FieldInput
                label="HP"
                value={form.hp}
                onChange={(v) => setForm({ ...form, hp: v, telepon_ortu: v })}
              />
              <FieldInput
                label="E-Mail"
                type="email"
                value={form.email}
                onChange={(v) => setForm({ ...form, email: v })}
              />
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-xs font-semibold text-[#1E1B4B] mb-1">Alamat</label>
                <textarea
                  rows={2}
                  value={form.alamat || ''}
                  onChange={(e) => setForm({ ...form, alamat: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
                />
              </div>
              <FieldInput label="RT" value={form.rt} onChange={(v) => setForm({ ...form, rt: v })} />
              <FieldInput label="RW" value={form.rw} onChange={(v) => setForm({ ...form, rw: v })} />
              <FieldInput label="Dusun" value={form.dusun} onChange={(v) => setForm({ ...form, dusun: v })} />
              <FieldInput label="Kelurahan" value={form.kelurahan} onChange={(v) => setForm({ ...form, kelurahan: v })} />
              <FieldInput label="Kecamatan" value={form.kecamatan} onChange={(v) => setForm({ ...form, kecamatan: v })} />
              <FieldInput label="Kode Pos" value={form.kode_pos} onChange={(v) => setForm({ ...form, kode_pos: v })} />
              <FieldInput
                label="Jenis Tinggal"
                value={form.jenis_tinggal}
                onChange={(v) => setForm({ ...form, jenis_tinggal: v })}
                placeholder="Bersama Orang Tua / Wali / Asrama"
              />
              <FieldInput
                label="Alat Transportasi"
                value={form.alat_transportasi}
                onChange={(v) => setForm({ ...form, alat_transportasi: v })}
                placeholder="Jalan Kaki / Sepeda / Antar Jemput"
              />
              <FieldInput label="SKHUN" value={form.skhun} onChange={(v) => setForm({ ...form, skhun: v })} />
              <FieldInput
                label="Penerima KPS"
                value={form.penerima_kps}
                onChange={(v) => setForm({ ...form, penerima_kps: v })}
                placeholder="Ya / Tidak"
              />
              <FieldInput label="No. KPS" value={form.no_kps} onChange={(v) => setForm({ ...form, no_kps: v })} />
            </div>
          )}

          {formTab === 'ayah' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldInput label="Nama Ayah" value={form.nama_ayah} onChange={(v) => setForm({ ...form, nama_ayah: v })} />
              <FieldInput label="Tahun Lahir Ayah" value={form.tahun_lahir_ayah} onChange={(v) => setForm({ ...form, tahun_lahir_ayah: v })} />
              <FieldInput label="Jenjang Pendidikan Ayah" value={form.pendidikan_ayah} onChange={(v) => setForm({ ...form, pendidikan_ayah: v })} />
              <FieldInput label="Pekerjaan Ayah" value={form.pekerjaan_ayah} onChange={(v) => setForm({ ...form, pekerjaan_ayah: v })} />
              <FieldInput label="Penghasilan Ayah" value={form.penghasilan_ayah} onChange={(v) => setForm({ ...form, penghasilan_ayah: v })} />
              <FieldInput label="NIK Ayah" value={form.nik_ayah} onChange={(v) => setForm({ ...form, nik_ayah: v })} />
            </div>
          )}

          {formTab === 'ibu' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldInput label="Nama Ibu" value={form.nama_ibu} onChange={(v) => setForm({ ...form, nama_ibu: v })} />
              <FieldInput label="Tahun Lahir Ibu" value={form.tahun_lahir_ibu} onChange={(v) => setForm({ ...form, tahun_lahir_ibu: v })} />
              <FieldInput label="Jenjang Pendidikan Ibu" value={form.pendidikan_ibu} onChange={(v) => setForm({ ...form, pendidikan_ibu: v })} />
              <FieldInput label="Pekerjaan Ibu" value={form.pekerjaan_ibu} onChange={(v) => setForm({ ...form, pekerjaan_ibu: v })} />
              <FieldInput label="Penghasilan Ibu" value={form.penghasilan_ibu} onChange={(v) => setForm({ ...form, penghasilan_ibu: v })} />
              <FieldInput label="NIK Ibu" value={form.nik_ibu} onChange={(v) => setForm({ ...form, nik_ibu: v })} />
            </div>
          )}

          {formTab === 'wali' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldInput label="Nama Wali" value={form.nama_wali} onChange={(v) => setForm({ ...form, nama_wali: v })} />
              <FieldInput label="Tahun Lahir Wali" value={form.tahun_lahir_wali} onChange={(v) => setForm({ ...form, tahun_lahir_wali: v })} />
              <FieldInput label="Jenjang Pendidikan Wali" value={form.pendidikan_wali} onChange={(v) => setForm({ ...form, pendidikan_wali: v })} />
              <FieldInput label="Pekerjaan Wali" value={form.pekerjaan_wali} onChange={(v) => setForm({ ...form, pekerjaan_wali: v })} />
              <FieldInput label="Penghasilan Wali" value={form.penghasilan_wali} onChange={(v) => setForm({ ...form, penghasilan_wali: v })} />
              <FieldInput label="NIK Wali" value={form.nik_wali} onChange={(v) => setForm({ ...form, nik_wali: v })} />
            </div>
          )}

          {formTab === 'akademik' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                  Rombel Saat Ini (Kelas)
                </label>
                <select
                  value={form.id_kelas || ''}
                  onChange={(e) => {
                    const cls = classes.find((c) => c.id_kelas === e.target.value);
                    setForm({
                      ...form,
                      id_kelas: e.target.value,
                      nama_kelas: cls?.nama_kelas || '',
                    });
                  }}
                  className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
                >
                  <option value="">-- Pilih Kelas --</option>
                  {classes.map((c) => (
                    <option key={c.id_kelas} value={c.id_kelas}>
                      {c.nama_kelas}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1E1B4B] mb-1">Status Siswa</label>
                <select
                  value={form.status_siswa || 'Aktif'}
                  onChange={(e) =>
                    setForm({ ...form, status_siswa: e.target.value as Student['status_siswa'] })
                  }
                  className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
                >
                  <option value="Aktif">Aktif</option>
                  <option value="Pindah">Pindah</option>
                  <option value="Lulus">Lulus</option>
                  <option value="Nonaktif">Nonaktif</option>
                </select>
              </div>
              <FieldInput label="Sekolah Asal" value={form.sekolah_asal} onChange={(v) => setForm({ ...form, sekolah_asal: v })} />
              <FieldInput label="No. Peserta Ujian Nasional" value={form.no_peserta_un} onChange={(v) => setForm({ ...form, no_peserta_un: v })} />
              <FieldInput label="No. Seri Ijazah" value={form.no_seri_ijazah} onChange={(v) => setForm({ ...form, no_seri_ijazah: v })} />
              <FieldInput label="No. Registrasi Akta Lahir" value={form.no_registrasi_akta_lahir} onChange={(v) => setForm({ ...form, no_registrasi_akta_lahir: v })} />
              <FieldInput label="No. KK" value={form.no_kk} onChange={(v) => setForm({ ...form, no_kk: v })} />
              <FieldInput label="Penerima KIP" value={form.penerima_kip} onChange={(v) => setForm({ ...form, penerima_kip: v })} placeholder="Ya / Tidak" />
              <FieldInput label="Nomor KIP" value={form.nomor_kip} onChange={(v) => setForm({ ...form, nomor_kip: v })} />
              <FieldInput label="Nama di KIP" value={form.nama_di_kip} onChange={(v) => setForm({ ...form, nama_di_kip: v })} />
              <FieldInput label="Nomor KKS" value={form.nomor_kks} onChange={(v) => setForm({ ...form, nomor_kks: v })} />
              <FieldInput label="Bank" value={form.bank} onChange={(v) => setForm({ ...form, bank: v })} />
              <FieldInput label="Nomor Rekening Bank" value={form.no_rekening_bank} onChange={(v) => setForm({ ...form, no_rekening_bank: v })} />
              <FieldInput label="Rekening Atas Nama" value={form.rekening_atas_nama} onChange={(v) => setForm({ ...form, rekening_atas_nama: v })} />
              <FieldInput label="Layak PIP (Usulan dari Sekolah)" value={form.layak_pip} onChange={(v) => setForm({ ...form, layak_pip: v })} placeholder="Ya / Tidak" />
              <FieldInput label="Alasan Layak PIP" value={form.alasan_layak_pip} onChange={(v) => setForm({ ...form, alasan_layak_pip: v })} />
              <FieldInput label="Kebutuhan Khusus" value={form.kebutuhan_khusus} onChange={(v) => setForm({ ...form, kebutuhan_khusus: v })} />
              <FieldInput label="Anak ke-berapa" value={form.anak_ke} onChange={(v) => setForm({ ...form, anak_ke: v })} />
              <FieldInput label="Jml. Saudara Kandung" value={form.jml_saudara_kandung} onChange={(v) => setForm({ ...form, jml_saudara_kandung: v })} />
              <FieldInput label="Berat Badan (kg)" value={form.berat_badan} onChange={(v) => setForm({ ...form, berat_badan: v })} />
              <FieldInput label="Tinggi Badan (cm)" value={form.tinggi_badan} onChange={(v) => setForm({ ...form, tinggi_badan: v })} />
              <FieldInput label="Lingkar Kepala (cm)" value={form.lingkar_kepala} onChange={(v) => setForm({ ...form, lingkar_kepala: v })} />
              <FieldInput label="Jarak Rumah ke Sekolah (KM)" value={form.jarak_rumah_km} onChange={(v) => setForm({ ...form, jarak_rumah_km: v })} />
              <FieldInput label="Lintang" value={form.lintang} onChange={(v) => setForm({ ...form, lintang: v })} />
              <FieldInput label="Bujur" value={form.bujur} onChange={(v) => setForm({ ...form, bujur: v })} />
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-3 border-t border-[#E5E7EB]">
            <SecondaryButton onClick={() => setFormOpen(false)}>Batal</SecondaryButton>
            <PrimaryButton type="submit" loading={saving}>
              Simpan Data Siswa
            </PrimaryButton>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        open={!!detailItem}
        onClose={() => setDetailItem(null)}
        title="Detail Peserta Didik"
        maxWidth="max-w-3xl"
      >
        {detailItem && (
          <div className="space-y-5 text-sm">
            <div className="flex items-center justify-between gap-4 pb-3 border-b border-[#E5E7EB]">
              <div className="flex items-center gap-3.5 min-w-0">
                <UserAvatar src={detailItem.foto_url} name={detailItem.nama_lengkap} size="lg" />
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-[#1E1B4B] truncate">{detailItem.nama_lengkap}</h3>
                  <p className="text-xs text-[#64748B] font-mono tabular-nums">
                    No: {detailItem.no || '-'} · NIS: {detailItem.nis} · NISN: {detailItem.nisn || '-'} · NIK: {detailItem.nik || '-'}
                  </p>
                </div>
              </div>
              <StatusText status={detailItem.status_siswa} />
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#6D28D9] mb-2">Identitas & Alamat</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl p-3.5">
                <DetailPair label="Rombel Saat Ini" value={detailItem.nama_kelas} />
                <DetailPair label="Jenis Kelamin" value={detailItem.jenis_kelamin === 'L' ? 'Laki-laki (L)' : 'Perempuan (P)'} />
                <DetailPair label="TTL" value={`${detailItem.tempat_lahir || '-'}, ${detailItem.tanggal_lahir || '-'}`} />
                <DetailPair label="Agama" value={detailItem.agama} />
                <DetailPair label="Telepon / HP" value={`${detailItem.telepon || '-'} / ${detailItem.hp || detailItem.telepon_ortu || '-'}`} mono />
                <DetailPair label="E-Mail" value={detailItem.email} />
                <DetailPair label="Jenis Tinggal" value={detailItem.jenis_tinggal} />
                <DetailPair label="Alat Transportasi" value={detailItem.alat_transportasi} />
                <DetailPair label="SKHUN / KPS" value={`${detailItem.skhun || '-'} / ${detailItem.penerima_kps || '-'} (${detailItem.no_kps || '-'})`} />
                <div className="col-span-2 sm:col-span-3">
                  <DetailPair
                    label="Alamat Lengkap"
                    value={`${detailItem.alamat || '-'}, RT ${detailItem.rt || '-'} / RW ${detailItem.rw || '-'}, Dusun ${detailItem.dusun || '-'}, Kel. ${detailItem.kelurahan || '-'}, Kec. ${detailItem.kecamatan || '-'}, Kode Pos ${detailItem.kode_pos || '-'}`}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl p-3.5 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#6D28D9]">Data Ayah</h4>
                <DetailPair label="Nama" value={detailItem.nama_ayah} />
                <DetailPair label="Tahun Lahir" value={detailItem.tahun_lahir_ayah} mono />
                <DetailPair label="Jenjang Pendidikan" value={detailItem.pendidikan_ayah} />
                <DetailPair label="Pekerjaan" value={detailItem.pekerjaan_ayah} />
                <DetailPair label="Penghasilan" value={detailItem.penghasilan_ayah} />
                <DetailPair label="NIK" value={detailItem.nik_ayah} mono />
              </div>
              <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl p-3.5 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#6D28D9]">Data Ibu</h4>
                <DetailPair label="Nama" value={detailItem.nama_ibu} />
                <DetailPair label="Tahun Lahir" value={detailItem.tahun_lahir_ibu} mono />
                <DetailPair label="Jenjang Pendidikan" value={detailItem.pendidikan_ibu} />
                <DetailPair label="Pekerjaan" value={detailItem.pekerjaan_ibu} />
                <DetailPair label="Penghasilan" value={detailItem.penghasilan_ibu} />
                <DetailPair label="NIK" value={detailItem.nik_ibu} mono />
              </div>
              <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl p-3.5 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#6D28D9]">Data Wali</h4>
                <DetailPair label="Nama" value={detailItem.nama_wali} />
                <DetailPair label="Tahun Lahir" value={detailItem.tahun_lahir_wali} mono />
                <DetailPair label="Jenjang Pendidikan" value={detailItem.pendidikan_wali} />
                <DetailPair label="Pekerjaan" value={detailItem.pekerjaan_wali} />
                <DetailPair label="Penghasilan" value={detailItem.penghasilan_wali} />
                <DetailPair label="NIK" value={detailItem.nik_wali} mono />
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#6D28D9] mb-2">Akademik, KIP/PIP & Data Fisik</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl p-3.5">
                <DetailPair label="Sekolah Asal" value={detailItem.sekolah_asal} />
                <DetailPair label="No. Peserta UN" value={detailItem.no_peserta_un} mono />
                <DetailPair label="No. Seri Ijazah" value={detailItem.no_seri_ijazah} mono />
                <DetailPair label="No. Registrasi Akta" value={detailItem.no_registrasi_akta_lahir} mono />
                <DetailPair label="No. KK" value={detailItem.no_kk} mono />
                <DetailPair label="Penerima KIP" value={detailItem.penerima_kip} />
                <DetailPair label="Nomor / Nama KIP" value={`${detailItem.nomor_kip || '-'} / ${detailItem.nama_di_kip || '-'}`} />
                <DetailPair label="Nomor KKS" value={detailItem.nomor_kks} mono />
                <DetailPair label="Bank" value={detailItem.bank} />
                <DetailPair label="No. Rekening" value={detailItem.no_rekening_bank} mono />
                <DetailPair label="Rekening Atas Nama" value={detailItem.rekening_atas_nama} />
                <DetailPair label="Layak PIP" value={`${detailItem.layak_pip || '-'} (${detailItem.alasan_layak_pip || '-'})`} />
                <DetailPair label="Kebutuhan Khusus" value={detailItem.kebutuhan_khusus} />
                <DetailPair label="Anak Ke / Jml Saudara" value={`${detailItem.anak_ke || '-'} / ${detailItem.jml_saudara_kandung || '-'}`} mono />
                <DetailPair label="BB / TB / LK" value={`${detailItem.berat_badan || '-'} kg / ${detailItem.tinggi_badan || '-'} cm / ${detailItem.lingkar_kepala || '-'} cm`} mono />
                <DetailPair label="Jarak Rumah (KM)" value={detailItem.jarak_rumah_km} mono />
                <DetailPair label="Koordinat (Lintang, Bujur)" value={`${detailItem.lintang || '-'}, ${detailItem.bujur || '-'}`} mono />
              </div>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={saving}
        title="Hapus Data Siswa"
        message={`Apakah Anda yakin ingin menghapus data siswa "${deleteTarget?.nama_lengkap}"?`}
      />

      <ExcelImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import Data Siswa dari Excel (.xlsx)"
        templateFilename="Template_Import_Siswa_KELASKU_SMART.xlsx"
        sheetName="SISWA"
        columns={STUDENT_EXCEL_COLS}
        existingUniqueChecks={[
          {
            field: 'nis',
            label: 'NIS',
            existingValues: new Set(students.map((s) => s.nis).filter(Boolean)),
          },
          {
            field: 'nisn',
            label: 'NISN',
            existingValues: new Set(students.map((s) => s.nisn).filter(Boolean)),
          },
        ]}
        onConfirmImport={handleImportConfirm}
      />
    </div>
  );
}

// ============================================================================
// 2. MODUL DATA GURU (18 KOLOM SHEET)
// ============================================================================

const TEACHER_EXCEL_COLS: ExcelColumnSpec[] = [
  { key: 'no', header: 'NO' },
  { key: 'nama_guru', header: 'NAMA', required: true },
  { key: 'nip', header: 'NIP' },
  { key: 'nuptk', header: 'NUPTK' },
  { key: 'jenis_kelamin', header: 'JENIS KELAMIN', required: true, type: 'gender' },
  { key: 'tempat_lahir', header: 'TEMPAT LAHIR' },
  { key: 'tanggal_lahir', header: 'TANGGAL LAHIR' },
  { key: 'ijazah_tertinggi', header: 'IJAZAH TERTINGGI' },
  { key: 'jabatan', header: 'JABATAN' },
  { key: 'status_kepegawaian', header: 'STATUS' },
  { key: 'tmt_pengangkatan', header: 'TMT PENGANGKATAN' },
  { key: 'mulai_bekerja_disini', header: 'MULAI BEKERJA DISINI' },
  { key: 'pangkat_gol', header: 'PANGKAT/GOL' },
  { key: 'masa_kerja_thn', header: 'MASA KERJA (THN)' },
  { key: 'masa_kerja_bln', header: 'MASA KERJA (BLN)' },
  { key: 'tanggal_no_sk_terakhir', header: 'TANGGAL DAN NO SK TERAKHIR' },
  { key: 'email_pribadi', header: 'EMAIL PRIBADI' },
  { key: 'email_belajar', header: 'EMAIL BELAJAR' },
];

const TEACHER_NUMERIC_KEYS = new Set([
  'no', 'nip', 'nuptk', 'masa_kerja_thn', 'masa_kerja_bln',
]);

type TeacherFormTab = 'identitas' | 'kepegawaian' | 'akun';

const EMPTY_TEACHER_FORM: Partial<Teacher> = {
  no: '',
  nama_guru: '',
  nip: '',
  nuptk: '',
  jenis_kelamin: 'L',
  tempat_lahir: '',
  tanggal_lahir: '',
  ijazah_tertinggi: '',
  jabatan: 'Guru Kelas',
  status_kepegawaian: 'PNS',
  tmt_pengangkatan: '',
  mulai_bekerja_disini: '',
  pangkat_gol: '',
  masa_kerja_thn: '',
  masa_kerja_bln: '',
  tanggal_no_sk_terakhir: '',
  email_pribadi: '',
  email_belajar: '',
  mata_pelajaran: '',
  wali_kelas_id: '',
  wali_kelas: '',
  telepon: '',
  username: '',
  status_akun: 'Aktif',
  foto_url: '',
};

export function GuruModule({
  user,
  school,
  onToast,
}: {
  user: AuthUser;
  school: SchoolIdentity;
  onToast: ToastFn;
}) {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [viewMode, setViewMode] = useState<'sheet' | 'compact'>('sheet');

  const [formOpen, setFormOpen] = useState(false);
  const [formTab, setFormTab] = useState<TeacherFormTab>('identitas');
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [detailItem, setDetailItem] = useState<Teacher | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Teacher | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Teacher>>(EMPTY_TEACHER_FORM);

  const canEdit = user.role === 'ADMIN';

  const loadData = async () => {
    setLoading(true);
    const [tRes, cRes] = await Promise.all([
      callApi<Teacher[]>('getTeachers'),
      callApi<ClassRoom[]>('getClasses'),
    ]);
    setLoading(false);
    if (tRes.success && tRes.data) setTeachers(tRes.data);
    if (cRes.success && cRes.data) setClasses(cRes.data);
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = teachers.filter((t) => {
    const q = search.toLowerCase();
    const matchQ =
      !q ||
      (t.nama_guru || '').toLowerCase().includes(q) ||
      (t.nip || '').toLowerCase().includes(q) ||
      (t.nuptk || '').toLowerCase().includes(q) ||
      (t.jabatan || '').toLowerCase().includes(q);
    const matchS = !filterStatus || t.status_kepegawaian === filterStatus;
    return matchQ && matchS;
  });

  const openAdd = () => {
    setEditing(null);
    setForm({
      ...EMPTY_TEACHER_FORM,
      no: teachers.length + 1,
    });
    setFormTab('identitas');
    setFormOpen(true);
  };

  const openEdit = (t: Teacher) => {
    setEditing(t);
    setForm({
      ...EMPTY_TEACHER_FORM,
      ...t,
    });
    setFormTab('identitas');
    setFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama_guru?.trim()) {
      setFormTab('identitas');
      onToast('warning', 'Validasi', 'Nama guru wajib diisi.');
      return;
    }
    const waliCls = classes.find((c) => c.id_kelas === form.wali_kelas_id);
    const payload = {
      ...form,
      wali_kelas: waliCls ? waliCls.nama_kelas : form.wali_kelas || '',
    };
    setSaving(true);
    const res = editing
      ? await callApi('updateTeacher', payload)
      : await callApi('createTeacher', payload);
    setSaving(false);
    if (res.success) {
      onToast('success', editing ? 'Data guru diperbarui' : 'Data guru ditambahkan');
      setFormOpen(false);
      loadData();
    } else {
      onToast('error', 'Gagal menyimpan', res.message);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    const res = await callApi('deleteTeacher', { id_guru: deleteTarget.id_guru });
    setSaving(false);
    if (res.success) {
      onToast('success', 'Data guru dihapus');
      setDeleteTarget(null);
      loadData();
    } else {
      onToast('error', 'Gagal menghapus', res.message);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Data Guru & Tenaga Pendidik"
        description="Struktur lengkap 18 kolom pendidik sesuai format sheet database, penugasan wali kelas, dan status kepegawaian."
        actions={
          <>
            {canEdit && (
              <SecondaryButton onClick={() => setImportOpen(true)}>
                <Upload className="w-4 h-4" />
                Import Excel
              </SecondaryButton>
            )}
            <SecondaryButton
              onClick={() =>
                exportRowsToExcel(
                  `Data_Guru_${new Date().toISOString().slice(0, 10)}.xlsx`,
                  'GURU',
                  TEACHER_EXCEL_COLS.map((c) => c.header),
                  filtered.map((t, idx) =>
                    TEACHER_EXCEL_COLS.map((col) => {
                      if (col.key === 'no') return t.no ?? idx + 1;
                      const val = (t as unknown as Record<string, string | number | undefined>)[col.key];
                      return val ?? '';
                    })
                  )
                )
              }
              disabled={filtered.length === 0}
            >
              <FileSpreadsheet className="w-4 h-4" />
              Export Excel
            </SecondaryButton>
            <SecondaryButton
              onClick={() =>
                generatePdfReport({
                  orientation: 'landscape',
                  title: 'DAFTAR DATA GURU DAN TENAGA KEPENDIDIKAN',
                  school,
                  headers: ['NO', 'NAMA', 'NIP / NUPTK', 'JK', 'IJAZAH', 'JABATAN', 'STATUS', 'PANGKAT/GOL', 'EMAIL BELAJAR'],
                  rows: filtered.map((t, i) => [
                    t.no || i + 1,
                    t.nama_guru,
                    `${t.nip || '-'} / ${t.nuptk || '-'}`,
                    t.jenis_kelamin,
                    t.ijazah_tertinggi || '-',
                    t.jabatan || '-',
                    t.status_kepegawaian || '-',
                    t.pangkat_gol || '-',
                    t.email_belajar || t.email_pribadi || '-',
                  ]),
                  filename: `Data_Guru_${new Date().toISOString().slice(0, 10)}.pdf`,
                })
              }
              disabled={filtered.length === 0}
            >
              <Printer className="w-4 h-4" />
              Cetak PDF
            </SecondaryButton>
            {canEdit && (
              <PrimaryButton onClick={openAdd}>
                <Plus className="w-4 h-4" />
                Tambah Guru
              </PrimaryButton>
            )}
          </>
        }
      />

      <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
          <div className="relative">
            <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama guru, NIP, NUPTK, atau jabatan..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
          >
            <option value="">Semua Status Kepegawaian</option>
            <option value="PNS">PNS</option>
            <option value="PPPK">PPPK</option>
            <option value="GTT">GTT</option>
            <option value="GTY">GTY</option>
            <option value="Honorer">Honorer</option>
          </select>
        </div>

        <div className="inline-flex items-center p-1 bg-[#F5F3FF] border border-[#EDE9FE] rounded-lg self-start lg:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('sheet')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              viewMode === 'sheet'
                ? 'bg-[#6D28D9] text-white'
                : 'text-[#6D28D9] hover:bg-white/70'
            }`}
          >
            <Table2 className="w-3.5 h-3.5" />
            Tampilan Sheet Lengkap
          </button>
          <button
            type="button"
            onClick={() => setViewMode('compact')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              viewMode === 'compact'
                ? 'bg-[#6D28D9] text-white'
                : 'text-[#6D28D9] hover:bg-white/70'
            }`}
          >
            <LayoutList className="w-3.5 h-3.5" />
            Tampilan Ringkas
          </button>
        </div>
      </div>

      {loading ? (
        <TableSkeleton cols={7} rows={5} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Belum ada data guru"
          description="Tambahkan data guru secara manual atau impor menggunakan template Excel (.xlsx)."
          action={
            canEdit ? (
              <PrimaryButton onClick={openAdd}>
                <Plus className="w-4 h-4" />
                Tambah Guru Pertama
              </PrimaryButton>
            ) : undefined
          }
        />
      ) : viewMode === 'sheet' ? (
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          <div className="px-4 py-2 bg-[#F8FAFC] border-b border-[#E5E7EB] flex items-center justify-between text-xs text-[#64748B]">
            <span>Menampilkan {filtered.length} pendidik · 18 kolom struktur database</span>
            <span className="hidden sm:inline">Geser tabel ke samping untuk melihat semua kolom</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-max min-w-full text-xs text-left border-collapse">
              <thead className="bg-[#EDE9FE] text-[#1E1B4B]">
                <tr>
                  {TEACHER_EXCEL_COLS.map((col, idx) => {
                    const stickyClass =
                      idx === 0
                        ? 'sticky left-0 z-20 bg-[#EDE9FE] w-12 min-w-[48px] text-center'
                        : idx === 1
                          ? 'sticky left-12 z-20 bg-[#EDE9FE] min-w-[190px]'
                          : '';
                    return (
                      <th
                        key={col.key}
                        className={`px-3 py-2.5 font-semibold border border-[#DDD6FE] whitespace-nowrap ${stickyClass}`}
                      >
                        {col.header}
                      </th>
                    );
                  })}
                  <th className="px-3 py-2.5 font-semibold border border-[#DDD6FE] whitespace-nowrap">
                    WALI KELAS
                  </th>
                  <th className="px-3 py-2.5 font-semibold border border-[#DDD6FE] whitespace-nowrap">
                    STATUS AKUN
                  </th>
                  <th className="sticky right-0 z-20 bg-[#EDE9FE] px-3 py-2.5 font-semibold border border-[#DDD6FE] text-center whitespace-nowrap">
                    AKSI
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, idx) => {
                  const rec = t as unknown as Record<string, string | number | undefined>;
                  return (
                    <tr key={t.id_guru} className="group hover:bg-[#F5F3FF]/60 transition-colors">
                      {TEACHER_EXCEL_COLS.map((col, cIdx) => {
                        let rawVal: string | number | undefined = rec[col.key];
                        if (col.key === 'no') rawVal = t.no ?? idx + 1;
                        const displayVal =
                          rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== ''
                            ? String(rawVal)
                            : '-';
                        const stickyClass =
                          cIdx === 0
                            ? 'sticky left-0 z-10 bg-white group-hover:bg-[#F5F3FF] w-12 min-w-[48px] text-center text-[#64748B]'
                            : cIdx === 1
                              ? 'sticky left-12 z-10 bg-white group-hover:bg-[#F5F3FF] min-w-[190px] font-semibold text-[#1E1B4B]'
                              : '';
                        const numClass = TEACHER_NUMERIC_KEYS.has(col.key) ? 'tabular-nums' : '';
                        return (
                          <td
                            key={col.key}
                            className={`px-3 py-2 border border-[#E5E7EB] whitespace-nowrap ${stickyClass} ${numClass}`}
                          >
                            {cIdx === 1 ? (
                              <div className="flex items-center gap-2">
                                <UserAvatar src={t.foto_url} name={t.nama_guru} size="xs" />
                                <span className="truncate">{displayVal}</span>
                              </div>
                            ) : (
                              displayVal
                            )}
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 border border-[#E5E7EB] whitespace-nowrap">
                        {t.wali_kelas || '-'}
                      </td>
                      <td className="px-3 py-2 border border-[#E5E7EB] whitespace-nowrap">
                        <StatusText status={t.status_akun} />
                      </td>
                      <td className="sticky right-0 z-10 bg-white group-hover:bg-[#F5F3FF] px-3 py-2 border border-[#E5E7EB] whitespace-nowrap text-center">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setDetailItem(t)}
                            title="Detail Guru"
                            className="p-1 rounded-md text-[#64748B] hover:text-[#6D28D9] hover:bg-[#EDE9FE] cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {canEdit && (
                            <>
                              <button
                                type="button"
                                onClick={() => openEdit(t)}
                                title="Edit Guru"
                                className="p-1 rounded-md text-[#64748B] hover:text-[#6D28D9] hover:bg-[#EDE9FE] cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(t)}
                                title="Hapus Guru"
                                className="p-1 rounded-md text-[#64748B] hover:text-[#DC2626] hover:bg-red-50 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#EDE9FE] text-[#1E1B4B]">
                <tr>
                  <th className="px-4 py-3 font-semibold w-12">NO</th>
                  <th className="px-4 py-3 font-semibold">NIP / NUPTK</th>
                  <th className="px-4 py-3 font-semibold">NAMA</th>
                  <th className="px-4 py-3 font-semibold">JABATAN / STATUS</th>
                  <th className="px-4 py-3 font-semibold">WALI KELAS</th>
                  <th className="px-4 py-3 font-semibold">EMAIL BELAJAR</th>
                  <th className="px-4 py-3 font-semibold text-right">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {filtered.map((t, idx) => (
                  <tr key={t.id_guru} className="hover:bg-[#F5F3FF]/50">
                    <td className="px-4 py-3 tabular-nums text-[#64748B]">{t.no || idx + 1}</td>
                    <td className="px-4 py-3 font-mono text-xs tabular-nums">
                      <div className="font-semibold text-[#1E1B4B]">{t.nip || '-'}</div>
                      <div className="text-[#64748B]">{t.nuptk || '-'}</div>
                    </td>
                    <td className="px-4 py-3 font-medium text-[#1E1B4B]">
                      <div className="flex items-center gap-2.5">
                        <UserAvatar src={t.foto_url} name={t.nama_guru} size="sm" />
                        <div className="min-w-0">
                          <div>{t.nama_guru}</div>
                          <div className="text-xs text-[#64748B]">{t.ijazah_tertinggi || t.mata_pelajaran || '-'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="font-medium text-[#1E1B4B]">{t.jabatan || '-'}</div>
                      <div className="text-[#64748B]">
                        {t.status_kepegawaian} {t.pangkat_gol ? `· ${t.pangkat_gol}` : ''}
                      </div>
                    </td>
                    <td className="px-4 py-3">{t.wali_kelas || '-'}</td>
                    <td className="px-4 py-3 text-xs text-[#64748B]">
                      <div>{t.email_belajar || '-'}</div>
                      <div>{t.email_pribadi || ''}</div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setDetailItem(t)}
                          title="Detail Guru"
                          className="p-1.5 rounded-lg text-[#64748B] hover:text-[#6D28D9] hover:bg-[#EDE9FE] cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {canEdit && (
                          <>
                            <button
                              type="button"
                              onClick={() => openEdit(t)}
                              title="Edit Guru"
                              className="p-1.5 rounded-lg text-[#64748B] hover:text-[#6D28D9] hover:bg-[#EDE9FE] cursor-pointer"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(t)}
                              title="Hapus Guru"
                              className="p-1.5 rounded-lg text-[#64748B] hover:text-[#DC2626] hover:bg-red-50 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Form Add/Edit Guru (3 Tabbed Sections) */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit Data Guru' : 'Tambah Data Guru'}
        subtitle="Lengkapi formulir sesuai struktur 18 kolom pendidik & tenaga kependidikan."
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleSave} className="space-y-5">
          <div className="flex flex-wrap gap-1.5 p-1 bg-[#F5F3FF] border border-[#EDE9FE] rounded-xl">
            {(
              [
                ['identitas', 'Identitas & Jabatan'],
                ['kepegawaian', 'Kepegawaian, SK & Email'],
                ['akun', 'Penugasan & Akun'],
              ] as [TeacherFormTab, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFormTab(key)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  formTab === key
                    ? 'bg-[#6D28D9] text-white'
                    : 'text-[#6D28D9] hover:bg-white/70'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {formTab === 'identitas' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <PhotoUploadField
                  value={form.foto_url}
                  name={form.nama_guru}
                  label="Foto Guru (Opsional · Max 200 KB)"
                  onChange={(v) => setForm({ ...form, foto_url: v })}
                  onError={(msg) => onToast('error', 'Upload Foto Gagal', msg)}
                />
              </div>
              <FieldInput label="NO" value={form.no} onChange={(v) => setForm({ ...form, no: v })} />
              <div>
                <label className="block text-xs font-semibold text-[#1E1B4B] mb-1">JENIS KELAMIN *</label>
                <select
                  value={form.jenis_kelamin || 'L'}
                  onChange={(e) => setForm({ ...form, jenis_kelamin: e.target.value as 'L' | 'P' })}
                  className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
                >
                  <option value="L">Laki-laki (L)</option>
                  <option value="P">Perempuan (P)</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <FieldInput
                  label="NAMA"
                  required
                  value={form.nama_guru}
                  onChange={(v) => setForm({ ...form, nama_guru: v })}
                />
              </div>
              <FieldInput label="NIP" value={form.nip} onChange={(v) => setForm({ ...form, nip: v })} />
              <FieldInput label="NUPTK" value={form.nuptk} onChange={(v) => setForm({ ...form, nuptk: v })} />
              <FieldInput label="TEMPAT LAHIR" value={form.tempat_lahir} onChange={(v) => setForm({ ...form, tempat_lahir: v })} />
              <FieldInput label="TANGGAL LAHIR" type="date" value={form.tanggal_lahir} onChange={(v) => setForm({ ...form, tanggal_lahir: v })} />
              <FieldInput label="IJAZAH TERTINGGI" value={form.ijazah_tertinggi} onChange={(v) => setForm({ ...form, ijazah_tertinggi: v })} placeholder="S1 PGSD / S2" />
              <FieldInput label="JABATAN" value={form.jabatan} onChange={(v) => setForm({ ...form, jabatan: v })} placeholder="Guru Kelas / Guru PJOK / Kepala Sekolah" />
            </div>
          )}

          {formTab === 'kepegawaian' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#1E1B4B] mb-1">STATUS</label>
                <select
                  value={form.status_kepegawaian || 'PNS'}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      status_kepegawaian: e.target.value as Teacher['status_kepegawaian'],
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
                >
                  <option value="PNS">PNS</option>
                  <option value="PPPK">PPPK</option>
                  <option value="GTT">GTT</option>
                  <option value="GTY">GTY</option>
                  <option value="Honorer">Honorer</option>
                </select>
              </div>
              <FieldInput label="PANGKAT/GOL" value={form.pangkat_gol} onChange={(v) => setForm({ ...form, pangkat_gol: v })} placeholder="III/a / Pembina IV/a" />
              <FieldInput label="TMT PENGANGKATAN" type="date" value={form.tmt_pengangkatan} onChange={(v) => setForm({ ...form, tmt_pengangkatan: v })} />
              <FieldInput label="MULAI BEKERJA DISINI" type="date" value={form.mulai_bekerja_disini} onChange={(v) => setForm({ ...form, mulai_bekerja_disini: v })} />
              <FieldInput label="MASA KERJA (THN)" value={form.masa_kerja_thn} onChange={(v) => setForm({ ...form, masa_kerja_thn: v })} />
              <FieldInput label="MASA KERJA (BLN)" value={form.masa_kerja_bln} onChange={(v) => setForm({ ...form, masa_kerja_bln: v })} />
              <div className="sm:col-span-2">
                <FieldInput
                  label="TANGGAL DAN NO SK TERAKHIR"
                  value={form.tanggal_no_sk_terakhir}
                  onChange={(v) => setForm({ ...form, tanggal_no_sk_terakhir: v })}
                  placeholder="Contoh: 01-04-2024 / SK-823/2024"
                />
              </div>
              <FieldInput label="EMAIL PRIBADI" type="email" value={form.email_pribadi} onChange={(v) => setForm({ ...form, email_pribadi: v })} />
              <FieldInput label="EMAIL BELAJAR" type="email" value={form.email_belajar} onChange={(v) => setForm({ ...form, email_belajar: v })} placeholder="nama@guru.sd.belajar.id" />
            </div>
          )}

          {formTab === 'akun' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldInput
                label="Mata Pelajaran Diampu"
                value={form.mata_pelajaran}
                onChange={(v) => setForm({ ...form, mata_pelajaran: v })}
              />
              <div>
                <label className="block text-xs font-semibold text-[#1E1B4B] mb-1">Wali Kelas</label>
                <select
                  value={form.wali_kelas_id || ''}
                  onChange={(e) => {
                    const cls = classes.find((c) => c.id_kelas === e.target.value);
                    setForm({
                      ...form,
                      wali_kelas_id: e.target.value,
                      wali_kelas: cls?.nama_kelas || '',
                    });
                  }}
                  className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
                >
                  <option value="">Bukan Wali Kelas</option>
                  {classes.map((c) => (
                    <option key={c.id_kelas} value={c.id_kelas}>
                      {c.nama_kelas}
                    </option>
                  ))}
                </select>
              </div>
              <FieldInput label="Nomor Telepon" value={form.telepon} onChange={(v) => setForm({ ...form, telepon: v })} />
              <FieldInput label="Username Akun" value={form.username} onChange={(v) => setForm({ ...form, username: v })} />
              <div>
                <label className="block text-xs font-semibold text-[#1E1B4B] mb-1">Status Akun</label>
                <select
                  value={form.status_akun || 'Aktif'}
                  onChange={(e) =>
                    setForm({ ...form, status_akun: e.target.value as 'Aktif' | 'Nonaktif' })
                  }
                  className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
                >
                  <option value="Aktif">Aktif</option>
                  <option value="Nonaktif">Nonaktif</option>
                </select>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-3 border-t border-[#E5E7EB]">
            <SecondaryButton onClick={() => setFormOpen(false)}>Batal</SecondaryButton>
            <PrimaryButton type="submit" loading={saving}>
              Simpan Data Guru
            </PrimaryButton>
          </div>
        </form>
      </Modal>

      {/* Detail Guru Modal */}
      <Modal
        open={!!detailItem}
        onClose={() => setDetailItem(null)}
        title="Detail Guru & Tenaga Kependidikan"
        maxWidth="max-w-2xl"
      >
        {detailItem && (
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between gap-4 pb-3 border-b border-[#E5E7EB]">
              <div className="flex items-center gap-3.5 min-w-0">
                <UserAvatar src={detailItem.foto_url} name={detailItem.nama_guru} size="lg" />
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-[#1E1B4B] truncate">{detailItem.nama_guru}</h3>
                  <p className="text-xs text-[#64748B] font-mono tabular-nums">
                    NO: {detailItem.no || '-'} · NIP: {detailItem.nip || '-'} · NUPTK: {detailItem.nuptk || '-'}
                  </p>
                </div>
              </div>
              <StatusText status={detailItem.status_akun} />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl p-4">
              <DetailPair label="Jenis Kelamin" value={detailItem.jenis_kelamin === 'L' ? 'Laki-laki (L)' : 'Perempuan (P)'} />
              <DetailPair label="Tempat, Tanggal Lahir" value={`${detailItem.tempat_lahir || '-'}, ${detailItem.tanggal_lahir || '-'}`} />
              <DetailPair label="Ijazah Tertinggi" value={detailItem.ijazah_tertinggi} />
              <DetailPair label="Jabatan" value={detailItem.jabatan} />
              <DetailPair label="Status Kepegawaian" value={detailItem.status_kepegawaian} />
              <DetailPair label="Pangkat / Gol" value={detailItem.pangkat_gol} />
              <DetailPair label="TMT Pengangkatan" value={detailItem.tmt_pengangkatan} mono />
              <DetailPair label="Mulai Bekerja Disini" value={detailItem.mulai_bekerja_disini} mono />
              <DetailPair
                label="Masa Kerja"
                value={`${detailItem.masa_kerja_thn || '0'} Thn ${detailItem.masa_kerja_bln || '0'} Bln`}
                mono
              />
              <div className="col-span-2 sm:col-span-3">
                <DetailPair label="Tanggal dan No SK Terakhir" value={detailItem.tanggal_no_sk_terakhir} />
              </div>
              <DetailPair label="Email Pribadi" value={detailItem.email_pribadi} />
              <DetailPair label="Email Belajar" value={detailItem.email_belajar} />
              <DetailPair label="Telepon" value={detailItem.telepon} mono />
              <DetailPair label="Wali Kelas" value={detailItem.wali_kelas} />
              <DetailPair label="Mata Pelajaran" value={detailItem.mata_pelajaran} />
              <DetailPair label="Username Akun" value={detailItem.username} mono />
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={saving}
        title="Hapus Data Guru"
        message={`Hapus data guru "${deleteTarget?.nama_guru}"?`}
      />

      <ExcelImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import Data Guru dari Excel (.xlsx)"
        templateFilename="Template_Import_Guru_KELASKU_SMART.xlsx"
        sheetName="GURU"
        columns={TEACHER_EXCEL_COLS}
        onConfirmImport={async (rows) => {
          const res = await callApi('importTeachers', { rows });
          if (res.success) {
            onToast('success', 'Import Berhasil', res.message);
            loadData();
          } else {
            onToast('error', 'Import Gagal', res.message);
          }
        }}
      />
    </div>
  );
}

// ============================================================================
// 3. MODUL DATA KELAS
// ============================================================================

export function KelasModule({ user, onToast }: { user: AuthUser; onToast: ToastFn }) {
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ClassRoom | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ClassRoom | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<ClassRoom>>({});

  const canEdit = user.role === 'ADMIN';

  const loadData = async () => {
    setLoading(true);
    const [cRes, tRes, yRes] = await Promise.all([
      callApi<ClassRoom[]>('getClasses'),
      callApi<Teacher[]>('getTeachers'),
      callApi<AcademicYear[]>('getAcademicYears'),
    ]);
    setLoading(false);
    if (cRes.success && cRes.data) setClasses(cRes.data);
    if (tRes.success && tRes.data) setTeachers(tRes.data);
    if (yRes.success && yRes.data) setYears(yRes.data);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama_kelas?.trim()) return;
    const wali = teachers.find((t) => t.id_guru === form.wali_kelas_id);
    const yr = years.find((y) => y.id_tahun_ajaran === form.id_tahun_ajaran);
    const payload = {
      ...form,
      wali_kelas: wali?.nama_guru || form.wali_kelas || '',
      tahun_ajaran: yr?.nama_tahun_ajaran || form.tahun_ajaran || '',
    };
    setSaving(true);
    const res = editing
      ? await callApi('updateClass', payload)
      : await callApi('createClass', payload);
    setSaving(false);
    if (res.success) {
      onToast('success', editing ? 'Kelas diperbarui' : 'Kelas ditambahkan');
      setFormOpen(false);
      loadData();
    } else {
      onToast('error', 'Gagal menyimpan', res.message);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Data Kelas"
        description="Pengelolaan rombongan belajar, tingkat kelas SD (1–6), wali kelas, dan jumlah siswa aktual."
        actions={
          canEdit && (
            <PrimaryButton
              onClick={() => {
                setEditing(null);
                const activeYear = years.find((y) => y.status === 'Aktif');
                setForm({
                  nama_kelas: '',
                  tingkat: '1',
                  wali_kelas_id: '',
                  id_tahun_ajaran: activeYear?.id_tahun_ajaran || '',
                });
                setFormOpen(true);
              }}
            >
              <Plus className="w-4 h-4" />
              Tambah Kelas
            </PrimaryButton>
          )
        }
      />

      {loading ? (
        <TableSkeleton cols={6} rows={4} />
      ) : classes.length === 0 ? (
        <EmptyState title="Belum ada data kelas" />
      ) : (
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#EDE9FE] text-[#1E1B4B]">
                <tr>
                  <th className="px-4 py-3 font-semibold">No</th>
                  <th className="px-4 py-3 font-semibold">Nama Kelas</th>
                  <th className="px-4 py-3 font-semibold">Tingkat</th>
                  <th className="px-4 py-3 font-semibold">Wali Kelas</th>
                  <th className="px-4 py-3 font-semibold">Tahun Ajaran</th>
                  <th className="px-4 py-3 font-semibold text-right">Jumlah Siswa</th>
                  {canEdit && <th className="px-4 py-3 font-semibold text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {classes.map((c, idx) => (
                  <tr key={c.id_kelas} className="hover:bg-[#F5F3FF]/50">
                    <td className="px-4 py-3 tabular-nums text-[#64748B]">{idx + 1}</td>
                    <td className="px-4 py-3 font-semibold text-[#1E1B4B]">{c.nama_kelas}</td>
                    <td className="px-4 py-3 tabular-nums">Kelas {c.tingkat}</td>
                    <td className="px-4 py-3">{c.wali_kelas || '-'}</td>
                    <td className="px-4 py-3 tabular-nums">{c.tahun_ajaran || '-'}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold">
                      {c.jumlah_siswa ?? 0}
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditing(c);
                              setForm({ ...c });
                              setFormOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#6D28D9] hover:bg-[#EDE9FE] cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(c)}
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
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit Kelas' : 'Tambah Kelas'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1">Nama Kelas *</label>
            <input
              type="text"
              required
              value={form.nama_kelas || ''}
              onChange={(e) => setForm({ ...form, nama_kelas: e.target.value })}
              placeholder="Contoh: Kelas 1A"
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Tingkat (SD)</label>
            <select
              value={form.tingkat || '1'}
              onChange={(e) => setForm({ ...form, tingkat: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
            >
              {['1', '2', '3', '4', '5', '6'].map((t) => (
                <option key={t} value={t}>
                  Tingkat {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Wali Kelas</label>
            <select
              value={form.wali_kelas_id || ''}
              onChange={(e) => setForm({ ...form, wali_kelas_id: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
            >
              <option value="">-- Pilih Wali Kelas --</option>
              {teachers.map((t) => (
                <option key={t.id_guru} value={t.id_guru}>
                  {t.nama_guru}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Tahun Ajaran</label>
            <select
              value={form.id_tahun_ajaran || ''}
              onChange={(e) => setForm({ ...form, id_tahun_ajaran: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
            >
              <option value="">-- Pilih Tahun Ajaran --</option>
              {years.map((y) => (
                <option key={y.id_tahun_ajaran} value={y.id_tahun_ajaran}>
                  {y.nama_tahun_ajaran} ({y.semester})
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E7EB]">
            <SecondaryButton onClick={() => setFormOpen(false)}>Batal</SecondaryButton>
            <PrimaryButton type="submit" loading={saving}>
              Simpan Kelas
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
          const res = await callApi('deleteClass', { id_kelas: deleteTarget.id_kelas });
          setSaving(false);
          if (res.success) {
            onToast('success', 'Kelas dihapus');
            setDeleteTarget(null);
            loadData();
          } else {
            onToast('error', 'Gagal menghapus', res.message);
          }
        }}
        loading={saving}
        title="Hapus Kelas"
        message={`Hapus kelas "${deleteTarget?.nama_kelas}"?`}
      />
    </div>
  );
}

// ============================================================================
// 4. MODUL MATA PELAJARAN
// ============================================================================

export function MapelModule({ user, onToast }: { user: AuthUser; onToast: ToastFn }) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Subject>>({
    kelompok: 'Wajib',
    alokasi_waktu: 2,
    status_aktif: 'Aktif',
  });

  const canEdit = user.role === 'ADMIN';

  const loadData = async () => {
    setLoading(true);
    const res = await callApi<Subject[]>('getSubjects');
    setLoading(false);
    if (res.success && res.data) setSubjects(res.data);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.kode_mapel?.trim() || !form.nama_mapel?.trim()) return;
    setSaving(true);
    const res = editing
      ? await callApi('updateSubject', form)
      : await callApi('createSubject', form);
    setSaving(false);
    if (res.success) {
      onToast('success', editing ? 'Mata pelajaran diperbarui' : 'Mata pelajaran ditambahkan');
      setFormOpen(false);
      loadData();
    } else {
      onToast('error', 'Gagal menyimpan', res.message);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Mata Pelajaran"
        description="Daftar mata pelajaran dinamis yang digunakan pada jadwal, input nilai, dan rekap nilai."
        actions={
          canEdit && (
            <PrimaryButton
              onClick={() => {
                setEditing(null);
                setForm({
                  kode_mapel: '',
                  nama_mapel: '',
                  kelompok: 'Wajib',
                  alokasi_waktu: 4,
                  status_aktif: 'Aktif',
                });
                setFormOpen(true);
              }}
            >
              <Plus className="w-4 h-4" />
              Tambah Mata Pelajaran
            </PrimaryButton>
          )
        }
      />

      {loading ? (
        <TableSkeleton cols={6} rows={4} />
      ) : subjects.length === 0 ? (
        <EmptyState title="Belum ada mata pelajaran" />
      ) : (
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#EDE9FE] text-[#1E1B4B]">
                <tr>
                  <th className="px-4 py-3 font-semibold">No</th>
                  <th className="px-4 py-3 font-semibold">Kode</th>
                  <th className="px-4 py-3 font-semibold">Nama Mata Pelajaran</th>
                  <th className="px-4 py-3 font-semibold">Kelompok</th>
                  <th className="px-4 py-3 font-semibold text-right">Alokasi (JP)</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  {canEdit && <th className="px-4 py-3 font-semibold text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {subjects.map((m, idx) => (
                  <tr key={m.id_mapel} className="hover:bg-[#F5F3FF]/50">
                    <td className="px-4 py-3 tabular-nums text-[#64748B]">{idx + 1}</td>
                    <td className="px-4 py-3 font-mono text-xs font-semibold">{m.kode_mapel}</td>
                    <td className="px-4 py-3 font-medium text-[#1E1B4B]">{m.nama_mapel}</td>
                    <td className="px-4 py-3 text-xs text-[#64748B]">{m.kelompok}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{m.alokasi_waktu} JP</td>
                    <td className="px-4 py-3">
                      <StatusText status={m.status_aktif} />
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditing(m);
                              setForm({ ...m });
                              setFormOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#6D28D9] hover:bg-[#EDE9FE] cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(m)}
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
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1">Kode Mapel *</label>
            <input
              type="text"
              required
              value={form.kode_mapel || ''}
              onChange={(e) => setForm({ ...form, kode_mapel: e.target.value })}
              placeholder="Contoh: MTK"
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Nama Mata Pelajaran *</label>
            <input
              type="text"
              required
              value={form.nama_mapel || ''}
              onChange={(e) => setForm({ ...form, nama_mapel: e.target.value })}
              placeholder="Contoh: Matematika"
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Kelompok</label>
            <select
              value={form.kelompok || 'Wajib'}
              onChange={(e) =>
                setForm({ ...form, kelompok: e.target.value as Subject['kelompok'] })
              }
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
            >
              <option value="Wajib">Wajib</option>
              <option value="Muatan Lokal">Muatan Lokal</option>
              <option value="Pengembangan Diri">Pengembangan Diri</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Alokasi Waktu (JP)</label>
              <input
                type="number"
                min={1}
                value={form.alokasi_waktu ?? 2}
                onChange={(e) => setForm({ ...form, alokasi_waktu: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Status Aktif</label>
              <select
                value={form.status_aktif || 'Aktif'}
                onChange={(e) =>
                  setForm({ ...form, status_aktif: e.target.value as 'Aktif' | 'Nonaktif' })
                }
                className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
              >
                <option value="Aktif">Aktif</option>
                <option value="Nonaktif">Nonaktif</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E7EB]">
            <SecondaryButton onClick={() => setFormOpen(false)}>Batal</SecondaryButton>
            <PrimaryButton type="submit" loading={saving}>
              Simpan
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
          const res = await callApi('deleteSubject', { id_mapel: deleteTarget.id_mapel });
          setSaving(false);
          if (res.success) {
            onToast('success', 'Mata pelajaran dihapus');
            setDeleteTarget(null);
            loadData();
          } else {
            onToast('error', 'Gagal menghapus', res.message);
          }
        }}
        loading={saving}
        title="Hapus Mata Pelajaran"
        message={`Hapus mata pelajaran "${deleteTarget?.nama_mapel}"?`}
      />
    </div>
  );
}

// ============================================================================
// 5. MODUL TAHUN AJARAN (DINAMIS TANPA BATAS)
// ============================================================================

export function TahunAjaranModule({
  user,
  onToast,
  onSchoolChanged,
}: {
  user: AuthUser;
  onToast: ToastFn;
  onSchoolChanged: () => void;
}) {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AcademicYear | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AcademicYear | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<AcademicYear>>({
    semester: 'Ganjil',
    status: 'Draft',
  });

  const canEdit = user.role === 'ADMIN';

  const loadData = async () => {
    setLoading(true);
    const res = await callApi<AcademicYear[]>('getAcademicYears');
    setLoading(false);
    if (res.success && res.data) setYears(res.data);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama_tahun_ajaran?.trim()) return;
    setSaving(true);
    const res = editing
      ? await callApi('updateAcademicYear', form)
      : await callApi('createAcademicYear', form);
    setSaving(false);
    if (res.success) {
      onToast('success', editing ? 'Tahun ajaran diperbarui' : 'Tahun ajaran ditambahkan');
      setFormOpen(false);
      loadData();
      onSchoolChanged();
    } else {
      onToast('error', 'Gagal menyimpan', res.message);
    }
  };

  const handleActivate = async (item: AcademicYear) => {
    setSaving(true);
    const res = await callApi('setActiveAcademicYear', {
      id_tahun_ajaran: item.id_tahun_ajaran,
    });
    setSaving(false);
    if (res.success) {
      onToast(
        'success',
        'Tahun ajaran diaktifkan',
        `${item.nama_tahun_ajaran} (${item.semester}) kini aktif.`
      );
      loadData();
      onSchoolChanged();
    } else {
      onToast('error', 'Gagal mengaktifkan', res.message);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tahun Ajaran & Semester"
        description="Kelola tahun ajaran tanpa batas (mis. 2026/2027, 2027/2028). Hanya satu tahun ajaran yang aktif pada satu waktu dan arsip lama tetap tersimpan."
        actions={
          canEdit && (
            <PrimaryButton
              onClick={() => {
                setEditing(null);
                setForm({
                  nama_tahun_ajaran: '',
                  semester: 'Ganjil',
                  status: 'Draft',
                  keterangan: '',
                });
                setFormOpen(true);
              }}
            >
              <Plus className="w-4 h-4" />
              Tambah Tahun Ajaran
            </PrimaryButton>
          )
        }
      />

      {loading ? (
        <TableSkeleton cols={5} rows={4} />
      ) : years.length === 0 ? (
        <EmptyState
          title="Belum ada tahun ajaran"
          description="Tambahkan tahun ajaran sekolah Anda, misalnya 2026/2027."
        />
      ) : (
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#EDE9FE] text-[#1E1B4B]">
                <tr>
                  <th className="px-4 py-3 font-semibold">No</th>
                  <th className="px-4 py-3 font-semibold">Tahun Ajaran</th>
                  <th className="px-4 py-3 font-semibold">Semester</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Keterangan</th>
                  {canEdit && <th className="px-4 py-3 font-semibold text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {years.map((y, idx) => (
                  <tr key={y.id_tahun_ajaran} className="hover:bg-[#F5F3FF]/50">
                    <td className="px-4 py-3 tabular-nums text-[#64748B]">{idx + 1}</td>
                    <td className="px-4 py-3 font-semibold text-[#1E1B4B] tabular-nums">
                      {y.nama_tahun_ajaran}
                    </td>
                    <td className="px-4 py-3">{y.semester}</td>
                    <td className="px-4 py-3">
                      <StatusText status={y.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-[#64748B]">{y.keterangan || '-'}</td>
                    {canEdit && (
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {y.status !== 'Aktif' && (
                            <button
                              type="button"
                              onClick={() => handleActivate(y)}
                              disabled={saving}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#16A34A] bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Aktifkan
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setEditing(y);
                              setForm({ ...y });
                              setFormOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#6D28D9] hover:bg-[#EDE9FE] cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(y)}
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
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit Tahun Ajaran' : 'Tambah Tahun Ajaran Baru'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1">Tahun Ajaran *</label>
            <input
              type="text"
              required
              value={form.nama_tahun_ajaran || ''}
              onChange={(e) => setForm({ ...form, nama_tahun_ajaran: e.target.value })}
              placeholder="Contoh: 2026/2027"
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Semester</label>
            <select
              value={form.semester || 'Ganjil'}
              onChange={(e) =>
                setForm({ ...form, semester: e.target.value as 'Ganjil' | 'Genap' })
              }
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
            >
              <option value="Ganjil">Ganjil</option>
              <option value="Genap">Genap</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Status</label>
            <select
              value={form.status || 'Draft'}
              onChange={(e) =>
                setForm({ ...form, status: e.target.value as AcademicYear['status'] })
              }
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
            >
              <option value="Aktif">Aktif</option>
              <option value="Draft">Draft</option>
              <option value="Arsip">Arsip</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Keterangan</label>
            <input
              type="text"
              value={form.keterangan || ''}
              onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E7EB]">
            <SecondaryButton onClick={() => setFormOpen(false)}>Batal</SecondaryButton>
            <PrimaryButton type="submit" loading={saving}>
              Simpan
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
          const res = await callApi('deleteAcademicYear', {
            id_tahun_ajaran: deleteTarget.id_tahun_ajaran,
          });
          setSaving(false);
          if (res.success) {
            onToast('success', 'Tahun ajaran dihapus');
            setDeleteTarget(null);
            loadData();
          } else {
            onToast('error', 'Tidak dapat menghapus', res.message);
          }
        }}
        loading={saving}
        title="Hapus Tahun Ajaran"
        message={`Hapus tahun ajaran "${deleteTarget?.nama_tahun_ajaran}"? Tahun ajaran yang sudah dipakai pada data kelas, absensi, atau nilai tidak dapat dihapus.`}
      />
    </div>
  );
}
