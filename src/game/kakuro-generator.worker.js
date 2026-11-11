import { generateKakuro } from './kakuro-generator.js';

self.onmessage = function (e) {
  const { seed, difficulty } = e.data;
  const result = generateKakuro({ seed, difficulty });
  self.postMessage(result);
};
