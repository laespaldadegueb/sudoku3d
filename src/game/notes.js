import { N } from './grid.js';

export function createNotes() {
  return Array.from({ length: N }, () =>
    Array.from({ length: N }, () =>
      Array.from({ length: N }, () => new Set())));
}

export function toggleNote(notes, x, y, z, value) {
  if (value === 0) return;
  const set = notes[x][y][z];
  if (set.has(value)) set.delete(value);
  else set.add(value);
}

export function clearNotes(notes, x, y, z) {
  notes[x][y][z].clear();
}

export function getNotes(notes, x, y, z) {
  return notes[x][y][z];
}

export function hasNotes(notes, x, y, z) {
  return notes[x][y][z].size > 0;
}
