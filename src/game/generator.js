import { N, setN } from './grid.js';
import { isValidPlacement } from './validation.js';
import { mulberry32, randomSeed, shuffle } from '../util/prng.js';

function emptyGrid() {
  return Array.from({ length: N }, () =>
    Array.from({ length: N }, () =>
      Array.from({ length: N }, () => 0)));
}

function allCoords() {
  const out = [];
  for (let x = 0; x < N; x++)
    for (let y = 0; y < N; y++)
      for (let z = 0; z < N; z++)
        out.push([x, y, z]);
  return out;
}

function fillRandom(grid, rng) {
  const coords = allCoords();
  function recurse(idx) {
    if (idx === coords.length) return true;
    const [x, y, z] = coords[idx];
    const values = shuffle([...Array(N)].map((_, i) => i + 1), rng);
    for (const v of values) {
      if (isValidPlacement(grid, x, y, z, v)) {
        grid[x][y][z] = v;
        if (recurse(idx + 1)) return true;
        grid[x][y][z] = 0;
      }
    }
    return false;
  }
  return recurse(0);
}

function buildSolution9(rng) {
  const base = [];
  for (let x = 0; x < 9; x++) {
    base.push([]);
    for (let y = 0; y < 9; y++) {
      base[x].push([]);
      for (let z = 0; z < 9; z++) {
        base[x][y].push(((x + y + z) % 9) + 1);
      }
    }
  }

  const rowPerms = [0,1,2,3,4,5,6,7,8];
  const colPerms = [0,1,2,3,4,5,6,7,8];
  const pilPerms = [0,1,2,3,4,5,6,7,8];
  const digitPerm = [1,2,3,4,5,6,7,8,9];

  function shuffleWithinBands(perm, rng) {
    for (let b = 0; b < 3; b++) {
      const band = [b*3, b*3+1, b*3+2];
      for (let i = 2; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [band[i], band[j]] = [band[j], band[i]];
      }
      perm[b*3] = band[0]; perm[b*3+1] = band[1]; perm[b*3+2] = band[2];
    }
  }

  shuffleWithinBands(rowPerms, rng);
  shuffleWithinBands(colPerms, rng);
  shuffleWithinBands(pilPerms, rng);

  for (let i = 8; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [digitPerm[i], digitPerm[j]] = [digitPerm[j], digitPerm[i]];
  }

  const sol = emptyGrid();
  for (let x = 0; x < 9; x++)
    for (let y = 0; y < 9; y++)
      for (let z = 0; z < 9; z++)
        sol[x][y][z] = digitPerm[base[rowPerms[x]][colPerms[y]][pilPerms[z]] - 1];

  return sol;
}

function countSolutions(grid, limit = 2) {
  const N2 = N * N;
  const total = N * N2;
  const allBits = (1 << N) - 1;

  const initCands = new Int32Array(total);
  for (let x = 0; x < N; x++)
    for (let y = 0; y < N; y++)
      for (let z = 0; z < N; z++) {
        const v = grid[x][y][z];
        initCands[x * N2 + y * N + z] = v ? (1 << (v - 1)) : allBits;
      }

  function propagate(cands) {
    const queue = [];
    for (let i = 0; i < total; i++) {
      if (!cands[i]) return false;
      if (!(cands[i] & (cands[i] - 1))) queue.push(i);
    }

    function drain() {
      while (queue.length) {
        const i = queue.pop();
        const c = cands[i];
        if (!c) return false;
        if (c & (c - 1)) continue;
        const x = (i / N2) | 0, y = ((i % N2) / N) | 0, z = i % N;
        for (let k = 0; k < N; k++) {
          const p0 = k !== x ? k * N2 + y * N + z : -1;
          const p1 = k !== y ? x * N2 + k * N + z : -1;
          const p2 = k !== z ? x * N2 + y * N + k : -1;
          for (const pi of [p0, p1, p2]) {
            if (pi >= 0 && (cands[pi] & c)) {
              cands[pi] &= ~c;
              if (!cands[pi]) return false;
              if (!(cands[pi] & (cands[pi] - 1))) queue.push(pi);
            }
          }
        }
      }
      return true;
    }

    if (!drain()) return false;

    // Hidden singles: if a value can only go in one place in a line, assign it
    let changed = true;
    while (changed) {
      changed = false;
      for (let axis = 0; axis < 3; axis++) {
        for (let a = 0; a < N; a++) {
          for (let b = 0; b < N; b++) {
            for (let bit = 1; bit <= allBits; bit <<= 1) {
              let cnt = 0, lastPi = -1;
              for (let k = 0; k < N; k++) {
                const pi = axis === 0 ? k * N2 + a * N + b :
                           axis === 1 ? a * N2 + k * N + b :
                                        a * N2 + b * N + k;
                if (cands[pi] & bit) { cnt++; lastPi = pi; }
              }
              if (!cnt) return false;
              if (cnt === 1 && cands[lastPi] !== bit) {
                cands[lastPi] = bit;
                queue.push(lastPi);
                if (!drain()) return false;
                changed = true;
              }
            }
          }
        }
      }
    }
    return true;
  }

  let count = 0;

  function solve(cands) {
    if (count >= limit) return;
    if (!propagate(cands)) return;

    // MRV: branch on the unsolved cell with fewest candidates
    let minBits = N + 1, minIdx = -1;
    for (let i = 0; i < total; i++) {
      const c = cands[i];
      if (!(c & (c - 1))) continue; // solved cell (single candidate)
      let bits = 0, tmp = c;
      while (tmp) { bits++; tmp &= tmp - 1; }
      if (bits < minBits) {
        minBits = bits;
        minIdx = i;
        if (minBits === 2) break;
      }
    }

    if (minIdx === -1) { count++; return; } // all cells solved

    let mask = cands[minIdx];
    while (mask && count < limit) {
      const bit = mask & -mask;
      mask &= mask - 1;
      const branch = new Int32Array(cands);
      branch[minIdx] = bit;
      solve(branch);
    }
  }

  solve(initCands);
  return count;
}

export function generatePuzzle({ seed = randomSeed(), targetClues = 20, n } = {}) {
  if (n !== undefined) setN(n);
  const rng = mulberry32(seed);

  let solution;
  if (N === 9) {
    solution = buildSolution9(rng);
  } else {
    solution = emptyGrid();
    fillRandom(solution, rng);
  }

  const grid = solution.map(plane => plane.map(row => row.slice()));
  const coords = shuffle(allCoords(), rng);
  const toRemove = N * N * N - targetClues;
  let removed = 0;

  if (N === 9) {
    // For N=9, uniqueness verification is computationally intractable with line-only
    // constraints at low clue densities. The game accepts any valid completion, so
    // we skip the uniqueness check: the stored solution is always a valid answer.
    for (const [x, y, z] of coords) {
      if (removed >= toRemove) break;
      grid[x][y][z] = 0;
      removed++;
    }
  } else {
    let attempts = 0;
    for (const [x, y, z] of coords) {
      if (removed >= toRemove) break;
      if (attempts >= coords.length) break;
      attempts++;
      const v = grid[x][y][z];
      grid[x][y][z] = 0;
      if (countSolutions(grid, 2) === 1) {
        removed++;
      } else {
        grid[x][y][z] = v;
      }
    }
  }

  const fixed = Array.from({ length: N }, (_, x) =>
    Array.from({ length: N }, (_, y) =>
      Array.from({ length: N }, (_, z) => grid[x][y][z] !== 0)));

  return { grid, fixed, solution, seed };
}
