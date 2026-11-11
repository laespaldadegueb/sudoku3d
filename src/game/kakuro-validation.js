// Returns a Set of "r,c" keys for cells involved in a constraint violation:
// - duplicate values within the same run
// - complete run whose digit sum != clue
export function computeConflictsKakuro(grid, runs) {
  const conflicts = new Set();

  for (const run of runs) {
    const seen = new Map(); // value -> first cell index
    let runSum = 0;
    let complete = true;

    for (let i = 0; i < run.cells.length; i++) {
      const { r, c } = run.cells[i];
      const v = grid[r][c];
      if (v === 0) { complete = false; continue; }
      runSum += v;
      if (seen.has(v)) {
        conflicts.add(`${r},${c}`);
        const prev = run.cells[seen.get(v)];
        conflicts.add(`${prev.r},${prev.c}`);
      } else {
        seen.set(v, i);
      }
    }

    if (complete && runSum !== run.clue) {
      for (const { r, c } of run.cells) conflicts.add(`${r},${c}`);
    }
  }

  return conflicts;
}

export function isCompleteKakuro(grid, whiteCells) {
  for (const { r, c } of whiteCells)
    if (grid[r][c] === 0) return false;
  return true;
}
