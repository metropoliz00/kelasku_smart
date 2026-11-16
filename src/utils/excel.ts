import * as XLSX from 'xlsx';

export interface ExcelColumnSpec {
  key: string;
  header: string;
  group?: string;
  required?: boolean;
  type?: 'string' | 'number' | 'date' | 'gender';
}

export interface ParsedExcelRow {
  rowIndex: number;
  data: Record<string, string>;
  errors: string[];
}

function buildGroupedSheet(
  columns: ExcelColumnSpec[],
  dataRows: (string | number | null | undefined)[][]
): XLSX.WorkSheet {
  const hasGroups = columns.some((c) => Boolean(c.group));
  const cleanRows = dataRows.map((row) =>
    row.map((cell) => (cell === null || cell === undefined ? '' : cell))
  );

  if (!hasGroups) {
    const headers = columns.map((c) => c.header);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...cleanRows]);
    ws['!cols'] = columns.map((c, idx) => {
      const maxLen = Math.max(
        c.header.length,
        ...cleanRows.map((r) => String(r[idx] ?? '').length)
      );
      return { wch: Math.min(Math.max(maxLen + 4, 14), 45) };
    });
    return ws;
  }

  // 2-row merged header layout matching Dapodik spreadsheet structure
  const row1: string[] = [];
  const row2: string[] = [];
  const merges: XLSX.Range[] = [];

  let i = 0;
  while (i < columns.length) {
    const col = columns[i];
    if (col.group) {
      const groupName = col.group;
      let spanEnd = i;
      while (spanEnd + 1 < columns.length && columns[spanEnd + 1].group === groupName) {
        spanEnd++;
      }
      for (let c = i; c <= spanEnd; c++) {
        row1.push(c === i ? groupName : '');
        row2.push(columns[c].header);
      }
      if (spanEnd > i) {
        merges.push({ s: { r: 0, c: i }, e: { r: 0, c: spanEnd } });
      }
      i = spanEnd + 1;
    } else {
      row1.push(col.header);
      row2.push('');
      merges.push({ s: { r: 0, c: i }, e: { r: 1, c: i } });
      i++;
    }
  }

  const ws = XLSX.utils.aoa_to_sheet([row1, row2, ...cleanRows]);
  ws['!merges'] = merges;
  ws['!cols'] = columns.map((c, idx) => {
    const maxLen = Math.max(
      c.header.length,
      ...cleanRows.map((r) => String(r[idx] ?? '').length)
    );
    return { wch: Math.min(Math.max(maxLen + 4, 14), 45) };
  });
  return ws;
}

export function downloadExcelTemplate(
  filename: string,
  sheetName: string,
  columns: ExcelColumnSpec[]
): void {
  const ws = buildGroupedSheet(columns, []);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}

export function exportGroupedRowsToExcel(
  filename: string,
  sheetName: string,
  columns: ExcelColumnSpec[],
  rows: (string | number | null | undefined)[][]
): void {
  const ws = buildGroupedSheet(columns, rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}

export function exportRowsToExcel(
  filename: string,
  sheetName: string,
  headers: string[],
  rows: (string | number | null | undefined)[][]
): void {
  const cleanRows = rows.map((row) =>
    row.map((cell) => (cell === null || cell === undefined ? '' : cell))
  );
  const ws = XLSX.utils.aoa_to_sheet([headers, ...cleanRows]);
  ws['!cols'] = headers.map((h, colIdx) => {
    const maxLen = Math.max(
      h.length,
      ...cleanRows.map((r) => String(r[colIdx] ?? '').length)
    );
    return { wch: Math.min(Math.max(maxLen + 4, 14), 45) };
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}

export function exportMultiSheetWorkbook(
  filename: string,
  sheets: { name: string; headers: string[]; rows: (string | number)[][] }[]
): void {
  const wb = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const ws = XLSX.utils.aoa_to_sheet([sheet.headers, ...sheet.rows]);
    ws['!cols'] = sheet.headers.map((h) => ({ wch: Math.max(h.length + 4, 16) }));
    XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31));
  }
  XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}

function normLabel(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

export async function parseAndValidateExcelFile(
  file: File,
  columns: ExcelColumnSpec[],
  existingUniqueChecks?: {
    field: string;
    label: string;
    existingValues: Set<string>;
  }[]
): Promise<{
  headerErrors: string[];
  rows: ParsedExcelRow[];
}> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = wb.SheetNames[0];
  if (!firstSheetName) {
    return {
      headerErrors: ['File Excel tidak memiliki sheet yang dapat dibaca.'],
      rows: [],
    };
  }

  const ws = wb.Sheets[firstSheetName];
  const rawMatrix = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(ws, {
    header: 1,
    defval: '',
    raw: false,
  });

  if (rawMatrix.length === 0) {
    return {
      headerErrors: ['File Excel kosong. Gunakan template Excel resmi terlebih dahulu.'],
      rows: [],
    };
  }

  // Detect 2-row merged header (e.g., Data Ayah / Data Ibu / Data Wali in row 1, subheaders in row 2)
  const expectsGrouped = columns.some((c) => Boolean(c.group));
  const row0 = rawMatrix[0].map((h) => String(h ?? '').trim());
  const row1 = rawMatrix.length > 1 ? rawMatrix[1].map((h) => String(h ?? '').trim()) : [];
  const hasGroupedRow =
    expectsGrouped &&
    rawMatrix.length > 1 &&
    (row0.some((h) => /data ayah|data ibu|data wali/i.test(h)) ||
      (row1[0] === '' && row1.some((h) => normLabel(h) === 'tahun lahir')));

  const headerIndexMap = new Map<string, number>();
  const dataStartRow = hasGroupedRow ? 2 : 1;

  if (hasGroupedRow) {
    const colCount = Math.max(row0.length, row1.length);
    let currentGroup = '';
    for (let c = 0; c < colCount; c++) {
      const top = row0[c] || '';
      const sub = row1[c] || '';
      if (/data ayah|data ibu|data wali/i.test(top)) {
        currentGroup = top;
      } else if (top !== '' && sub === '') {
        currentGroup = '';
      }
      if (sub !== '') {
        const key = currentGroup ? `${normLabel(currentGroup)}::${normLabel(sub)}` : normLabel(sub);
        if (!headerIndexMap.has(key)) headerIndexMap.set(key, c);
      } else if (top !== '') {
        const key = normLabel(top);
        if (!headerIndexMap.has(key)) headerIndexMap.set(key, c);
      }
    }
  } else {
    row0.forEach((h, idx) => {
      const key = normLabel(h);
      if (key && !headerIndexMap.has(key)) {
        headerIndexMap.set(key, idx);
      }
    });
  }

  const headerErrors: string[] = [];
  for (const col of columns) {
    if (!col.required) continue;
    const lookupKey =
      hasGroupedRow && col.group
        ? `${normLabel(col.group)}::${normLabel(col.header)}`
        : normLabel(col.header);
    if (!headerIndexMap.has(lookupKey)) {
      headerErrors.push(
        `Kolom wajib "${col.group ? `${col.group} - ${col.header}` : col.header}" tidak ditemukan pada header Excel.`
      );
    }
  }

  if (headerErrors.length > 0) {
    return { headerErrors, rows: [] };
  }

  const seenInFile = new Map<string, Set<string>>();
  if (existingUniqueChecks) {
    for (const check of existingUniqueChecks) {
      seenInFile.set(check.field, new Set());
    }
  }

  const parsedRows: ParsedExcelRow[] = [];

  for (let r = dataStartRow; r < rawMatrix.length; r++) {
    const rawRow = rawMatrix[r];
    const isEmptyRow = rawRow.every((cell) => String(cell ?? '').trim() === '');
    if (isEmptyRow) continue;

    const rowData: Record<string, string> = {};
    const errors: string[] = [];

    for (const col of columns) {
      const lookupKey =
        hasGroupedRow && col.group
          ? `${normLabel(col.group)}::${normLabel(col.header)}`
          : normLabel(col.header);
      const idx = headerIndexMap.get(lookupKey);
      const val = idx !== undefined ? String(rawRow[idx] ?? '').trim() : '';
      rowData[col.key] = val;

      if (col.required && val === '') {
        errors.push(`${col.header} wajib diisi`);
      }

      if (val !== '' && col.type === 'number') {
        const n = Number(val);
        if (Number.isNaN(n)) {
          errors.push(`${col.header} harus berupa angka`);
        }
      }

      if (val !== '' && col.type === 'gender') {
        const upper = val.toUpperCase();
        if (upper === 'L' || upper === 'LAKI-LAKI' || upper === 'LAKI - LAKI') {
          rowData[col.key] = 'L';
        } else if (upper === 'P' || upper === 'PEREMPUAN') {
          rowData[col.key] = 'P';
        } else {
          errors.push(`${col.header} harus L atau P`);
        }
      }
    }

    if (existingUniqueChecks) {
      for (const check of existingUniqueChecks) {
        const val = rowData[check.field]?.trim();
        if (val) {
          if (check.existingValues.has(val)) {
            errors.push(`${check.label} "${val}" sudah terdaftar di database`);
          }
          const fileSet = seenInFile.get(check.field);
          if (fileSet?.has(val)) {
            errors.push(`${check.label} "${val}" duplikat di dalam file Excel`);
          } else {
            fileSet?.add(val);
          }
        }
      }
    }

    parsedRows.push({
      rowIndex: r + 1,
      data: rowData,
      errors,
    });
  }

  return { headerErrors: [], rows: parsedRows };
}
