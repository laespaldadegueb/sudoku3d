const DB_NAME = 'sudoku3d';
const DB_VERSION = 1;

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('gameHistory')) {
        db.createObjectStore('gameHistory', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('puzzleCache')) {
        db.createObjectStore('puzzleCache', { keyPath: 'key' });
      }
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e.target.error);
  });
  return dbPromise;
}

export async function addGameHistory({ diffId, size, seconds, score, errors, date }) {
  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction('gameHistory', 'readwrite');
      const store = tx.objectStore('gameHistory');
      store.add({ diffId, size, seconds, score, errors, date });
      tx.oncomplete = resolve;
      tx.onerror = e => reject(e.target.error);
    });
    // Trim to 50 entries (delete oldest by cursor)
    const db2 = await openDB();
    await new Promise(resolve => {
      const tx = db2.transaction('gameHistory', 'readwrite');
      const store = tx.objectStore('gameHistory');
      const countReq = store.count();
      countReq.onsuccess = () => {
        let toDelete = countReq.result - 50;
        if (toDelete <= 0) return;
        const cursorReq = store.openCursor();
        cursorReq.onsuccess = ev => {
          const cursor = ev.target.result;
          if (cursor && toDelete > 0) {
            cursor.delete();
            toDelete--;
            cursor.continue();
          }
        };
      };
      tx.oncomplete = resolve;
      tx.onerror = resolve;
    });
  } catch {}
}

export async function getGameHistory() {
  try {
    const db = await openDB();
    return new Promise(resolve => {
      const tx = db.transaction('gameHistory', 'readonly');
      const store = tx.objectStore('gameHistory');
      const req = store.getAll();
      req.onsuccess = () => resolve([...req.result].reverse());
      req.onerror = () => resolve([]);
    });
  } catch { return []; }
}

export async function addCachedPuzzle(diffId, size, puzzle) {
  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction('puzzleCache', 'readwrite');
      const store = tx.objectStore('puzzleCache');
      const cacheKey = `${diffId}:${size}`;
      const req = store.get(cacheKey);
      req.onsuccess = () => {
        const existing = req.result;
        const list = existing ? existing.puzzles : [];
        if (list.length < 10) {
          list.push(puzzle);
          store.put({ key: cacheKey, puzzles: list });
        }
        tx.oncomplete = resolve;
      };
      req.onerror = () => reject();
      tx.onerror = () => reject();
    });
  } catch {}
}

export async function popCachedPuzzle(diffId, size) {
  try {
    const db = await openDB();
    return new Promise(resolve => {
      const tx = db.transaction('puzzleCache', 'readwrite');
      const store = tx.objectStore('puzzleCache');
      const cacheKey = `${diffId}:${size}`;
      const req = store.get(cacheKey);
      req.onsuccess = () => {
        const existing = req.result;
        if (!existing || !existing.puzzles.length) { resolve(null); return; }
        const puzzle = existing.puzzles.shift();
        store.put(existing);
        tx.oncomplete = () => resolve(puzzle);
      };
      req.onerror = () => resolve(null);
      tx.onerror = () => resolve(null);
    });
  } catch { return null; }
}

export async function countCachedPuzzles(diffId, size) {
  try {
    const db = await openDB();
    return new Promise(resolve => {
      const tx = db.transaction('puzzleCache', 'readonly');
      const store = tx.objectStore('puzzleCache');
      const cacheKey = `${diffId}:${size}`;
      const req = store.get(cacheKey);
      req.onsuccess = () => resolve(req.result ? req.result.puzzles.length : 0);
      req.onerror = () => resolve(0);
    });
  } catch { return 0; }
}
