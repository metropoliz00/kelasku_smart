import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Database,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  User,
} from 'lucide-react';
import {
  callApi,
  enableLocalMode,
  getConfiguredGasUrl,
  getConnectionMode,
  setConfiguredGasUrl,
  setStoredSession,
} from '../services/api';
import { ConnectionMode, SessionData, ToastItem } from '../types';
import { AppFooter, BrandEmblem, Modal, PrimaryButton, SecondaryButton } from './UI';

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
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [mode, setMode] = useState<ConnectionMode>(getConnectionMode());
  const [needsInitialAdmin, setNeedsInitialAdmin] = useState(false);
  const [schoolName, setSchoolName] = useState('');
  const [checkingConn, setCheckingConn] = useState(false);

  const [connModalOpen, setConnModalOpen] = useState(false);
  const [gasUrlInput, setGasUrlInput] = useState(getConfiguredGasUrl());
  const [connDiagnostic, setConnDiagnostic] = useState('');

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
      setConnDiagnostic('Database belum dihubungkan.');
      return;
    }

    setCheckingConn(true);
    const res = await callApi<{
      status: string;
      needs_initial_admin: boolean;
      nama_sekolah?: string;
      gas_version?: string;
      user_count?: number;
    }>('ping');
    setCheckingConn(false);
    if (res.success && res.data) {
      setNeedsInitialAdmin(!!res.data.needs_initial_admin);
      setSchoolName((res.data.nama_sekolah || '').trim());
      if (currentMode === 'GAS') {
        const verNote = res.data.gas_version ? ' (Code.gs terbaru aktif)' : ' (Versi Code.gs lama — perbarui deployment)';
        setConnDiagnostic(`Terhubung ke Google Apps Script${verNote}`);
      } else {
        setConnDiagnostic('Mode Browser Lokal aktif.');
      }
    } else {
      setSchoolName('');
      setConnDiagnostic(res.message || 'Gagal terhubung ke database.');
    }
  };

  useEffect(() => {
    checkDatabaseStatus();
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
      const msg = res.message || 'Login gagal. Periksa kembali username dan password Anda.';
      setError(msg);
      onToast?.('error', 'Login Gagal', msg);
      return;
    }

    setStoredSession(res.data);
    onLoginSuccess(res.data);
  };

  const handleSaveGasUrl = async () => {
    if (!gasUrlInput.trim()) {
      const msg = 'Masukkan URL Web App Google Apps Script yang valid.';
      setError(msg);
      onToast?.('warning', 'URL Tidak Valid', msg);
      return;
    }
    setConfiguredGasUrl(gasUrlInput.trim());
    onConnectionChange();
    onToast?.('success', 'Koneksi Tersimpan', 'Menghubungkan ke database sekolah...');
    await checkDatabaseStatus();
  };

  const handleSetupSheets = async () => {
    setCheckingConn(true);
    const res = await callApi<{ needs_initial_admin: boolean; default_admin_created?: boolean }>('setupDatabase');
    setCheckingConn(false);
    if (res.success) {
      setNeedsInitialAdmin(!!res.data?.needs_initial_admin);
      setConnDiagnostic('Struktur 21 sheet & akun admin (admin / admin123) siap digunakan.');
      onToast?.('success', 'Struktur Database Siap', 'Struktur database & akun admin awal berhasil diverifikasi.');
    } else {
      setConnDiagnostic(res.message);
      onToast?.('error', 'Inisialisasi Gagal', res.message);
    }
  };

  const handleEnableLocalMode = async () => {
    enableLocalMode();
    onConnectionChange();
    setConnModalOpen(false);
    onToast?.('info', 'Mode Browser Lokal Aktif', 'Database lokal kosong siap digunakan.');
    await checkDatabaseStatus();
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

        {/* Initial Setup Prompt when DB has 0 users */}
        {mode !== 'UNCONFIGURED' && needsInitialAdmin && (
          <div className="mt-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-3">
            <div className="text-xs text-amber-900">
              <span className="font-semibold block">Database masih kosong (0 pengguna)</span>
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

          <div className="pt-2 flex items-center justify-between text-xs text-[#64748B]">
            <span className="truncate">
              {mode === 'GAS'
                ? 'Database: Google Apps Script'
                : mode === 'LOCAL'
                ? 'Mode: Browser Lokal'
                : 'Database belum terhubung'}
            </span>
            <button
              type="button"
              onClick={() => {
                setGasUrlInput(getConfiguredGasUrl());
                setConnModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 font-semibold text-[#6D28D9] hover:text-[#4C1D95] shrink-0 cursor-pointer"
            >
              <Database className="w-3.5 h-3.5" />
              Atur Koneksi
            </button>
          </div>
        </form>
      </div>

      {/* Modal Pengaturan Koneksi Google Apps Script */}
      <Modal
        open={connModalOpen}
        onClose={() => setConnModalOpen(false)}
        title="Pengaturan Koneksi Backend"
        subtitle="Hubungkan aplikasi ke Google Apps Script Web App atau gunakan Mode Lokal."
        maxWidth="max-w-lg"
      >
        <div className="space-y-5">
          {connDiagnostic && (
            <div className="p-3 rounded-lg bg-slate-50 border border-[#E5E7EB] text-xs text-[#1E1B4B]">
              <strong>Status:</strong> {connDiagnostic}
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
              Deploy <code className="bg-slate-100 px-1 rounded">gas-backend/Code.gs</code> sebagai
              Web App (Execute as: Me, Who has access: Anyone). Jika mengubah kode di GAS, wajib
              pilih <strong>Manage deployments → Edit → New version → Deploy</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <PrimaryButton onClick={handleSaveGasUrl} loading={checkingConn}>
              <CheckCircle2 className="w-4 h-4" />
              Simpan & Cek Koneksi
            </PrimaryButton>
            {mode === 'GAS' && (
              <SecondaryButton onClick={handleSetupSheets} disabled={checkingConn}>
                {checkingConn && <Loader2 className="w-4 h-4 animate-spin" />}
                Jalankan setupDatabase()
              </SecondaryButton>
            )}
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
        subtitle="Belum ada pengguna di database. Buat akun Administrator pertama sekolah."
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
              type="password"
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
