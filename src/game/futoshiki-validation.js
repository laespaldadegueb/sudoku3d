// hIneq: Map 'h:r,c' → '<' | '>'   (between (r,c) and (r,c+1))
// vIneq: Map 'v:r,c' → '^' | 'v'   (between (r,c) and (r+1,c))
export function computeConflictsFutoshiki(grid, n, hIneq, vIneq) {
  const conflicts = new Set();

  // Row duplicates
  for (let r = 0; r < n; r++) {
    const seen = new Map();
    for (let c = 0; c < n; c++) {
      const v = grid[r][c];
      if (v === 0) continue;
      if (seen.has(v)) {
        conflicts.add(`${r},${c}`);
        conflicts.add(`${r},${seen.get(v)}`);
      } else {
        seen.set(v, c);
      }
    }
  }

  // Column duplicates
  for (let c = 0; c < n; c++) {
    const seen = new Map();
    for (let r = 0; r < n; r++) {
      const v = grid[r][c];
      if (v === 0) continue;
      if (seen.has(v)) {
        conflicts.add(`${r},${c}`);
        conflicts.add(`${seen.get(v)},${c}`);
      } else {
        seen.set(v, r);
      }
    }
  }

  // Horizontal inequality violations
  for (const [key, sym] of hIneq) {
    const colon = key.indexOf(':');
    const comma = key.indexOf(',', colon);
    const r = +key.slice(colon + 1, comma);
    const c = +key.slice(comma + 1);
    const a = grid[r][c], b = grid[r][c + 1];
    if (a !== 0 && b !== 0) {
      if (sym === '<' && !(a < b)) {
        conflicts.add(`${r},${c}`);
        conflicts.add(`${r},${c + 1}`);
      }
      if (sym === '>' && !(a > b)) {
        conflicts.add(`${r},${c}`);
        conflicts.add(`${r},${c + 1}`);
      }
    }
  }

  // Vertical inequality violations
  for (const [key, sym] of vIneq) {
    const colon = key.indexOf(':');
    const comma = key.indexOf(',', colon);
    const r = +key.slice(colon + 1, comma);
    const c = +key.slice(comma + 1);
    const a = grid[r][c], b = grid[r + 1][c];
    if (a !== 0 && b !== 0) {
      if (sym === '^' && !(a < b)) {
        conflicts.add(`${r},${c}`);
        conflicts.add(`${r + 1},${c}`);
      }
      if (sym === 'v' && !(a > b)) {
        conflicts.add(`${r},${c}`);
        conflicts.add(`${r + 1},${c}`);
      }
    }
  }

  return conflicts;
}

export function isCompleteFutoshiki(grid, n) {
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++)
      if (grid[r][c] === 0) return false;
  return true;
}
