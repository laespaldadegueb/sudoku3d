import { mulberry32, randomSeed, shuffle } from '../util/prng.js';

const SIZE_FOR_DIFFICULTY = {
  beginner: 6, intermediate: 8, advanced: 10, expert: 12,
};
// beginner ~60%, intermediate ~38%, advanced ~27%, expert ~21%
const TARGET_CLUES = {
  beginner: 22, intermediate: 24, advanced: 27, expert: 30,
};

// Internal: 0=empty, 1=binairo "0", 2=binairo "1"

function isValidPlacement(grid, n, r, c, v) {
  const half = n / 2;

  let rowCount = 0;
  for (let i = 0; i < n; i++) if (grid[r][i] === v) rowCount++;
  if (rowCount >= half) return false;

  let colCount = 0;
  for (let i = 0; i < n; i++) if (grid[i][c] === v) colCount++;
  if (colCount >= half) return false;

  if (c >= 2 && grid[r][c-1] === v && grid[r][c-2] === v) return false;
  if (c >= 1 && c < n-1 && grid[r][c-1] === v && grid[r][c+1] === v) return false;
  if (c < n-2 && grid[r][c+1] === v && grid[r][c+2] === v) return false;

  if (r >= 2 && grid[r-1][c] === v && grid[r-2][c] === v) return false;
  if (r >= 1 && r < n-1 && grid[r-1][c] === v && grid[r+1][c] === v) return false;
  if (r < n-2 && grid[r+1][c] === v && grid[r+2][c] === v) return false;

  let wouldCompleteRow = true;
  for (let i = 0; i < n; i++) if (i !== c && grid[r][i] === 0) { wouldCompleteRow = false; break; }
  if (wouldCompleteRow) {
    const newRow = [...grid[r]]; newRow[c] = v;
    for (let r2 = 0; r2 < n; r2++) {
      if (r2 === r) continue;
      let r2Full = true;
      for (let i = 0; i < n; i++) if (grid[r2][i] === 0) { r2Full = false; break; }
      if (r2Full && grid[r2].every((x, i) => x === newRow[i])) return false;
    }
  }

  let wouldCompleteCol = true;
  for (let i = 0; i < n; i++) if (i !== r && grid[i][c] === 0) { wouldCompleteCol = false; break; }
  if (wouldCompleteCol) {
    for (let c2 = 0; c2 < n; c2++) {
      if (c2 === c) continue;
      let c2Full = true;
      for (let i = 0; i < n; i++) if (grid[i][c2] === 0) { c2Full = false; break; }
      if (c2Full) {
        let same = true;
        for (let i = 0; i < n; i++) {
          const cv = i === r ? v : grid[i][c];
          if (grid[i][c2] !== cv) { same = false; break; }
        }
        if (same) return false;
      }
    }
  }

  return true;
}

function generateSolution(n, rng) {
  const grid = Array.from({ length: n }, () => Array(n).fill(0));

  function bt(pos) {
    if (pos === n * n) return true;
    const r = Math.floor(pos / n);
    const c = pos % n;
    const vals = rng() < 0.5 ? [1, 2] : [2, 1];
    for (const v of vals) {
      if (!isValidPlacement(grid, n, r, c, v)) continue;
      grid[r][c] = v;
      if (bt(pos + 1)) return true;
      grid[r][c] = 0;
    }
    return false;
  }

  bt(0);
  return grid;
}

function countSolutions(puzzle, n, limit = 2) {
  const g = puzzle.map(row => [...row]);

  // Propagació de restriccions: omple les caselles forçades
  let changed = true;
  while (changed) {
    changed = false;
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (g[r][c] !== 0) continue;
        const valid = [1, 2].filter(v => isValidPlacement(g, n, r, c, v));
        if (valid.length === 0) return 0;
        if (valid.length === 1) { g[r][c] = valid[0]; changed = true; }
      }
    }
  }

  const empty = [];
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++)
      if (g[r][c] === 0) empty.push({ r, c });

  let count = 0;
  function bt(idx) {
    if (count >= limit) return;
    if (idx === empty.length) { count++; return; }
    const { r, c } = empty[idx];
    for (const v of [1, 2]) {
      if (!isValidPlacement(g, n, r, c, v)) continue;
      g[r][c] = v;
      bt(idx + 1);
      g[r][c] = 0;
    }
  }
  bt(0);
  return count;
}

function stripCells(solution, n, target, rng) {
  const puzzle = solution.map(row => [...row]);
  const positions = [];
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++)
      positions.push({ r, c });
  shuffle(positions, rng);

  let revealed = n * n;
  for (const { r, c } of positions) {
    if (revealed <= target) break;
    const val = puzzle[r][c];
    puzzle[r][c] = 0;
    if (countSolutions(puzzle, n) === 1) {
      revealed--;
    } else {
      puzzle[r][c] = val;
    }
  }
  return puzzle;
}

export function generateBinairo({ seed = randomSeed(), difficulty = 'beginner' } = {}) {
  const rng = mulberry32(seed);
  const n = SIZE_FOR_DIFFICULTY[difficulty] ?? 6;
  const target = TARGET_CLUES[difficulty] ?? 14;
  const solution = generateSolution(n, rng);
  const fixed = stripCells(solution, n, target, rng);
  const grid = fixed.map(row => [...row]);
  return { n, solution, fixed, grid, seed };
}
