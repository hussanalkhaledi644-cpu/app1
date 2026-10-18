// Small shared helpers: DOM, formatting, dialogs, toasts.

export const $ = (sel, el = document) => el.querySelector(sel);
export const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export function fmtBytes(n) {
  if (!n && n !== 0) return '';
  const u = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(i ? 1 : 0)} ${u[i]}`;
}

export function fmtDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return 'Today ' + d.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' });
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric' });
}

// Inline formatting on already-escaped text: **bold**, *italic*, `code`, ^sup^, ~sub~
function inline(s) {
  return s
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\^(.+?)\^/g, '<sup>$1</sup>')
    .replace(/~(.+?)~/g, '<sub>$1</sub>');
}

// Lightweight, safe Markdown-ish renderer for notes, questions and answers.
export function fmtText(src) {
  const lines = esc(src).split(/\r?\n/);
  let html = '';
  let list = null; // 'ul' | 'ol'
  const close = () => { if (list) { html += `</${list}>`; list = null; } };
  for (const raw of lines) {
    const line = raw.trimEnd();
    let m;
    if ((m = line.match(/^\s*[-•*]\s+(.*)$/))) {
      if (list !== 'ul') { close(); html += '<ul>'; list = 'ul'; }
      html += `<li>${inline(m[1])}</li>`;
    } else if ((m = line.match(/^\s*(\d+)[.)]\s+(.*)$/))) {
      if (list !== 'ol') { close(); html += '<ol>'; list = 'ol'; }
      html += `<li>${inline(m[2])}</li>`;
    } else if ((m = line.match(/^(#{1,3})\s+(.*)$/))) {
      close();
      const lvl = m[1].length + 2; // h3..h5
      html += `<h${lvl}>${inline(m[2])}</h${lvl}>`;
    } else if (line.trim() === '') {
      close();
      html += '<div class="gap"></div>';
    } else {
      close();
      html += `<p>${inline(line)}</p>`;
    }
  }
  close();
  return html;
}

let toastTimer;
export function toast(msg, opts = {}) {
  let t = $('#toast');
  if (!t) { t = el('<div id="toast" role="status"></div>'); document.body.append(t); }
  t.innerHTML = esc(msg) + (opts.action ? ` <button class="toast-btn">${esc(opts.action)}</button>` : '');
  if (opts.action) t.querySelector('button').onclick = () => { t.classList.remove('show'); opts.onAction?.(); };
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), opts.duration || 2600);
}

// Bottom sheet dialog. Returns a promise resolving to the clicked action's value (or null on dismiss).
export function sheet({ title = '', body = '', actions = [], onMount } = {}) {
  return new Promise((resolve) => {
    const wrap = el(`
      <div class="sheet-wrap">
        <div class="sheet-backdrop"></div>
        <div class="sheet" role="dialog" aria-modal="true">
          <div class="sheet-grip"></div>
          ${title ? `<h3 class="sheet-title">${esc(title)}</h3>` : ''}
          <div class="sheet-body">${body}</div>
          <div class="sheet-actions"></div>
        </div>
      </div>`);
    const done = (v) => {
      wrap.classList.remove('open');
      setTimeout(() => wrap.remove(), 220);
      resolve(v);
    };
    const bar = wrap.querySelector('.sheet-actions');
    for (const a of actions) {
      const b = el(`<button class="btn ${a.kind || ''}">${a.icon || ''}${esc(a.label)}</button>`);
      b.onclick = async () => {
        if (a.validate && !(await a.validate(wrap))) return;
        done(a.value !== undefined ? (typeof a.value === 'function' ? a.value(wrap) : a.value) : a.label);
      };
      bar.append(b);
    }
    wrap.querySelector('.sheet-backdrop').onclick = () => done(null);
    document.body.append(wrap);
    onMount?.(wrap, done);
    requestAnimationFrame(() => wrap.classList.add('open'));
  });
}

export async function confirmSheet(title, message, okLabel = 'Delete', kind = 'danger') {
  const v = await sheet({
    title,
    body: `<p class="muted">${esc(message)}</p>`,
    actions: [
      { label: okLabel, value: true, kind },
      { label: 'Cancel', value: false, kind: 'ghost' },
    ],
  });
  return v === true;
}

export async function promptSheet(title, { value = '', placeholder = '', okLabel = 'Save', multiline = false } = {}) {
  const field = multiline
    ? `<textarea class="input" rows="8" placeholder="${esc(placeholder)}">${esc(value)}</textarea>`
    : `<input class="input" type="text" value="${esc(value)}" placeholder="${esc(placeholder)}">`;
  return sheet({
    title,
    body: field,
    actions: [
      { label: okLabel, kind: 'primary', value: (w) => w.querySelector('.input').value.trim() },
      { label: 'Cancel', kind: 'ghost', value: null },
    ],
    onMount: (w) => setTimeout(() => w.querySelector('.input').focus(), 250),
  });
}

export function pickFiles({ accept = '', multiple = false, capture } = {}) {
  return new Promise((resolve) => {
    const inp = document.createElement('input');
    inp.type = 'file';
    if (accept) inp.accept = accept;
    if (multiple) inp.multiple = true;
    if (capture) inp.setAttribute('capture', capture);
    inp.style.display = 'none';
    inp.onchange = () => { resolve([...inp.files]); inp.remove(); };
    document.body.append(inp);
    inp.click();
  });
}

export function readAsDataURL(blob) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(blob);
  });
}

export async function shareOrDownload(blob, filename) {
  const file = new File([blob], filename, { type: blob.type || 'application/octet-stream' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: filename }); return; }
    catch (e) { if (e.name === 'AbortError') return; }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
