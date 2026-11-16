import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Edit3,
  ExternalLink,
  Plus,
  Send,
  Trash2,
} from 'lucide-react';
import { callApi } from '../services/api';
import {
  AgendaItem,
  AuthUser,
  ClassRoom,
  DocumentationItem,
  InventoryItem,
  LiaisonMessage,
  PicketSchedule,
  Student,
  Teacher,
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

type ToastFn = (type: 'success' | 'error' | 'warning' | 'info', title: string, message?: string) => void;

const DAYS: PicketSchedule['hari'][] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

// ============================================================================
// 1. JADWAL PIKET
// ============================================================================

export function PiketModule({ user, onToast }: { user: AuthUser; onToast: ToastFn }) {
  const [pickets, setPickets] = useState<PicketSchedule[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PicketSchedule | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PicketSchedule | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<PicketSchedule>>({ hari: 'Senin' });

  const canEdit = user.role === 'ADMIN' || user.role === 'GURU';

  const loadData = async () => {
    setLoading(true);
    const [pRes, cRes, tRes] = await Promise.all([
      callApi<PicketSchedule[]>('getPickets'),
      callApi<ClassRoom[]>('getClasses'),
      callApi<Teacher[]>('getTeachers'),
    ]);
    setLoading(false);
    if (pRes.success && pRes.data) setPickets(pRes.data);
    if (cRes.success && cRes.data) setClasses(cRes.data);
    if (tRes.success && tRes.data) setTeachers(tRes.data);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cls = classes.find((c) => c.id_kelas === form.id_kelas);
    const tch = teachers.find((t) => t.id_guru === form.id_guru);
    const payload = {
      ...form,
      nama_kelas: cls?.nama_kelas || 'Umum / Sekolah',
      nama_guru: tch?.nama_guru || '',
    };
    setSaving(true);
    const res = editing
      ? await callApi('updatePicket', payload)
      : await callApi('createPicket', payload);
    setSaving(false);
    if (res.success) {
      onToast('success', 'Jadwal piket disimpan');
      setFormOpen(false);
      loadData();
    } else {
      onToast('error', 'Gagal menyimpan', res.message);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Jadwal Piket Sekolah & Kelas"
        description="Pengaturan petugas piket harian guru dan siswa."
        actions={
          canEdit && (
            <PrimaryButton
              onClick={() => {
                setEditing(null);
                setForm({
                  hari: 'Senin',
                  id_kelas: classes[0]?.id_kelas || '',
                  id_guru: teachers[0]?.id_guru || '',
                  petugas_siswa: '',
                  tugas: '',
                  keterangan: '',
                });
                setFormOpen(true);
              }}
            >
              <Plus className="w-4 h-4" />
              Tambah Jadwal Piket
            </PrimaryButton>
          )
        }
      />

      {loading ? (
        <TableSkeleton cols={5} rows={4} />
      ) : pickets.length === 0 ? (
        <EmptyState title="Belum ada jadwal piket" />
      ) : (
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#EDE9FE] text-[#1E1B4B]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Hari</th>
                  <th className="px-4 py-3 font-semibold">Kelas</th>
                  <th className="px-4 py-3 font-semibold">Guru Pembina</th>
                  <th className="px-4 py-3 font-semibold">Petugas Siswa</th>
                  <th className="px-4 py-3 font-semibold">Tugas</th>
                  {canEdit && <th className="px-4 py-3 font-semibold text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {pickets.map((p) => (
                  <tr key={p.id_piket} className="hover:bg-[#F5F3FF]/50">
                    <td className="px-4 py-3 font-semibold text-[#1E1B4B]">{p.hari}</td>
                    <td className="px-4 py-3">{p.nama_kelas}</td>
                    <td className="px-4 py-3">{p.nama_guru || '-'}</td>
                    <td className="px-4 py-3 text-xs">{p.petugas_siswa || '-'}</td>
                    <td className="px-4 py-3 text-xs text-[#64748B]">{p.tugas || '-'}</td>
                    {canEdit && (
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditing(p);
                              setForm({ ...p });
                              setFormOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#6D28D9] hover:bg-[#EDE9FE] cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(p)}
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
        title={editing ? 'Edit Jadwal Piket' : 'Tambah Jadwal Piket'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Hari</label>
              <select
                value={form.hari || 'Senin'}
                onChange={(e) => setForm({ ...form, hari: e.target.value as PicketSchedule['hari'] })}
                className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
              >
                {DAYS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Kelas</label>
              <select
                value={form.id_kelas || ''}
                onChange={(e) => setForm({ ...form, id_kelas: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
              >
                <option value="">Umum / Sekolah</option>
                {classes.map((c) => (
                  <option key={c.id_kelas} value={c.id_kelas}>
                    {c.nama_kelas}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Guru Piket</label>
            <select
              value={form.id_guru || ''}
              onChange={(e) => setForm({ ...form, id_guru: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
            >
              <option value="">-- Pilih Guru --</option>
              {teachers.map((t) => (
                <option key={t.id_guru} value={t.id_guru}>
                  {t.nama_guru}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Daftar Petugas Siswa</label>
            <textarea
              rows={2}
              value={form.petugas_siswa || ''}
              onChange={(e) => setForm({ ...form, petugas_siswa: e.target.value })}
              placeholder="Nama siswa yang bertugas..."
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Uraian Tugas</label>
            <input
              type="text"
              value={form.tugas || ''}
              onChange={(e) => setForm({ ...form, tugas: e.target.value })}
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
          const res = await callApi('deletePicket', { id_piket: deleteTarget.id_piket });
          setSaving(false);
          if (res.success) {
            onToast('success', 'Jadwal piket dihapus');
            setDeleteTarget(null);
            loadData();
          }
        }}
        loading={saving}
        title="Hapus Jadwal Piket"
        message="Hapus jadwal piket ini?"
      />
    </div>
  );
}

// ============================================================================
// 2. AGENDA SEKOLAH (DENGAN KALENDER INTERAKTIF)
// ============================================================================

export function AgendaModule({ user, onToast }: { user: AuthUser; onToast: ToastFn }) {
  const [agendas, setAgendas] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDayStr, setSelectedDayStr] = useState<string>('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AgendaItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AgendaItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<AgendaItem>>({
    tanggal: new Date().toISOString().slice(0, 10),
    target_role: 'Semua',
  });

  const canEdit = user.role === 'ADMIN' || user.role === 'KEPALA_SEKOLAH' || user.role === 'GURU';
  const canDelete = user.role === 'ADMIN' || user.role === 'KEPALA_SEKOLAH';

  const loadData = async () => {
    setLoading(true);
    const res = await callApi<AgendaItem[]>('getAgendas');
    setLoading(false);
    if (res.success && res.data) setAgendas(res.data);
  };

  useEffect(() => {
    loadData();
  }, []);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay(); // 0 = Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: { day: number | null; dateStr: string }[] = [];
    for (let i = 0; i < firstDay; i++) cells.push({ day: null, dateStr: '' });
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${monthPrefix}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, dateStr });
    }
    return cells;
  }, [year, month, monthPrefix]);

  const displayedAgendas = selectedDayStr
    ? agendas.filter((a) => a.tanggal === selectedDayStr)
    : agendas;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama_kegiatan?.trim()) return;
    setSaving(true);
    const res = editing
      ? await callApi('updateAgenda', form)
      : await callApi('createAgenda', form);
    setSaving(false);
    if (res.success) {
      onToast('success', 'Agenda sekolah disimpan');
      setFormOpen(false);
      loadData();
    } else {
      onToast('error', 'Gagal menyimpan', res.message);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Agenda & Kalender Sekolah"
        description="Kalender interaktif agenda kegiatan sekolah, rapat, ujian, dan acara resmi."
        actions={
          canEdit && (
            <PrimaryButton
              onClick={() => {
                setEditing(null);
                setForm({
                  nama_kegiatan: '',
                  tanggal: selectedDayStr || new Date().toISOString().slice(0, 10),
                  waktu: '08:00',
                  tempat: '',
                  penanggung_jawab: user.nama_lengkap,
                  deskripsi: '',
                  dokumentasi_url: '',
                  target_role: 'Semua',
                  id_kelas: '',
                });
                setFormOpen(true);
              }}
            >
              <Plus className="w-4 h-4" />
              Tambah Agenda
            </PrimaryButton>
          )
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Interactive Calendar */}
        <div className="lg:col-span-5 bg-white border border-[#E5E7EB] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-[#1E1B4B] flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-[#6D28D9]" />
              {viewDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
            </h2>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setViewDate(new Date(year, month - 1, 1))}
                className="p-1.5 rounded-lg hover:bg-[#F5F3FF] text-[#1E1B4B] cursor-pointer"
                aria-label="Bulan sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewDate(new Date());
                  setSelectedDayStr('');
                }}
                className="px-2 py-1 text-xs font-medium text-[#6D28D9] hover:bg-[#F5F3FF] rounded-md cursor-pointer"
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setViewDate(new Date(year, month + 1, 1))}
                className="p-1.5 rounded-lg hover:bg-[#F5F3FF] text-[#1E1B4B] cursor-pointer"
                aria-label="Bulan berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-[#64748B] mb-2">
            {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((cell, i) => {
              if (!cell.day) return <div key={i} className="h-10" />;
              const count = agendas.filter((a) => a.tanggal === cell.dateStr).length;
              const isSelected = selectedDayStr === cell.dateStr;
              return (
                <button
                  key={cell.dateStr}
                  type="button"
                  onClick={() => setSelectedDayStr(isSelected ? '' : cell.dateStr)}
                  className={`h-10 rounded-lg flex flex-col items-center justify-center text-xs tabular-nums transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#6D28D9] text-white font-bold'
                      : count > 0
                      ? 'bg-[#EDE9FE] text-[#4C1D95] font-semibold hover:bg-[#6D28D9]/20'
                      : 'hover:bg-[#F5F3FF] text-[#1E1B4B]'
                  }`}
                >
                  <span>{cell.day}</span>
                  {count > 0 && (
                    <span className={`text-[9px] leading-none ${isSelected ? 'text-white/90' : 'text-[#6D28D9]'}`}>
                      {count} agd
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Agenda List */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#1E1B4B]">
              {selectedDayStr ? `Agenda Tanggal ${selectedDayStr}` : 'Semua Agenda Sekolah'}
            </h3>
            {selectedDayStr && (
              <button
                type="button"
                onClick={() => setSelectedDayStr('')}
                className="text-xs font-semibold text-[#6D28D9] hover:underline cursor-pointer"
              >
                Tampilkan Semua
              </button>
            )}
          </div>

          {loading ? (
            <TableSkeleton cols={3} rows={4} />
          ) : displayedAgendas.length === 0 ? (
            <EmptyState title="Belum ada agenda pada periode ini" />
          ) : (
            <div className="space-y-3">
              {displayedAgendas.map((ag) => (
                <div
                  key={ag.id_agenda}
                  className="bg-white border border-[#E5E7EB] rounded-xl p-4 flex items-start justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-mono tabular-nums text-[#6D28D9] font-semibold">
                      {ag.tanggal} {ag.waktu ? `· ${ag.waktu}` : ''} · Sasaran: {ag.target_role}
                    </div>
                    <h4 className="text-base font-bold text-[#1E1B4B] mt-1">{ag.nama_kegiatan}</h4>
                    <p className="text-xs text-[#64748B] mt-1">{ag.deskripsi || '-'}</p>
                    <div className="text-xs text-[#64748B] mt-2">
                      Tempat: <strong className="text-[#1E1B4B]">{ag.tempat || '-'}</strong> · PJ:{' '}
                      <strong className="text-[#1E1B4B]">{ag.penanggung_jawab || '-'}</strong>
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(ag);
                          setForm({ ...ag });
                          setFormOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-[#64748B] hover:text-[#6D28D9] hover:bg-[#EDE9FE] cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(ag)}
                          className="p-1.5 rounded-lg text-[#64748B] hover:text-[#DC2626] hover:bg-red-50 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit Agenda Sekolah' : 'Tambah Agenda Sekolah'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1">Nama Kegiatan *</label>
            <input
              type="text"
              required
              value={form.nama_kegiatan || ''}
              onChange={(e) => setForm({ ...form, nama_kegiatan: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Tanggal *</label>
              <input
                type="date"
                required
                value={form.tanggal || ''}
                onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Waktu</label>
              <input
                type="time"
                value={form.waktu || ''}
                onChange={(e) => setForm({ ...form, waktu: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Target Sasaran</label>
              <select
                value={form.target_role || 'Semua'}
                onChange={(e) =>
                  setForm({ ...form, target_role: e.target.value as AgendaItem['target_role'] })
                }
                className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
              >
                <option value="Semua">Semua</option>
                <option value="Guru">Guru</option>
                <option value="Orang Tua">Orang Tua</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Tempat</label>
              <input
                type="text"
                value={form.tempat || ''}
                onChange={(e) => setForm({ ...form, tempat: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Penanggung Jawab</label>
              <input
                type="text"
                value={form.penanggung_jawab || ''}
                onChange={(e) => setForm({ ...form, penanggung_jawab: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Deskripsi Kegiatan</label>
            <textarea
              rows={3}
              value={form.deskripsi || ''}
              onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E7EB]">
            <SecondaryButton onClick={() => setFormOpen(false)}>Batal</SecondaryButton>
            <PrimaryButton type="submit" loading={saving}>
              Simpan Agenda
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
          const res = await callApi('deleteAgenda', { id_agenda: deleteTarget.id_agenda });
          setSaving(false);
          if (res.success) {
            onToast('success', 'Agenda dihapus');
            setDeleteTarget(null);
            loadData();
          }
        }}
        loading={saving}
        title="Hapus Agenda"
        message={`Hapus agenda "${deleteTarget?.nama_kegiatan}"?`}
      />
    </div>
  );
}

// ============================================================================
// 3. BUKU PENGHUBUNG (KOMUNIKASI DUA ARAH GURU - ORANG TUA)
// ============================================================================

export function PenghubungModule({ user, onToast }: { user: AuthUser; onToast: ToastFn }) {
  const [messages, setMessages] = useState<LiaisonMessage[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LiaisonMessage | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [mRes, sRes] = await Promise.all([
      callApi<LiaisonMessage[]>('getLiaisonMessages'),
      callApi<Student[]>('getStudents'),
    ]);
    setLoading(false);
    if (mRes.success && mRes.data) setMessages(mRes.data);
    if (sRes.success && sRes.data) {
      setStudents(sRes.data);
      if (!selectedStudentId && sRes.data.length > 0) {
        setSelectedStudentId(sRes.data[0].id_siswa);
      }
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const scopedMessages = useMemo(
    () =>
      messages.filter((m) => !selectedStudentId || m.id_siswa === selectedStudentId),
    [messages, selectedStudentId]
  );

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !newMessage.trim()) return;
    const stu = students.find((s) => s.id_siswa === selectedStudentId);
    setSending(true);
    const res = await callApi('createLiaisonMessage', {
      tanggal: new Date().toISOString().slice(0, 10),
      id_siswa: selectedStudentId,
      nama_siswa: stu?.nama_lengkap || '',
      id_kelas: stu?.id_kelas || '',
      nama_kelas: stu?.nama_kelas || '',
      pesan: newMessage.trim(),
    });
    setSending(false);
    if (res.success) {
      setNewMessage('');
      onToast('success', 'Pesan terkirim');
      loadData();
    } else {
      onToast('error', 'Gagal mengirim pesan', res.message);
    }
  };

  const handleConfirm = async (msg: LiaisonMessage) => {
    const res = await callApi('confirmLiaisonMessage', {
      id_penghubung: msg.id_penghubung,
      status_baca: 'Dikonfirmasi',
      catatan_konfirmasi: `Dikonfirmasi oleh ${user.nama_lengkap}`,
    });
    if (res.success) {
      onToast('success', 'Pesan dikonfirmasi');
      loadData();
    } else {
      onToast('error', 'Gagal mengonfirmasi pesan', res.message);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Buku Penghubung Digital"
        description="Komunikasi dua arah antara guru dan orang tua siswa. Orang tua hanya melihat riwayat komunikasi anaknya sendiri."
      />

      <div className="bg-white border border-[#E5E7EB] rounded-xl p-4">
        <label className="block text-xs font-semibold text-[#1E1B4B] mb-1.5">
          Pilih Siswa
        </label>
        <select
          value={selectedStudentId}
          onChange={(e) => setSelectedStudentId(e.target.value)}
          className="w-full sm:w-80 px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
        >
          {students.length === 0 ? (
            <option value="">Belum ada data siswa</option>
          ) : (
            students.map((s) => (
              <option key={s.id_siswa} value={s.id_siswa}>
                {s.nama_lengkap} ({s.nama_kelas})
              </option>
            ))
          )}
        </select>
      </div>

      {/* Message Form */}
      {selectedStudentId && user.role !== 'KEPALA_SEKOLAH' && (
        <form
          onSubmit={handleSend}
          className="bg-white border border-[#E5E7EB] rounded-xl p-4 flex flex-col sm:flex-row gap-3"
        >
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Tulis pesan atau catatan komunikasi untuk buku penghubung..."
            className="flex-1 px-3.5 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
          />
          <PrimaryButton type="submit" loading={sending} disabled={!newMessage.trim()}>
            <Send className="w-4 h-4" />
            Kirim Pesan
          </PrimaryButton>
        </form>
      )}

      {loading ? (
        <TableSkeleton cols={4} rows={4} />
      ) : scopedMessages.length === 0 ? (
        <EmptyState title="Belum ada riwayat pesan buku penghubung" />
      ) : (
        <div className="space-y-3">
          {scopedMessages.map((msg) => (
            <div
              key={msg.id_penghubung}
              className="bg-white border border-[#E5E7EB] rounded-xl p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#64748B]">
                  <span className="font-semibold text-[#1E1B4B]">{msg.pengirim_nama}</span>
                  <span>({msg.pengirim_role})</span>
                  <span aria-hidden="true">·</span>
                  <span>Siswa: {msg.nama_siswa}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">{msg.tanggal}</span>
                </div>
                <p className="text-sm text-[#1E1B4B]">{msg.pesan}</p>
                {msg.catatan_konfirmasi && (
                  <p className="text-xs text-[#16A34A]">{msg.catatan_konfirmasi}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <StatusText status={msg.status_baca} />
                {msg.status_baca !== 'Dikonfirmasi' && msg.pengirim_id !== user.id_user && (
                  <SecondaryButton onClick={() => handleConfirm(msg)} className="py-1 px-2.5 text-xs">
                    <CheckCheck className="w-3.5 h-3.5" />
                    Konfirmasi
                  </SecondaryButton>
                )}
                {user.role === 'ADMIN' && (
                  <button
                    type="button"
                    title="Hapus Pesan"
                    onClick={() => setDeleteTarget(msg)}
                    className="p-1.5 rounded-lg text-[#64748B] hover:text-[#DC2626] hover:bg-red-50 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          setDeleting(true);
          const res = await callApi('deleteLiaisonMessage', {
            id_penghubung: deleteTarget.id_penghubung,
          });
          setDeleting(false);
          if (res.success) {
            onToast('success', 'Pesan dihapus');
            setDeleteTarget(null);
            loadData();
          } else {
            onToast('error', 'Gagal menghapus pesan', res.message);
          }
        }}
        loading={deleting}
        title="Hapus Pesan Buku Penghubung"
        message={`Hapus pesan dari "${deleteTarget?.pengirim_nama}" untuk siswa "${deleteTarget?.nama_siswa}"?`}
      />
    </div>
  );
}

// ============================================================================
// 4. INVENTARIS SEKOLAH
// ============================================================================

export function InventarisModule({ user, onToast }: { user: AuthUser; onToast: ToastFn }) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<InventoryItem>>({ kondisi: 'Baik', jumlah: 1 });

  const canEdit = user.role === 'ADMIN';

  const loadData = async () => {
    setLoading(true);
    const res = await callApi<InventoryItem[]>('getInventory');
    setLoading(false);
    if (res.success && res.data) setItems(res.data);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = editing
      ? await callApi('updateInventory', form)
      : await callApi('createInventory', form);
    setSaving(false);
    if (res.success) {
      onToast('success', 'Data inventaris disimpan');
      setFormOpen(false);
      loadData();
    } else {
      onToast('error', 'Gagal menyimpan', res.message);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Inventaris Sarana & Prasarana"
        description="Pencatatan aset, kode barang, lokasi, dan kondisi barang sekolah."
        actions={
          canEdit && (
            <PrimaryButton
              onClick={() => {
                setEditing(null);
                setForm({
                  kode_barang: '',
                  nama_barang: '',
                  kategori: 'Sarana Kelas',
                  jumlah: 1,
                  satuan: 'Unit',
                  kondisi: 'Baik',
                  lokasi: '',
                  tahun_perolehan: String(new Date().getFullYear()),
                  keterangan: '',
                });
                setFormOpen(true);
              }}
            >
              <Plus className="w-4 h-4" />
              Tambah Inventaris
            </PrimaryButton>
          )
        }
      />

      {loading ? (
        <TableSkeleton cols={6} rows={4} />
      ) : items.length === 0 ? (
        <EmptyState title="Belum ada data inventaris" />
      ) : (
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#EDE9FE] text-[#1E1B4B]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Kode</th>
                  <th className="px-4 py-3 font-semibold">Nama Barang</th>
                  <th className="px-4 py-3 font-semibold text-right">Jumlah</th>
                  <th className="px-4 py-3 font-semibold">Lokasi</th>
                  <th className="px-4 py-3 font-semibold">Kondisi</th>
                  {canEdit && <th className="px-4 py-3 font-semibold text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {items.map((item) => (
                  <tr key={item.id_inventaris} className="hover:bg-[#F5F3FF]/50">
                    <td className="px-4 py-3 font-mono text-xs">{item.kode_barang}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-[#1E1B4B]">{item.nama_barang}</div>
                      <div className="text-xs text-[#64748B]">{item.kategori}</div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {item.jumlah} {item.satuan}
                    </td>
                    <td className="px-4 py-3 text-xs">{item.lokasi || '-'}</td>
                    <td className="px-4 py-3">
                      <StatusText status={item.kondisi} />
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditing(item);
                              setForm({ ...item });
                              setFormOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#6D28D9] hover:bg-[#EDE9FE] cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(item)}
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
        title={editing ? 'Edit Barang Inventaris' : 'Tambah Barang Inventaris'}
      >
        <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1">Kode Barang *</label>
            <input
              type="text"
              required
              value={form.kode_barang || ''}
              onChange={(e) => setForm({ ...form, kode_barang: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Nama Barang *</label>
            <input
              type="text"
              required
              value={form.nama_barang || ''}
              onChange={(e) => setForm({ ...form, nama_barang: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Kategori</label>
            <input
              type="text"
              value={form.kategori || ''}
              onChange={(e) => setForm({ ...form, kategori: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Lokasi</label>
            <input
              type="text"
              value={form.lokasi || ''}
              onChange={(e) => setForm({ ...form, lokasi: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Jumlah</label>
            <input
              type="number"
              min={0}
              value={form.jumlah ?? 1}
              onChange={(e) => setForm({ ...form, jumlah: Number(e.target.value) })}
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Satuan</label>
            <input
              type="text"
              value={form.satuan || ''}
              onChange={(e) => setForm({ ...form, satuan: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Kondisi</label>
            <select
              value={form.kondisi || 'Baik'}
              onChange={(e) =>
                setForm({ ...form, kondisi: e.target.value as InventoryItem['kondisi'] })
              }
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
            >
              <option value="Baik">Baik</option>
              <option value="Rusak Ringan">Rusak Ringan</option>
              <option value="Rusak Berat">Rusak Berat</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Tahun Perolehan</label>
            <input
              type="text"
              value={form.tahun_perolehan || ''}
              onChange={(e) => setForm({ ...form, tahun_perolehan: e.target.value })}
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
          const res = await callApi('deleteInventory', { id_inventaris: deleteTarget.id_inventaris });
          setSaving(false);
          if (res.success) {
            onToast('success', 'Inventaris dihapus');
            setDeleteTarget(null);
            loadData();
          }
        }}
        loading={saving}
        title="Hapus Inventaris"
        message={`Hapus barang "${deleteTarget?.nama_barang}"?`}
      />
    </div>
  );
}

// ============================================================================
// 5. DOKUMENTASI SEKOLAH
// ============================================================================

export function DokumentasiModule({ user, onToast }: { user: AuthUser; onToast: ToastFn }) {
  const [docs, setDocs] = useState<DocumentationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DocumentationItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DocumentationItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<DocumentationItem>>({
    tanggal: new Date().toISOString().slice(0, 10),
    kategori: 'Kegiatan Sekolah',
  });

  const loadData = async () => {
    setLoading(true);
    const res = await callApi<DocumentationItem[]>('getDocumentation');
    setLoading(false);
    if (res.success && res.data) setDocs(res.data);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, pengunggah: form.pengunggah || user.nama_lengkap };
    setSaving(true);
    const res = editing
      ? await callApi('updateDocumentation', payload)
      : await callApi('createDocumentation', payload);
    setSaving(false);
    if (res.success) {
      onToast('success', 'Dokumentasi disimpan');
      setFormOpen(false);
      loadData();
    } else {
      onToast('error', 'Gagal menyimpan', res.message);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dokumentasi & Arsip Sekolah"
        description="Pengelolaan tautan berkas, foto kegiatan, SK, dan arsip administrasi sekolah."
        actions={
          <PrimaryButton
            onClick={() => {
              setEditing(null);
              setForm({
                judul: '',
                kategori: 'Kegiatan Sekolah',
                tanggal: new Date().toISOString().slice(0, 10),
                deskripsi: '',
                tautan_file: '',
                pengunggah: user.nama_lengkap,
              });
              setFormOpen(true);
            }}
          >
            <Plus className="w-4 h-4" />
            Tambah Dokumentasi
          </PrimaryButton>
        }
      />

      {loading ? (
        <TableSkeleton cols={5} rows={4} />
      ) : docs.length === 0 ? (
        <EmptyState title="Belum ada dokumentasi tersimpan" />
      ) : (
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#EDE9FE] text-[#1E1B4B]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Tanggal</th>
                  <th className="px-4 py-3 font-semibold">Judul Dokumentasi</th>
                  <th className="px-4 py-3 font-semibold">Kategori</th>
                  <th className="px-4 py-3 font-semibold">Pengunggah</th>
                  <th className="px-4 py-3 font-semibold">Tautan</th>
                  <th className="px-4 py-3 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {docs.map((d) => (
                  <tr key={d.id_dokumentasi} className="hover:bg-[#F5F3FF]/50">
                    <td className="px-4 py-3 font-mono text-xs tabular-nums">{d.tanggal}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-[#1E1B4B]">{d.judul}</div>
                      <div className="text-xs text-[#64748B]">{d.deskripsi}</div>
                    </td>
                    <td className="px-4 py-3 text-xs">{d.kategori}</td>
                    <td className="px-4 py-3 text-xs">{d.pengunggah}</td>
                    <td className="px-4 py-3">
                      {d.tautan_file ? (
                        <a
                          href={d.tautan_file}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#6D28D9] hover:underline"
                        >
                          Buka <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(d);
                            setForm({ ...d });
                            setFormOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-[#64748B] hover:text-[#6D28D9] hover:bg-[#EDE9FE] cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {user.role === 'ADMIN' && (
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(d)}
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

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit Dokumentasi' : 'Tambah Dokumentasi'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1">Judul *</label>
            <input
              type="text"
              required
              value={form.judul || ''}
              onChange={(e) => setForm({ ...form, judul: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Kategori</label>
              <input
                type="text"
                value={form.kategori || ''}
                onChange={(e) => setForm({ ...form, kategori: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Tanggal</label>
              <input
                type="date"
                value={form.tanggal || ''}
                onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Tautan Berkas / Google Drive</label>
            <input
              type="url"
              value={form.tautan_file || ''}
              onChange={(e) => setForm({ ...form, tautan_file: e.target.value })}
              placeholder="https://drive.google.com/..."
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Deskripsi</label>
            <textarea
              rows={2}
              value={form.deskripsi || ''}
              onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
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
          const res = await callApi('deleteDocumentation', {
            id_dokumentasi: deleteTarget.id_dokumentasi,
          });
          setSaving(false);
          if (res.success) {
            onToast('success', 'Dokumentasi dihapus');
            setDeleteTarget(null);
            loadData();
          }
        }}
        loading={saving}
        title="Hapus Dokumentasi"
        message={`Hapus dokumentasi "${deleteTarget?.judul}"?`}
      />
    </div>
  );
}
