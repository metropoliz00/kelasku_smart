import React, { useCallback, useEffect, useState } from 'react';
import { Copy, Download, RefreshCw, RotateCcw } from 'lucide-react';
import { canAccessMenu, ROLE_LABELS } from './config/navigation';
import {
  callApi,
  enableLocalMode,
  getConfiguredGasUrl,
  getConnectionMode,
  getDefaultGasUrl,
  getStoredSession,
  resetGasUrlToDefault,
  setConfiguredGasUrl,
  setStoredSession,
  validateGasWebAppUrl,
} from './services/api';
import { AuthUser, ConnectionMode, DesktopUpdateStatus, MenuId, SchoolIdentity, SessionData, ToastItem } from './types';
import { copyGasCodeToClipboard, downloadGasCodeFile } from './utils/gasCode';
import { Header } from './components/Header';
import { LoginPage } from './components/LoginPage';
import { Sidebar } from './components/Sidebar';
import {
  AppFooter,
  Modal,
  PhotoUploadField,
  PrimaryButton,
  SecondaryButton,
  ToastContainer,
  UserAvatar,
} from './components/UI';
import { DashboardModule } from './modules/DashboardModule';
import {
  GuruModule,
  KelasModule,
  MapelModule,
  SiswaModule,
  TahunAjaranModule,
} from './modules/MasterDataModules';
import {
  AbsensiModule,
  InputNilaiModule,
  JadwalModule,
  JurnalModule,
  RekapAbsensiModule,
  RekapNilaiModule,
} from './modules/AcademicModules';
import {
  BimbinganModule,
  KarakterModule,
  KesehatanModule,
  PrestasiModule,
} from './modules/StudentDevModules';
import {
  AgendaModule,
  DokumentasiModule,
  InventarisModule,
  PenghubungModule,
  PiketModule,
} from './modules/AdminModules';
import {
  BackupModule,
  LaporanModule,
  PengaturanModule,
  PenggunaModule,
} from './modules/SystemModules';

const DEFAULT_SCHOOL: SchoolIdentity = {
  id: 'SEKOLAH_UTAMA',
  nama_sekolah: 'KELASKU SMART',
  npsn: '',
  alamat: '',
  kecamatan: '',
  kabupaten: '',
  provinsi: '',
  email: '',
  tahun_ajaran_aktif_id: '',
  tahun_ajaran_aktif: '',
  semester_aktif: 'Ganjil',
  peringkat_aktif: 'Tidak',
  updated_at: '',
};

export default function App() {
  const [session, setSession] = useState<SessionData | null>(() => getStoredSession());
  const [activeMenu, setActiveMenu] = useState<MenuId>('dashboard');
  const [school, setSchool] = useState<SchoolIdentity>(DEFAULT_SCHOOL);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [ifpMode, setIfpMode] = useState(false);
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>(() => getConnectionMode());
  const [connModalOpen, setConnModalOpen] = useState(false);
  const [gasUrlInput, setGasUrlInput] = useState(() => getConfiguredGasUrl());
  const [profileOpen, setProfileOpen] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [desktopUpdate, setDesktopUpdate] = useState<DesktopUpdateStatus | null>(null);

  const addToast = useCallback(
    (type: ToastItem['type'], title: string, message?: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev, { id, type, title, message }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4500);
    },
    []
  );

  const loadSchoolIdentity = useCallback(async () => {
    const res = await callApi<SchoolIdentity>('getSchoolSettings');
    if (res.success && res.data) {
      setSchool({ ...DEFAULT_SCHOOL, ...res.data });
    }
  }, []);

  useEffect(() => {
    if (!session) return;
    callApi<{ user: SessionData['user'] }>('verifySession').then((res) => {
      if (!res.success) {
        setStoredSession(null);
        setSession(null);
      } else {
        if (res.data?.user) {
          setSession((prev) => {
            if (!prev) return prev;
            const nextSession = { ...prev, user: res.data!.user };
            setStoredSession(nextSession);
            return nextSession;
          });
        }
        loadSchoolIdentity();
      }
    });
  }, [session?.token, loadSchoolIdentity]);

  useEffect(() => {
    if (!window.kelaskuDesktop?.onUpdateStatus) return;
    return window.kelaskuDesktop.onUpdateStatus((status) => {
      setDesktopUpdate(status);
      if (status.status === 'downloaded') {
        addToast(
          'info',
          `Pembaruan Desktop v${status.version || ''} Siap`,
          'Klik "Pasang & Mulai Ulang" pada bilah atas untuk memperbarui aplikasi.'
        );
      }
    });
  }, [addToast]);

  const handleLogout = async () => {
    await callApi('logoutUser');
    setStoredSession(null);
    setSession(null);
    setActiveMenu('dashboard');
    addToast('info', 'Keluar Berhasil', 'Anda telah keluar dari sesi aplikasi.');
  };

  const handleSelectMenu = (menu: MenuId) => {
    if (!session) return;
    if (!canAccessMenu(session.user.role, menu)) {
      addToast('error', 'Akses ditolak', 'Role Anda tidak memiliki izin mengakses modul ini.');
      return;
    }
    setActiveMenu(menu);
  };

  if (!session) {
    return (
      <>
        <LoginPage
          onLoginSuccess={(newSession) => {
            setSession(newSession);
            setActiveMenu('dashboard');
            setConnectionMode(getConnectionMode());
            addToast('success', 'Berhasil Masuk', `Selamat datang, ${newSession.user.nama_lengkap}.`);
          }}
          onConnectionChange={() => setConnectionMode(getConnectionMode())}
          onToast={addToast}
        />
        <ToastContainer
          toasts={toasts}
          onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
        />
      </>
    );
  }

  const user = session.user;

  const renderModule = () => {
    if (!canAccessMenu(user.role, activeMenu)) {
      return (
        <DashboardModule
          user={user}
          school={school}
          onNavigate={handleSelectMenu}
          onToast={addToast}
        />
      );
    }

    switch (activeMenu) {
      case 'dashboard':
        return (
          <DashboardModule
            user={user}
            school={school}
            onNavigate={handleSelectMenu}
            onToast={addToast}
          />
        );
      case 'siswa':
        return <SiswaModule user={user} school={school} onToast={addToast} />;
      case 'guru':
        return <GuruModule user={user} school={school} onToast={addToast} />;
      case 'kelas':
        return <KelasModule user={user} onToast={addToast} />;
      case 'mapel':
        return <MapelModule user={user} onToast={addToast} />;
      case 'tahun-ajaran':
        return (
          <TahunAjaranModule
            user={user}
            onToast={addToast}
            onSchoolChanged={loadSchoolIdentity}
          />
        );
      case 'jadwal':
        return <JadwalModule user={user} school={school} onToast={addToast} />;
      case 'absensi':
        return <AbsensiModule school={school} onToast={addToast} />;
      case 'rekap-absensi':
        return <RekapAbsensiModule user={user} school={school} onToast={addToast} />;
      case 'input-nilai':
        return <InputNilaiModule user={user} school={school} onToast={addToast} />;
      case 'rekap-nilai':
        return <RekapNilaiModule user={user} school={school} />;
      case 'jurnal':
        return <JurnalModule user={user} school={school} onToast={addToast} />;
      case 'karakter':
        return <KarakterModule user={user} school={school} onToast={addToast} />;
      case 'kesehatan':
        return <KesehatanModule user={user} onToast={addToast} />;
      case 'bimbingan':
        return <BimbinganModule user={user} onToast={addToast} />;
      case 'prestasi':
        return <PrestasiModule user={user} school={school} onToast={addToast} />;
      case 'piket':
        return <PiketModule user={user} school={school} onToast={addToast} />;
      case 'agenda':
        return <AgendaModule user={user} onToast={addToast} />;
      case 'penghubung':
        return <PenghubungModule user={user} onToast={addToast} />;
      case 'inventaris':
        return <InventarisModule user={user} onToast={addToast} />;
      case 'dokumentasi':
        return <DokumentasiModule user={user} onToast={addToast} />;
      case 'pengguna':
        return (
          <PenggunaModule
            onToast={addToast}
            currentUserId={user.id_user}
            onCurrentUserUpdated={(updatedUser) => {
              setSession((prev) => {
                if (!prev) return prev;
                const nextSession = { ...prev, user: updatedUser };
                setStoredSession(nextSession);
                return nextSession;
              });
            }}
          />
        );
      case 'pengaturan':
        return (
          <PengaturanModule
            school={school}
            onSchoolUpdated={() => {
              loadSchoolIdentity();
              setConnectionMode(getConnectionMode());
            }}
            onConnectionChanged={(requireRelogin) => {
              setConnectionMode(getConnectionMode());
              if (requireRelogin) {
                setStoredSession(null);
                setSession(null);
                setActiveMenu('dashboard');
              } else {
                loadSchoolIdentity();
              }
            }}
            onToast={addToast}
          />
        );
      case 'laporan':
        return <LaporanModule school={school} onToast={addToast} />;
      case 'backup':
        return <BackupModule onToast={addToast} />;
      default:
        return (
          <DashboardModule
            user={user}
            school={school}
            onNavigate={handleSelectMenu}
            onToast={addToast}
          />
        );
    }
  };

  return (
    <div className={`min-h-screen flex bg-[#F8FAFC] ${ifpMode ? 'ifp-mode' : ''}`}>
      <Sidebar
        role={user.role}
        activeMenu={activeMenu}
        onSelectMenu={handleSelectMenu}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        schoolName={school.nama_sekolah}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <Header
          user={user}
          activeMenu={activeMenu}
          school={school}
          connectionMode={connectionMode}
          ifpMode={ifpMode}
          onToggleIfpMode={() => setIfpMode((v) => !v)}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onOpenConnectionModal={() => {
            setGasUrlInput(getConfiguredGasUrl());
            setConnModalOpen(true);
          }}
          onOpenProfile={() => {
            setProfilePhoto(user.foto_url || '');
            setProfileOpen(true);
          }}
          onLogout={handleLogout}
        />

        {window.kelaskuDesktop?.isDesktop &&
          desktopUpdate &&
          (desktopUpdate.status === 'available' ||
            desktopUpdate.status === 'progress' ||
            desktopUpdate.status === 'downloaded') && (
            <div className="bg-[#F5F3FF] border-b border-[#DDD6FE] px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[#4C1D95] no-print">
              <div className="flex items-center gap-2 font-medium">
                <RefreshCw
                  className={`w-3.5 h-3.5 shrink-0 ${
                    desktopUpdate.status !== 'downloaded' ? 'animate-spin' : ''
                  }`}
                />
                <span>{desktopUpdate.message}</span>
              </div>
              {desktopUpdate.status === 'downloaded' && (
                <button
                  type="button"
                  onClick={() => window.kelaskuDesktop?.installUpdate()}
                  className="px-3 py-1 rounded-md bg-[#6D28D9] text-white font-semibold hover:bg-[#4C1D95] cursor-pointer"
                >
                  Pasang & Mulai Ulang
                </button>
              )}
            </div>
          )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          {renderModule()}
        </main>
        <AppFooter className="border-t border-[#E5E7EB]/80 bg-white/70" />
      </div>

      {/* Modal Koneksi Database */}
      <Modal
        open={connModalOpen}
        onClose={() => setConnModalOpen(false)}
        title="Status Koneksi"
        subtitle="Hubungkan ke layanan sekolah atau gunakan Mode Browser Lokal."
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          <div className="text-xs text-[#64748B]">
            Mode aktif saat ini:{' '}
            <strong className="text-[#1E1B4B]">
              {connectionMode === 'GAS'
                ? 'Terhubung ke Layanan Sekolah'
                : 'Mode Browser Lokal'}
            </strong>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">URL Google Apps Script Web App</label>
            <input
              type="url"
              value={gasUrlInput}
              onChange={(e) => setGasUrlInput(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg"
            />
            <p className="mt-1 text-[11px] text-[#64748B]">
              Ganti URL Web App untuk menghubungkan aplikasi ke database Spreadsheet sekolah lain tanpa mengubah kode.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E5E7EB] space-y-2">
            <div className="text-xs font-semibold text-[#1E1B4B]">Skrip Layanan (Code.gs)</div>
            <p className="text-xs text-[#64748B]">
              Salin atau unduh file <code className="bg-slate-100 px-1 rounded">Code.gs</code> terbaru untuk ditempel di Google Apps Script.
            </p>
            <div className="flex flex-wrap gap-2">
              <SecondaryButton
                onClick={async () => {
                  const ok = await copyGasCodeToClipboard();
                  if (ok) addToast('success', 'Code.gs Disalin', 'Tempel ke editor Apps Script lalu Deploy New version.');
                  else addToast('error', 'Gagal Menyalin', 'Gunakan tombol Unduh Code.gs.');
                }}
              >
                <Copy className="w-3.5 h-3.5" />
                Salin Code.gs
              </SecondaryButton>
              <SecondaryButton
                onClick={() => {
                  downloadGasCodeFile();
                  addToast('success', 'Code.gs Diunduh', 'File Code.gs siap ditempel ke Apps Script.');
                }}
              >
                <Download className="w-3.5 h-3.5" />
                Unduh Code.gs
              </SecondaryButton>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 justify-end pt-2 border-t border-[#E5E7EB]">
            {getDefaultGasUrl() && (
              <SecondaryButton
                onClick={() => {
                  const prevUrl = getConfiguredGasUrl();
                  const def = resetGasUrlToDefault();
                  setGasUrlInput(def);
                  setConnectionMode(getConnectionMode());
                  setConnModalOpen(false);
                  if (def !== prevUrl) {
                    setStoredSession(null);
                    setSession(null);
                    setActiveMenu('dashboard');
                  }
                  addToast('info', 'URL Apps Script direset ke bawaan');
                }}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Bawaan
              </SecondaryButton>
            )}
            <SecondaryButton
              onClick={() => {
                const prevMode = getConnectionMode();
                enableLocalMode();
                setConnectionMode(getConnectionMode());
                setConnModalOpen(false);
                if (prevMode !== 'LOCAL') {
                  setStoredSession(null);
                  setSession(null);
                  setActiveMenu('dashboard');
                }
                addToast('info', 'Mode Browser Lokal aktif');
              }}
            >
              Gunakan Mode Lokal
            </SecondaryButton>
            <PrimaryButton
              onClick={() => {
                const check = validateGasWebAppUrl(gasUrlInput);
                if (!check.valid) {
                  addToast('warning', 'URL Tidak Valid', check.message);
                  return;
                }
                const prevUrl = getConfiguredGasUrl();
                setConfiguredGasUrl(check.cleaned);
                setConnectionMode(getConnectionMode());
                setConnModalOpen(false);
                if (check.cleaned !== prevUrl) {
                  setStoredSession(null);
                  setSession(null);
                  setActiveMenu('dashboard');
                  addToast(
                    'success',
                    'URL Google Apps Script diperbarui',
                    'Silakan masuk menggunakan akun pada database sekolah yang baru.'
                  );
                } else {
                  addToast('success', 'URL Google Apps Script tersimpan');
                }
              }}
            >
              Simpan URL GAS
            </PrimaryButton>
          </div>
        </div>
      </Modal>

      {/* Modal Profil & Foto Akun */}
      <Modal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        title="Profil & Foto Akun"
        subtitle="Unggah foto profil akun Anda. Jika belum ada foto, inisial nama otomatis ditampilkan."
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3.5 p-3.5 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl">
            <UserAvatar src={profilePhoto} name={user.nama_lengkap} size="lg" className="shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-bold text-[#1E1B4B] whitespace-normal break-words leading-snug">
                {user.nama_lengkap}
              </div>
              <div className="text-xs text-[#64748B] font-mono break-all">@{user.username}</div>
              <div className="text-xs font-semibold text-[#6D28D9] mt-0.5">
                {ROLE_LABELS[user.role]}
              </div>
            </div>
          </div>

          <PhotoUploadField
            value={profilePhoto}
            name={user.nama_lengkap}
            label="Upload Foto Profil (Max 200 KB)"
            onChange={setProfilePhoto}
            onError={(msg) => addToast('error', 'Upload Foto Gagal', msg)}
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E7EB]">
            <SecondaryButton onClick={() => setProfileOpen(false)} disabled={profileSaving}>
              Batal
            </SecondaryButton>
            <PrimaryButton
              loading={profileSaving}
              onClick={async () => {
                setProfileSaving(true);
                const res = await callApi<AuthUser>('updateOwnProfile', {
                  foto_url: profilePhoto,
                });
                setProfileSaving(false);
                if (res.success && res.data) {
                  const nextSession = { ...session, user: res.data };
                  setStoredSession(nextSession);
                  setSession(nextSession);
                  setProfileOpen(false);
                  addToast('success', 'Foto Profil Disimpan', 'Foto akun berhasil diperbarui.');
                } else {
                  addToast('error', 'Gagal Menyimpan Profil', res.message);
                }
              }}
            >
              Simpan Foto Profil
            </PrimaryButton>
          </div>
        </div>
      </Modal>

      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </div>
  );
}
