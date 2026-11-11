export let N = 4;

export function setN(n) { N = n; }

export function createGrid() {
  const grid = Array.from({ length: N }, () =>
    Array.from({ length: N }, () =>
      Array.from({ length: N }, () => 0)));
  const fixed = Array.from({ length: N }, () =>
    Array.from({ length: N }, () =>
      Array.from({ length: N }, () => false)));
  return { grid, fixed };
}

export const CLUES = [
  [0,0,0,1],[1,1,0,2],[2,2,0,3],[3,3,0,4],
  [0,1,1,3],[1,0,1,4],[2,3,1,1],[3,2,1,2],
  [0,2,2,4],[1,3,2,3],[2,0,2,2],[3,1,2,1],
  [0,3,3,2],[1,2,3,1],[2,1,3,4],[3,0,3,3],
];

export function applyClues({ grid, fixed }, clues = CLUES) {
  for (const [x, y, z, v] of clues) {
    grid[x][y][z] = v;
    fixed[x][y][z] = true;
  }
}
