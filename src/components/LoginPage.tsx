import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Database,
  Download,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  RefreshCw,
  RotateCcw,
  User,
} from 'lucide-react';
import {
  callApi,
  enableLocalMode,
  getConfiguredGasUrl,
  getConnectionMode,
  getDefaultGasUrl,
  isUsingCustomGasUrl,
  resetGasUrlToDefault,
  setConfiguredGasUrl,
  setStoredSession,
  validateGasWebAppUrl,
} from '../services/api';
import { ConnectionMode, DesktopUpdateStatus, SessionData, ToastItem } from '../types';
import { AppFooter, BrandEmblem, Modal, PrimaryButton, SecondaryButton } from './UI';
import { copyGasCodeToClipboard, downloadGasCodeFile } from '../utils/gasCode';

type ToastFn = (type: ToastItem['type'], title: string, message?: string) => void;

export function LoginPage({
  onLoginSuccess,
  onConnectionChange,
  onToast,
}: {
  onLoginSuccess: (session: SessionData) => void;
  onConnectionChange: () => void;
  onToast?: ToastFn;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [mode, setMode] = useState<ConnectionMode>(getConnectionMode());
  const [needsInitialAdmin, setNeedsInitialAdmin] = useState(false);
  const [schoolName, setSchoolName] = useState('');
  const [checkingConn, setCheckingConn] = useState(false);

  const [connModalOpen, setConnModalOpen] = useState(false);
  const [gasUrlInput, setGasUrlInput] = useState(getConfiguredGasUrl());
  const [connDiagnostic, setConnDiagnostic] = useState('');
  const [gasOutdated, setGasOutdated] = useState(false);
  const [registeredUsernames, setRegisteredUsernames] = useState<string[]>([]);
  const [codeCopied, setCodeCopied] = useState(false);
  const [desktopUpdate, setDesktopUpdate] = useState<DesktopUpdateStatus | null>(null);
  const isDesktop = Boolean(window.kelaskuDesktop?.isDesktop);
  const desktopVersion = window.kelaskuDesktop?.appVersion || '';

  // First-time Admin registration (only when DB has 0 users)
  const [initModalOpen, setInitModalOpen] = useState(false);
  const [initName, setInitName] = useState('');
  const [initUsername, setInitUsername] = useState('');
  const [initPassword, setInitPassword] = useState('');
  const [initLoading, setInitLoading] = useState(false);
  const [initError, setInitError] = useState('');

  const checkDatabaseStatus = async () => {
    const currentMode = getConnectionMode();
    setMode(currentMode);
    if (currentMode === 'UNCONFIGURED') {
      setNeedsInitialAdmin(false);
      setSchoolName('');
      setGasOutdated(false);
      setRegisteredUsernames([]);
      setConnDiagnostic('Database belum dihubungkan.');
      return;
    }

    setCheckingConn(true);
    callApi<{
      status: string;
      needs_initial_admin: boolean;
      nama_sekolah?: string;
      gas_version?: string;
      user_count?: number;
      usernames?: string[];
    }>('ping').then((res) => {
      setCheckingConn(false);
      if (res.success && res.data) {
        setNeedsInitialAdmin(!!res.data.needs_initial_admin);
        setSchoolName((res.data.nama_sekolah || '').trim());
        setRegisteredUsernames(Array.isArray(res.data.usernames) ? res.data.usernames : []);
        if (currentMode === 'GAS') {
          const isOutdated = !res.data.gas_version;
          setGasOutdated(isOutdated);
          const verNote = isOutdated
            ? ' (Versi Code.gs lama — wajib Deploy New version di Apps Script)'
            : ` (Code.gs terbaru aktif · ${res.data.user_count ?? 0} akun)`;
          setConnDiagnostic(`Terhubung ke Google Apps Script${verNote}`);
        } else {
          setGasOutdated(false);
          setConnDiagnostic('Mode Browser Lokal aktif.');
        }
      } else {
        setSchoolName('');
        setGasOutdated(false);
        setRegisteredUsernames([]);
        setConnDiagnostic(res.message || 'Gagal terhubung ke database.');
      }
    });
  };

  useEffect(() => {
    checkDatabaseStatus();
    if (window.kelaskuDesktop?.onUpdateStatus) {
      return window.kelaskuDesktop.onUpdateStatus((status) => {
        setDesktopUpdate(status);
      });
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (mode === 'UNCONFIGURED') {
      const msg = 'Database belum terhubung. Silakan atur koneksi Google Apps Script terlebih dahulu.';
      setError(msg);
      onToast?.('warning', 'Koneksi Diperlukan', msg);
      setConnModalOpen(true);
      return;
    }
    if (!username.trim() || !password) {
      const msg = 'Username dan password wajib diisi.';
      setError(msg);
      onToast?.('warning', 'Data Belum Lengkap', msg);
      return;
    }

    setLoading(true);
    const res = await callApi<SessionData>('loginUser', {
      username: username.trim(),
      password,
    });
    setLoading(false);

    if (!res.success || !res.data) {
      let msg = res.message || 'Login gagal. Periksa kembali username dan password Anda.';
      if (mode === 'GAS' && gasOutdated && msg === 'Username atau password tidak sesuai.') {
        msg =
          'URL Google Apps Script masih menjalankan Code.gs versi lama (belum ada akun admin). Salin gas-backend/Code.gs terbaru → Deploy → Manage deployments → Edit → New version → Deploy.';
      }
      setError(msg);
      onToast?.('error', 'Login Gagal', msg);
      return;
    }

    setStoredSession(res.data);
    onLoginSuccess(res.data);
  };

  const handleSaveGasUrl = async () => {
    const check = validateGasWebAppUrl(gasUrlInput);
    if (!check.valid) {
      const msg = check.message || 'Masukkan URL Web App Google Apps Script yang valid.';
      setError(msg);
      onToast?.('warning', 'URL Tidak Valid', msg);
      return;
    }
    setError('');
    setStoredSession(null);
    setConfiguredGasUrl(check.cleaned);
    setGasUrlInput(check.cleaned);
    onConnectionChange();
    onToast?.('success', 'Koneksi Tersimpan', 'Menghubungkan ke database sekolah...');
    await checkDatabaseStatus();
  };

  const handleResetDefaultGasUrl = async () => {
    const def = resetGasUrlToDefault();
    setStoredSession(null);
    setGasUrlInput(def);
    onConnectionChange();
    onToast?.('info', 'URL Direset', def ? 'Kembali menggunakan URL Apps Script bawaan.' : 'URL kustom dihapus.');
    await checkDatabaseStatus();
  };

  const handleSetupSheets = async () => {
    setCheckingConn(true);
    const res = await callApi<{ needs_initial_admin: boolean; default_admin_created?: boolean }>('setupDatabase');
    setCheckingConn(false);
    if (res.success) {
      setNeedsInitialAdmin(!!res.data?.needs_initial_admin);
      setConnDiagnostic('Sistem & akun admin (admin / admin123) siap digunakan.');
      onToast?.('success', 'Sistem Siap', 'Struktur data & akun admin awal berhasil diverifikasi.');
    } else {
      setConnDiagnostic(res.message);
      onToast?.('error', 'Inisialisasi Gagal', res.message);
    }
  };

  const handleEnableLocalMode = async () => {
    setStoredSession(null);
    enableLocalMode();
    onConnectionChange();
    setConnModalOpen(false);
    onToast?.('info', 'Mode Browser Lokal Aktif', 'Database lokal kosong siap digunakan.');
    await checkDatabaseStatus();
  };

  const handleCopyGasCode = async () => {
    const ok = await copyGasCodeToClipboard();
    if (ok) {
      setCodeCopied(true);
      onToast?.('success', 'Code.gs Disalin', 'Tempel ke editor Google Apps Script (Code.gs) lalu Deploy ulang.');
      window.setTimeout(() => setCodeCopied(false), 3000);
    } else {
      onToast?.('error', 'Gagal Menyalin', 'Silakan gunakan tombol Unduh Code.gs.');
    }
  };

  const handleDownloadGasCode = () => {
    downloadGasCodeFile();
    onToast?.('success', 'Code.gs Diunduh', 'Buka file Code.gs lalu salin isinya ke Google Apps Script.');
  };

  const handleCreateInitialAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setInitError('');
    if (!initName.trim() || !initUsername.trim() || !initPassword) {
      setInitError('Semua kolom wajib diisi.');
      return;
    }
    setInitLoading(true);
    const res = await callApi('createInitialAdmin', {
      nama_lengkap: initName.trim(),
      username: initUsername.trim(),
      password: initPassword,
    });
    setInitLoading(false);
    if (!res.success) {
      setInitError(res.message);
      onToast?.('error', 'Gagal Membuat Admin', res.message);
      return;
    }
    setInitModalOpen(false);
    setUsername(initUsername.trim());
    setPassword('');
    setNeedsInitialAdmin(false);
    onToast?.('success', 'Administrator Dibuat', 'Akun Administrator pertama berhasil dibuat. Silakan masuk.');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-white border border-[#E5E7EB] rounded-2xl shadow-sm p-6 sm:p-8">
        {/* Centered Header & Emblem (No KS letter logo) */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <BrandEmblem className="w-12 h-12" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1E1B4B]">KELASKU SMART</h1>
          <p className="mt-1 text-xs font-semibold tracking-widest text-[#6D28D9] uppercase">
            SCHOOL MANAGEMENT PLATFORM
          </p>
          {schoolName && (
            <p className="mt-1.5 text-sm font-bold text-[#1E1B4B]">{schoolName}</p>
          )}
          <p className="mt-2 text-sm text-[#64748B]">
            Sistem Administrasi dan Manajemen Sekolah
          </p>
        </div>

        {/* Outdated GAS Deployment Alert */}
        {mode === 'GAS' && gasOutdated && (
          <div className="mt-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
            <span className="font-semibold block">
              Web App Google Apps Script masih memakai Code.gs versi lama
            </span>
            <span className="block">
              Di Apps Script, tempel <code className="bg-amber-100 px-1 rounded">Code.gs</code>{' '}
              terbaru, jalankan <code className="bg-amber-100 px-1 rounded">buatAkunAdmin</code>, lalu klik{' '}
              <strong>Deploy → Manage deployments → Edit → Version: New version → Deploy</strong>.
            </span>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={handleCopyGasCode}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-900 text-white hover:bg-amber-950 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                {codeCopied ? 'Code.gs Tersalin' : 'Salin Code.gs'}
              </button>
              <button
                type="button"
                onClick={handleDownloadGasCode}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Unduh Code.gs
              </button>
            </div>
          </div>
        )}

        {/* Initial Setup Prompt when DB has 0 users */}
        {mode !== 'UNCONFIGURED' && needsInitialAdmin && (
          <div className="mt-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-3">
            <div className="text-xs text-amber-900">
              <span className="font-semibold block">Belum ada akun pengguna terdaftar</span>
              <span>Buat akun Administrator pertama untuk mulai mengelola sekolah.</span>
            </div>
            <button
              type="button"
              onClick={() => setInitModalOpen(true)}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-[#6D28D9] rounded-lg hover:bg-[#4C1D95] whitespace-nowrap shrink-0 cursor-pointer"
            >
              Buat Admin
            </button>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          {error && (
            <div
              role="alert"
              className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-[#DC2626]"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label
              htmlFor="login-username"
              className="block text-xs font-semibold text-[#1E1B4B] mb-1.5"
            >
              Username
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="login-username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username"
                className="w-full pl-10 pr-3.5 py-2.5 text-sm text-[#1E1B4B] bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6D28D9] focus:border-[#6D28D9]"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="block text-xs font-semibold text-[#1E1B4B] mb-1.5"
            >
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="login-password"
                type={showPass ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
                className="w-full pl-10 pr-10 py-2.5 text-sm text-[#1E1B4B] bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6D28D9] focus:border-[#6D28D9]"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#1E1B4B] cursor-pointer"
                aria-label={showPass ? 'Sembunyikan password' : 'Tampilkan password'}
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <PrimaryButton type="submit" loading={loading} className="w-full py-2.5">
            {loading ? 'Memverifikasi...' : 'Masuk'}
          </PrimaryButton>
        </form>
      </div>

      {/* Modal Pengaturan Koneksi Google Apps Script */}
      <Modal
        open={connModalOpen}
        onClose={() => setConnModalOpen(false)}
        title="Pengaturan Koneksi"
        subtitle="Hubungkan aplikasi ke layanan sekolah atau gunakan Mode Lokal."
        maxWidth="max-w-lg"
      >
        <div className="space-y-5">
          {connDiagnostic && (
            <div className="p-3 rounded-lg bg-slate-50 border border-[#E5E7EB] text-xs text-[#1E1B4B] space-y-1">
              <div>
                <strong>Status:</strong> {connDiagnostic}
              </div>
              {registeredUsernames.length > 0 && (
                <div className="text-[#64748B]">
                  <strong>Username terdaftar:</strong>{' '}
                  <span className="font-mono text-[#1E1B4B]">{registeredUsernames.join(', ')}</span>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#1E1B4B] mb-1.5">
              URL Google Apps Script Web App
            </label>
            <input
              type="url"
              value={gasUrlInput}
              onChange={(e) => setGasUrlInput(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full px-3.5 py-2.5 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
            />
            <p className="mt-1.5 text-xs text-[#64748B]">
              Pengguna/sekolah lain dapat mengganti URL ini kapan saja tanpa mengubah kode. Deploy{' '}
              <code className="bg-slate-100 px-1 rounded">Code.gs</code> sebagai Web App (Execute as: Me,
              Who has access: Anyone) dan gunakan URL berakhiran <code className="bg-slate-100 px-1 rounded">/exec</code>.
            </p>
            {isDesktop && (
              <p className="mt-1 text-[11px] text-[#4C1D95] bg-[#F5F3FF] border border-[#DDD6FE] rounded-md px-2.5 py-1.5">
                Tersimpan permanen untuk aplikasi Desktop (.exe). Operator juga dapat menaruh file{' '}
                <code className="bg-white px-1 rounded">appscript-url.txt</code> di folder yang sama dengan file .exe.
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <PrimaryButton onClick={handleSaveGasUrl} loading={checkingConn}>
              <CheckCircle2 className="w-4 h-4" />
              Simpan & Cek Koneksi
            </PrimaryButton>
            {getDefaultGasUrl() && (
              <SecondaryButton onClick={handleResetDefaultGasUrl} disabled={checkingConn}>
                <RotateCcw className="w-4 h-4" />
                Reset Bawaan
              </SecondaryButton>
            )}
            {mode === 'GAS' && (
              <SecondaryButton onClick={handleSetupSheets} disabled={checkingConn}>
                {checkingConn && <Loader2 className="w-4 h-4 animate-spin" />}
                Inisialisasi Sistem
              </SecondaryButton>
            )}
          </div>

          <div className="pt-4 border-t border-[#E5E7EB] space-y-2">
            <div className="text-xs font-semibold text-[#1E1B4B]">Skrip Layanan (Code.gs)</div>
            <p className="text-xs text-[#64748B]">
              Salin atau unduh file <code className="bg-slate-100 px-1 rounded">Code.gs</code> terbaru untuk ditempel di editor Google Apps Script sekolah.
            </p>
            <div className="flex flex-wrap gap-2">
              <SecondaryButton onClick={handleCopyGasCode}>
                <Copy className="w-4 h-4" />
                {codeCopied ? 'Code.gs Tersalin' : 'Salin Code.gs'}
              </SecondaryButton>
              <SecondaryButton onClick={handleDownloadGasCode}>
                <Download className="w-4 h-4" />
                Unduh Code.gs
              </SecondaryButton>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E5E7EB] space-y-2">
            <div className="text-xs font-semibold text-[#1E1B4B]">Mode Penyimpanan Lokal</div>
            <p className="text-xs text-[#64748B]">
              Gunakan penyimpanan browser lokal jika Google Apps Script belum terhubung.
            </p>
            <SecondaryButton onClick={handleEnableLocalMode}>
              Aktifkan Mode Browser Lokal
            </SecondaryButton>
          </div>
        </div>
      </Modal>

      {/* Modal Buat Admin Pertama */}
      <Modal
        open={initModalOpen}
        onClose={() => setInitModalOpen(false)}
        title="Inisialisasi Akun Administrator Awal"
        subtitle="Belum ada pengguna terdaftar. Buat akun Administrator pertama sekolah."
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateInitialAdmin} className="space-y-4">

          {initError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-[#DC2626]">
              {initError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#1E1B4B] mb-1">
              Nama Lengkap Administrator
            </label>
            <input
              type="text"
              required
              value={initName}
              onChange={(e) => setInitName(e.target.value)}
              placeholder="Contoh: Operator Sekolah"
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1E1B4B] mb-1">Username</label>
            <input
              type="text"
              required
              value={initUsername}
              onChange={(e) => setInitUsername(e.target.value)}
              placeholder="admin"
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1E1B4B] mb-1">Password</label>
            <input
              type="text"
              required
              value={initPassword}
              onChange={(e) => setInitPassword(e.target.value)}
              placeholder="Buat password"
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <SecondaryButton onClick={() => setInitModalOpen(false)}>Batal</SecondaryButton>
            <PrimaryButton type="submit" loading={initLoading}>
              Simpan Administrator
            </PrimaryButton>
          </div>
        </form>
      </Modal>

      <AppFooter className="mt-4" />
    </div>
  );
}
