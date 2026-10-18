// Exam file parsing, the built-in library of practice exams, and attempt scoring.
import { db } from './db.js';
import { uid, shuffle, readAsDataURL } from './util.js';

const LETTERS = 'ABCDEFGHIJ';

// Accepts the documented format (see EXAM_FORMAT.md) and is forgiving about field names.
export function normalizeExam(raw, { baseUrl } = {}) {
  if (typeof raw === 'string') raw = JSON.parse(raw);
  if (Array.isArray(raw)) raw = { questions: raw };
  if (!raw || !Array.isArray(raw.questions) || raw.questions.length === 0) {
    throw new Error('No questions found. The file needs a "questions" list.');
  }
  const questions = raw.questions.map((q, i) => {
    const options = q.options || q.choices || null;
    const type = q.type || (options && options.length ? 'mcq' : 'short');
    const out = {
      id: String(q.id || `q${i + 1}`),
      type: type === 'mcq' || type === 'multiple-choice' ? 'mcq' : 'short',
      stem: String(q.stem || q.question || q.prompt || '').trim(),
      image: q.image || null,
      imageCaption: q.imageCaption || q.caption || '',
      explanation: q.explanation || q.rationale || '',
      reference: q.reference || q.references || '',
      tags: q.tags || [],
    };
    if (!out.stem) throw new Error(`Question ${i + 1} has no text ("stem").`);
    if (out.image && baseUrl && !/^(data:|https?:)/.test(out.image)) out.image = new URL(out.image, baseUrl).href;
    if (out.type === 'mcq') {
      if (!options || options.length < 2) throw new Error(`Question ${i + 1} is multiple choice but has fewer than 2 options.`);
      out.options = options.map(String);
      let a = q.answer ?? q.correct ?? q.answerIndex;
      if (typeof a === 'string') {
        const s = a.trim();
        if (/^[A-J]$/i.test(s)) a = LETTERS.indexOf(s.toUpperCase());
        else if (/^\d+$/.test(s)) a = Number(s);
        else a = out.options.findIndex((o) => o.trim().toLowerCase() === s.toLowerCase());
      }
      if (typeof a !== 'number' || a < 0 || a >= out.options.length) throw new Error(`Question ${i + 1}: answer must be a letter (A–${LETTERS[out.options.length - 1]}).`);
      out.answer = a;
    } else {
      out.modelAnswer = q.modelAnswer || q.answer || q.model_answer || '';
      out.markingPoints = q.markingPoints || q.marking_points || q.keyPoints || [];
      if (!out.modelAnswer && !out.markingPoints.length) throw new Error(`Question ${i + 1} has no model answer.`);
    }
    return out;
  });
  return {
    title: String(raw.title || 'Untitled exam'),
    subject: String(raw.subject || raw.category || 'General'),
    description: String(raw.description || ''),
    author: raw.author || '',
    questions,
  };
}

// Turn remote image links into data URIs so the exam works offline.
async function inlineImages(exam) {
  for (const q of exam.questions) {
    if (q.image && /^https?:/.test(q.image)) {
      try {
        const r = await fetch(q.image);
        if (r.ok) q.image = await readAsDataURL(await r.blob());
      } catch { /* keep link */ }
    }
  }
  return exam;
}

export async function importExamText(text, source = 'upload') {
  const exams = [];
  let raw = JSON.parse(text);
  const list = raw && Array.isArray(raw.exams) ? raw.exams : [raw];
  for (const r of list) {
    const ex = normalizeExam(r);
    const rec = { id: 'up-' + uid(), ...ex, source, created: Date.now() };
    await db.put('exams', rec);
    exams.push(rec);
  }
  return exams;
}

// Pull new or updated practice exams published in the app's /exams folder.
export async function syncLibrary() {
  const base = new URL('exams/', location.href);
  let index;
  try {
    const r = await fetch(new URL('index.json', base), { cache: 'no-cache' });
    if (!r.ok) return { added: 0 };
    index = await r.json();
  } catch {
    return { added: 0, offline: true };
  }
  const hidden = new Set((await db.meta('hiddenLibrary')) || []);
  let added = 0;
  for (const entry of index.exams || []) {
    const id = 'lib-' + entry.id;
    if (hidden.has(id)) continue;
    const existing = await db.get('exams', id);
    if (existing && (existing.version || 1) >= (entry.version || 1)) continue;
    try {
      const fileUrl = new URL(entry.file, base);
      const r = await fetch(fileUrl, { cache: 'no-cache' });
      const ex = normalizeExam(await r.json(), { baseUrl: fileUrl.href });
      await inlineImages(ex);
      await db.put('exams', { id, ...ex, source: 'library', version: entry.version || 1, created: existing?.created || Date.now() });
      if (!existing) added++;
    } catch (e) {
      console.warn('Could not load library exam', entry, e);
    }
  }
  return { added };
}

export async function deleteExam(exam) {
  if (exam.source === 'library') {
    const hidden = new Set((await db.meta('hiddenLibrary')) || []);
    hidden.add(exam.id);
    await db.meta('hiddenLibrary', [...hidden]);
  }
  for (const a of await db.byIndex('attempts', 'exam', exam.id)) await db.del('attempts', a.id);
  await db.del('exams', exam.id);
}

export async function startAttempt(exam, { shuffleQs = false, only = null } = {}) {
  let order = exam.questions.map((_, i) => i);
  if (only) order = order.filter((i) => only.includes(exam.questions[i].id));
  if (shuffleQs) order = shuffle(order);
  const a = {
    id: uid(),
    examId: exam.id,
    examTitle: exam.title,
    started: Date.now(),
    updated: Date.now(),
    finished: null,
    order,
    idx: 0,
    responses: {},
    flagged: [],
    mode: only ? 'retry' : 'full',
  };
  await db.put('attempts', a);
  return a;
}

export function scoreAttempt(exam, attempt) {
  let correct = 0, partial = 0, incorrect = 0, unanswered = 0;
  for (const i of attempt.order) {
    const q = exam.questions[i];
    const r = attempt.responses[q.id];
    if (!r || !r.mark) unanswered++;
    else if (r.mark === 'correct') correct++;
    else if (r.mark === 'partial') partial++;
    else incorrect++;
  }
  const total = attempt.order.length;
  const pct = total ? ((correct + partial * 0.5) / total) * 100 : 0;
  return { correct, partial, incorrect, unanswered, total, pct };
}

export async function attemptsFor(examId) {
  const list = await db.byIndex('attempts', 'exam', examId);
  return list.sort((a, b) => b.started - a.started);
}

export async function inProgress() {
  const all = await db.all('attempts');
  return all.filter((a) => !a.finished).sort((a, b) => b.updated - a.updated);
}

export const letter = (i) => LETTERS[i];
