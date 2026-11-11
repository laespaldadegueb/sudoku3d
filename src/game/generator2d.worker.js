import { generatePuzzle2d } from './generator2d.js';

self.onmessage = function (e) {
  const { targetClues, seed } = e.data;
  const result = generatePuzzle2d({ targetClues, seed });
  self.postMessage(result);
};
