import { generateBinairo } from './binairo-generator.js';

self.onmessage = function(e) {
  const { difficulty, seed } = e.data;
  const result = generateBinairo({ difficulty, seed });
  self.postMessage(result);
};
