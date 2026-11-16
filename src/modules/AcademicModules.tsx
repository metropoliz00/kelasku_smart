import React, { useEffect, useMemo, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  CheckCircle2,
  Edit3,
  FileSpreadsheet,
  Plus,
  Printer,
  Save,
  Trash2,
  Upload,
} from 'lucide-react';
import { callApi } from '../services/api';
import {
  AcademicYear,
  AttendanceRecord,
  AttendanceStatus,
  AuthUser,
  ClassRoom,
  GradeRecord,
  ScheduleItem,
  SchoolIdentity,
  Student,
  Subject,
  Teacher,
  TeacherJournal,
} from '../types';
import {
  ConfirmDialog,
  EmptyState,
  ExcelImportModal,
  Modal,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  StatusText,
  TableSkeleton,
} from '../components/UI';
import { ExcelColumnSpec, exportRowsToExcel } from '../utils/excel';
import { generatePdfReport } from '../utils/pdf';
import {
  computeOverallGradeRecap,
  computeSubjectGradeStats,
  formatGradeDisplay,
  GRADE_FIELDS,
  GradeFieldKey,
  isGradeInputValid,
  parseValidGrade,
} from '../utils/gradeMath';

type ToastFn = (type: 'success' | 'error' | 'warning' | 'info', title: string, message?: string) => void;

// ============================================================================
// 1. JADWAL PELAJARAN
// ============================================================================

const DAYS: ScheduleItem['hari'][] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export function JadwalModule({
  user,
  school,
  onToast,
}: {
  user: AuthUser;
  school: SchoolIdentity;
  onToast: ToastFn;
}) {
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterClass, setFilterClass] = useState('');
  const [filterDay, setFilterDay] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ScheduleItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ScheduleItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<ScheduleItem>>({ hari: 'Senin', semester: 'Ganjil' });

  const canEdit = user.role === 'ADMIN';

  const loadData = async () => {
    setLoading(true);
    const [jRes, cRes, sRes, tRes, yRes] = await Promise.all([
      callApi<ScheduleItem[]>('getSchedules'),
      callApi<ClassRoom[]>('getClasses'),
      callApi<Subject[]>('getSubjects'),
      user.role !== 'ORANG_TUA' ? callApi<Teacher[]>('getTeachers') : Promise.resolve({ success: true, data: [] as Teacher[] }),
      callApi<AcademicYear[]>('getAcademicYears'),
    ]);
    setLoading(false);
    if (jRes.success && jRes.data) setSchedules(jRes.data);
    if (cRes.success && cRes.data) setClasses(cRes.data);
    if (sRes.success && sRes.data) setSubjects(sRes.data);
    if (tRes.success && tRes.data) setTeachers(tRes.data);
    if (yRes.success && yRes.data) setYears(yRes.data);
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = schedules.filter((j) => {
    if (filterClass && j.id_kelas !== filterClass) return false;
    if (filterDay && j.hari !== filterDay) return false;
    return true;
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cls = classes.find((c) => c.id_kelas === form.id_kelas);
    const sub = subjects.find((s) => s.id_mapel === form.id_mapel);
    const tch = teachers.find((t) => t.id_guru === form.id_guru);
    const payload = {
      ...form,
      nama_kelas: cls?.nama_kelas || form.nama_kelas || '',
      nama_mapel: sub?.nama_mapel || form.nama_mapel || '',
      nama_guru: tch?.nama_guru || form.nama_guru || '',
    };
    setSaving(true);
    const res = editing
      ? await callApi('updateSchedule', payload)
      : await callApi('createSchedule', payload);
    setSaving(false);
    if (res.success) {
      onToast('success', editing ? 'Jadwal diperbarui' : 'Jadwal ditambahkan');
      setFormOpen(false);
      loadData();
    } else {
      onToast('error', 'Gagal menyimpan', res.message);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Jadwal Pelajaran"
        description="Pengaturan jadwal mengajar mingguan per kelas, mata pelajaran, dan guru pengampu."
        actions={
          <>
            <SecondaryButton
              disabled={filtered.length === 0}
              onClick={() =>
                generatePdfReport({
                  orientation: 'portrait',
                  title: 'JADWAL PELAJARAN',
                  school,
                  headers: ['No', 'Hari', 'Jam Ke', 'Waktu', 'Kelas', 'Mata Pelajaran', 'Guru'],
                  rows: filtered.map((j, i) => [
                    i + 1,
                    j.hari,
                    j.jam_ke,
                    `${j.waktu_mulai} - ${j.waktu_selesai}`,
                    j.nama_kelas,
                    j.nama_mapel,
                    j.nama_guru,
                  ]),
                  filename: `Jadwal_Pelajaran_${new Date().toISOString().slice(0, 10)}.pdf`,
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
                    id_tahun_ajaran: school.tahun_ajaran_aktif_id || years[0]?.id_tahun_ajaran || '',
                    semester: school.semester_aktif || 'Ganjil',
                    hari: 'Senin',
                    jam_ke: '1',
                    waktu_mulai: '07:00',
                    waktu_selesai: '08:10',
                    id_kelas: classes[0]?.id_kelas || '',
                    id_mapel: subjects[0]?.id_mapel || '',
                    id_guru: teachers[0]?.id_guru || '',
                  });
                  setFormOpen(true);
                }}
              >
                <Plus className="w-4 h-4" />
                Tambah Jadwal
              </PrimaryButton>
            )}
          </>
        }
      />

      <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <select
          value={filterClass}
          onChange={(e) => setFilterClass(e.target.value)}
          className="px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
        >
          <option value="">Semua Kelas</option>
          {classes.map((c) => (
            <option key={c.id_kelas} value={c.id_kelas}>
              {c.nama_kelas}
            </option>
          ))}
        </select>
        <select
          value={filterDay}
          onChange={(e) => setFilterDay(e.target.value)}
          className="px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
        >
          <option value="">Semua Hari</option>
          {DAYS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <TableSkeleton cols={6} rows={4} />
      ) : filtered.length === 0 ? (
        <EmptyState title="Belum ada jadwal pelajaran" />
      ) : (
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#EDE9FE] text-[#1E1B4B]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Hari</th>
                  <th className="px-4 py-3 font-semibold">Jam / Waktu</th>
                  <th className="px-4 py-3 font-semibold">Kelas</th>
                  <th className="px-4 py-3 font-semibold">Mata Pelajaran</th>
                  <th className="px-4 py-3 font-semibold">Guru Pengampu</th>
                  {canEdit && <th className="px-4 py-3 font-semibold text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {filtered.map((j) => (
                  <tr key={j.id_jadwal} className="hover:bg-[#F5F3FF]/50">
                    <td className="px-4 py-3 font-semibold text-[#1E1B4B]">{j.hari}</td>
                    <td className="px-4 py-3 tabular-nums text-xs">
                      <div>Jam ke-{j.jam_ke}</div>
                      <div className="text-[#64748B]">
                        {j.waktu_mulai} – {j.waktu_selesai}
                      </div>
                    </td>
                    <td className="px-4 py-3">{j.nama_kelas}</td>
                    <td className="px-4 py-3 font-medium text-[#1E1B4B]">{j.nama_mapel}</td>
                    <td className="px-4 py-3 text-[#64748B]">{j.nama_guru}</td>
                    {canEdit && (
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditing(j);
                              setForm({ ...j });
                              setFormOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#6D28D9] hover:bg-[#EDE9FE] cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(j)}
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
        title={editing ? 'Edit Jadwal Pelajaran' : 'Tambah Jadwal Pelajaran'}
      >
        <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1">Hari</label>
            <select
              value={form.hari || 'Senin'}
              onChange={(e) => setForm({ ...form, hari: e.target.value as ScheduleItem['hari'] })}
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
            <label className="block text-xs font-semibold mb-1">Jam Ke</label>
            <input
              type="text"
              value={form.jam_ke || ''}
              onChange={(e) => setForm({ ...form, jam_ke: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Waktu Mulai</label>
            <input
              type="time"
              value={form.waktu_mulai || ''}
              onChange={(e) => setForm({ ...form, waktu_mulai: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Waktu Selesai</label>
            <input
              type="time"
              value={form.waktu_selesai || ''}
              onChange={(e) => setForm({ ...form, waktu_selesai: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Kelas</label>
            <select
              required
              value={form.id_kelas || ''}
              onChange={(e) => setForm({ ...form, id_kelas: e.target.value })}
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
            <label className="block text-xs font-semibold mb-1">Mata Pelajaran</label>
            <select
              required
              value={form.id_mapel || ''}
              onChange={(e) => setForm({ ...form, id_mapel: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
            >
              <option value="">-- Pilih Mapel --</option>
              {subjects.map((s) => (
                <option key={s.id_mapel} value={s.id_mapel}>
                  {s.nama_mapel}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold mb-1">Guru Pengampu</label>
            <select
              required
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
          <div className="sm:col-span-2 flex justify-end gap-2 pt-2 border-t border-[#E5E7EB]">
            <SecondaryButton onClick={() => setFormOpen(false)}>Batal</SecondaryButton>
            <PrimaryButton type="submit" loading={saving}>
              Simpan Jadwal
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
          const res = await callApi('deleteSchedule', { id_jadwal: deleteTarget.id_jadwal });
          setSaving(false);
          if (res.success) {
            onToast('success', 'Jadwal dihapus');
            setDeleteTarget(null);
            loadData();
          }
        }}
        loading={saving}
        title="Hapus Jadwal"
        message="Hapus entri jadwal pelajaran ini?"
      />
    </div>
  );
}

// ============================================================================
// 2. ABSENSI HARIAN SISWA
// ============================================================================

const ATTENDANCE_STATUSES: AttendanceStatus[] = ['Hadir', 'Sakit', 'Izin', 'Alpa', 'Terlambat'];

export function AbsensiModule({
  school,
  onToast,
}: {
  school: SchoolIdentity;
  onToast: ToastFn;
}) {
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [draft, setDraft] = useState<
    Record<string, { status: AttendanceStatus; keterangan: string; koreksi_catatan: string; existing?: AttendanceRecord }>
  >({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [cRes, sRes, aRes] = await Promise.all([
      callApi<ClassRoom[]>('getClasses'),
      callApi<Student[]>('getStudents'),
      callApi<AttendanceRecord[]>('getAttendance'),
    ]);
    setLoading(false);
    if (cRes.success && cRes.data) {
      setClasses(cRes.data);
      if (!selectedClass && cRes.data.length > 0) setSelectedClass(cRes.data[0].id_kelas);
    }
    if (sRes.success && sRes.data) setStudents(sRes.data);
    if (aRes.success && aRes.data) setAttendance(aRes.data);
  };

  useEffect(() => {
    loadData();
  }, []);

  const classStudents = useMemo(
    () => students.filter((s) => s.id_kelas === selectedClass && s.status_siswa === 'Aktif'),
    [students, selectedClass]
  );

  useEffect(() => {
    const nextDraft: typeof draft = {};
    for (const s of classStudents) {
      const existing = attendance.find(
        (a) => a.id_siswa === s.id_siswa && a.tanggal === selectedDate
      );
      nextDraft[s.id_siswa] = {
        status: existing ? existing.status : 'Hadir',
        keterangan: existing?.keterangan || '',
        koreksi_catatan: existing?.koreksi_catatan || '',
        existing,
      };
    }
    setDraft(nextDraft);
  }, [classStudents, attendance, selectedDate]);

  const handleSave = async () => {
    if (classStudents.length === 0) return;
    const cls = classes.find((c) => c.id_kelas === selectedClass);
    const records = classStudents.map((s) => {
      const entry = draft[s.id_siswa] || { status: 'Hadir', keterangan: '', koreksi_catatan: '' };
      return {
        tanggal: selectedDate,
        id_tahun_ajaran: school.tahun_ajaran_aktif_id || '',
        semester: school.semester_aktif || 'Ganjil',
        id_kelas: selectedClass,
        nama_kelas: cls?.nama_kelas || '',
        id_siswa: s.id_siswa,
        nama_siswa: s.nama_lengkap,
        status: entry.status,
        keterangan: entry.keterangan,
        koreksi_catatan: entry.koreksi_catatan,
      };
    });

    setSaving(true);
    const res = await callApi('saveAttendance', { records });
    setSaving(false);
    if (res.success) {
      onToast('success', 'Absensi disimpan', `${records.length} siswa tercatat untuk tanggal ${selectedDate}.`);
      loadData();
    } else {
      onToast('error', 'Gagal menyimpan absensi', res.message);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Absensi Siswa Harian"
        description="Input dan koreksi kehadiran harian per kelas. Duplikasi siswa pada tanggal yang sama dicegah otomatis dan perubahan tercatat sebagai koreksi."
        actions={
          <PrimaryButton onClick={handleSave} loading={saving} disabled={classStudents.length === 0}>
            <Save className="w-4 h-4" />
            Simpan Absensi
          </PrimaryButton>
        }
      />

      <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
        <div>
          <label className="block text-xs font-semibold text-[#1E1B4B] mb-1">Tanggal</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#1E1B4B] mb-1">Kelas</label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
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
        <div className="flex items-center gap-2">
          <SecondaryButton
            disabled={classStudents.length === 0}
            onClick={() => {
              const allPresent = { ...draft };
              classStudents.forEach((s) => {
                allPresent[s.id_siswa] = { ...allPresent[s.id_siswa], status: 'Hadir' };
              });
              setDraft(allPresent);
            }}
          >
            <CheckCircle2 className="w-4 h-4" />
            Tandai Semua Hadir
          </SecondaryButton>
        </div>
      </div>

      {loading ? (
        <TableSkeleton cols={5} rows={5} />
      ) : classStudents.length === 0 ? (
        <EmptyState
          title="Belum ada siswa aktif pada kelas ini"
          description="Pastikan data kelas dan siswa telah ditambahkan terlebih dahulu."
        />
      ) : (
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#EDE9FE] text-[#1E1B4B]">
                <tr>
                  <th className="px-4 py-3 font-semibold w-12">No</th>
                  <th className="px-4 py-3 font-semibold">NIS</th>
                  <th className="px-4 py-3 font-semibold">Nama Siswa</th>
                  <th className="px-4 py-3 font-semibold">Status Kehadiran</th>
                  <th className="px-4 py-3 font-semibold">Keterangan / Catatan Koreksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {classStudents.map((s, idx) => {
                  const row = draft[s.id_siswa] || { status: 'Hadir', keterangan: '', koreksi_catatan: '' };
                  return (
                    <tr key={s.id_siswa} className="hover:bg-[#F5F3FF]/50">
                      <td className="px-4 py-3 tabular-nums text-[#64748B]">{idx + 1}</td>
                      <td className="px-4 py-3 font-mono text-xs tabular-nums">{s.nis}</td>
                      <td className="px-4 py-3 font-medium text-[#1E1B4B]">
                        <div>{s.nama_lengkap}</div>
                        {row.existing && (
                          <div className="text-[11px] text-[#64748B]">
                            Sudah tercatat ({row.existing.status})
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {ATTENDANCE_STATUSES.map((st) => (
                            <button
                              key={st}
                              type="button"
                              onClick={() =>
                                setDraft((prev) => ({
                                  ...prev,
                                  [s.id_siswa]: { ...prev[s.id_siswa], status: st },
                                }))
                              }
                              className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition-colors cursor-pointer whitespace-nowrap ${
                                row.status === st
                                  ? 'bg-[#6D28D9] text-white border-[#6D28D9]'
                                  : 'bg-white text-[#64748B] border-[#E5E7EB] hover:border-[#6D28D9]'
                              }`}
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={row.keterangan}
                          onChange={(e) =>
                            setDraft((prev) => ({
                              ...prev,
                              [s.id_siswa]: { ...prev[s.id_siswa], keterangan: e.target.value },
                            }))
                          }
                          placeholder="Catatan opsional..."
                          className="w-full px-2.5 py-1.5 text-xs border border-[#E5E7EB] rounded-lg"
                        />
                        {row.koreksi_catatan && (
                          <div className="mt-1 text-[11px] text-[#B45309]">{row.koreksi_catatan}</div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 3. REKAP ABSENSI (MINGGUAN / BULANAN / SEMESTER)
// ============================================================================

export function RekapAbsensiModule({
  user,
  school,
}: {
  user: AuthUser;
  school: SchoolIdentity;
}) {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodMode, setPeriodMode] = useState<'mingguan' | 'bulanan' | 'semester'>('bulanan');
  const [filterClass, setFilterClass] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [aRes, sRes, cRes] = await Promise.all([
        callApi<AttendanceRecord[]>('getAttendance'),
        callApi<Student[]>('getStudents'),
        callApi<ClassRoom[]>('getClasses'),
      ]);
      setLoading(false);
      if (aRes.success && aRes.data) setAttendance(aRes.data);
      if (sRes.success && sRes.data) setStudents(sRes.data);
      if (cRes.success && cRes.data) setClasses(cRes.data);
    };
    load();
  }, []);

  const filteredAttendance = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10);
    return attendance.filter((a) => {
      if (filterClass && a.id_kelas !== filterClass) return false;
      if (periodMode === 'mingguan') return a.tanggal >= sevenDaysAgo;
      if (periodMode === 'bulanan') return a.tanggal.startsWith(selectedMonth);
      return true;
    });
  }, [attendance, filterClass, periodMode, selectedMonth]);

  const recapRows = useMemo(() => {
    const targetStudents = students.filter((s) => !filterClass || s.id_kelas === filterClass);
    return targetStudents.map((s) => {
      const logs = filteredAttendance.filter((a) => a.id_siswa === s.id_siswa);
      const count = (st: AttendanceStatus) => logs.filter((l) => l.status === st).length;
      const hadir = count('Hadir');
      const sakit = count('Sakit');
      const izin = count('Izin');
      const alpa = count('Alpa');
      const terlambat = count('Terlambat');
      const total = logs.length;
      const pct = total > 0 ? Math.round(((hadir + terlambat) / total) * 1000) / 10 : 0;
      return {
        id_siswa: s.id_siswa,
        nis: s.nis,
        nama_lengkap: s.nama_lengkap,
        nama_kelas: s.nama_kelas,
        hadir,
        sakit,
        izin,
        alpa,
        terlambat,
        total,
        pct,
      };
    });
  }, [students, filteredAttendance, filterClass]);

  return (
    <div className="space-y-5">
      <PageHeader
        title={user.role === 'ORANG_TUA' ? 'Kehadiran Anak' : 'Rekap Absensi Siswa'}
        description="Rekapitulasi kehadiran siswa per minggu, bulan, atau semester beserta persentase kehadiran."
        actions={
          <>
            <SecondaryButton
              disabled={recapRows.length === 0}
              onClick={() =>
                exportRowsToExcel(
                  `Rekap_Absensi_${periodMode}_${new Date().toISOString().slice(0, 10)}.xlsx`,
                  'Rekap Absensi',
                  ['No', 'NIS', 'Nama Siswa', 'Kelas', 'Hadir', 'Sakit', 'Izin', 'Alpa', 'Terlambat', 'Total Hari', 'Persentase (%)'],
                  recapRows.map((r, i) => [
                    i + 1,
                    r.nis,
                    r.nama_lengkap,
                    r.nama_kelas,
                    r.hadir,
                    r.sakit,
                    r.izin,
                    r.alpa,
                    r.terlambat,
                    r.total,
                    r.pct,
                  ])
                )
              }
            >
              <FileSpreadsheet className="w-4 h-4" />
              Export Excel
            </SecondaryButton>
            <SecondaryButton
              disabled={recapRows.length === 0}
              onClick={() =>
                generatePdfReport({
                  orientation: 'landscape',
                  title: 'REKAPITULASI KEHADIRAN SISWA',
                  school,
                  metaPairs: [
                    { label: 'Periode', value: periodMode.toUpperCase() },
                    { label: 'Tahun Ajaran', value: school.tahun_ajaran_aktif || '-' },
                    { label: 'Semester', value: school.semester_aktif },
                  ],
                  headers: ['No', 'NIS', 'Nama Siswa', 'Kelas', 'Hadir', 'Sakit', 'Izin', 'Alpa', 'Terlambat', 'Total', 'Kehadiran (%)'],
                  rows: recapRows.map((r, i) => [
                    i + 1,
                    r.nis,
                    r.nama_lengkap,
                    r.nama_kelas,
                    r.hadir,
                    r.sakit,
                    r.izin,
                    r.alpa,
                    r.terlambat,
                    r.total,
                    `${r.pct}%`,
                  ]),
                  filename: `Rekap_Absensi_${new Date().toISOString().slice(0, 10)}.pdf`,
                })
              }
            >
              <Printer className="w-4 h-4" />
              Cetak PDF
            </SecondaryButton>
          </>
        }
      />

      <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 p-1 bg-[#F5F3FF] rounded-lg">
          {(['mingguan', 'bulanan', 'semester'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setPeriodMode(m)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md capitalize cursor-pointer ${
                periodMode === m ? 'bg-white text-[#6D28D9] shadow-sm' : 'text-[#64748B]'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        {periodMode === 'bulanan' && (
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
          />
        )}
        {user.role !== 'ORANG_TUA' && (
          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className="px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
          >
            <option value="">Semua Kelas</option>
            {classes.map((c) => (
              <option key={c.id_kelas} value={c.id_kelas}>
                {c.nama_kelas}
              </option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <TableSkeleton cols={9} rows={5} />
      ) : recapRows.length === 0 ? (
        <EmptyState title="Belum ada data rekap absensi" />
      ) : (
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#EDE9FE] text-[#1E1B4B]">
                <tr>
                  <th className="px-4 py-3 font-semibold">No</th>
                  <th className="px-4 py-3 font-semibold">Nama Siswa</th>
                  <th className="px-4 py-3 font-semibold">Kelas</th>
                  <th className="px-4 py-3 font-semibold text-right">Hadir</th>
                  <th className="px-4 py-3 font-semibold text-right">Sakit</th>
                  <th className="px-4 py-3 font-semibold text-right">Izin</th>
                  <th className="px-4 py-3 font-semibold text-right">Alpa</th>
                  <th className="px-4 py-3 font-semibold text-right">Terlambat</th>
                  <th className="px-4 py-3 font-semibold text-right">Persentase</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {recapRows.map((r, i) => (
                  <tr key={r.id_siswa} className="hover:bg-[#F5F3FF]/50">
                    <td className="px-4 py-3 tabular-nums text-[#64748B]">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-[#1E1B4B]">{r.nama_lengkap}</td>
                    <td className="px-4 py-3">{r.nama_kelas || '-'}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-[#16A34A] font-semibold">{r.hadir}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{r.sakit}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{r.izin}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-[#DC2626] font-semibold">{r.alpa}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{r.terlambat}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums font-bold text-[#1E1B4B]">
                      {r.pct}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 4. INPUT NILAI SISWA (SUM 1, SUM 2, SUM 3, SUM 4, SAS)
// ============================================================================

const GRADE_EXCEL_COLS: ExcelColumnSpec[] = [
  { key: 'nis', header: 'NIS', required: true },
  { key: 'nama_siswa', header: 'Nama Siswa', required: true },
  { key: 'sum_1', header: 'SUM 1', type: 'number' },
  { key: 'sum_2', header: 'SUM 2', type: 'number' },
  { key: 'sum_3', header: 'SUM 3', type: 'number' },
  { key: 'sum_4', header: 'SUM 4', type: 'number' },
  { key: 'sas', header: 'SAS', type: 'number' },
  { key: 'catatan', header: 'Catatan' },
];

export function InputNilaiModule({
  user,
  school,
  onToast,
}: {
  user: AuthUser;
  school: SchoolIdentity;
  onToast: ToastFn;
}) {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<GradeRecord[]>([]);

  const [selectedYearId, setSelectedYearId] = useState(school.tahun_ajaran_aktif_id || '');
  const [selectedSemester, setSelectedSemester] = useState<'Ganjil' | 'Genap'>(
    school.semester_aktif || 'Ganjil'
  );
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState(user.relasi_id || '');

  const [draft, setDraft] = useState<
    Record<string, { sum_1: string; sum_2: string; sum_3: string; sum_4: string; sas: string; catatan: string }>
  >({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    const [yRes, cRes, mRes, tRes, sRes, gRes] = await Promise.all([
      callApi<AcademicYear[]>('getAcademicYears'),
      callApi<ClassRoom[]>('getClasses'),
      callApi<Subject[]>('getSubjects'),
      callApi<Teacher[]>('getTeachers'),
      callApi<Student[]>('getStudents'),
      callApi<GradeRecord[]>('getGrades'),
    ]);
    setLoading(false);
    if (yRes.success && yRes.data) {
      setYears(yRes.data);
      const active = yRes.data.find((y) => y.status === 'Aktif') || yRes.data[0];
      if (!selectedYearId && active) setSelectedYearId(active.id_tahun_ajaran);
    }
    if (cRes.success && cRes.data) {
      setClasses(cRes.data);
      if (!selectedClassId && cRes.data.length > 0) setSelectedClassId(cRes.data[0].id_kelas);
    }
    if (mRes.success && mRes.data) {
      setSubjects(mRes.data);
      if (!selectedSubjectId && mRes.data.length > 0) setSelectedSubjectId(mRes.data[0].id_mapel);
    }
    if (tRes.success && tRes.data) {
      setTeachers(tRes.data);
      if (!selectedTeacherId && tRes.data.length > 0) setSelectedTeacherId(tRes.data[0].id_guru);
    }
    if (sRes.success && sRes.data) setStudents(sRes.data);
    if (gRes.success && gRes.data) setGrades(gRes.data);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const classStudents = useMemo(
    () => students.filter((s) => s.id_kelas === selectedClassId && s.status_siswa === 'Aktif'),
    [students, selectedClassId]
  );

  useEffect(() => {
    const next: typeof draft = {};
    for (const s of classStudents) {
      const existing = grades.find(
        (g) =>
          g.id_siswa === s.id_siswa &&
          g.id_mapel === selectedSubjectId &&
          (!selectedYearId || g.id_tahun_ajaran === selectedYearId) &&
          g.semester === selectedSemester
      );
      next[s.id_siswa] = {
        sum_1: existing && existing.sum_1 !== '' && existing.sum_1 !== undefined ? String(existing.sum_1) : '',
        sum_2: existing && existing.sum_2 !== '' && existing.sum_2 !== undefined ? String(existing.sum_2) : '',
        sum_3: existing && existing.sum_3 !== '' && existing.sum_3 !== undefined ? String(existing.sum_3) : '',
        sum_4: existing && existing.sum_4 !== '' && existing.sum_4 !== undefined ? String(existing.sum_4) : '',
        sas: existing && existing.sas !== '' && existing.sas !== undefined ? String(existing.sas) : '',
        catatan: existing?.catatan || '',
      };
    }
    setDraft(next);
  }, [classStudents, grades, selectedSubjectId, selectedYearId, selectedSemester]);

  const handleSave = async () => {
    if (!selectedClassId || !selectedSubjectId) {
      onToast('warning', 'Pilih Kelas & Mata Pelajaran', 'Pastikan kelas dan mata pelajaran dipilih.');
      return;
    }

    for (const s of classStudents) {
      const row = draft[s.id_siswa];
      if (!row) continue;
      for (const f of GRADE_FIELDS) {
        if (!isGradeInputValid(row[f.key])) {
          onToast(
            'error',
            'Validasi Nilai Gagal',
            `Nilai ${f.label} untuk ${s.nama_lengkap} harus di antara 0 sampai 100.`
          );
          return;
        }
      }
    }

    const yr = years.find((y) => y.id_tahun_ajaran === selectedYearId);
    const cls = classes.find((c) => c.id_kelas === selectedClassId);
    const sub = subjects.find((m) => m.id_mapel === selectedSubjectId);
    const tch = teachers.find((t) => t.id_guru === selectedTeacherId);

    const records = classStudents.map((s) => {
      const row = draft[s.id_siswa] || { sum_1: '', sum_2: '', sum_3: '', sum_4: '', sas: '', catatan: '' };
      const stats = computeSubjectGradeStats(row);
      return {
        id_tahun_ajaran: selectedYearId,
        tahun_ajaran: yr?.nama_tahun_ajaran || school.tahun_ajaran_aktif || '',
        semester: selectedSemester,
        id_kelas: selectedClassId,
        nama_kelas: cls?.nama_kelas || '',
        id_mapel: selectedSubjectId,
        nama_mapel: sub?.nama_mapel || '',
        id_guru: selectedTeacherId,
        nama_guru: tch?.nama_guru || user.nama_lengkap,
        id_siswa: s.id_siswa,
        nama_siswa: s.nama_lengkap,
        sum_1: parseValidGrade(row.sum_1) ?? '',
        sum_2: parseValidGrade(row.sum_2) ?? '',
        sum_3: parseValidGrade(row.sum_3) ?? '',
        sum_4: parseValidGrade(row.sum_4) ?? '',
        sas: parseValidGrade(row.sas) ?? '',
        rata_rata: stats.rata_rata,
        jumlah_komponen: stats.jumlah_komponen,
        catatan: row.catatan,
      };
    });

    setSaving(true);
    const res = await callApi('saveGrades', { records });
    setSaving(false);
    if (res.success) {
      onToast('success', 'Nilai berhasil disimpan', `${records.length} data nilai siswa diperbarui.`);
      loadAll();
    } else {
      onToast('error', 'Gagal menyimpan nilai', res.message);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Input Nilai Siswa"
        description="Input nilai SUM 1, SUM 2, SUM 3, SUM 4, dan SAS (0–100). Nilai kosong tidak dihitung sebagai 0 dalam rata-rata."
        actions={
          <>
            <SecondaryButton onClick={() => setImportOpen(true)} disabled={classStudents.length === 0}>
              <Upload className="w-4 h-4" />
              Import Excel
            </SecondaryButton>
            <PrimaryButton onClick={handleSave} loading={saving} disabled={classStudents.length === 0}>
              <Save className="w-4 h-4" />
              Simpan Nilai
            </PrimaryButton>
          </>
        }
      />

      {/* Context Selector */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div>
          <label className="block text-xs font-semibold mb-1">Tahun Ajaran</label>
          <select
            value={selectedYearId}
            onChange={(e) => setSelectedYearId(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
          >
            <option value="">-- Tahun Ajaran --</option>
            {years.map((y) => (
              <option key={y.id_tahun_ajaran} value={y.id_tahun_ajaran}>
                {y.nama_tahun_ajaran}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1">Semester</label>
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value as 'Ganjil' | 'Genap')}
            className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
          >
            <option value="Ganjil">Ganjil</option>
            <option value="Genap">Genap</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1">Kelas</label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
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
          <label className="block text-xs font-semibold mb-1">Mata Pelajaran</label>
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
          >
            <option value="">-- Pilih Mapel --</option>
            {subjects
              .filter((m) => m.status_aktif === 'Aktif')
              .map((m) => (
                <option key={m.id_mapel} value={m.id_mapel}>
                  {m.nama_mapel}
                </option>
              ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1">Guru Pengampu</label>
          <select
            value={selectedTeacherId}
            onChange={(e) => setSelectedTeacherId(e.target.value)}
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
      </div>

      {loading ? (
        <TableSkeleton cols={8} rows={5} />
      ) : classStudents.length === 0 ? (
        <EmptyState
          title="Belum ada siswa pada kelas yang dipilih"
          description="Pilih kelas yang memiliki siswa aktif atau tambahkan siswa terlebih dahulu."
        />
      ) : (
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#EDE9FE] text-[#1E1B4B]">
                <tr>
                  <th className="px-3 py-3 font-semibold w-12">No</th>
                  <th className="px-3 py-3 font-semibold min-w-[180px]">Nama Siswa</th>
                  {GRADE_FIELDS.map((f) => (
                    <th key={f.key} className="px-2 py-3 font-semibold text-center w-24">
                      {f.label}
                    </th>
                  ))}
                  <th className="px-3 py-3 font-semibold text-center">Komponen Terisi</th>
                  <th className="px-3 py-3 font-semibold text-right">Rata-rata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {classStudents.map((s, idx) => {
                  const row = draft[s.id_siswa] || {
                    sum_1: '',
                    sum_2: '',
                    sum_3: '',
                    sum_4: '',
                    sas: '',
                    catatan: '',
                  };
                  const stats = computeSubjectGradeStats(row);
                  return (
                    <tr key={s.id_siswa} className="hover:bg-[#F5F3FF]/50">
                      <td className="px-3 py-2.5 tabular-nums text-[#64748B]">{idx + 1}</td>
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-[#1E1B4B]">{s.nama_lengkap}</div>
                        <div className="text-[11px] font-mono text-[#64748B]">{s.nis}</div>
                      </td>
                      {GRADE_FIELDS.map((f) => {
                        const valid = isGradeInputValid(row[f.key]);
                        return (
                          <td key={f.key} className="px-2 py-2.5">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step="0.01"
                              placeholder="-"
                              value={row[f.key]}
                              onChange={(e) =>
                                setDraft((prev) => ({
                                  ...prev,
                                  [s.id_siswa]: {
                                    ...prev[s.id_siswa],
                                    [f.key]: e.target.value,
                                  },
                                }))
                              }
                              className={`w-full px-2 py-1.5 text-center font-mono tabular-nums text-sm border rounded-lg focus:outline-none focus:ring-2 ${
                                valid
                                  ? 'border-[#E5E7EB] focus:ring-[#6D28D9]'
                                  : 'border-[#DC2626] bg-red-50 focus:ring-[#DC2626]'
                              }`}
                            />
                          </td>
                        );
                      })}
                      <td className="px-3 py-2.5 text-center font-mono tabular-nums text-xs text-[#64748B]">
                        {stats.jumlah_komponen} / 5
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums font-bold text-[#6D28D9]">
                        {stats.rata_rata !== null ? formatGradeDisplay(stats.rata_rata) : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ExcelImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import Nilai Mata Pelajaran dari Excel (.xlsx)"
        templateFilename={`Template_Nilai_${subjects.find((m) => m.id_mapel === selectedSubjectId)?.kode_mapel || 'MAPEL'}.xlsx`}
        sheetName="NILAI"
        columns={GRADE_EXCEL_COLS}
        onConfirmImport={async (rows) => {
          const updatedDraft = { ...draft };
          let matched = 0;
          for (const r of rows) {
            const stu = classStudents.find((s) => s.nis === r.nis);
            if (!stu) continue;
            updatedDraft[stu.id_siswa] = {
              sum_1: r.sum_1 || '',
              sum_2: r.sum_2 || '',
              sum_3: r.sum_3 || '',
              sum_4: r.sum_4 || '',
              sas: r.sas || '',
              catatan: r.catatan || '',
            };
            matched++;
          }
          setDraft(updatedDraft);
          onToast('info', 'Pratinjau Import Diterapkan', `${matched} baris nilai dimuat ke tabel. Klik "Simpan Nilai" untuk menyimpan ke database.`);
        }}
      />
    </div>
  );
}

// ============================================================================
// 5. REKAP NILAI (PER MAPEL, SELURUH MAPEL, GRAFIK, EXCEL & PDF)
// ============================================================================

export function RekapNilaiModule({
  user,
  school,
}: {
  user: AuthUser;
  school: SchoolIdentity;
}) {
  const [tab, setTab] = useState<'per-mapel' | 'semua-mapel' | 'grafik'>('per-mapel');
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<GradeRecord[]>([]);

  const [selectedYearId, setSelectedYearId] = useState(school.tahun_ajaran_aktif_id || '');
  const [selectedSemester, setSelectedSemester] = useState<'Ganjil' | 'Genap'>(
    school.semester_aktif || 'Ganjil'
  );
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [yRes, cRes, mRes, sRes, gRes] = await Promise.all([
        callApi<AcademicYear[]>('getAcademicYears'),
        callApi<ClassRoom[]>('getClasses'),
        callApi<Subject[]>('getSubjects'),
        callApi<Student[]>('getStudents'),
        callApi<GradeRecord[]>('getGradeRecap'),
      ]);
      setLoading(false);
      if (yRes.success && yRes.data) {
        setYears(yRes.data);
        const active = yRes.data.find((y) => y.status === 'Aktif') || yRes.data[0];
        if (!selectedYearId && active) setSelectedYearId(active.id_tahun_ajaran);
      }
      if (cRes.success && cRes.data) {
        setClasses(cRes.data);
        if (cRes.data.length > 0) setSelectedClassId(cRes.data[0].id_kelas);
      }
      if (mRes.success && mRes.data) {
        setSubjects(mRes.data);
        const activeSub = mRes.data.filter((m) => m.status_aktif === 'Aktif');
        if (activeSub.length > 0) setSelectedSubjectId(activeSub[0].id_mapel);
      }
      if (sRes.success && sRes.data) {
        setStudents(sRes.data);
        if (sRes.data.length > 0) setSelectedStudentId(sRes.data[0].id_siswa);
      }
      if (gRes.success && gRes.data) setGrades(gRes.data);
    };
    load();
  }, []);

  const activeSubjects = useMemo(
    () => subjects.filter((m) => m.status_aktif === 'Aktif'),
    [subjects]
  );

  const scopedStudents = useMemo(
    () =>
      students.filter((s) =>
        user.role === 'ORANG_TUA'
          ? true
          : !selectedClassId || s.id_kelas === selectedClassId
      ),
    [students, selectedClassId, user.role]
  );

  const scopedGrades = useMemo(
    () =>
      grades.filter(
        (g) =>
          (!selectedYearId || g.id_tahun_ajaran === selectedYearId) &&
          g.semester === selectedSemester
      ),
    [grades, selectedYearId, selectedSemester]
  );

  // Per-Mapel rows
  const perMapelRows = useMemo(() => {
    return scopedStudents.map((s) => {
      const rec = scopedGrades.find(
        (g) => g.id_siswa === s.id_siswa && g.id_mapel === selectedSubjectId
      );
      const stats = rec ? computeSubjectGradeStats(rec) : { rata_rata: null, jumlah_komponen: 0 };
      return {
        student: s,
        sum_1: formatGradeDisplay(rec?.sum_1),
        sum_2: formatGradeDisplay(rec?.sum_2),
        sum_3: formatGradeDisplay(rec?.sum_3),
        sum_4: formatGradeDisplay(rec?.sum_4),
        sas: formatGradeDisplay(rec?.sas),
        jumlah_komponen: stats.jumlah_komponen,
        rata_rata: stats.rata_rata,
      };
    });
  }, [scopedStudents, scopedGrades, selectedSubjectId]);

  const classSubjectAverage = useMemo(() => {
    const valid = perMapelRows.filter((r) => r.rata_rata !== null).map((r) => r.rata_rata as number);
    if (valid.length === 0) return null;
    return Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 100) / 100;
  }, [perMapelRows]);

  // All-Subjects Recap
  const enableRanking = school.peringkat_aktif === 'Ya';
  const overallRows = useMemo(
    () => computeOverallGradeRecap(scopedStudents, activeSubjects, scopedGrades, enableRanking),
    [scopedStudents, activeSubjects, scopedGrades, enableRanking]
  );

  const selectedClassObj = classes.find((c) => c.id_kelas === selectedClassId);
  const selectedSubjectObj = activeSubjects.find((m) => m.id_mapel === selectedSubjectId);
  const selectedYearObj = years.find((y) => y.id_tahun_ajaran === selectedYearId);

  const exportPerMapelExcel = () => {
    exportRowsToExcel(
      `Rekap_Nilai_${selectedSubjectObj?.kode_mapel || 'Mapel'}_${selectedClassObj?.nama_kelas || 'Kelas'}.xlsx`,
      'Rekap Nilai Mapel',
      ['No', 'NIS', 'Nama Siswa', 'SUM 1', 'SUM 2', 'SUM 3', 'SUM 4', 'SAS', 'Komponen Terisi', 'Rata-rata'],
      perMapelRows.map((r, i) => [
        i + 1,
        r.student.nis,
        r.student.nama_lengkap,
        r.sum_1,
        r.sum_2,
        r.sum_3,
        r.sum_4,
        r.sas,
        `${r.jumlah_komponen}/5`,
        r.rata_rata !== null ? formatGradeDisplay(r.rata_rata) : '-',
      ])
    );
  };

  const exportPerMapelPdf = () => {
    generatePdfReport({
      orientation: 'landscape',
      title: 'REKAPITULASI NILAI PER MATA PELAJARAN',
      school,
      metaPairs: [
        { label: 'Tahun Ajaran', value: selectedYearObj?.nama_tahun_ajaran || school.tahun_ajaran_aktif || '-' },
        { label: 'Semester', value: selectedSemester },
        { label: 'Kelas', value: selectedClassObj?.nama_kelas || '-' },
        { label: 'Mata Pelajaran', value: selectedSubjectObj?.nama_mapel || '-' },
      ],
      headers: ['No', 'NIS', 'Nama Siswa', 'SUM 1', 'SUM 2', 'SUM 3', 'SUM 4', 'SAS', 'Terisi', 'Rata-rata'],
      rows: perMapelRows.map((r, i) => [
        i + 1,
        r.student.nis,
        r.student.nama_lengkap,
        r.sum_1,
        r.sum_2,
        r.sum_3,
        r.sum_4,
        r.sas,
        `${r.jumlah_komponen}/5`,
        r.rata_rata !== null ? formatGradeDisplay(r.rata_rata) : '-',
      ]),
      waliKelasName: selectedClassObj?.wali_kelas || '______________________',
      filename: `Rekap_Nilai_${selectedSubjectObj?.kode_mapel || 'Mapel'}.pdf`,
    });
  };

  const exportAllSubjectsExcel = () => {
    const headers = [
      'No',
      'NIS',
      'Nama Siswa',
      ...activeSubjects.map((m) => m.nama_mapel),
      'Rata-rata Keseluruhan',
      ...(enableRanking ? ['Peringkat'] : []),
    ];
    const rows = overallRows.map((r, i) => [
      i + 1,
      r.nis,
      r.nama_lengkap,
      ...activeSubjects.map((m) =>
        r.subjectAverages[m.id_mapel] !== null && r.subjectAverages[m.id_mapel] !== undefined
          ? formatGradeDisplay(r.subjectAverages[m.id_mapel])
          : '-'
      ),
      r.overallAverage !== null ? formatGradeDisplay(r.overallAverage) : '-',
      ...(enableRanking ? [r.rank ?? '-'] : []),
    ]);
    exportRowsToExcel(
      `Rekap_Seluruh_Mapel_${selectedClassObj?.nama_kelas || 'Sekolah'}.xlsx`,
      'Rekap Seluruh Mapel',
      headers,
      rows
    );
  };

  const exportAllSubjectsPdf = () => {
    const headers = [
      'No',
      'Nama Siswa',
      ...activeSubjects.map((m) => m.kode_mapel || m.nama_mapel.slice(0, 8)),
      'Rata-rata',
      ...(enableRanking ? ['Rank'] : []),
    ];
    const rows = overallRows.map((r, i) => [
      i + 1,
      r.nama_lengkap,
      ...activeSubjects.map((m) =>
        r.subjectAverages[m.id_mapel] !== null && r.subjectAverages[m.id_mapel] !== undefined
          ? formatGradeDisplay(r.subjectAverages[m.id_mapel])
          : '-'
      ),
      r.overallAverage !== null ? formatGradeDisplay(r.overallAverage) : '-',
      ...(enableRanking ? [r.rank ?? '-'] : []),
    ]);
    generatePdfReport({
      orientation: 'landscape',
      title: 'REKAPITULASI NILAI SELURUH MATA PELAJARAN',
      school,
      metaPairs: [
        { label: 'Tahun Ajaran', value: selectedYearObj?.nama_tahun_ajaran || school.tahun_ajaran_aktif || '-' },
        { label: 'Semester', value: selectedSemester },
        { label: 'Kelas', value: selectedClassObj?.nama_kelas || 'Semua Kelas' },
      ],
      headers,
      rows,
      waliKelasName: selectedClassObj?.wali_kelas || '______________________',
      filename: `Rekap_Seluruh_Mapel_${new Date().toISOString().slice(0, 10)}.pdf`,
    });
  };

  const exportIndividualStudentPdf = () => {
    const target = students.find((s) => s.id_siswa === selectedStudentId) || scopedStudents[0];
    if (!target) return;
    const rows = activeSubjects.map((m, idx) => {
      const rec = scopedGrades.find(
        (g) => g.id_siswa === target.id_siswa && g.id_mapel === m.id_mapel
      );
      const stats = rec ? computeSubjectGradeStats(rec) : { rata_rata: null, jumlah_komponen: 0 };
      return [
        idx + 1,
        m.nama_mapel,
        formatGradeDisplay(rec?.sum_1),
        formatGradeDisplay(rec?.sum_2),
        formatGradeDisplay(rec?.sum_3),
        formatGradeDisplay(rec?.sum_4),
        formatGradeDisplay(rec?.sas),
        stats.rata_rata !== null ? formatGradeDisplay(stats.rata_rata) : '-',
      ];
    });
    generatePdfReport({
      orientation: 'portrait',
      title: 'LAPORAN HASIL BELAJAR SISWA',
      school,
      metaPairs: [
        { label: 'Nama Siswa', value: target.nama_lengkap },
        { label: 'NIS / NISN', value: `${target.nis} / ${target.nisn || '-'}` },
        { label: 'Kelas', value: target.nama_kelas || '-' },
        { label: 'Tahun Ajaran', value: `${selectedYearObj?.nama_tahun_ajaran || school.tahun_ajaran_aktif || '-'} (${selectedSemester})` },
      ],
      headers: ['No', 'Mata Pelajaran', 'SUM 1', 'SUM 2', 'SUM 3', 'SUM 4', 'SAS', 'Rata-rata'],
      rows,
      filename: `Laporan_Nilai_${target.nama_lengkap.replace(/\s+/g, '_')}.pdf`,
    });
  };

  const individualStudentChartData = useMemo(() => {
    const target = students.find((s) => s.id_siswa === selectedStudentId) || scopedStudents[0];
    if (!target) return [];
    return activeSubjects
      .map((m) => {
        const rec = scopedGrades.find(
          (g) => g.id_siswa === target.id_siswa && g.id_mapel === m.id_mapel
        );
        const stats = rec ? computeSubjectGradeStats(rec) : { rata_rata: null };
        return { label: m.nama_mapel, value: stats.rata_rata };
      })
      .filter((d) => d.value !== null);
  }, [students, scopedStudents, selectedStudentId, activeSubjects, scopedGrades]);

  return (
    <div className="space-y-5">
      <PageHeader
        title={user.role === 'ORANG_TUA' ? 'Nilai Akademik Anak' : 'Rekap & Laporan Nilai'}
        description="Rata-rata dihitung transparan hanya dari komponen nilai yang terisi (SUM 1–4 & SAS). Nilai kosong ditampilkan sebagai '-'."
        actions={
          tab === 'per-mapel' ? (
            <>
              <SecondaryButton onClick={exportPerMapelExcel} disabled={perMapelRows.length === 0}>
                <FileSpreadsheet className="w-4 h-4" />
                Export Excel
              </SecondaryButton>
              <PrimaryButton onClick={exportPerMapelPdf} disabled={perMapelRows.length === 0}>
                <Printer className="w-4 h-4" />
                PDF A4 Landscape
              </PrimaryButton>
            </>
          ) : tab === 'semua-mapel' ? (
            <>
              <SecondaryButton onClick={exportAllSubjectsExcel} disabled={overallRows.length === 0}>
                <FileSpreadsheet className="w-4 h-4" />
                Export Excel
              </SecondaryButton>
              <PrimaryButton onClick={exportAllSubjectsPdf} disabled={overallRows.length === 0}>
                <Printer className="w-4 h-4" />
                PDF A4 Landscape
              </PrimaryButton>
            </>
          ) : (
            <PrimaryButton onClick={exportIndividualStudentPdf} disabled={scopedStudents.length === 0}>
              <Printer className="w-4 h-4" />
              Cetak Rapor Siswa (PDF A4 Portrait)
            </PrimaryButton>
          )
        }
      />

      {/* Tabs + Filters */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-[#F5F3FF] rounded-lg w-fit">
          <button
            type="button"
            onClick={() => setTab('per-mapel')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md cursor-pointer ${
              tab === 'per-mapel' ? 'bg-white text-[#6D28D9] shadow-sm' : 'text-[#64748B]'
            }`}
          >
            Rekap Per Mata Pelajaran
          </button>
          <button
            type="button"
            onClick={() => setTab('semua-mapel')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md cursor-pointer ${
              tab === 'semua-mapel' ? 'bg-white text-[#6D28D9] shadow-sm' : 'text-[#64748B]'
            }`}
          >
            Rekap Seluruh Mata Pelajaran
          </button>
          <button
            type="button"
            onClick={() => setTab('grafik')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md cursor-pointer ${
              tab === 'grafik' ? 'bg-white text-[#6D28D9] shadow-sm' : 'text-[#64748B]'
            }`}
          >
            Laporan Per Siswa & Grafik
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <select
            value={selectedYearId}
            onChange={(e) => setSelectedYearId(e.target.value)}
            className="px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
          >
            <option value="">Semua Tahun Ajaran</option>
            {years.map((y) => (
              <option key={y.id_tahun_ajaran} value={y.id_tahun_ajaran}>
                {y.nama_tahun_ajaran}
              </option>
            ))}
          </select>
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value as 'Ganjil' | 'Genap')}
            className="px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
          >
            <option value="Ganjil">Semester Ganjil</option>
            <option value="Genap">Semester Genap</option>
          </select>
          {user.role !== 'ORANG_TUA' && (
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
            >
              <option value="">Semua Kelas</option>
              {classes.map((c) => (
                <option key={c.id_kelas} value={c.id_kelas}>
                  {c.nama_kelas}
                </option>
              ))}
            </select>
          )}
          {tab === 'per-mapel' && (
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
            >
              <option value="">-- Pilih Mata Pelajaran --</option>
              {activeSubjects.map((m) => (
                <option key={m.id_mapel} value={m.id_mapel}>
                  {m.nama_mapel}
                </option>
              ))}
            </select>
          )}
          {tab === 'grafik' && (
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
            >
              {scopedStudents.map((s) => (
                <option key={s.id_siswa} value={s.id_siswa}>
                  {s.nama_lengkap} ({s.nama_kelas})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {loading ? (
        <TableSkeleton cols={8} rows={5} />
      ) : tab === 'per-mapel' ? (
        perMapelRows.length === 0 ? (
          <EmptyState title="Belum ada data nilai pada filter ini" />
        ) : (
          <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E5E7EB] flex flex-wrap items-center justify-between gap-2 text-xs text-[#64748B]">
              <span>
                Mata Pelajaran: <strong className="text-[#1E1B4B]">{selectedSubjectObj?.nama_mapel || '-'}</strong>
              </span>
              <span className="tabular-nums">
                Rata-rata Kelas:{' '}
                <strong className="text-[#6D28D9]">
                  {classSubjectAverage !== null ? formatGradeDisplay(classSubjectAverage) : '-'}
                </strong>
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#EDE9FE] text-[#1E1B4B]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">No</th>
                    <th className="px-4 py-3 font-semibold">Nama Siswa</th>
                    <th className="px-3 py-3 font-semibold text-right">SUM 1</th>
                    <th className="px-3 py-3 font-semibold text-right">SUM 2</th>
                    <th className="px-3 py-3 font-semibold text-right">SUM 3</th>
                    <th className="px-3 py-3 font-semibold text-right">SUM 4</th>
                    <th className="px-3 py-3 font-semibold text-right">SAS</th>
                    <th className="px-3 py-3 font-semibold text-center">Terisi</th>
                    <th className="px-4 py-3 font-semibold text-right">Rata-rata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {perMapelRows.map((r, i) => (
                    <tr key={r.student.id_siswa} className="hover:bg-[#F5F3FF]/50">
                      <td className="px-4 py-3 tabular-nums text-[#64748B]">{i + 1}</td>
                      <td className="px-4 py-3 font-medium text-[#1E1B4B]">{r.student.nama_lengkap}</td>
                      <td className="px-3 py-3 text-right font-mono tabular-nums">{r.sum_1}</td>
                      <td className="px-3 py-3 text-right font-mono tabular-nums">{r.sum_2}</td>
                      <td className="px-3 py-3 text-right font-mono tabular-nums">{r.sum_3}</td>
                      <td className="px-3 py-3 text-right font-mono tabular-nums">{r.sum_4}</td>
                      <td className="px-3 py-3 text-right font-mono tabular-nums">{r.sas}</td>
                      <td className="px-3 py-3 text-center font-mono tabular-nums text-xs text-[#64748B]">
                        {r.jumlah_komponen}/5
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums font-bold text-[#6D28D9]">
                        {r.rata_rata !== null ? formatGradeDisplay(r.rata_rata) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : tab === 'semua-mapel' ? (
        overallRows.length === 0 || activeSubjects.length === 0 ? (
          <EmptyState
            title="Belum ada data rekap seluruh mata pelajaran"
            description="Pastikan mata pelajaran aktif dan data siswa tersedia."
          />
        ) : (
          <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#EDE9FE] text-[#1E1B4B]">
                  <tr>
                    <th className="px-3 py-3 font-semibold">No</th>
                    <th className="px-4 py-3 font-semibold min-w-[180px]">Nama Siswa</th>
                    {activeSubjects.map((m) => (
                      <th key={m.id_mapel} className="px-3 py-3 font-semibold text-right whitespace-nowrap">
                        {m.nama_mapel}
                      </th>
                    ))}
                    <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">
                      Rata-rata Keseluruhan
                    </th>
                    {enableRanking && (
                      <th className="px-3 py-3 font-semibold text-center">Peringkat</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {overallRows.map((r, idx) => (
                    <tr key={r.id_siswa} className="hover:bg-[#F5F3FF]/50">
                      <td className="px-3 py-3 tabular-nums text-[#64748B]">{idx + 1}</td>
                      <td className="px-4 py-3 font-medium text-[#1E1B4B] whitespace-nowrap">
                        {r.nama_lengkap}
                      </td>
                      {activeSubjects.map((m) => {
                        const val = r.subjectAverages[m.id_mapel];
                        return (
                          <td key={m.id_mapel} className="px-3 py-3 text-right font-mono tabular-nums">
                            {val !== null && val !== undefined ? formatGradeDisplay(val) : '-'}
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-right font-mono tabular-nums font-bold text-[#6D28D9]">
                        {r.overallAverage !== null ? formatGradeDisplay(r.overallAverage) : '-'}
                      </td>
                      {enableRanking && (
                        <td className="px-3 py-3 text-center font-mono tabular-nums font-bold text-[#1E1B4B]">
                          {r.rank ?? '-'}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
          <h3 className="text-base font-bold text-[#1E1B4B] mb-1">
            Grafik Capaian Nilai Per Mata Pelajaran
          </h3>
          <p className="text-xs text-[#64748B] mb-4">
            Menampilkan rata-rata nilai aktual per mata pelajaran untuk siswa terpilih.
          </p>
          {individualStudentChartData.length > 0 ? (
            <div className="h-72">
              <Bar
                data={{
                  labels: individualStudentChartData.map((d) => d.label),
                  datasets: [
                    {
                      label: 'Rata-rata Nilai',
                      data: individualStudentChartData.map((d) => d.value),
                      backgroundColor: '#6D28D9',
                      borderRadius: 6,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: { y: { min: 0, max: 100 } },
                }}
              />
            </div>
          ) : (
            <EmptyState title="Belum ada nilai tercatat untuk siswa ini" />
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 6. JURNAL GURU
// ============================================================================

export function JurnalModule({
  user,
  school,
  onToast,
}: {
  user: AuthUser;
  school: SchoolIdentity;
  onToast: ToastFn;
}) {
  const [journals, setJournals] = useState<TeacherJournal[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterClass, setFilterClass] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TeacherJournal | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TeacherJournal | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<TeacherJournal>>({
    tanggal: new Date().toISOString().slice(0, 10),
  });

  const canEdit = user.role === 'ADMIN' || user.role === 'GURU';

  const loadData = async () => {
    setLoading(true);
    const [jRes, cRes, mRes, tRes] = await Promise.all([
      callApi<TeacherJournal[]>('getJournals'),
      callApi<ClassRoom[]>('getClasses'),
      callApi<Subject[]>('getSubjects'),
      callApi<Teacher[]>('getTeachers'),
    ]);
    setLoading(false);
    if (jRes.success && jRes.data) setJournals(jRes.data);
    if (cRes.success && cRes.data) setClasses(cRes.data);
    if (mRes.success && mRes.data) setSubjects(mRes.data);
    if (tRes.success && tRes.data) setTeachers(tRes.data);
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = journals.filter((j) => {
    if (filterClass && j.id_kelas !== filterClass) return false;
    if (filterSubject && j.id_mapel !== filterSubject) return false;
    return true;
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cls = classes.find((c) => c.id_kelas === form.id_kelas);
    const sub = subjects.find((s) => s.id_mapel === form.id_mapel);
    const tch = teachers.find((t) => t.id_guru === form.id_guru);
    const payload = {
      ...form,
      nama_kelas: cls?.nama_kelas || '',
      nama_mapel: sub?.nama_mapel || '',
      nama_guru: tch?.nama_guru || user.nama_lengkap,
    };
    setSaving(true);
    const res = editing
      ? await callApi('updateJournal', payload)
      : await callApi('createJournal', payload);
    setSaving(false);
    if (res.success) {
      onToast('success', editing ? 'Jurnal diperbarui' : 'Jurnal ditambahkan');
      setFormOpen(false);
      loadData();
    } else {
      onToast('error', 'Gagal menyimpan', res.message);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Jurnal Mengajar Guru"
        description="Catatan materi, tujuan pembelajaran, aktivitas, metode, refleksi, dan tindak lanjut."
        actions={
          <>
            <SecondaryButton
              disabled={filtered.length === 0}
              onClick={() =>
                generatePdfReport({
                  orientation: 'landscape',
                  title: 'JURNAL KEGIATAN MENGAJAR GURU',
                  school,
                  headers: ['No', 'Tanggal', 'Guru', 'Kelas', 'Mapel', 'Materi', 'Metode', 'Refleksi', 'Tindak Lanjut'],
                  rows: filtered.map((j, i) => [
                    i + 1,
                    j.tanggal,
                    j.nama_guru,
                    j.nama_kelas,
                    j.nama_mapel,
                    j.materi,
                    j.metode,
                    j.refleksi,
                    j.tindak_lanjut,
                  ]),
                  filename: `Jurnal_Guru_${new Date().toISOString().slice(0, 10)}.pdf`,
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
                    id_guru: user.relasi_id || teachers[0]?.id_guru || '',
                    id_kelas: classes[0]?.id_kelas || '',
                    id_mapel: subjects[0]?.id_mapel || '',
                    materi: '',
                    tujuan_pembelajaran: '',
                    aktivitas: '',
                    metode: '',
                    refleksi: '',
                    tindak_lanjut: '',
                  });
                  setFormOpen(true);
                }}
              >
                <Plus className="w-4 h-4" />
                Tambah Jurnal
              </PrimaryButton>
            )}
          </>
        }
      />

      <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <select
          value={filterClass}
          onChange={(e) => setFilterClass(e.target.value)}
          className="px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
        >
          <option value="">Semua Kelas</option>
          {classes.map((c) => (
            <option key={c.id_kelas} value={c.id_kelas}>
              {c.nama_kelas}
            </option>
          ))}
        </select>
        <select
          value={filterSubject}
          onChange={(e) => setFilterSubject(e.target.value)}
          className="px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
        >
          <option value="">Semua Mata Pelajaran</option>
          {subjects.map((m) => (
            <option key={m.id_mapel} value={m.id_mapel}>
              {m.nama_mapel}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <TableSkeleton cols={6} rows={4} />
      ) : filtered.length === 0 ? (
        <EmptyState title="Belum ada catatan jurnal guru" />
      ) : (
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#EDE9FE] text-[#1E1B4B]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Tanggal</th>
                  <th className="px-4 py-3 font-semibold">Guru / Kelas</th>
                  <th className="px-4 py-3 font-semibold">Mata Pelajaran</th>
                  <th className="px-4 py-3 font-semibold">Materi & Tujuan</th>
                  <th className="px-4 py-3 font-semibold">Refleksi & Tindak Lanjut</th>
                  {canEdit && <th className="px-4 py-3 font-semibold text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {filtered.map((j) => (
                  <tr key={j.id_jurnal} className="hover:bg-[#F5F3FF]/50 align-top">
                    <td className="px-4 py-3 font-mono text-xs tabular-nums whitespace-nowrap">
                      {j.tanggal}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="font-semibold text-[#1E1B4B]">{j.nama_guru}</div>
                      <div className="text-[#64748B]">{j.nama_kelas}</div>
                    </td>
                    <td className="px-4 py-3 font-medium">{j.nama_mapel}</td>
                    <td className="px-4 py-3 text-xs max-w-xs">
                      <div className="font-semibold text-[#1E1B4B]">{j.materi}</div>
                      <div className="text-[#64748B] mt-0.5">{j.tujuan_pembelajaran}</div>
                    </td>
                    <td className="px-4 py-3 text-xs max-w-xs text-[#64748B]">
                      <div>{j.refleksi || '-'}</div>
                      {j.tindak_lanjut && <div className="text-[#6D28D9] mt-0.5">TL: {j.tindak_lanjut}</div>}
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditing(j);
                              setForm({ ...j });
                              setFormOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#6D28D9] hover:bg-[#EDE9FE] cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(j)}
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
        title={editing ? 'Edit Jurnal Guru' : 'Tambah Jurnal Guru'}
        maxWidth="max-w-2xl"
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
            <label className="block text-xs font-semibold mb-1">Guru</label>
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
            <label className="block text-xs font-semibold mb-1">Kelas</label>
            <select
              required
              value={form.id_kelas || ''}
              onChange={(e) => setForm({ ...form, id_kelas: e.target.value })}
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
            <label className="block text-xs font-semibold mb-1">Mata Pelajaran</label>
            <select
              required
              value={form.id_mapel || ''}
              onChange={(e) => setForm({ ...form, id_mapel: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
            >
              <option value="">-- Pilih Mapel --</option>
              {subjects.map((m) => (
                <option key={m.id_mapel} value={m.id_mapel}>
                  {m.nama_mapel}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold mb-1">Materi Pokok *</label>
            <input
              type="text"
              required
              value={form.materi || ''}
              onChange={(e) => setForm({ ...form, materi: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold mb-1">Tujuan Pembelajaran</label>
            <textarea
              rows={2}
              value={form.tujuan_pembelajaran || ''}
              onChange={(e) => setForm({ ...form, tujuan_pembelajaran: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Aktivitas Pembelajaran</label>
            <textarea
              rows={2}
              value={form.aktivitas || ''}
              onChange={(e) => setForm({ ...form, aktivitas: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Metode Pembelajaran</label>
            <textarea
              rows={2}
              value={form.metode || ''}
              onChange={(e) => setForm({ ...form, metode: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Refleksi</label>
            <textarea
              rows={2}
              value={form.refleksi || ''}
              onChange={(e) => setForm({ ...form, refleksi: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Tindak Lanjut</label>
            <textarea
              rows={2}
              value={form.tindak_lanjut || ''}
              onChange={(e) => setForm({ ...form, tindak_lanjut: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
            />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-2 pt-2 border-t border-[#E5E7EB]">
            <SecondaryButton onClick={() => setFormOpen(false)}>Batal</SecondaryButton>
            <PrimaryButton type="submit" loading={saving}>
              Simpan Jurnal
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
          const res = await callApi('deleteJournal', { id_jurnal: deleteTarget.id_jurnal });
          setSaving(false);
          if (res.success) {
            onToast('success', 'Jurnal dihapus');
            setDeleteTarget(null);
            loadData();
          }
        }}
        loading={saving}
        title="Hapus Jurnal"
        message="Hapus catatan jurnal mengajar ini?"
      />
    </div>
  );
}
