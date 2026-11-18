import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  RefreshCw,
  User,
} from 'lucide-react';
import { callApi, setStoredSession } from '../services/api';
import { DesktopUpdateStatus, SessionData, ToastItem } from '../types';
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
  const [showPass, setShowPass] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [desktopUpdate, setDesktopUpdate] = useState<DesktopUpdateStatus | null>(null);

  React.useEffect(() => {
    if (window.kelaskuDesktop?.onUpdateStatus) {
      return window.kelaskuDesktop.onUpdateStatus((status) => {
        setDesktopUpdate(status);
      });
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
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

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-white border border-[#E5E7EB] rounded-2xl shadow-sm p-6 sm:p-8">
        {/* Centered Header & Emblem */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <BrandEmblem className="w-12 h-12" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1E1B4B]">KELASKU SMART</h1>
          <p className="mt-1 text-xs font-semibold tracking-widest text-[#6D28D9] uppercase">
            UPT SD NEGERI REMEN 2
          </p>
          <p className="mt-2 text-sm text-[#64748B]">
            Sistem Administrasi dan Manajemen Sekolah
          </p>
        </div>

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

      <AppFooter className="mt-4" />
    </div>
  );
}
