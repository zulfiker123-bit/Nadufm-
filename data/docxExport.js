import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  ShadingType,
  ImageRun,
  PageOrientation,
  PageBreak,
  TableLayoutType,
  VerticalAlign,
  convertMillimetersToTwip,
} from 'docx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOGO_PATH = path.join(__dirname, '..', 'public', 'logo.png');

let cachedLogoBuffer = null;
function getLogoBuffer() {
  if (cachedLogoBuffer !== null) return cachedLogoBuffer;
  try {
    cachedLogoBuffer = fs.readFileSync(LOGO_PATH);
  } catch {
    cachedLogoBuffer = Buffer.alloc(0);
  }
  return cachedLogoBuffer;
}

const FONT_NAME = 'Nikosh';

function makeRun(text, opts = {}) {
  return new TextRun({
    text: String(text ?? ''),
    font: FONT_NAME,
    size: opts.size || 22,
    bold: Boolean(opts.bold),
    italics: Boolean(opts.italics),
    color: opts.color || '0F172A',
  });
}

function makeParagraph(text, opts = {}) {
  return new Paragraph({
    alignment: opts.alignment || AlignmentType.LEFT,
    spacing: {
      before: opts.spaceBefore ?? 40,
      after: opts.spaceAfter ?? 80,
      line: opts.line ?? 276,
    },
    children: Array.isArray(opts.children)
      ? opts.children
      : [makeRun(text, opts)],
  });
}

const THIN_GREEN_BORDER = { style: BorderStyle.SINGLE, size: 6, color: '166534' };
const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const NO_BORDERS = {
  top: NO_BORDER,
  bottom: NO_BORDER,
  left: NO_BORDER,
  right: NO_BORDER,
  insideHorizontal: NO_BORDER,
  insideVertical: NO_BORDER,
};
const GREEN_BORDERS = {
  top: THIN_GREEN_BORDER,
  bottom: THIN_GREEN_BORDER,
  left: THIN_GREEN_BORDER,
  right: THIN_GREEN_BORDER,
  insideHorizontal: THIN_GREEN_BORDER,
  insideVertical: THIN_GREEN_BORDER,
};

function buildHeaderBlock(block) {
  const children = [];
  const logoBuf = getLogoBuffer();
  const lines = Array.isArray(block.lines) ? block.lines.filter(Boolean) : [];
  const gradeRows = Array.isArray(block.gradeRows) ? block.gradeRows : [];

  const titleRuns = [];
  if (block.bismillah) {
    titleRuns.push(makeParagraph(block.bismillah, { alignment: AlignmentType.CENTER, bold: true, size: 22, spaceAfter: 40 }));
  }
  if (block.title) {
    titleRuns.push(makeParagraph(block.title, { alignment: AlignmentType.CENTER, bold: true, size: 30, color: '14532D', spaceAfter: 40 }));
  }
  for (const ln of lines) {
    titleRuns.push(makeParagraph(ln, { alignment: AlignmentType.CENTER, size: 20, color: '334155', spaceAfter: 25 }));
  }

  if (logoBuf.length > 0 || gradeRows.length > 0) {
    const cells = [];
    cells.push(new TableCell({
      width: { size: 15, type: WidthType.PERCENTAGE },
      borders: NO_BORDERS,
      verticalAlign: VerticalAlign.CENTER,
      children: [
        logoBuf.length > 0
          ? new Paragraph({
              alignment: AlignmentType.LEFT,
              children: [
                new ImageRun({
                  data: logoBuf,
                  transformation: { width: 54, height: 54 },
                  type: 'png',
                }),
              ],
            })
          : makeParagraph(''),
      ],
    }));

    cells.push(new TableCell({
      width: { size: gradeRows.length > 0 ? 63 : 70, type: WidthType.PERCENTAGE },
      borders: NO_BORDERS,
      verticalAlign: VerticalAlign.CENTER,
      children: titleRuns.length ? titleRuns : [makeParagraph('')],
    }));

    if (gradeRows.length > 0) {
      const miniRows = gradeRows.map((gr, idx) => new TableRow({
        children: gr.map((c) => new TableCell({
          borders: GREEN_BORDERS,
          shading: idx === 0 ? { type: ShadingType.CLEAR, fill: '166534' } : undefined,
          children: [makeParagraph(String(c || ''), {
            alignment: AlignmentType.CENTER,
            bold: idx === 0,
            size: 14,
            color: idx === 0 ? 'FFFFFF' : '0F172A',
            spaceBefore: 10,
            spaceAfter: 10,
            line: 220,
          })],
        })),
      }));
      cells.push(new TableCell({
        width: { size: 22, type: WidthType.PERCENTAGE },
        borders: NO_BORDERS,
        verticalAlign: VerticalAlign.CENTER,
        children: [
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            layout: TableLayoutType.AUTOFIT,
            rows: miniRows,
          }),
        ],
      }));
    } else {
      cells.push(new TableCell({
        width: { size: 15, type: WidthType.PERCENTAGE },
        borders: NO_BORDERS,
        children: [makeParagraph('')],
      }));
    }

    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: NO_BORDER,
        bottom: { style: BorderStyle.SINGLE, size: 12, color: '166534' },
        left: NO_BORDER,
        right: NO_BORDER,
        insideHorizontal: NO_BORDER,
        insideVertical: NO_BORDER,
      },
      rows: [new TableRow({ children: cells })],
    }));
  } else {
    children.push(...titleRuns);
  }

  children.push(makeParagraph('', { spaceAfter: 60 }));
  return children;
}

function buildTableBlock(block) {
  const rows = Array.isArray(block.rows) ? block.rows : [];
  if (!rows.length) return [];

  const maxCols = rows.reduce((mx, r) => Math.max(mx, Array.isArray(r.cells) ? r.cells.length : 0), 1);
  const tableRows = rows.map((row, rIdx) => {
    const rawCells = Array.isArray(row.cells) ? row.cells : [];
    const isHeaderRow = Boolean(row.isHeader || (rIdx === 0 && rawCells.some((c) => c.isHeader)));
    const cells = rawCells.map((cell) => {
      const isHdr = Boolean(cell.isHeader || isHeaderRow);
      const align = cell.align === 'left'
        ? AlignmentType.LEFT
        : cell.align === 'right'
          ? AlignmentType.RIGHT
          : AlignmentType.CENTER;
      return new TableCell({
        borders: GREEN_BORDERS,
        verticalAlign: VerticalAlign.CENTER,
        shading: isHdr
          ? { type: ShadingType.CLEAR, fill: '166534' }
          : (row.highlight ? { type: ShadingType.CLEAR, fill: 'FEFCE8' } : undefined),
        margins: { top: 70, bottom: 70, left: 90, right: 90 },
        children: [
          makeParagraph(String(cell.text ?? ''), {
            alignment: align,
            bold: isHdr || Boolean(cell.bold),
            size: isHdr ? 20 : 19,
            color: isHdr ? 'FFFFFF' : (cell.color || '0F172A'),
            spaceBefore: 10,
            spaceAfter: 10,
          }),
        ],
      });
    });
    while (cells.length < maxCols) {
      cells.push(new TableCell({
        borders: GREEN_BORDERS,
        children: [makeParagraph('')],
      }));
    }
    return new TableRow({ children: cells, tableHeader: isHeaderRow });
  });

  return [
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: GREEN_BORDERS,
      rows: tableRows,
    }),
    makeParagraph('', { spaceAfter: 60 }),
  ];
}

function buildKvGridBlock(block) {
  const items = Array.isArray(block.items) ? block.items.filter((x) => x && (x.label || x.value || x.text)) : [];
  if (!items.length) return [];

  const cols = Number(block.columns) > 0 ? Math.min(Number(block.columns), 4) : 2;
  const rows = [];
  for (let i = 0; i < items.length; i += cols) {
    const slice = items.slice(i, i + cols);
    const cells = slice.map((item) => {
      const runs = item.text
        ? [makeRun(item.text, { bold: true, size: 20 })]
        : [
            makeRun((item.label ? item.label + ': ' : ''), { bold: true, size: 20, color: '14532D' }),
            makeRun(item.value || '—', { bold: false, size: 20 }),
          ];
      return new TableCell({
        width: { size: Math.floor(100 / cols), type: WidthType.PERCENTAGE },
        borders: block.bordered ? GREEN_BORDERS : NO_BORDERS,
        shading: block.bordered ? { type: ShadingType.CLEAR, fill: 'F8FAF9' } : undefined,
        margins: { top: 60, bottom: 60, left: 90, right: 90 },
        children: [makeParagraph('', { alignment: block.bordered ? AlignmentType.CENTER : AlignmentType.LEFT, children: runs, spaceBefore: 10, spaceAfter: 10 })],
      });
    });
    while (cells.length < cols) {
      cells.push(new TableCell({
        width: { size: Math.floor(100 / cols), type: WidthType.PERCENTAGE },
        borders: block.bordered ? GREEN_BORDERS : NO_BORDERS,
        children: [makeParagraph('')],
      }));
    }
    rows.push(new TableRow({ children: cells }));
  }

  return [
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: block.bordered ? GREEN_BORDERS : NO_BORDERS,
      rows,
    }),
    makeParagraph('', { spaceAfter: 60 }),
  ];
}

function buildRowStripBlock(block) {
  const cellsData = Array.isArray(block.cells) ? block.cells : [];
  if (!cellsData.length) return [];
  const pct = Math.floor(100 / cellsData.length);
  const cells = cellsData.map((c, idx) => {
    const align = idx === 0
      ? AlignmentType.LEFT
      : idx === cellsData.length - 1
        ? AlignmentType.RIGHT
        : AlignmentType.CENTER;
    return new TableCell({
      width: { size: pct, type: WidthType.PERCENTAGE },
      borders: block.topRule
        ? { top: { style: BorderStyle.SINGLE, size: 6, color: '166534' }, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER }
        : NO_BORDERS,
      margins: { top: block.topRule ? 80 : 40, bottom: 40, left: 60, right: 60 },
      children: [
        makeParagraph(String(c.text || ''), {
          alignment: c.align === 'center' ? AlignmentType.CENTER : align,
          bold: Boolean(c.bold),
          size: c.size || 20,
          color: c.color || '0F172A',
          spaceBefore: 10,
          spaceAfter: 10,
        }),
      ],
    });
  });

  return [
    ...(block.topSpacer ? [makeParagraph('', { spaceBefore: 240, spaceAfter: 120 })] : []),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: NO_BORDERS,
      rows: [new TableRow({ children: cells })],
    }),
  ];
}

function fallbackBlocksFromHtml(html) {
  const clean = String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h1|h2|h3|h4|li|tr)>/gi, '\n')
    .replace(/<\/(td|th)>/gi, '  |  ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"');

  const lines = clean
    .split('\n')
    .map((ln) => ln.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  return [{
    blocks: lines.map((line) => ({ type: 'paragraph', text: line })),
  }];
}

export async function buildDocxBuffer({ pages, html, orientation = 'portrait', title = 'Document', marginMm = 14 }) {
  const pageList = Array.isArray(pages) && pages.length > 0 ? pages : fallbackBlocksFromHtml(html);
  const isLandscape = String(orientation).toLowerCase() === 'landscape';
  const docChildren = [];

  pageList.forEach((pg, pgIdx) => {
    if (pgIdx > 0) {
      docChildren.push(new Paragraph({ children: [new PageBreak()] }));
    }
    const blocks = Array.isArray(pg.blocks) ? pg.blocks : [];
    for (const blk of blocks) {
      if (!blk || !blk.type) continue;
      if (blk.type === 'header') {
        docChildren.push(...buildHeaderBlock(blk));
      } else if (blk.type === 'badge') {
        docChildren.push(makeParagraph(blk.text || '', {
          alignment: AlignmentType.CENTER,
          bold: true,
          size: 26,
          color: '14532D',
          spaceBefore: 60,
          spaceAfter: 100,
        }));
      } else if (blk.type === 'kvGrid') {
        docChildren.push(...buildKvGridBlock(blk));
      } else if (blk.type === 'table') {
        docChildren.push(...buildTableBlock(blk));
      } else if (blk.type === 'rowStrip') {
        docChildren.push(...buildRowStripBlock(blk));
      } else if (blk.type === 'heading') {
        docChildren.push(makeParagraph(blk.text || '', {
          alignment: blk.align === 'center' ? AlignmentType.CENTER : AlignmentType.LEFT,
          bold: true,
          size: 24,
          color: '14532D',
          spaceBefore: 100,
          spaceAfter: 60,
        }));
      } else if (blk.type === 'paragraph') {
        if (!String(blk.text || '').trim()) continue;
        docChildren.push(makeParagraph(blk.text, {
          alignment: blk.align === 'center'
            ? AlignmentType.CENTER
            : blk.align === 'justify'
              ? AlignmentType.JUSTIFIED
              : AlignmentType.LEFT,
          bold: Boolean(blk.bold),
          size: blk.size || 21,
          spaceBefore: 40,
          spaceAfter: 80,
          line: 300,
        }));
      }
    }
  });

  if (docChildren.length === 0) {
    docChildren.push(makeParagraph('নলতা আহছানিয়া দারুল উলুম ফাজিল (ডিগ্রী) মাদ্রাসা', { alignment: AlignmentType.CENTER, bold: true, size: 28 }));
  }

  const mTwip = convertMillimetersToTwip(Math.max(6, Math.min(30, Number(marginMm) || (isLandscape ? 12 : 14))));
  const pageWidth = convertMillimetersToTwip(isLandscape ? 297 : 210);
  const pageHeight = convertMillimetersToTwip(isLandscape ? 210 : 297);

  const doc = new Document({
    title: String(title || 'Document'),
    creator: 'Nalta Ahsania Darul Ulum Fazil Madrasah',
    sections: [
      {
        properties: {
          page: {
            size: {
              width: pageWidth,
              height: pageHeight,
              orientation: isLandscape ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT,
            },
            margin: {
              top: mTwip,
              right: mTwip,
              bottom: mTwip,
              left: mTwip,
            },
          },
        },
        children: docChildren,
      },
    ],
  });

  return Packer.toBuffer(doc);
}
