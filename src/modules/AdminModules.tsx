import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckCheck,
  CheckCircle2,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Clock,
  Edit3,
  ExternalLink,
  Filter,
  LayoutGrid,
  List,
  Plus,
  Printer,
  Search,
  Send,
  Sparkles,
  Square,
  Trash2,
  UserCheck,
  Users,
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
  SchoolIdentity,
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
import { generatePdfReport } from '../utils/pdf';

type ToastFn = (type: 'success' | 'error' | 'warning' | 'info', title: string, message?: string) => void;

const DAYS: PicketSchedule['hari'][] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

// ============================================================================
// 1. JADWAL PIKET KEBERSIHAN KELAS
// ============================================================================

const PRESET_CLEANING_TASKS = [
  'Menyapu Lantai Kelas & Teras Depan',
  'Mengepel Lantai Kelas',
  'Membersihkan Papan Tulis & Spidol',
  'Mengosongkan & Membuang Tempat Sampah',
  'Merapikan Meja & Kursi Siswa/Guru',
  'Membersihkan Kaca Jendela & Ventilasi',
  'Menyiram Tanaman & Teras Depan',
  'Merapikan Sudut Baca & Rak Buku',
  'Menata Alat Kebersihan di Sudut Kelas',
];

const PRESET_SHIFTS = [
  'Pagi (06.30 - 07.00 WIB)',
  'Jam Istirahat (10.00 - 10.20 WIB)',
  'Sore / Pulang Sekolah (13.30 - 14.00 WIB)',
  'Pagi & Sore (Sebelum & Sesudah KBM)',
];

export function PiketModule({
  user,
  school,
  onToast,
}: {
  user: AuthUser;
  school: SchoolIdentity;
  onToast: ToastFn;
}) {
  const [pickets, setPickets] = useState<PicketSchedule[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  const [viewMode, setViewMode] = useState<'board' | 'table'>('board');
  const [filterClass, setFilterClass] = useState('');
  const [filterDay, setFilterDay] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PicketSchedule | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PicketSchedule | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<PicketSchedule>>({
    hari: 'Senin',
    keterangan: PRESET_SHIFTS[0],
    tugas: 'Menyapu Lantai Kelas & Teras Depan, Membersihkan Papan Tulis & Spidol, Mengosongkan & Membuang Tempat Sampah, Merapikan Meja & Kursi Siswa/Guru',
  });

  // Interactive Weekly Cleaning Checklist state (persisted in database)
  const [activeChecklist, setActiveChecklist] = useState<PicketSchedule | null>(null);
  const [draftChecklist, setDraftChecklist] = useState<Record<string, boolean>>({});
  const [savingChecklist, setSavingChecklist] = useState(false);
  const [checklistSavedHint, setChecklistSavedHint] = useState<'idle' | 'saving' | 'saved'>('idle');
  const checklistSavingRef = React.useRef(false);
  const checklistQueuedRef = React.useRef<{ picket: PicketSchedule; map: Record<string, boolean> } | null>(null);

  const canEdit = user.role === 'ADMIN' || user.role === 'GURU';

  const loadData = async () => {
    setLoading(true);
    const [pRes, cRes, tRes, sRes] = await Promise.all([
      callApi<PicketSchedule[]>('getPickets'),
      callApi<ClassRoom[]>('getClasses'),
      callApi<Teacher[]>('getTeachers'),
      callApi<Student[]>('getStudents'),
    ]);
    setLoading(false);
    if (pRes.success && pRes.data) setPickets(pRes.data);
    if (cRes.success && cRes.data) setClasses(cRes.data);
    if (tRes.success && tRes.data) setTeachers(tRes.data);
    if (sRes.success && sRes.data) setStudents(sRes.data);
  };

  useEffect(() => {
    loadData();
  }, []);

  const parseStudents = (text?: string): string[] => {
    if (!text) return [];
    return text
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  };

  const parseStudentIds = (text?: string): string[] => {
    if (!text) return [];
    return Array.from(
      new Set(
        text
          .split(/[\n,]+/)
          .map((s) => s.trim())
          .filter(Boolean)
      )
    );
  };

  const parseTasks = (text?: string): string[] => {
    if (!text) return [];
    return text
      .split(/[\n,;]+/)
      .map((t) => t.trim())
      .filter(Boolean);
  };

  const parseChecklistMap = (raw?: unknown): Record<string, boolean> => {
    if (!raw) return {};
    if (typeof raw === 'object' && !Array.isArray(raw)) {
      const result: Record<string, boolean> = {};
      Object.entries(raw as Record<string, unknown>).forEach(([k, v]) => {
        if (v) result[k] = true;
      });
      return result;
    }
    const str = String(raw).trim();
    if (!str) return {};
    try {
      const parsed = JSON.parse(str);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const result: Record<string, boolean> = {};
        Object.entries(parsed as Record<string, unknown>).forEach(([k, v]) => {
          if (v) result[k] = true;
        });
        return result;
      }
    } catch {
      // ignore invalid JSON
    }
    return {};
  };

  const getLegacyLocalChecklist = (): Record<string, boolean> => {
    try {
      const saved = localStorage.getItem('piket_cleaning_checklist_v1');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  };

  const getPicketChecklistMap = (p: PicketSchedule): Record<string, boolean> => {
    const dbMap = parseChecklistMap(p.checklist_kebersihan);
    if (Object.keys(dbMap).length > 0) return dbMap;
    const legacy = getLegacyLocalChecklist();
    const taskList = parseTasks(p.tugas);
    const migrated: Record<string, boolean> = {};
    taskList.forEach((t) => {
      if (legacy[`${p.id_piket}_${t}`]) migrated[t] = true;
    });
    return migrated;
  };

  const persistChecklistToDb = async (picket: PicketSchedule, nextMap: Record<string, boolean>, showToastOnDone = false) => {
    if (!canEdit) return;
    if (checklistSavingRef.current) {
      checklistQueuedRef.current = { picket, map: nextMap };
      return;
    }
    checklistSavingRef.current = true;
    setSavingChecklist(true);
    setChecklistSavedHint('saving');

    let currentTarget: { picket: PicketSchedule; map: Record<string, boolean> } | null = { picket, map: nextMap };
    let lastSuccess = true;
    let lastError = '';

    while (currentTarget) {
      const { picket: targetPicket, map: targetMap } = currentTarget;
      checklistQueuedRef.current = null;
      const serialized = JSON.stringify(targetMap);
      const res = await callApi<PicketSchedule>('updatePicket', {
        ...targetPicket,
        checklist_kebersihan: serialized,
      });
      if (res.success) {
        const updatedRecord: PicketSchedule = res.data
          ? { ...targetPicket, ...res.data, checklist_kebersihan: res.data.checklist_kebersihan || serialized }
          : { ...targetPicket, checklist_kebersihan: serialized };
        setPickets((prev) =>
          prev.map((item) => (item.id_piket === updatedRecord.id_piket ? updatedRecord : item))
        );
        setActiveChecklist((prev) =>
          prev && prev.id_piket === updatedRecord.id_piket ? updatedRecord : prev
        );
      } else {
        lastSuccess = false;
        lastError = res.message || 'Gagal menyimpan checklist kebersihan.';
      }
      currentTarget = checklistQueuedRef.current;
    }

    checklistSavingRef.current = false;
    setSavingChecklist(false);
    if (lastSuccess) {
      setChecklistSavedHint('saved');
      if (showToastOnDone) {
        onToast('success', 'Checklist kebersihan disimpan ke database');
      }
    } else {
      setChecklistSavedHint('idle');
      onToast('error', 'Gagal menyimpan checklist', lastError);
    }
  };

  const openChecklistModal = (p: PicketSchedule) => {
    setActiveChecklist(p);
    setDraftChecklist(getPicketChecklistMap(p));
    setChecklistSavedHint('idle');
  };

  const toggleChecklistItem = (task: string) => {
    if (!activeChecklist) return;
    const next = { ...draftChecklist, [task]: !draftChecklist[task] };
    if (!next[task]) delete next[task];
    setDraftChecklist(next);
    if (canEdit) {
      void persistChecklistToDb(activeChecklist, next, false);
    }
  };

  const toggleFormTask = (taskTitle: string) => {
    const currentTasks = parseTasks(form.tugas);
    let nextTasks: string[];
    if (currentTasks.includes(taskTitle)) {
      nextTasks = currentTasks.filter((t) => t !== taskTitle);
    } else {
      nextTasks = [...currentTasks, taskTitle];
    }
    setForm({ ...form, tugas: nextTasks.join(', ') });
  };

  const normText = (val: unknown): string =>
    String(val ?? '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');

  const compactKey = (val: unknown): string =>
    normText(val)
      .replace(/^(kelas|rombel|kls)\s+/i, '')
      .replace(/[\s\-_]+/g, '');

  // Filter available students according to form.id_kelas or form.nama_kelas
  const classStudents = useMemo(() => {
    if (!form.id_kelas && !form.nama_kelas) return [];
    const targetClassId = String(form.id_kelas || '').trim();
    const targetClassName = normText(form.nama_kelas);
    const targetCompact = compactKey(form.nama_kelas || form.id_kelas);

    return students.filter((s) => {
      if (s.status_siswa === 'Lulus' || s.status_siswa === 'Pindah' || s.status_siswa === 'Nonaktif') return false;
      const sCid = String(s.id_kelas || '').trim();
      if (targetClassId && sCid && sCid === targetClassId) return true;
      const sName = normText(s.nama_kelas);
      if (targetClassName && sName && sName === targetClassName) return true;
      const sComp = compactKey(s.nama_kelas);
      if (targetCompact && sComp && sComp === targetCompact) return true;
      return false;
    });
  }, [students, form.id_kelas, form.nama_kelas]);

  const resolveStudentIdsFromNames = (names: string[], preferredPool: Student[] = classStudents): string[] => {
    const ids: string[] = [];
    const allPool = [...preferredPool, ...students];
    names.forEach((nm) => {
      const target = normText(nm);
      if (!target) return;
      const matched = allPool.find((s) => normText(s.nama_lengkap) === target);
      if (matched?.id_siswa && !ids.includes(matched.id_siswa)) {
        ids.push(matched.id_siswa);
      }
    });
    return ids;
  };

  const toggleFormStudent = (st: Student) => {
    const currentNames = parseStudents(form.petugas_siswa);
    const currentIds = parseStudentIds(form.id_siswa);
    const targetNameNorm = normText(st.nama_lengkap);
    const isAlreadySelected =
      currentIds.includes(st.id_siswa) ||
      currentNames.some((n) => normText(n) === targetNameNorm);

    let nextNames: string[];
    let nextIds: string[];

    if (isAlreadySelected) {
      nextNames = currentNames.filter((n) => normText(n) !== targetNameNorm);
      nextIds = currentIds.filter((id) => id !== st.id_siswa);
    } else {
      nextNames = [...currentNames, st.nama_lengkap];
      nextIds = currentIds.includes(st.id_siswa) ? currentIds : [...currentIds, st.id_siswa];
    }

    setForm({
      ...form,
      id_siswa: nextIds.join(', '),
      petugas_siswa: nextNames.join(', '),
    });
  };

  const handlePickRandomStudents = (count: number) => {
    if (classStudents.length === 0) return;
    const shuffled = [...classStudents].sort(() => 0.5 - Math.random());
    const picked = shuffled.slice(0, count);
    setForm({
      ...form,
      id_siswa: picked.map((s) => s.id_siswa).join(', '),
      petugas_siswa: picked.map((s) => s.nama_lengkap).join(', '),
    });
  };

  const openCreateModal = (dayName: PicketSchedule['hari'] = 'Senin', preferredClassId?: string) => {
    const defaultClassId = preferredClassId || filterClass || classes[0]?.id_kelas || '';
    const defaultCls = classes.find((c) => c.id_kelas === defaultClassId);
    const defaultTeacherId = defaultCls?.wali_kelas_id || teachers[0]?.id_guru || '';
    const defaultTch = teachers.find((t) => t.id_guru === defaultTeacherId);
    setEditing(null);
    setForm({
      hari: dayName,
      id_kelas: defaultClassId,
      nama_kelas: defaultCls?.nama_kelas || '',
      id_guru: defaultTeacherId,
      nama_guru: defaultTch?.nama_guru || '',
      id_siswa: '',
      petugas_siswa: '',
      tugas:
        'Menyapu Lantai Kelas & Teras Depan, Membersihkan Papan Tulis & Spidol, Mengosongkan & Membuang Tempat Sampah, Merapikan Meja & Kursi Siswa/Guru',
      checklist_kebersihan: '{}',
      keterangan: PRESET_SHIFTS[0],
    });
    setFormOpen(true);
  };

  const openEditModal = (p: PicketSchedule) => {
    const names = parseStudents(p.petugas_siswa);
    const existingIds = parseStudentIds(p.id_siswa);
    const matchedIds = existingIds.length > 0 ? existingIds : resolveStudentIdsFromNames(names, students);
    const checklistJson = JSON.stringify(getPicketChecklistMap(p));
    setEditing(p);
    setForm({
      ...p,
      id_siswa: matchedIds.join(', '),
      checklist_kebersihan: checklistJson,
    });
    setFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.id_kelas) {
      onToast('warning', 'Kelas wajib dipilih');
      return;
    }
    const cls = classes.find((c) => c.id_kelas === form.id_kelas);
    const tch = teachers.find((t) => t.id_guru === form.id_guru);
    const studentNames = parseStudents(form.petugas_siswa);
    const explicitIds = parseStudentIds(form.id_siswa);
    const matchedIdsFromNames = resolveStudentIdsFromNames(studentNames, classStudents);
    const combinedIds = Array.from(new Set([...explicitIds, ...matchedIdsFromNames]));

    const existingChecklist = parseChecklistMap(form.checklist_kebersihan ?? editing?.checklist_kebersihan);
    const payload = {
      ...form,
      id_kelas: cls?.id_kelas || form.id_kelas || '',
      nama_kelas: cls?.nama_kelas || form.nama_kelas || 'Umum / Sekolah',
      id_guru: tch?.id_guru || form.id_guru || '',
      nama_guru: tch?.nama_guru || form.nama_guru || '',
      id_siswa: combinedIds.join(', '),
      petugas_siswa: studentNames.join(', '),
      checklist_kebersihan: JSON.stringify(existingChecklist),
      keterangan: form.keterangan || PRESET_SHIFTS[0],
    };
    setSaving(true);
    const res =
      editing && editing.id_piket
        ? await callApi('updatePicket', payload)
        : await callApi('createPicket', payload);
    setSaving(false);
    if (res.success) {
      onToast('success', editing ? 'Jadwal piket diperbarui' : 'Jadwal piket disimpan');
      setFormOpen(false);
      loadData();
    } else {
      onToast('error', 'Gagal menyimpan', res.message);
    }
  };

  const filteredPickets = useMemo(() => {
    return pickets.filter((p) => {
      if (filterClass && p.id_kelas !== filterClass) return false;
      if (filterDay && p.hari !== filterDay) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchClass = (p.nama_kelas || '').toLowerCase().includes(q);
        const matchGuru = (p.nama_guru || '').toLowerCase().includes(q);
        const matchSiswa = (p.petugas_siswa || '').toLowerCase().includes(q);
        const matchTugas = (p.tugas || '').toLowerCase().includes(q);
        const matchKet = (p.keterangan || '').toLowerCase().includes(q);
        if (!matchClass && !matchGuru && !matchSiswa && !matchTugas && !matchKet) return false;
      }
      return true;
    });
  }, [pickets, filterClass, filterDay, searchQuery]);

  // Statistics calculation
  const totalOfficers = useMemo(() => {
    return pickets.reduce((acc, curr) => acc + parseStudents(curr.petugas_siswa).length, 0);
  }, [pickets]);

  const scheduledClassesCount = useMemo(() => {
    return new Set(pickets.map((p) => p.id_kelas || p.nama_kelas)).size;
  }, [pickets]);

  const activeDaysCount = useMemo(() => {
    return new Set(pickets.map((p) => p.hari)).size;
  }, [pickets]);

  const handlePrintPdf = () => {
    if (filteredPickets.length === 0) return;
    generatePdfReport({
      orientation: 'landscape',
      title: 'JADWAL PIKET KEBERSIHAN KELAS',
      school,
      headers: ['No', 'Hari', 'Kelas', 'Guru Pembina / Wali', 'Waktu Pelaksanaan', 'Petugas Siswa', 'Uraian Tugas Kebersihan'],
      rows: filteredPickets.map((p, i) => [
        i + 1,
        p.hari,
        p.nama_kelas,
        p.nama_guru || '-',
        p.keterangan || '-',
        p.petugas_siswa || '-',
        p.tugas || '-',
      ]),
      filename: `Jadwal_Piket_Kebersihan_${new Date().toISOString().slice(0, 10)}.pdf`,
    });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Jadwal Piket Kebersihan Kelas"
        description="Pengaturan regu piket harian siswa, daftar tugas mingguan, dan pemantauan kebersihan kelas."
        actions={
          <div className="flex items-center gap-2">
            <SecondaryButton
              disabled={filteredPickets.length === 0}
              onClick={handlePrintPdf}
            >
              <Printer className="w-4 h-4" />
              Cetak PDF
            </SecondaryButton>
            {canEdit && (
              <PrimaryButton onClick={() => openCreateModal('Senin')}>
                <Plus className="w-4 h-4" />
                Tambah Jadwal Piket
              </PrimaryButton>
            )}
          </div>
        }
      />

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-violet-50 text-violet-700 flex items-center justify-center shrink-0">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#1E1B4B] tabular-nums">{pickets.length}</div>
            <div className="text-xs text-[#64748B]">Total Regu Piket</div>
          </div>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#1E1B4B] tabular-nums">{totalOfficers}</div>
            <div className="text-xs text-[#64748B]">Petugas Siswa Terjadwal</div>
          </div>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#1E1B4B] tabular-nums">{scheduledClassesCount}</div>
            <div className="text-xs text-[#64748B]">Kelas Terjadwal</div>
          </div>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#1E1B4B] tabular-nums">{activeDaysCount} / 6</div>
            <div className="text-xs text-[#64748B]">Hari Aktif Mingguan</div>
          </div>
        </div>
      </div>

      {/* Filter & View Mode Controls Strip */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kelas, siswa, tugas, atau guru..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white focus:outline-none focus:border-[#6D28D9]"
            />
          </div>
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

        {/* View Switcher: Board vs Table */}
        <div className="flex items-center gap-1 p-1 bg-[#F1F5F9] rounded-lg shrink-0 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('board')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              viewMode === 'board'
                ? 'bg-white text-[#1E1B4B] shadow-xs'
                : 'text-[#64748B] hover:text-[#1E1B4B]'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Kolom Hari
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              viewMode === 'table'
                ? 'bg-white text-[#1E1B4B] shadow-xs'
                : 'text-[#64748B] hover:text-[#1E1B4B]'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            Tabel Rinci
          </button>
        </div>
      </div>

      {loading ? (
        <TableSkeleton cols={5} rows={4} />
      ) : filteredPickets.length === 0 ? (
        <EmptyState
          title="Belum ada jadwal piket kebersihan"
          description={
            searchQuery || filterClass || filterDay
              ? 'Tidak ada jadwal yang cocok dengan filter yang dipilih.'
              : 'Mulai buat jadwal piket mingguan untuk kelas dan siswa bertugas.'
          }
          action={
            canEdit ? (
              <PrimaryButton onClick={() => openCreateModal('Senin')}>
                <Plus className="w-4 h-4" />
                Tambah Jadwal Pertama
              </PrimaryButton>
            ) : undefined
          }
        />
      ) : viewMode === 'board' ? (
        /* ================= DAY COLUMNS / BOARD VIEW ================= */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-start">
          {DAYS.filter((d) => !filterDay || d === filterDay).map((dayName) => {
            const dayPickets = filteredPickets.filter((p) => p.hari === dayName);

            return (
              <div
                key={dayName}
                className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex flex-col min-h-[500px]"
              >
                {/* Column Day Header */}
                <div className="p-3 border-b border-[#E2E8F0] bg-white rounded-t-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-[#1E1B4B]">{dayName}</span>
                    <span className="text-xs text-[#64748B] tabular-nums">
                      {dayPickets.length} regu
                    </span>
                  </div>
                  {canEdit && (
                    <button
                      type="button"
                      title={`Tambah piket hari ${dayName}`}
                      onClick={() => openCreateModal(dayName)}
                      className="p-1 rounded-md text-[#6D28D9] hover:bg-[#EDE9FE] transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Column Cards Container */}
                <div className="p-2.5 space-y-3 flex-1 overflow-y-auto max-h-[700px]">
                  {dayPickets.length === 0 ? (
                    <div className="py-8 px-3 text-center border border-dashed border-[#CBD5E1] rounded-lg">
                      <p className="text-xs text-[#94A3B8]">Tidak ada jadwal</p>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => openCreateModal(dayName)}
                          className="mt-2 text-xs text-[#6D28D9] font-medium hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Tambah
                        </button>
                      )}
                    </div>
                  ) : (
                    dayPickets.map((p) => {
                      const studentList = parseStudents(p.petugas_siswa);
                      const taskList = parseTasks(p.tugas);
                      const checklistMap = getPicketChecklistMap(p);
                      const checkedCount = taskList.filter((t) => checklistMap[t]).length;
                      const isComplete = taskList.length > 0 && checkedCount === taskList.length;

                      return (
                        <div
                          key={p.id_piket}
                          className="bg-white border border-[#E5E7EB] hover:border-[#DDD6FE] rounded-lg p-3 shadow-2xs hover:shadow-sm transition-all space-y-2.5"
                        >
                          {/* Card Top: Class Name and Shift */}
                          <div className="flex items-start justify-between gap-1.5">
                            <div>
                              <div className="font-semibold text-sm text-[#1E1B4B]">
                                {p.nama_kelas}
                              </div>
                              <div className="text-[11px] text-[#64748B] flex items-center gap-1 mt-0.5">
                                <Clock className="w-3 h-3 text-[#94A3B8]" />
                                <span>{p.keterangan || 'Pagi & Sore'}</span>
                              </div>
                            </div>
                            {canEdit && (
                              <div className="inline-flex gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => openEditModal(p)}
                                  title="Edit Jadwal"
                                  className="p-1 rounded text-[#94A3B8] hover:text-[#6D28D9] hover:bg-[#EDE9FE] transition-colors cursor-pointer"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteTarget(p)}
                                  title="Hapus Jadwal"
                                  className="p-1 rounded text-[#94A3B8] hover:text-[#DC2626] hover:bg-red-50 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Supervisor Teacher */}
                          <div className="text-xs text-[#475569] flex items-center gap-1.5 pb-1 border-b border-[#F1F5F9]">
                            <UserCheck className="w-3.5 h-3.5 text-[#6D28D9] shrink-0" />
                            <span className="truncate">{p.nama_guru || 'Pembina: Guru Piket'}</span>
                          </div>

                          {/* Assigned Students */}
                          <div>
                            <div className="text-[11px] font-medium text-[#64748B] mb-1.5 flex items-center justify-between">
                              <span>Petugas Siswa</span>
                              <span className="tabular-nums font-semibold text-[#1E1B4B]">
                                {studentList.length} siswa
                              </span>
                            </div>
                            {studentList.length === 0 ? (
                              <p className="text-xs text-[#94A3B8] italic">Belum ada siswa bertugas</p>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {studentList.map((name, idx) => {
                                  const initials = name
                                    .split(' ')
                                    .map((w) => w[0])
                                    .join('')
                                    .slice(0, 2)
                                    .toUpperCase();
                                  return (
                                    <span
                                      key={idx}
                                      className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] text-[#1E1B4B]"
                                      title={name}
                                    >
                                      <span className="w-3.5 h-3.5 rounded-full bg-[#EDE9FE] text-[#6D28D9] text-[9px] font-bold flex items-center justify-center">
                                        {initials}
                                      </span>
                                      <span className="truncate max-w-[90px]">{name}</span>
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* Cleaning Duty Tasks */}
                          <div>
                            <div className="text-[11px] font-medium text-[#64748B] mb-1 flex items-center justify-between">
                              <span>Tugas Mingguan</span>
                              <span className="tabular-nums text-[10px] text-[#64748B]">
                                {taskList.length} tugas
                              </span>
                            </div>
                            {taskList.length === 0 ? (
                              <p className="text-xs text-[#94A3B8] italic">Belum ada tugas ditentukan</p>
                            ) : (
                              <ul className="space-y-1 text-xs text-[#334155]">
                                {taskList.slice(0, 4).map((task, idx) => (
                                  <li key={idx} className="flex items-start gap-1.5 text-[11px] leading-tight">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0 mt-0.5" />
                                    <span className="line-clamp-1">{task}</span>
                                  </li>
                                ))}
                                {taskList.length > 4 && (
                                  <li className="text-[10px] text-[#6D28D9] pl-4">
                                    +{taskList.length - 4} tugas lainnya...
                                  </li>
                                )}
                              </ul>
                            )}
                          </div>

                          {/* Quick Weekly Checklist Monitor Button */}
                          <div className="pt-2 border-t border-[#F1F5F9]">
                            <button
                              type="button"
                              onClick={() => openChecklistModal(p)}
                              className={`w-full py-1.5 px-2 text-xs font-medium rounded-md flex items-center justify-between transition-colors cursor-pointer ${
                                isComplete
                                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                  : checkedCount > 0
                                  ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                                  : 'bg-[#F8FAFC] text-[#475569] hover:bg-[#EDE9FE] hover:text-[#6D28D9] border border-[#E2E8F0]'
                              }`}
                            >
                              <span className="flex items-center gap-1.5">
                                <ClipboardCheck className="w-3.5 h-3.5" />
                                Pantau Checklist
                              </span>
                              <span className="tabular-nums font-semibold text-[11px]">
                                {checkedCount}/{taskList.length}
                              </span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ================= TABLE VIEW ================= */
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#EDE9FE] text-[#1E1B4B]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Hari</th>
                  <th className="px-4 py-3 font-semibold">Kelas</th>
                  <th className="px-4 py-3 font-semibold">Waktu / Shift</th>
                  <th className="px-4 py-3 font-semibold">Guru Pembina</th>
                  <th className="px-4 py-3 font-semibold">Petugas Siswa</th>
                  <th className="px-4 py-3 font-semibold">Daftar Tugas Kebersihan</th>
                  <th className="px-4 py-3 font-semibold text-center">Status Checklist</th>
                  {canEdit && <th className="px-4 py-3 font-semibold text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {filteredPickets.map((p) => {
                  const studentList = parseStudents(p.petugas_siswa);
                  const taskList = parseTasks(p.tugas);
                  const checklistMap = getPicketChecklistMap(p);
                  const checkedCount = taskList.filter((t) => checklistMap[t]).length;
                  const isComplete = taskList.length > 0 && checkedCount === taskList.length;

                  return (
                    <tr key={p.id_piket} className="hover:bg-[#F5F3FF]/50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-[#1E1B4B]">{p.hari}</td>
                      <td className="px-4 py-3 font-medium text-[#1E1B4B]">{p.nama_kelas}</td>
                      <td className="px-4 py-3 text-xs text-[#64748B]">{p.keterangan || 'Pagi & Sore'}</td>
                      <td className="px-4 py-3 text-xs">{p.nama_guru || '-'}</td>
                      <td className="px-4 py-3 text-xs">
                        {studentList.length === 0 ? (
                          <span className="text-[#94A3B8]">-</span>
                        ) : (
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {studentList.map((name, idx) => (
                              <span
                                key={idx}
                                className="inline-block px-1.5 py-0.5 text-[11px] bg-[#F1F5F9] text-[#334155] rounded"
                              >
                                {name}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-[#475569]">
                        {taskList.length === 0 ? (
                          <span className="text-[#94A3B8]">-</span>
                        ) : (
                          <ul className="space-y-0.5 max-w-sm">
                            {taskList.map((t, idx) => (
                              <li key={idx} className="flex items-center gap-1.5 text-[11px]">
                                <span className="w-1 h-1 rounded-full bg-[#6D28D9]"></span>
                                <span>{t}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => openChecklistModal(p)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                            isComplete
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : checkedCount > 0
                              ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          <ClipboardCheck className="w-3.5 h-3.5" />
                          <span className="tabular-nums">
                            {checkedCount}/{taskList.length} Selesai
                          </span>
                        </button>
                      </td>
                      {canEdit && (
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex gap-1">
                            <button
                              type="button"
                              onClick={() => openEditModal(p)}
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
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Interactive Weekly Cleaning Checklist Modal */}
      {activeChecklist && (
        <Modal
          open={!!activeChecklist}
          onClose={() => setActiveChecklist(null)}
          title={`Pantau Checklist Kebersihan - ${activeChecklist.nama_kelas} (${activeChecklist.hari})`}
        >
          {(() => {
            const currentTasks = parseTasks(activeChecklist.tugas);
            const currentStudents = parseStudents(activeChecklist.petugas_siswa);
            const completedCount = currentTasks.filter((t) => !!draftChecklist[t]).length;
            const percentage =
              currentTasks.length > 0 ? Math.round((completedCount / currentTasks.length) * 100) : 0;

            return (
              <div className="space-y-4">
                {/* Information Header */}
                <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[#64748B] block">Guru Pembina / Wali</span>
                    <span className="font-semibold text-[#1E1B4B]">
                      {activeChecklist.nama_guru || 'Guru Piket Harian'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#64748B] block">Waktu / Shift</span>
                    <span className="font-semibold text-[#1E1B4B]">
                      {activeChecklist.keterangan || 'Pagi & Sore KBM'}
                    </span>
                  </div>
                </div>

                {/* Assigned Students */}
                <div>
                  <label className="block text-xs font-semibold text-[#475569] mb-1.5">
                    Petugas Siswa Bertugas ({currentStudents.length})
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {currentStudents.length === 0 ? (
                      <span className="text-xs text-[#94A3B8] italic">Belum ada siswa bertugas</span>
                    ) : (
                      currentStudents.map((st, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#EDE9FE] text-[#1E1B4B] text-xs font-medium"
                        >
                          <UserCheck className="w-3.5 h-3.5 text-[#6D28D9]" />
                          {st}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#1E1B4B]">Progres Kebersihan Mingguan</span>
                    <span className="font-bold tabular-nums text-[#6D28D9]">
                      {percentage}% ({completedCount} dari {currentTasks.length} tugas)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${
                        percentage === 100
                          ? 'bg-emerald-500'
                          : percentage > 50
                          ? 'bg-[#6D28D9]'
                          : 'bg-amber-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>

                {/* Tasks Checklist */}
                <div className="space-y-2 pt-2 border-t border-[#E5E7EB]">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-[#475569]">
                      Daftar Tugas Kebersihan yang Harus Dijalankan:
                    </label>
                    {checklistSavedHint === 'saving' && (
                      <span className="text-[11px] text-[#6D28D9] font-medium">Menyimpan...</span>
                    )}
                    {checklistSavedHint === 'saved' && (
                      <span className="text-[11px] text-emerald-700 font-medium">Tersimpan di database</span>
                    )}
                  </div>
                  {currentTasks.length === 0 ? (
                    <p className="text-xs text-[#94A3B8] italic">Belum ada tugas yang dikonfigurasi.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
                      {currentTasks.map((task, idx) => {
                        const isDone = !!draftChecklist[task];
                        return (
                          <div
                            key={idx}
                            onClick={() => toggleChecklistItem(task)}
                            className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all ${
                              isDone
                                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                                : 'bg-white border-[#E5E7EB] hover:bg-[#F8FAFC] text-[#334155]'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 text-xs font-medium">
                              {isDone ? (
                                <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                              ) : (
                                <Square className="w-4 h-4 text-[#94A3B8] shrink-0" />
                              )}
                              <span className={isDone ? 'line-through text-emerald-800' : ''}>
                                {task}
                              </span>
                            </div>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                                isDone ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {isDone ? 'Selesai' : 'Belum'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Checklist Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-[#E5E7EB]">
                  <div className="flex gap-2">
                    {canEdit && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            const next: Record<string, boolean> = { ...draftChecklist };
                            currentTasks.forEach((t) => {
                              next[t] = true;
                            });
                            setDraftChecklist(next);
                            void persistChecklistToDb(activeChecklist, next, true);
                          }}
                          className="text-xs text-emerald-700 font-medium hover:underline cursor-pointer"
                        >
                          Tandai Semua Selesai
                        </button>
                        <span className="text-[#CBD5E1]">·</span>
                        <button
                          type="button"
                          onClick={() => {
                            const next: Record<string, boolean> = { ...draftChecklist };
                            currentTasks.forEach((t) => {
                              delete next[t];
                            });
                            setDraftChecklist(next);
                            void persistChecklistToDb(activeChecklist, next, true);
                          }}
                          className="text-xs text-[#64748B] hover:text-[#DC2626] font-medium hover:underline cursor-pointer"
                        >
                          Reset
                        </button>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <SecondaryButton onClick={() => setActiveChecklist(null)}>Tutup</SecondaryButton>
                    {canEdit && (
                      <PrimaryButton
                        loading={savingChecklist}
                        onClick={async () => {
                          await persistChecklistToDb(activeChecklist, draftChecklist, true);
                          setActiveChecklist(null);
                        }}
                      >
                        Simpan Checklist
                      </PrimaryButton>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}

      {/* Add / Edit Picket Schedule Modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit Jadwal Piket Kebersihan' : 'Tambah Jadwal Piket Kebersihan'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Hari Piket</label>
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
                required
                value={form.id_kelas || ''}
                onChange={(e) => {
                  const newClassId = e.target.value;
                  const cls = classes.find((c) => c.id_kelas === newClassId);
                  setForm({
                    ...form,
                    id_kelas: newClassId,
                    nama_kelas: cls ? cls.nama_kelas : '',
                    id_guru: cls?.wali_kelas_id || form.id_guru || '',
                    nama_guru: cls?.wali_kelas || form.nama_guru || '',
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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Guru Pembina / Wali Kelas</label>
              <select
                value={form.id_guru || ''}
                onChange={(e) => {
                  const tch = teachers.find((t) => t.id_guru === e.target.value);
                  setForm({
                    ...form,
                    id_guru: e.target.value,
                    nama_guru: tch?.nama_guru || '',
                  });
                }}
                className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
              >
                <option value="">-- Pilih Guru Pengawas --</option>
                {teachers.map((t) => (
                  <option key={t.id_guru} value={t.id_guru}>
                    {t.nama_guru}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Waktu / Shift Pelaksanaan</label>
              <input
                type="text"
                value={form.keterangan || ''}
                onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
                placeholder="Pagi / Sore / Istirahat..."
                className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
              />
              <div className="flex flex-wrap gap-1 mt-1">
                {PRESET_SHIFTS.map((shift, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setForm({ ...form, keterangan: shift })}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                  >
                    {shift.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Student Selection */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold">
                Daftar Petugas Siswa
                {parseStudents(form.petugas_siswa).length > 0 && (
                  <span className="text-[#6D28D9] font-normal ml-1">
                    ({parseStudents(form.petugas_siswa).length} terpilih)
                  </span>
                )}
              </label>
              {classStudents.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handlePickRandomStudents(4)}
                    className="text-[11px] text-[#6D28D9] font-medium hover:underline cursor-pointer"
                  >
                    Pilih 4 Acak
                  </button>
                  <span className="text-[#CBD5E1]">·</span>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, id_siswa: '', petugas_siswa: '' })}
                    className="text-[11px] text-[#64748B] hover:text-[#DC2626] font-medium hover:underline cursor-pointer"
                  >
                    Bersihkan
                  </button>
                </div>
              )}
            </div>

            {/* Student Chips from Class */}
            {classStudents.length > 0 && (
              <div className="p-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
                <div className="text-[10px] text-[#64748B] mb-1.5">
                  Klik nama siswa kelas untuk menambah/menghapus dari regu piket:
                </div>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                  {classStudents.map((st) => {
                    const selectedIds = parseStudentIds(form.id_siswa);
                    const selectedNames = parseStudents(form.petugas_siswa).map((n) => normText(n));
                    const isSelected =
                      selectedIds.includes(st.id_siswa) ||
                      selectedNames.includes(normText(st.nama_lengkap));
                    return (
                      <button
                        key={st.id_siswa}
                        type="button"
                        onClick={() => toggleFormStudent(st)}
                        className={`text-xs px-2 py-0.5 rounded-md border transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#6D28D9] text-white border-[#6D28D9]'
                            : 'bg-white text-[#334155] border-[#E2E8F0] hover:border-[#DDD6FE]'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {st.nama_lengkap}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <textarea
              rows={2}
              value={form.petugas_siswa || ''}
              onChange={(e) => {
                const val = e.target.value;
                const matchedIds = resolveStudentIdsFromNames(parseStudents(val), classStudents);
                setForm({
                  ...form,
                  petugas_siswa: val,
                  id_siswa: matchedIds.join(', '),
                });
              }}
              placeholder="Contoh: Ahmad Fauzan, Siti Nurhaliza, Budi Santoso, Rina Aulia"
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
            />
          </div>

          {/* Preset Cleaning Tasks */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold">
                Daftar Tugas Kebersihan Mingguan
              </label>
              <button
                type="button"
                onClick={() =>
                  setForm({
                    ...form,
                    tugas: PRESET_CLEANING_TASKS.slice(0, 5).join(', '),
                  })
                }
                className="text-[11px] text-[#6D28D9] font-medium hover:underline cursor-pointer"
              >
                Paket Standar
              </button>
            </div>

            <div className="p-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
              <div className="text-[10px] text-[#64748B] mb-1.5">
                Klik opsi tugas kebersihan di bawah untuk memasukkan ke dalam daftar tugas:
              </div>
              <div className="flex flex-wrap gap-1">
                {PRESET_CLEANING_TASKS.map((task, idx) => {
                  const isSelected = parseTasks(form.tugas).includes(task);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => toggleFormTask(task)}
                      className={`text-xs px-2 py-1 rounded-md border transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-[#334155] border-[#E2E8F0] hover:border-emerald-300'
                      }`}
                    >
                      {isSelected ? '✓ ' : '+ '}
                      {task}
                    </button>
                  );
                })}
              </div>
            </div>

            <textarea
              rows={2}
              value={form.tugas || ''}
              onChange={(e) => setForm({ ...form, tugas: e.target.value })}
              placeholder="Uraian tugas kebersihan mingguan..."
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#E5E7EB]">
            <SecondaryButton onClick={() => setFormOpen(false)}>Batal</SecondaryButton>
            <PrimaryButton type="submit" loading={saving}>
              Simpan Jadwal Piket
            </PrimaryButton>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
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
          } else {
            onToast('error', 'Gagal menghapus', res.message);
          }
        }}
        loading={saving}
        title="Hapus Jadwal Piket Kebersihan"
        message={`Apakah Anda yakin ingin menghapus jadwal piket hari ${deleteTarget?.hari} untuk ${deleteTarget?.nama_kelas}?`}
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
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [filterClass, setFilterClass] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LiaisonMessage | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [mRes, sRes, cRes] = await Promise.all([
      callApi<LiaisonMessage[]>('getLiaisonMessages'),
      callApi<Student[]>('getStudents'),
      callApi<ClassRoom[]>('getClasses'),
    ]);
    setLoading(false);
    if (mRes.success && mRes.data) setMessages(mRes.data);
    if (cRes.success && cRes.data) setClasses(cRes.data);
    if (sRes.success && sRes.data) {
      setStudents(sRes.data);
      if (
        !selectedStudentId &&
        (user.role === 'ORANG_TUA' || sRes.data.length === 1) &&
        sRes.data.length > 0
      ) {
        setSelectedStudentId(sRes.data[0].id_siswa);
      }
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const classFilteredStudents = useMemo(
    () => students.filter((s) => !filterClass || s.id_kelas === filterClass),
    [students, filterClass]
  );

  const scopedMessages = useMemo(
    () =>
      messages.filter(
        (m) =>
          (!filterClass || m.id_kelas === filterClass) &&
          (!selectedStudentId || m.id_siswa === selectedStudentId)
      ),
    [messages, filterClass, selectedStudentId]
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

      <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {user.role !== 'ORANG_TUA' && classes.length > 0 && (
          <div>
            <label className="block text-xs font-semibold text-[#1E1B4B] mb-1.5">
              Filter Kelas
            </label>
            <select
              value={filterClass}
              onChange={(e) => {
                const nextClass = e.target.value;
                setFilterClass(nextClass);
                if (
                  nextClass &&
                  selectedStudentId &&
                  !students.some((s) => s.id_siswa === selectedStudentId && s.id_kelas === nextClass)
                ) {
                  setSelectedStudentId('');
                }
              }}
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
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
        <div>
          <label className="block text-xs font-semibold text-[#1E1B4B] mb-1.5">
            Pilih Siswa
          </label>
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
          >
            {classFilteredStudents.length === 0 ? (
              <option value="">Belum ada data siswa</option>
            ) : (
              <>
                {user.role !== 'ORANG_TUA' && <option value="">Semua Siswa</option>}
                {classFilteredStudents.map((s) => (
                  <option key={s.id_siswa} value={s.id_siswa}>
                    {s.nama_lengkap} ({s.nama_kelas})
                  </option>
                ))}
              </>
            )}
          </select>
        </div>
      </div>

      {/* Message Form */}
      {user.role !== 'KEPALA_SEKOLAH' && (
        selectedStudentId ? (
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
        ) : (
          user.role !== 'ORANG_TUA' &&
          students.length > 0 && (
            <div className="bg-[#F5F3FF] border border-[#DDD6FE] rounded-xl px-4 py-3 text-xs text-[#5B21B6]">
              Menampilkan seluruh pesan buku penghubung. Pilih salah satu siswa di atas untuk mengirim pesan baru.
            </div>
          )
        )
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
