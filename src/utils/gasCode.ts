import gasCodeRaw from '../../gas-backend/Code.gs?raw';

export const GAS_CODE_TEXT: string = gasCodeRaw;

export async function copyGasCodeToClipboard(): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(GAS_CODE_TEXT);
      return true;
    }
  } catch {
    // Fallback below
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = GAS_CODE_TEXT;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

export function downloadGasCodeFile(): void {
  const blob = new Blob([GAS_CODE_TEXT], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'Code.gs';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
