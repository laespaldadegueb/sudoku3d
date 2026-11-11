import { setN } from './grid.js';
import { generatePuzzle } from './generator.js';

self.onmessage = function(e) {
  const { targetClues, seed, n } = e.data;
  setN(n);
  const result = generatePuzzle({ targetClues, seed });
  self.postMessage(result);
};
