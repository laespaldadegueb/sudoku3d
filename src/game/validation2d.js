export function isValidPlacement2d(grid, row, col, v) {
  if (v === 0) return true;
  for (let i = 0; i < 9; i++) {
    if (i !== col && grid[row][i] === v) return false;
    if (i !== row && grid[i][col] === v) return false;
  }
  const br = Math.floor(row / 3) * 3;
  const bc = Math.floor(col / 3) * 3;
  for (let r = br; r < br + 3; r++)
    for (let c = bc; c < bc + 3; c++)
      if ((r !== row || c !== col) && grid[r][c] === v) return false;
  return true;
}

export function computeConflicts2d(grid) {
  const conflicts = new Set();
  const mark = (r, c) => conflicts.add(`${r},${c}`);

  for (let r = 0; r < 9; r++) {
    const seen = new Map();
    for (let c = 0; c < 9; c++) {
      const v = grid[r][c];
      if (v !== 0) {
        if (seen.has(v)) { mark(r, c); mark(r, seen.get(v)); }
        else seen.set(v, c);
      }
    }
  }

  for (let c = 0; c < 9; c++) {
    const seen = new Map();
    for (let r = 0; r < 9; r++) {
      const v = grid[r][c];
      if (v !== 0) {
        if (seen.has(v)) { mark(r, c); mark(seen.get(v), c); }
        else seen.set(v, r);
      }
    }
  }

  for (let br = 0; br < 3; br++) {
    for (let bc = 0; bc < 3; bc++) {
      const seen = new Map();
      for (let dr = 0; dr < 3; dr++) {
        for (let dc = 0; dc < 3; dc++) {
          const r = br * 3 + dr, c = bc * 3 + dc;
          const v = grid[r][c];
          if (v !== 0) {
            if (seen.has(v)) {
              mark(r, c);
              const [pr, pc] = seen.get(v);
              mark(pr, pc);
            } else {
              seen.set(v, [r, c]);
            }
          }
        }
      }
    }
  }

  return conflicts;
}

export function isComplete2d(grid) {
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      if (grid[r][c] === 0) return false;
  return true;
}
