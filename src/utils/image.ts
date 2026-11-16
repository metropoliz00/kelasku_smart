export const MAX_PHOTO_SIZE_BYTES = 200 * 1024; // 200 KB
const SAFE_SHEET_BASE64_CHARS = 45000;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Gagal membaca file gambar.'));
      }
    };
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('File bukan gambar yang valid.'));
    img.src = dataUrl;
  });
}

/**
 * Memvalidasi foto maksimal 200 KB dan mengonversi menjadi string Base64 Data URL.
 * Jika panjang string Base64 melebihi batas sel Google Sheets (~45.000 karakter),
 * resolusi/kompresi disesuaikan secara otomatis agar tetap tersimpan aman sebagai Base64.
 */
export async function processPhotoUpload(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('File harus berupa gambar (JPG, PNG, WEBP, atau GIF).');
  }

  if (file.size > MAX_PHOTO_SIZE_BYTES) {
    const sizeKb = Math.ceil(file.size / 1024);
    throw new Error(`Ukuran foto (${sizeKb} KB) melebihi batas maksimal 200 KB.`);
  }

  const rawDataUrl = await readFileAsDataUrl(file);
  if (rawDataUrl.length <= SAFE_SHEET_BASE64_CHARS) {
    return rawDataUrl;
  }

  const img = await loadImage(rawDataUrl);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return rawDataUrl;

  const maxDim = 256;
  const ratio = Math.min(maxDim / img.width, maxDim / img.height, 1);
  canvas.width = Math.max(1, Math.round(img.width * ratio));
  canvas.height = Math.max(1, Math.round(img.height * ratio));
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  for (const quality of [0.85, 0.72, 0.58, 0.45]) {
    const compressed = canvas.toDataURL('image/jpeg', quality);
    if (compressed.length <= SAFE_SHEET_BASE64_CHARS) {
      return compressed;
    }
  }

  return canvas.toDataURL('image/jpeg', 0.4);
}
