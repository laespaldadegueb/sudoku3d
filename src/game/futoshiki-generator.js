import { mulberry32, randomSeed, shuffle } from '../util/prng.js';

const SIZE_FOR_DIFFICULTY = {
  beginner: 4,
  intermediate: 5,
  advanced: 6,
  expert: 6,
};

// Target number of pre-filled cells
const TARGET_CLUES = {
  beginner: 7,
  intermediate: 9,
  advanced: 10,
  expert: 7,
};

// Fraction of all adjacent pairs that show an inequality sign
const INEQ_DENSITY = {
  beginner: 0.90,
  intermediate: 0.65,
  advanced: 0.50,
  expert: 0.35,
};

function solveLatin(n, rng) {
  const grid = Array.from({ length: n }, () => Array(n).fill(0));
  const rowUsed = Array.from({ length: n }, () => new Set());
  const colUsed = Array.from({ length: n }, () => new Set());

  function bt(pos) {
    if (pos === n * n) return true;
    const r = Math.floor(pos / n);
    const c = pos % n;
    const vals = shuffle(Array.from({ length: n }, (_, i) => i + 1), rng);
    for (const v of vals) {
      if (rowUsed[r].has(v) || colUsed[c].has(v)) continue;
      grid[r][c] = v;
      rowUsed[r].add(v);
      colUsed[c].add(v);
      if (bt(pos + 1)) return true;
      grid[r][c] = 0;
      rowUsed[r].delete(v);
      colUsed[c].delete(v);
    }
    return false;
  }

  bt(0);
  return grid;
}

function buildIneqMaps(solution, n, density, rng) {
  const hIneq = new Map(); // 'h:r,c' → '<' | '>'  (between (r,c) and (r,c+1))
  const vIneq = new Map(); // 'v:r,c' → '^' | 'v'  (between (r,c) and (r+1,c))

  const hPairs = [];
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n - 1; c++)
      hPairs.push({ r, c });

  const vPairs = [];
  for (let r = 0; r < n - 1; r++)
    for (let c = 0; c < n; c++)
      vPairs.push({ r, c });

  shuffle(hPairs, rng);
  shuffle(vPairs, rng);

  const hCount = Math.round(hPairs.length * density);
  const vCount = Math.round(vPairs.length * density);

  for (let i = 0; i < hCount; i++) {
    const { r, c } = hPairs[i];
    hIneq.set(`h:${r},${c}`, solution[r][c] < solution[r][c + 1] ? '<' : '>');
  }
  for (let i = 0; i < vCount; i++) {
    const { r, c } = vPairs[i];
    vIneq.set(`v:${r},${c}`, solution[r][c] < solution[r + 1][c] ? '^' : 'v');
  }

  return { hIneq, vIneq };
}

// Returns true if placing v at (r,c) is consistent with the current grid state.
function checkCell(g, n, r, c, v, hIneq, vIneq) {
  // Row uniqueness
  for (let i = 0; i < n; i++)
    if (i !== c && g[r][i] === v) return false;
  // Column uniqueness
  for (let i = 0; i < n; i++)
    if (i !== r && g[i][c] === v) return false;
  // Inequality with left neighbour: h:r,c-1
  if (c > 0 && g[r][c - 1] !== 0) {
    const s = hIneq.get(`h:${r},${c - 1}`);
    if (s === '<' && !(g[r][c - 1] < v)) return false;
    if (s === '>' && !(g[r][c - 1] > v)) return false;
  }
  // Inequality with right neighbour: h:r,c
  if (c < n - 1 && g[r][c + 1] !== 0) {
    const s = hIneq.get(`h:${r},${c}`);
    if (s === '<' && !(v < g[r][c + 1])) return false;
    if (s === '>' && !(v > g[r][c + 1])) return false;
  }
  // Inequality with upper neighbour: v:r-1,c
  if (r > 0 && g[r - 1][c] !== 0) {
    const s = vIneq.get(`v:${r - 1},${c}`);
    if (s === '^' && !(g[r - 1][c] < v)) return false;
    if (s === 'v' && !(g[r - 1][c] > v)) return false;
  }
  // Inequality with lower neighbour: v:r,c
  if (r < n - 1 && g[r + 1][c] !== 0) {
    const s = vIneq.get(`v:${r},${c}`);
    if (s === '^' && !(v < g[r + 1][c])) return false;
    if (s === 'v' && !(v > g[r + 1][c])) return false;
  }
  return true;
}

// Counts solutions, stopping at `limit`. Returns 0, 1, or limit.
function countSolutions(puzzle, n, hIneq, vIneq, limit = 2) {
  const g = puzzle.map(row => [...row]);
  const empty = [];
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++)
      if (g[r][c] === 0) empty.push({ r, c });

  // Sort most-constrained cells first to prune early
  empty.sort((a, b) => {
    const cnt = ({ r, c }) =>
      (hIneq.has(`h:${r},${c - 1}`) ? 1 : 0) +
      (hIneq.has(`h:${r},${c}`)     ? 1 : 0) +
      (vIneq.has(`v:${r - 1},${c}`) ? 1 : 0) +
      (vIneq.has(`v:${r},${c}`)     ? 1 : 0);
    return cnt(b) - cnt(a);
  });

  let count = 0;

  function bt(idx) {
    if (count >= limit) return;
    if (idx === empty.length) { count++; return; }
    const { r, c } = empty[idx];
    for (let v = 1; v <= n; v++) {
      if (!checkCell(g, n, r, c, v, hIneq, vIneq)) continue;
      g[r][c] = v;
      bt(idx + 1);
      g[r][c] = 0;
    }
  }

  bt(0);
  return count;
}

function stripCells(solution, n, hIneq, vIneq, target, rng) {
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
    if (countSolutions(puzzle, n, hIneq, vIneq) === 1) {
      revealed--;
    } else {
      puzzle[r][c] = val;
    }
  }

  return puzzle;
}

export function generateFutoshiki({ seed = randomSeed(), difficulty = 'beginner' } = {}) {
  const rng = mulberry32(seed);
  const n       = SIZE_FOR_DIFFICULTY[difficulty] ?? 4;
  const density = INEQ_DENSITY[difficulty] ?? 0.7;
  const target  = TARGET_CLUES[difficulty] ?? 8;

  const solution = solveLatin(n, rng);
  const { hIneq, vIneq } = buildIneqMaps(solution, n, density, rng);
  const fixed = stripCells(solution, n, hIneq, vIneq, target, rng);
  const grid  = fixed.map(row => [...row]);

  return { n, solution, fixed, grid, hIneq, vIneq, seed };
}
