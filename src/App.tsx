import React, { useCallback, useEffect, useState } from 'react';
import { canAccessMenu, ROLE_LABELS } from './config/navigation';
import {
  callApi,
  enableLocalMode,
  getConfiguredGasUrl,
  getConnectionMode,
  getStoredSession,
  setConfiguredGasUrl,
  setStoredSession,
} from './services/api';
import { AuthUser, ConnectionMode, MenuId, SchoolIdentity, SessionData, ToastItem } from './types';
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
        return <RekapAbsensiModule user={user} school={school} />;
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
        return <PiketModule user={user} onToast={addToast} />;
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

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          {renderModule()}
        </main>
        <AppFooter className="border-t border-[#E5E7EB]/80 bg-white/70" />
      </div>

      {/* Modal Koneksi Database */}
      <Modal
        open={connModalOpen}
        onClose={() => setConnModalOpen(false)}
        title="Status Koneksi Database"
        subtitle="Hubungkan ke Google Apps Script Web App sekolah atau gunakan Mode Browser Lokal."
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          <div className="text-xs text-[#64748B]">
            Mode aktif saat ini:{' '}
            <strong className="text-[#1E1B4B]">
              {connectionMode === 'GAS'
                ? 'Terhubung ke Database (GAS Web App)'
                : 'Mode Browser Lokal (Belum terhubung Database)'}
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
          </div>
          <div className="flex flex-wrap gap-2 justify-end pt-2 border-t border-[#E5E7EB]">
            <SecondaryButton
              onClick={() => {
                enableLocalMode();
                setConnectionMode(getConnectionMode());
                setConnModalOpen(false);
                addToast('info', 'Mode Browser Lokal aktif');
              }}
            >
              Gunakan Mode Lokal
            </SecondaryButton>
            <PrimaryButton
              onClick={() => {
                if (!gasUrlInput.trim()) {
                  addToast('warning', 'Masukkan URL Web App GAS terlebih dahulu');
                  return;
                }
                setConfiguredGasUrl(gasUrlInput);
                setConnectionMode(getConnectionMode());
                setConnModalOpen(false);
                addToast('success', 'URL Google Apps Script diperbarui');
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
        subtitle="Foto akun disimpan sebagai Base64 di database. Jika belum ada foto, avatar otomatis ditampilkan."
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3.5 p-3.5 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl">
            <UserAvatar src={profilePhoto} name={user.nama_lengkap} size="lg" />
            <div className="min-w-0">
              <div className="text-sm font-bold text-[#1E1B4B] truncate">{user.nama_lengkap}</div>
              <div className="text-xs text-[#64748B] font-mono truncate">@{user.username}</div>
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
                  addToast('success', 'Foto Profil Disimpan', 'Foto akun berhasil diperbarui di database.');
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
