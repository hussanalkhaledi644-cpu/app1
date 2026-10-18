// IndexedDB storage. Everything lives on the device.
// Stores:
//   categories {id, section, name, icon, color, order}
//   items      {id, categoryId, kind:'file'|'note', title, mime, size, text, created, updated}
//   blobs      {id, type, data:ArrayBuffer}   (file contents, kept apart so lists stay fast)
//   exams      {id, title, subject, description, questions[], source, version, created}
//   attempts   {id, examId, ...}
//   meta       {key, value}

const DB_NAME = 'medvault';
const DB_VERSION = 1;
let dbp;

function open() {
  if (!dbp) {
    dbp = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const d = req.result;
        d.createObjectStore('categories', { keyPath: 'id' });
        d.createObjectStore('items', { keyPath: 'id' }).createIndex('cat', 'categoryId');
        d.createObjectStore('blobs', { keyPath: 'id' });
        d.createObjectStore('exams', { keyPath: 'id' });
        d.createObjectStore('attempts', { keyPath: 'id' }).createIndex('exam', 'examId');
        d.createObjectStore('meta', { keyPath: 'key' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbp;
}

function wrap(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function store(name, mode = 'readonly') {
  const d = await open();
  return d.transaction(name, mode).objectStore(name);
}

export const db = {
  async get(s, id) { return wrap((await store(s)).get(id)); },
  async all(s) { return wrap((await store(s)).getAll()); },
  async put(s, obj) { return wrap((await store(s, 'readwrite')).put(obj)); },
  async del(s, id) { return wrap((await store(s, 'readwrite')).delete(id)); },
  async byIndex(s, index, value) { return wrap((await store(s)).index(index).getAll(value)); },
  async count(s) { return wrap((await store(s)).count()); },
  async clear(s) { return wrap((await store(s, 'readwrite')).clear()); },
  async meta(key, value) {
    if (value === undefined) return (await this.get('meta', key))?.value;
    return this.put('meta', { key, value });
  },
};
