import React, { useEffect, useState } from 'react';
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
import { AuthUser, DashboardSummary, MenuId, SchoolIdentity } from '../types';
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
  const [loading, setLoading] = useState(true);

  const loadDashboard = async () => {
    setLoading(true);
    const res = await callApi<DashboardSummary>('getDashboard');
    setLoading(false);
    if (res.success && res.data) {
      setData(res.data);
    } else {
      onToast('error', 'Gagal memuat dashboard', res.message);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

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

  const hasAttendanceData = (data?.kehadiran_chart || []).some((k) => k.jumlah > 0);
  const hasClassData = (data?.siswa_per_kelas || []).length > 0;
  const hasGradeData = (data?.perkembangan_nilai || []).length > 0;
  const hasAchievementData = (data?.prestasi_chart || []).length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard Utama"
        description={
          school?.nama_sekolah
            ? `${school.nama_sekolah} · Tahun Ajaran ${school.tahun_ajaran_aktif || '-'} (${school.semester_aktif})`
            : 'Ringkasan data aktual sekolah dari database.'
        }
        actions={
          <SecondaryButton onClick={loadDashboard} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Muat Ulang
          </SecondaryButton>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
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
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-[#1E1B4B]">Jumlah Siswa per Kelas</h2>
              <p className="text-xs text-[#64748B]">Dihitung dari data siswa dan kelas aktual</p>
            </div>
          </div>
          {hasClassData ? (
            <div className="h-64">
              <Bar
                data={{
                  labels: data!.siswa_per_kelas.map((c) => c.nama_kelas),
                  datasets: [
                    {
                      label: 'Jumlah Siswa',
                      data: data!.siswa_per_kelas.map((c) => c.jumlah),
                      backgroundColor: '#6D28D9',
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
                      backgroundColor: ['#16A34A', '#2563EB', '#F59E0B', '#DC2626', '#6D28D9'],
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
                {data.aktivitas_terbaru.map((log) => (
                  <div key={log.id_log} className="py-2.5 flex items-start justify-between gap-3">
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
