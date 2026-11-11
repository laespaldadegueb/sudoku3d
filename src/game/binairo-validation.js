// Internal: 0=empty, 1=binairo "0", 2=binairo "1"

export function computeConflictsBinairo(grid, n) {
  const conflicts = new Set();
  const half = n / 2;

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const v = grid[r][c];
      if (!v) continue;
      if (c >= 2 && grid[r][c-1] === v && grid[r][c-2] === v) {
        conflicts.add(`${r},${c}`); conflicts.add(`${r},${c-1}`); conflicts.add(`${r},${c-2}`);
      }
      if (c >= 1 && c < n-1 && grid[r][c-1] === v && grid[r][c+1] === v) {
        conflicts.add(`${r},${c-1}`); conflicts.add(`${r},${c}`); conflicts.add(`${r},${c+1}`);
      }
      if (c < n-2 && grid[r][c+1] === v && grid[r][c+2] === v) {
        conflicts.add(`${r},${c}`); conflicts.add(`${r},${c+1}`); conflicts.add(`${r},${c+2}`);
      }
      if (r >= 2 && grid[r-1][c] === v && grid[r-2][c] === v) {
        conflicts.add(`${r},${c}`); conflicts.add(`${r-1},${c}`); conflicts.add(`${r-2},${c}`);
      }
      if (r >= 1 && r < n-1 && grid[r-1][c] === v && grid[r+1][c] === v) {
        conflicts.add(`${r-1},${c}`); conflicts.add(`${r},${c}`); conflicts.add(`${r+1},${c}`);
      }
      if (r < n-2 && grid[r+1][c] === v && grid[r+2][c] === v) {
        conflicts.add(`${r},${c}`); conflicts.add(`${r+1},${c}`); conflicts.add(`${r+2},${c}`);
      }
    }
  }

  for (let r = 0; r < n; r++) {
    let c1 = 0, c2 = 0;
    for (let c = 0; c < n; c++) {
      if (grid[r][c] === 1) c1++;
      else if (grid[r][c] === 2) c2++;
    }
    if (c1 > half) for (let c = 0; c < n; c++) if (grid[r][c] === 1) conflicts.add(`${r},${c}`);
    if (c2 > half) for (let c = 0; c < n; c++) if (grid[r][c] === 2) conflicts.add(`${r},${c}`);
  }

  for (let c = 0; c < n; c++) {
    let c1 = 0, c2 = 0;
    for (let r = 0; r < n; r++) {
      if (grid[r][c] === 1) c1++;
      else if (grid[r][c] === 2) c2++;
    }
    if (c1 > half) for (let r = 0; r < n; r++) if (grid[r][c] === 1) conflicts.add(`${r},${c}`);
    if (c2 > half) for (let r = 0; r < n; r++) if (grid[r][c] === 2) conflicts.add(`${r},${c}`);
  }

  const fullRows = [];
  for (let r = 0; r < n; r++) if (grid[r].every(v => v !== 0)) fullRows.push(r);
  for (let i = 0; i < fullRows.length; i++)
    for (let j = i + 1; j < fullRows.length; j++)
      if (grid[fullRows[i]].every((v, c) => v === grid[fullRows[j]][c]))
        for (let c = 0; c < n; c++) {
          conflicts.add(`${fullRows[i]},${c}`);
          conflicts.add(`${fullRows[j]},${c}`);
        }

  const fullCols = [];
  for (let c = 0; c < n; c++) {
    let full = true;
    for (let r = 0; r < n; r++) if (grid[r][c] === 0) { full = false; break; }
    if (full) fullCols.push(c);
  }
  for (let i = 0; i < fullCols.length; i++)
    for (let j = i + 1; j < fullCols.length; j++) {
      const c1 = fullCols[i], c2 = fullCols[j];
      let same = true;
      for (let r = 0; r < n; r++) if (grid[r][c1] !== grid[r][c2]) { same = false; break; }
      if (same)
        for (let r = 0; r < n; r++) {
          conflicts.add(`${r},${c1}`);
          conflicts.add(`${r},${c2}`);
        }
    }

  return conflicts;
}

export function isCompleteBinairo(grid, n) {
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++)
      if (grid[r][c] === 0) return false;
  return true;
}
