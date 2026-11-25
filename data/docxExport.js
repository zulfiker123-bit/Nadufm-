import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';
import * as cheerio from 'cheerio';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.resolve(__dirname, '..', 'public');

const MM_TO_TWIPS = 56.6929;
const A4_WIDTH_TWIPS = 11906;
const A4_HEIGHT_TWIPS = 16838;
const PX_TO_EMU = 9525;

function escapeXml(str) {
  return String(str ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function parseStyleMap(styleAttr) {
  const map = {};
  String(styleAttr || '')
    .split(';')
    .forEach((part) => {
      const idx = part.indexOf(':');
      if (idx === -1) return;
      const k = part.slice(0, idx).trim().toLowerCase();
      const v = part.slice(idx + 1).trim();
      if (k && v) map[k] = v;
    });
  return map;
}

function normalizeHexColor(val) {
  if (!val) return '';
  const s = String(val).trim().toLowerCase();
  const hexMatch = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hexMatch) {
    let h = hexMatch[1];
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    return h.toUpperCase();
  }
  const rgbMatch = s.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) {
    return [rgbMatch[1], rgbMatch[2], rgbMatch[3]]
      .map((n) => Math.max(0, Math.min(255, Number(n))).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
  }
  return '';
}

function parseFontHalfPoints(styleMap, fallbackHalfPts = 22) {
  const fs = styleMap['font-size'];
  if (!fs) return fallbackHalfPts;
  const pxMatch = fs.match(/([\d.]+)\s*px/i);
  if (pxMatch) {
    const pts = parseFloat(pxMatch[1]) * 0.75;
    return Math.max(14, Math.min(56, Math.round(pts * 2)));
  }
  const ptMatch = fs.match(/([\d.]+)\s*pt/i);
  if (ptMatch) {
    return Math.max(14, Math.min(56, Math.round(parseFloat(ptMatch[1]) * 2)));
  }
  const emMatch = fs.match(/([\d.]+)\s*em/i);
  if (emMatch) {
    return Math.max(14, Math.min(56, Math.round(fallbackHalfPts * parseFloat(emMatch[1]))));
  }
  return fallbackHalfPts;
}

function parseImageSizePx(el, $) {
  const style = parseStyleMap($(el).attr('style'));
  const wRaw = $(el).attr('width') || style.width || '56';
  const hRaw = $(el).attr('height') || style.height || wRaw;
  const parsePx = (v, def) => {
    const m = String(v || '').match(/([\d.]+)/);
    const n = m ? parseFloat(m[1]) : def;
    return Number.isFinite(n) && n > 8 && n < 500 ? n : def;
  };
  const w = parsePx(wRaw, 56);
  const h = parsePx(hRaw, w);
  return { wPx: w, hPx: h };
}

function resolveImageBuffer(src) {
  const raw = String(src || '').trim();
  if (!raw) return null;

  const dataMatch = raw.match(/^data:image\/(png|jpe?g|gif);base64,([a-z0-9+/=\s]+)$/i);
  if (dataMatch) {
    const ext = dataMatch[1].toLowerCase() === 'jpg' ? 'jpeg' : dataMatch[1].toLowerCase();
    const buf = Buffer.from(dataMatch[2].replace(/\s+/g, ''), 'base64');
    if (buf.length > 0) return { ext, buffer: buf };
  }

  // Fallback for local files like /logo.png or http://.../logo.png
  let pathname = raw;
  try {
    if (/^https?:\/\//i.test(raw)) {
      pathname = new URL(raw).pathname;
    }
  } catch {
    // ignore invalid URL
  }
  const rel = pathname.replace(/^\/+/, '');
  if (!rel || rel.includes('..')) return null;
  const diskPath = path.resolve(PUBLIC_DIR, rel);
  if (!diskPath.startsWith(PUBLIC_DIR) || !fs.existsSync(diskPath)) return null;
  const extRaw = path.extname(diskPath).toLowerCase().slice(1);
  const ext = extRaw === 'jpg' ? 'jpeg' : extRaw;
  if (!['png', 'jpeg', 'gif'].includes(ext)) return null;
  return { ext, buffer: fs.readFileSync(diskPath) };
}

function buildRunXml(text, opts = {}) {
  if (!text) return '';
  const sz = opts.halfPts || 22;
  const rPrParts = [
    '<w:rFonts w:ascii="Nikosh" w:hAnsi="Nikosh" w:cs="Nikosh" w:eastAsia="Nikosh"/>',
    `<w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/>`,
  ];
  if (opts.bold) rPrParts.push('<w:b/><w:bCs/>');
  if (opts.italic) rPrParts.push('<w:i/><w:iCs/>');
  if (opts.underline) rPrParts.push('<w:u w:val="single"/>');
  if (opts.color) rPrParts.push(`<w:color w:val="${opts.color}"/>`);

  // Split text on newlines so explicit breaks become <w:br/>
  const lines = String(text).split(/\r?\n/);
  const contentParts = lines.map((line, i) => {
    const br = i > 0 ? '<w:br/>' : '';
    return `${br}<w:t xml:space="preserve">${escapeXml(line)}</w:t>`;
  });

  return `<w:r><w:rPr>${rPrParts.join('')}</w:rPr>${contentParts.join('')}</w:r>`;
}

function buildImageRunXml(rId, docPrId, wPx, hPx) {
  const cx = Math.round(wPx * PX_TO_EMU);
  const cy = Math.round(hPx * PX_TO_EMU);
  return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="${docPrId}" name="Picture ${docPrId}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${docPrId}" name="image_${docPrId}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rId}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
}

function buildParagraphXml(runsXml, pOpts = {}) {
  const jc = pOpts.align ? `<w:jc w:val="${pOpts.align}"/>` : '';
  const before = pOpts.spaceBefore ?? 0;
  const after = pOpts.spaceAfter ?? 60;
  const line = pOpts.lineSpacing ?? 276;
  const spacing = `<w:spacing w:before="${before}" w:after="${after}" w:line="${line}" w:lineRule="auto"/>`;
  const borderTop = pOpts.borderTop ? '<w:pBdr><w:top w:val="single" w:sz="6" w:space="4" w:color="166534"/></w:pBdr>' : '';
  const borderBottom = pOpts.borderBottom ? '<w:pBdr><w:bottom w:val="single" w:sz="8" w:space="4" w:color="166534"/></w:pBdr>' : '';
  const pPr = `<w:pPr>${spacing}${borderTop}${borderBottom}${jc}</w:pPr>`;
  return `<w:p>${pPr}${runsXml || ''}</w:p>`;
}

export async function generateDocxFromHtml({ html = '', title = 'Document', marginMm = [14, 14, 14, 14] }) {
  const $ = cheerio.load(String(html || ''), { decodeEntities: true });
  $('script, style, noscript, .no-print').remove();

  const mediaFiles = [];
  const usedExtensions = new Set(['png', 'jpeg', 'gif']);
  let imageCounter = 0;

  function registerImage(src) {
    const resolved = resolveImageBuffer(src);
    if (!resolved) return null;
    imageCounter += 1;
    const rId = `rIdImg${imageCounter}`;
    const filename = `image${imageCounter}.${resolved.ext}`;
    usedExtensions.add(resolved.ext);
    mediaFiles.push({ rId, filename, buffer: resolved.buffer, ext: resolved.ext });
    return { rId, docPrId: imageCounter };
  }

  function collectInlineRuns(node, inherited = {}) {
    if (!node) return '';
    if (node.type === 'text') {
      const txt = node.data.replace(/\s+/g, ' ');
      if (!txt || (txt === ' ' && inherited.trimWhitespace)) return '';
      return buildRunXml(txt, inherited);
    }
    if (node.type !== 'tag') return '';

    const tag = node.name.toLowerCase();
    const $el = $(node);
    if ($el.hasClass('no-print')) return '';

    if (tag === 'br') {
      return '<w:r><w:br/></w:r>';
    }
    if (tag === 'img') {
      const reg = registerImage($el.attr('src'));
      if (!reg) return '';
      const { wPx, hPx } = parseImageSizePx(node, $);
      return buildImageRunXml(reg.rId, reg.docPrId, wPx, hPx);
    }

    const style = parseStyleMap($el.attr('style'));
    const next = { ...inherited };
    if (tag === 'b' || tag === 'strong' || style['font-weight'] === 'bold' || Number(style['font-weight']) >= 600) {
      next.bold = true;
    }
    if (tag === 'i' || tag === 'em' || style['font-style'] === 'italic') {
      next.italic = true;
    }
    if (tag === 'u' || (style['text-decoration'] || '').includes('underline')) {
      next.underline = true;
    }
    const c = normalizeHexColor(style.color);
    if (c) next.color = c;
    if (style['font-size']) next.halfPts = parseFontHalfPoints(style, next.halfPts || 22);

    if ($el.hasClass('passed-text')) next.color = '15803D';
    if ($el.hasClass('promoted-text')) next.color = 'B45309';
    if ($el.hasClass('failed-text')) next.color = 'B91C1C';

    let out = '';
    const children = node.children || [];
    children.forEach((child, idx) => {
      const childTag = child.type === 'tag' ? child.name.toLowerCase() : '';
      const isBlockChild = ['div', 'p', 'h1', 'h2', 'h3', 'h4'].includes(childTag);
      if (isBlockChild && idx > 0 && out) {
        out += '<w:r><w:br/></w:r>';
      }
      out += collectInlineRuns(child, next);
    });
    return out;
  }

  function convertTable(tableEl, options = {}) {
    const $tbl = $(tableEl);
    const isHeaderLayoutTable = options.borderless || $tbl.hasClass('header-table');
    const isGradeChart = $tbl.hasClass('grade-chart');
    const rows = $tbl.find('tr').filter((_, tr) => $(tr).closest('table')[0] === tableEl).toArray();
    if (!rows.length) return '';

    let maxCols = 0;
    rows.forEach((tr) => {
      let count = 0;
      $(tr).children('th, td').each((_, cell) => {
        const span = parseInt($(cell).attr('colspan') || '1', 10) || 1;
        count += span;
      });
      if (count > maxCols) maxCols = count;
    });
    if (maxCols <= 0) return '';

    const contentWidthTwips = A4_WIDTH_TWIPS - (marginMm[1] + marginMm[3]) * MM_TO_TWIPS;
    const defaultColW = Math.max(600, Math.floor(contentWidthTwips / maxCols));

    const gridCols = Array.from({ length: maxCols }, () => `<w:gridCol w:w="${Math.round(defaultColW)}"/>`).join('');
    const borderXml = isHeaderLayoutTable
      ? '<w:tblBorders><w:top w:val="none"/><w:left w:val="none"/><w:bottom w:val="none"/><w:right w:val="none"/><w:insideH w:val="none"/><w:insideV w:val="none"/></w:tblBorders>'
      : '<w:tblBorders><w:top w:val="single" w:sz="6" w:space="0" w:color="166534"/><w:left w:val="single" w:sz="6" w:space="0" w:color="166534"/><w:bottom w:val="single" w:sz="6" w:space="0" w:color="166534"/><w:right w:val="single" w:sz="6" w:space="0" w:color="166534"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="94A3B8"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="94A3B8"/></w:tblBorders>';

    const rowsXml = rows.map((tr) => {
      const cells = $(tr).children('th, td').toArray();
      const cellsXml = cells.map((cell) => {
        const $cell = $(cell);
        const isTh = cell.name.toLowerCase() === 'th';
        const span = parseInt($cell.attr('colspan') || '1', 10) || 1;
        const style = parseStyleMap($cell.attr('style'));
        const bgHex = normalizeHexColor(style.background || style['background-color']) || (isTh && !isGradeChart ? '166534' : '');
        const textAlign = style['text-align'] || (isTh ? 'center' : (isHeaderLayoutTable ? 'left' : 'center'));
        const jc = textAlign === 'left' ? 'left' : textAlign === 'right' ? 'right' : 'center';

        const cellProps = [
          span > 1 ? `<w:gridSpan w:val="${span}"/>` : '',
          bgHex ? `<w:shd w:val="clear" w:color="auto" w:fill="${bgHex}"/>` : '',
          '<w:vAlign w:val="center"/>',
        ].join('');

        // Nested table inside cell (like header-table holding grade-chart)
        const nestedTables = $cell.children('table').toArray();
        let innerBody = '';
        if (nestedTables.length > 0) {
          innerBody = nestedTables.map((nt) => convertTable(nt, options)).join('') + '<w:p/>';
        } else {
          const textColor = (isTh && !isGradeChart && !normalizeHexColor(style.color)) ? 'FFFFFF' : normalizeHexColor(style.color);
          const halfPts = isGradeChart ? 16 : parseFontHalfPoints(style, 21);
          const blockChildren = $cell.children('p, h1, h2, h3, h4, div').toArray();
          if (blockChildren.length > 0) {
            innerBody = blockChildren.map((bc) => {
              const bStyle = parseStyleMap($(bc).attr('style'));
              const bTag = bc.name.toLowerCase();
              const runs = collectInlineRuns(bc, {
                bold: isTh || bTag.startsWith('h'),
                color: normalizeHexColor(bStyle.color) || textColor,
                halfPts: bTag === 'h1' ? 30 : bTag === 'h2' ? 28 : parseFontHalfPoints(bStyle, halfPts),
              });
              const bAlign = bStyle['text-align'] || jc;
              return buildParagraphXml(runs, {
                align: bAlign === 'right' ? 'right' : bAlign === 'left' ? 'left' : 'center',
                spaceAfter: 30,
              });
            }).join('');
          } else {
            const runs = collectInlineRuns(cell, {
              bold: isTh,
              color: textColor,
              halfPts,
            });
            innerBody = buildParagraphXml(runs, { align: jc, spaceAfter: 20 });
          }
        }
        return `<w:tc><w:tcPr>${cellProps}</w:tcPr>${innerBody || '<w:p/>'}</w:tc>`;
      }).join('');
      return `<w:tr>${cellsXml}</w:tr>`;
    }).join('');

    return `<w:tbl><w:tblPr><w:tblW w:w="${Math.round(contentWidthTwips)}" w:type="dxa"/>${borderXml}<w:tblCellMar><w:top w:w="70" w:type="dxa"/><w:left w:w="90" w:type="dxa"/><w:bottom w:w="70" w:type="dxa"/><w:right w:w="90" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${gridCols}</w:tblGrid>${rowsXml}</w:tbl><w:p><w:pPr><w:spacing w:before="0" w:after="40"/></w:pPr></w:p>`;
  }

  function convertFlexRowToTable(el, options = {}) {
    const $el = $(el);
    const items = $el.children().toArray().filter((ch) => !$(ch).hasClass('no-print'));
    if (!items.length) return '';

    const contentWidthTwips = A4_WIDTH_TWIPS - (marginMm[1] + marginMm[3]) * MM_TO_TWIPS;
    const colW = Math.max(800, Math.floor(contentWidthTwips / items.length));
    const gridCols = items.map(() => `<w:gridCol w:w="${colW}"/>`).join('');

    const bordered = Boolean(options.bordered);
    const borderColor = options.borderColor || '166534';
    const borderXml = bordered
      ? `<w:tblBorders><w:top w:val="single" w:sz="6" w:space="0" w:color="${borderColor}"/><w:left w:val="single" w:sz="6" w:space="0" w:color="${borderColor}"/><w:bottom w:val="single" w:sz="6" w:space="0" w:color="${borderColor}"/><w:right w:val="single" w:sz="6" w:space="0" w:color="${borderColor}"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="${borderColor}"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="${borderColor}"/></w:tblBorders>`
      : '<w:tblBorders><w:top w:val="none"/><w:left w:val="none"/><w:bottom w:val="none"/><w:right w:val="none"/><w:insideH w:val="none"/><w:insideV w:val="none"/></w:tblBorders>';

    const cellsXml = items.map((item, idx) => {
      const $item = $(item);
      if (item.name && item.name.toLowerCase() === 'table') {
        return `<w:tc><w:tcPr><w:vAlign w:val="center"/></w:tcPr>${convertTable(item, { borderless: false })}</w:tc>`;
      }
      const align = options.alignEach
        ? options.alignEach
        : items.length === 2
          ? (idx === 0 ? 'left' : 'right')
          : 'center';

      const blockKids = $item.children('h1, h2, h3, h4, p, div').toArray();
      let cellBody = '';
      if (blockKids.length > 0) {
        cellBody = blockKids.map((kid) => {
          const kTag = kid.name.toLowerCase();
          const kStyle = parseStyleMap($(kid).attr('style'));
          const isSignLine = $(kid).hasClass('a4-sign-line') || $(kid).hasClass('sig-box') || Boolean(kStyle['border-top']);
          const runs = collectInlineRuns(kid, {
            bold: Boolean(options.bold) || kTag.startsWith('h') || isSignLine,
            halfPts: kTag === 'h2' ? 28 : kTag === 'h1' ? 30 : 21,
            color: normalizeHexColor(kStyle.color) || (kTag.startsWith('h') ? '14532D' : ''),
          });
          return buildParagraphXml(runs, {
            align: options.centerHeaders && kTag.startsWith('h') ? 'center' : align,
            spaceAfter: 30,
            borderTop: isSignLine,
          });
        }).join('');
      } else {
        const iStyle = parseStyleMap($item.attr('style'));
        const isSignLine = Boolean(options.isSignRow) || $item.hasClass('sig-box') || $item.hasClass('a4-sign-box') || Boolean(iStyle['border-top']);
        const runs = collectInlineRuns(item, {
          bold: Boolean(options.bold) || isSignLine,
          halfPts: 21,
          color: normalizeHexColor(iStyle.color) || (isSignLine ? '14532D' : ''),
        });
        cellBody = buildParagraphXml(runs, {
          align,
          spaceAfter: 30,
          borderTop: isSignLine,
        });
      }
      return `<w:tc><w:tcPr><w:vAlign w:val="center"/></w:tcPr>${cellBody || '<w:p/>'}</w:tc>`;
    }).join('');

    const bottomSpace = options.isHeader ? '<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="10" w:space="4" w:color="166534"/></w:pBdr><w:spacing w:before="0" w:after="80"/></w:pPr></w:p>' : '<w:p><w:pPr><w:spacing w:before="0" w:after="60"/></w:pPr></w:p>';
    return `<w:tbl><w:tblPr><w:tblW w:w="${Math.round(contentWidthTwips)}" w:type="dxa"/>${borderXml}<w:tblCellMar><w:top w:w="60" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${gridCols}</w:tblGrid><w:tr>${cellsXml}</w:tr></w:tbl>${bottomSpace}`;
  }

  function convertNode(node) {
    if (!node) return '';
    if (node.type === 'text') {
      const txt = node.data.replace(/\s+/g, ' ').trim();
      if (!txt) return '';
      return buildParagraphXml(buildRunXml(txt, { halfPts: 22 }));
    }
    if (node.type !== 'tag') return '';

    const tag = node.name.toLowerCase();
    const $el = $(node);
    if ($el.hasClass('no-print')) return '';

    if (tag === 'table') {
      return convertTable(node);
    }

    if ($el.hasClass('a4-inst-header') || $el.hasClass('cert-header')) {
      return convertFlexRowToTable(node, { bordered: false, isHeader: true, centerHeaders: true });
    }
    if ($el.hasClass('a4-summary-grid') || $el.hasClass('status-box')) {
      return convertFlexRowToTable(node, { bordered: true, bold: true, alignEach: 'center' });
    }
    if ($el.hasClass('a4-sign-row') || $el.hasClass('sign-row') || $el.hasClass('signature-area')) {
      return '<w:p><w:pPr><w:spacing w:before="360" w:after="0"/></w:pPr></w:p>' +
        convertFlexRowToTable(node, { bordered: false, bold: true, isSignRow: true, alignEach: 'center' });
    }
    if ($el.hasClass('info-bar') || $el.hasClass('a4-memo-row') || $el.hasClass('doc-row')) {
      return convertFlexRowToTable(node, { bordered: false, bold: $el.hasClass('info-bar') || $el.hasClass('a4-memo-row') });
    }

    const style = parseStyleMap($el.attr('style'));
    if (style.display === 'flex' || style.display === 'grid') {
      const children = $el.children().toArray();
      if (children.length > 1 && children.length <= 5 && children.every((c) => $(c).find('table').length === 0)) {
        return convertFlexRowToTable(node, { bordered: false });
      }
    }

    if ($el.hasClass('a4-doc-badge') || $el.hasClass('cert-title') || $el.hasClass('doc-badge')) {
      const runs = collectInlineRuns(node, { bold: true, underline: true, color: '14532D', halfPts: 26 });
      return buildParagraphXml(runs, { align: 'center', spaceBefore: 100, spaceAfter: 140 });
    }

    if ($el.hasClass('merit-header')) {
      return $el.children().toArray().map((c) => convertNode(c)).join('');
    }

    if (['h1', 'h2', 'h3', 'h4', 'p'].includes(tag)) {
      const jc = style['text-align'] === 'right' ? 'right'
        : style['text-align'] === 'justify' ? 'both'
          : (style['text-align'] === 'center' || tag.startsWith('h') ? 'center' : 'left');
      const runs = collectInlineRuns(node, {
        bold: tag.startsWith('h'),
        halfPts: tag === 'h1' ? 32 : tag === 'h2' ? 28 : tag === 'h3' ? 24 : parseFontHalfPoints(style, 22),
        color: normalizeHexColor(style.color) || (tag.startsWith('h') ? '14532D' : ''),
      });
      return buildParagraphXml(runs, { align: jc, spaceBefore: tag.startsWith('h') ? 60 : 0, spaceAfter: 80 });
    }

    // Container element: check if it contains block children; otherwise emit as single paragraph
    const children = node.children || [];
    const hasBlockChild = children.some((c) => {
      if (c.type !== 'tag') return false;
      const t = c.name.toLowerCase();
      return ['div', 'p', 'table', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'section'].includes(t);
    });

    if (hasBlockChild) {
      let out = '';
      let inlineBuffer = '';
      const flushInline = () => {
        if (inlineBuffer) {
          out += buildParagraphXml(inlineBuffer, {
            align: style['text-align'] === 'justify' ? 'both' : style['text-align'] === 'center' ? 'center' : 'left',
            spaceAfter: 80,
          });
          inlineBuffer = '';
        }
      };
      for (const ch of children) {
        if (ch.type === 'tag' && ['div', 'p', 'table', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'section'].includes(ch.name.toLowerCase())) {
          flushInline();
          out += convertNode(ch);
        } else {
          inlineBuffer += collectInlineRuns(ch, {
            halfPts: parseFontHalfPoints(style, 22),
            color: normalizeHexColor(style.color),
          });
        }
      }
      flushInline();
      return out;
    }

    const runs = collectInlineRuns(node, {
      bold: style['font-weight'] === 'bold' || Number(style['font-weight']) >= 600,
      halfPts: parseFontHalfPoints(style, 22),
      color: normalizeHexColor(style.color),
    });
    if (!runs) return '';
    const align = style['text-align'] === 'justify' || $el.hasClass('a4-body-text') || $el.hasClass('cert-body-text')
      ? 'both'
      : style['text-align'] === 'center'
        ? 'center'
        : style['text-align'] === 'right'
          ? 'right'
          : 'left';
    return buildParagraphXml(runs, { align, spaceAfter: 90 });
  }

  let bodyXml = '';
  const a4Pages = $('.a4-page').toArray();
  if (a4Pages.length > 0) {
    bodyXml = a4Pages.map((pg, idx) => {
      const breakXml = idx > 0 ? '<w:p><w:r><w:br w:type="page"/></w:r></w:p>' : '';
      return breakXml + convertNode(pg);
    }).join('');
  } else {
    const rootChildren = $('body').length ? $('body').children().toArray() : $.root().children().toArray();
    bodyXml = rootChildren.map((n) => convertNode(n)).join('');
  }

  if (!bodyXml.trim()) {
    bodyXml = buildParagraphXml(buildRunXml(title || 'Document', { halfPts: 24 }));
  }

  const mTop = Math.round((Number(marginMm[0]) || 14) * MM_TO_TWIPS);
  const mRight = Math.round((Number(marginMm[1]) || 14) * MM_TO_TWIPS);
  const mBottom = Math.round((Number(marginMm[2]) || 14) * MM_TO_TWIPS);
  const mLeft = Math.round((Number(marginMm[3]) || 14) * MM_TO_TWIPS);

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
  xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
  xmlns:v="urn:schemas-microsoft-com:vml"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:w10="urn:schemas-microsoft-com:office:word"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml"
  mc:Ignorable="w14 wp14">
  <w:body>
    ${bodyXml}
    <w:sectPr>
      <w:pgSz w:w="${A4_WIDTH_TWIPS}" w:h="${A4_HEIGHT_TWIPS}"/>
      <w:pgMar w:top="${mTop}" w:right="${mRight}" w:bottom="${mBottom}" w:left="${mLeft}" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Nikosh" w:hAnsi="Nikosh" w:cs="Nikosh" w:eastAsia="Nikosh"/>
        <w:sz w:val="22"/>
        <w:szCs w:val="22"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:after="80" w:line="276" w:lineRule="auto"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:rPr>
      <w:rFonts w:ascii="Nikosh" w:hAnsi="Nikosh" w:cs="Nikosh" w:eastAsia="Nikosh"/>
      <w:sz w:val="22"/>
      <w:szCs w:val="22"/>
    </w:rPr>
  </w:style>
</w:styles>`;

  const relsRoot = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const imageRels = mediaFiles
    .map((m) => `<Relationship Id="${m.rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${m.filename}"/>`)
    .join('\n  ');

  const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/relationships">
  <Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  ${imageRels}
</Relationships>`;

  const extDefaults = [
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
    '<Default Extension="xml" ContentType="application/xml"/>',
    usedExtensions.has('png') ? '<Default Extension="png" ContentType="image/png"/>' : '',
    usedExtensions.has('jpeg') ? '<Default Extension="jpeg" ContentType="image/jpeg"/>' : '',
    usedExtensions.has('gif') ? '<Default Extension="gif" ContentType="image/gif"/>' : '',
  ].filter(Boolean).join('\n  ');

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/content-types">
  ${extDefaults}
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;

  const zip = new JSZip();
  zip.file('[Content_Types].xml', contentTypes);
  zip.folder('_rels').file('.rels', relsRoot);
  const wordDir = zip.folder('word');
  wordDir.file('document.xml', documentXml);
  wordDir.file('styles.xml', stylesXml);
  wordDir.folder('_rels').file('document.xml.rels', docRels);
  if (mediaFiles.length > 0) {
    const mediaDir = wordDir.folder('media');
    for (const m of mediaFiles) {
      mediaDir.file(m.filename, m.buffer);
    }
  }

  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}
