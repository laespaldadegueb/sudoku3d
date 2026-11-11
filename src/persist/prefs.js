import { DIFFICULTY_ORDER, COMPLETIONS_TO_UNLOCK } from '../game/difficulty.js';

export function getEffectiveUnlocked() {
  if (getSettings().unlockAll) return DIFFICULTY_ORDER.slice();
  return getProgress().unlocked;
}

const KEY = 'sudoku3d.v1';

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); }
  catch { return {}; }
}

function save(data) {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
}

export function getProgress() {
  const d = load();
  const completed = d.completed || {};

  // Derive unlocked levels from completed (source of truth)
  const unlocked = ['beginner'];
  for (let i = 0; i < DIFFICULTY_ORDER.length - 1; i++) {
    if ((completed[DIFFICULTY_ORDER[i]] || 0) >= COMPLETIONS_TO_UNLOCK) {
      unlocked.push(DIFFICULTY_ORDER[i + 1]);
    } else {
      break;
    }
  }

  return {
    unlocked,
    completed,
    bestTime: d.bestTime || {},
    bestScore: d.bestScore || {},
    lastDifficulty: d.lastDifficulty || 'beginner',
  };
}

export function saveProgress(p) { save({ ...load(), ...p }); }

export function setLastDifficulty(diffId) {
  const p = getProgress();
  p.lastDifficulty = diffId;
  saveProgress(p);
}

const SETTINGS_KEY = 'sudoku3d.settings.v1';

export function getSettings() {
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    return {
      sfxVolume:    s.sfxVolume    ?? 0.6,
      reducedMotion: s.reducedMotion
        ?? window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      hudScale: s.hudScale ?? 1,
      highContrast: s.highContrast ?? false,
      unlockAll: s.unlockAll ?? false,
    };
  } catch { return { sfxVolume: 0.6, reducedMotion: false, hudScale: 1, highContrast: false, unlockAll: false }; }
}

export function saveSettings(s) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch {}
}

export function exportAllData() {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('sudoku3d')) data[k] = localStorage.getItem(k);
  }
  return JSON.stringify(data, null, 2);
}

export function importAllData(json) {
  const data = JSON.parse(json);
  for (const [k, v] of Object.entries(data)) {
    if (k.startsWith('sudoku3d')) localStorage.setItem(k, v);
  }
}

export function resetAllData() {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('sudoku3d')) keys.push(k);
  }
  keys.forEach(k => localStorage.removeItem(k));
}

export function getRanking(diffId) {
  const d = load();
  return (d.ranking || {})[diffId] || [];
}

export function addToRanking(mode, { seconds, score, date, diffId }) {
  const d = load();
  if (!d.modeRanking) d.modeRanking = {};
  if (!d.modeRanking[mode]) d.modeRanking[mode] = [];
  d.modeRanking[mode].push({ seconds, score, date, diffId });
  d.modeRanking[mode].sort((a, b) => b.score - a.score);
  d.modeRanking[mode] = d.modeRanking[mode].slice(0, 10);
  save(d);
}

export function getAllModeRankings() {
  const d = load();
  return d.modeRanking || {};
}

export function getStreak() {
  const d = load();
  return { streak: d.streak || 0, lastPlayDate: d.lastPlayDate || null };
}

export function updateStreak() {
  const d = load();
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (d.lastPlayDate === today) return d.streak || 0;
  d.streak = d.lastPlayDate === yesterday ? (d.streak || 0) + 1 : 1;
  d.lastPlayDate = today;
  save(d);
  return d.streak;
}

const SAVE_PREFIX = 'sudoku3d.save.';
const ALL_MODES = ['3d', '2d', 'kakuro', 'futoshiki', 'binairo'];

export function saveGame(mode, state) {
  try {
    localStorage.setItem(SAVE_PREFIX + mode, JSON.stringify({ ...state, savedAt: Date.now() }));
  } catch {}
}

export function getGame(mode) {
  try { return JSON.parse(localStorage.getItem(SAVE_PREFIX + mode)); } catch { return null; }
}

export function deleteGame(mode) {
  try { localStorage.removeItem(SAVE_PREFIX + mode); } catch {}
}

export function getAllSavedGames() {
  return ALL_MODES.map(m => getGame(m)).filter(Boolean);
}

export function migrateOldSave() {
  const raw = localStorage.getItem('sudoku3d.inprogress.v1');
  if (!raw) return;
  try {
    const state = JSON.parse(raw);
    const mode = state.mode || '3d';
    if (!getGame(mode)) saveGame(mode, state);
    localStorage.removeItem('sudoku3d.inprogress.v1');
  } catch {}
}

export function recordCompletion({ diffId, seconds, score }) {
  const p = getProgress();
  p.completed[diffId] = (p.completed[diffId] || 0) + 1;

  const prevBestTime = p.bestTime[diffId];
  const prevBestScore = p.bestScore[diffId];
  const newBestTime = prevBestTime === undefined || seconds < prevBestTime;
  const newBestScore = prevBestScore === undefined || score > prevBestScore;
  if (newBestTime) p.bestTime[diffId] = seconds;
  if (newBestScore) p.bestScore[diffId] = score;

  // unlockedNext is true exactly when the threshold is crossed
  let unlockedNext = null;
  const idx = DIFFICULTY_ORDER.indexOf(diffId);
  if (idx >= 0 && idx < DIFFICULTY_ORDER.length - 1
      && p.completed[diffId] === COMPLETIONS_TO_UNLOCK) {
    unlockedNext = DIFFICULTY_ORDER[idx + 1];
  }

  saveProgress(p);
  return {
    newBestTime,
    newBestScore,
    completedCount: p.completed[diffId],
    unlockedNext,
    bestTime: p.bestTime[diffId],
    bestScore: p.bestScore[diffId],
  };
}
