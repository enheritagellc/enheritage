/**
 * PdfRenderer — turns a biography JSON payload into a multi-page PDF keepsake.
 *
 * Layout:
 *   Page 1 — Cover  (title, subtitle, decorative rule, date)
 *   Page 2 — Table of Contents
 *   Pages 3+ — Chapter body text, one chapter per page start
 *
 * Returns the rendered PDF as a Buffer.
 */

import PDFDocument from 'pdfkit';

export interface BiographyChapter {
  title: string;
  body: string;
  wordCount?: number;
}

export interface BiographyData {
  biographyId: string;
  subjectName: string;
  chapters: BiographyChapter[];
  fullText?: string;
}

// ── Colour palette ───────────────────────────────────────────────────────────
const COLOURS = {
  accent: '#8B6914',   // warm gold
  heading: '#2C2C2C',  // near-black
  body: '#3D3D3D',     // dark grey
  muted: '#888888',    // light grey
  rule: '#D4B896',     // warm tan
};

// ── Page geometry ────────────────────────────────────────────────────────────
const MARGIN = 72;      // 1 inch
const PAGE_WIDTH = 612; // US Letter
const TEXT_WIDTH = PAGE_WIDTH - MARGIN * 2;

// ── Typography helpers ───────────────────────────────────────────────────────
function drawRule(doc: PDFKit.PDFDocument, y: number, colour = COLOURS.rule): void {
  doc
    .moveTo(MARGIN, y)
    .lineTo(PAGE_WIDTH - MARGIN, y)
    .strokeColor(colour)
    .lineWidth(0.75)
    .stroke();
}

function addPageNumber(doc: PDFKit.PDFDocument, pageNum: number): void {
  doc
    .fontSize(9)
    .fillColor(COLOURS.muted)
    .text(String(pageNum), 0, doc.page.height - 50, {
      width: PAGE_WIDTH,
      align: 'center',
    });
}

// ── Cover page ───────────────────────────────────────────────────────────────
function renderCover(doc: PDFKit.PDFDocument, subjectName: string, title: string): void {
  const centerY = doc.page.height / 2;

  // Decorative top rule
  drawRule(doc, 100, COLOURS.accent);

  // Main title
  doc
    .fontSize(36)
    .fillColor(COLOURS.heading)
    .font('Helvetica-Bold')
    .text(title, MARGIN, centerY - 80, { width: TEXT_WIDTH, align: 'center' });

  // Thin rule beneath title
  drawRule(doc, centerY - 10, COLOURS.rule);

  // Subtitle
  doc
    .fontSize(18)
    .fillColor(COLOURS.accent)
    .font('Helvetica-Oblique')
    .text(`The Life and Legacy of ${subjectName}`, MARGIN, centerY + 10, {
      width: TEXT_WIDTH,
      align: 'center',
    });

  // Year
  const year = new Date().getFullYear();
  doc
    .fontSize(12)
    .fillColor(COLOURS.muted)
    .font('Helvetica')
    .text(String(year), MARGIN, centerY + 60, { width: TEXT_WIDTH, align: 'center' });

  // Bottom rule
  drawRule(doc, doc.page.height - 100, COLOURS.accent);
}

// ── Table of contents ────────────────────────────────────────────────────────
function renderToC(
  doc: PDFKit.PDFDocument,
  chapters: BiographyChapter[],
  startPage: number,
): void {
  doc
    .fontSize(22)
    .fillColor(COLOURS.heading)
    .font('Helvetica-Bold')
    .text('Contents', MARGIN, MARGIN + 20);

  drawRule(doc, MARGIN + 60, COLOURS.accent);

  let y = MARGIN + 80;
  chapters.forEach((ch, i) => {
    const pageNum = startPage + i;

    doc
      .fontSize(12)
      .fillColor(COLOURS.body)
      .font('Helvetica')
      .text(ch.title, MARGIN, y, { continued: false });

    doc
      .fontSize(12)
      .fillColor(COLOURS.muted)
      .text(String(pageNum), PAGE_WIDTH - MARGIN - 30, y, { width: 30, align: 'right' });

    // Dot leader
    const titleWidth = doc.widthOfString(ch.title);
    const numX = PAGE_WIDTH - MARGIN - 30;
    const dotsStart = MARGIN + titleWidth + 8;
    if (dotsStart < numX - 10) {
      doc
        .fontSize(9)
        .fillColor(COLOURS.muted)
        .text(
          '·'.repeat(Math.floor((numX - dotsStart) / 5)),
          dotsStart,
          y + 2,
        );
    }

    y += 28;
  });

  addPageNumber(doc, 2);
}

// ── Chapter page ─────────────────────────────────────────────────────────────
function renderChapter(
  doc: PDFKit.PDFDocument,
  chapter: BiographyChapter,
  pageNum: number,
): void {
  // Chapter heading
  doc
    .fontSize(24)
    .fillColor(COLOURS.heading)
    .font('Helvetica-Bold')
    .text(chapter.title, MARGIN, MARGIN + 20);

  drawRule(doc, MARGIN + 60, COLOURS.accent);

  // Body copy
  const paragraphs = chapter.body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  let y = MARGIN + 80;
  for (const para of paragraphs) {
    doc
      .fontSize(11.5)
      .fillColor(COLOURS.body)
      .font('Helvetica')
      .text(para, MARGIN, y, {
        width: TEXT_WIDTH,
        align: 'justify',
        lineGap: 3,
      });

    y = doc.y + 14; // paragraph spacing

    // If we're near the bottom, start a new page (but keep chapter number)
    if (y > doc.page.height - 100) {
      doc.addPage();
      y = MARGIN;
    }
  }

  addPageNumber(doc, pageNum);
}

// ── Public API ────────────────────────────────────────────────────────────────
export async function renderBiographyPdf(data: BiographyData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
      info: {
        Title: `The Life of ${data.subjectName}`,
        Author: 'Enheritage',
        Subject: `Biography of ${data.subjectName}`,
        Creator: 'Enheritage Keepsake Service',
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Page 1 — Cover
    renderCover(doc, data.subjectName, `The Life of ${data.subjectName}`);

    // Page 2 — Table of Contents (chapters start on page 3)
    doc.addPage();
    const chapterStartPage = 3;
    renderToC(doc, data.chapters, chapterStartPage);

    // Pages 3+ — Chapters
    data.chapters.forEach((chapter, i) => {
      doc.addPage();
      renderChapter(doc, chapter, chapterStartPage + i);
    });

    doc.end();
  });
}
