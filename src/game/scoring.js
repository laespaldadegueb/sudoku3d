import { DIFFICULTIES } from './difficulty.js';

export function computeScore({ diffId, elapsedSeconds, errors, hints = 0, validations = 0, n = 4 }) {
  const d = DIFFICULTIES[diffId];
  const sizeMult = n === 3 ? 0.5 : n === 9 ? 4 : 1;
  const base = 1000 * d.scoreMult * sizeMult;
  const timeBonus = Math.max(0, d.targetTime - elapsedSeconds) * 5;
  const penalties = errors * 20 + hints * 50 + validations * 10;
  return Math.max(0, Math.round(base + timeBonus - penalties));
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
