import React, { useEffect, useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  Users,
  GraduationCap,
  School,
  BookOpen,
  UserCheck,
  UserX,
  CalendarDays,
  History,
  RefreshCw,
} from 'lucide-react';
import { callApi } from '../services/api';
import { AuthUser, ClassRoom, DashboardSummary, MenuId, SchoolIdentity, Student } from '../types';
import { EmptyState, PageHeader, SecondaryButton } from '../components/UI';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export function DashboardModule({
  user,
  school,
  onNavigate,
  onToast,
}: {
  user: AuthUser;
  school: SchoolIdentity | null;
  onNavigate: (menu: MenuId) => void;
  onToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, message?: string) => void;
}) {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [loading, setLoading] = useState(true);

  const loadDashboard = async (classId = selectedClassId) => {
    setLoading(true);
    const [dRes, cRes, sRes] = await Promise.all([
      callApi<DashboardSummary>('getDashboard', classId ? { id_kelas: classId } : {}),
      user.role !== 'ORANG_TUA'
        ? callApi<ClassRoom[]>('getClasses')
        : Promise.resolve({ success: true, message: 'OK', data: [] as ClassRoom[] }),
      callApi<Student[]>('getStudents'),
    ]);
    setLoading(false);
    if (dRes.success && dRes.data) {
      setData(dRes.data);
    } else {
      onToast('error', 'Gagal memuat dashboard', dRes.message);
    }
    if (cRes.success && cRes.data) {
      setClasses(cRes.data);
    }
    if (sRes.success && sRes.data) {
      setStudents(sRes.data);
    }
  };

  useEffect(() => {
    loadDashboard(selectedClassId);
  }, [selectedClassId]);

  const kpiCards = [
    {
      label: user.role === 'ORANG_TUA' ? 'Anak Terhubung' : 'Total Siswa',
      value: data?.total_siswa ?? 0,
      icon: Users,
      accent: 'text-[#6D28D9] bg-[#EDE9FE]',
    },
    ...(user.role !== 'ORANG_TUA'
      ? [
          {
            label: 'Total Guru',
            value: data?.total_guru ?? 0,
            icon: GraduationCap,
            accent: 'text-[#4C1D95] bg-[#F5F3FF]',
          },
        ]
      : []),
    {
      label: 'Total Kelas',
      value: data?.total_kelas ?? 0,
      icon: School,
      accent: 'text-[#2563EB] bg-blue-50',
    },
    {
      label: 'Total Mata Pelajaran',
      value: data?.total_mapel ?? 0,
      icon: BookOpen,
      accent: 'text-[#6D28D9] bg-[#EDE9FE]',
    },
    {
      label: 'Persentase Kehadiran',
      value: `${data?.persentase_kehadiran ?? 0}%`,
      icon: UserCheck,
      accent: 'text-[#16A34A] bg-emerald-50',
    },
    {
      label: 'Jumlah Tidak Hadir',
      value: data?.jumlah_tidak_hadir ?? 0,
      icon: UserX,
      accent: 'text-[#DC2626] bg-red-50',
    },
  ];

  const classGenderBreakdown = useMemo(() => {
    const items = data?.siswa_per_kelas || [];
    const normCls = (v?: string) => String(v || '').trim().replace(/\s+/g, ' ').toLowerCase();
    const compactCls = (v?: string) => String(v || '').trim().replace(/[^a-z0-9]/gi, '').toLowerCase();
    const detectGender = (v?: string): 'L' | 'P' | '' => {
      const g = String(v || '').trim().toLowerCase();
      if (!g) return '';
      if (g === 'l' || g === 'lk' || g.startsWith('laki') || g === 'pria' || g === 'male' || g === 'm') {
        return 'L';
      }
      if (g === 'p' || g === 'pr' || g.startsWith('perempuan') || g === 'wanita' || g === 'female' || g === 'f') {
        return 'P';
      }
      return '';
    };

    return items.map((c) => {
      if (typeof c.jumlah_l === 'number' && typeof c.jumlah_p === 'number') {
        return {
          nama_kelas: c.nama_kelas,
          jumlahL: c.jumlah_l,
          jumlahP: c.jumlah_p,
          total: c.jumlah || c.jumlah_l + c.jumlah_p,
        };
      }
      const clsObj = classes.find((cl) => normCls(cl.nama_kelas) === normCls(c.nama_kelas));
      const targetId = String(clsObj?.id_kelas || '').trim();
      const targetNorm = normCls(c.nama_kelas);
      const targetComp = compactCls(c.nama_kelas);
      let jumlahL = 0;
      let jumlahP = 0;
      students.forEach((s) => {
        const sId = String(s.id_kelas || '').trim();
        const matchId = targetId && sId === targetId;
        const matchName =
          (targetNorm && normCls(s.nama_kelas) === targetNorm) ||
          (targetComp && compactCls(s.nama_kelas) === targetComp);
        if (!matchId && !matchName) return;
        const g = detectGender(s.jenis_kelamin);
        if (g === 'L') jumlahL++;
        else if (g === 'P') jumlahP++;
      });
      return {
        nama_kelas: c.nama_kelas,
        jumlahL,
        jumlahP,
        total: c.jumlah || jumlahL + jumlahP,
      };
    });
  }, [data?.siswa_per_kelas, classes, students]);

  const totalClassL = useMemo(
    () => classGenderBreakdown.reduce((acc, item) => acc + item.jumlahL, 0),
    [classGenderBreakdown]
  );
  const totalClassP = useMemo(
    () => classGenderBreakdown.reduce((acc, item) => acc + item.jumlahP, 0),
    [classGenderBreakdown]
  );

  const activeRombelClass = useMemo(() => {
    if (selectedClassId) {
      return classes.find((c) => c.id_kelas === selectedClassId);
    }
    if (user.role === 'GURU' && classes.length === 1) {
      return classes[0];
    }
    return undefined;
  }, [selectedClassId, user.role, classes]);

  const getClassIdentityStyle = (cls: ClassRoom) => {
    const levelStr = String(cls.tingkat || cls.nama_kelas || '').match(/\d+/)?.[0] || '';
    const levelNum = levelStr ? Number(levelStr) : 0;
    const palettes = [
      { bg: 'bg-[#EDE9FE]', text: 'text-[#4C1D95]', border: 'border-[#C4B5FD]', dot: 'bg-[#6D28D9]' },
      { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200', dot: 'bg-emerald-600' },
      { bg: 'bg-sky-50', text: 'text-sky-800', border: 'border-sky-200', dot: 'bg-sky-600' },
      { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', dot: 'bg-amber-500' },
      { bg: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-indigo-200', dot: 'bg-indigo-600' },
      { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200', dot: 'bg-rose-600' },
    ];
    if (levelNum === 5) return palettes[0];
    if (levelNum >= 1 && levelNum <= 4) return palettes[levelNum];
    if (levelNum === 6) return palettes[5];
    const name = String(cls.nama_kelas || '');
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
    }
    return palettes[hash % palettes.length];
  };

  const hasAttendanceData = (data?.kehadiran_chart || []).some((k) => k.jumlah > 0);
  const hasClassData = classGenderBreakdown.length > 0;
  const hasGradeData = (data?.perkembangan_nilai || []).length > 0;
  const hasAchievementData = (data?.prestasi_chart || []).length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard Utama"
        description={
          <span className="inline-flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <span>
              {school?.nama_sekolah || 'Ringkasan data aktual sekolah.'}
            </span>
            {activeRombelClass && (() => {
              const style = getClassIdentityStyle(activeRombelClass);
              return (
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border text-xs font-semibold shadow-2xs ${style.bg} ${style.text} ${style.border}`}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`} aria-hidden="true" />
                  <School className="w-3.5 h-3.5 shrink-0" />
                  <span>Rombel: {activeRombelClass.nama_kelas}</span>
                </span>
              );
            })()}
          </span>
        }
        actions={
          <>
            {user.role !== 'ORANG_TUA' && classes.length > 1 && (
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                aria-label="Filter Kelas Dashboard"
                className="px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
              >
                <option value="">Semua Kelas</option>
                {classes.map((c) => (
                  <option key={c.id_kelas} value={c.id_kelas}>
                    {c.nama_kelas}
                  </option>
                ))}
              </select>
            )}
            <SecondaryButton onClick={() => loadDashboard(selectedClassId)} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Muat Ulang
            </SecondaryButton>
          </>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpiCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={`${card.label}-${idx}`}
              className="bg-white border border-[#E5E7EB] rounded-xl p-4 shadow-[0_1px_2px_rgba(30,27,75,0.04)] hover:border-[#6D28D9]/40 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-[#64748B] truncate">{card.label}</span>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${card.accent}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 text-2xl font-bold text-[#1E1B4B] tabular-nums">
                {loading ? '—' : card.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Siswa per Kelas */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
          <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base font-bold text-[#1E1B4B]">Jumlah Siswa per Kelas</h2>
              <p className="text-xs text-[#64748B]">
                Perbandingan siswa Laki-laki (L) dan Perempuan (P) tiap kelas
              </p>
            </div>
            {hasClassData && (
              <div className="flex items-center gap-3 text-xs font-medium tabular-nums">
                <span className="inline-flex items-center gap-1.5 text-[#1D4ED8]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" aria-hidden="true" />
                  L: {totalClassL}
                </span>
                <span className="inline-flex items-center gap-1.5 text-[#BE185D]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#EC4899]" aria-hidden="true" />
                  P: {totalClassP}
                </span>
                <span className="text-[#64748B]">
                  · Total: {totalClassL + totalClassP}
                </span>
              </div>
            )}
          </div>
          {hasClassData ? (
            <div className="h-64">
              <Bar
                data={{
                  labels: classGenderBreakdown.map((c) => c.nama_kelas),
                  datasets: [
                    {
                      label: 'Laki-laki (L)',
                      data: classGenderBreakdown.map((c) => c.jumlahL),
                      backgroundColor: '#2563EB',
                      hoverBackgroundColor: '#1D4ED8',
                      borderRadius: 6,
                      barPercentage: 0.78,
                      categoryPercentage: 0.72,
                    },
                    {
                      label: 'Perempuan (P)',
                      data: classGenderBreakdown.map((c) => c.jumlahP),
                      backgroundColor: '#EC4899',
                      hoverBackgroundColor: '#DB2777',
                      borderRadius: 6,
                      barPercentage: 0.78,
                      categoryPercentage: 0.72,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  interaction: { mode: 'index', intersect: false },
                  plugins: {
                    legend: {
                      display: true,
                      position: 'top',
                      labels: {
                        usePointStyle: true,
                        pointStyle: 'circle',
                        boxWidth: 8,
                        padding: 14,
                        font: { size: 11 },
                      },
                    },
                    tooltip: {
                      callbacks: {
                        label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y ?? 0} siswa`,
                        footer: (items) => {
                          const total = items.reduce((acc, it) => acc + (it.parsed.y ?? 0), 0);
                          return `Total Kelas: ${total} siswa`;
                        },
                      },
                    },
                  },
                  scales: {
                    y: { beginAtZero: true, ticks: { precision: 0 } },
                  },
                }}
              />
            </div>
          ) : (
            <EmptyState
              title="Belum ada data kelas & siswa"
              description="Grafik akan tampil otomatis setelah data kelas dan siswa ditambahkan."
              action={
                user.role === 'ADMIN' ? (
                  <SecondaryButton onClick={() => onNavigate('kelas')}>
                    Kelola Data Kelas
                  </SecondaryButton>
                ) : undefined
              }
            />
          )}
        </div>

        {/* Kehadiran Siswa */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-[#1E1B4B]">Rekap Kehadiran Siswa</h2>
              <p className="text-xs text-[#64748B]">Distribusi status absensi tercatat</p>
            </div>
          </div>
          {hasAttendanceData ? (
            <div className="h-64 flex items-center justify-center">
              <Doughnut
                data={{
                  labels: data!.kehadiran_chart.map((k) => k.status),
                  datasets: [
                    {
                      data: data!.kehadiran_chart.map((k) => k.jumlah),
                      backgroundColor: ['#16A34A', '#2563EB', '#F59E0B', '#DC2626'],
                      borderWidth: 1,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: 'right' },
                  },
                }}
              />
            </div>
          ) : (
            <EmptyState
              title="Belum ada data absensi"
              description="Grafik kehadiran akan tampil otomatis setelah absensi harian dicatat."
              action={
                user.role === 'ADMIN' || user.role === 'GURU' ? (
                  <SecondaryButton onClick={() => onNavigate('absensi')}>
                    Input Absensi
                  </SecondaryButton>
                ) : undefined
              }
            />
          )}
        </div>

        {/* Perkembangan Nilai */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-[#1E1B4B]">Rata-Rata Nilai per Mata Pelajaran</h2>
              <p className="text-xs text-[#64748B]">Berdasarkan komponen nilai yang sudah terisi</p>
            </div>
          </div>
          {hasGradeData ? (
            <div className="h-64">
              <Line
                data={{
                  labels: data!.perkembangan_nilai.map((n) => n.nama_mapel),
                  datasets: [
                    {
                      label: 'Rata-rata Nilai',
                      data: data!.perkembangan_nilai.map((n) => n.rata_rata),
                      borderColor: '#6D28D9',
                      backgroundColor: 'rgba(109, 40, 217, 0.12)',
                      tension: 0.25,
                      fill: true,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: { min: 0, max: 100 },
                  },
                }}
              />
            </div>
          ) : (
            <EmptyState
              title="Belum ada data nilai"
              description="Grafik perkembangan nilai dihitung dari data SUM 1–4 dan SAS yang diinput."
              action={
                user.role === 'ADMIN' || user.role === 'GURU' ? (
                  <SecondaryButton onClick={() => onNavigate('input-nilai')}>
                    Input Nilai Siswa
                  </SecondaryButton>
                ) : undefined
              }
            />
          )}
        </div>

        {/* Prestasi Siswa */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-[#1E1B4B]">Prestasi Siswa per Tingkat</h2>
              <p className="text-xs text-[#64748B]">Akumulasi capaian prestasi terverifikasi</p>
            </div>
          </div>
          {hasAchievementData ? (
            <div className="h-64">
              <Bar
                data={{
                  labels: data!.prestasi_chart.map((p) => p.tingkat),
                  datasets: [
                    {
                      label: 'Jumlah Prestasi',
                      data: data!.prestasi_chart.map((p) => p.jumlah),
                      backgroundColor: '#4C1D95',
                      borderRadius: 6,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    y: { beginAtZero: true, ticks: { precision: 0 } },
                  },
                }}
              />
            </div>
          ) : (
            <EmptyState
              title="Belum ada data prestasi"
              description="Catatan prestasi akademik maupun non-akademik siswa akan dirangkum di sini."
            />
          )}
        </div>
      </div>

      {/* Agenda Terdekat & Aktivitas Terbaru */}
      <div
        className={`grid grid-cols-1 ${
          user.role === 'ADMIN' || user.role === 'KEPALA_SEKOLAH' ? 'lg:grid-cols-2' : ''
        } gap-6`}
      >
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-[#6D28D9]" />
              <h2 className="text-base font-bold text-[#1E1B4B]">Agenda Sekolah Terdekat</h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('agenda')}
              className="text-xs font-semibold text-[#6D28D9] hover:underline cursor-pointer"
            >
              Lihat Semua
            </button>
          </div>
          {data?.agenda_terdekat && data.agenda_terdekat.length > 0 ? (
            <div className="divide-y divide-[#E5E7EB]">
              {data.agenda_terdekat.map((ag) => (
                <div key={ag.id_agenda} className="py-3 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#1E1B4B] truncate">
                      {ag.nama_kegiatan}
                    </div>
                    <div className="text-xs text-[#64748B] mt-0.5">
                      {ag.tempat || '-'} · PJ: {ag.penanggung_jawab || '-'}
                    </div>
                  </div>
                  <div className="text-xs font-mono tabular-nums text-[#6D28D9] whitespace-nowrap shrink-0">
                    {ag.tanggal} {ag.waktu ? `· ${ag.waktu}` : ''}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#64748B] py-6 text-center">Belum ada agenda terdekat.</p>
          )}
        </div>

        {(user.role === 'ADMIN' || user.role === 'KEPALA_SEKOLAH') && (
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-[#6D28D9]" />
                <h2 className="text-base font-bold text-[#1E1B4B]">Ringkasan Aktivitas Terbaru</h2>
              </div>
            </div>
            {data?.aktivitas_terbaru && data.aktivitas_terbaru.length > 0 ? (
              <div className="divide-y divide-[#E5E7EB]">
                {data.aktivitas_terbaru.map((log, idx) => (
                  <div key={`${log.id_log}-${idx}`} className="py-2.5 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm text-[#1E1B4B]">
                        <span className="font-semibold">{log.username}</span> · {log.detail}
                      </div>
                      <div className="text-xs text-[#64748B] mt-0.5">
                        {log.modul} · {log.aksi}
                      </div>
                    </div>
                    <div className="text-[11px] font-mono tabular-nums text-[#64748B] whitespace-nowrap shrink-0">
                      {String(log.waktu || '').slice(0, 16).replace('T', ' ')}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#64748B] py-6 text-center">
                Belum ada log aktivitas tercatat.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
