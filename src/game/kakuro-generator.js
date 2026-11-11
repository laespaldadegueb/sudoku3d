import { mulberry32, randomSeed, shuffle } from '../util/prng.js';

// Layout templates: 1=white cell (player input), 0=black cell
// Each template has been verified: every white cell belongs to an H run ≥2 AND a V run ≥2.
const TEMPLATES = {
  small: [
    [0,0,0,0,0,0,0],
    [0,1,1,0,1,1,0],
    [0,1,1,1,1,1,0],
    [0,0,1,1,1,0,0],
    [0,1,1,1,1,1,0],
    [0,1,1,0,1,1,0],
    [0,0,0,0,0,0,0],
  ],
  medium: [
    [0,0,0,0,0,0,0,0,0],
    [0,0,0,1,1,0,1,1,0],
    [0,0,1,1,1,1,1,1,0],
    [0,1,1,0,1,1,1,1,0],
    [0,1,1,1,1,0,1,1,0],
    [0,0,1,1,1,1,0,0,0],
    [0,0,1,1,1,1,1,0,0],
    [0,0,1,1,0,1,1,0,0],
    [0,0,0,0,0,0,0,0,0],
  ],
};

// Returns all horizontal and vertical runs for a template.
// Each run: { cells: [{r,c}], clueCell: {r,c}, isHorizontal: bool }
export function getRuns(template) {
  const rows = template.length;
  const cols = template[0].length;
  const runs = [];

  // Horizontal runs
  for (let r = 0; r < rows; r++) {
    let c = 0;
    while (c < cols) {
      if (template[r][c] === 1) {
        const start = c;
        while (c < cols && template[r][c] === 1) c++;
        const cells = [];
        for (let i = start; i < c; i++) cells.push({ r, c: i });
        runs.push({ cells, clueCell: { r, c: start - 1 }, isHorizontal: true });
      } else {
        c++;
      }
    }
  }

  // Vertical runs
  for (let c = 0; c < cols; c++) {
    let r = 0;
    while (r < rows) {
      if (template[r][c] === 1) {
        const start = r;
        while (r < rows && template[r][c] === 1) r++;
        const cells = [];
        for (let i = start; i < r; i++) cells.push({ r: i, c });
        runs.push({ cells, clueCell: { r: start - 1, c }, isHorizontal: false });
      } else {
        r++;
      }
    }
  }

  return runs;
}

// Returns a map from "r,c" to { hRunIdx, vRunIdx } for each white cell.
function buildCellRunIndex(template, runs) {
  const index = new Map();
  for (let i = 0; i < runs.length; i++) {
    for (const { r, c } of runs[i].cells) {
      const key = `${r},${c}`;
      const entry = index.get(key) || {};
      if (runs[i].isHorizontal) entry.hRunIdx = i;
      else entry.vRunIdx = i;
      index.set(key, entry);
    }
  }
  return index;
}

// Backtracking solver: assigns digits 1-9 to white cells so no run has duplicates.
// Returns a filled solution grid or null if impossible.
function solve(template, runs, whiteCells, cellRunIndex, rng) {
  const rows = template.length;
  const cols = template[0].length;
  const grid = Array.from({ length: rows }, () => Array(cols).fill(0));
  const usedInRun = runs.map(() => new Set());

  function bt(pos) {
    if (pos === whiteCells.length) return true;
    const { r, c } = whiteCells[pos];
    const key = `${r},${c}`;
    const { hRunIdx, vRunIdx } = cellRunIndex.get(key);
    const hUsed = usedInRun[hRunIdx];
    const vUsed = usedInRun[vRunIdx];

    const vals = shuffle([1,2,3,4,5,6,7,8,9], rng);
    for (const v of vals) {
      if (hUsed.has(v) || vUsed.has(v)) continue;
      grid[r][c] = v;
      hUsed.add(v);
      vUsed.add(v);
      if (bt(pos + 1)) return true;
      grid[r][c] = 0;
      hUsed.delete(v);
      vUsed.delete(v);
    }
    return false;
  }

  if (!bt(0)) return null;
  return grid;
}

// Returns true if `n` distinct digits from {1..9} \ used can sum to `target`.
function canReach(target, n, used) {
  if (n === 0) return target === 0;
  // Build sorted list of available digits
  const avail = [];
  for (let d = 1; d <= 9; d++) if (!used.has(d)) avail.push(d);
  if (avail.length < n) return false;
  // Min sum: n smallest available; max sum: n largest available
  let lo = 0, hi = 0;
  for (let i = 0; i < n; i++) lo += avail[i];
  for (let i = avail.length - n; i < avail.length; i++) hi += avail[i];
  return target >= lo && target <= hi;
}

// Counts solutions satisfying all run-sum clues (stops at `limit`).
// Uses bounds-checking to prune infeasible branches early.
function countSolutions(runs, whiteCells, cellRunIndex, clues, limit = 2) {
  const usedInRun = runs.map(() => new Set());
  const partialSum = runs.map(() => 0);
  const remaining = runs.map(r => r.cells.length);
  let count = 0;

  function bt(pos) {
    if (count >= limit) return;
    if (pos === whiteCells.length) { count++; return; }
    const { r, c } = whiteCells[pos];
    const { hRunIdx, vRunIdx } = cellRunIndex.get(`${r},${c}`);

    for (let v = 1; v <= 9; v++) {
      if (usedInRun[hRunIdx].has(v) || usedInRun[vRunIdx].has(v)) continue;
      const hSum = partialSum[hRunIdx] + v;
      const vSum = partialSum[vRunIdx] + v;
      if (hSum > clues[hRunIdx] || vSum > clues[vRunIdx]) continue;

      const hRem = remaining[hRunIdx] - 1;
      const vRem = remaining[vRunIdx] - 1;
      if (hRem === 0 && hSum !== clues[hRunIdx]) continue;
      if (vRem === 0 && vSum !== clues[vRunIdx]) continue;

      // Bounds check: can remaining cells still reach the needed sum?
      usedInRun[hRunIdx].add(v);
      usedInRun[vRunIdx].add(v);
      const hFeasible = hRem === 0 || canReach(clues[hRunIdx] - hSum, hRem, usedInRun[hRunIdx]);
      const vFeasible = vRem === 0 || canReach(clues[vRunIdx] - vSum, vRem, usedInRun[vRunIdx]);

      if (hFeasible && vFeasible) {
        partialSum[hRunIdx] = hSum;
        partialSum[vRunIdx] = vSum;
        remaining[hRunIdx] = hRem;
        remaining[vRunIdx] = vRem;

        bt(pos + 1);

        partialSum[hRunIdx] -= v;
        partialSum[vRunIdx] -= v;
        remaining[hRunIdx]++;
        remaining[vRunIdx]++;
      }

      usedInRun[hRunIdx].delete(v);
      usedInRun[vRunIdx].delete(v);
    }
  }

  bt(0);
  return count;
}

export function generateKakuro({ seed = randomSeed(), difficulty = 'medium' } = {}) {
  const templateKey = (difficulty === 'beginner' || difficulty === 'intermediate') ? 'small' : 'medium';
  const template = TEMPLATES[templateKey];
  const runs = getRuns(template);
  const cellRunIndex = buildCellRunIndex(template, runs);

  const whiteCells = [];
  for (let r = 0; r < template.length; r++)
    for (let c = 0; c < template[0].length; c++)
      if (template[r][c] === 1) whiteCells.push({ r, c });

  // Loop instead of recursion to avoid stack overflow when many seeds are rejected.
  for (let s = seed; ; s++) {
    const rng = mulberry32(s);
    const solution = solve(template, runs, whiteCells, cellRunIndex, rng);
    if (!solution) continue;

    const runsWithClues = runs.map(run => ({
      ...run,
      clue: run.cells.reduce((acc, { r, c }) => acc + solution[r][c], 0),
    }));

    // Reject puzzles with multiple solutions (e.g. two 2-cell runs both summing to 16
    // at the same intersection create an ambiguous {7,9}/{9,7} swap).
    const clues = runsWithClues.map(run => run.clue);
    if (countSolutions(runsWithClues, whiteCells, cellRunIndex, clues, 2) !== 1) continue;

    const rightClues = new Map();
    const downClues = new Map();
    for (const run of runsWithClues) {
      const key = `${run.clueCell.r},${run.clueCell.c}`;
      if (run.isHorizontal) rightClues.set(key, run.clue);
      else downClues.set(key, run.clue);
    }

    return {
      template,
      solution,
      runs: runsWithClues,
      rightClues,
      downClues,
      whiteCells,
      cellRunIndex,
      seed: s,
    };
  }
}
