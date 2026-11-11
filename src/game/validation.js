import { N } from './grid.js';

export function isValidPlacement(grid, x, y, z, v) {
  if (v === 0) return true;
  for (let i = 0; i < N; i++) {
    if (i !== x && grid[i][y][z] === v) return false;
    if (i !== y && grid[x][i][z] === v) return false;
    if (i !== z && grid[x][y][i] === v) return false;
  }
  return true;
}

export function computeConflicts(grid) {
  const conflicts = new Set();
  const mark = (x, y, z) => conflicts.add(`${x},${y},${z}`);

  for (let a = 0; a < N; a++) {
    for (let b = 0; b < N; b++) {
      const seenRow = new Map();
      const seenCol = new Map();
      const seenPil = new Map();
      for (let i = 0; i < N; i++) {
        const vr = grid[i][a][b];
        if (vr !== 0) {
          if (seenRow.has(vr)) { mark(i, a, b); mark(seenRow.get(vr), a, b); }
          else seenRow.set(vr, i);
        }
        const vc = grid[a][i][b];
        if (vc !== 0) {
          if (seenCol.has(vc)) { mark(a, i, b); mark(a, seenCol.get(vc), b); }
          else seenCol.set(vc, i);
        }
        const vp = grid[a][b][i];
        if (vp !== 0) {
          if (seenPil.has(vp)) { mark(a, b, i); mark(a, b, seenPil.get(vp)); }
          else seenPil.set(vp, i);
        }
      }
    }
  }

  return conflicts;
}

export function isComplete(grid) {
  for (let x = 0; x < N; x++)
    for (let y = 0; y < N; y++)
      for (let z = 0; z < N; z++)
        if (grid[x][y][z] === 0) return false;
  return true;
}
