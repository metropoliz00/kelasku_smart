import jsPDF from 'jspdf';
import autoTable, { RowInput } from 'jspdf-autotable';
import { SchoolIdentity } from '../types';

export interface PdfReportOptions {
  orientation: 'portrait' | 'landscape';
  title: string;
  subtitle?: string;
  school: SchoolIdentity;
  metaPairs?: { label: string; value: string }[];
  headers: string[];
  rows: RowInput[];
  filename: string;
  columnStyles?: Record<number, { halign?: 'left' | 'center' | 'right'; cellWidth?: number }>;
  includeSignatures?: boolean;
  waliKelasName?: string;
  kepalaSekolahName?: string;
}

export function generatePdfReport(options: PdfReportOptions): void {
  const {
    orientation,
    title,
    subtitle,
    school,
    metaPairs = [],
    headers,
    rows,
    filename,
    columnStyles,
    includeSignatures = true,
    waliKelasName = '__________________________',
    kepalaSekolahName = '__________________________',
  } = options;

  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  // Kop Surat Sekolah
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(30, 27, 75);
  doc.text(school.nama_sekolah || 'SEKOLAH DASAR', pageWidth / 2, 16, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  const npsnText = school.npsn ? `NPSN: ${school.npsn}` : 'NPSN: -';
  const addressParts = [school.alamat, school.kecamatan, school.kabupaten, school.provinsi]
    .filter(Boolean)
    .join(', ');
  doc.text(
    `${npsnText}${addressParts ? ` · ${addressParts}` : ''}${school.email ? ` · ${school.email}` : ''}`,
    pageWidth / 2,
    21,
    { align: 'center' }
  );

  // Garis Kop
  doc.setDrawColor(109, 40, 217);
  doc.setLineWidth(0.7);
  doc.line(margin, 24.5, pageWidth - margin, 24.5);
  doc.setLineWidth(0.2);
  doc.line(margin, 25.5, pageWidth - margin, 25.5);

  // Judul Laporan
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 27, 75);
  doc.text(title.toUpperCase(), pageWidth / 2, 32, { align: 'center' });

  let currentY = 37;
  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(subtitle, pageWidth / 2, currentY, { align: 'center' });
    currentY += 5;
  }

  // Metadata Sekolah / Kelas / Tahun Ajaran
  if (metaPairs.length > 0) {
    doc.setFontSize(8.5);
    doc.setTextColor(30, 27, 75);
    const half = Math.ceil(metaPairs.length / 2);
    const leftPairs = metaPairs.slice(0, half);
    const rightPairs = metaPairs.slice(half);
    const colRightX = pageWidth / 2 + 6;

    leftPairs.forEach((pair, idx) => {
      const y = currentY + idx * 4.8;
      doc.setFont('helvetica', 'bold');
      doc.text(`${pair.label}`, margin, y);
      doc.setFont('helvetica', 'normal');
      doc.text(`: ${pair.value || '-'}`, margin + 30, y);
    });

    rightPairs.forEach((pair, idx) => {
      const y = currentY + idx * 4.8;
      doc.setFont('helvetica', 'bold');
      doc.text(`${pair.label}`, colRightX, y);
      doc.setFont('helvetica', 'normal');
      doc.text(`: ${pair.value || '-'}`, colRightX + 30, y);
    });

    currentY += Math.max(leftPairs.length, rightPairs.length) * 4.8 + 3;
  }

  autoTable(doc, {
    startY: currentY,
    head: [headers],
    body: rows.length > 0 ? rows : [[{ content: 'Belum ada data', colSpan: headers.length, styles: { halign: 'center' } }]],
    margin: { left: margin, right: margin, bottom: 20 },
    styles: {
      font: 'helvetica',
      fontSize: orientation === 'landscape' ? 8 : 8.5,
      cellPadding: 2.2,
      textColor: [30, 27, 75],
      lineColor: [229, 231, 235],
      lineWidth: 0.2,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [237, 233, 254],
      textColor: [30, 27, 75],
      fontStyle: 'bold',
      halign: 'center',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles,
    didDrawPage: (data) => {
      const pageCount = doc.getNumberOfPages();
      const printDate = new Date().toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `KELASKU SMART · Dicetak tanggal ${printDate}`,
        margin,
        pageHeight - 8
      );
      doc.text(
        `Halaman ${data.pageNumber} dari ${pageCount}`,
        pageWidth - margin,
        pageHeight - 8,
        { align: 'right' }
      );
    },
  });

  if (includeSignatures) {
    const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? currentY + 20;
    let sigY = finalY + 12;
    if (sigY + 34 > pageHeight - 14) {
      doc.addPage();
      sigY = 24;
    }

    const printDate = new Date().toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    const leftX = margin + 12;
    const rightX = pageWidth - margin - 65;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(30, 27, 75);

    doc.text('Mengetahui,', leftX, sigY);
    doc.text('Kepala Sekolah', leftX, sigY + 4.5);
    doc.setFont('helvetica', 'bold');
    doc.text(kepalaSekolahName, leftX, sigY + 24);

    doc.setFont('helvetica', 'normal');
    doc.text(`${school.kabupaten || 'Lokasi'}, ${printDate}`, rightX, sigY);
    doc.text('Wali Kelas / Guru', rightX, sigY + 4.5);
    doc.setFont('helvetica', 'bold');
    doc.text(waliKelasName, rightX, sigY + 24);
  }

  doc.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
}
