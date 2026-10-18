import { db } from './db.js';
import {
  $, $$, el, esc, uid, fmtBytes, fmtDate, fmtText, toast, sheet, confirmSheet, promptSheet,
  pickFiles, shareOrDownload, isStandalone, isIOS,
} from './util.js';
import { icon, planetIcon, mascot, heroScene, starfield, ring, PALETTE, ICON_NAMES } from './art.js';
import {
  importExamText, syncLibrary, deleteExam, startAttempt, scoreAttempt, attemptsFor, inProgress, letter,
} from './exams.js';
import { writeZip, readZip } from './zip.js';

const APP_VERSION = '1.0.0';

// ---------- UI glyphs (simple strokes) ----------
const g = (d, extra = '') => `<svg class="g" viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/>${extra}</svg>`;
const UI = {
  back: g('M15 18l-6-6 6-6'),
  plus: g('M12 5v14M5 12h14'),
  more: `<svg class="g" viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.8" class="fill"/><circle cx="12" cy="12" r="1.8" class="fill"/><circle cx="19" cy="12" r="1.8" class="fill"/></svg>`,
  search: g('M20 20l-4.2-4.2', '<circle cx="11" cy="11" r="7"/>'),
  share: g('M12 3v12M8 7l4-4 4 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7'),
  gear: g('M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7', '<circle cx="12" cy="12" r="4.2"/>'),
  flag: g('M5 21V4h11l-2 4 2 4H5'),
  grid: g('M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z'),
  trash: g('M4 7h16M10 11v6M14 11v6M6 7l1 13a2 2 0 002 2h6a2 2 0 002-2l1-13M9 7V4h6v3'),
  edit: g('M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4'),
  zin: g('M20 20l-4.2-4.2M11 8v6M8 11h6', '<circle cx="11" cy="11" r="7"/>'),
  zout: g('M20 20l-4.2-4.2M8 11h6', '<circle cx="11" cy="11" r="7"/>'),
  upload: g('M12 16V4M7 9l5-5 5 5M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2'),
  camera: g('M4 8h3l2-3h6l2 3h3v11H4z', '<circle cx="12" cy="13" r="3.5"/>'),
  note: g('M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5'),
  paste: g('M9 4h6v3H9zM7 5H5v16h14V5h-2M8 12h8M8 16h6'),
  refresh: g('M20 11a8 8 0 10-2.3 5.7M20 4v7h-7'),
  check: g('M5 12.5l4.5 4.5L19 7'),
  x: g('M6 6l12 12M18 6L6 18'),
  move: g('M3 7h7l2 2h9v10H3zM12 13h6M15 10l3 3-3 3'),
  download: g('M12 4v12M7 11l5 5 5-5M4 20h16'),
  play: g('M8 5l11 7-11 7z'),
  shuffle: g('M4 7h3c5 0 5 10 10 10h3M4 17h3c2 0 3-1.5 4-3M14 9.5C15 8 16 7 17 7h3M18 4l3 3-3 3M18 14l3 3-3 3'),
  next: g('M9 6l6 6-6 6'),
};

const SECTIONS = {
  preclinical: { name: 'Pre-clinical', blurb: 'Anatomy, physiology & the foundations', icon: 'microscope', color: '#06d6a0' },
  clinical: { name: 'Clinical', blurb: 'Med school notes by rotation & specialty', icon: 'stethoscope', color: '#4cc9f0' },
};

const DEFAULT_CATS = {
  preclinical: [
    ['Anatomy', 'bone', '#ffd166'], ['Physiology', 'pulse', '#ef476f'], ['Biochemistry', 'flask', '#06d6a0'],
    ['Pharmacology', 'pill', '#4cc9f0'], ['Pathology', 'cell', '#ff5d8f'], ['Microbiology', 'virus', '#9b5de5'],
    ['Immunology', 'shield', '#2ec4b6'], ['Histology & Embryology', 'microscope', '#ff9f1c'], ['Genetics', 'dna', '#5a63f0'],
  ],
  clinical: [
    ['Cardiology', 'heart', '#ef476f'], ['Respiratory', 'lungs', '#ff5d8f'], ['Gastroenterology', 'stomach', '#ff9f1c'],
    ['Neurology', 'brain', '#9b5de5'], ['Endocrinology', 'drop', '#ffd166'], ['Renal', 'kidney', '#e76f51'],
    ['Paediatrics', 'baby', '#4cc9f0'], ['Obstetrics & Gynaecology', 'womb', '#ff5d8f'], ['Psychiatry', 'mind', '#5a63f0'],
    ['Surgery', 'scalpel', '#2ec4b6'], ['Emergency Medicine', 'siren', '#ef476f'], ['General Practice', 'house', '#06d6a0'],
  ],
};

async function seed() {
  if (await db.meta('seeded')) return;
  for (const [section, list] of Object.entries(DEFAULT_CATS)) {
    let order = 0;
    for (const [name, ic, color] of list) {
      await db.put('categories', { id: uid(), section, name, icon: ic, color, order: order++ });
    }
  }
  await db.meta('seeded', true);
}

// ---------- File type helpers ----------
function fileKind(item) {
  if (item.kind === 'note') return { label: 'NOTE', color: '#ffd166', type: 'note' };
  const m = item.mime || '', n = (item.filename || '').toLowerCase();
  if (m === 'application/pdf' || n.endsWith('.pdf')) return { label: 'PDF', color: '#ef476f', type: 'pdf' };
  if (m.startsWith('image/') || /\.(png|jpe?g|gif|webp|heic|heif)$/.test(n)) return { label: 'IMG', color: '#06d6a0', type: 'image' };
  if (/word|\.docx?$/.test(m + n)) return { label: 'DOC', color: '#4cc9f0', type: 'other' };
  if (/presentation|powerpoint|\.pptx?$|\.key$/.test(m + n)) return { label: 'PPT', color: '#ff9f1c', type: 'other' };
  if (/sheet|excel|\.xlsx?$|\.csv$/.test(m + n)) return { label: 'XLS', color: '#2ec4b6', type: 'other' };
  if (m.startsWith('text/') || /\.(txt|md)$/.test(n)) return { label: 'TXT', color: '#9b5de5', type: 'text' };
  if (m.startsWith('video/')) return { label: 'VID', color: '#5a63f0', type: 'video' };
  if (m.startsWith('audio/')) return { label: 'AUD', color: '#5a63f0', type: 'audio' };
  return { label: 'FILE', color: '#8784bd', type: 'other' };
}
const badge = (item) => { const k = fileKind(item); return `<span class="fbadge" style="--c:${k.color}">${k.label}</span>`; };

async function getBlob(id) {
  const b = await db.get('blobs', id);
  return b ? new Blob([b.data], { type: b.type }) : null;
}

// ---------- App chrome ----------
const view = () => $('#view');
let cleanup = null;

function setChrome({ title = '', back = null, actions = [], tabs = true, tab = null, large = false } = {}) {
  const bar = $('#topbar');
  bar.className = large ? 'large' : '';
  bar.innerHTML = `
    <div class="tb-left">${back ? `<a class="icon-btn" href="${back}" aria-label="Back">${UI.back}</a>` : ''}</div>
    <h1 class="tb-title">${esc(title)}</h1>
    <div class="tb-right"></div>`;
  const right = bar.querySelector('.tb-right');
  for (const a of actions) {
    const b = el(`<button class="icon-btn" aria-label="${esc(a.label)}">${a.icon}</button>`);
    b.onclick = a.onClick;
    right.append(b);
  }
  $('#tabs').hidden = !tabs;
  document.body.classList.toggle('no-tabs', !tabs);
  $$('#tabs a').forEach((a) => a.classList.toggle('active', a.dataset.tab === tab));
}

function render(html) {
  const v = view();
  v.innerHTML = html;
  v.scrollTop = 0;
  window.scrollTo(0, 0);
  return v;
}

// ---------- Views ----------
async function home() {
  setChrome({ title: 'MedVault', tab: 'home', large: true, actions: [
    { label: 'Search', icon: UI.search, onClick: () => (location.hash = '#/search') },
    { label: 'Settings', icon: UI.gear, onClick: () => (location.hash = '#/settings') },
  ] });
  const [cats, items, exams, pending] = await Promise.all([db.all('categories'), db.all('items'), db.all('exams'), inProgress()]);
  const countBySection = (s) => { const ids = new Set(cats.filter((c) => c.section === s).map((c) => c.id)); return items.filter((i) => ids.has(i.categoryId)).length; };
  const recent = items.sort((a, b) => (b.updated || b.created) - (a.updated || a.created)).slice(0, 6);
  const catById = Object.fromEntries(cats.map((c) => [c.id, c]));
  const hr = new Date().getHours();
  const hello = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
  const showInstall = isIOS() && !isStandalone() && !localStorage.getItem('hideInstall');

  const v = render(`
    ${showInstall ? `<div class="card install">
      <div><strong>Install on your iPhone</strong><p class="muted small">Tap <b>Share</b> ${UI.share} then <b>Add to Home Screen</b>. It then opens like an app and works offline.</p></div>
      <button class="icon-btn" id="hideInstall" aria-label="Dismiss">${UI.x}</button></div>` : ''}
    <section class="hero">
      ${heroScene()}
      <div class="hero-text"><p class="eyebrow">${hello}, future doctor</p><h2>Everything you've learned, in your pocket.</h2></div>
    </section>
    ${pending.length ? `<a class="card continue" href="#/quiz/${pending[0].id}">
      ${planetIcon('clipboard', '#ff9f1c', 48)}
      <div class="grow"><p class="eyebrow">Continue exam</p><strong>${esc(pending[0].examTitle)}</strong>
      <p class="muted small">Question ${pending[0].idx + 1} of ${pending[0].order.length}</p></div>${UI.next}</a>` : ''}
    <div class="section-cards">
      ${Object.entries(SECTIONS).map(([k, s]) => `
        <a class="sec-card" href="#/section/${k}" style="--c:${s.color}">
          ${planetIcon(s.icon, s.color, 60)}
          <div><h3>${s.name}</h3><p class="muted small">${s.blurb}</p></div>
          <span class="count">${countBySection(k)} <small>notes</small></span>
        </a>`).join('')}
      <a class="sec-card" href="#/exams" style="--c:#ff9f1c">
        ${planetIcon('clipboard', '#ff9f1c', 60)}
        <div><h3>Practice exams</h3><p class="muted small">One question at a time, with the answer key</p></div>
        <span class="count">${exams.length} <small>exams</small></span>
      </a>
    </div>
    <h3 class="h-sec">Recently added</h3>
    ${recent.length ? `<div class="list">${recent.map((i) => itemRow(i, catById[i.categoryId])).join('')}</div>`
      : emptyState('think', 'Nothing here yet', 'Open a section, pick a subject and tap <b>Add</b> to upload your first notes.')}
  `);
  v.querySelector('#hideInstall')?.addEventListener('click', () => { localStorage.setItem('hideInstall', '1'); home(); });
}

function emptyState(mood, title, text) {
  return `<div class="empty">${mascot(mood, 96)}<h4>${esc(title)}</h4><p class="muted">${text}</p></div>`;
}

function itemRow(i, cat) {
  return `<a class="row" href="#/item/${i.id}">
    ${badge(i)}
    <div class="grow"><div class="row-title">${esc(i.title)}</div>
    <div class="muted small">${cat ? esc(cat.name) + ' · ' : ''}${i.kind === 'note' ? 'Note' : fmtBytes(i.size)} · ${fmtDate(i.updated || i.created)}</div></div>
    ${UI.next}</a>`;
}

async function section(key) {
  const s = SECTIONS[key];
  if (!s) return notFound();
  setChrome({ title: s.name, tab: key, large: true });
  const cats = (await db.all('categories')).filter((c) => c.section === key).sort((a, b) => a.order - b.order);
  const items = await db.all('items');
  const counts = {};
  items.forEach((i) => (counts[i.categoryId] = (counts[i.categoryId] || 0) + 1));
  const v = render(`
    <p class="muted lead">${s.blurb}</p>
    <div class="tiles">
      ${cats.map((c) => `<a class="tile" href="#/cat/${c.id}" style="--c:${c.color}">
        ${planetIcon(c.icon, c.color, 64)}
        <span class="tile-name">${esc(c.name)}</span>
        <span class="tile-count">${counts[c.id] || 0}</span></a>`).join('')}
      <button class="tile add" id="addCat">${UI.plus}<span class="tile-name">New subject</span></button>
    </div>`);
  v.querySelector('#addCat').onclick = async () => {
    const res = await editCategorySheet({ name: '', icon: 'folder', color: PALETTE[cats.length % PALETTE.length] }, 'New subject');
    if (!res) return;
    await db.put('categories', { id: uid(), section: key, order: cats.length, ...res });
    section(key);
  };
}

async function editCategorySheet(cat, title) {
  let color = cat.color, ic = cat.icon;
  return sheet({
    title,
    body: `<label class="lbl">Name</label><input class="input" id="cName" value="${esc(cat.name)}" placeholder="e.g. Neuroanatomy">
      <label class="lbl">Colour</label><div class="swatches">${PALETTE.map((p) => `<button class="sw ${p === color ? 'on' : ''}" data-c="${p}" style="background:${p}" aria-label="colour"></button>`).join('')}</div>
      <label class="lbl">Icon</label><div class="icon-pick">${ICON_NAMES.map((n) => `<button class="ip ${n === ic ? 'on' : ''}" data-i="${n}">${icon(n, color, 34)}</button>`).join('')}</div>`,
    onMount: (w) => {
      const repaint = () => {
        $$('.sw', w).forEach((b) => b.classList.toggle('on', b.dataset.c === color));
        $$('.ip', w).forEach((b) => { b.classList.toggle('on', b.dataset.i === ic); b.innerHTML = icon(b.dataset.i, color, 34); });
      };
      $$('.sw', w).forEach((b) => (b.onclick = () => { color = b.dataset.c; repaint(); }));
      $$('.ip', w).forEach((b) => (b.onclick = () => { ic = b.dataset.i; repaint(); }));
    },
    actions: [
      { label: 'Save', kind: 'primary', validate: (w) => !!$('#cName', w).value.trim() || (toast('Give it a name'), false),
        value: (w) => ({ name: $('#cName', w).value.trim(), color, icon: ic }) },
      { label: 'Cancel', kind: 'ghost', value: null },
    ],
  });
}

async function category(id) {
  const cat = await db.get('categories', id);
  if (!cat) return notFound();
  const items = (await db.byIndex('items', 'cat', id)).sort((a, b) => (b.updated || b.created) - (a.updated || a.created));
  setChrome({ title: cat.name, back: `#/section/${cat.section}`, tab: cat.section, actions: [
    { label: 'Subject options', icon: UI.more, onClick: () => categoryMenu(cat) },
  ] });
  const v = render(`
    <div class="cat-head" style="--c:${cat.color}">${planetIcon(cat.icon, cat.color, 72)}
      <div><h2>${esc(cat.name)}</h2><p class="muted small">${items.length} item${items.length === 1 ? '' : 's'}</p></div></div>
    <div class="add-row">
      <button class="btn primary" id="upl">${UI.upload}Upload files</button>
      <button class="btn" id="cam">${UI.camera}Photo</button>
      <button class="btn" id="wr">${UI.note}Write</button>
    </div>
    ${items.length > 5 ? `<input class="input search-in" id="flt" type="search" placeholder="Filter ${esc(cat.name)}…">` : ''}
    <div class="list" id="ilist">${items.map((i) => itemRow(i)).join('')}</div>
    ${items.length ? '' : emptyState('happy', 'Ready for your notes', 'Upload PDFs, lecture slides, images or Word docs, snap a photo of handwritten notes, or write a quick note.')}
  `);
  v.querySelector('#upl').onclick = async () => uploadInto(cat, await pickFiles({ multiple: true }));
  v.querySelector('#cam').onclick = async () => uploadInto(cat, await pickFiles({ accept: 'image/*', capture: 'environment' }));
  v.querySelector('#wr').onclick = () => (location.hash = `#/note/new/${cat.id}`);
  const flt = v.querySelector('#flt');
  if (flt) flt.oninput = () => {
    const q = flt.value.toLowerCase();
    $('#ilist').innerHTML = items.filter((i) => (i.title + ' ' + (i.text || '')).toLowerCase().includes(q)).map((i) => itemRow(i)).join('');
  };
}

async function uploadInto(cat, files) {
  if (!files.length) return;
  let n = 0;
  for (const f of files) {
    toast(`Saving ${++n} of ${files.length}…`, { duration: 10000 });
    try {
      const id = uid();
      const data = await f.arrayBuffer();
      await db.put('blobs', { id, type: f.type || 'application/octet-stream', data });
      const now = Date.now();
      await db.put('items', {
        id, categoryId: cat.id, kind: 'file', title: f.name.replace(/\.[^.]+$/, '') || f.name,
        filename: f.name, mime: f.type, size: f.size, created: now, updated: now,
      });
    } catch (e) {
      console.error(e);
      toast(`Couldn't save ${f.name}: ${e.message || e}`, { duration: 5000 });
      return category(cat.id);
    }
  }
  toast(`Saved ${files.length} file${files.length > 1 ? 's' : ''}`);
  category(cat.id);
}

async function categoryMenu(cat) {
  const v = await sheet({ title: cat.name, actions: [
    { label: 'Edit name, colour & icon', value: 'edit', icon: UI.edit },
    { label: 'Delete subject', value: 'del', kind: 'danger', icon: UI.trash },
    { label: 'Cancel', value: null, kind: 'ghost' },
  ] });
  if (v === 'edit') {
    const res = await editCategorySheet(cat, 'Edit subject');
    if (res) { await db.put('categories', { ...cat, ...res }); category(cat.id); }
  } else if (v === 'del') {
    const items = await db.byIndex('items', 'cat', cat.id);
    if (!(await confirmSheet('Delete subject?', `This permanently deletes "${cat.name}" and its ${items.length} item(s) from this phone.`))) return;
    for (const i of items) { await db.del('blobs', i.id); await db.del('items', i.id); }
    await db.del('categories', cat.id);
    location.hash = `#/section/${cat.section}`;
  }
}

async function itemView(id) {
  const item = await db.get('items', id);
  if (!item) return notFound();
  const cat = await db.get('categories', item.categoryId);
  const kind = fileKind(item);
  setChrome({ title: item.title, back: cat ? `#/cat/${cat.id}` : '#/home', tab: cat?.section, tabs: kind.type !== 'pdf', actions: [
    ...(item.kind === 'file' ? [{ label: 'Share', icon: UI.share, onClick: async () => shareOrDownload(await getBlob(id), item.filename) }] : []),
    { label: 'Options', icon: UI.more, onClick: () => itemMenu(item, cat) },
  ] });

  if (item.kind === 'note') {
    render(`<article class="card note-view"><h2>${esc(item.title)}</h2><p class="muted small">${fmtDate(item.updated)}</p>
      <div class="rich">${fmtText(item.text || '')}</div></article>
      <a class="btn primary block" href="#/note/edit/${item.id}">${UI.edit}Edit note</a>`);
    return;
  }

  const blob = await getBlob(id);
  if (!blob) { render(emptyState('sad', 'File missing', 'The file contents could not be found on this device.')); return; }
  const url = URL.createObjectURL(blob);
  cleanup = () => URL.revokeObjectURL(url);

  if (kind.type === 'pdf') {
    const v = render(`<div class="pdf-bar">
        <span class="muted small" id="pinfo">Loading…</span>
        <div><button class="icon-btn" id="zo" aria-label="Zoom out">${UI.zout}</button><button class="icon-btn" id="zi" aria-label="Zoom in">${UI.zin}</button></div>
      </div><div class="pdf-scroll"><div id="pdf"></div></div>`);
    try {
      const { mountPdf } = await import('./pdfview.js');
      const viewer = await mountPdf(v.querySelector('#pdf'), await blob.arrayBuffer(), {
        onInfo: ({ pages }) => (v.querySelector('#pinfo').textContent = `${pages} page${pages > 1 ? 's' : ''}`),
      });
      const prev = cleanup;
      cleanup = () => { viewer.destroy(); prev(); };
      v.querySelector('#zi').onclick = () => viewer.setZoom(viewer.zoom + 0.5);
      v.querySelector('#zo').onclick = () => viewer.setZoom(viewer.zoom - 0.5);
    } catch (e) {
      console.error(e);
      v.querySelector('#pdf').innerHTML = `<iframe class="pdf-frame" src="${url}" title="${esc(item.title)}"></iframe>`;
    }
  } else if (kind.type === 'image') {
    render(`<div class="img-view"><img src="${url}" alt="${esc(item.title)}"></div>
      <p class="muted small center">Pinch to zoom · ${fmtBytes(item.size)}</p>`);
  } else if (kind.type === 'text') {
    render(`<article class="card note-view"><div class="rich">${fmtText(await blob.text())}</div></article>`);
  } else if (kind.type === 'video') {
    render(`<video class="media" src="${url}" controls playsinline></video>`);
  } else if (kind.type === 'audio') {
    render(`<div class="card center">${planetIcon('book', '#5a63f0', 72)}<audio class="media" src="${url}" controls></audio></div>`);
  } else {
    const v = render(`<div class="card center file-card">${badge(item)}<h3>${esc(item.filename)}</h3><p class="muted">${fmtBytes(item.size)}</p>
      <p class="muted small">This file type opens in another app (e.g. Word, PowerPoint, Pages or Files).</p>
      <button class="btn primary block" id="open">${UI.share}Open in…</button>
      <a class="btn block" href="${url}" target="_blank" rel="noopener">Preview</a></div>`);
    v.querySelector('#open').onclick = () => shareOrDownload(blob, item.filename);
  }
}

async function itemMenu(item, cat) {
  const v = await sheet({ title: item.title, actions: [
    { label: 'Rename', value: 'rename', icon: UI.edit },
    { label: 'Move to another subject', value: 'move', icon: UI.move },
    { label: 'Delete', value: 'del', kind: 'danger', icon: UI.trash },
    { label: 'Cancel', value: null, kind: 'ghost' },
  ] });
  if (v === 'rename') {
    const t = await promptSheet('Rename', { value: item.title });
    if (t) { await db.put('items', { ...item, title: t, updated: Date.now() }); itemView(item.id); }
  } else if (v === 'move') {
    const cats = (await db.all('categories')).sort((a, b) => a.section.localeCompare(b.section) || a.order - b.order);
    const target = await sheet({
      title: 'Move to…',
      body: `<select class="input" id="mv">${Object.entries(SECTIONS).map(([k, s]) => `<optgroup label="${s.name}">${cats.filter((c) => c.section === k).map((c) => `<option value="${c.id}" ${c.id === item.categoryId ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</optgroup>`).join('')}</select>`,
      actions: [{ label: 'Move', kind: 'primary', value: (w) => $('#mv', w).value }, { label: 'Cancel', kind: 'ghost', value: null }],
    });
    if (target && target !== item.categoryId) { await db.put('items', { ...item, categoryId: target }); toast('Moved'); itemView(item.id); }
  } else if (v === 'del') {
    if (!(await confirmSheet('Delete?', `"${item.title}" will be removed from this phone.`))) return;
    await db.del('blobs', item.id);
    await db.del('items', item.id);
    location.hash = cat ? `#/cat/${cat.id}` : '#/home';
  }
}

async function noteEdit(mode, id) {
  let item, cat;
  if (mode === 'new') { cat = await db.get('categories', id); item = { id: uid(), categoryId: id, kind: 'note', title: '', text: '', created: Date.now() }; }
  else { item = await db.get('items', id); cat = item && (await db.get('categories', item.categoryId)); }
  if (!item || !cat) return notFound();
  setChrome({ title: mode === 'new' ? 'New note' : 'Edit note', back: mode === 'new' ? `#/cat/${cat.id}` : `#/item/${item.id}`, tabs: false });
  const v = render(`
    <input class="input big" id="nt" placeholder="Title" value="${esc(item.title)}">
    <textarea class="input note-area" id="nb" placeholder="Start typing…&#10;&#10;Tips: # Heading, - bullet, 1. numbered, **bold**, *italic*, Na^+^, CO~2~">${esc(item.text)}</textarea>
    <button class="btn primary block" id="save">${UI.check}Save note</button>`);
  v.querySelector('#save').onclick = async () => {
    const title = v.querySelector('#nt').value.trim() || 'Untitled note';
    const text = v.querySelector('#nb').value;
    await db.put('items', { ...item, title, text, size: text.length, updated: Date.now() });
    toast('Saved');
    location.hash = `#/item/${item.id}`;
  };
}

// ---------- Exams ----------
let examFilter = 'All';

async function exams() {
  setChrome({ title: 'Practice exams', tab: 'exams', large: true, actions: [
    { label: 'Add exam', icon: UI.plus, onClick: addExamMenu },
  ] });
  const [list, pending] = await Promise.all([db.all('exams'), inProgress()]);
  const best = {};
  for (const a of await db.all('attempts')) {
    if (!a.finished) continue;
    const ex = list.find((e) => e.id === a.examId);
    if (!ex || a.mode !== 'full') continue;
    const s = scoreAttempt(ex, a).pct;
    best[a.examId] = Math.max(best[a.examId] ?? 0, s);
  }
  const subjects = ['All', ...new Set(list.map((e) => e.subject).sort())];
  if (!subjects.includes(examFilter)) examFilter = 'All';
  const shown = list.filter((e) => examFilter === 'All' || e.subject === examFilter).sort((a, b) => b.created - a.created);
  const v = render(`
    ${pending.length ? `<div class="list">${pending.map((p) => `<a class="row hl" href="#/quiz/${p.id}">${UI.play}<div class="grow"><div class="row-title">Continue: ${esc(p.examTitle)}</div><div class="muted small">Question ${p.idx + 1} of ${p.order.length}</div></div>${UI.next}</a>`).join('')}</div>` : ''}
    ${list.length ? `<div class="chips">${subjects.map((s) => `<button class="chip ${s === examFilter ? 'on' : ''}" data-s="${esc(s)}">${esc(s)}</button>`).join('')}</div>` : ''}
    <div class="exam-list">
    ${shown.map((e) => {
      const mcq = e.questions.filter((q) => q.type === 'mcq').length;
      return `<a class="exam-card" href="#/exam/${e.id}">
        ${ring(best[e.id] ?? null, 58, 6)}
        <div class="grow"><span class="eyebrow">${esc(e.subject)}${e.source === 'library' ? ' · by Claude' : ''}</span>
        <h3>${esc(e.title)}</h3>
        <p class="muted small">${e.questions.length} questions · ${mcq} MCQ · ${e.questions.length - mcq} written</p></div></a>`;
    }).join('')}
    </div>
    ${list.length ? '' : emptyState('think', 'No exams yet', 'Tap <b>+</b> to add an exam file or paste one. Exams I make for you also appear here automatically.')}
    <button class="btn block ghost" id="sync">${UI.refresh}Check for new practice exams</button>
  `);
  $$('.chip', v).forEach((c) => (c.onclick = () => { examFilter = c.dataset.s; exams(); }));
  v.querySelector('#sync').onclick = async () => {
    toast('Checking…');
    const r = await syncLibrary();
    toast(r.offline ? "You're offline" : r.added ? `${r.added} new exam${r.added > 1 ? 's' : ''} added` : 'All up to date');
    exams();
  };
}

async function addExamMenu() {
  const v = await sheet({
    title: 'Add a practice exam',
    body: '<p class="muted small">Use an exam file made by Claude (.json), or copy the exam text from a Claude chat and paste it.</p>',
    actions: [
      { label: 'Choose exam file', value: 'file', kind: 'primary', icon: UI.upload },
      { label: 'Paste exam text', value: 'paste', icon: UI.paste },
      { label: 'Cancel', value: null, kind: 'ghost' },
    ],
  });
  let text = null;
  if (v === 'file') {
    const [f] = await pickFiles();
    if (f) text = await f.text();
  } else if (v === 'paste') {
    text = await promptSheet('Paste exam', { multiline: true, okLabel: 'Import', placeholder: '{ "title": "…", "questions": [ … ] }' });
  }
  if (!text) return;
  try {
    // Tolerate text copied with ```json fences around it.
    const cleaned = text.replace(/^\s*```(?:json)?/i, '').replace(/```\s*$/, '').trim();
    const added = await importExamText(cleaned);
    toast(`Added "${added[0].title}"${added.length > 1 ? ` + ${added.length - 1} more` : ''}`);
    location.hash = `#/exam/${added[0].id}`;
  } catch (e) {
    await sheet({ title: "That didn't work", body: `<p class="muted">${esc(e.message)}</p><p class="muted small">Check the file follows the exam format (see EXAM_FORMAT.md), or ask Claude to regenerate it.</p>`, actions: [{ label: 'OK', kind: 'primary' }] });
  }
}

async function examDetail(id) {
  const exam = await db.get('exams', id);
  if (!exam) return notFound();
  const atts = await attemptsFor(id);
  const done = atts.filter((a) => a.finished);
  const pending = atts.find((a) => !a.finished);
  const fullDone = done.filter((a) => a.mode === 'full');
  const best = fullDone.length ? Math.max(...fullDone.map((a) => scoreAttempt(exam, a).pct)) : null;
  const mcq = exam.questions.filter((q) => q.type === 'mcq').length;
  const imgs = exam.questions.filter((q) => q.image).length;
  setChrome({ title: exam.subject, back: '#/exams', tab: 'exams', actions: [{ label: 'Options', icon: UI.more, onClick: async () => {
    const r = await sheet({ title: exam.title, actions: [{ label: 'Delete exam', value: 'del', kind: 'danger', icon: UI.trash }, { label: 'Cancel', value: null, kind: 'ghost' }] });
    if (r === 'del' && (await confirmSheet('Delete exam?', 'The exam and all your attempts at it will be removed.'))) { await deleteExam(exam); location.hash = '#/exams'; }
  } }] });
  const v = render(`
    <section class="card exam-hero">
      <div class="exam-hero-top">${ring(best, 84, 8)}<div><span class="eyebrow">${esc(exam.subject)}</span><h2>${esc(exam.title)}</h2></div></div>
      ${exam.description ? `<div class="rich muted">${fmtText(exam.description)}</div>` : ''}
      <div class="stats">
        <div><b>${exam.questions.length}</b><span>questions</span></div>
        <div><b>${mcq}</b><span>MCQ</span></div>
        <div><b>${exam.questions.length - mcq}</b><span>written</span></div>
        <div><b>${imgs}</b><span>images</span></div>
      </div>
    </section>
    ${pending ? `<a class="btn primary block" href="#/quiz/${pending.id}">${UI.play}Continue (question ${pending.idx + 1} of ${pending.order.length})</a>` : ''}
    <label class="toggle"><input type="checkbox" id="shuf"><span class="tg"></span>${UI.shuffle}Shuffle question order</label>
    <button class="btn ${pending ? '' : 'primary'} block" id="start">${UI.play}${pending ? 'Start over' : 'Start exam'}</button>
    ${done.length ? `<h3 class="h-sec">Your attempts</h3><div class="list">${done.map((a) => {
      const s = scoreAttempt(exam, a);
      return `<a class="row" href="#/results/${a.id}">${ring(s.pct, 42, 5)}<div class="grow"><div class="row-title">${a.mode === 'retry' ? 'Retry of missed questions' : 'Full exam'}</div><div class="muted small">${fmtDate(a.finished)} · ${s.correct}/${s.total} correct${s.partial ? `, ${s.partial} partial` : ''}</div></div>${UI.next}</a>`;
    }).join('')}</div>` : ''}
  `);
  v.querySelector('#start').onclick = async () => {
    if (pending) await db.del('attempts', pending.id);
    const a = await startAttempt(exam, { shuffleQs: v.querySelector('#shuf').checked });
    location.hash = `#/quiz/${a.id}`;
  };
}

async function quiz(attemptId) {
  const a = await db.get('attempts', attemptId);
  const exam = a && (await db.get('exams', a.examId));
  if (!a || !exam) return notFound();
  const review = !!a.finished;
  const total = a.order.length;

  const save = () => { a.updated = Date.now(); return db.put('attempts', a); };
  const resp = (q) => (a.responses[q.id] ||= {});
  const isDone = (q) => { const r = a.responses[q.id]; return !!(r && r.revealed && r.mark); };

  setChrome({ title: review ? 'Review' : exam.title, back: review ? `#/results/${a.id}` : `#/exam/${exam.id}`, tabs: false, actions: [
    { label: 'All questions', icon: UI.grid, onClick: openGrid },
  ] });

  function draw() {
    const q = exam.questions[a.order[a.idx]];
    const r = a.responses[q.id] || {};
    const revealed = review || r.revealed;
    const flagged = a.flagged.includes(q.id);
    const answeredCount = a.order.filter((i) => isDone(exam.questions[i])).length;

    let body = '';
    if (q.type === 'mcq') {
      body = `<div class="opts">${q.options.map((o, i) => {
        let cls = '';
        if (revealed) { if (i === q.answer) cls = 'correct'; else if (r.choice === i) cls = 'wrong'; else cls = 'dim'; }
        else if (r.choice === i) cls = 'sel';
        return `<button class="opt ${cls}" data-i="${i}" ${revealed ? 'disabled' : ''}><span class="opt-l">${letter(i)}</span><span class="opt-t">${fmtInline(o)}</span>
          ${revealed && i === q.answer ? `<span class="opt-mark">${UI.check}</span>` : revealed && r.choice === i ? `<span class="opt-mark">${UI.x}</span>` : ''}</button>`;
      }).join('')}</div>`;
    } else {
      body = `<textarea class="input answer-box" id="ans" rows="5" placeholder="Type your answer (or just think it through), then reveal the model answer." ${revealed ? 'readonly' : ''}>${esc(r.text || '')}</textarea>`;
    }

    let key = '';
    if (revealed) {
      if (q.type === 'mcq') {
        const ok = r.choice === q.answer;
        key = `<section class="key ${r.choice == null ? 'neutral' : ok ? 'good' : 'bad'}">
          <div class="key-head">${mascot(r.choice == null ? 'think' : ok ? 'joy' : 'sad', 54)}<div><span class="eyebrow">Answer key</span>
          <h4>${r.choice == null ? '' : ok ? 'Correct! ' : 'Not quite. '}Answer: ${letter(q.answer)}</h4></div></div>
          ${q.options[q.answer].trim() !== letter(q.answer) ? `<p class="key-ans">${fmtInline(q.options[q.answer])}</p>` : ''}
          ${q.explanation ? `<div class="rich">${fmtText(q.explanation)}</div>` : ''}
          ${q.reference ? `<p class="ref">📚 ${fmtInline(q.reference)}</p>` : ''}</section>`;
      } else {
        const pts = q.markingPoints || [];
        const ticks = r.points || [];
        key = `<section class="key neutral">
          <div class="key-head">${mascot('think', 54)}<div><span class="eyebrow">Answer key</span><h4>Model answer</h4></div></div>
          ${q.modelAnswer ? `<div class="rich">${fmtText(q.modelAnswer)}</div>` : ''}
          ${pts.length ? `<p class="lbl">Marking points: tick what you covered</p><div class="points">${pts.map((p, i) => `<button class="pt ${ticks[i] ? 'on' : ''}" data-p="${i}" ${review ? 'disabled' : ''}><span class="box">${UI.check}</span><span>${fmtInline(p)}</span></button>`).join('')}</div>` : ''}
          ${q.explanation ? `<div class="rich expl">${fmtText(q.explanation)}</div>` : ''}
          ${q.reference ? `<p class="ref">📚 ${fmtInline(q.reference)}</p>` : ''}
          <p class="lbl">How did you go?</p>
          <div class="selfmark">
            ${[['correct', 'Got it'], ['partial', 'Partly'], ['incorrect', 'Missed it']].map(([m, l]) => `<button class="sm ${m} ${r.mark === m ? 'on' : ''}" data-m="${m}" ${review ? 'disabled' : ''}>${l}</button>`).join('')}
          </div></section>`;
      }
    }

    let actions;
    const last = a.idx === total - 1;
    if (!revealed) {
      actions = q.type === 'mcq'
        ? `<button class="btn ghost" id="show">Show answer</button><button class="btn primary" id="check" ${r.choice == null ? 'disabled' : ''}>Check answer</button>`
        : `<button class="btn primary wide" id="reveal">Reveal answer</button>`;
    } else {
      const canNext = review || q.type === 'mcq' || r.mark;
      actions = `<button class="btn ghost" id="prev" ${a.idx === 0 ? 'disabled' : ''}>${UI.back}Back</button>
        <button class="btn primary" id="next" ${canNext ? '' : 'disabled'}>${last ? (review ? 'Results' : 'Finish') : 'Next'}${UI.next}</button>`;
    }

    const v = render(`
      <div class="qprog"><div style="width:${((review ? a.idx + 1 : answeredCount) / total) * 100}%"></div></div>
      <div class="qmeta"><span class="eyebrow">Question ${a.idx + 1} of ${total}</span>
        <span class="qtype">${q.type === 'mcq' ? 'Single best answer' : 'Written answer'}</span>
        ${review ? '' : `<button class="icon-btn flag ${flagged ? 'on' : ''}" id="flag" aria-label="Flag question">${UI.flag}</button>`}</div>
      <article class="card qcard">
        <div class="rich stem">${fmtText(q.stem)}</div>
        ${q.image ? `<figure class="qimg"><img src="${esc(q.image)}" alt="Question image" id="qimg">${q.imageCaption ? `<figcaption>${fmtInline(q.imageCaption)}</figcaption>` : ''}</figure>` : ''}
      </article>
      ${body}
      ${key}
      <div class="qactions">${actions}</div>
    `);

    $$('.opt', v).forEach((b) => (b.onclick = () => { resp(q).choice = Number(b.dataset.i); save(); draw(); }));
    const ans = v.querySelector('#ans');
    if (ans && !revealed) { let t; ans.oninput = () => { resp(q).text = ans.value; clearTimeout(t); t = setTimeout(save, 400); }; }
    v.querySelector('#check')?.addEventListener('click', () => { const x = resp(q); x.revealed = true; x.mark = x.choice === q.answer ? 'correct' : 'incorrect'; save(); draw(); });
    v.querySelector('#show')?.addEventListener('click', () => { const x = resp(q); x.revealed = true; x.mark = 'incorrect'; save(); draw(); });
    v.querySelector('#reveal')?.addEventListener('click', () => { const x = resp(q); if (ans) x.text = ans.value; x.revealed = true; save(); draw(); setTimeout(() => v.querySelector('.key')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50); });
    $$('.pt', v).forEach((b) => (b.onclick = () => {
      const x = resp(q); x.points ||= []; x.points[b.dataset.p] = !x.points[b.dataset.p];
      const n = (q.markingPoints || []).length, got = x.points.filter(Boolean).length;
      x.mark = got === n ? 'correct' : got === 0 ? 'incorrect' : 'partial';
      save(); draw(); restoreScroll(b.dataset.p);
    }));
    $$('.sm', v).forEach((b) => (b.onclick = () => { resp(q).mark = b.dataset.m; save(); draw(); v.querySelector('.qactions').scrollIntoView({ block: 'end' }); }));
    v.querySelector('#flag')?.addEventListener('click', () => {
      a.flagged = flagged ? a.flagged.filter((x) => x !== q.id) : [...a.flagged, q.id]; save(); draw();
    });
    v.querySelector('#prev')?.addEventListener('click', () => { a.idx--; save(); draw(); });
    v.querySelector('#next')?.addEventListener('click', async () => {
      if (!last) { a.idx++; save(); draw(); return; }
      if (review) { location.hash = `#/results/${a.id}`; return; }
      const left = a.order.filter((i) => !isDone(exam.questions[i])).length;
      if (left && !(await confirmSheet('Finish exam?', `${left} question(s) are unanswered and will count as incorrect.`, 'Finish', 'primary'))) return;
      a.finished = Date.now(); await save();
      location.hash = `#/results/${a.id}`;
    });
    v.querySelector('#qimg')?.addEventListener('click', (e) => zoomImage(e.target.src));
  }

  function restoreScroll(p) {
    const b = view().querySelector(`.pt[data-p="${p}"]`);
    b?.scrollIntoView({ block: 'center' });
  }

  async function openGrid() {
    const cells = a.order.map((i, n) => {
      const q = exam.questions[i]; const r = a.responses[q.id];
      const st = r?.revealed ? r.mark || 'seen' : r?.choice != null || r?.text ? 'started' : '';
      return `<button class="gcell ${st} ${n === a.idx ? 'cur' : ''} ${a.flagged.includes(q.id) ? 'flagged' : ''}" data-n="${n}">${n + 1}</button>`;
    }).join('');
    await sheet({
      title: 'Jump to question',
      body: `<div class="qgrid">${cells}</div><p class="muted small legend"><i class="lg correct"></i>correct <i class="lg partial"></i>partial <i class="lg incorrect"></i>missed <i class="lg flagged"></i>flagged</p>`,
      actions: [{ label: 'Close', kind: 'ghost', value: null }],
      onMount: (w, done) => $$('.gcell', w).forEach((b) => (b.onclick = () => { a.idx = Number(b.dataset.n); save(); draw(); done(null); })),
    });
  }

  draw();
}

function fmtInline(s) {
  // Single-line formatting for options and marking points.
  return fmtText(s).replace(/^<p>|<\/p>$/g, '');
}

function zoomImage(src) {
  const ov = el(`<div class="zoom-ov"><img src="${esc(src)}" alt=""><button class="icon-btn close">${UI.x}</button></div>`);
  ov.onclick = () => ov.remove();
  document.body.append(ov);
}

async function results(attemptId) {
  const a = await db.get('attempts', attemptId);
  const exam = a && (await db.get('exams', a.examId));
  if (!a || !exam) return notFound();
  const s = scoreAttempt(exam, a);
  const mood = s.pct >= 80 ? 'joy' : s.pct >= 60 ? 'happy' : s.pct >= 40 ? 'think' : 'sad';
  const msg = s.pct >= 80 ? 'Outstanding work!' : s.pct >= 60 ? 'Solid effort, nearly there.' : s.pct >= 40 ? 'Good start. Review the misses.' : 'Tough one. Revisit the notes and retry.';
  const mins = Math.max(1, Math.round(((a.finished || Date.now()) - a.started) / 60000));
  const missed = a.order.map((i) => exam.questions[i]).filter((q) => (a.responses[q.id]?.mark || 'incorrect') !== 'correct');
  setChrome({ title: 'Results', back: `#/exam/${exam.id}`, tab: 'exams' });
  const v = render(`
    <section class="card results-hero">
      ${mascot(mood, 110)}
      ${ring(s.pct, 110, 10)}
      <h2>${msg}</h2>
      <p class="muted">${esc(exam.title)} · ${mins} min</p>
      <div class="stats">
        <div class="good"><b>${s.correct}</b><span>correct</span></div>
        <div class="mid"><b>${s.partial}</b><span>partial</span></div>
        <div class="bad"><b>${s.incorrect + s.unanswered}</b><span>missed</span></div>
      </div>
    </section>
    <div class="btn-row">
      ${missed.length ? `<button class="btn primary" id="retry">${UI.refresh}Retry missed (${missed.length})</button>` : ''}
      <button class="btn" id="again">${UI.play}Retake all</button>
    </div>
    <h3 class="h-sec">Question by question</h3>
    <div class="list">${a.order.map((i, n) => {
      const q = exam.questions[i]; const m = a.responses[q.id]?.mark || 'incorrect';
      return `<button class="row qrow" data-n="${n}"><span class="dot ${m}"></span><div class="grow"><div class="row-title clamp">${n + 1}. ${esc(q.stem.replace(/[*#`^~]/g, '').slice(0, 140))}</div>
        <div class="muted small">${q.type === 'mcq' ? 'MCQ' : 'Written'}${a.flagged.includes(q.id) ? ' · 🚩 flagged' : ''}</div></div>${UI.next}</button>`;
    }).join('')}</div>`);
  v.querySelector('#retry')?.addEventListener('click', async () => {
    const n = await startAttempt(exam, { only: missed.map((q) => q.id) });
    location.hash = `#/quiz/${n.id}`;
  });
  v.querySelector('#again').onclick = async () => { const n = await startAttempt(exam); location.hash = `#/quiz/${n.id}`; };
  $$('.qrow', v).forEach((b) => (b.onclick = async () => { a.idx = Number(b.dataset.n); await db.put('attempts', a); location.hash = `#/quiz/${a.id}`; }));
}

// ---------- Search ----------
async function search() {
  setChrome({ title: 'Search', back: '#/home', tab: 'home' });
  const [items, cats, exs] = await Promise.all([db.all('items'), db.all('categories'), db.all('exams')]);
  const catById = Object.fromEntries(cats.map((c) => [c.id, c]));
  const v = render(`<input class="input search-in" id="q" type="search" placeholder="Search notes, files and exams" autocomplete="off"><div id="res"></div>`);
  const q = v.querySelector('#q');
  setTimeout(() => q.focus(), 100);
  q.oninput = () => {
    const s = q.value.trim().toLowerCase();
    if (s.length < 2) { $('#res').innerHTML = ''; return; }
    const it = items.filter((i) => (i.title + ' ' + (i.filename || '') + ' ' + (i.text || '') + ' ' + (catById[i.categoryId]?.name || '')).toLowerCase().includes(s)).slice(0, 40);
    const ex = exs.filter((e) => (e.title + ' ' + e.subject + ' ' + e.questions.map((x) => x.stem).join(' ')).toLowerCase().includes(s)).slice(0, 20);
    $('#res').innerHTML = `
      ${it.length ? `<h3 class="h-sec">Notes & files</h3><div class="list">${it.map((i) => itemRow(i, catById[i.categoryId])).join('')}</div>` : ''}
      ${ex.length ? `<h3 class="h-sec">Exams</h3><div class="list">${ex.map((e) => `<a class="row" href="#/exam/${e.id}">${icon('clipboard', '#ff9f1c', 30)}<div class="grow"><div class="row-title">${esc(e.title)}</div><div class="muted small">${esc(e.subject)}</div></div>${UI.next}</a>`).join('')}</div>` : ''}
      ${!it.length && !ex.length ? emptyState('think', 'No matches', 'Try a different word.') : ''}`;
  };
}

// ---------- Settings & backup ----------
async function settings() {
  setChrome({ title: 'Settings', back: '#/home', tab: 'home' });
  let est = null, persisted = null;
  try { est = await navigator.storage?.estimate(); persisted = await navigator.storage?.persisted(); } catch { /* unsupported */ }
  const [ni, ne] = await Promise.all([db.count('items'), db.count('exams')]);
  const v = render(`
    <section class="card">
      <h3>Storage</h3>
      <p class="muted">${ni} notes & files · ${ne} exams${est ? ` · using ${fmtBytes(est.usage)}` : ''}</p>
      ${persisted ? '<p class="ok small">✓ Protected storage is on.</p>' : '<button class="btn block" id="persist">Protect my data from being cleared</button>'}
      <p class="muted small">Everything is saved only on this iPhone. Back up now and then so you never lose your notes.</p>
    </section>
    <section class="card">
      <h3>Backup</h3>
      <button class="btn primary block" id="exp">${UI.download}Export full backup</button>
      <button class="btn block" id="imp">${UI.upload}Restore from backup</button>
      <p class="muted small">Exports one .zip with all notes, files, exams and scores. Save it to iCloud Drive / Files.</p>
    </section>
    <section class="card">
      <h3>Practice exams</h3>
      <button class="btn block" id="sync">${UI.refresh}Check for new exams from Claude</button>
    </section>
    <section class="card">
      <h3>Install on iPhone</h3>
      <ol class="muted small steps"><li>Open this page in <b>Safari</b>.</li><li>Tap the <b>Share</b> button.</li><li>Choose <b>Add to Home Screen</b>, then <b>Add</b>.</li></ol>
      <p class="muted small">Note: data saved in Safari and in the home-screen app are separate. Use the home-screen app.</p>
    </section>
    <section class="card danger-zone">
      <h3>Danger zone</h3>
      <button class="btn danger block" id="wipe">${UI.trash}Erase everything on this device</button>
    </section>
    <p class="muted small center">MedVault ${APP_VERSION}</p>`);
  v.querySelector('#persist')?.addEventListener('click', async () => {
    const ok = await navigator.storage?.persist?.();
    toast(ok ? 'Storage protected' : 'Add the app to your Home Screen to protect storage');
    settings();
  });
  v.querySelector('#exp').onclick = exportBackup;
  v.querySelector('#imp').onclick = importBackup;
  v.querySelector('#sync').onclick = async () => { const r = await syncLibrary(); toast(r.offline ? "You're offline" : r.added ? `${r.added} new exam(s)` : 'All up to date'); };
  v.querySelector('#wipe').onclick = async () => {
    if (!(await confirmSheet('Erase everything?', 'All notes, files, exams and scores on this device will be permanently deleted. Export a backup first.', 'Erase'))) return;
    for (const s of ['categories', 'items', 'blobs', 'exams', 'attempts', 'meta']) await db.clear(s);
    await seed();
    toast('Erased');
    location.hash = '#/home';
  };
}

async function exportBackup() {
  toast('Preparing backup…', { duration: 20000 });
  try {
    const [categories, items, exams, attempts] = await Promise.all(['categories', 'items', 'exams', 'attempts'].map((s) => db.all(s)));
    const manifest = { app: 'medvault', version: 1, exported: Date.now(), categories, items, exams, attempts, hiddenLibrary: (await db.meta('hiddenLibrary')) || [] };
    const enc = new TextEncoder();
    const entries = [{ name: 'manifest.json', data: enc.encode(JSON.stringify(manifest)) }];
    for (const i of items) {
      if (i.kind !== 'file') continue;
      const b = await db.get('blobs', i.id);
      if (b) entries.push({ name: `files/${i.id}`, data: new Uint8Array(b.data) });
    }
    const zip = writeZip(entries);
    const d = new Date();
    const name = `MedVault-backup-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.zip`;
    toast(`Backup ready (${fmtBytes(zip.size)})`);
    await shareOrDownload(zip, name);
  } catch (e) {
    console.error(e);
    toast('Backup failed: ' + e.message, { duration: 5000 });
  }
}

async function importBackup() {
  const [f] = await pickFiles();
  if (!f) return;
  if (!(await confirmSheet('Restore backup?', 'Items in the backup are added to this device. Existing items with the same ID are replaced.', 'Restore', 'primary'))) return;
  toast('Restoring…', { duration: 30000 });
  try {
    const files = await readZip(f);
    const mf = files.get('manifest.json');
    if (!mf) throw new Error('This is not a MedVault backup');
    const m = JSON.parse(new TextDecoder().decode(await mf()));
    for (const c of m.categories || []) await db.put('categories', c);
    for (const e of m.exams || []) await db.put('exams', e);
    for (const a of m.attempts || []) await db.put('attempts', a);
    for (const i of m.items || []) {
      const get = files.get(`files/${i.id}`);
      if (get) { const data = await get(); await db.put('blobs', { id: i.id, type: i.mime || 'application/octet-stream', data: data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) }); }
      await db.put('items', i);
    }
    if (m.hiddenLibrary) await db.meta('hiddenLibrary', m.hiddenLibrary);
    await db.meta('seeded', true);
    toast(`Restored ${m.items?.length || 0} notes & ${m.exams?.length || 0} exams`);
    location.hash = '#/home';
  } catch (e) {
    console.error(e);
    toast('Restore failed: ' + e.message, { duration: 5000 });
  }
}

function notFound() {
  setChrome({ title: 'Not found', back: '#/home' });
  render(emptyState('sad', "Can't find that", 'It may have been deleted.'));
}

// ---------- Router ----------
const routes = [
  [/^#?\/?(home)?$/, home],
  [/^#\/section\/(\w+)$/, section],
  [/^#\/cat\/([\w-]+)$/, category],
  [/^#\/item\/([\w-]+)$/, itemView],
  [/^#\/note\/(new|edit)\/([\w-]+)$/, noteEdit],
  [/^#\/exams$/, exams],
  [/^#\/exam\/([\w-]+)$/, examDetail],
  [/^#\/quiz\/([\w-]+)$/, quiz],
  [/^#\/results\/([\w-]+)$/, results],
  [/^#\/search$/, search],
  [/^#\/settings$/, settings],
];

async function route() {
  if (cleanup) { try { cleanup(); } catch { /* ignore */ } cleanup = null; }
  $$('.sheet-wrap').forEach((s) => s.remove());
  const h = location.hash || '#/home';
  for (const [re, fn] of routes) {
    const m = h.match(re);
    if (m) {
      try {
        await (fn === home ? fn() : fn(...m.slice(1)));
      } catch (e) {
        console.error(e);
        render(emptyState('sad', 'Something went wrong', esc(e.message || String(e))));
      }
      return;
    }
  }
  notFound();
}

async function main() {
  $('#sky').innerHTML = starfield();
  $('#tabs').innerHTML = `
    <a href="#/home" data-tab="home">${icon('house', '#ff9f1c', 26)}<span>Home</span></a>
    <a href="#/section/preclinical" data-tab="preclinical">${icon('microscope', '#06d6a0', 26)}<span>Pre-clinical</span></a>
    <a href="#/section/clinical" data-tab="clinical">${icon('stethoscope', '#4cc9f0', 26)}<span>Clinical</span></a>
    <a href="#/exams" data-tab="exams">${icon('clipboard', '#ff5d8f', 26)}<span>Exams</span></a>`;
  await seed();
  window.addEventListener('hashchange', route);
  await route();
  // Fetch any new practice exams in the background.
  syncLibrary().then((r) => {
    if (r.added) {
      toast(`${r.added} new practice exam${r.added > 1 ? 's' : ''} available`, { action: 'View', onAction: () => (location.hash = '#/exams') });
      if (/^#\/(exams)?$|^#\/home$|^$/.test(location.hash)) route();
    }
  });
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').then((reg) => {
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        nw?.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            toast('App updated', { action: 'Reload', duration: 8000, onAction: () => location.reload() });
          }
        });
      });
    }).catch((e) => console.warn('SW failed', e));
  }
}

main();
