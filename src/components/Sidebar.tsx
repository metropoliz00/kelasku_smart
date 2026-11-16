import React from 'react';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  School,
  BookOpen,
  CalendarRange,
  Clock,
  ClipboardCheck,
  BarChart3,
  PenLine,
  Award,
  BookText,
  HeartHandshake,
  Stethoscope,
  MessageSquareHeart,
  Trophy,
  ShieldCheck,
  CalendarDays,
  MessagesSquare,
  Package,
  FolderOpen,
  UserCog,
  Settings,
  FileText,
  DatabaseBackup,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { NAV_GROUPS } from '../config/navigation';
import { MenuId, UserRole } from '../types';
import { BrandEmblem } from './UI';

const ICON_MAP: Record<MenuId, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  siswa: Users,
  guru: GraduationCap,
  kelas: School,
  mapel: BookOpen,
  'tahun-ajaran': CalendarRange,
  jadwal: Clock,
  absensi: ClipboardCheck,
  'rekap-absensi': BarChart3,
  'input-nilai': PenLine,
  'rekap-nilai': Award,
  jurnal: BookText,
  karakter: HeartHandshake,
  kesehatan: Stethoscope,
  bimbingan: MessageSquareHeart,
  prestasi: Trophy,
  piket: ShieldCheck,
  agenda: CalendarDays,
  penghubung: MessagesSquare,
  inventaris: Package,
  dokumentasi: FolderOpen,
  pengguna: UserCog,
  pengaturan: Settings,
  laporan: FileText,
  backup: DatabaseBackup,
};

export function Sidebar({
  role,
  activeMenu,
  onSelectMenu,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
  schoolName,
}: {
  role: UserRole;
  activeMenu: MenuId;
  onSelectMenu: (id: MenuId) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  schoolName?: string;
}) {
  const handleSelect = (id: MenuId) => {
    onSelectMenu(id);
    onCloseMobile();
  };

  const renderNavContent = (isMobile: boolean) => (
    <div className="flex flex-col h-full bg-[#4C1D95] text-white select-none">
      {/* Brand header */}
      <div className="flex items-center justify-between gap-2 px-4 h-16 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <BrandEmblem className="w-9 h-9 shrink-0" />
          {(!collapsed || isMobile) && (
            <div className="min-w-0">
              <div className="text-sm font-bold tracking-tight text-white truncate">
                KELASKU SMART
              </div>
              <div className="text-[11px] text-[#EDE9FE]/80 truncate">
                {schoolName || 'School Management'}
              </div>
            </div>
          )}
        </div>

        {isMobile ? (
          <button
            type="button"
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
            aria-label="Tutup menu"
          >
            <X className="w-5 h-5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden lg:inline-flex p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
            aria-label={collapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
            title={collapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Navigation groups */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5" aria-label="Menu Utama">
        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter((item) => item.roles.includes(role));
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.title}>
              {(!collapsed || isMobile) && (
                <div className="px-3 mb-1.5 text-[11px] font-semibold tracking-wider text-[#EDE9FE]/60">
                  {group.title}
                </div>
              )}
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const Icon = ICON_MAP[item.id];
                  const isActive = activeMenu === item.id;
                  let displayLabel = item.label;
                  if (role === 'ORANG_TUA') {
                    if (item.id === 'siswa') displayLabel = 'Data Anak';
                    if (item.id === 'rekap-absensi') displayLabel = 'Kehadiran Anak';
                    if (item.id === 'rekap-nilai') displayLabel = 'Nilai Anak';
                    if (item.id === 'karakter') displayLabel = 'Karakter Anak';
                    if (item.id === 'prestasi') displayLabel = 'Prestasi Anak';
                  }

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelect(item.id)}
                      title={collapsed && !isMobile ? displayLabel : undefined}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                        isActive
                          ? 'bg-[#6D28D9] text-white shadow-sm'
                          : 'text-[#EDE9FE]/85 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      {(!collapsed || isMobile) && <span className="truncate">{displayLabel}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
    </div>
  );

  return (
    <>
      {/* Desktop / Tablet persistent sidebar */}
      <aside
        className={`hidden md:block shrink-0 transition-all duration-200 ${
          collapsed ? 'w-[72px]' : 'w-[264px]'
        } h-screen sticky top-0 border-r border-[#4C1D95] no-print`}
      >
        {renderNavContent(false)}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex no-print">
          <div
            className="fixed inset-0 bg-[#1E1B4B]/50"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10">
            {renderNavContent(true)}
          </aside>
        </div>
      )}
    </>
  );
}
