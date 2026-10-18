// PDF viewer built on pdf.js (bundled locally so it works offline).
// Pages render only when near the screen and are released when far away,
// which keeps memory low on iPhone for long lecture slide decks.

let lib;
async function pdfjs() {
  if (!lib) {
    lib = await import('../vendor/pdfjs/pdf.min.mjs');
    lib.GlobalWorkerOptions.workerSrc = new URL('../vendor/pdfjs/pdf.worker.min.mjs', import.meta.url).href;
  }
  return lib;
}

export async function mountPdf(container, arrayBuffer, { onInfo } = {}) {
  const { getDocument } = await pdfjs();
  // Copy: pdf.js transfers the buffer to its worker.
  const doc = await getDocument({ data: new Uint8Array(arrayBuffer.slice(0)), isEvalSupported: false }).promise;
  onInfo?.({ pages: doc.numPages });

  let zoom = 1;
  const pages = [];
  container.innerHTML = '';
  container.classList.add('pdf-pages');

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const vp = page.getViewport({ scale: 1 });
    const holder = document.createElement('div');
    holder.className = 'pdf-page';
    holder.dataset.n = i;
    holder.style.aspectRatio = `${vp.width} / ${vp.height}`;
    holder.innerHTML = `<span class="pdf-num">${i}</span>`;
    container.append(holder);
    pages.push({ page, vp, holder, canvas: null, task: null });
    if (i > 400) break; // safety cap
  }

  const applyWidth = () => {
    container.style.setProperty('--pdf-zoom', zoom);
  };
  applyWidth();

  async function render(p) {
    if (p.canvas || p.task) return;
    const cssW = p.holder.clientWidth || container.clientWidth;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    // Cap canvas size: iOS has a hard per-canvas pixel limit.
    let scale = (cssW / p.vp.width) * dpr;
    const maxPixels = 12_000_000;
    if (p.vp.width * p.vp.height * scale * scale > maxPixels) scale = Math.sqrt(maxPixels / (p.vp.width * p.vp.height));
    const viewport = p.page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    p.task = p.page.render({ canvasContext: canvas.getContext('2d'), viewport });
    try {
      await p.task.promise;
      p.canvas = canvas;
      p.holder.append(canvas);
    } catch { /* cancelled */ }
    p.task = null;
  }

  function release(p) {
    if (p.task) { p.task.cancel(); p.task = null; }
    if (p.canvas) { p.canvas.width = 0; p.canvas.height = 0; p.canvas.remove(); p.canvas = null; }
  }

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const p = pages[e.target.dataset.n - 1];
      if (e.isIntersecting) render(p); else release(p);
    }
  }, { root: null, rootMargin: '1200px 0px' });
  pages.forEach((p) => io.observe(p.holder));

  return {
    pages: doc.numPages,
    setZoom(z) {
      zoom = Math.max(1, Math.min(3, z));
      applyWidth();
      pages.forEach(release);
      // Re-observe so visible pages re-render at the new size.
      pages.forEach((p) => { io.unobserve(p.holder); io.observe(p.holder); });
      return zoom;
    },
    get zoom() { return zoom; },
    destroy() {
      io.disconnect();
      pages.forEach(release);
      doc.destroy();
    },
  };
}
