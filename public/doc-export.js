(function (global) {
  let cachedLogoDataUrl = null;
  let html2pdfPromise = null;

  async function ensureHtml2Pdf() {
    if (typeof global.html2pdf === 'function') {
      return global.html2pdf;
    }
    if (!html2pdfPromise) {
      html2pdfPromise = new Promise((resolve, reject) => {
        const existing = document.querySelector('script[src*="/vendor/html2pdf.bundle.min.js"]');
        if (existing) {
          const started = Date.now();
          const timer = setInterval(() => {
            if (typeof global.html2pdf === 'function') {
              clearInterval(timer);
              resolve(global.html2pdf);
            } else if (Date.now() - started > 10000) {
              clearInterval(timer);
              reject(new Error('PDF লাইব্রেরি লোড হতে সময় বেশি লাগছে।'));
            }
          }, 80);
          return;
        }
        const script = document.createElement('script');
        script.src = '/vendor/html2pdf.bundle.min.js';
        script.onload = () => {
          if (typeof global.html2pdf === 'function') resolve(global.html2pdf);
          else reject(new Error('PDF লাইব্রেরি চালু করা যায়নি।'));
        };
        script.onerror = () => reject(new Error('PDF লাইব্রেরি ফাইল লোড হয়নি।'));
        document.head.appendChild(script);
      });
    }
    return html2pdfPromise;
  }

  async function getLogoDataUrl() {
    if (cachedLogoDataUrl) return cachedLogoDataUrl;
    try {
      const res = await fetch('/logo.png');
      if (!res.ok) return null;
      const blob = await res.blob();
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      cachedLogoDataUrl = String(dataUrl || '');
      return cachedLogoDataUrl || null;
    } catch {
      return null;
    }
  }

  function postDownloadForm(actionUrl, fields) {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = actionUrl;
    form.style.display = 'none';

    Object.entries(fields || {}).forEach(([name, value]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = String(value ?? '');
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
    setTimeout(() => {
      if (form.parentNode) form.parentNode.removeChild(form);
    }, 1000);
  }

  function triggerBlobDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (a.parentNode) a.parentNode.removeChild(a);
      URL.revokeObjectURL(url);
    }, 30000);
  }

  async function replaceLocalImagesWithDataUri(rootEl) {
    const logoData = await getLogoDataUrl();
    const imgs = rootEl.querySelectorAll('img');
    imgs.forEach((img) => {
      const src = img.getAttribute('src') || '';
      if (logoData && (src === '/logo.png' || src.endsWith('/logo.png'))) {
        img.setAttribute('src', logoData);
      } else if (src.startsWith('/')) {
        img.setAttribute('src', global.location.origin + src);
      }
    });
  }

  function detectOrientation(element, explicitOrientation) {
    if (explicitOrientation === 'landscape' || explicitOrientation === 'portrait') {
      return explicitOrientation;
    }
    if (element && element.classList && element.classList.contains('is-landscape')) {
      return 'landscape';
    }
    if (element && element.querySelector && element.querySelector('.is-landscape')) {
      return 'landscape';
    }
    return 'portrait';
  }

  async function exportElementToA4Pdf({ element, filename = 'document.pdf', marginMm = 0, orientation, onStatus }) {
    if (!element) {
      throw new Error('প্রিভিউ কন্টেন্ট পাওয়া যায়নি।');
    }
    if (typeof onStatus === 'function') {
      onStatus('PDF তৈরি হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...', false);
    }

    const resolvedOrientation = detectOrientation(element, orientation);
    const isLandscape = resolvedOrientation === 'landscape';
    const pageWidthMm = isLandscape ? '297mm' : '210mm';
    const pageMinHeightMm = isLandscape ? '208mm' : '295mm';

    const html2pdfFn = await ensureHtml2Pdf();
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    const host = document.createElement('div');
    host.style.position = 'fixed';
    host.style.left = '-12000px';
    host.style.top = '0';
    host.style.width = pageWidthMm;
    host.style.background = '#ffffff';
    host.style.color = '#0f172a';
    host.style.margin = '0';
    host.style.padding = '0';
    host.style.zIndex = '-1';
    host.style.pointerEvents = 'none';
    host.style.opacity = '1';
    host.style.fontFamily = "'Nikosh', 'Kalpurush', sans-serif";

    const clone = element.cloneNode(true);
    clone.style.fontFamily = "'Nikosh', 'Kalpurush', sans-serif";
    clone.querySelectorAll('.no-print').forEach((n) => n.remove());

    if (clone.classList && clone.classList.contains('a4-pages-stack')) {
      clone.style.display = 'block';
      clone.style.gap = '0';
      clone.style.width = pageWidthMm;
      clone.style.margin = '0';
    }

    if (clone.classList && clone.classList.contains('a4-doc-sheet')) {
      clone.style.width = pageWidthMm;
      clone.style.minHeight = pageMinHeightMm;
      clone.style.boxShadow = 'none';
      clone.style.border = 'none';
      clone.style.margin = '0';
    }

    const pages = clone.querySelectorAll ? clone.querySelectorAll('.a4-page') : [];
    pages.forEach((pg, idx) => {
      pg.style.width = pageWidthMm;
      pg.style.minHeight = pageMinHeightMm;
      pg.style.boxShadow = 'none';
      pg.style.margin = '0';
      if (idx === pages.length - 1) {
        pg.style.pageBreakAfter = 'auto';
        pg.style.breakAfter = 'auto';
      }
    });

    if (clone.classList && clone.classList.contains('marksheet')) {
      clone.style.width = '210mm';
      clone.style.minHeight = '295mm';
      clone.style.boxShadow = 'none';
      clone.style.border = 'none';
      clone.style.margin = '0';
    }

    if (clone.id === 'meritPrintArea') {
      clone.style.boxShadow = 'none';
      clone.style.border = 'none';
      clone.style.width = '100%';
    }

    await replaceLocalImagesWithDataUri(clone);
    host.appendChild(clone);
    document.body.appendChild(host);

    try {
      const marginOpt = Array.isArray(marginMm) ? marginMm : Number(marginMm) || 0;
      const worker = html2pdfFn()
        .set({
          margin: marginOpt,
          filename,
          image: { type: 'jpeg', quality: 0.96 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            scrollX: 0,
            scrollY: 0,
          },
          jsPDF: { unit: 'mm', format: 'a4', orientation: resolvedOrientation },
          pagebreak: { mode: ['css', 'legacy'] },
        })
        .from(clone)
        .toPdf();

      const pdf = await worker.get('pdf');
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        const blob = pdf.output('blob');
        triggerBlobDownload(blob, filename);
      } else {
        const dataUri = pdf.output('datauristring');
        if (dataUri && dataUri.length < 18 * 1024 * 1024) {
          postDownloadForm('/api/export/pdf-relay', {
            data: dataUri,
            filename,
          });
        } else {
          const blob = pdf.output('blob');
          triggerBlobDownload(blob, filename);
        }
      }

      if (typeof onStatus === 'function') {
        onStatus('PDF ডাউনলোড শুরু হয়েছে।', false);
      }
    } finally {
      if (host.parentNode) host.parentNode.removeChild(host);
    }
  }

  function cleanText(str) {
    return String(str || '').replace(/\s+/g, ' ').trim();
  }

  function extractHeaderFromEl(headerEl) {
    const h2 = headerEl.querySelector('h2');
    const title = h2 ? cleanText(h2.textContent) : '';
    const lines = [];
    headerEl.querySelectorAll('p').forEach((p) => {
      const t = cleanText(p.textContent);
      if (t) lines.push(t);
    });
    const gradeTable = headerEl.querySelector('table.grade-chart, table');
    const gradeRows = [];
    if (gradeTable && headerEl.tagName === 'TABLE') {
      const nested = headerEl.querySelector('table');
      if (nested) {
        nested.querySelectorAll('tr').forEach((tr) => {
          const rowVals = Array.from(tr.children).map((c) => cleanText(c.textContent));
          if (rowVals.length) gradeRows.push(rowVals);
        });
      }
    } else if (gradeTable) {
      gradeTable.querySelectorAll('tr').forEach((tr) => {
        const rowVals = Array.from(tr.children).map((c) => cleanText(c.textContent));
        if (rowVals.length) gradeRows.push(rowVals);
      });
    }
    return { type: 'header', title, lines, gradeRows };
  }

  function extractTableBlock(tableEl) {
    const rows = [];
    tableEl.querySelectorAll('tr').forEach((tr) => {
      const cells = Array.from(tr.children).map((cell) => {
        const isHeader = cell.tagName === 'TH';
        const styleAlign = (cell.style && cell.style.textAlign) || '';
        const align = styleAlign === 'left' ? 'left' : (styleAlign === 'right' ? 'right' : 'center');
        return {
          text: cleanText(cell.textContent),
          isHeader,
          align,
          bold: isHeader || (cell.style && cell.style.fontWeight === '700'),
        };
      });
      if (cells.length) {
        const bg = (tr.style && tr.style.background) || '';
        rows.push({
          isHeader: cells.every((c) => c.isHeader),
          highlight: bg.includes('fefce8'),
          cells,
        });
      }
    });
    return rows.length ? { type: 'table', rows } : null;
  }

  function extractPageBlocks(root) {
    const blocks = [];
    const seenTables = new WeakSet();

    function walk(node) {
      if (!node || node.nodeType !== 1) return;
      const el = node;
      if (el.classList.contains('no-print') || el.tagName === 'SVG' || el.tagName === 'STYLE' || el.tagName === 'SCRIPT') {
        return;
      }

      if (el.classList.contains('trad-bismillah')) {
        blocks.push({ type: 'header', bismillah: cleanText(el.textContent), title: '', lines: [] });
        return;
      }

      if (el.classList.contains('trad-inst-head')) {
        const hdr = extractHeaderFromEl(el);
        const prev = blocks[blocks.length - 1];
        if (prev && prev.type === 'header' && prev.bismillah && !prev.title) {
          prev.title = hdr.title;
          prev.lines = hdr.lines;
        } else {
          blocks.push(hdr);
        }
        return;
      }

      if (el.classList.contains('a4-inst-header') || el.classList.contains('cert-inst-header') || el.classList.contains('header-wrapper') || el.classList.contains('header-table') || el.classList.contains('ms-board-header')) {
        blocks.push(extractHeaderFromEl(el));
        el.querySelectorAll('table').forEach((t) => seenTables.add(t));
        return;
      }

      if (el.classList.contains('trad-title-ribbon-row')) {
        const left = el.querySelector('.trad-memo-cell:not(.is-right)');
        const plaque = el.querySelector('.trad-ribbon-plaque');
        const right = el.querySelector('.trad-memo-cell.is-right');
        blocks.push({
          type: 'rowStrip',
          cells: [
            { text: left ? cleanText(left.textContent) : '', bold: true },
            { text: plaque ? cleanText(plaque.textContent) : '', bold: true, align: 'center', size: 24, color: '14532D' },
            { text: right ? cleanText(right.textContent) : '', bold: true },
          ],
        });
        return;
      }

      if (el.classList.contains('form-title') || el.classList.contains('a4-doc-badge') || el.classList.contains('ms-transcript-title')) {
        blocks.push({ type: 'badge', text: cleanText(el.textContent) });
        return;
      }

      if (el.classList.contains('section-title')) {
        blocks.push({ type: 'heading', text: cleanText(el.textContent) });
        return;
      }

      if (el.classList.contains('trad-line-row')) {
        const lineText = cleanText(el.textContent);
        if (lineText) blocks.push({ type: 'paragraph', text: lineText });
        return;
      }

      if (el.classList.contains('trad-para') || el.classList.contains('trad-para-wish') || el.classList.contains('a4-body-text')) {
        const paraText = cleanText(el.textContent);
        if (paraText) blocks.push({ type: 'paragraph', text: paraText, align: 'justify' });
        return;
      }

      if (el.classList.contains('info-bar') || el.classList.contains('ms-student-grid')) {
        const items = [];
        el.querySelectorAll('.ms-info-cell, span, div').forEach((ch) => {
          if (ch.parentElement !== el && !ch.classList.contains('ms-info-cell')) return;
          const lbl = ch.querySelector('.ms-info-lbl');
          const val = ch.querySelector('.ms-info-val');
          if (lbl && val) {
            items.push({ label: cleanText(lbl.textContent).replace(/:$/, ''), value: cleanText(val.textContent) });
          } else {
            const t = cleanText(ch.textContent);
            if (t) items.push({ text: t });
          }
        });
        if (items.length) blocks.push({ type: 'kvGrid', columns: 2, bordered: el.classList.contains('ms-student-grid'), items });
        return;
      }

      if (el.classList.contains('doc-row')) {
        const items = [];
        el.querySelectorAll('.doc-field').forEach((f) => {
          const lbl = f.querySelector('.doc-label');
          const val = f.querySelector('.dotted-line');
          if (lbl && val) {
            items.push({ label: cleanText(lbl.textContent).replace(/:$/, ''), value: cleanText(val.textContent) });
          }
        });
        if (items.length) blocks.push({ type: 'kvGrid', columns: Math.min(items.length, 3), items });
        return;
      }

      if (el.classList.contains('doc-field')) {
        const lbl = el.querySelector('.doc-label');
        const val = el.querySelector('.dotted-line');
        if (lbl && val) {
          blocks.push({ type: 'kvGrid', columns: 1, items: [{ label: cleanText(lbl.textContent).replace(/:$/, ''), value: cleanText(val.textContent) }] });
          return;
        }
      }

      if (el.classList.contains('status-box') || el.classList.contains('ms-summary') || el.classList.contains('a4-summary-grid')) {
        const items = Array.from(el.children)
          .map((d) => ({ text: cleanText(d.textContent) }))
          .filter((x) => x.text);
        if (items.length) blocks.push({ type: 'kvGrid', columns: Math.min(items.length, 4), bordered: true, items });
        return;
      }

      if (el.classList.contains('sign-row') || el.classList.contains('signature-area') || el.classList.contains('a4-sign-row') || el.classList.contains('trad-sign-footer')) {
        const cells = Array.from(el.children)
          .map((d) => ({ text: cleanText(d.textContent), bold: true, align: 'center', size: 19 }))
          .filter((x) => x.text);
        if (cells.length) blocks.push({ type: 'rowStrip', cells, topRule: true, topSpacer: true });
        return;
      }

      if (el.tagName === 'TABLE') {
        if (seenTables.has(el)) return;
        seenTables.add(el);
        const tbl = extractTableBlock(el);
        if (tbl) blocks.push(tbl);
        return;
      }

      if (el.tagName === 'H1' || el.tagName === 'H2' || el.tagName === 'H3') {
        const t = cleanText(el.textContent);
        if (t) blocks.push({ type: 'heading', text: t, align: 'center' });
        return;
      }

      if (el.tagName === 'P') {
        const t = cleanText(el.textContent);
        if (t) blocks.push({ type: 'paragraph', text: t });
        return;
      }

      for (let i = 0; i < el.children.length; i++) {
        walk(el.children[i]);
      }
    }

    walk(root);
    return blocks;
  }

  function extractDocPages(clone) {
    const a4Pages = clone.querySelectorAll('.a4-page');
    if (a4Pages.length > 0) {
      return Array.from(a4Pages).map((pg) => ({
        blocks: extractPageBlocks(pg),
      }));
    }
    return [{ blocks: extractPageBlocks(clone) }];
  }

  function toRtfUnicode(str) {
    let out = '';
    const s = String(str || '');
    for (let i = 0; i < s.length; i++) {
      const code = s.charCodeAt(i);
      if (code === 92 || code === 123 || code === 125) {
        out += '\\' + s[i];
      } else if (code < 128) {
        out += s[i];
      } else {
        out += '\\u' + code + '?';
      }
    }
    return out;
  }

  function buildRtfFromPages(pages, orientation) {
    const isLandscape = orientation === 'landscape';
    const header = isLandscape
      ? '{\\rtf1\\ansi\\deff0\\landscape\\paperw16838\\paperh11906\\margl720\\margr720\\margt720\\margb720\n'
      : '{\\rtf1\\ansi\\deff0\\paperw11906\\paperh16838\\margl720\\margr720\\margt720\\margb720\n';
    const parts = [header];
    pages.forEach((pg, pgIdx) => {
      if (pgIdx > 0) parts.push('\\page\n');
      (pg.blocks || []).forEach((blk) => {
        if (blk.type === 'header') {
          if (blk.bismillah) parts.push('\\pard\\qc\\b\\fs24 ' + toRtfUnicode(blk.bismillah) + '\\b0\\par\n');
          if (blk.title) parts.push('\\pard\\qc\\b\\fs32 ' + toRtfUnicode(blk.title) + '\\b0\\par\n');
          (blk.lines || []).forEach((ln) => parts.push('\\pard\\qc\\fs22 ' + toRtfUnicode(ln) + '\\par\n'));
        } else if (blk.type === 'badge' || blk.type === 'heading') {
          parts.push('\\pard\\qc\\b\\fs26 ' + toRtfUnicode(blk.text) + '\\b0\\par\n');
        } else if (blk.type === 'paragraph') {
          parts.push('\\pard\\qj\\fs22 ' + toRtfUnicode(blk.text) + '\\par\n');
        } else if (blk.type === 'kvGrid') {
          const line = (blk.items || []).map((it) => it.text || ((it.label ? it.label + ': ' : '') + (it.value || ''))).join('   |   ');
          if (line) parts.push('\\pard\\ql\\fs22 ' + toRtfUnicode(line) + '\\par\n');
        } else if (blk.type === 'rowStrip') {
          const line = (blk.cells || []).map((c) => c.text).filter(Boolean).join('     |     ');
          if (line) parts.push('\\pard\\qc\\b\\fs22 ' + toRtfUnicode(line) + '\\b0\\par\n');
        } else if (blk.type === 'table') {
          (blk.rows || []).forEach((row) => {
            const line = (row.cells || []).map((c) => c.text).join('  |  ');
            parts.push('\\pard\\ql\\fs20 ' + toRtfUnicode(line) + '\\par\n');
          });
        }
      });
    });
    parts.push('}');
    return parts.join('');
  }

  async function exportElementToWord({ element, filename = 'document.docx', title = 'Document', cssText = '', orientation, marginMm = 14, onStatus }) {
    if (!element) {
      throw new Error('ডকুমেন্ট কন্টেন্ট পাওয়া যায়নি।');
    }
    const clone = element.cloneNode(true);
    clone.querySelectorAll('.no-print').forEach((n) => n.remove());

    const resolvedOrientation = detectOrientation(element, orientation);
    const pages = extractDocPages(clone);
    const docxFilename = String(filename || 'document.docx').replace(/\.docx?$/i, '') + '.docx';

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const rtf = buildRtfFromPages(pages, resolvedOrientation);
      const rtfFilename = docxFilename.replace(/\.docx$/i, '.rtf');
      const blob = new Blob([rtf], { type: 'application/rtf;charset=utf-8' });
      triggerBlobDownload(blob, rtfFilename);
    } else {
      postDownloadForm('/api/export/word', {
        payload: JSON.stringify({
          pages,
          orientation: resolvedOrientation,
          title: String(title || 'Document'),
          marginMm: Number(marginMm) || 14,
        }),
        html: clone.innerHTML,
        orientation: resolvedOrientation,
        title: String(title || 'Document'),
        filename: docxFilename,
      });
    }

    if (typeof onStatus === 'function') {
      onStatus('Word (.docx) ফাইল ডাউনলোড শুরু হয়েছে।', false);
    }
  }

  global.NadufmExport = {
    postDownloadForm,
    triggerBlobDownload,
    exportElementToA4Pdf,
    exportElementToWord,
    ensureHtml2Pdf,
  };
})(window);
