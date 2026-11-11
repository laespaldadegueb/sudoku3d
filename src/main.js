import { N, setN } from './game/grid.js';
import { computeConflicts, isComplete } from './game/validation.js';
import { computeConflicts2d, isComplete2d } from './game/validation2d.js';
import { createHistory } from './game/history.js';
import { createTimer } from './game/timer.js';
import { DIFFICULTIES, DIFFICULTY_ORDER, getClues, getClues2d } from './game/difficulty.js';
import { computeScore, formatTime } from './game/scoring.js';
import { getProgress, setLastDifficulty, recordCompletion, saveProgress, exportAllData, importAllData, resetAllData, addToRanking, getAllModeRankings, getStreak, updateStreak, saveGame, getGame, deleteGame, getAllSavedGames, migrateOldSave, getSettings, saveSettings, getEffectiveUnlocked } from './persist/prefs.js';
import { addGameHistory, getGameHistory, popCachedPuzzle, addCachedPuzzle, countCachedPuzzles } from './persist/db.js';
import { createScene, addAxesHelper, updateAxesHelper, applyBloomTheme, resetCameraForOffset } from './render/scene.js';
import { initCosmos, updateCosmos, resizeCosmos, setCosmosReducedMotion } from './render/cosmos.js';
import { createCells, setCellVisual, clearCells, clearTextureCache, getOffset } from './render/cells.js';
import { setTheme, getTheme } from './render/themes.js';
import { createEffects } from './render/effects.js';
import { bindNumberButtons, rebuildNumberPad, setInfo, setProgress, bindButton, showVictory, renderDifficultyButtons, bindDifficultyPopover, bindHelp, setAccent, showRanking } from './render/hud.js';
import { sfxPlace, sfxError, sfxErase, sfxSelect, sfxLine, sfxVictory, setSfxVolume, toggleMute as audioToggleMute, isMuted, getSfxVolume } from './audio/audio.js';
import { createNotes, toggleNote, clearNotes, getNotes } from './game/notes.js';
import { createSlicer, rebuildSliceUI, updateSliceBadges } from './render/slicing.js';
import { bindPointerSelection, bindPointerHover } from './input/pointer.js';
import { bindKeyboard } from './input/keyboard.js';
import { dateHash } from './util/prng.js';
import { hapticLight, hapticMedium, hapticError, hapticVictory } from './util/haptic.js';
import { bindBottomSwipe } from './input/swipe.js';
import { initAds, showInterstitialBetweenGames, showRewardedForHint } from './ads.js';
import { initIAP, showPaywall, closePaywall, restoreIAPPurchases } from './iap.js';
import GeneratorWorkerClass from './game/generator.worker.js?worker';
import Generator2dWorkerClass from './game/generator2d.worker.js?worker';
import { createBoard2d, setCellVisual2d } from './render/board2d.js';
import { createKakuroBoard, setCellVisualKakuro } from './render/kakuro-board.js';
import { computeConflictsKakuro, isCompleteKakuro } from './game/kakuro-validation.js';
import KakuroGeneratorWorkerClass from './game/kakuro-generator.worker.js?worker';
import { createFutoshikiBoard, setCellVisualFutoshiki } from './render/futoshiki-board.js';
import { computeConflictsFutoshiki, isCompleteFutoshiki } from './game/futoshiki-validation.js';
import FutoshikiGeneratorWorkerClass from './game/futoshiki-generator.worker.js?worker';
import { createBinairoBoard, setCellVisualBinairo } from './render/binairo-board.js';
import { computeConflictsBinairo, isCompleteBinairo } from './game/binairo-validation.js';
import BinairoGeneratorWorkerClass from './game/binairo-generator.worker.js?worker';

const { scene, camera, renderer, controls, composer, bloom, cosmosCanvas, cosmosTexture } = createScene();
const axesHelper = addAxesHelper(scene, getOffset());

const effects = createEffects({ scene, controls });

let grid, fixed, solution, cells, cellByCoord, selected, conflicts, history, finished;
let notes;
let noteMode = false;
let reducedMotion = false;
let currentDifficulty;
let timer = createTimer();
let errors = 0;
let hintsUsed = 0;
let validationsUsed = 0;
let slicer;
let completedLines;
let selectedLineKeys = new Set();
let currentSeed = null;
let reducedQuality = false;
const fpsHistory = [];
let lowFpsTimer = 0;
let highFpsTimer = 0;
let currentSize = 4;
let generatorWorker = null;
let generationId = 0;
let preGenWorker = null;
let preGenActive = false;
let saveStateTimer = null;
const PRE_GEN_TARGET = 5;

// --- 2D mode state ---
let mode = '3d'; // '3d' | '2d' | 'kakuro'
let grid2d = null, fixed2d = null, solution2d = null;
let cells2d = null, cells2dByKey = null;
let selected2d = null, conflicts2d = new Set();
let notes2d = null;
let selectedHl2d = new Set();
let generator2dWorker = null;
let generationId2d = 0;

// --- Kakuro mode state ---
let kakuroTemplate = null, kakuroSolution = null, kakuroRuns = null;
let kakuroGrid = null;   // 2D array of current player values
let kakuroCells = null, kakuroCellsByKey = null;
let kakuroWhiteCells = null, kakuroCellRunIndex = null;
let selectedKakuro = null, conflictsKakuro = new Set();
let kakuroGeneratorWorker = null;
let generationIdKakuro = 0;

// --- Futoshiki mode state ---
let futoshikiN = 4;
let futoshikiSolution = null, futoshikiFixed = null;
let futoshikiGrid = null;
let futoshikiHIneq = null, futoshikiVIneq = null;
let futoshikiCells = null, futoshikiCellsByKey = null;
let selectedFutoshiki = null, conflictsFutoshiki = new Set();
let notesFutoshiki = null;
let selectedHlFutoshiki = new Set();
let futoshikiGeneratorWorker = null;
let generationIdFutoshiki = 0;

// --- Binairo mode state ---
let binairoN = 6;
let binairoSolution = null, binairoFixed = null;
let binairoGrid = null;
let binairoCells = null, binairoCellsByKey = null;
let selectedBinairo = null, conflictsBinairo = new Set();
let selectedHlBinairo = new Set();
let binairoGeneratorWorker = null;
let generationIdBinairo = 0;

function key2d(r, c) { return `${r},${c}`; }

function createNotes2d() {
  return Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => new Set()));
}

function createNotesFutoshiki(n) {
  return Array.from({ length: n }, () =>
    Array.from({ length: n }, () => new Set()));
}

function getHighlightFutoshiki(r, c, n) {
  const s = new Set();
  for (let i = 0; i < n; i++) {
    if (i !== c) s.add(key2d(r, i));
    if (i !== r) s.add(key2d(i, c));
  }
  return s;
}

function getHighlight2d(r, c) {
  const s = new Set();
  for (let i = 0; i < 9; i++) {
    if (i !== c) s.add(key2d(r, i));
    if (i !== r) s.add(key2d(i, c));
  }
  const br = Math.floor(r / 3) * 3;
  const bc = Math.floor(c / 3) * 3;
  for (let dr = 0; dr < 3; dr++)
    for (let dc = 0; dc < 3; dc++) {
      const nr = br + dr, nc = bc + dc;
      if (nr !== r || nc !== c) s.add(key2d(nr, nc));
    }
  return s;
}

const MODE_LABELS = {
  '3d': 'Sudoku 3D', '2d': 'Sudoku 2D',
  'kakuro': 'Kakuro', 'futoshiki': 'Futoshiki', 'binairo': 'Takuzu',
};

function setMode(m) {
  mode = m;
  document.body.classList.toggle('mode-2d', m === '2d');
  document.body.classList.toggle('mode-kakuro', m === 'kakuro');
  document.body.classList.toggle('mode-futoshiki', m === 'futoshiki');
  document.body.classList.toggle('mode-binairo', m === 'binairo');
  const modeNameEl = document.getElementById('mode-name');
  if (modeNameEl) modeNameEl.textContent = MODE_LABELS[m] ?? '';
  if (m !== '2d') {
    document.getElementById('board2d').innerHTML = '';
    cells2d = null;
    cells2dByKey = null;
    selected2d = null;
    selectedHl2d = new Set();
  }
  if (m !== 'kakuro') {
    document.getElementById('board-kakuro').innerHTML = '';
    kakuroCells = null;
    kakuroCellsByKey = null;
    selectedKakuro = null;
  }
  if (m !== 'futoshiki') {
    document.getElementById('board-futoshiki').innerHTML = '';
    futoshikiCells = null;
    futoshikiCellsByKey = null;
    selectedFutoshiki = null;
    selectedHlFutoshiki = new Set();
  }
  if (m !== 'binairo') {
    document.getElementById('board-binairo').innerHTML = '';
    binairoCells = null;
    binairoCellsByKey = null;
    selectedBinairo = null;
    selectedHlBinairo = new Set();
  }
}

function initGenerator2dWorker() {
  if (generator2dWorker) generator2dWorker.terminate();
  generator2dWorker = new Generator2dWorkerClass();
}

function initKakuroGeneratorWorker() {
  if (kakuroGeneratorWorker) kakuroGeneratorWorker.terminate();
  kakuroGeneratorWorker = new KakuroGeneratorWorkerClass();
}

function initFutoshikiGeneratorWorker() {
  if (futoshikiGeneratorWorker) futoshikiGeneratorWorker.terminate();
  futoshikiGeneratorWorker = new FutoshikiGeneratorWorkerClass();
}

function initBinairoGeneratorWorker() {
  if (binairoGeneratorWorker) binairoGeneratorWorker.terminate();
  binairoGeneratorWorker = new BinairoGeneratorWorkerClass();
}

// Wake Lock: prevents the device from sleeping while playing
let wakeLock = null;
async function requestWakeLock() {
  if (!('wakeLock' in navigator)) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => { wakeLock = null; });
  } catch {}
}
function releaseWakeLock() {
  if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    if (!finished) requestWakeLock();
    document.body.classList.remove('page-hidden');
  } else {
    releaseWakeLock();
    document.body.classList.add('page-hidden');
  }
});

function key(x, y, z) { return `${x},${y},${z}`; }
function lineKey(axis, a, b) { return `${axis}:${a},${b}`; }

function showLoading(on) {
  document.getElementById('loading-overlay').style.display = on ? 'flex' : 'none';
}

function initWorker() {
  if (generatorWorker) generatorWorker.terminate();
  generatorWorker = new GeneratorWorkerClass();
}

function initPreGenWorker() {
  if (preGenWorker) preGenWorker.terminate();
  preGenWorker = new GeneratorWorkerClass();
}

async function preGeneratePuzzles() {
  if (preGenActive) return;
  preGenActive = true;
  try {
    for (const diffId of getEffectiveUnlocked()) {
      const count = await countCachedPuzzles(diffId, currentSize);
      if (count >= PRE_GEN_TARGET) continue;
      const needed = PRE_GEN_TARGET - count;
      for (let i = 0; i < needed; i++) {
        if (!preGenWorker) break;
        if (document.visibilityState === 'hidden') break;
        const targetClues = getClues(diffId, currentSize);
        const puzzle = await new Promise(resolve => {
          preGenWorker.onmessage = e => resolve(e.data);
          preGenWorker.postMessage({ targetClues, n: currentSize });
        });
        await addCachedPuzzle(diffId, currentSize, puzzle);
        await new Promise(r => setTimeout(r, 50));
      }
    }
  } catch {}
  preGenActive = false;
}

function scheduleSaveState() {
  clearTimeout(saveStateTimer);
  saveStateTimer = setTimeout(persistCurrentState, 2000);
}

function persistCurrentState() {
  if (finished) return;
  if (mode === 'binairo') {
    if (!binairoGrid || !binairoFixed || !binairoSolution) return;
    saveGame('binairo', {
      mode: 'binairo',
      n: binairoN,
      grid: binairoGrid,
      fixed: binairoFixed,
      solution: binairoSolution,
      diffId: currentDifficulty.id,
      seconds: timer.getSeconds(),
      errors,
      hintsUsed,
      validationsUsed,
    });
    return;
  }
  if (mode === 'futoshiki') {
    if (!futoshikiGrid || !futoshikiFixed || !futoshikiSolution) return;
    const notesData = futoshikiGrid.map((row, r) => row.map((_, c) => [...notesFutoshiki[r][c]]));
    saveGame('futoshiki', {
      mode: 'futoshiki',
      n: futoshikiN,
      grid: futoshikiGrid,
      fixed: futoshikiFixed,
      solution: futoshikiSolution,
      hIneq: [...futoshikiHIneq.entries()],
      vIneq: [...futoshikiVIneq.entries()],
      diffId: currentDifficulty.id,
      seconds: timer.getSeconds(),
      errors,
      hintsUsed,
      validationsUsed,
      notes: notesData,
    });
    return;
  }
  if (mode === 'kakuro') {
    if (!kakuroGrid || !kakuroTemplate || !kakuroRuns) return;
    saveGame('kakuro', {
      mode: 'kakuro',
      template: kakuroTemplate,
      grid: kakuroGrid,
      solution: kakuroSolution,
      runs: kakuroRuns,
      whiteCells: kakuroWhiteCells,
      cellRunIndex: kakuroCellRunIndex,
      diffId: currentDifficulty.id,
      seconds: timer.getSeconds(),
      errors,
      hintsUsed,
      validationsUsed,
    });
    return;
  }
  if (mode === '2d') {
    if (!grid2d || !fixed2d || !solution2d) return;
    const notesData = grid2d.map((row, r) => row.map((_, c) => [...notes2d[r][c]]));
    saveGame('2d', {
      mode: '2d',
      grid: grid2d,
      fixed: fixed2d,
      solution: solution2d,
      diffId: currentDifficulty.id,
      seconds: timer.getSeconds(),
      errors,
      hintsUsed,
      validationsUsed,
      notes: notesData,
    });
    return;
  }
  if (!grid || !fixed || !solution) return;
  const notesData = grid.map((plane, x) =>
    plane.map((row, y) =>
      row.map((_, z) => [...getNotes(notes, x, y, z)])));
  saveGame('3d', {
    grid: grid.map(p => p.map(r => [...r])),
    fixed: fixed.map(p => p.map(r => [...r])),
    solution: solution.map(p => p.map(r => [...r])),
    seed: currentSeed,
    diffId: currentDifficulty.id,
    size: currentSize,
    seconds: timer.getSeconds(),
    errors,
    hintsUsed,
    validationsUsed,
    notes: notesData,
  });
}

async function restoreState(state) {
  if (state.mode === 'binairo') return restoreStateBinairo(state);
  if (state.mode === 'futoshiki') return restoreStateFutoshiki(state);
  if (state.mode === 'kakuro') return restoreStateKakuro(state);
  if (state.mode === '2d') return restoreState2d(state);
  const diffEntry = DIFFICULTIES[state.diffId];
  if (!diffEntry) return false;
  currentSize = state.size;
  currentDifficulty = diffEntry;
  currentSeed = state.seed;
  setN(currentSize);
  updateAxesHelper(axesHelper, getOffset());
  resetCameraForOffset(camera, controls, getOffset());

  if (cells) clearCells(scene, cells);
  grid = state.grid;
  fixed = state.fixed;
  solution = state.solution;
  cells = createCells(scene, { grid, fixed });
  cellByCoord = new Map();
  for (const c of cells) cellByCoord.set(key(c.x, c.y, c.z), c);
  selected = null;
  selectedLineKeys = new Set();
  conflicts = computeConflicts(grid);

  notes = createNotes();
  for (let x = 0; x < currentSize; x++)
    for (let y = 0; y < currentSize; y++)
      for (let z = 0; z < currentSize; z++)
        for (const v of (state.notes?.[x]?.[y]?.[z] || []))
          toggleNote(notes, x, y, z, v);

  completedLines = seedCompletedLines();
  history = createHistory();
  finished = false;
  errors = state.errors || 0;
  hintsUsed = state.hintsUsed || 0;
  validationsUsed = state.validationsUsed || 0;
  controls.autoRotate = false;

  timer.resetTo(state.seconds || 0);
  timer.start();

  setTheme('zenPaper');
  applyBloomTheme(bloom, getTheme());
  setAccent(getTheme().accent);

  rebuildNumberPad(currentSize);
  bindNumberButtons(placeValue);

  // Defer UI that depends on the module-level slicer being created first
  await new Promise(r => setTimeout(r, 0));

  rebuildSliceUI(currentSize);
  slicer = createSlicer({ getCells: () => cells, onChange: slicerOnChange });

  document.querySelectorAll('.size-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.s, 10) === currentSize);
  });

  setInfo({
    level: currentDifficulty.label,
    time: formatTime(state.seconds || 0),
    errors,
    hints: hintsUsed,
    validations: validationsUsed,
    cell: null,
  });
  updateHistoryButtons();
  for (const c of cells) refreshCellVisual(c);
  slicer.apply();
  refreshDifficultyUI();
  updateProgress3d();
  return true;
}

async function restoreState2d(state) {
  const diffEntry = DIFFICULTIES[state.diffId];
  if (!diffEntry) return false;
  currentDifficulty = diffEntry;
  setMode('2d');

  grid2d = state.grid;
  fixed2d = state.fixed;
  solution2d = state.solution;
  notes2d = createNotes2d();
  if (state.notes) {
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        for (const v of (state.notes[r]?.[c] || []))
          notes2d[r][c].add(v);
  }
  conflicts2d = computeConflicts2d(grid2d);
  selected2d = null;
  selectedHl2d = new Set();

  if (!generator2dWorker) initGenerator2dWorker();

  const result = createBoard2d(selectCell2d);
  cells2d = result.cells;
  cells2dByKey = result.byKey;

  history = createHistory();
  finished = false;
  errors = state.errors || 0;
  hintsUsed = state.hintsUsed || 0;
  validationsUsed = state.validationsUsed || 0;

  timer.resetTo(state.seconds || 0);
  timer.start();

  setTheme('zenPaper');
  applyBloomTheme(bloom, getTheme());
  setAccent(getTheme().accent);

  rebuildNumberPad(9);
  bindNumberButtons(placeValue);

  document.querySelectorAll('.size-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.s === '2d');
  });

  setInfo({
    level: currentDifficulty.label,
    time: formatTime(state.seconds || 0),
    errors,
    hints: hintsUsed,
    validations: validationsUsed,
    cell: null,
  });
  updateHistoryButtons();
  for (const cell of cells2d) refreshCellVisual2d(cell);
  refreshDifficultyUI();
  return true;
}

// ============================================================
// 2D game functions
// ============================================================

function refreshCellVisual2d(cell) {
  const { r, c } = cell;
  const k = key2d(r, c);
  const isSel = selected2d === cell;
  const isConflict = currentDifficulty.liveValidation && conflicts2d.has(k);
  const isHl = !isSel && selectedHl2d.has(k);
  const cn = grid2d[r][c] === 0 ? notes2d[r][c] : null;
  setCellVisual2d(cell, grid2d[r][c], fixed2d[r][c], isSel, isConflict, cn, isHl);
}

function recomputeConflicts2d() {
  const prev = conflicts2d;
  const next = computeConflicts2d(grid2d);
  const changed = new Set([...prev, ...next].filter(k => prev.has(k) !== next.has(k)));
  conflicts2d = next;
  for (const k of changed) {
    const cell = cells2dByKey?.get(k);
    if (cell) refreshCellVisual2d(cell);
  }
}

function selectCell2d(cell) {
  if (finished) return;
  const prev = selected2d;

  if (prev) {
    const oldHl = selectedHl2d;
    selectedHl2d = new Set();
    for (const k of oldHl) {
      const c2 = cells2dByKey.get(k);
      if (c2) refreshCellVisual2d(c2);
    }
    refreshCellVisual2d(prev);
  }

  selected2d = cell;
  selectedHl2d = getHighlight2d(cell.r, cell.c);

  for (const k of selectedHl2d) {
    const c2 = cells2dByKey.get(k);
    if (c2) refreshCellVisual2d(c2);
  }
  refreshCellVisual2d(cell);
  sfxSelect();
  hapticLight();
}

function applyValue2d(r, c, value, recordHistory = true) {
  if (fixed2d[r][c]) return;
  const prev = grid2d[r][c];
  if (prev === value) return;
  grid2d[r][c] = value;

  if (recordHistory) {
    history.push({ r, c, prev, next: value });
    updateHistoryButtons();
    const correct = value !== 0 && solution2d && value === solution2d[r][c];
    if (value !== 0 && !correct) {
      errors++;
      setInfo({ errors });
      sfxError();
      hapticError();
    } else if (value !== 0) {
      sfxPlace();
      hapticMedium();
      notes2d[r][c].clear();
    }
    scheduleSaveState();
  }

  recomputeConflicts2d();
  const cell = cells2dByKey?.get(key2d(r, c));
  if (cell) refreshCellVisual2d(cell);
  if (recordHistory) checkVictory2d();
}

function placeValue2d(value) {
  if (finished || !selected2d) return;
  const { r, c } = selected2d;
  if (noteMode && !fixed2d[r][c] && grid2d[r][c] === 0) {
    if (value === 0) { notes2d[r][c].clear(); }
    else {
      if (notes2d[r][c].has(value)) notes2d[r][c].delete(value);
      else notes2d[r][c].add(value);
    }
    refreshCellVisual2d(selected2d);
    return;
  }
  if (value === 0) sfxErase();
  applyValue2d(r, c, value, true);
}

function checkVictory2d() {
  if (!isComplete2d(grid2d)) return;
  if (conflicts2d.size > 0) return;
  finished = true;
  clearTimeout(saveStateTimer);
  deleteGame('2d');
  releaseWakeLock();
  timer.stop();
  const seconds = timer.getSeconds();
  const today = new Date().toISOString().slice(0, 10);
  const score = computeScore({ diffId: currentDifficulty.id, elapsedSeconds: seconds, errors, hints: hintsUsed, validations: validationsUsed, n: 9 });
  const result = recordCompletion({ diffId: currentDifficulty.id, seconds, score });
  addToRanking('2d', { seconds, score, date: today, diffId: currentDifficulty.id });
  const streak = updateStreak();
  addGameHistory({ diffId: currentDifficulty.id, size: 9, seconds, score, errors, date: today });

  sfxVictory();
  hapticVictory();
  setTimeout(() => {
    showVictory({
      diffId: currentDifficulty.id,
      sizeLabel: 'Classic 2D',
      seconds,
      errors,
      score,
      bestTime: result.bestTime,
      bestScore: result.bestScore,
      newBestTime: result.newBestTime,
      newBestScore: result.newBestScore,
      unlockedNext: result.unlockedNext,
      streak,
      onNewPuzzle: startNewPuzzle2d, onGoHome: showHomeScreen,
    });
    refreshDifficultyUI();
  }, 300);
}

async function startNewPuzzle2d() {
  await showInterstitialBetweenGames();
  deleteGame('2d');
  const targetClues = getClues2d(currentDifficulty.id);

  if (!generator2dWorker) initGenerator2dWorker();

  showLoading(true);
  const id = ++generationId2d;
  const puzzle = await new Promise(resolve => {
    generator2dWorker.onmessage = e => {
      if (generationId2d === id) resolve(e.data);
    };
    generator2dWorker.postMessage({ targetClues });
  });
  if (generationId2d !== id) return;
  showLoading(false);

  grid2d = puzzle.grid;
  fixed2d = puzzle.fixed;
  solution2d = puzzle.solution;
  notes2d = createNotes2d();
  conflicts2d = computeConflicts2d(grid2d);
  selected2d = null;
  selectedHl2d = new Set();

  const boardResult = createBoard2d(selectCell2d);
  cells2d = boardResult.cells;
  cells2dByKey = boardResult.byKey;

  history = createHistory();
  finished = false;
  errors = 0;
  hintsUsed = 0;
  validationsUsed = 0;

  if (noteMode) {
    noteMode = false;
    const btn = document.getElementById('btn-notes');
    btn.classList.remove('active');
    btn.setAttribute('aria-pressed', 'false');
  }

  timer.reset();
  timer.start();
  requestWakeLock();

  setTheme('zenPaper');
  applyBloomTheme(bloom, getTheme());
  setAccent(getTheme().accent);

  rebuildNumberPad(9);
  bindNumberButtons(placeValue);

  setInfo({ level: currentDifficulty.label, time: '0:00', errors: 0, hints: 0, validations: 0, cell: null });
  updateHistoryButtons();
  for (const cell of cells2d) refreshCellVisual2d(cell);
  refreshDifficultyUI();
}

// ============================================================
// KAKURO MODE
// ============================================================

function refreshCellVisualKakuro(cell) {
  const key = `${cell.r},${cell.c}`;
  const isSel = selectedKakuro === cell;
  const isConflict = currentDifficulty.liveValidation && conflictsKakuro.has(key);
  setCellVisualKakuro(cell, kakuroGrid[cell.r][cell.c], isSel, isConflict);
}

function recomputeConflictsKakuro() {
  const prev = conflictsKakuro;
  const next = computeConflictsKakuro(kakuroGrid, kakuroRuns);
  const changed = new Set([...prev, ...next].filter(k => prev.has(k) !== next.has(k)));
  conflictsKakuro = next;
  for (const k of changed) {
    const cell = kakuroCellsByKey?.get(k);
    if (cell) refreshCellVisualKakuro(cell);
  }
}

function selectKakuroCell(cell) {
  if (finished) return;
  const prev = selectedKakuro;
  if (prev) refreshCellVisualKakuro(prev);
  selectedKakuro = cell;
  refreshCellVisualKakuro(cell);
  sfxSelect();
  hapticLight();
}

function applyValueKakuro(r, c, value, recordHistory = true) {
  const prev = kakuroGrid[r][c];
  if (prev === value) return;
  kakuroGrid[r][c] = value;
  if (recordHistory) {
    history.push({ r, c, prev, next: value });
    updateHistoryButtons();
    scheduleSaveState();
  }
  recomputeConflictsKakuro();
  const cell = kakuroCellsByKey?.get(`${r},${c}`);
  if (cell) refreshCellVisualKakuro(cell);
  if (recordHistory) checkVictoryKakuro();
}

function placeValueKakuro(value) {
  if (finished || !selectedKakuro) return;
  const { r, c } = selectedKakuro;
  applyValueKakuro(r, c, value, true);
}

function checkVictoryKakuro() {
  if (!isCompleteKakuro(kakuroGrid, kakuroWhiteCells)) return;
  if (conflictsKakuro.size > 0) return;
  finished = true;
  clearTimeout(saveStateTimer);
  deleteGame('kakuro');
  releaseWakeLock();
  timer.stop();
  const seconds = timer.getSeconds();
  const today = new Date().toISOString().slice(0, 10);
  const score = computeScore({ diffId: currentDifficulty.id, elapsedSeconds: seconds, errors, hints: hintsUsed, validations: validationsUsed, n: 9 });
  const result = recordCompletion({ diffId: currentDifficulty.id, seconds, score });
  addToRanking('kakuro', { seconds, score, date: today, diffId: currentDifficulty.id });
  const streak = updateStreak();
  addGameHistory({ diffId: currentDifficulty.id, size: 9, seconds, score, errors, date: today });

  sfxVictory();
  hapticVictory();
  setTimeout(() => {
    showVictory({
      diffId: currentDifficulty.id,
      sizeLabel: 'Kakuro',
      seconds,
      errors,
      score,
      bestTime: result.bestTime,
      bestScore: result.bestScore,
      newBestTime: result.newBestTime,
      newBestScore: result.newBestScore,
      unlockedNext: result.unlockedNext,
      streak,
      onNewPuzzle: startNewPuzzleKakuro, onGoHome: showHomeScreen,
    });
    refreshDifficultyUI();
  }, 300);
}

async function restoreStateKakuro(state) {
  const diffEntry = DIFFICULTIES[state.diffId];
  if (!diffEntry) return false;
  currentDifficulty = diffEntry;
  setMode('kakuro');

  kakuroTemplate     = state.template;
  kakuroSolution     = state.solution;
  kakuroRuns         = state.runs;
  kakuroWhiteCells   = state.whiteCells;
  kakuroCellRunIndex = state.cellRunIndex;
  kakuroGrid         = state.grid;
  conflictsKakuro    = new Set();
  selectedKakuro     = null;

  const rightClues = new Map();
  const downClues  = new Map();
  for (const run of kakuroRuns) {
    const key = `${run.clueCell.r},${run.clueCell.c}`;
    if (run.isHorizontal) rightClues.set(key, run.clue);
    else downClues.set(key, run.clue);
  }

  if (!kakuroGeneratorWorker) initKakuroGeneratorWorker();

  const boardResult = createKakuroBoard(kakuroTemplate, rightClues, downClues, selectKakuroCell);
  kakuroCells      = boardResult.whiteCells;
  kakuroCellsByKey = boardResult.byKey;

  history = createHistory();
  finished = false;
  errors = state.errors || 0;
  hintsUsed = state.hintsUsed || 0;
  validationsUsed = state.validationsUsed || 0;

  timer.resetTo(state.seconds || 0);
  timer.start();
  requestWakeLock();

  setTheme('zenPaper');
  applyBloomTheme(bloom, getTheme());
  setAccent(getTheme().accent);

  rebuildNumberPad(9);
  bindNumberButtons(placeValue);

  document.querySelectorAll('.size-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.s === 'kakuro');
  });

  setInfo({
    level: currentDifficulty.label,
    time: formatTime(state.seconds || 0),
    errors,
    hints: hintsUsed,
    validations: validationsUsed,
    cell: null,
  });
  updateHistoryButtons();
  recomputeConflictsKakuro();
  for (const cell of kakuroCells) refreshCellVisualKakuro(cell);
  refreshDifficultyUI();
  return true;
}

async function startNewPuzzleKakuro() {
  await showInterstitialBetweenGames();
  deleteGame('kakuro');
  if (!kakuroGeneratorWorker) initKakuroGeneratorWorker();

  showLoading(true);
  const id = ++generationIdKakuro;
  const puzzle = await new Promise(resolve => {
    kakuroGeneratorWorker.onmessage = e => {
      if (generationIdKakuro === id) resolve(e.data);
    };
    kakuroGeneratorWorker.postMessage({ difficulty: currentDifficulty.id });
  });
  if (generationIdKakuro !== id) return;
  showLoading(false);

  kakuroTemplate   = puzzle.template;
  kakuroSolution   = puzzle.solution;
  kakuroRuns       = puzzle.runs;
  kakuroWhiteCells = puzzle.whiteCells;
  kakuroCellRunIndex = puzzle.cellRunIndex;

  kakuroGrid = kakuroTemplate.map(row => row.map(v => (v === 1 ? 0 : -1)));
  conflictsKakuro = new Set();
  selectedKakuro = null;

  const boardResult = createKakuroBoard(kakuroTemplate, puzzle.rightClues, puzzle.downClues, selectKakuroCell);
  kakuroCells = boardResult.whiteCells;
  kakuroCellsByKey = boardResult.byKey;

  history = createHistory();
  finished = false;
  errors = 0;
  hintsUsed = 0;
  validationsUsed = 0;

  if (noteMode) {
    noteMode = false;
    const btn = document.getElementById('btn-notes');
    btn.classList.remove('active');
    btn.setAttribute('aria-pressed', 'false');
  }

  timer.reset();
  timer.start();
  requestWakeLock();

  setTheme('zenPaper');
  applyBloomTheme(bloom, getTheme());
  setAccent(getTheme().accent);

  rebuildNumberPad(9);
  bindNumberButtons(placeValue);

  document.querySelectorAll('.size-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.s === 'kakuro');
  });

  setInfo({ level: currentDifficulty.label, time: '0:00', errors: 0, hints: 0, validations: 0, cell: null });
  updateHistoryButtons();
  for (const cell of kakuroCells) refreshCellVisualKakuro(cell);
  refreshDifficultyUI();
}

// ============================================================
// FUTOSHIKI MODE
// ============================================================

function refreshCellVisualFutoshiki(cell) {
  const { r, c } = cell;
  const k = key2d(r, c);
  const isSel     = selectedFutoshiki === cell;
  const isConflict = currentDifficulty.liveValidation && conflictsFutoshiki.has(k);
  const isHl      = !isSel && selectedHlFutoshiki.has(k);
  const isFixed   = !!futoshikiFixed[r][c];
  const cn = (!isFixed && futoshikiGrid[r][c] === 0) ? notesFutoshiki[r][c] : null;
  setCellVisualFutoshiki(cell, futoshikiGrid[r][c], isFixed, isSel, isConflict, cn, futoshikiN, isHl);
}

function recomputeConflictsFutoshiki() {
  const prev = conflictsFutoshiki;
  const next = computeConflictsFutoshiki(futoshikiGrid, futoshikiN, futoshikiHIneq, futoshikiVIneq);
  const changed = new Set([...prev, ...next].filter(k => prev.has(k) !== next.has(k)));
  conflictsFutoshiki = next;
  for (const k of changed) {
    const cell = futoshikiCellsByKey?.get(k);
    if (cell) refreshCellVisualFutoshiki(cell);
  }
}

function selectFutoshikiCell(cell) {
  if (finished) return;
  const prev = selectedFutoshiki;
  if (prev) {
    const oldHl = selectedHlFutoshiki;
    selectedHlFutoshiki = new Set();
    for (const k of oldHl) {
      const c2 = futoshikiCellsByKey.get(k);
      if (c2) refreshCellVisualFutoshiki(c2);
    }
    refreshCellVisualFutoshiki(prev);
  }
  selectedFutoshiki = cell;
  selectedHlFutoshiki = getHighlightFutoshiki(cell.r, cell.c, futoshikiN);
  for (const k of selectedHlFutoshiki) {
    const c2 = futoshikiCellsByKey.get(k);
    if (c2) refreshCellVisualFutoshiki(c2);
  }
  refreshCellVisualFutoshiki(cell);
  sfxSelect();
  hapticLight();
}

function applyValueFutoshiki(r, c, value, recordHistory = true) {
  if (futoshikiFixed[r][c]) return;
  const prev = futoshikiGrid[r][c];
  if (prev === value) return;
  futoshikiGrid[r][c] = value;
  if (recordHistory) {
    history.push({ r, c, prev, next: value });
    updateHistoryButtons();
    const correct = value !== 0 && futoshikiSolution && value === futoshikiSolution[r][c];
    if (value !== 0 && !correct) {
      errors++;
      setInfo({ errors });
      sfxPlace();
      hapticMedium();
    } else if (value !== 0) {
      sfxPlace();
      hapticMedium();
      notesFutoshiki[r][c].clear();
    }
    scheduleSaveState();
  }
  recomputeConflictsFutoshiki();
  const cell = futoshikiCellsByKey?.get(key2d(r, c));
  if (cell) refreshCellVisualFutoshiki(cell);
  if (recordHistory) checkVictoryFutoshiki();
}

function placeValueFutoshiki(value) {
  if (finished || !selectedFutoshiki) return;
  const { r, c } = selectedFutoshiki;
  if (noteMode && !futoshikiFixed[r][c] && futoshikiGrid[r][c] === 0) {
    if (value === 0) { notesFutoshiki[r][c].clear(); }
    else if (value <= futoshikiN) {
      if (notesFutoshiki[r][c].has(value)) notesFutoshiki[r][c].delete(value);
      else notesFutoshiki[r][c].add(value);
    }
    refreshCellVisualFutoshiki(selectedFutoshiki);
    return;
  }
  if (value === 0) { sfxErase(); applyValueFutoshiki(r, c, 0, true); return; }
  if (value > futoshikiN) return;
  applyValueFutoshiki(r, c, value, true);
}

function checkVictoryFutoshiki() {
  if (!isCompleteFutoshiki(futoshikiGrid, futoshikiN)) return;
  if (conflictsFutoshiki.size > 0) return;
  finished = true;
  clearTimeout(saveStateTimer);
  deleteGame('futoshiki');
  releaseWakeLock();
  timer.stop();
  const seconds = timer.getSeconds();
  const today = new Date().toISOString().slice(0, 10);
  const n = futoshikiN;
  const score = computeScore({ diffId: currentDifficulty.id, elapsedSeconds: seconds, errors, hints: hintsUsed, validations: validationsUsed, n });
  const result = recordCompletion({ diffId: currentDifficulty.id, seconds, score });
  addToRanking('futoshiki', { seconds, score, date: today, diffId: currentDifficulty.id });
  const streak = updateStreak();
  addGameHistory({ diffId: currentDifficulty.id, size: n, seconds, score, errors, date: today });

  sfxVictory();
  hapticVictory();
  setTimeout(() => {
    showVictory({
      diffId: currentDifficulty.id,
      sizeLabel: `Futoshiki ${n}×${n}`,
      seconds,
      errors,
      score,
      bestTime: result.bestTime,
      bestScore: result.bestScore,
      newBestTime: result.newBestTime,
      newBestScore: result.newBestScore,
      unlockedNext: result.unlockedNext,
      streak,
      onNewPuzzle: startNewPuzzleFutoshiki, onGoHome: showHomeScreen,
    });
    refreshDifficultyUI();
  }, 300);
}

async function startNewPuzzleFutoshiki() {
  await showInterstitialBetweenGames();
  deleteGame('futoshiki');
  if (!futoshikiGeneratorWorker) initFutoshikiGeneratorWorker();

  showLoading(true);
  const id = ++generationIdFutoshiki;
  const puzzle = await new Promise(resolve => {
    futoshikiGeneratorWorker.onmessage = e => {
      if (generationIdFutoshiki === id) resolve(e.data);
    };
    futoshikiGeneratorWorker.postMessage({ difficulty: currentDifficulty.id });
  });
  if (generationIdFutoshiki !== id) return;
  showLoading(false);

  futoshikiN        = puzzle.n;
  futoshikiSolution = puzzle.solution;
  futoshikiFixed    = puzzle.fixed;
  futoshikiGrid     = puzzle.grid;
  futoshikiHIneq    = puzzle.hIneq;
  futoshikiVIneq    = puzzle.vIneq;

  notesFutoshiki = createNotesFutoshiki(futoshikiN);
  conflictsFutoshiki = new Set();
  selectedFutoshiki = null;
  selectedHlFutoshiki = new Set();

  const boardResult = createFutoshikiBoard(futoshikiN, futoshikiHIneq, futoshikiVIneq, selectFutoshikiCell);
  futoshikiCells    = boardResult.cells;
  futoshikiCellsByKey = boardResult.byKey;

  history = createHistory();
  finished = false;
  errors = 0;
  hintsUsed = 0;
  validationsUsed = 0;

  if (noteMode) {
    noteMode = false;
    const btn = document.getElementById('btn-notes');
    btn.classList.remove('active');
    btn.setAttribute('aria-pressed', 'false');
  }

  timer.reset();
  timer.start();
  requestWakeLock();

  setTheme('zenPaper');
  applyBloomTheme(bloom, getTheme());
  setAccent(getTheme().accent);

  rebuildNumberPad(futoshikiN);
  bindNumberButtons(placeValue);

  document.querySelectorAll('.size-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.s === 'futoshiki');
  });

  setInfo({ level: currentDifficulty.label, time: '0:00', errors: 0, hints: 0, validations: 0, cell: null });
  updateHistoryButtons();
  for (const cell of futoshikiCells) refreshCellVisualFutoshiki(cell);
  refreshDifficultyUI();
}

async function restoreStateFutoshiki(state) {
  const diffEntry = DIFFICULTIES[state.diffId];
  if (!diffEntry) return false;
  currentDifficulty = diffEntry;
  setMode('futoshiki');

  futoshikiN        = state.n;
  futoshikiSolution = state.solution;
  futoshikiFixed    = state.fixed;
  futoshikiGrid     = state.grid;
  futoshikiHIneq    = new Map(state.hIneq);
  futoshikiVIneq    = new Map(state.vIneq);

  notesFutoshiki = createNotesFutoshiki(futoshikiN);
  if (state.notes) {
    for (let r = 0; r < futoshikiN; r++)
      for (let c = 0; c < futoshikiN; c++)
        for (const v of (state.notes[r]?.[c] || []))
          notesFutoshiki[r][c].add(v);
  }

  conflictsFutoshiki = computeConflictsFutoshiki(futoshikiGrid, futoshikiN, futoshikiHIneq, futoshikiVIneq);
  selectedFutoshiki = null;
  selectedHlFutoshiki = new Set();

  if (!futoshikiGeneratorWorker) initFutoshikiGeneratorWorker();

  const boardResult = createFutoshikiBoard(futoshikiN, futoshikiHIneq, futoshikiVIneq, selectFutoshikiCell);
  futoshikiCells    = boardResult.cells;
  futoshikiCellsByKey = boardResult.byKey;

  history = createHistory();
  finished = false;
  errors = state.errors || 0;
  hintsUsed = state.hintsUsed || 0;
  validationsUsed = state.validationsUsed || 0;

  timer.resetTo(state.seconds || 0);
  timer.start();

  setTheme('zenPaper');
  applyBloomTheme(bloom, getTheme());
  setAccent(getTheme().accent);

  rebuildNumberPad(futoshikiN);
  bindNumberButtons(placeValue);

  document.querySelectorAll('.size-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.s === 'futoshiki');
  });

  setInfo({
    level: currentDifficulty.label,
    time: formatTime(state.seconds || 0),
    errors,
    hints: hintsUsed,
    validations: validationsUsed,
    cell: null,
  });
  updateHistoryButtons();
  for (const cell of futoshikiCells) refreshCellVisualFutoshiki(cell);
  refreshDifficultyUI();
  return true;
}

// ============================================================
// BINAIRO
// ============================================================

function getHighlightBinairo(r, c, n) {
  const s = new Set();
  for (let i = 0; i < n; i++) {
    if (i !== c) s.add(key2d(r, i));
    if (i !== r) s.add(key2d(i, c));
  }
  return s;
}

function refreshCellVisualBinairo(cell) {
  const { r, c } = cell;
  const k = key2d(r, c);
  const isSel = selectedBinairo === cell;
  const isConflict = conflictsBinairo.has(k);
  const isHl = !isSel && selectedHlBinairo.has(k);
  const isFixed = !!binairoFixed[r][c];
  setCellVisualBinairo(cell, binairoGrid[r][c], isFixed, isSel, isConflict, isHl);
}

function recomputeConflictsBinairo() {
  const prev = conflictsBinairo;
  const next = computeConflictsBinairo(binairoGrid, binairoN);
  const changed = new Set([...prev, ...next].filter(k => prev.has(k) !== next.has(k)));
  conflictsBinairo = next;
  for (const k of changed) {
    const cell = binairoCellsByKey?.get(k);
    if (cell) refreshCellVisualBinairo(cell);
  }
}

function selectBinairoCell(cell) {
  if (finished) return;
  const prev = selectedBinairo;
  if (prev) {
    const oldHl = selectedHlBinairo;
    selectedHlBinairo = new Set();
    for (const k of oldHl) { const c2 = binairoCellsByKey.get(k); if (c2) refreshCellVisualBinairo(c2); }
    refreshCellVisualBinairo(prev);
  }
  selectedBinairo = cell;
  selectedHlBinairo = getHighlightBinairo(cell.r, cell.c, binairoN);
  for (const k of selectedHlBinairo) { const c2 = binairoCellsByKey.get(k); if (c2) refreshCellVisualBinairo(c2); }
  refreshCellVisualBinairo(cell);
  sfxSelect();
  hapticLight();
}

function applyValueBinairo(r, c, value, recordHistory = true) {
  if (binairoFixed[r][c]) return;
  const prev = binairoGrid[r][c];
  if (prev === value) return;
  binairoGrid[r][c] = value;
  if (recordHistory) {
    history.push({ r, c, prev, next: value });
    updateHistoryButtons();
    const correct = value !== 0 && binairoSolution && value === binairoSolution[r][c];
    if (value !== 0 && !correct) { errors++; setInfo({ errors }); sfxPlace(); hapticMedium(); }
    else if (value !== 0) { sfxPlace(); hapticMedium(); }
    scheduleSaveState();
  }
  recomputeConflictsBinairo();
  const cell = binairoCellsByKey?.get(key2d(r, c));
  if (cell) refreshCellVisualBinairo(cell);
  if (recordHistory) checkVictoryBinairo();
}

function placeValueBinairo(value) {
  if (finished || !selectedBinairo) return;
  const { r, c } = selectedBinairo;
  if (value === 0) { sfxErase(); applyValueBinairo(r, c, 0, true); return; }
  if (value > 2) return;
  applyValueBinairo(r, c, value, true);
}

function checkVictoryBinairo() {
  if (!isCompleteBinairo(binairoGrid, binairoN)) return;
  if (conflictsBinairo.size > 0) return;
  finished = true;
  clearTimeout(saveStateTimer);
  deleteGame('binairo');
  releaseWakeLock();
  timer.stop();
  const seconds = timer.getSeconds();
  const today = new Date().toISOString().slice(0, 10);
  const n = binairoN;
  const score = computeScore({ diffId: currentDifficulty.id, elapsedSeconds: seconds, errors, hints: hintsUsed, validations: validationsUsed, n });
  const result = recordCompletion({ diffId: currentDifficulty.id, seconds, score });
  addToRanking('binairo', { seconds, score, date: today, diffId: currentDifficulty.id });
  const streak = updateStreak();
  addGameHistory({ diffId: currentDifficulty.id, size: n, seconds, score, errors, date: today });
  sfxVictory();
  hapticVictory();
  setTimeout(() => {
    showVictory({
      diffId: currentDifficulty.id,
      sizeLabel: `Takuzu ${n}×${n}`,
      seconds, errors, score,
      bestTime: result.bestTime, bestScore: result.bestScore,
      newBestTime: result.newBestTime, newBestScore: result.newBestScore,
      unlockedNext: result.unlockedNext, streak,
      onNewPuzzle: startNewPuzzleBinairo, onGoHome: showHomeScreen,
    });
    refreshDifficultyUI();
  }, 300);
}

function rebuildBinairoPad() {
  rebuildNumberPad(2);
  const pad = document.getElementById('pad');
  const b1 = pad.querySelector('[data-n="1"]'); if (b1) b1.textContent = '0';
  const b2 = pad.querySelector('[data-n="2"]'); if (b2) b2.textContent = '1';
}

async function startNewPuzzleBinairo() {
  await showInterstitialBetweenGames();
  deleteGame('binairo');
  if (!binairoGeneratorWorker) initBinairoGeneratorWorker();
  showLoading(true);
  const id = ++generationIdBinairo;
  const puzzle = await new Promise(resolve => {
    binairoGeneratorWorker.onmessage = e => { if (generationIdBinairo === id) resolve(e.data); };
    binairoGeneratorWorker.postMessage({ difficulty: currentDifficulty.id });
  });
  if (generationIdBinairo !== id) return;
  showLoading(false);

  binairoN        = puzzle.n;
  binairoSolution = puzzle.solution;
  binairoFixed    = puzzle.fixed;
  binairoGrid     = puzzle.grid;
  conflictsBinairo = new Set();
  selectedBinairo = null;
  selectedHlBinairo = new Set();

  const boardResult = createBinairoBoard(binairoN, selectBinairoCell);
  binairoCells    = boardResult.cells;
  binairoCellsByKey = boardResult.byKey;

  history = createHistory();
  finished = false;
  errors = 0; hintsUsed = 0; validationsUsed = 0;

  if (noteMode) {
    noteMode = false;
    const btn = document.getElementById('btn-notes');
    btn.classList.remove('active');
    btn.setAttribute('aria-pressed', 'false');
  }

  timer.reset(); timer.start();
  requestWakeLock();

  setTheme('zenPaper');
  applyBloomTheme(bloom, getTheme());
  setAccent(getTheme().accent);

  rebuildBinairoPad();
  bindNumberButtons(placeValue);

  document.querySelectorAll('.size-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.s === 'binairo');
  });
  setInfo({ level: currentDifficulty.label, time: '0:00', errors: 0, hints: 0, validations: 0, cell: null });
  updateHistoryButtons();
  for (const cell of binairoCells) refreshCellVisualBinairo(cell);
  refreshDifficultyUI();
}

async function restoreStateBinairo(state) {
  const diffEntry = DIFFICULTIES[state.diffId];
  if (!diffEntry) return false;
  currentDifficulty = diffEntry;
  setMode('binairo');

  binairoN        = state.n;
  binairoSolution = state.solution;
  binairoFixed    = state.fixed;
  binairoGrid     = state.grid;
  conflictsBinairo = computeConflictsBinairo(binairoGrid, binairoN);
  selectedBinairo = null;
  selectedHlBinairo = new Set();

  if (!binairoGeneratorWorker) initBinairoGeneratorWorker();

  const boardResult = createBinairoBoard(binairoN, selectBinairoCell);
  binairoCells    = boardResult.cells;
  binairoCellsByKey = boardResult.byKey;

  history = createHistory();
  finished = false;
  errors = state.errors || 0; hintsUsed = state.hintsUsed || 0; validationsUsed = state.validationsUsed || 0;

  timer.resetTo(state.seconds || 0); timer.start();

  setTheme('zenPaper');
  applyBloomTheme(bloom, getTheme());
  setAccent(getTheme().accent);

  rebuildBinairoPad();
  bindNumberButtons(placeValue);

  document.querySelectorAll('.size-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.s === 'binairo');
  });
  setInfo({
    level: currentDifficulty.label,
    time: formatTime(state.seconds || 0),
    errors, hints: hintsUsed, validations: validationsUsed, cell: null,
  });
  updateHistoryButtons();
  for (const cell of binairoCells) refreshCellVisualBinairo(cell);
  refreshDifficultyUI();
  return true;
}

// ============================================================

function getLineKeys(x, y, z) {
  const s = new Set();
  for (let i = 0; i < N; i++) {
    if (i !== x) s.add(key(i, y, z));
    if (i !== y) s.add(key(x, i, z));
    if (i !== z) s.add(key(x, y, i));
  }
  return s;
}

function refreshDifficultyUI() {
  const p = getProgress();
  renderDifficultyButtons({
    current: currentDifficulty.id,
    unlocked: getEffectiveUnlocked(),
    completed: p.completed,
    onPick: id => {
      currentDifficulty = DIFFICULTIES[id];
      setLastDifficulty(id);
      setTheme('zenPaper');
      applyBloomTheme(bloom, getTheme());
      setAccent(getTheme().accent);
      if (mode === 'binairo') startNewPuzzleBinairo();
      else if (mode === 'futoshiki') startNewPuzzleFutoshiki();
      else if (mode === 'kakuro') startNewPuzzleKakuro();
      else if (mode === '2d') startNewPuzzle2d();
      else startNewPuzzle();
    },
  });
}

async function startNewPuzzle() {
  await showInterstitialBetweenGames();
  deleteGame('3d');
  setN(currentSize);
  updateAxesHelper(axesHelper, getOffset());
  resetCameraForOffset(camera, controls, getOffset());
  const targetClues = getClues(currentDifficulty.id, currentSize);

  let puzzle = null;
  if (!currentSeed) {
    puzzle = await popCachedPuzzle(currentDifficulty.id, currentSize);
  }

  if (!puzzle) {
    showLoading(true);
    const id = ++generationId;
    puzzle = await new Promise(resolve => {
      generatorWorker.onmessage = (e) => {
        if (generationId === id) resolve(e.data);
      };
      generatorWorker.postMessage({ targetClues, seed: currentSeed ?? undefined, n: currentSize });
    });
    if (generationId !== id) return;
    showLoading(false);
  }

  if (cells) clearCells(scene, cells);
  currentSeed = puzzle.seed;
  grid = puzzle.grid;
  fixed = puzzle.fixed;
  solution = puzzle.solution;
  cells = createCells(scene, { grid, fixed });
  cellByCoord = new Map();
  for (const c of cells) cellByCoord.set(key(c.x, c.y, c.z), c);
  selected = null;
  selectedLineKeys = new Set();
  conflicts = computeConflicts(grid);
  notes = createNotes();
  completedLines = seedCompletedLines();
  history = createHistory();
  finished = false;
  errors = 0;
  hintsUsed = 0;
  validationsUsed = 0;
  controls.autoRotate = false;
  if (noteMode) {
    noteMode = false;
    const notesBtn = document.getElementById('btn-notes');
    notesBtn.classList.remove('active');
    notesBtn.setAttribute('aria-pressed', 'false');
  }
  timer.reset();
  timer.start();
  requestWakeLock();
  setInfo({
    level: currentDifficulty.label,
    time: '0:00',
    errors: 0,
    hints: 0,
    validations: 0,
    cell: null,
  });
  updateHistoryButtons();
  if (slicer) slicer.reset();
  updateProgress3d();
  refreshDifficultyUI();
  setTimeout(preGeneratePuzzles, 1000);
}

function seedCompletedLines() {
  const set = new Set();
  for (let a = 0; a < N; a++) {
    for (let b = 0; b < N; b++) {
      if (isLineComplete('x', a, b)) set.add(lineKey('x', a, b));
      if (isLineComplete('y', a, b)) set.add(lineKey('y', a, b));
      if (isLineComplete('z', a, b)) set.add(lineKey('z', a, b));
    }
  }
  return set;
}

function isLineComplete(axis, a, b) {
  for (let i = 0; i < N; i++) {
    const v =
      axis === 'x' ? grid[i][a][b] :
      axis === 'y' ? grid[a][i][b] :
      grid[a][b][i];
    if (v === 0) return false;
  }
  for (let i = 0; i < N; i++) {
    const k =
      axis === 'x' ? key(i, a, b) :
      axis === 'y' ? key(a, i, b) :
      key(a, b, i);
    if (conflicts.has(k)) return false;
  }
  return true;
}

function getLineCells(axis, a, b) {
  const out = [];
  for (let i = 0; i < N; i++) {
    const k =
      axis === 'x' ? key(i, a, b) :
      axis === 'y' ? key(a, i, b) :
      key(a, b, i);
    out.push(cellByCoord.get(k));
  }
  return out;
}

function updateHistoryButtons() {
  document.getElementById('btn-undo').disabled = !history.canUndo();
  document.getElementById('btn-redo').disabled = !history.canRedo();
}

function refreshCellVisual(cell) {
  const { x, y, z } = cell;
  const showConflict = currentDifficulty.liveValidation && conflicts.has(key(x, y, z));
  const isSel = selected === cell;
  const cn = grid[x][y][z] === 0 ? getNotes(notes, x, y, z) : null;
  const isHighlighted = selectedLineKeys.has(key(x, y, z));
  setCellVisual(cell, grid[x][y][z], fixed[x][y][z], isSel, showConflict, cn, isHighlighted);
}

function recomputeConflicts() {
  const prev = conflicts;
  const next = computeConflicts(grid);
  const changed = new Set();
  for (const k of prev) if (!next.has(k)) changed.add(k);
  for (const k of next) if (!prev.has(k)) changed.add(k);
  conflicts = next;
  for (const k of changed) {
    const cell = cellByCoord.get(k);
    if (cell) refreshCellVisual(cell);
  }
}

function checkLineCascades(x, y, z) {
  const triples = [
    ['x', y, z],
    ['y', x, z],
    ['z', x, y],
  ];
  for (const [axis, a, b] of triples) {
    const lk = lineKey(axis, a, b);
    const isNow = isLineComplete(axis, a, b);
    const wasBefore = completedLines.has(lk);
    if (isNow && !wasBefore) {
      completedLines.add(lk);
      sfxLine();
      if (!reducedMotion) effects.lineCascade(getLineCells(axis, a, b));
    } else if (!isNow && wasBefore) {
      completedLines.delete(lk);
    }
  }
  if (N === 9) checkSubcubeCascade(x, y, z);
}

function checkSubcubeCascade(x, y, z) {
  const sx = Math.floor(x/3)*3, sy = Math.floor(y/3)*3, sz = Math.floor(z/3)*3;
  const ck = `sub:${sx},${sy},${sz}`;
  let complete = true;
  const subcubeCells = [];
  for (let dx = 0; dx < 3 && complete; dx++) {
    for (let dy = 0; dy < 3 && complete; dy++) {
      for (let dz = 0; dz < 3; dz++) {
        const cx = sx+dx, cy = sy+dy, cz = sz+dz;
        if (grid[cx][cy][cz] === 0 || conflicts.has(key(cx, cy, cz))) { complete = false; break; }
        subcubeCells.push(cellByCoord.get(key(cx, cy, cz)));
      }
    }
  }
  const wasBefore = completedLines.has(ck);
  if (complete && !wasBefore) {
    completedLines.add(ck);
    sfxLine();
    if (!reducedMotion) effects.subcubeCascade(subcubeCells);
  } else if (!complete && wasBefore) {
    completedLines.delete(ck);
  }
}

function selectCell(cell) {
  if (finished) return;
  const prev = selected;

  // Refresh old highlighted line cells (removes highlight)
  if (prev) {
    const oldLineKeys = selectedLineKeys;
    selectedLineKeys = new Set();
    for (const k of oldLineKeys) {
      const c = cellByCoord.get(k);
      if (c) refreshCellVisual(c);
    }
    refreshCellVisual(prev);
  }

  selected = cell;
  selectedLineKeys = getLineKeys(cell.x, cell.y, cell.z);

  // Refresh new highlighted line cells (adds highlight)
  for (const k of selectedLineKeys) {
    const c = cellByCoord.get(k);
    if (c) refreshCellVisual(c);
  }
  refreshCellVisual(cell);

  setInfo({ cell: { x: cell.x, y: cell.y, z: cell.z, fixed: fixed[cell.x][cell.y][cell.z] } });
  sfxSelect();
  hapticLight();
}

function selectAt(x, y, z) {
  const cell = cellByCoord.get(key(x, y, z));
  if (cell) selectCell(cell);
}

function applyValue(x, y, z, value, recordHistory = true) {
  if (fixed[x][y][z]) return;
  const prev = grid[x][y][z];
  if (prev === value) return;
  grid[x][y][z] = value;
  if (recordHistory) {
    history.push({ x, y, z, prev, next: value });
    updateHistoryButtons();
    const correct = value !== 0 && solution && value === solution[x][y][z];
    if (value !== 0 && !correct) {
      errors++;
      setInfo({ errors });
      sfxError();
      hapticError();
    } else if (value !== 0) {
      sfxPlace();
      hapticMedium();
    }
    if (value !== 0) clearNotes(notes, x, y, z);
    const cell = cellByCoord.get(key(x, y, z));
    if (value !== 0 && !reducedMotion) effects.flash(cell, { correct });
  }
  const cell = cellByCoord.get(key(x, y, z));
  recomputeConflicts();
  refreshCellVisual(cell);
  if (recordHistory) checkLineCascades(x, y, z);
  if (recordHistory) scheduleSaveState();
  checkVictory();
  updateProgress3d();
}

function updateProgress3d() {
  const total = N * N * N;
  let filled = 0;
  for (let x = 0; x < N; x++)
    for (let y = 0; y < N; y++)
      for (let z = 0; z < N; z++)
        if (grid[x][y][z] !== 0) filled++;
  setProgress(filled, total);
  updateSliceBadges(grid, N);
}

function placeValue(value) {
  if (mode === 'binairo') { placeValueBinairo(value); return; }
  if (mode === 'futoshiki') { placeValueFutoshiki(value); return; }
  if (mode === 'kakuro') { placeValueKakuro(value); return; }
  if (mode === '2d') { placeValue2d(value); return; }
  if (finished || !selected) return;
  if (value !== 0 && value > N) return;
  const { x, y, z } = selected;
  if (noteMode && !fixed[x][y][z] && grid[x][y][z] === 0) {
    if (value === 0) { clearNotes(notes, x, y, z); }
    else { toggleNote(notes, x, y, z, value); }
    refreshCellVisual(selected);
    return;
  }
  if (value === 0) sfxErase();
  applyValue(x, y, z, value, true);
}

function undo() {
  const m = history.undo();
  if (!m) return;
  if (mode === 'binairo') {
    binairoGrid[m.r][m.c] = m.prev;
    recomputeConflictsBinairo();
    const cell = binairoCellsByKey?.get(key2d(m.r, m.c));
    if (cell) refreshCellVisualBinairo(cell);
  } else if (mode === 'futoshiki') {
    futoshikiGrid[m.r][m.c] = m.prev;
    recomputeConflictsFutoshiki();
    const cell = futoshikiCellsByKey?.get(key2d(m.r, m.c));
    if (cell) refreshCellVisualFutoshiki(cell);
  } else if (mode === 'kakuro') {
    kakuroGrid[m.r][m.c] = m.prev;
    recomputeConflictsKakuro();
    const cell = kakuroCellsByKey?.get(`${m.r},${m.c}`);
    if (cell) refreshCellVisualKakuro(cell);
  } else if (mode === '2d') {
    grid2d[m.r][m.c] = m.prev;
    recomputeConflicts2d();
    const cell = cells2dByKey?.get(key2d(m.r, m.c));
    if (cell) refreshCellVisual2d(cell);
  } else {
    grid[m.x][m.y][m.z] = m.prev;
    recomputeConflicts();
    refreshCellVisual(cellByCoord.get(key(m.x, m.y, m.z)));
    completedLines = seedCompletedLines();
    updateProgress3d();
  }
  updateHistoryButtons();
}

function redo() {
  const m = history.redo();
  if (!m) return;
  if (mode === 'binairo') {
    binairoGrid[m.r][m.c] = m.next;
    recomputeConflictsBinairo();
    const cell = binairoCellsByKey?.get(key2d(m.r, m.c));
    if (cell) refreshCellVisualBinairo(cell);
    checkVictoryBinairo();
  } else if (mode === 'futoshiki') {
    futoshikiGrid[m.r][m.c] = m.next;
    recomputeConflictsFutoshiki();
    const cell = futoshikiCellsByKey?.get(key2d(m.r, m.c));
    if (cell) refreshCellVisualFutoshiki(cell);
    checkVictoryFutoshiki();
  } else if (mode === 'kakuro') {
    kakuroGrid[m.r][m.c] = m.next;
    recomputeConflictsKakuro();
    const cell = kakuroCellsByKey?.get(`${m.r},${m.c}`);
    if (cell) refreshCellVisualKakuro(cell);
    checkVictoryKakuro();
  } else if (mode === '2d') {
    grid2d[m.r][m.c] = m.next;
    recomputeConflicts2d();
    const cell = cells2dByKey?.get(key2d(m.r, m.c));
    if (cell) refreshCellVisual2d(cell);
    checkVictory2d();
  } else {
    grid[m.x][m.y][m.z] = m.next;
    recomputeConflicts();
    refreshCellVisual(cellByCoord.get(key(m.x, m.y, m.z)));
    completedLines = seedCompletedLines();
    checkVictory();
    updateProgress3d();
  }
  updateHistoryButtons();
}

function useHint() {
  if (mode === 'binairo') {
    if (finished || !binairoSolution || !binairoCells) return;
    const empty = binairoCells.filter(c => !binairoFixed[c.r][c.c] && binairoGrid[c.r][c.c] === 0);
    if (!empty.length) return;
    const cell = empty[Math.floor(Math.random() * empty.length)];
    applyValueBinairo(cell.r, cell.c, binairoSolution[cell.r][cell.c], true);
    selectBinairoCell(cell);
    hintsUsed++;
    setInfo({ hints: hintsUsed });
    return;
  }
  if (mode === 'futoshiki') {
    if (finished || !futoshikiSolution || !futoshikiCells) return;
    const empty = futoshikiCells.filter(c => !futoshikiFixed[c.r][c.c] && futoshikiGrid[c.r][c.c] === 0);
    if (!empty.length) return;
    const cell = empty[Math.floor(Math.random() * empty.length)];
    applyValueFutoshiki(cell.r, cell.c, futoshikiSolution[cell.r][cell.c], true);
    selectFutoshikiCell(cell);
    hintsUsed++;
    setInfo({ hints: hintsUsed });
    return;
  }
  if (mode === 'kakuro') {
    if (finished || !kakuroSolution || !kakuroCells) return;
    const empty = kakuroCells.filter(c => kakuroGrid[c.r][c.c] === 0);
    if (!empty.length) return;
    const cell = empty[Math.floor(Math.random() * empty.length)];
    applyValueKakuro(cell.r, cell.c, kakuroSolution[cell.r][cell.c], true);
    selectKakuroCell(cell);
    hintsUsed++;
    setInfo({ hints: hintsUsed });
    return;
  }
  if (mode === '2d') {
    if (finished || !solution2d || !cells2d) return;
    const empty = cells2d.filter(c => !fixed2d[c.r][c.c] && grid2d[c.r][c.c] === 0);
    if (!empty.length) return;
    const cell = empty[Math.floor(Math.random() * empty.length)];
    applyValue2d(cell.r, cell.c, solution2d[cell.r][cell.c], true);
    selectCell2d(cell);
    hintsUsed++;
    setInfo({ hints: hintsUsed });
    return;
  }
  if (finished || !solution) return;
  const empty = cells.filter(c => !fixed[c.x][c.y][c.z] && grid[c.x][c.y][c.z] === 0 && c.mesh.visible);
  if (!empty.length) return;
  const cell = empty[Math.floor(Math.random() * empty.length)];
  applyValue(cell.x, cell.y, cell.z, solution[cell.x][cell.y][cell.z], true);
  selectCell(cell);
  hintsUsed++;
  setInfo({ hints: hintsUsed });
}

function validatePuzzle() {
  if (finished) return;
  validationsUsed++;
  setInfo({ validations: validationsUsed });
  if (mode === 'binairo') {
    if (!binairoCells) return;
    for (const cell of binairoCells) {
      const { r, c } = cell;
      if (!binairoFixed[r][c] && binairoGrid[r][c] !== 0 && binairoSolution && binairoGrid[r][c] !== binairoSolution[r][c]) {
        cell.el.classList.add('bn-cell--conflict');
        setTimeout(() => refreshCellVisualBinairo(cell), 800);
      }
    }
    return;
  }
  if (mode === 'futoshiki') {
    if (!futoshikiCells) return;
    for (const cell of futoshikiCells) {
      const { r, c } = cell;
      if (futoshikiGrid[r][c] !== 0 && futoshikiSolution && futoshikiGrid[r][c] !== futoshikiSolution[r][c]) {
        cell.el.classList.add('ft-cell--conflict');
        setTimeout(() => refreshCellVisualFutoshiki(cell), 800);
      }
    }
    return;
  }
  if (mode === 'kakuro') {
    if (!kakuroCells) return;
    for (const cell of kakuroCells) {
      if (kakuroGrid[cell.r][cell.c] !== 0 && kakuroSolution && kakuroGrid[cell.r][cell.c] !== kakuroSolution[cell.r][cell.c]) {
        cell.el.classList.add('kk-white--conflict');
        setTimeout(() => refreshCellVisualKakuro(cell), 800);
      }
    }
    return;
  }
  if (mode === '2d') {
    if (!cells2d) return;
    for (const cell of cells2d) {
      const { r, c } = cell;
      if (!fixed2d[r][c] && grid2d[r][c] !== 0 && solution2d && grid2d[r][c] !== solution2d[r][c]) {
        cell.el.classList.add('cell2d--conflict');
        setTimeout(() => refreshCellVisual2d(cell), 800);
      }
    }
    return;
  }
  const allConflicts = computeConflicts(grid);
  for (const k of allConflicts) {
    const cell = cellByCoord.get(k);
    if (cell) effects.flash(cell, { correct: false });
  }
}

function setCameraView(idx) {
  const d = getOffset() + 6;
  const positions = [
    [d, 0, 0], [-d, 0, 0],
    [0, d, 0], [0, -d, 0],
    [0, 0, d], [0, 0, -d],
  ];
  const p = positions[idx];
  if (!p) return;
  camera.position.set(p[0], p[1], p[2]);
  controls.target.set(0, 0, 0);
  controls.update();
}

function applyLowQuality() {
  if (reducedQuality) return;
  reducedQuality = true;
  bloom.strength = 0;
}

function applyHighQuality() {
  if (!reducedQuality) return;
  reducedQuality = false;
  applyBloomTheme(bloom, getTheme());
}

async function showStats() {
  const overlay = document.getElementById('stats-overlay');
  const content = document.getElementById('stats-content');
  const progress = getProgress();
  const { streak } = getStreak();
  const history = await getGameHistory();

  const only3d = history.filter(e => !e.mode && (e.size === 3 || e.size === 4 || e.size === 9));
  const totalCompleted = Object.values(progress.completed || {}).reduce((a, b) => a + b, 0);
  const totalSeconds = history.reduce((a, e) => a + (e.seconds || 0), 0);
  const totalMins = Math.floor(totalSeconds / 60);

  function fmt(s) {
    if (s === undefined || s === null) return '—';
    const m = Math.floor(s / 60), ss = s % 60;
    return `${m}:${ss.toString().padStart(2, '0')}`;
  }

  const diffRows = DIFFICULTY_ORDER.map(diffId => {
    const d = DIFFICULTIES[diffId];
    const completed = progress.completed?.[diffId] || 0;
    const bestTime = progress.bestTime?.[diffId];
    const bestScore = progress.bestScore?.[diffId];
    const isUnlocked = (progress.unlocked || []).includes(diffId);
    if (!isUnlocked && !completed) {
      return `<tr><td>${d.label}</td><td class="locked" colspan="3">🔒 locked</td></tr>`;
    }
    return `<tr>
      <td>${d.label}</td>
      <td>${completed}</td>
      <td>${fmt(bestTime)}</td>
      <td>${bestScore ?? '—'}</td>
    </tr>`;
  }).join('');

  const recent = only3d.slice(0, 10);
  let chartHtml = '';
  if (recent.length >= 2) {
    const maxSec = Math.max(...recent.map(e => e.seconds));
    chartHtml = `<div class="stats-section-label">Recent games</div>
      <div class="stats-chart">${
        recent.map(e => {
          const pct = Math.round((e.seconds / maxSec) * 100);
          return `<div class="stats-bar-wrap">
            <div class="stats-bar" style="height:${pct}%" title="${fmt(e.seconds)}"></div>
            <div class="stats-bar-label">${fmt(e.seconds)}</div>
          </div>`;
        }).join('')
      }</div>`;
  }

  content.innerHTML = `
    <div class="stats-section-label">Overview</div>
    <div class="stats-overview">
      <div class="stats-ov-card">
        <div class="stats-ov-label">Puzzles solved</div>
        <div class="stats-ov-val">${totalCompleted}</div>
      </div>
      <div class="stats-ov-card">
        <div class="stats-ov-label">Current streak</div>
        <div class="stats-ov-val">${streak > 0 ? `🔥 ${streak}` : '—'}</div>
      </div>
      <div class="stats-ov-card">
        <div class="stats-ov-label">Time played</div>
        <div class="stats-ov-val">${totalMins > 0 ? `${totalMins}m` : '—'}</div>
      </div>
      <div class="stats-ov-card">
        <div class="stats-ov-label">Games in history</div>
        <div class="stats-ov-val">${history.length}</div>
      </div>
    </div>
    <div class="stats-section-label">By difficulty</div>
    <table class="stats-diff-table">
      <thead><tr>
        <th>Level</th><th>Done</th><th>Best time</th><th>Best score</th>
      </tr></thead>
      <tbody>${diffRows}</tbody>
    </table>
    ${chartHtml}
  `;

  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden', 'false');
}

function generateDailyShareText(seconds, errors, diffId, size, streak) {
  const d = DIFFICULTIES[diffId];
  const now = new Date();
  const date = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
  const errStr = errors === 0 ? 'no errors' : errors === 1 ? '1 error' : `${errors} errors`;
  const streakStr = streak >= 1 ? `\n🔥 ${streak} day${streak > 1 ? 's' : ''} streak` : '';

  let visual = '';
  if (size <= 4 && fixed) {
    const layers = [];
    for (let z = 0; z < size; z++) {
      const rows = [];
      for (let y = 0; y < size; y++) {
        let row = '';
        for (let x = 0; x < size; x++) {
          row += fixed[x][y][z] ? '⬛' : '⬜';
        }
        rows.push(row);
      }
      layers.push(rows.join('\n'));
    }
    visual = '\n\n' + layers.join('\n\n');
  }

  return `Sudoku³ Daily · ${date}\n${size}³ · ${d.label} · ${timeStr} · ${errStr}${visual}${streakStr}`;
}

function checkVictory() {
  if (!isComplete(grid)) return;
  if (conflicts.size > 0) return;
  finished = true;
  clearTimeout(saveStateTimer);
  deleteGame('3d');
  releaseWakeLock();
  timer.stop();
  const seconds = timer.getSeconds();
  const today = new Date().toISOString().slice(0, 10);
  const score = computeScore({ diffId: currentDifficulty.id, elapsedSeconds: seconds, errors, hints: hintsUsed, validations: validationsUsed, n: currentSize });
  const result = recordCompletion({ diffId: currentDifficulty.id, seconds, score });
  addToRanking('3d', { seconds, score, date: today, diffId: currentDifficulty.id });
  const streak = updateStreak();
  addGameHistory({ diffId: currentDifficulty.id, size: currentSize, seconds, score, errors, date: today });

  sfxVictory();
  hapticVictory();

  const isDaily = currentSeed === dateHash();
  const shareBtn = document.getElementById('victory-share');
  if (shareBtn) {
    shareBtn.hidden = !isDaily;
    shareBtn.onclick = null;
    if (isDaily) {
      const shareText = generateDailyShareText(seconds, errors, currentDifficulty.id, currentSize, streak);
      shareBtn.textContent = '⬆ Share result';
      shareBtn.onclick = () => {
        if (navigator.share) {
          navigator.share({ text: shareText }).catch(() => {});
        } else {
          navigator.clipboard.writeText(shareText).then(() => {
            const orig = shareBtn.textContent;
            shareBtn.textContent = '✓ Copied!';
            setTimeout(() => { shareBtn.textContent = orig; }, 2000);
          }).catch(() => prompt('Copy this result:', shareText));
        }
      };
    }
  }

  const doVictory = reducedMotion
    ? (_, cb) => setTimeout(cb, 600)
    : effects.victory.bind(effects);
  doVictory(cells, () => {
    showVictory({
      diffId: currentDifficulty.id,
      size: currentSize,
      seconds,
      errors,
      score,
      bestTime: result.bestTime,
      bestScore: result.bestScore,
      newBestTime: result.newBestTime,
      newBestScore: result.newBestScore,
      unlockedNext: result.unlockedNext,
      streak,
      onNewPuzzle: startNewPuzzle, onGoHome: showHomeScreen,
    });
    refreshDifficultyUI();
  });
}

const initialProgress = getProgress();
currentDifficulty = DIFFICULTIES.beginner;

// Handle URL seed and difficulty params
const params = new URLSearchParams(location.search);
const urlSeed = params.get('seed');
const urlDiff = params.get('diff');
if (urlSeed) currentSeed = parseInt(urlSeed, 10);
if (urlDiff && DIFFICULTIES[urlDiff] && getEffectiveUnlocked().includes(urlDiff)) {
  currentDifficulty = DIFFICULTIES[urlDiff];
}

setTheme('zenPaper');
applyBloomTheme(bloom, getTheme());
setAccent(getTheme().accent);

const settings = getSettings();
reducedMotion = settings.reducedMotion;
setSfxVolume(settings.sfxVolume);
document.getElementById('sfx-vol').value = settings.sfxVolume;
document.getElementById('reduced-motion').checked = settings.reducedMotion;
document.getElementById('hud-scale').value = settings.hudScale;
document.documentElement.style.setProperty('--hud-scale', settings.hudScale);
document.getElementById('high-contrast').checked = settings.highContrast;
document.getElementById('unlock-all').checked = settings.unlockAll;

initCosmos(cosmosCanvas, cosmosTexture, { reducedMotion: settings.reducedMotion });
if (settings.highContrast) {
  setTheme('contrast');
  applyBloomTheme(bloom, getTheme());
  setAccent(getTheme().accent);
}

initWorker();
initPreGenWorker();

bindDifficultyPopover();
bindHelp(() => mode);
bindSettingsPanel();
bindHomeScreen();
bindCameraPresets();

const verEl = document.getElementById('app-version');
if (verEl) verEl.textContent = `v${__APP_VERSION__}`;

// Migra save antic (format vell d'una sola partida) i mostra home
migrateOldSave();
showHomeScreen();
initAds();
initIAP();
// Pre-genera el sudoku 3D per defecte en segon pla mentre la home és visible
startNewPuzzle();

// Onboarding (primera execució)
(function initOnboarding() {
  const OB_KEY = 'sudoku3d.seenOnboarding.v1';
  if (localStorage.getItem(OB_KEY)) return;

  const overlay = document.getElementById('onboarding-overlay');
  const steps = Array.from(document.querySelectorAll('.ob-step'));
  const dots  = Array.from(document.querySelectorAll('.ob-dot'));
  const nextBtn = document.getElementById('ob-next');
  const skipBtn = document.getElementById('ob-skip');
  const NEXT_LABELS = ['Next →', 'Next →', 'Next →', 'Start playing ✓'];
  let current = 0;

  const close = () => {
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    localStorage.setItem(OB_KEY, '1');
  };

  const go = (idx) => {
    steps[current].classList.remove('active');
    dots[current].classList.remove('active');
    current = idx;
    steps[current].classList.add('active');
    dots[current].classList.add('active');
    nextBtn.textContent = NEXT_LABELS[current];
  };

  nextBtn.addEventListener('click', () => {
    if (current < steps.length - 1) go(current + 1);
    else close();
  });
  skipBtn.addEventListener('click', close);

  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden', 'false');
  nextBtn.textContent = NEXT_LABELS[0];
})();

function shareCurrentPuzzle() {
  if (mode === '2d') {
    alert('Sharing is not available in Classic 2D mode.');
    return;
  }
  if (!currentSeed) return;
  const url = new URL(location.href);
  url.searchParams.set('seed', currentSeed);
  url.searchParams.set('diff', currentDifficulty.id);
  url.search = url.searchParams.toString();
  navigator.clipboard.writeText(url.toString()).then(() => {
    const btn = document.getElementById('btn-share');
    const orig = btn.textContent;
    btn.textContent = '✓ Copied!';
    setTimeout(() => btn.textContent = orig, 2000);
  }).catch(() => prompt('Copy this URL:', url.toString()));
}

function startDailyChallenge() {
  if (mode === '2d' || mode === 'kakuro' || mode === 'futoshiki' || mode === 'binairo') {
    setMode('3d');
    document.querySelectorAll('.size-btn').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.s, 10) === currentSize);
    });
    rebuildNumberPad(currentSize);
    bindNumberButtons(placeValue);
    rebuildSliceUI(currentSize);
    slicer = createSlicer({ getCells: () => cells, onChange: slicerOnChange });
  }
  currentSeed = dateHash();
  currentDifficulty = DIFFICULTIES.intermediate;
  if (!getEffectiveUnlocked().includes('intermediate')) currentDifficulty = DIFFICULTIES.beginner;
  setTheme('zenPaper');
  applyBloomTheme(bloom, getTheme());
  setAccent(getTheme().accent);
  document.getElementById('settings-panel').classList.remove('open');
  startNewPuzzle();
}

function openSettingsPanel(fromHome = false) {
  const panel = document.getElementById('settings-panel');
  panel.classList.toggle('open');
  if (panel.classList.contains('open')) {
    panel.classList.toggle('from-home', fromHome);
    const { streak } = getStreak();
    const el = document.getElementById('sett-streak-val');
    if (el) el.textContent = streak === 0 ? '— days' : streak === 1 ? '1 day' : `${streak} days`;
  }
}

function bindSettingsPanel() {
  const btn = document.getElementById('settings-btn');
  const panel = document.getElementById('settings-panel');
  btn.addEventListener('click', e => { e.stopPropagation(); openSettingsPanel(false); });

  const btnHome = document.getElementById('btn-settings-home');
  if (btnHome) btnHome.addEventListener('click', e => { e.stopPropagation(); openSettingsPanel(true); });

  document.addEventListener('click', e => {
    if (!panel.contains(e.target) && e.target !== btn && e.target !== btnHome)
      panel.classList.remove('open');
  });
  document.getElementById('sfx-vol').addEventListener('input', e => {
    const v = parseFloat(e.target.value);
    setSfxVolume(v);
    saveSettings({ ...getSettings(), sfxVolume: v });
  });
  document.getElementById('reduced-motion').addEventListener('change', e => {
    reducedMotion = e.target.checked;
    setCosmosReducedMotion(reducedMotion);
    saveSettings({ ...getSettings(), reducedMotion });
  });
  document.getElementById('unlock-all').addEventListener('change', e => {
    saveSettings({ ...getSettings(), unlockAll: e.target.checked });
    refreshDifficultyUI();
  });
  document.getElementById('btn-solve').addEventListener('click', () => {
    if (finished) return;
    if (mode === 'binairo') {
      if (!binairoSolution) return;
      if (!confirm('Show the solution? This game will not count as a victory.')) return;
      finished = true;
      timer.stop();
      for (let r = 0; r < binairoN; r++)
        for (let c = 0; c < binairoN; c++)
          binairoGrid[r][c] = binairoSolution[r][c];
      conflictsBinairo = new Set();
      if (binairoCells) for (const cell of binairoCells) refreshCellVisualBinairo(cell);
      document.getElementById('settings-panel').classList.remove('open');
      return;
    }
    if (mode === 'futoshiki') {
      if (!futoshikiSolution) return;
      if (!confirm('Show the solution? This game will not count as a victory.')) return;
      finished = true;
      timer.stop();
      for (let r = 0; r < futoshikiN; r++)
        for (let c = 0; c < futoshikiN; c++)
          futoshikiGrid[r][c] = futoshikiSolution[r][c];
      conflictsFutoshiki = new Set();
      if (futoshikiCells) for (const cell of futoshikiCells) refreshCellVisualFutoshiki(cell);
      document.getElementById('settings-panel').classList.remove('open');
      return;
    }
    if (mode === 'kakuro') {
      if (!kakuroSolution) return;
      if (!confirm('Show the solution? This game will not count as a victory.')) return;
      finished = true;
      timer.stop();
      for (const { r, c } of kakuroWhiteCells) kakuroGrid[r][c] = kakuroSolution[r][c];
      conflictsKakuro = new Set();
      if (kakuroCells) for (const cell of kakuroCells) refreshCellVisualKakuro(cell);
      document.getElementById('settings-panel').classList.remove('open');
      return;
    }
    if (mode === '2d') {
      if (!solution2d) return;
      if (!confirm('Show the solution? This game will not count as a victory.')) return;
      finished = true;
      timer.stop();
      for (let r = 0; r < 9; r++)
        for (let c = 0; c < 9; c++)
          if (!fixed2d[r][c]) grid2d[r][c] = solution2d[r][c];
      conflicts2d = new Set();
      if (cells2d) for (const cell of cells2d) refreshCellVisual2d(cell);
      document.getElementById('settings-panel').classList.remove('open');
      return;
    }
    if (!solution) return;
    if (!confirm('Show the solution? This game will not count as a victory.')) return;
    finished = true;
    timer.stop();
    controls.autoRotate = false;
    for (let x = 0; x < N; x++)
      for (let y = 0; y < N; y++)
        for (let z = 0; z < N; z++)
          if (!fixed[x][y][z]) grid[x][y][z] = solution[x][y][z];
    conflicts = new Set();
    for (const c of cells) refreshCellVisual(c);
    document.getElementById('settings-panel').classList.remove('open');
  });

  document.querySelectorAll('.size-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const s = btn.dataset.s;
      if (s === 'binairo') {
        if (mode === 'binairo') return;
        setMode('binairo');
        document.querySelectorAll('.size-btn').forEach(b => b.classList.toggle('active', b === btn));
        currentSeed = null;
        if (!binairoGeneratorWorker) initBinairoGeneratorWorker();
        rebuildBinairoPad();
        bindNumberButtons(placeValue);
        document.getElementById('settings-panel').classList.remove('open');
        startNewPuzzleBinairo();
        return;
      }
      if (s === 'futoshiki') {
        if (mode === 'futoshiki') return;
        setMode('futoshiki');
        document.querySelectorAll('.size-btn').forEach(b => b.classList.toggle('active', b === btn));
        currentSeed = null;
        if (!futoshikiGeneratorWorker) initFutoshikiGeneratorWorker();
        rebuildNumberPad(4);
        bindNumberButtons(placeValue);
        document.getElementById('settings-panel').classList.remove('open');
        startNewPuzzleFutoshiki();
        return;
      }
      if (s === 'kakuro') {
        if (mode === 'kakuro') return;
        setMode('kakuro');
        document.querySelectorAll('.size-btn').forEach(b => b.classList.toggle('active', b === btn));
        currentSeed = null;
        if (!kakuroGeneratorWorker) initKakuroGeneratorWorker();
        rebuildNumberPad(9);
        bindNumberButtons(placeValue);
        document.getElementById('settings-panel').classList.remove('open');
        startNewPuzzleKakuro();
        return;
      }
      if (s === '2d') {
        if (mode === '2d') return;
        setMode('2d');
        document.querySelectorAll('.size-btn').forEach(b => b.classList.toggle('active', b === btn));
        currentSeed = null;
        if (!generator2dWorker) initGenerator2dWorker();
        rebuildNumberPad(9);
        bindNumberButtons(placeValue);
        document.getElementById('settings-panel').classList.remove('open');
        startNewPuzzle2d();
        return;
      }
      const sz = parseInt(s, 10);
      if (mode === '3d' && sz === currentSize) return;
      setMode('3d');
      currentSize = sz;
      document.querySelectorAll('.size-btn').forEach(b => b.classList.toggle('active', b === btn));
      currentSeed = null;
      initWorker();
      rebuildNumberPad(currentSize);
      bindNumberButtons(placeValue);
      rebuildSliceUI(currentSize);
      slicer = createSlicer({ getCells: () => cells, onChange: slicerOnChange });
      document.getElementById('settings-panel').classList.remove('open');
      startNewPuzzle();
    });
  });
  document.getElementById('btn-share').addEventListener('click', shareCurrentPuzzle);
  document.getElementById('btn-daily').addEventListener('click', startDailyChallenge);
  document.getElementById('btn-export').addEventListener('click', () => {
    const blob = new Blob([exportAllData()], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'sudoku3d-data.json'; a.click();
  });
  document.getElementById('btn-import').addEventListener('click', () => document.getElementById('import-file').click());
  document.getElementById('import-file').addEventListener('change', e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try { importAllData(ev.target.result); alert('Data imported. Please reload the page.'); }
      catch { alert('Error importing data.'); }
    };
    reader.readAsText(file);
  });
  document.getElementById('btn-remove-ads').addEventListener('click', () => showPaywall());
  document.getElementById('btn-restore-purchases').addEventListener('click', async () => {
    const restored = await restoreIAPPurchases();
    if (!restored) alert('No previous purchases found.');
  });
  document.getElementById('paywall-close').addEventListener('click', () => closePaywall());
  document.getElementById('paywall-restore').addEventListener('click', async () => {
    const restored = await restoreIAPPurchases();
    if (!restored) alert('No previous purchases found.');
  });

  document.getElementById('btn-reset').addEventListener('click', () => {
    if (confirm('Are you sure? All progress will be erased.')) { resetAllData(); location.reload(); }
  });
  document.getElementById('btn-ranking').addEventListener('click', () => {
    const panel = document.getElementById('settings-panel');
    const fromHome = panel.classList.contains('from-home');
    panel.classList.remove('open');
    showRanking(fromHome ? null : mode);
  });
  document.getElementById('ranking-close').addEventListener('click', () => {
    const overlay = document.getElementById('ranking-overlay');
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
  });
  document.getElementById('ranking-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('ranking-overlay')) {
      document.getElementById('ranking-overlay').classList.remove('open');
      document.getElementById('ranking-overlay').setAttribute('aria-hidden', 'true');
    }
  });

  document.getElementById('btn-stats').addEventListener('click', async () => {
    document.getElementById('settings-panel').classList.remove('open');
    await showStats();
  });
  document.getElementById('stats-close').addEventListener('click', () => {
    const overlay = document.getElementById('stats-overlay');
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
  });
  document.getElementById('stats-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('stats-overlay')) {
      document.getElementById('stats-overlay').classList.remove('open');
      document.getElementById('stats-overlay').setAttribute('aria-hidden', 'true');
    }
  });
  document.getElementById('hud-scale').addEventListener('input', e => {
    const v = parseFloat(e.target.value);
    document.documentElement.style.setProperty('--hud-scale', v);
    saveSettings({ ...getSettings(), hudScale: v });
  });
  document.getElementById('high-contrast').addEventListener('change', e => {
    const on = e.target.checked;
    saveSettings({ ...getSettings(), highContrast: on });
    if (on) {
      setTheme('contrast');
    } else {
      setTheme('zenPaper');
    }
    applyBloomTheme(bloom, getTheme());
    setAccent(getTheme().accent);
    clearTextureCache();
    for (const c of cells) refreshCellVisual(c);
  });
}

function toggleNoteModeUI() {
  if (mode === 'binairo') return;
  noteMode = !noteMode;
  const btn = document.getElementById('btn-notes');
  btn.classList.toggle('active', noteMode);
  btn.setAttribute('aria-pressed', noteMode);
}

function handleToggleMute() {
  const m = audioToggleMute();
  const btn = document.getElementById('btn-mute');
  btn.classList.toggle('muted', m);
  btn.textContent = m ? '♪̸' : '♪';
  btn.title = m ? 'Enable sound (M)' : 'Mute (M)';
}

function slicerOnChange() {
  if (selected && !slicer.isVisible(selected)) {
    const prev = selected;
    selected = null;
    refreshCellVisual(prev);
    setInfo({ cell: null });
  }
}

slicer = createSlicer({ getCells: () => cells, onChange: slicerOnChange });

const visibleCells = () => cells.filter(c => c.mesh.visible);

bindPointerSelection(renderer, camera, visibleCells, selectCell, toggleNoteModeUI, normal => {
  camera.position.copy(normal.clone().multiplyScalar(getOffset() + 6));
  controls.target.set(0, 0, 0);
  controls.update();
});
bindPointerHover(renderer, camera, visibleCells, (prev, next) => {
  if (prev) effects.setHover(prev, false);
  if (next) effects.setHover(next, true);
});
bindNumberButtons(placeValue);
bindButton('btn-new', () => {
  if (mode === 'binairo') startNewPuzzleBinairo();
  else if (mode === 'futoshiki') startNewPuzzleFutoshiki();
  else if (mode === 'kakuro') startNewPuzzleKakuro();
  else if (mode === '2d') startNewPuzzle2d();
  else startNewPuzzle();
});
bindButton('btn-undo', undo);
bindButton('btn-redo', redo);
bindButton('btn-notes', toggleNoteModeUI);
bindButton('btn-mute', handleToggleMute);
bindKeyboard({
  getSelected: () => selected,
  selectAt,
  placeValue,
  undo,
  redo,
  toggleNoteMode: toggleNoteModeUI,
  toggleMute: handleToggleMute,
  onHint: () => showRewardedForHint(useHint),
  onValidate: validatePuzzle,
  onCameraView: setCameraView,
});

document.getElementById('chip-hints').addEventListener('click', () => showRewardedForHint(useHint));

// Futoshiki arrow-key navigation
addEventListener('keydown', e => {
  if (mode !== 'futoshiki') return;
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (!selectedFutoshiki) return;
  let { r, c } = selectedFutoshiki;
  const n = futoshikiN;
  let moved = false;
  switch (e.key) {
    case 'ArrowRight': c = (c + 1) % n; moved = true; break;
    case 'ArrowLeft':  c = (c - 1 + n) % n; moved = true; break;
    case 'ArrowDown':  r = (r + 1) % n; moved = true; break;
    case 'ArrowUp':    r = (r - 1 + n) % n; moved = true; break;
  }
  if (moved) {
    e.preventDefault();
    const cell = futoshikiCellsByKey?.get(key2d(r, c));
    if (cell) selectFutoshikiCell(cell);
  }
});

// Binairo arrow-key navigation
addEventListener('keydown', e => {
  if (mode !== 'binairo') return;
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (!selectedBinairo) return;
  let { r, c } = selectedBinairo;
  const n = binairoN;
  let moved = false;
  switch (e.key) {
    case 'ArrowRight': c = (c + 1) % n; moved = true; break;
    case 'ArrowLeft':  c = (c - 1 + n) % n; moved = true; break;
    case 'ArrowDown':  r = (r + 1) % n; moved = true; break;
    case 'ArrowUp':    r = (r - 1 + n) % n; moved = true; break;
  }
  if (moved) {
    e.preventDefault();
    const cell = binairoCellsByKey?.get(key2d(r, c));
    if (cell) selectBinairoCell(cell);
  }
});

// 2D arrow-key navigation (separate listener so it doesn't interfere with 3D)
addEventListener('keydown', e => {
  if (mode !== '2d') return;
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (!selected2d) return;
  let { r, c } = selected2d;
  let moved = false;
  switch (e.key) {
    case 'ArrowRight': c = (c + 1) % 9; moved = true; break;
    case 'ArrowLeft':  c = (c - 1 + 9) % 9; moved = true; break;
    case 'ArrowDown':  r = (r + 1) % 9; moved = true; break;
    case 'ArrowUp':    r = (r - 1 + 9) % 9; moved = true; break;
  }
  if (moved) {
    e.preventDefault();
    const cell = cells2dByKey?.get(key2d(r, c));
    if (cell) selectCell2d(cell);
  }
});

bindBottomSwipe(() => {
  document.getElementById('settings-panel').classList.toggle('open');
});

// ── Home screen ─────────────────────────────────────────────

const GAME_NAMES = { '3d': 'Sudoku 3D', '2d': 'Sudoku 2D', kakuro: 'Kakuro', futoshiki: 'Futoshiki', binairo: 'Takuzu' };

function isGameInProgress() {
  if (mode === 'futoshiki') return !!(futoshikiGrid && futoshikiFixed);
  if (mode === 'binairo')   return !!(binairoGrid && binairoFixed);
  if (mode === 'kakuro')    return !!(kakuroGrid && kakuroTemplate);
  if (mode === '2d')        return !!(grid2d && fixed2d);
  return !!(grid && fixed);
}

function openExitDialog() {
  const dlg = document.getElementById('exit-dialog');
  if (!dlg) return;
  dlg.classList.add('open');
  dlg.setAttribute('aria-hidden', 'false');
}

function closeExitDialog() {
  const dlg = document.getElementById('exit-dialog');
  if (!dlg) return;
  dlg.classList.remove('open');
  dlg.setAttribute('aria-hidden', 'true');
}

const GAME_ICONS = { '3d': '🧊', '2d': '🔢', kakuro: '➕', futoshiki: '⚖️', binairo: '⬛' };

let saveToastTimer = null;
function showSaveToast() {
  const t = document.getElementById('save-toast');
  if (!t) return;
  clearTimeout(saveToastTimer);
  t.classList.add('visible');
  saveToastTimer = setTimeout(() => t.classList.remove('visible'), 2500);
}

function renderSavesModal() {
  const list = document.getElementById('saves-list');
  const emptyMsg = document.getElementById('saves-empty-msg');
  if (!list) return;
  const saves = getAllSavedGames();
  list.innerHTML = '';
  if (!saves.length) {
    if (emptyMsg) emptyMsg.style.display = '';
    return;
  }
  if (emptyMsg) emptyMsg.style.display = 'none';

  list.innerHTML = saves.map(s => {
    const m = s.mode || '3d';
    const name = GAME_NAMES[m] ?? m;
    const icon = GAME_ICONS[m] ?? '🎮';
    const diff = s.diffId ?? '';
    const secs = s.seconds || 0;
    const mins = Math.floor(secs / 60), sec = secs % 60;
    const timeStr = `${mins}:${String(sec).padStart(2, '0')}`;
    const date = s.savedAt ? new Date(s.savedAt).toLocaleDateString('en', { day: 'numeric', month: 'short' }) : '';
    const meta = [diff, timeStr, date].filter(Boolean).join(' · ');
    return `
      <div class="saves-card" data-save-mode="${m}">
        <span class="saves-card-icon">${icon}</span>
        <div class="saves-card-info">
          <div class="saves-card-name">${name}</div>
          <div class="saves-card-meta">${meta}</div>
        </div>
        <button class="saves-card-resume" data-resume="${m}">↩ Resume</button>
        <button class="saves-card-delete" data-delete="${m}" title="Delete">✕</button>
      </div>`;
  }).join('');

  list.querySelectorAll('[data-resume]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      closeSavesModal();
      document.getElementById('settings-panel').classList.remove('open');
      launchGame(btn.dataset.resume, true);
    });
  });
  list.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      deleteGame(btn.dataset.delete);
      renderSavesModal();
      const saveCount = getAllSavedGames().length;
      const settBtn = document.getElementById('btn-settings-home');
      if (settBtn) settBtn.setAttribute('data-badge', saveCount > 0 ? String(saveCount) : '');
    });
  });
  list.querySelectorAll('.saves-card').forEach(card => {
    card.addEventListener('click', e => {
      if (!e.target.closest('button')) {
        closeSavesModal();
        document.getElementById('settings-panel').classList.remove('open');
        launchGame(card.dataset.saveMode, true);
      }
    });
  });
}

function openSavesModal() {
  renderSavesModal();
  const modal = document.getElementById('saves-modal');
  if (!modal) return;
  modal.classList.add('open');
}

function closeSavesModal() {
  const modal = document.getElementById('saves-modal');
  if (!modal) return;
  modal.classList.remove('open');
}

function showHomeScreen() {
  const hs = document.getElementById('home-screen');
  hs.classList.remove('hs-hidden', 'hs-hiding');
  timer.stop();

  const saveCount = getAllSavedGames().length;
  const settBtn = document.getElementById('btn-settings-home');
  if (settBtn) settBtn.setAttribute('data-badge', saveCount > 0 ? String(saveCount) : '');

  const { streak } = getStreak();
  const streakEl = document.getElementById('hs-daily-streak-val');
  if (streakEl) streakEl.textContent = streak > 0 ? `🔥 ${streak}` : '';
}

function hideHomeScreen(callback) {
  const hs = document.getElementById('home-screen');
  hs.classList.add('hs-hiding');
  setTimeout(() => {
    hs.classList.add('hs-hidden');
    if (callback) callback();
  }, 300);
}

function launchGame(game, resume = false) {
  const effectiveMode = game || '3d';
  const saved = resume ? getGame(effectiveMode) : null;

  if (game === 'binairo') {
    setMode('binairo');
    currentSeed = null;
    if (!binairoGeneratorWorker) initBinairoGeneratorWorker();
    rebuildBinairoPad();
    bindNumberButtons(placeValue);
    hideHomeScreen(() => {
      if (saved) restoreState(saved).then(ok => { if (!ok) startNewPuzzleBinairo(); });
      else startNewPuzzleBinairo();
    });
  } else if (game === 'futoshiki') {
    setMode('futoshiki');
    currentSeed = null;
    if (!futoshikiGeneratorWorker) initFutoshikiGeneratorWorker();
    rebuildNumberPad(4);
    bindNumberButtons(placeValue);
    hideHomeScreen(() => {
      if (saved) restoreState(saved).then(ok => { if (!ok) startNewPuzzleFutoshiki(); });
      else startNewPuzzleFutoshiki();
    });
  } else if (game === 'kakuro') {
    setMode('kakuro');
    currentSeed = null;
    if (!kakuroGeneratorWorker) initKakuroGeneratorWorker();
    rebuildNumberPad(9);
    bindNumberButtons(placeValue);
    hideHomeScreen(() => {
      if (saved) restoreState(saved).then(ok => { if (!ok) startNewPuzzleKakuro(); });
      else startNewPuzzleKakuro();
    });
  } else if (game === '2d') {
    setMode('2d');
    currentSeed = null;
    if (!generator2dWorker) initGenerator2dWorker();
    rebuildNumberPad(9);
    bindNumberButtons(placeValue);
    hideHomeScreen(() => {
      if (saved) restoreState(saved).then(ok => { if (!ok) startNewPuzzle2d(); });
      else startNewPuzzle2d();
    });
  } else {
    setMode('3d');
    currentSeed = null;
    initWorker();
    rebuildNumberPad(currentSize);
    bindNumberButtons(placeValue);
    rebuildSliceUI(currentSize);
    slicer = createSlicer({ getCells: () => cells, onChange: slicerOnChange });
    hideHomeScreen(() => {
      if (saved) restoreState(saved).then(ok => { if (!ok) startNewPuzzle(); });
      else startNewPuzzle();
    });
  }
  document.getElementById('settings-panel').classList.remove('open');
}

function bindCameraPresets() {
  const toggleBtn = document.getElementById('cam-preset-btn');
  const panel = document.getElementById('cam-preset-panel');
  if (!toggleBtn || !panel) return;

  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    panel.classList.toggle('open');
  });
  document.addEventListener('click', (e) => {
    if (!panel.contains(e.target) && e.target !== toggleBtn) panel.classList.remove('open');
  });

  const PRESETS = {
    front:  [0, 0, 1], back:   [0, 0, -1],
    left:   [-1, 0, 0], right:  [1, 0, 0],
    top:    [0, 1, 0],  bottom: [0, -1, 0],
  };

  panel.querySelectorAll('.cam-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const dir = PRESETS[btn.dataset.cam];
      if (!dir) return;
      panel.classList.remove('open');
      animateCameraToDir(dir[0], dir[1], dir[2]);
    });
  });
}

function animateCameraToDir(dx, dy, dz) {
  const p = camera.position;
  const dist = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z);
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const ex = (dx / len) * dist;
  const ey = (dy / len) * dist;
  const ez = (dz / len) * dist;
  const sx = p.x, sy = p.y, sz = p.z;
  const start = performance.now();
  const duration = 480;

  controls.autoRotate = false;

  function step(now) {
    const raw = Math.min((now - start) / duration, 1);
    const t = raw < 0.5 ? 2 * raw * raw : -1 + (4 - 2 * raw) * raw;
    camera.position.set(sx + (ex - sx) * t, sy + (ey - sy) * t, sz + (ez - sz) * t);
    controls.update();
    if (raw < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function bindHomeScreen() {
  // Size buttons on home screen
  document.querySelectorAll('[data-hs-size]').forEach(btn => {
    btn.addEventListener('click', () => {
      const sz = parseInt(btn.dataset.hsSize, 10);
      currentSize = sz;
      document.querySelectorAll('.size-btn[data-s]').forEach(b => {
        b.classList.toggle('active', b.dataset.s === String(sz));
      });
      launchGame('3d');
    });
  });

  // Daily challenge on home screen
  document.getElementById('btn-daily-home')?.addEventListener('click', () => {
    hideHomeScreen(() => startDailyChallenge());
  });

  // Botó continuar (llegat — ara gestionat per openSavesModal)
  document.getElementById('btn-continue-home')?.addEventListener('click', () => {});

  // More games toggle
  document.getElementById('btn-more-games')?.addEventListener('click', () => {
    const btn = document.getElementById('btn-more-games');
    const list = document.getElementById('hs-more-list');
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!expanded));
    btn.textContent = expanded ? 'More games ▾' : 'More games ▴';
    list.hidden = expanded;
  });

  // Other game modes from "More games"
  document.querySelectorAll('.hs-more-item').forEach(item => {
    item.addEventListener('click', () => launchGame(item.dataset.hsGame));
  });

  document.getElementById('btn-home')?.addEventListener('click', () => {
    document.getElementById('settings-panel').classList.remove('open');
    if (!finished && isGameInProgress() && history.canUndo()) {
      openExitDialog();
    } else {
      showHomeScreen();
    }
  });

  // Diàleg de sortida
  document.getElementById('btn-exit-save')?.addEventListener('click', () => {
    persistCurrentState();
    closeExitDialog();
    showSaveToast();
    showHomeScreen();
  });
  document.getElementById('btn-exit-discard')?.addEventListener('click', () => {
    deleteGame(mode);
    closeExitDialog();
    showHomeScreen();
  });
  document.getElementById('btn-exit-cancel')?.addEventListener('click', closeExitDialog);
  document.getElementById('exit-dialog')?.addEventListener('click', e => {
    if (e.target === document.getElementById('exit-dialog')) closeExitDialog();
  });

  document.getElementById('btn-saved-games')?.addEventListener('click', () => {
    document.getElementById('settings-panel').classList.remove('open');
    openSavesModal();
  });
  document.getElementById('btn-saves-close')?.addEventListener('click', closeSavesModal);
  document.getElementById('saves-modal')?.addEventListener('click', e => {
    if (e.target === document.getElementById('saves-modal')) closeSavesModal();
  });
}

let lastTimeShown = -1;
let lastFrame = performance.now();
function loop() {
  requestAnimationFrame(loop);
  if (document.visibilityState === 'hidden') return;
  const now = performance.now();
  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;

  if (fpsHistory.length >= 60) fpsHistory.shift();
  fpsHistory.push(dt);
  if (fpsHistory.length === 60) {
    const avgFps = 60 / fpsHistory.reduce((a, b) => a + b, 0);
    if (avgFps < 45) {
      lowFpsTimer += dt;
      highFpsTimer = 0;
      if (lowFpsTimer >= 2) applyLowQuality();
    } else if (avgFps > 55) {
      highFpsTimer += dt;
      lowFpsTimer = 0;
      if (highFpsTimer >= 5) applyHighQuality();
    } else {
      lowFpsTimer = 0;
      highFpsTimer = 0;
    }
  }

  controls.update();
  updateCosmos(dt);
  if (!reducedMotion && cells) effects.update(cells, dt);

  if (!finished) {
    const s = timer.getSeconds();
    if (s !== lastTimeShown) {
      lastTimeShown = s;
      setInfo({ time: formatTime(s) });
    }
  }
  composer.render();
}
loop();
