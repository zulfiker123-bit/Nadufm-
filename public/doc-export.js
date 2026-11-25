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

  async function exportElementToA4Pdf({ element, filename = 'document.pdf', marginMm = 0, onStatus }) {
    if (!element) {
      throw new Error('প্রিভিউ কন্টেন্ট পাওয়া যায়নি।');
    }
    if (typeof onStatus === 'function') {
      onStatus('PDF তৈরি হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...', false);
    }

    const html2pdfFn = await ensureHtml2Pdf();
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    const host = document.createElement('div');
    host.style.position = 'fixed';
    host.style.left = '-12000px';
    host.style.top = '0';
    host.style.width = '210mm';
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
      clone.style.width = '210mm';
      clone.style.margin = '0';
    }

    const pages = clone.querySelectorAll ? clone.querySelectorAll('.a4-page') : [];
    pages.forEach((pg, idx) => {
      pg.style.width = '210mm';
      pg.style.minHeight = '295mm';
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
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['css', 'legacy'] },
        })
        .from(clone)
        .toPdf();

      const pdf = await worker.get('pdf');
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

      if (typeof onStatus === 'function') {
        onStatus('PDF ডাউনলোড শুরু হয়েছে।', false);
      }
    } finally {
      if (host.parentNode) host.parentNode.removeChild(host);
    }
  }

  async function exportElementToWord({ element, filename = 'document.doc', title = 'Document', cssText = '', onStatus }) {
    if (!element) {
      throw new Error('ডকুমেন্ট কন্টেন্ট পাওয়া যায়নি।');
    }
    const clone = element.cloneNode(true);
    clone.querySelectorAll('.no-print').forEach((n) => n.remove());
    await replaceLocalImagesWithDataUri(clone);

    clone.querySelectorAll('.a4-page').forEach((pg, idx) => {
      pg.style.padding = '0';
      pg.style.width = 'auto';
      pg.style.minHeight = 'auto';
      pg.style.boxShadow = 'none';
      if (idx > 0) {
        pg.insertAdjacentHTML('beforebegin', '<br clear="all" style="page-break-before:always;" />');
      }
    });

    const fullHtml = [
      '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">',
      '<head><meta charset="utf-8"><title>' + String(title || 'Document') + '</title>',
      '<style>' + cssText + '</style></head>',
      '<body><div class="Section1">' + clone.innerHTML + '</div></body></html>',
    ].join('');

    postDownloadForm('/api/export/word', {
      html: fullHtml,
      filename,
    });

    if (typeof onStatus === 'function') {
      onStatus('Word (.doc) ফাইল ডাউনলোড শুরু হয়েছে।', false);
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
