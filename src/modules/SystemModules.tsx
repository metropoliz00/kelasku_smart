import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Copy,
  Database,
  Download,
  Edit3,
  FileSpreadsheet,
  KeyRound,
  Monitor,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Trash2,
} from 'lucide-react';
import {
  callApi,
  getConfiguredGasUrl,
  getConnectionMode,
  getDefaultGasUrl,
  resetGasUrlToDefault,
  setConfiguredGasUrl,
  validateGasWebAppUrl,
} from '../services/api';
import {
  AcademicYear,
  ActivityLog,
  AuthUser,
  ClassRoom,
  DesktopUpdateStatus,
  SchoolIdentity,
  Student,
  Subject,
  Teacher,
  UserRole,
  isKepalaSekolah,
} from '../types';
import {
  ConfirmDialog,
  EmptyState,
  Modal,
  PageHeader,
  PhotoUploadField,
  PrimaryButton,
  SecondaryButton,
  StatusText,
  TableSkeleton,
  UserAvatar,
} from '../components/UI';
import { exportMultiSheetWorkbook, exportRowsToExcel } from '../utils/excel';
import { generatePdfReport } from '../utils/pdf';
import { formatDateIndonesia } from '../utils/date';
import { copyGasCodeToClipboard, downloadGasCodeFile } from '../utils/gasCode';
import { ROLE_LABELS } from '../config/navigation';

type ToastFn = (type: 'success' | 'error' | 'warning' | 'info', title: string, message?: string) => void;

// ============================================================================
// 1. MANAJEMEN PENGGUNA
// ============================================================================

export function PenggunaModule({
  onToast,
  currentUserId,
  onCurrentUserUpdated,
}: {
  onToast: ToastFn;
  currentUserId?: string;
  onCurrentUserUpdated?: (user: AuthUser) => void;
}) {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AuthUser | null>(null);
  const [resetTarget, setResetTarget] = useState<AuthUser | null>(null);
  const [newResetPassword, setNewResetPassword] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<AuthUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  const [form, setForm] = useState<{
    username: string;
    password: string;
    nama_lengkap: string;
    role: UserRole;
    relasi_id: string;
    relasi_nama: string;
    status: 'Aktif' | 'Nonaktif';
    foto_url: string;
  }>({
    username: '',
    password: '',
    nama_lengkap: '',
    role: 'GURU',
    relasi_id: '',
    relasi_nama: '',
    status: 'Aktif',
    foto_url: '',
  });

  const loadData = async () => {
    setLoading(true);
    const [uRes, tRes, sRes] = await Promise.all([
      callApi<AuthUser[]>('getUsers'),
      callApi<Teacher[]>('getTeachers'),
      callApi<Student[]>('getStudents'),
    ]);
    setLoading(false);
    if (uRes.success && uRes.data) setUsers(uRes.data);
    if (tRes.success && tRes.data) setTeachers(tRes.data);
    if (sRes.success && sRes.data) setStudents(sRes.data);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username.trim() || !form.nama_lengkap.trim()) {
      onToast('warning', 'Data Belum Lengkap', 'Username dan nama lengkap wajib diisi.');
      return;
    }
    if (!editing && !form.password) {
      onToast('warning', 'Validasi', 'Password wajib diisi saat membuat pengguna baru.');
      return;
    }

    let relasiNama = form.relasi_nama;
    if ((form.role === 'GURU' || form.role === 'KEPALA_SEKOLAH') && form.relasi_id) {
      relasiNama = teachers.find((t) => t.id_guru === form.relasi_id)?.nama_guru || '';
    } else if (form.role === 'ORANG_TUA' && form.relasi_id) {
      relasiNama = students.find((s) => s.id_siswa === form.relasi_id)?.nama_lengkap || '';
    }

    setSaving(true);
    const res = editing
      ? await callApi<AuthUser>('updateUser', {
          id_user: editing.id_user,
          username: form.username.trim(),
          nama_lengkap: form.nama_lengkap.trim(),
          role: form.role,
          relasi_id: form.relasi_id,
          relasi_nama: relasiNama,
          status: form.status,
          foto_url: form.foto_url,
          ...(form.password ? { new_password: form.password } : {}),
        })
      : await callApi<AuthUser>('createUser', {
          ...form,
          username: form.username.trim(),
          nama_lengkap: form.nama_lengkap.trim(),
          relasi_nama: relasiNama,
          foto_url: form.foto_url,
        });
    setSaving(false);

    if (res.success) {
      if (editing && currentUserId && editing.id_user === currentUserId && res.data) {
        onCurrentUserUpdated?.(res.data);
      }
      onToast('success', editing ? 'Pengguna diperbarui' : 'Pengguna ditambahkan');
      setFormOpen(false);
      loadData();
    } else {
      onToast('error', 'Gagal menyimpan', res.message);
    }
  };

  const handleToggleStatus = async (u: AuthUser) => {
    const nextStatus = u.status === 'Aktif' ? 'Nonaktif' : 'Aktif';
    const res = await callApi('updateUser', { id_user: u.id_user, status: nextStatus });
    if (res.success) {
      onToast('success', `Akun ${u.username} ${nextStatus}`);
      loadData();
    } else {
      onToast('error', 'Gagal memperbarui status', res.message);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Manajemen Pengguna & Hak Akses"
        description="Akun Guru, Kepala Sekolah, dan Orang Tua/Siswa otomatis terhubung dari Data Guru dan Data Siswa agar dapat langsung mengakses aplikasi."
        actions={
          <PrimaryButton
            onClick={() => {
              setEditing(null);
              setForm({
                username: '',
                password: '',
                nama_lengkap: '',
                role: 'GURU',
                relasi_id: '',
                relasi_nama: '',
                status: 'Aktif',
                foto_url: '',
              });
              setFormOpen(true);
            }}
          >
            <Plus className="w-4 h-4" />
            Tambah Pengguna
          </PrimaryButton>
        }
      />

      {/* Search & Role Filter */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari username atau nama lengkap..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white sm:w-52"
        >
          <option value="ALL">Semua Role</option>
          <option value="ADMIN">Administrator</option>
          <option value="KEPALA_SEKOLAH">Kepala Sekolah</option>
          <option value="GURU">Guru</option>
          <option value="ORANG_TUA">Orang Tua</option>
        </select>
      </div>

      {loading ? (
        <TableSkeleton cols={6} rows={4} />
      ) : users.length === 0 ? (
        <EmptyState title="Belum ada pengguna terdaftar" />
      ) : (
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#EDE9FE] text-[#1E1B4B]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Username</th>
                  <th className="px-4 py-3 font-semibold">Password (Plain Text)</th>
                  <th className="px-4 py-3 font-semibold">Nama Lengkap</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Relasi Data</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {(() => {
                  const filteredUsers = users.filter((u) => {
                    const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
                    const q = search.trim().toLowerCase();
                    const matchSearch =
                      !q ||
                      (u.username || '').toLowerCase().includes(q) ||
                      (u.nama_lengkap || '').toLowerCase().includes(q) ||
                      (u.relasi_nama || '').toLowerCase().includes(q);
                    return matchRole && matchSearch;
                  });
                  if (filteredUsers.length === 0) {
                    return (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-sm text-[#64748B]">
                          Tidak ada pengguna yang sesuai dengan filter pencarian.
                        </td>
                      </tr>
                    );
                  }
                  return filteredUsers.map((u, idx) => (
                  <tr key={`${u.id_user || u.username || 'user'}-${idx}`} className="hover:bg-[#F5F3FF]/50">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-[#1E1B4B]">
                      {u.username}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[#4C1D95] bg-[#F5F3FF]/40">
                      {u.password || '-'}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      <div className="flex items-center gap-2.5">
                        <UserAvatar src={u.foto_url} name={u.nama_lengkap} size="sm" />
                        <span className="text-[#1E1B4B]">{u.nama_lengkap}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-[#6D28D9]">
                      {ROLE_LABELS[u.role]}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#64748B]">
                      {u.relasi_nama || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(u)}
                        title="Klik untuk aktif/nonaktifkan"
                        className="cursor-pointer"
                      >
                        <StatusText status={u.status} />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <button
                          type="button"
                          title="Reset Password"
                          onClick={() => {
                            setResetTarget(u);
                            setNewResetPassword('');
                          }}
                          className="p-1.5 rounded-lg text-[#64748B] hover:text-[#F59E0B] hover:bg-amber-50 cursor-pointer"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          title="Edit Pengguna"
                          onClick={() => {
                            setEditing(u);
                            setForm({
                              username: u.username,
                              password: u.password || '',
                              nama_lengkap: u.nama_lengkap,
                              role: u.role,
                              relasi_id: u.relasi_id || '',
                              relasi_nama: u.relasi_nama || '',
                              status: u.status,
                              foto_url: u.foto_url || '',
                            });
                            setFormOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-[#64748B] hover:text-[#6D28D9] hover:bg-[#EDE9FE] cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          title="Hapus Pengguna"
                          onClick={() => setDeleteTarget(u)}
                          className="p-1.5 rounded-lg text-[#64748B] hover:text-[#DC2626] hover:bg-red-50 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit User */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <PhotoUploadField
            value={form.foto_url}
            name={form.nama_lengkap || form.username}
            label="Foto Akun (Opsional · Max 200 KB)"
            onChange={(val) => setForm({ ...form, foto_url: val })}
            onError={(msg) => onToast('error', 'Upload Foto Gagal', msg)}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Username *</label>
              <input
                type="text"
                required
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">
                {editing ? 'Password (Plain Text · Terlihat)' : 'Password * (Plain Text)'}
              </label>
              <input
                type="text"
                required={!editing}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Masukkan password (tanpa hash)"
                className="w-full px-3 py-2 text-sm font-mono border border-[#E5E7EB] rounded-lg"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Nama Lengkap *</label>
            <input
              type="text"
              required
              value={form.nama_lengkap}
              onChange={(e) => setForm({ ...form, nama_lengkap: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Role</label>
              <select
                value={form.role}
                onChange={(e) =>
                  setForm({
                    ...form,
                    role: e.target.value as UserRole,
                    relasi_id: '',
                    relasi_nama: '',
                  })
                }
                className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
              >
                <option value="ADMIN">Administrator</option>
                <option value="KEPALA_SEKOLAH">Kepala Sekolah</option>
                <option value="GURU">Guru</option>
                <option value="ORANG_TUA">Orang Tua</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Status Akun</label>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as 'Aktif' | 'Nonaktif' })
                }
                className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
              >
                <option value="Aktif">Aktif</option>
                <option value="Nonaktif">Nonaktif</option>
              </select>
            </div>
          </div>

          {(form.role === 'GURU' || form.role === 'KEPALA_SEKOLAH') && (
            <div>
              <label className="block text-xs font-semibold mb-1">
                {form.role === 'KEPALA_SEKOLAH'
                  ? 'Hubungkan dengan Data Guru / Kepala Sekolah (Opsional)'
                  : 'Hubungkan dengan Data Guru'}
              </label>
              <select
                value={form.relasi_id}
                onChange={(e) => {
                  const tId = e.target.value;
                  const t = teachers.find((item) => item.id_guru === tId);
                  const isKepsek = t ? isKepalaSekolah(t.mata_pelajaran, t.jabatan) : false;
                  const nextRole: UserRole = isKepsek ? 'KEPALA_SEKOLAH' : form.role;
                  setForm({
                    ...form,
                    role: nextRole,
                    relasi_id: tId,
                    nama_lengkap: t && !form.nama_lengkap ? t.nama_guru : form.nama_lengkap,
                    username:
                      nextRole === 'GURU'
                        ? (t?.nip ? t.nip : form.username)
                        : (t?.nip && !form.username ? t.nip : form.username),
                    password:
                      nextRole === 'GURU'
                        ? (t?.nip ? t.nip : form.password)
                        : (t?.nip && !form.password ? t.nip : form.password),
                  });
                }}
                className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
              >
                <option value="">
                  {form.role === 'KEPALA_SEKOLAH' ? '-- Pilih Data Kepala Sekolah / Guru (Opsional) --' : '-- Pilih Guru --'}
                </option>
                {[...teachers]
                  .sort((a, b) => {
                    if (form.role === 'KEPALA_SEKOLAH') {
                      const ak = isKepalaSekolah(a.mata_pelajaran, a.jabatan) ? 0 : 1;
                      const bk = isKepalaSekolah(b.mata_pelajaran, b.jabatan) ? 0 : 1;
                      if (ak !== bk) return ak - bk;
                    }
                    return 0;
                  })
                  .map((t) => (
                    <option key={t.id_guru} value={t.id_guru}>
                      {t.nama_guru}
                      {isKepalaSekolah(t.mata_pelajaran, t.jabatan) ? ' [Kepala Sekolah]' : ''}
                      {t.nip ? ` (NIP: ${t.nip})` : ''}
                    </option>
                  ))}
              </select>
              <p className="mt-1 text-[11px] text-[#64748B]">
                {form.role === 'KEPALA_SEKOLAH'
                  ? 'Memilih data pendidik berjabatan/mapel Kepala Sekolah akan menghubungkan akun ke data pendidik tersebut.'
                  : 'Username dan password otomatis mengikuti NIP guru. Jika memilih Kepala Sekolah, role akun otomatis disetel ke Kepala Sekolah.'}
              </p>
            </div>
          )}

          {form.role === 'ORANG_TUA' && (
            <div>
              <label className="block text-xs font-semibold mb-1">
                Hubungkan dengan Data Anak (Siswa)
              </label>
              <select
                value={form.relasi_id}
                onChange={(e) => {
                  const sId = e.target.value;
                  const s = students.find((item) => item.id_siswa === sId);
                  setForm({
                    ...form,
                    relasi_id: sId,
                    nama_lengkap: s && !form.nama_lengkap ? `Wali dari ${s.nama_lengkap}` : form.nama_lengkap,
                    username: s?.nis ? s.nis : form.username,
                    password: s?.nis ? s.nis : form.password,
                  });
                }}
                className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
              >
                <option value="">-- Pilih Siswa (Opsional) --</option>
                {students.map((s) => (
                  <option key={s.id_siswa} value={s.id_siswa}>
                    {s.nama_lengkap} - NIS {s.nis} ({s.nama_kelas})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-[#64748B]">
                Username dan password otomatis mengikuti NIS siswa.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E7EB]">
            <SecondaryButton onClick={() => setFormOpen(false)}>Batal</SecondaryButton>
            <PrimaryButton type="submit" loading={saving}>
              Simpan Pengguna
            </PrimaryButton>
          </div>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        open={!!resetTarget}
        onClose={() => setResetTarget(null)}
        title="Reset Password Pengguna"
        subtitle={`Mengatur ulang password untuk akun ${resetTarget?.username}`}
        maxWidth="max-w-md"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!resetTarget || !newResetPassword) return;
            setSaving(true);
            const res = await callApi('updateUser', {
              id_user: resetTarget.id_user,
              new_password: newResetPassword,
            });
            setSaving(false);
            if (res.success) {
              onToast('success', 'Password berhasil direset');
              setResetTarget(null);
              loadData();
            } else {
              onToast('error', 'Gagal mereset password', res.message);
            }
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold mb-1">Password Baru * (Plain Text)</label>
            <input
              type="text"
              required
              value={newResetPassword}
              onChange={(e) => setNewResetPassword(e.target.value)}
              placeholder="Masukkan password baru"
              className="w-full px-3 py-2 text-sm font-mono border border-[#E5E7EB] rounded-lg"
            />
          </div>
          <div className="flex justify-end gap-2">
            <SecondaryButton onClick={() => setResetTarget(null)}>Batal</SecondaryButton>
            <PrimaryButton type="submit" loading={saving}>
              Simpan Password Baru
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
          const res = await callApi('deleteUser', { id_user: deleteTarget.id_user });
          setSaving(false);
          if (res.success) {
            onToast('success', 'Pengguna dihapus');
            setDeleteTarget(null);
            loadData();
          } else {
            onToast('error', 'Gagal menghapus pengguna', res.message);
          }
        }}
        loading={saving}
        title="Hapus Pengguna"
        message={`Hapus akun "${deleteTarget?.username}"?`}
      />
    </div>
  );
}

// ============================================================================
// 2. PENGATURAN SEKOLAH & KONEKSI DATABASE
// ============================================================================

export function PengaturanModule({
  school,
  onSchoolUpdated,
  onConnectionChanged,
  onToast,
}: {
  school: SchoolIdentity;
  onSchoolUpdated: () => void;
  onConnectionChanged?: (requireRelogin: boolean) => void;
  onToast: ToastFn;
}) {
  const [form, setForm] = useState<SchoolIdentity>(school);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [saving, setSaving] = useState(false);

  const [gasUrlInput, setGasUrlInput] = useState(() => getConfiguredGasUrl());
  const [testingConn, setTestingConn] = useState(false);
  const [connStatusText, setConnStatusText] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);
  const [desktopUpdate, setDesktopUpdate] = useState<DesktopUpdateStatus | null>(null);
  const isDesktop = Boolean(window.kelaskuDesktop?.isDesktop);

  useEffect(() => {
    setForm(school);
    callApi<AcademicYear[]>('getAcademicYears').then((res) => {
      if (res.success && res.data) setYears(res.data);
    });
  }, [school]);

  useEffect(() => {
    if (!window.kelaskuDesktop?.onUpdateStatus) return;
    return window.kelaskuDesktop.onUpdateStatus((status) => {
      setDesktopUpdate(status);
    });
  }, []);

  const handleSaveSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    const yr = years.find((y) => y.id_tahun_ajaran === form.tahun_ajaran_aktif_id);
    const payload = {
      ...form,
      tahun_ajaran_aktif: yr?.nama_tahun_ajaran || form.tahun_ajaran_aktif,
    };
    setSaving(true);
    const res = await callApi('updateSchoolSettings', payload);
    setSaving(false);
    if (res.success) {
      onToast('success', 'Pengaturan sekolah disimpan');
      onSchoolUpdated();
    } else {
      onToast('error', 'Gagal menyimpan', res.message);
    }
  };

  const handleSaveAndTestGasUrl = async () => {
    const check = validateGasWebAppUrl(gasUrlInput);
    if (!check.valid) {
      onToast('warning', 'URL Tidak Valid', check.message);
      return;
    }
    const prevUrl = getConfiguredGasUrl();
    setTestingConn(true);
    setConfiguredGasUrl(check.cleaned);
    setGasUrlInput(check.cleaned);
    const pingRes = await callApi<{ nama_sekolah?: string; user_count?: number }>('ping');
    setTestingConn(false);

    if (pingRes.success) {
      const schoolLabel = pingRes.data?.nama_sekolah ? ` (${pingRes.data.nama_sekolah})` : '';
      setConnStatusText(`Terhubung ke Google Apps Script${schoolLabel}.`);
      const changed = check.cleaned !== prevUrl;
      onToast(
        'success',
        'Koneksi Apps Script Berhasil',
        changed
          ? 'URL baru aktif. Silakan masuk ulang menggunakan akun pada database baru.'
          : 'Koneksi ke database sekolah terverifikasi.'
      );
      onConnectionChanged?.(changed);
    } else {
      setConnStatusText(`Gagal terhubung: ${pingRes.message}`);
      onToast('error', 'Koneksi Gagal', pingRes.message);
    }
  };

  const handleResetGasUrl = () => {
    const prevUrl = getConfiguredGasUrl();
    const def = resetGasUrlToDefault();
    setGasUrlInput(def);
    setConnStatusText(def ? 'Dikembalikan ke URL Apps Script bawaan.' : 'URL kustom dihapus.');
    onToast('info', 'URL Apps Script Direset');
    onConnectionChanged?.(def !== prevUrl);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengaturan Sekolah"
        description="Identitas resmi sekolah yang dicetak pada kop laporan PDF dan pengaturan tahun ajaran."
      />

      <form
        onSubmit={handleSaveSchool}
        className="bg-white border border-[#E5E7EB] rounded-xl p-6 space-y-4"
      >
        <h2 className="text-base font-bold text-[#1E1B4B]">Identitas Sekolah</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold mb-1">Nama Sekolah *</label>
              <input
                type="text"
                required
                value={form.nama_sekolah}
                onChange={(e) => setForm({ ...form, nama_sekolah: e.target.value })}
                placeholder="Contoh: SD Negeri 01 Nusantara"
                className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">NPSN</label>
              <input
                type="text"
                value={form.npsn}
                onChange={(e) => setForm({ ...form, npsn: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Email Sekolah</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold mb-1">Alamat Sekolah</label>
              <input
                type="text"
                value={form.alamat}
                onChange={(e) => setForm({ ...form, alamat: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Kecamatan</label>
              <input
                type="text"
                value={form.kecamatan}
                onChange={(e) => setForm({ ...form, kecamatan: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Kabupaten / Kota</label>
              <input
                type="text"
                value={form.kabupaten}
                onChange={(e) => setForm({ ...form, kabupaten: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Provinsi</label>
              <input
                type="text"
                value={form.provinsi}
                onChange={(e) => setForm({ ...form, provinsi: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Tampilkan Peringkat Nilai</label>
              <select
                value={form.peringkat_aktif || 'Tidak'}
                onChange={(e) =>
                  setForm({ ...form, peringkat_aktif: e.target.value as 'Ya' | 'Tidak' })
                }
                className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
              >
                <option value="Tidak">Tidak Aktif</option>
                <option value="Ya">Aktifkan Peringkat Kelas</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Tahun Ajaran Aktif</label>
              <select
                value={form.tahun_ajaran_aktif_id}
                onChange={(e) => setForm({ ...form, tahun_ajaran_aktif_id: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
              >
                <option value="">-- Pilih Tahun Ajaran --</option>
                {years.map((y) => (
                  <option key={y.id_tahun_ajaran} value={y.id_tahun_ajaran}>
                    {y.nama_tahun_ajaran}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Semester Aktif</label>
              <select
                value={form.semester_aktif}
                onChange={(e) =>
                  setForm({ ...form, semester_aktif: e.target.value as 'Ganjil' | 'Genap' })
                }
                className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
              >
                <option value="Ganjil">Ganjil</option>
                <option value="Genap">Genap</option>
              </select>
            </div>
          </div>

        <div className="pt-3 border-t border-[#E5E7EB] flex justify-end">
          <PrimaryButton type="submit" loading={saving}>
            <Save className="w-4 h-4" />
            Simpan Identitas Sekolah
          </PrimaryButton>
        </div>
      </form>



      {/* Info Aplikasi Desktop (.exe) & Pembaruan Otomatis */}
      {isDesktop && (
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-[#1E1B4B] flex items-center gap-2">
                <Monitor className="w-4 h-4 text-[#6D28D9]" />
                Aplikasi Desktop (.exe) & Pembaruan Otomatis
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Versi terpasang: <strong>v{window.kelaskuDesktop?.appVersion || '1.0.0'}</strong> · Pembaruan otomatis memeriksa rilis terbaru.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <SecondaryButton
                onClick={() => window.kelaskuDesktop?.checkForUpdates()}
                disabled={desktopUpdate?.status === 'checking' || desktopUpdate?.status === 'progress'}
              >
                <RefreshCw
                  className={`w-4 h-4 ${desktopUpdate?.status === 'checking' ? 'animate-spin' : ''}`}
                />
                {desktopUpdate?.status === 'checking' ? 'Memeriksa...' : 'Cek Pembaruan'}
              </SecondaryButton>
              {desktopUpdate?.status === 'downloaded' && (
                <PrimaryButton onClick={() => window.kelaskuDesktop?.installUpdate()}>
                  Pasang Pembaruan & Mulai Ulang
                </PrimaryButton>
              )}
            </div>
          </div>

          {desktopUpdate?.message && (
            <div className="p-3 rounded-lg bg-[#F5F3FF] border border-[#DDD6FE] text-xs text-[#4C1D95] font-medium">
              {desktopUpdate.message}
            </div>
          )}

          <div className="text-xs text-[#64748B] space-y-1 bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg p-3">
            <div>
              <strong>Alternatif Tanpa UI:</strong> Anda juga dapat membuat file teks{' '}
              <code className="bg-white px-1 rounded border border-[#E5E7EB]">appscript-url.txt</code> berisi URL{' '}
              <code className="bg-white px-1 rounded border border-[#E5E7EB]">/exec</code> di folder yang sama dengan file{' '}
              <code className="bg-white px-1 rounded border border-[#E5E7EB]">.exe</code>.
            </div>
            {window.kelaskuDesktop?.configPath && (
              <div className="truncate" title={window.kelaskuDesktop.configPath}>
                <strong>File Konfigurasi Desktop:</strong>{' '}
                <span className="font-mono">{window.kelaskuDesktop.configPath}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 3. PUSAT LAPORAN SEKOLAH
// ============================================================================

export function LaporanModule({
  school,
  onToast,
}: {
  school: SchoolIdentity;
  onToast: ToastFn;
}) {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [filterClass, setFilterClass] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [sRes, tRes, cRes, mRes] = await Promise.all([
        callApi<Student[]>('getStudents'),
        callApi<Teacher[]>('getTeachers'),
        callApi<ClassRoom[]>('getClasses'),
        callApi<Subject[]>('getSubjects'),
      ]);
      setLoading(false);
      if (sRes.success && sRes.data) setStudents(sRes.data);
      if (tRes.success && tRes.data) setTeachers(tRes.data);
      if (cRes.success && cRes.data) setClasses(cRes.data);
      if (mRes.success && mRes.data) setSubjects(mRes.data);
    };
    load();
  }, []);

  const filteredStudents = students.filter((s) => !filterClass || s.id_kelas === filterClass);
  const filteredClasses = classes.filter((c) => !filterClass || c.id_kelas === filterClass);
  const selectedClassName = classes.find((c) => c.id_kelas === filterClass)?.nama_kelas;

  const cards = [
    {
      title: 'Laporan Data Induk Siswa',
      desc: `${filteredStudents.length} siswa terdata${selectedClassName ? ` (${selectedClassName})` : ''}.`,
      onPdf: () =>
        generatePdfReport({
          orientation: 'landscape',
          title: selectedClassName
            ? `LAPORAN DATA INDUK PESERTA DIDIK (${selectedClassName.toUpperCase()})`
            : 'LAPORAN DATA INDUK PESERTA DIDIK',
          school,
          headers: ['No', 'NIS', 'NISN', 'Nama', 'JK', 'Rombel Saat Ini', 'Orang Tua / HP', 'Status'],
          rows: filteredStudents.map((s, i) => [
            s.no || i + 1,
            s.nis,
            s.nisn || '-',
            s.nama_lengkap,
            s.jenis_kelamin,
            s.nama_kelas || '-',
            `${s.nama_ayah || s.nama_ibu || '-'} (${s.hp || s.telepon_ortu || '-'})`,
            s.status_siswa,
          ]),
          filename: `Laporan_Induk_Siswa_${new Date().toISOString().slice(0, 10)}.pdf`,
        }),
      onExcel: () =>
        exportRowsToExcel(
          `Laporan_Siswa_${new Date().toISOString().slice(0, 10)}.xlsx`,
          'Siswa',
          ['No', 'Nama', 'NIS', 'JK', 'NISN', 'NIK', 'Rombel Saat Ini', 'HP', 'Nama Ayah', 'Nama Ibu', 'Status'],
          filteredStudents.map((s, i) => [
            s.no || i + 1,
            s.nama_lengkap,
            s.nis,
            s.jenis_kelamin,
            s.nisn,
            s.nik || '',
            s.nama_kelas,
            s.hp || s.telepon_ortu || s.telepon || '',
            s.nama_ayah,
            s.nama_ibu,
            s.status_siswa,
          ])
        ),
    },
    {
      title: 'Laporan Data Guru & Pegawai',
      desc: `${teachers.length} pendidik terdata.`,
      onPdf: () =>
        generatePdfReport({
          orientation: 'landscape',
          title: 'LAPORAN DATA GURU DAN TENAGA KEPENDIDIKAN',
          school,
          headers: ['NO', 'NAMA', 'NIP', 'NUPTK', 'JK', 'IJAZAH', 'JABATAN', 'STATUS', 'PANGKAT/GOL', 'EMAIL BELAJAR'],
          rows: teachers.map((t, i) => [
            t.no || i + 1,
            t.nama_guru,
            t.nip || '-',
            t.nuptk || '-',
            t.jenis_kelamin,
            t.ijazah_tertinggi || '-',
            t.jabatan || '-',
            t.status_kepegawaian || '-',
            t.pangkat_gol || '-',
            t.email_belajar || t.email_pribadi || '-',
          ]),
          filename: `Laporan_Guru_${new Date().toISOString().slice(0, 10)}.pdf`,
        }),
      onExcel: () =>
        exportRowsToExcel(
          `Laporan_Guru_${new Date().toISOString().slice(0, 10)}.xlsx`,
          'Guru',
          [
            'NO', 'NAMA', 'NIP', 'NUPTK', 'JENIS KELAMIN', 'TEMPAT LAHIR', 'TANGGAL LAHIR',
            'IJAZAH TERTINGGI', 'JABATAN', 'STATUS', 'TMT PENGANGKATAN', 'MULAI BEKERJA DISINI',
            'PANGKAT/GOL', 'MASA KERJA (THN)', 'MASA KERJA (BLN)', 'TANGGAL DAN NO SK TERAKHIR',
            'EMAIL PRIBADI', 'EMAIL BELAJAR',
          ],
          teachers.map((t, i) => [
            t.no || i + 1,
            t.nama_guru,
            t.nip,
            t.nuptk,
            t.jenis_kelamin,
            t.tempat_lahir || '',
            t.tanggal_lahir ? formatDateIndonesia(t.tanggal_lahir) : '',
            t.ijazah_tertinggi || '',
            t.jabatan,
            t.status_kepegawaian,
            t.tmt_pengangkatan ? formatDateIndonesia(t.tmt_pengangkatan) : '',
            t.mulai_bekerja_disini ? formatDateIndonesia(t.mulai_bekerja_disini) : '',
            t.pangkat_gol || '',
            t.masa_kerja_thn || '',
            t.masa_kerja_bln || '',
            t.tanggal_no_sk_terakhir || '',
            t.email_pribadi || '',
            t.email_belajar || '',
          ])
        ),
    },
    {
      title: 'Laporan Rombongan Belajar & Mapel',
      desc: `${filteredClasses.length} kelas aktif · ${subjects.length} mata pelajaran.`,
      onPdf: () =>
        generatePdfReport({
          orientation: 'portrait',
          title: 'LAPORAN ROMBONGAN BELAJAR SEKOLAH',
          school,
          headers: ['No', 'Nama Kelas', 'Tingkat', 'Wali Kelas', 'Tahun Ajaran', 'Jumlah Siswa'],
          rows: filteredClasses.map((c, i) => [
            i + 1,
            c.nama_kelas,
            c.tingkat,
            c.wali_kelas || '-',
            c.tahun_ajaran || '-',
            c.jumlah_siswa ?? 0,
          ]),
          filename: `Laporan_Kelas_${new Date().toISOString().slice(0, 10)}.pdf`,
        }),
      onExcel: () =>
        exportRowsToExcel(
          `Laporan_Kelas_${new Date().toISOString().slice(0, 10)}.xlsx`,
          'Kelas',
          ['Nama Kelas', 'Tingkat', 'Wali Kelas', 'Tahun Ajaran', 'Jumlah Siswa'],
          filteredClasses.map((c) => [c.nama_kelas, c.tingkat, c.wali_kelas, c.tahun_ajaran, c.jumlah_siswa ?? 0])
        ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Pusat Laporan Pendidikan"
        description="Unduh laporan resmi sekolah dalam format PDF (A4) maupun Excel (.xlsx) dari data aktual."
        actions={
          <PrimaryButton onClick={() => window.print()}>
            <Printer className="w-4 h-4" />
            Cetak Halaman
          </PrimaryButton>
        }
      />

      {classes.length > 0 && (
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 flex flex-wrap items-center gap-3">
          <label className="text-xs font-semibold text-[#1E1B4B]">Filter Kelas</label>
          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className="w-full sm:w-64 px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
          >
            <option value="">Semua Kelas</option>
            {classes.map((c) => (
              <option key={c.id_kelas} value={c.id_kelas}>
                {c.nama_kelas}
              </option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <TableSkeleton cols={3} rows={3} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {cards.map((c) => (
            <div key={c.title} className="bg-white border border-[#E5E7EB] rounded-xl p-5 flex flex-col justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-[#1E1B4B]">{c.title}</h3>
                <p className="text-xs text-[#64748B] mt-1 tabular-nums">{c.desc}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <PrimaryButton
                  onClick={() => {
                    c.onPdf();
                    onToast('success', 'PDF berhasil dibuat');
                  }}
                >
                  <Printer className="w-4 h-4" />
                  Cetak PDF
                </PrimaryButton>
                <SecondaryButton
                  onClick={() => {
                    c.onExcel();
                    onToast('success', 'Excel berhasil diunduh');
                  }}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Excel
                </SecondaryButton>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 4. BACKUP DATABASE & LOG AKTIVITAS
// ============================================================================

export function BackupModule({ onToast }: { onToast: ToastFn }) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const loadLogs = async () => {
    setLoading(true);
    const res = await callApi<ActivityLog[]>('getLogs');
    setLoading(false);
    if (res.success && res.data) setLogs(res.data);
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const handleBackupExcel = async () => {
    setBusy(true);
    const res = await callApi<Record<string, Record<string, unknown>[]>>('exportAllData');
    setBusy(false);
    if (!res.success || !res.data) {
      onToast('error', 'Backup Gagal', res.message);
      return;
    }
    const sheets = Object.entries(res.data).map(([name, rows]) => {
      const headers = rows.length > 0 ? Object.keys(rows[0]) : ['Info'];
      const matrix =
        rows.length > 0
          ? rows.map((r) => headers.map((h) => String(r[h] ?? '')))
          : [['Belum ada data']];
      return { name, headers, rows: matrix };
    });
    exportMultiSheetWorkbook(
      `Backup_KELASKU_SMART_${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheets
    );
    onToast('success', 'Backup Excel berhasil diunduh');
  };

  const handleBackupJson = async () => {
    setBusy(true);
    const res = await callApi<Record<string, unknown>>('exportAllData');
    setBusy(false);
    if (!res.success || !res.data) {
      onToast('error', 'Backup Gagal', res.message);
      return;
    }
    const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Backup_KELASKU_SMART_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onToast('success', 'Backup JSON berhasil diunduh');
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Backup Data & Log Aktivitas"
        description="Ekspor cadangan data sekolah dan pantau riwayat aktivitas pengguna."
        actions={
          <>
            <SecondaryButton onClick={handleBackupJson} disabled={busy}>
              <Download className="w-4 h-4" />
              Backup JSON
            </SecondaryButton>
            <PrimaryButton onClick={handleBackupExcel} loading={busy}>
              <FileSpreadsheet className="w-4 h-4" />
              Backup Excel (.xlsx)
            </PrimaryButton>
          </>
        }
      />

      <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E5E7EB] font-semibold text-sm text-[#1E1B4B]">
          Log Aktivitas Sistem
        </div>
        {loading ? (
          <TableSkeleton cols={5} rows={5} />
        ) : logs.length === 0 ? (
          <EmptyState title="Belum ada log aktivitas" />
        ) : (
          <div className="overflow-x-auto max-h-[480px]">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#EDE9FE] text-[#1E1B4B] sticky top-0">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Waktu</th>
                  <th className="px-4 py-2.5 font-semibold">Username</th>
                  <th className="px-4 py-2.5 font-semibold">Role</th>
                  <th className="px-4 py-2.5 font-semibold">Modul / Aksi</th>
                  <th className="px-4 py-2.5 font-semibold">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {logs.map((l) => (
                  <tr key={l.id_log} className="hover:bg-[#F5F3FF]/50">
                    <td className="px-4 py-2.5 font-mono tabular-nums whitespace-nowrap">
                      {String(l.waktu || '').slice(0, 19).replace('T', ' ')}
                    </td>
                    <td className="px-4 py-2.5 font-semibold">{l.username}</td>
                    <td className="px-4 py-2.5">{l.role}</td>
                    <td className="px-4 py-2.5">
                      {l.modul} · {l.aksi}
                    </td>
                    <td className="px-4 py-2.5 text-[#64748B]">{l.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
