import { MenuId, UserRole } from '../types';

export interface NavItem {
  id: MenuId;
  label: string;
  roles: UserRole[];
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    title: 'DASHBOARD',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard Utama',
        roles: ['ADMIN', 'KEPALA_SEKOLAH', 'GURU', 'ORANG_TUA'],
      },
    ],
  },
  {
    title: 'MASTER DATA',
    items: [
      {
        id: 'siswa',
        label: 'Data Siswa',
        roles: ['ADMIN', 'KEPALA_SEKOLAH', 'GURU', 'ORANG_TUA'],
      },
      {
        id: 'guru',
        label: 'Data Guru',
        roles: ['ADMIN', 'KEPALA_SEKOLAH', 'GURU'],
      },
      {
        id: 'kelas',
        label: 'Data Kelas',
        roles: ['ADMIN', 'KEPALA_SEKOLAH', 'GURU'],
      },
      {
        id: 'mapel',
        label: 'Mata Pelajaran',
        roles: ['ADMIN', 'KEPALA_SEKOLAH', 'GURU'],
      },
      {
        id: 'tahun-ajaran',
        label: 'Tahun Ajaran',
        roles: ['ADMIN', 'KEPALA_SEKOLAH'],
      },
    ],
  },
  {
    title: 'AKADEMIK',
    items: [
      {
        id: 'jadwal',
        label: 'Jadwal Pelajaran',
        roles: ['ADMIN', 'KEPALA_SEKOLAH', 'GURU', 'ORANG_TUA'],
      },
      {
        id: 'absensi',
        label: 'Absensi Siswa',
        roles: ['ADMIN', 'GURU'],
      },
      {
        id: 'rekap-absensi',
        label: 'Rekap Absensi',
        roles: ['ADMIN', 'KEPALA_SEKOLAH', 'GURU', 'ORANG_TUA'],
      },
      {
        id: 'input-nilai',
        label: 'Input Nilai',
        roles: ['ADMIN', 'GURU'],
      },
      {
        id: 'rekap-nilai',
        label: 'Rekap Nilai',
        roles: ['ADMIN', 'KEPALA_SEKOLAH', 'GURU', 'ORANG_TUA'],
      },
      {
        id: 'jurnal',
        label: 'Jurnal Guru',
        roles: ['ADMIN', 'KEPALA_SEKOLAH', 'GURU'],
      },
    ],
  },
  {
    title: 'PERKEMBANGAN SISWA',
    items: [
      {
        id: 'karakter',
        label: 'Karakter Siswa',
        roles: ['ADMIN', 'KEPALA_SEKOLAH', 'GURU', 'ORANG_TUA'],
      },
      {
        id: 'kesehatan',
        label: 'Kesehatan Siswa',
        roles: ['ADMIN', 'KEPALA_SEKOLAH', 'GURU'],
      },
      {
        id: 'bimbingan',
        label: 'Bimbingan dan Konseling',
        roles: ['ADMIN', 'KEPALA_SEKOLAH', 'GURU'],
      },
      {
        id: 'prestasi',
        label: 'Prestasi Siswa',
        roles: ['ADMIN', 'KEPALA_SEKOLAH', 'GURU', 'ORANG_TUA'],
      },
    ],
  },
  {
    title: 'ADMINISTRASI SEKOLAH',
    items: [
      {
        id: 'piket',
        label: 'Jadwal Piket',
        roles: ['ADMIN', 'KEPALA_SEKOLAH', 'GURU'],
      },
      {
        id: 'agenda',
        label: 'Agenda Sekolah',
        roles: ['ADMIN', 'KEPALA_SEKOLAH', 'GURU', 'ORANG_TUA'],
      },
      {
        id: 'penghubung',
        label: 'Buku Penghubung',
        roles: ['ADMIN', 'KEPALA_SEKOLAH', 'GURU', 'ORANG_TUA'],
      },
      {
        id: 'inventaris',
        label: 'Inventaris',
        roles: ['ADMIN', 'KEPALA_SEKOLAH', 'GURU'],
      },
      {
        id: 'dokumentasi',
        label: 'Dokumentasi',
        roles: ['ADMIN', 'KEPALA_SEKOLAH', 'GURU'],
      },
    ],
  },
  {
    title: 'SISTEM',
    items: [
      {
        id: 'pengguna',
        label: 'Manajemen Pengguna',
        roles: ['ADMIN'],
      },
      {
        id: 'pengaturan',
        label: 'Pengaturan Sekolah',
        roles: ['ADMIN'],
      },
      {
        id: 'laporan',
        label: 'Laporan',
        roles: ['ADMIN', 'KEPALA_SEKOLAH', 'GURU'],
      },
      {
        id: 'backup',
        label: 'Backup Data',
        roles: ['ADMIN'],
      },
    ],
  },
];

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrator',
  KEPALA_SEKOLAH: 'Kepala Sekolah',
  GURU: 'Guru',
  ORANG_TUA: 'Orang Tua',
};

export function canAccessMenu(role: UserRole, menuId: MenuId): boolean {
  for (const group of NAV_GROUPS) {
    const item = group.items.find((i) => i.id === menuId);
    if (item) {
      return item.roles.includes(role);
    }
  }
  return false;
}

export function getMenuTitle(menuId: MenuId, role: UserRole): { group: string; label: string } {
  for (const group of NAV_GROUPS) {
    const item = group.items.find((i) => i.id === menuId);
    if (item) {
      if (role === 'ORANG_TUA') {
        if (menuId === 'siswa') return { group: group.title, label: 'Data Anak' };
        if (menuId === 'rekap-absensi') return { group: group.title, label: 'Kehadiran Anak' };
        if (menuId === 'rekap-nilai') return { group: group.title, label: 'Nilai Anak' };
        if (menuId === 'karakter') return { group: group.title, label: 'Karakter Anak' };
        if (menuId === 'prestasi') return { group: group.title, label: 'Prestasi Anak' };
      }
      return { group: group.title, label: item.label };
    }
  }
  return { group: 'DASHBOARD', label: 'Dashboard Utama' };
}
