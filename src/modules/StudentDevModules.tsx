import React, { useEffect, useState } from 'react';
import { Edit3, Plus, Printer, Trash2 } from 'lucide-react';
import { callApi } from '../services/api';
import {
  AchievementRecord,
  AuthUser,
  CharacterAspect,
  CharacterRecord,
  CounselingRecord,
  HealthRecord,
  SchoolIdentity,
  Student,
} from '../types';
import {
  ConfirmDialog,
  EmptyState,
  Modal,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  StatusText,
  TableSkeleton,
} from '../components/UI';
import { generatePdfReport } from '../utils/pdf';

type ToastFn = (type: 'success' | 'error' | 'warning' | 'info', title: string, message?: string) => void;

const CHARACTER_ASPECTS: CharacterAspect[] = [
  'Religius',
  'Disiplin',
  'Tanggung Jawab',
  'Mandiri',
  'Gotong Royong',
  'Bernalar Kritis',
  'Kreatif',
  'Kepedulian Sosial',
];

// ============================================================================
// 1. KARAKTER SISWA
// ============================================================================

export function KarakterModule({
  user,
  school,
  onToast,
}: {
  user: AuthUser;
  school: SchoolIdentity;
  onToast: ToastFn;
}) {
  const [records, setRecords] = useState<CharacterRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStudent, setFilterStudent] = useState('');
  const [filterAspect, setFilterAspect] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CharacterRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CharacterRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<CharacterRecord>>({
    tanggal: new Date().toISOString().slice(0, 10),
    aspek: 'Religius',
    nilai_perkembangan: 'Berkembang Sesuai Harapan',
  });

  const canEdit = user.role === 'ADMIN' || user.role === 'GURU';

  const loadData = async () => {
    setLoading(true);
    const [rRes, sRes] = await Promise.all([
      callApi<CharacterRecord[]>('getCharacters'),
      callApi<Student[]>('getStudents'),
    ]);
    setLoading(false);
    if (rRes.success && rRes.data) setRecords(rRes.data);
    if (sRes.success && sRes.data) setStudents(sRes.data);
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = records.filter((r) => {
    if (filterStudent && r.id_siswa !== filterStudent) return false;
    if (filterAspect && r.aspek !== filterAspect) return false;
    return true;
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const stu = students.find((s) => s.id_siswa === form.id_siswa);
    const payload = {
      ...form,
      nama_siswa: stu?.nama_lengkap || form.nama_siswa || '',
      id_kelas: stu?.id_kelas || form.id_kelas || '',
      nama_kelas: stu?.nama_kelas || form.nama_kelas || '',
      id_guru: user.relasi_id || '',
      nama_guru: user.nama_lengkap,
    };
    setSaving(true);
    const res = editing
      ? await callApi('updateCharacter', payload)
      : await callApi('createCharacter', payload);
    setSaving(false);
    if (res.success) {
      onToast('success', editing ? 'Observasi diperbarui' : 'Observasi karakter ditambahkan');
      setFormOpen(false);
      loadData();
    } else {
      onToast('error', 'Gagal menyimpan', res.message);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={user.role === 'ORANG_TUA' ? 'Perkembangan Karakter Anak' : 'Karakter Siswa'}
        description="Observasi 8 aspek profil karakter: Religius, Disiplin, Tanggung Jawab, Mandiri, Gotong Royong, Bernalar Kritis, Kreatif, Kepedulian Sosial."
        actions={
          <>
            <SecondaryButton
              disabled={filtered.length === 0}
              onClick={() =>
                generatePdfReport({
                  orientation: 'portrait',
                  title: 'LAPORAN PERKEMBANGAN KARAKTER SISWA',
                  school,
                  headers: ['No', 'Tanggal', 'Siswa', 'Kelas', 'Aspek', 'Capaian', 'Catatan', 'Tindak Lanjut'],
                  rows: filtered.map((r, i) => [
                    i + 1,
                    r.tanggal,
                    r.nama_siswa,
                    r.nama_kelas,
                    r.aspek,
                    r.nilai_perkembangan,
                    r.catatan,
                    r.tindak_lanjut,
                  ]),
                  filename: `Laporan_Karakter_${new Date().toISOString().slice(0, 10)}.pdf`,
                })
              }
            >
              <Printer className="w-4 h-4" />
              Cetak PDF
            </SecondaryButton>
            {canEdit && (
              <PrimaryButton
                onClick={() => {
                  setEditing(null);
                  setForm({
                    tanggal: new Date().toISOString().slice(0, 10),
                    id_siswa: students[0]?.id_siswa || '',
                    aspek: 'Religius',
                    nilai_perkembangan: 'Berkembang Sesuai Harapan',
                    catatan: '',
                    tindak_lanjut: '',
                  });
                  setFormOpen(true);
                }}
              >
                <Plus className="w-4 h-4" />
                Catat Observasi
              </PrimaryButton>
            )}
          </>
        }
      />

      <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {user.role !== 'ORANG_TUA' && (
          <select
            value={filterStudent}
            onChange={(e) => setFilterStudent(e.target.value)}
            className="px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
          >
            <option value="">Semua Siswa</option>
            {students.map((s) => (
              <option key={s.id_siswa} value={s.id_siswa}>
                {s.nama_lengkap} ({s.nama_kelas})
              </option>
            ))}
          </select>
        )}
        <select
          value={filterAspect}
          onChange={(e) => setFilterAspect(e.target.value)}
          className="px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
        >
          <option value="">Semua Aspek Karakter</option>
          {CHARACTER_ASPECTS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <TableSkeleton cols={6} rows={4} />
      ) : filtered.length === 0 ? (
        <EmptyState title="Belum ada catatan observasi karakter" />
      ) : (
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#EDE9FE] text-[#1E1B4B]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Tanggal</th>
                  <th className="px-4 py-3 font-semibold">Siswa / Kelas</th>
                  <th className="px-4 py-3 font-semibold">Aspek</th>
                  <th className="px-4 py-3 font-semibold">Capaian</th>
                  <th className="px-4 py-3 font-semibold">Catatan & Tindak Lanjut</th>
                  {canEdit && <th className="px-4 py-3 font-semibold text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {filtered.map((r) => (
                  <tr key={r.id_karakter} className="hover:bg-[#F5F3FF]/50 align-top">
                    <td className="px-4 py-3 font-mono text-xs tabular-nums whitespace-nowrap">
                      {r.tanggal}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-[#1E1B4B]">{r.nama_siswa}</div>
                      <div className="text-xs text-[#64748B]">{r.nama_kelas}</div>
                    </td>
                    <td className="px-4 py-3 font-medium">{r.aspek}</td>
                    <td className="px-4 py-3">
                      <StatusText status={r.nilai_perkembangan} />
                    </td>
                    <td className="px-4 py-3 text-xs text-[#64748B] max-w-xs">
                      <div className="text-[#1E1B4B]">{r.catatan}</div>
                      {r.tindak_lanjut && <div className="mt-0.5 text-[#6D28D9]">TL: {r.tindak_lanjut}</div>}
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditing(r);
                              setForm({ ...r });
                              setFormOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#6D28D9] hover:bg-[#EDE9FE] cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(r)}
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
        title={editing ? 'Edit Observasi Karakter' : 'Catat Observasi Karakter'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Tanggal</label>
              <input
                type="date"
                required
                value={form.tanggal || ''}
                onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Siswa *</label>
              <select
                required
                value={form.id_siswa || ''}
                onChange={(e) => setForm({ ...form, id_siswa: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
              >
                <option value="">-- Pilih Siswa --</option>
                {students.map((s) => (
                  <option key={s.id_siswa} value={s.id_siswa}>
                    {s.nama_lengkap} ({s.nama_kelas})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Aspek Karakter</label>
              <select
                value={form.aspek || 'Religius'}
                onChange={(e) => setForm({ ...form, aspek: e.target.value as CharacterAspect })}
                className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
              >
                {CHARACTER_ASPECTS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Tingkat Perkembangan</label>
              <select
                value={form.nilai_perkembangan || 'Berkembang Sesuai Harapan'}
                onChange={(e) =>
                  setForm({
                    ...form,
                    nilai_perkembangan: e.target.value as CharacterRecord['nilai_perkembangan'],
                  })
                }
                className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
              >
                <option value="Membudaya">Membudaya</option>
                <option value="Berkembang Sesuai Harapan">Berkembang Sesuai Harapan</option>
                <option value="Mulai Berkembang">Mulai Berkembang</option>
                <option value="Perlu Bimbingan">Perlu Bimbingan</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Catatan Perkembangan *</label>
            <textarea
              required
              rows={3}
              value={form.catatan || ''}
              onChange={(e) => setForm({ ...form, catatan: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Tindak Lanjut</label>
            <input
              type="text"
              value={form.tindak_lanjut || ''}
              onChange={(e) => setForm({ ...form, tindak_lanjut: e.target.value })}
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
          const res = await callApi('deleteCharacter', { id_karakter: deleteTarget.id_karakter });
          setSaving(false);
          if (res.success) {
            onToast('success', 'Catatan dihapus');
            setDeleteTarget(null);
            loadData();
          }
        }}
        loading={saving}
        title="Hapus Observasi Karakter"
        message="Hapus catatan perkembangan karakter ini?"
      />
    </div>
  );
}

// ============================================================================
// 2. KESEHATAN SISWA (TERBATAS PENGGUNA BERWENANG)
// ============================================================================

export function KesehatanModule({ user, onToast }: { user: AuthUser; onToast: ToastFn }) {
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<HealthRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HealthRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<HealthRecord>>({
    tanggal: new Date().toISOString().slice(0, 10),
  });

  const canEdit = user.role === 'ADMIN' || user.role === 'GURU';

  const loadData = async () => {
    setLoading(true);
    const [rRes, sRes] = await Promise.all([
      callApi<HealthRecord[]>('getHealthRecords'),
      callApi<Student[]>('getStudents'),
    ]);
    setLoading(false);
    if (rRes.success && rRes.data) setRecords(rRes.data);
    if (sRes.success && sRes.data) setStudents(sRes.data);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const stu = students.find((s) => s.id_siswa === form.id_siswa);
    const payload = {
      ...form,
      nama_siswa: stu?.nama_lengkap || '',
      id_kelas: stu?.id_kelas || '',
      nama_kelas: stu?.nama_kelas || '',
      pemeriksa: form.pemeriksa || user.nama_lengkap,
    };
    setSaving(true);
    const res = editing
      ? await callApi('updateHealthRecord', payload)
      : await callApi('createHealthRecord', payload);
    setSaving(false);
    if (res.success) {
      onToast('success', 'Data kesehatan disimpan');
      setFormOpen(false);
      loadData();
    } else {
      onToast('error', 'Gagal menyimpan', res.message);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Kesehatan Siswa (UKS)"
        description="Catatan pemeriksaan kesehatan bersifat terbatas dan hanya dapat diakses pengguna berwenang."
        actions={
          canEdit && (
            <PrimaryButton
              onClick={() => {
                setEditing(null);
                setForm({
                  tanggal: new Date().toISOString().slice(0, 10),
                  id_siswa: students[0]?.id_siswa || '',
                  keluhan: '',
                  hasil_pemeriksaan: '',
                  tindak_lanjut: '',
                  pemeriksa: user.nama_lengkap,
                });
                setFormOpen(true);
              }}
            >
              <Plus className="w-4 h-4" />
              Catat Pemeriksaan
            </PrimaryButton>
          )
        }
      />

      {loading ? (
        <TableSkeleton cols={5} rows={4} />
      ) : records.length === 0 ? (
        <EmptyState title="Belum ada catatan kesehatan siswa" />
      ) : (
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#EDE9FE] text-[#1E1B4B]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Tanggal</th>
                  <th className="px-4 py-3 font-semibold">Siswa / Kelas</th>
                  <th className="px-4 py-3 font-semibold">Keluhan</th>
                  <th className="px-4 py-3 font-semibold">Hasil Pemeriksaan</th>
                  <th className="px-4 py-3 font-semibold">Tindak Lanjut</th>
                  {canEdit && <th className="px-4 py-3 font-semibold text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {records.map((r) => (
                  <tr key={r.id_kesehatan} className="hover:bg-[#F5F3FF]/50 align-top">
                    <td className="px-4 py-3 font-mono text-xs tabular-nums whitespace-nowrap">
                      {r.tanggal}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-[#1E1B4B]">{r.nama_siswa}</div>
                      <div className="text-xs text-[#64748B]">{r.nama_kelas}</div>
                    </td>
                    <td className="px-4 py-3 text-xs">{r.keluhan}</td>
                    <td className="px-4 py-3 text-xs">{r.hasil_pemeriksaan}</td>
                    <td className="px-4 py-3 text-xs text-[#64748B]">
                      <div>{r.tindak_lanjut}</div>
                      <div className="text-[11px] mt-0.5">Pemeriksa: {r.pemeriksa}</div>
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditing(r);
                              setForm({ ...r });
                              setFormOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#6D28D9] hover:bg-[#EDE9FE] cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          {user.role === 'ADMIN' && (
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(r)}
                              className="p-1.5 rounded-lg text-[#64748B] hover:text-[#DC2626] hover:bg-red-50 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
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
        title={editing ? 'Edit Catatan Kesehatan' : 'Catat Pemeriksaan Kesehatan'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Tanggal</label>
              <input
                type="date"
                required
                value={form.tanggal || ''}
                onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Siswa *</label>
              <select
                required
                value={form.id_siswa || ''}
                onChange={(e) => setForm({ ...form, id_siswa: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
              >
                <option value="">-- Pilih Siswa --</option>
                {students.map((s) => (
                  <option key={s.id_siswa} value={s.id_siswa}>
                    {s.nama_lengkap} ({s.nama_kelas})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Keluhan *</label>
            <textarea
              required
              rows={2}
              value={form.keluhan || ''}
              onChange={(e) => setForm({ ...form, keluhan: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Hasil Pemeriksaan</label>
            <textarea
              rows={2}
              value={form.hasil_pemeriksaan || ''}
              onChange={(e) => setForm({ ...form, hasil_pemeriksaan: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Tindak Lanjut</label>
              <input
                type="text"
                value={form.tindak_lanjut || ''}
                onChange={(e) => setForm({ ...form, tindak_lanjut: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Pemeriksa / Petugas</label>
              <input
                type="text"
                value={form.pemeriksa || ''}
                onChange={(e) => setForm({ ...form, pemeriksa: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
              />
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
          const res = await callApi('deleteHealthRecord', { id_kesehatan: deleteTarget.id_kesehatan });
          setSaving(false);
          if (res.success) {
            onToast('success', 'Data kesehatan dihapus');
            setDeleteTarget(null);
            loadData();
          }
        }}
        loading={saving}
        title="Hapus Data Kesehatan"
        message="Hapus catatan kesehatan siswa ini?"
      />
    </div>
  );
}

// ============================================================================
// 3. BIMBINGAN DAN KONSELING
// ============================================================================

export function BimbinganModule({ user, onToast }: { user: AuthUser; onToast: ToastFn }) {
  const [records, setRecords] = useState<CounselingRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CounselingRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CounselingRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<CounselingRecord>>({
    tanggal: new Date().toISOString().slice(0, 10),
    status: 'Proses',
  });

  const canEdit = user.role === 'ADMIN' || user.role === 'GURU';

  const loadData = async () => {
    setLoading(true);
    const [rRes, sRes] = await Promise.all([
      callApi<CounselingRecord[]>('getCounselingRecords'),
      callApi<Student[]>('getStudents'),
    ]);
    setLoading(false);
    if (rRes.success && rRes.data) setRecords(rRes.data);
    if (sRes.success && sRes.data) setStudents(sRes.data);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const stu = students.find((s) => s.id_siswa === form.id_siswa);
    const payload = {
      ...form,
      nama_siswa: stu?.nama_lengkap || '',
      id_kelas: stu?.id_kelas || '',
      nama_kelas: stu?.nama_kelas || '',
      pembimbing: form.pembimbing || user.nama_lengkap,
    };
    setSaving(true);
    const res = editing
      ? await callApi('updateCounselingRecord', payload)
      : await callApi('createCounselingRecord', payload);
    setSaving(false);
    if (res.success) {
      onToast('success', 'Catatan bimbingan disimpan');
      setFormOpen(false);
      loadData();
    } else {
      onToast('error', 'Gagal menyimpan', res.message);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Bimbingan dan Konseling"
        description="Pendampingan dan catatan konseling siswa yang terjaga kerahasiaannya."
        actions={
          canEdit && (
            <PrimaryButton
              onClick={() => {
                setEditing(null);
                setForm({
                  tanggal: new Date().toISOString().slice(0, 10),
                  id_siswa: students[0]?.id_siswa || '',
                  jenis_permasalahan: '',
                  catatan_konsultasi: '',
                  tindak_lanjut: '',
                  pembimbing: user.nama_lengkap,
                  status: 'Proses',
                });
                setFormOpen(true);
              }}
            >
              <Plus className="w-4 h-4" />
              Catat Bimbingan
            </PrimaryButton>
          )
        }
      />

      {loading ? (
        <TableSkeleton cols={6} rows={4} />
      ) : records.length === 0 ? (
        <EmptyState title="Belum ada catatan bimbingan dan konseling" />
      ) : (
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#EDE9FE] text-[#1E1B4B]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Tanggal</th>
                  <th className="px-4 py-3 font-semibold">Siswa / Kelas</th>
                  <th className="px-4 py-3 font-semibold">Jenis Permasalahan</th>
                  <th className="px-4 py-3 font-semibold">Catatan & Tindak Lanjut</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  {canEdit && <th className="px-4 py-3 font-semibold text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {records.map((r) => (
                  <tr key={r.id_bimbingan} className="hover:bg-[#F5F3FF]/50 align-top">
                    <td className="px-4 py-3 font-mono text-xs tabular-nums whitespace-nowrap">
                      {r.tanggal}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-[#1E1B4B]">{r.nama_siswa}</div>
                      <div className="text-xs text-[#64748B]">{r.nama_kelas}</div>
                    </td>
                    <td className="px-4 py-3 font-medium">{r.jenis_permasalahan}</td>
                    <td className="px-4 py-3 text-xs text-[#64748B] max-w-xs">
                      <div className="text-[#1E1B4B]">{r.catatan_konsultasi}</div>
                      {r.tindak_lanjut && <div className="mt-0.5 text-[#6D28D9]">TL: {r.tindak_lanjut}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <StatusText status={r.status} />
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditing(r);
                              setForm({ ...r });
                              setFormOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#6D28D9] hover:bg-[#EDE9FE] cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          {user.role === 'ADMIN' && (
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(r)}
                              className="p-1.5 rounded-lg text-[#64748B] hover:text-[#DC2626] hover:bg-red-50 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
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
        title={editing ? 'Edit Catatan Bimbingan' : 'Catat Bimbingan Siswa'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Tanggal</label>
              <input
                type="date"
                required
                value={form.tanggal || ''}
                onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Siswa *</label>
              <select
                required
                value={form.id_siswa || ''}
                onChange={(e) => setForm({ ...form, id_siswa: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
              >
                <option value="">-- Pilih Siswa --</option>
                {students.map((s) => (
                  <option key={s.id_siswa} value={s.id_siswa}>
                    {s.nama_lengkap} ({s.nama_kelas})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Jenis Permasalahan *</label>
            <input
              type="text"
              required
              value={form.jenis_permasalahan || ''}
              onChange={(e) => setForm({ ...form, jenis_permasalahan: e.target.value })}
              placeholder="Contoh: Kesulitan belajar / Kedisiplinan / Sosial"
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Catatan Konsultasi *</label>
            <textarea
              required
              rows={3}
              value={form.catatan_konsultasi || ''}
              onChange={(e) => setForm({ ...form, catatan_konsultasi: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Tindak Lanjut</label>
              <input
                type="text"
                value={form.tindak_lanjut || ''}
                onChange={(e) => setForm({ ...form, tindak_lanjut: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Status</label>
              <select
                value={form.status || 'Proses'}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as CounselingRecord['status'] })
                }
                className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
              >
                <option value="Proses">Proses</option>
                <option value="Pantauan">Pantauan</option>
                <option value="Selesai">Selesai</option>
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
          const res = await callApi('deleteCounselingRecord', {
            id_bimbingan: deleteTarget.id_bimbingan,
          });
          setSaving(false);
          if (res.success) {
            onToast('success', 'Data bimbingan dihapus');
            setDeleteTarget(null);
            loadData();
          }
        }}
        loading={saving}
        title="Hapus Data Bimbingan"
        message="Hapus catatan bimbingan ini?"
      />
    </div>
  );
}

// ============================================================================
// 4. PRESTASI SISWA
// ============================================================================

export function PrestasiModule({
  user,
  school,
  onToast,
}: {
  user: AuthUser;
  school: SchoolIdentity;
  onToast: ToastFn;
}) {
  const [records, setRecords] = useState<AchievementRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AchievementRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AchievementRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<AchievementRecord>>({
    tanggal: new Date().toISOString().slice(0, 10),
    tingkat: 'Kecamatan',
  });

  const canEdit = user.role === 'ADMIN' || user.role === 'GURU';

  const loadData = async () => {
    setLoading(true);
    const [rRes, sRes] = await Promise.all([
      callApi<AchievementRecord[]>('getAchievements'),
      callApi<Student[]>('getStudents'),
    ]);
    setLoading(false);
    if (rRes.success && rRes.data) setRecords(rRes.data);
    if (sRes.success && sRes.data) setStudents(sRes.data);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const stu = students.find((s) => s.id_siswa === form.id_siswa);
    const payload = {
      ...form,
      nama_siswa: stu?.nama_lengkap || '',
      id_kelas: stu?.id_kelas || '',
      nama_kelas: stu?.nama_kelas || '',
    };
    setSaving(true);
    const res = editing
      ? await callApi('updateAchievement', payload)
      : await callApi('createAchievement', payload);
    setSaving(false);
    if (res.success) {
      onToast('success', 'Data prestasi disimpan');
      setFormOpen(false);
      loadData();
    } else {
      onToast('error', 'Gagal menyimpan', res.message);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={user.role === 'ORANG_TUA' ? 'Prestasi Anak' : 'Prestasi Siswa'}
        description="Pencatatan prestasi akademik maupun non-akademik tingkat sekolah hingga internasional."
        actions={
          <>
            <SecondaryButton
              disabled={records.length === 0}
              onClick={() =>
                generatePdfReport({
                  orientation: 'portrait',
                  title: 'DAFTAR PRESTASI PESERTA DIDIK',
                  school,
                  headers: ['No', 'Tanggal', 'Siswa', 'Kelas', 'Prestasi', 'Jenis Lomba', 'Tingkat', 'Peringkat'],
                  rows: records.map((r, i) => [
                    i + 1,
                    r.tanggal,
                    r.nama_siswa,
                    r.nama_kelas,
                    r.nama_prestasi,
                    r.jenis_lomba,
                    r.tingkat,
                    r.peringkat,
                  ]),
                  filename: `Daftar_Prestasi_${new Date().toISOString().slice(0, 10)}.pdf`,
                })
              }
            >
              <Printer className="w-4 h-4" />
              Cetak PDF
            </SecondaryButton>
            {canEdit && (
              <PrimaryButton
                onClick={() => {
                  setEditing(null);
                  setForm({
                    tanggal: new Date().toISOString().slice(0, 10),
                    id_siswa: students[0]?.id_siswa || '',
                    nama_prestasi: '',
                    jenis_lomba: '',
                    tingkat: 'Kecamatan',
                    peringkat: 'Juara 1',
                    dokumentasi_url: '',
                  });
                  setFormOpen(true);
                }}
              >
                <Plus className="w-4 h-4" />
                Tambah Prestasi
              </PrimaryButton>
            )}
          </>
        }
      />

      {loading ? (
        <TableSkeleton cols={6} rows={4} />
      ) : records.length === 0 ? (
        <EmptyState title="Belum ada data prestasi siswa" />
      ) : (
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#EDE9FE] text-[#1E1B4B]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Tanggal</th>
                  <th className="px-4 py-3 font-semibold">Siswa / Kelas</th>
                  <th className="px-4 py-3 font-semibold">Nama Prestasi</th>
                  <th className="px-4 py-3 font-semibold">Tingkat</th>
                  <th className="px-4 py-3 font-semibold">Peringkat</th>
                  {canEdit && <th className="px-4 py-3 font-semibold text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {records.map((r) => (
                  <tr key={r.id_prestasi} className="hover:bg-[#F5F3FF]/50">
                    <td className="px-4 py-3 font-mono text-xs tabular-nums whitespace-nowrap">
                      {r.tanggal}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-[#1E1B4B]">{r.nama_siswa}</div>
                      <div className="text-xs text-[#64748B]">{r.nama_kelas}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-[#1E1B4B]">{r.nama_prestasi}</div>
                      <div className="text-xs text-[#64748B]">{r.jenis_lomba}</div>
                    </td>
                    <td className="px-4 py-3">{r.tingkat}</td>
                    <td className="px-4 py-3 font-semibold text-[#6D28D9]">{r.peringkat}</td>
                    {canEdit && (
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditing(r);
                              setForm({ ...r });
                              setFormOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#6D28D9] hover:bg-[#EDE9FE] cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(r)}
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
        title={editing ? 'Edit Prestasi Siswa' : 'Tambah Prestasi Siswa'}
      >
        <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1">Tanggal</label>
            <input
              type="date"
              required
              value={form.tanggal || ''}
              onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Siswa *</label>
            <select
              required
              value={form.id_siswa || ''}
              onChange={(e) => setForm({ ...form, id_siswa: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
            >
              <option value="">-- Pilih Siswa --</option>
              {students.map((s) => (
                <option key={s.id_siswa} value={s.id_siswa}>
                  {s.nama_lengkap} ({s.nama_kelas})
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold mb-1">Nama Prestasi *</label>
            <input
              type="text"
              required
              value={form.nama_prestasi || ''}
              onChange={(e) => setForm({ ...form, nama_prestasi: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Jenis Lomba / Bidang</label>
            <input
              type="text"
              value={form.jenis_lomba || ''}
              onChange={(e) => setForm({ ...form, jenis_lomba: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Tingkat</label>
            <select
              value={form.tingkat || 'Kecamatan'}
              onChange={(e) =>
                setForm({ ...form, tingkat: e.target.value as AchievementRecord['tingkat'] })
              }
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
            >
              <option value="Sekolah">Sekolah</option>
              <option value="Kecamatan">Kecamatan</option>
              <option value="Kabupaten/Kota">Kabupaten/Kota</option>
              <option value="Provinsi">Provinsi</option>
              <option value="Nasional">Nasional</option>
              <option value="Internasional">Internasional</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Peringkat *</label>
            <input
              type="text"
              required
              value={form.peringkat || ''}
              onChange={(e) => setForm({ ...form, peringkat: e.target.value })}
              placeholder="Juara 1 / Harapan 1"
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">URL Dokumentasi (Opsional)</label>
            <input
              type="url"
              value={form.dokumentasi_url || ''}
              onChange={(e) => setForm({ ...form, dokumentasi_url: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
            />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-2 pt-2 border-t border-[#E5E7EB]">
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
          const res = await callApi('deleteAchievement', { id_prestasi: deleteTarget.id_prestasi });
          setSaving(false);
          if (res.success) {
            onToast('success', 'Prestasi dihapus');
            setDeleteTarget(null);
            loadData();
          }
        }}
        loading={saving}
        title="Hapus Prestasi"
        message={`Hapus prestasi "${deleteTarget?.nama_prestasi}"?`}
      />
    </div>
  );
}
