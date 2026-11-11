import { generateFutoshiki } from './futoshiki-generator.js';

self.onmessage = function (e) {
  const { seed, difficulty } = e.data;
  const result = generateFutoshiki({ seed, difficulty });
  self.postMessage(result);
};
