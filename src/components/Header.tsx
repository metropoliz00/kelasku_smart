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
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-[#E5E7EB] px-4 sm:px-6 flex items-center justify-between gap-4 no-print">
      {/* Left: Mobile toggle + Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 rounded-lg text-[#1E1B4B] hover:bg-[#F5F3FF] cursor-pointer"
          aria-label="Buka menu navigasi"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0 flex items-center gap-2 text-sm">
          <span className="hidden sm:inline text-[#64748B] truncate">{group}</span>
          <span className="hidden sm:inline text-[#CBD5E1]" aria-hidden="true">
            /
          </span>
          <span className="font-semibold text-[#1E1B4B] truncate">{label}</span>
        </div>
      </div>

      {/* Right: Academic Year context, IFP mode, Connection, Profile & Logout */}
      <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">
        {school?.tahun_ajaran_aktif && (
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-[#64748B] tabular-nums whitespace-nowrap">
            <span>TA {school.tahun_ajaran_aktif}</span>
            <span aria-hidden="true">·</span>
            <span>{school.semester_aktif}</span>
          </div>
        )}

        <button
          type="button"
          onClick={onOpenConnectionModal}
          title="Status Koneksi Database"
          className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-[#E5E7EB] hover:bg-[#F5F3FF] text-[#1E1B4B] transition-colors cursor-pointer whitespace-nowrap"
        >
          <Database
            className={`w-3.5 h-3.5 ${
              connectionMode === 'GAS' ? 'text-[#16A34A]' : 'text-[#F59E0B]'
            }`}
          />
          <span>{connectionMode === 'GAS' ? 'Database' : 'Mode Lokal'}</span>
        </button>

        <button
          type="button"
          onClick={onToggleIfpMode}
          title="Mode Layar Sentuh Besar (IFP)"
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap ${
            ifpMode
              ? 'bg-[#EDE9FE] border-[#6D28D9] text-[#4C1D95]'
              : 'bg-white border-[#E5E7EB] text-[#64748B] hover:text-[#1E1B4B]'
          }`}
        >
          <MonitorSmartphone className="w-3.5 h-3.5" />
          <span className="hidden xl:inline">Mode IFP</span>
        </button>

        <button
          type="button"
          onClick={onOpenProfile}
          title="Profil & Foto Akun"
          className="inline-flex items-center gap-2.5 px-2 py-1 rounded-xl border border-transparent hover:border-[#DDD6FE] hover:bg-[#F5F3FF]/70 transition-colors cursor-pointer min-w-0"
        >
          <UserAvatar src={user.foto_url} name={user.nama_lengkap} size="sm" />
          <div className="hidden sm:block text-right min-w-0">
            <div className="text-xs font-semibold text-[#1E1B4B] truncate max-w-[150px]">
              {user.nama_lengkap}
            </div>
            <div className="text-[11px] text-[#64748B] truncate">{ROLE_LABELS[user.role]}</div>
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
