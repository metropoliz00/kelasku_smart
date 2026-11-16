import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Info,
  Loader2,
  Trash2,
  Upload,
  User,
  X,
  AlertTriangle,
} from 'lucide-react';
import { ToastItem } from '../types';
import {
  downloadExcelTemplate,
  ExcelColumnSpec,
  parseAndValidateExcelFile,
  ParsedExcelRow,
} from '../utils/excel';
import { processPhotoUpload } from '../utils/image';

export function BrandEmblem({ className = 'w-9 h-9' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="40" height="40" rx="10" fill="#6D28D9" />
      <path
        d="M11 13.5C11 12.1193 12.1193 11 13.5 11H19V28.5H13.5C12.1193 28.5 11 27.3807 11 26V13.5Z"
        fill="#EDE9FE"
      />
      <path
        d="M21 11H26.5C27.8807 11 29 12.1193 29 13.5V26C29 27.3807 27.8807 28.5 26.5 28.5H21V11Z"
        fill="#FFFFFF"
      />
      <path d="M20 9.5L25.5 12.5L20 15.5L14.5 12.5L20 9.5Z" fill="#F59E0B" />
    </svg>
  );
}

const AVATAR_TONES = [
  'bg-[#EDE9FE] text-[#4C1D95] border-[#DDD6FE]',
  'bg-blue-100 text-blue-800 border-blue-200',
  'bg-emerald-100 text-emerald-800 border-emerald-200',
  'bg-amber-100 text-amber-800 border-amber-200',
  'bg-rose-100 text-rose-800 border-rose-200',
];

function getInitials(name?: string): string {
  const clean = String(name || '').trim();
  if (!clean) return '';
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

function pickAvatarTone(name?: string): string {
  const s = String(name || '');
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  }
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}

export function UserAvatar({
  src,
  name,
  size = 'md',
  className = '',
}: {
  src?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const sizeClass: Record<'xs' | 'sm' | 'md' | 'lg' | 'xl', string> = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-base',
    xl: 'w-20 h-20 text-xl',
  };

  const validSrc = src && src.trim() !== '' && !failed ? src.trim() : '';
  const initials = getInitials(name);
  const tone = pickAvatarTone(name);

  if (validSrc) {
    return (
      <div
        className={`rounded-full overflow-hidden border border-[#DDD6FE] bg-[#F5F3FF] shrink-0 ${sizeClass[size]} ${className}`}
      >
        <img
          src={validSrc}
          alt={name || 'Foto profil'}
          onError={() => setFailed(true)}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`rounded-full border flex items-center justify-center font-bold select-none shrink-0 ${tone} ${sizeClass[size]} ${className}`}
      aria-label={name || 'Avatar pengguna'}
    >
      {initials || <User className="w-1/2 h-1/2" />}
    </div>
  );
}

export function PhotoUploadField({
  value,
  name,
  label = 'Foto Profil',
  onChange,
  onError,
}: {
  value?: string;
  name?: string;
  label?: string;
  onChange: (base64: string) => void;
  onError?: (msg: string) => void;
}) {
  const [processing, setProcessing] = useState(false);
  const [localError, setLocalError] = useState('');
  const inputId = React.useId();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setLocalError('');
    setProcessing(true);
    try {
      const base64 = await processPhotoUpload(file);
      onChange(base64);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal memproses foto.';
      setLocalError(msg);
      onError?.(msg);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="p-3.5 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl">
      <div className="text-xs font-semibold text-[#1E1B4B] mb-2.5">{label}</div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <UserAvatar src={value} name={name} size="xl" />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <label
              htmlFor={inputId}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#6D28D9] bg-white border border-[#6D28D9]/40 rounded-lg hover:bg-[#F5F3FF] hover:border-[#6D28D9] transition-colors whitespace-nowrap cursor-pointer"
            >
              {processing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              {value ? 'Ganti Foto' : 'Upload Foto'}
            </label>
            <input
              id={inputId}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFileChange}
              disabled={processing}
              className="hidden"
            />
            {value && (
              <button
                type="button"
                onClick={() => {
                  setLocalError('');
                  onChange('');
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#DC2626] bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors whitespace-nowrap cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Hapus Foto
              </button>
            )}
          </div>
          <p className="text-[11px] text-[#64748B]">
            Format JPG, PNG, atau WEBP · Maksimal <strong>200 KB</strong> · Disimpan sebagai Base64 di database (otomatis menjadi avatar jika kosong).
          </p>
          {localError && <p className="text-xs font-medium text-[#DC2626]">{localError}</p>}
        </div>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-[#E5E7EB]">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1E1B4B]">{title}</h1>
        {description && <p className="mt-1 text-sm text-[#64748B]">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5 shrink-0">{actions}</div>}
    </div>
  );
}

export function PrimaryButton({
  children,
  onClick,
  type = 'button',
  disabled = false,
  loading = false,
  className = '',
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  title?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      title={title}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#6D28D9] rounded-lg hover:bg-[#4C1D95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6D28D9] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 cursor-pointer ${className}`}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  onClick,
  type = 'button',
  disabled = false,
  className = '',
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  className?: string;
  title?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-[#6D28D9] bg-white border border-[#6D28D9]/40 rounded-lg hover:bg-[#F5F3FF] hover:border-[#6D28D9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6D28D9] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 cursor-pointer ${className}`}
    >
      {children}
    </button>
  );
}

export function DangerButton({
  children,
  onClick,
  disabled = false,
  className = '',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#DC2626] rounded-lg hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DC2626] focus-visible:ring-offset-2 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${className}`}
    >
      {children}
    </button>
  );
}

export function StatusText({
  status,
  tone,
}: {
  status: string;
  tone?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
}) {
  const resolvedTone =
    tone ||
    (() => {
      const s = status.toLowerCase();
      if (['aktif', 'hadir', 'baik', 'selesai', 'dikonfirmasi', 'membudaya'].includes(s)) return 'success';
      if (['izin', 'terlambat', 'rusak ringan', 'pantauan', 'proses', 'draft', 'dibaca'].includes(s)) return 'warning';
      if (['alpa', 'nonaktif', 'rusak berat', 'pindah', 'perlu bimbingan'].includes(s)) return 'danger';
      if (['sakit', 'terkirim', 'lulus', 'arsip'].includes(s)) return 'info';
      return 'neutral';
    })();

  const colorMap = {
    success: 'text-[#16A34A] bg-emerald-50 border-emerald-200',
    warning: 'text-[#B45309] bg-amber-50 border-amber-200',
    danger: 'text-[#DC2626] bg-red-50 border-red-200',
    info: 'text-[#2563EB] bg-blue-50 border-blue-200',
    neutral: 'text-[#64748B] bg-slate-50 border-slate-200',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium border rounded-md whitespace-nowrap ${colorMap[resolvedTone]}`}
    >
      {status || '-'}
    </span>
  );
}

export function EmptyState({
  title = 'Belum ada data',
  description = 'Data akan tampil di sini setelah Anda menambahkannya atau mengimpor dari Excel.',
  action,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center bg-white border border-[#E5E7EB] rounded-xl">
      <div className="w-12 h-12 rounded-xl bg-[#F5F3FF] text-[#6D28D9] flex items-center justify-center mb-3">
        <Info className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-[#1E1B4B]">{title}</h3>
      <p className="mt-1 text-sm text-[#64748B] max-w-md">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function TableSkeleton({ cols = 5, rows = 4 }: { cols?: number; rows?: number }) {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
      <div className="h-10 bg-[#EDE9FE]" />
      <div className="divide-y divide-[#E5E7EB]">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="grid gap-4 px-4 py-3.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
            {Array.from({ length: cols }).map((__, c) => (
              <div key={c} className="h-4 bg-slate-100 rounded animate-pulse" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-2xl',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1E1B4B]/40 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`w-full ${maxWidth} bg-white rounded-xl border border-[#E5E7EB] shadow-xl max-h-[90vh] flex flex-col overflow-hidden`}
      >
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-[#E5E7EB] bg-[#F8FAFC]">
          <div>
            <h2 className="text-lg font-bold text-[#1E1B4B]">{title}</h2>
            {subtitle && <p className="text-xs text-[#64748B] mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#1E1B4B] hover:bg-[#EDE9FE] transition-colors cursor-pointer"
            aria-label="Tutup modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Hapus',
  loading = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  loading?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth="max-w-md">
      <p className="text-sm text-[#64748B] leading-relaxed">{message}</p>
      <div className="mt-6 flex items-center justify-end gap-3">
        <SecondaryButton onClick={onClose} disabled={loading}>
          Batal
        </SecondaryButton>
        <DangerButton onClick={onConfirm} disabled={loading}>
          {loading ? 'Memproses...' : confirmLabel}
        </DangerButton>
      </div>
    </Modal>
  );
}

export function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  const styleMap: Record<
    ToastItem['type'],
    {
      icon: React.ReactNode;
      badgeBg: string;
      border: string;
      bar: string;
    }
  > = {
    success: {
      icon: <CheckCircle2 className="w-5 h-5 text-[#16A34A]" />,
      badgeBg: 'bg-emerald-50 border-emerald-200/80',
      border: 'border-emerald-200/90',
      bar: 'bg-[#16A34A]',
    },
    error: {
      icon: <AlertCircle className="w-5 h-5 text-[#DC2626]" />,
      badgeBg: 'bg-red-50 border-red-200/80',
      border: 'border-red-200/90',
      bar: 'bg-[#DC2626]',
    },
    warning: {
      icon: <AlertTriangle className="w-5 h-5 text-[#D97706]" />,
      badgeBg: 'bg-amber-50 border-amber-200/80',
      border: 'border-amber-200/90',
      bar: 'bg-[#F59E0B]',
    },
    info: {
      icon: <Info className="w-5 h-5 text-[#6D28D9]" />,
      badgeBg: 'bg-[#EDE9FE] border-[#6D28D9]/20',
      border: 'border-[#DDD6FE]',
      bar: 'bg-[#6D28D9]',
    },
  };

  return (
    <div
      className="fixed top-4 right-4 z-[60] flex flex-col gap-2.5 max-w-sm w-[calc(100vw-2rem)] sm:w-full pointer-events-none no-print"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((t) => {
        const s = styleMap[t.type];
        return (
          <div
            key={t.id}
            role={t.type === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto relative overflow-hidden bg-white/95 backdrop-blur-md border ${s.border} rounded-xl shadow-xl shadow-[#1E1B4B]/10 animate-toast-in`}
          >
            <div className="flex items-start gap-3 p-3.5">
              <div
                className={`w-9 h-9 rounded-lg border ${s.badgeBg} flex items-center justify-center shrink-0`}
              >
                {s.icon}
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <p className="text-sm font-semibold text-[#1E1B4B] leading-snug">{t.title}</p>
                {t.message && (
                  <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed break-words">
                    {t.message}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => onDismiss(t.id)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[#64748B] hover:text-[#1E1B4B] hover:bg-[#F5F3FF] transition-colors shrink-0 cursor-pointer"
                aria-label="Tutup notifikasi"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className={`h-0.5 w-full ${s.bar} opacity-75 animate-toast-progress`} />
          </div>
        );
      })}
    </div>
  );
}

export function AppFooter({ className = '' }: { className?: string }) {
  return (
    <footer
      className={`no-print text-center text-xs text-[#64748B] py-4 px-4 select-none ${className}`}
    >
      <span>©️Copyright | Dev. Meyga Developer</span>
    </footer>
  );
}

export function ExcelImportModal({
  open,
  onClose,
  title,
  templateFilename,
  sheetName,
  columns,
  existingUniqueChecks,
  onConfirmImport,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  templateFilename: string;
  sheetName: string;
  columns: ExcelColumnSpec[];
  existingUniqueChecks?: {
    field: string;
    label: string;
    existingValues: Set<string>;
  }[];
  onConfirmImport: (validRows: Record<string, string>[]) => Promise<void>;
}) {
  const [headerErrors, setHeaderErrors] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<ParsedExcelRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);

  const reset = () => {
    setHeaderErrors([]);
    setParsedRows([]);
    setFileName('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const result = await parseAndValidateExcelFile(file, columns, existingUniqueChecks);
    setHeaderErrors(result.headerErrors);
    setParsedRows(result.rows);
  };

  const validRows = parsedRows.filter((r) => r.errors.length === 0).map((r) => r.data);
  const errorRowCount = parsedRows.filter((r) => r.errors.length > 0).length;

  const handleSave = async () => {
    if (validRows.length === 0) return;
    setImporting(true);
    try {
      await onConfirmImport(validRows);
      handleClose();
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={title}
      subtitle="Unduh template Excel (.xlsx), isi data sebenarnya, lalu unggah untuk validasi dan pratinjau."
      maxWidth="max-w-4xl"
    >
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[#F5F3FF] border border-[#EDE9FE] rounded-xl">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="w-6 h-6 text-[#6D28D9] shrink-0" />
            <div>
              <p className="text-sm font-semibold text-[#1E1B4B]">Langkah 1: Gunakan Template Resmi</p>
              <p className="text-xs text-[#64748B]">
                Nama kolom Excel harus sama persis dengan struktur database.
              </p>
            </div>
          </div>
          <SecondaryButton
            onClick={() => downloadExcelTemplate(templateFilename, sheetName, columns)}
          >
            <Download className="w-4 h-4" />
            Download Template (.xlsx)
          </SecondaryButton>
        </div>

        <div className="p-4 border border-dashed border-[#6D28D9]/40 rounded-xl bg-[#F8FAFC]">
          <label className="flex flex-col items-center justify-center gap-2 cursor-pointer py-3">
            <Upload className="w-6 h-6 text-[#6D28D9]" />
            <span className="text-sm font-medium text-[#1E1B4B]">
              {fileName ? `File dipilih: ${fileName}` : 'Langkah 2: Pilih file Excel (.xlsx)'}
            </span>
            <span className="text-xs text-[#64748B]">Format didukung: .xlsx</span>
            <input
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>

        {headerErrors.length > 0 && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-1">
            <p className="text-sm font-semibold text-[#DC2626]">Struktur Kolom Tidak Sesuai</p>
            {headerErrors.map((err, i) => (
              <p key={i} className="text-xs text-[#DC2626]">
                · {err}
              </p>
            ))}
          </div>
        )}

        {parsedRows.length > 0 && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="font-semibold text-[#1E1B4B]">
                Pratinjau Data ({parsedRows.length} baris)
              </span>
              <div className="flex items-center gap-3 text-xs font-medium tabular-nums">
                <span className="text-[#16A34A]">Valid: {validRows.length}</span>
                <span aria-hidden="true">·</span>
                <span className="text-[#DC2626]">Bermasalah: {errorRowCount}</span>
              </div>
            </div>

            <div className="overflow-x-auto border border-[#E5E7EB] rounded-xl max-h-64">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#EDE9FE] text-[#1E1B4B] sticky top-0">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Baris</th>
                    {columns.slice(0, 5).map((col) => (
                      <th key={col.key} className="px-3 py-2 font-semibold whitespace-nowrap">
                        {col.header}
                      </th>
                    ))}
                    <th className="px-3 py-2 font-semibold">Status Validasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {parsedRows.map((row) => (
                    <tr
                      key={row.rowIndex}
                      className={row.errors.length > 0 ? 'bg-red-50/70' : 'bg-white'}
                    >
                      <td className="px-3 py-2 tabular-nums font-mono">{row.rowIndex}</td>
                      {columns.slice(0, 5).map((col) => (
                        <td key={col.key} className="px-3 py-2 whitespace-nowrap">
                          {row.data[col.key] || '-'}
                        </td>
                      ))}
                      <td className="px-3 py-2">
                        {row.errors.length === 0 ? (
                          <span className="text-[#16A34A] font-medium">Valid</span>
                        ) : (
                          <span className="text-[#DC2626] font-medium">
                            {row.errors.join('; ')}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#E5E7EB]">
          <SecondaryButton onClick={handleClose}>Batal</SecondaryButton>
          <PrimaryButton
            onClick={handleSave}
            disabled={validRows.length === 0 || headerErrors.length > 0}
            loading={importing}
          >
            Simpan {validRows.length > 0 ? `${validRows.length} Data Valid` : 'Data'}
          </PrimaryButton>
        </div>
      </div>
    </Modal>
  );
}
