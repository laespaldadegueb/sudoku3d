import { isValidPlacement2d } from './validation2d.js';
import { mulberry32, randomSeed, shuffle } from '../util/prng.js';

function emptyGrid() {
  return Array.from({ length: 9 }, () => Array(9).fill(0));
}

function buildSolution(rng) {
  const grid = emptyGrid();

  // Fill diagonal 3×3 boxes first (independent of each other)
  for (let b = 0; b < 3; b++) {
    const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rng);
    let i = 0;
    for (let r = b * 3; r < b * 3 + 3; r++)
      for (let c = b * 3; c < b * 3 + 3; c++)
        grid[r][c] = nums[i++];
  }

  function solve(pos) {
    if (pos === 81) return true;
    const r = Math.floor(pos / 9);
    const c = pos % 9;
    if (grid[r][c] !== 0) return solve(pos + 1);
    const vals = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rng);
    for (const v of vals) {
      if (isValidPlacement2d(grid, r, c, v)) {
        grid[r][c] = v;
        if (solve(pos + 1)) return true;
        grid[r][c] = 0;
      }
    }
    return false;
  }

  solve(0);
  return grid;
}

function countSolutions(grid, limit = 2) {
  const g = grid.map(r => [...r]);
  let count = 0;

  function solve(pos) {
    if (count >= limit) return;
    if (pos === 81) { count++; return; }
    const r = Math.floor(pos / 9);
    const c = pos % 9;
    if (g[r][c] !== 0) { solve(pos + 1); return; }
    for (let v = 1; v <= 9 && count < limit; v++) {
      if (isValidPlacement2d(g, r, c, v)) {
        g[r][c] = v;
        solve(pos + 1);
        g[r][c] = 0;
      }
    }
  }

  solve(0);
  return count;
}

export function generatePuzzle2d({ seed = randomSeed(), targetClues = 36 } = {}) {
  const rng = mulberry32(seed);
  const solution = buildSolution(rng);

  const grid = solution.map(r => [...r]);
  const allCells = [];
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      allCells.push([r, c]);

  const coords = shuffle(allCells, rng);
  const toRemove = 81 - targetClues;
  let removed = 0;

  for (const [r, c] of coords) {
    if (removed >= toRemove) break;
    const v = grid[r][c];
    grid[r][c] = 0;
    if (countSolutions(grid, 2) === 1) {
      removed++;
    } else {
      grid[r][c] = v;
    }
  }

  const fixed = grid.map(row => row.map(v => v !== 0));
  return { grid, fixed, solution, seed };
}
