const BULAN_INDONESIA = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

const BULAN_MAP: Record<string, string> = {
  januari: '01',
  jan: '01',
  january: '01',
  februari: '02',
  feb: '02',
  february: '02',
  maret: '03',
  mar: '03',
  march: '03',
  april: '04',
  apr: '04',
  mei: '05',
  may: '05',
  juni: '06',
  jun: '06',
  june: '06',
  juli: '07',
  jul: '07',
  july: '07',
  agustus: '08',
  agu: '08',
  agt: '08',
  aug: '08',
  august: '08',
  september: '09',
  sep: '09',
  sept: '09',
  oktober: '10',
  okt: '10',
  oct: '10',
  october: '10',
  november: '11',
  nov: '11',
  nop: '11',
  desember: '12',
  des: '12',
  dec: '12',
  december: '12',
};

function formatUtcPlus7Ymd(year: number, monthIndex: number, day: number, hh: number, mm: number, ss: number): string {
  const shifted = new Date(Date.UTC(year, monthIndex, day, hh, mm, ss) + 7 * 60 * 60 * 1000);
  const y = String(shifted.getUTCFullYear()).padStart(4, '0');
  const m = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const d = String(shifted.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Menormalkan berbagai format tanggal (termasuk ISO UTC dari Google Sheets seperti
 * `1967-01-15T17:00:00.000Z` atau `1967-01-15T17:00:00`) ke format `YYYY-MM-DD`
 * sesuai zona waktu Indonesia (WIB / Asia/Jakarta).
 */
export function normalizeDateYmd(raw?: string | number | null): string {
  if (raw === undefined || raw === null) return '';
  const s = String(raw).trim();
  if (!s || s === '-') return '';

  // 1. Sudah YYYY-MM-DD
  const ymdMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymdMatch) return s;

  // 2. Format ISO datetime (e.g. 1967-01-15T17:00:00.000Z atau 1967-01-15T17:00:00)
  const isoMatch = s.match(
    /^(\d{3,4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/i
  );
  if (isoMatch) {
    const [, yStr, mStr, dStr, hhStr, mmStr, ssStr, tzPart] = isoMatch;
    const yearNum = Number(yStr);
    const monthNum = Number(mStr);
    const dayNum = Number(dStr);
    const hhNum = Number(hhStr);
    const mmNum = Number(mmStr);
    const ssNum = Number(ssStr || '0');

    if (tzPart) {
      if (yStr.length === 4) {
        const parsed = new Date(s);
        if (!Number.isNaN(parsed.getTime())) {
          return new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Jakarta',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          }).format(parsed);
        }
      }
      return formatUtcPlus7Ymd(yearNum, monthNum - 1, dayNum, hhNum, mmNum, ssNum);
    }

    // Jika tidak ada suffix Z tapi jam >= 12 (ciri khas output UTC .toISOString() untuk midnight WIB/WITA/WIT)
    if (hhNum >= 12) {
      return formatUtcPlus7Ymd(yearNum, monthNum - 1, dayNum, hhNum, mmNum, ssNum);
    }
    return `${yStr.padStart(4, '0')}-${mStr}-${dStr}`;
  }

  // 3. Format DD/MM/YYYY atau DD-MM-YYYY
  const dmyMatch = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    const first = Number(dmyMatch[1]);
    const second = Number(dmyMatch[2]);
    const yyyy = dmyMatch[3];
    // Default Indonesia: DD/MM/YYYY kecuali bagian kedua > 12 (MM/DD/YYYY)
    if (second > 12 && first <= 12) {
      return `${yyyy}-${String(first).padStart(2, '0')}-${String(second).padStart(2, '0')}`;
    }
    return `${yyyy}-${String(second).padStart(2, '0')}-${String(first).padStart(2, '0')}`;
  }

  // 4. Format teks Indonesia: "16 Januari 1967"
  const textMatch = s.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (textMatch) {
    const dd = String(Number(textMatch[1])).padStart(2, '0');
    const mm = BULAN_MAP[textMatch[2].toLowerCase()];
    const yyyy = textMatch[3];
    if (mm) return `${yyyy}-${mm}-${dd}`;
  }

  // 5. Fallback umum JS Date
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(parsed);
  }

  return '';
}

/**
 * Memformat tanggal menjadi format Indonesia: "16 Januari 1967".
 */
export function formatDateIndonesia(raw?: string | number | null): string {
  if (raw === undefined || raw === null) return '-';
  const s = String(raw).trim();
  if (!s || s === '-') return '-';

  const ymd = normalizeDateYmd(s);
  const match = ymd.match(/^(\d{3,4})-(\d{2})-(\d{2})$/);
  if (!match) return s;

  const year = match[1].replace(/^0+/, '') || match[1];
  const monthIdx = Number(match[2]) - 1;
  const day = Number(match[3]);
  const monthName = BULAN_INDONESIA[monthIdx];
  if (!monthName || Number.isNaN(day)) return s;

  return `${day} ${monthName} ${year}`;
}
