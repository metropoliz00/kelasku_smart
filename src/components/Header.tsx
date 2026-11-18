import React from 'react';
import { Menu, LogOut, MonitorSmartphone, Database } from 'lucide-react';
import { getMenuTitle, ROLE_LABELS } from '../config/navigation';
import { AuthUser, ConnectionMode, MenuId, SchoolIdentity } from '../types';
import { UserAvatar } from './UI';

export function Header({
  user,
  activeMenu,
  school,
  connectionMode,
  ifpMode,
  onToggleIfpMode,
  onOpenMobileMenu,
  onOpenConnectionModal,
  onOpenProfile,
  onLogout,
}: {
  user: AuthUser;
  activeMenu: MenuId;
  school: SchoolIdentity | null;
  connectionMode: ConnectionMode;
  ifpMode: boolean;
  onToggleIfpMode: () => void;
  onOpenMobileMenu: () => void;
  onOpenConnectionModal: () => void;
  onOpenProfile: () => void;
  onLogout: () => void;
}) {
  const { group, label } = getMenuTitle(activeMenu, user.role);

  return (
    <header className="sticky top-0 z-30 min-h-16 bg-white border-b border-[#E5E7EB] px-4 sm:px-6 py-2 flex flex-wrap sm:flex-nowrap items-center justify-between gap-x-4 gap-y-2 no-print">
      {/* Left: Mobile toggle + Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0 shrink-0 max-w-full">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 rounded-lg text-[#1E1B4B] hover:bg-[#F5F3FF] cursor-pointer shrink-0"
          aria-label="Buka menu navigasi"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0 flex items-center gap-2 text-sm">
          <span className="hidden lg:inline text-[#64748B] whitespace-nowrap">{group}</span>
          <span className="hidden lg:inline text-[#CBD5E1]" aria-hidden="true">
            /
          </span>
          <span className="font-semibold text-[#1E1B4B] truncate">{label}</span>
        </div>
      </div>

      {/* Right: Academic Year context, Flexible Profile & Logout */}
      <div className="flex items-center justify-end gap-2.5 sm:gap-3.5 min-w-0 flex-1">
        {school?.tahun_ajaran_aktif && (
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-[#64748B] tabular-nums whitespace-nowrap shrink-0">
            <span>TA {school.tahun_ajaran_aktif}</span>
            <span aria-hidden="true">·</span>
            <span>{school.semester_aktif}</span>
          </div>
        )}



        <button
          type="button"
          onClick={onOpenProfile}
          title={`${user.nama_lengkap} (${ROLE_LABELS[user.role]}) — Profil & Foto Akun`}
          className="inline-flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl border border-transparent hover:border-[#DDD6FE] hover:bg-[#F5F3FF]/70 transition-colors cursor-pointer min-w-0 max-w-full"
        >
          <UserAvatar src={user.foto_url} name={user.nama_lengkap} size="sm" className="shrink-0" />
          <div className="text-left sm:text-right min-w-0">
            <div className="text-xs sm:text-[13px] font-semibold text-[#1E1B4B] leading-snug whitespace-normal break-words">
              {user.nama_lengkap}
            </div>
            <div className="text-[11px] text-[#64748B] leading-tight whitespace-normal break-words">
              {ROLE_LABELS[user.role]}
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={onLogout}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#DC2626] bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Keluar</span>
        </button>
      </div>
    </header>
  );
}
