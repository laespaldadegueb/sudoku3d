import { DIFFICULTIES, DIFFICULTY_ORDER } from '../game/difficulty.js';
import { formatTime } from '../game/scoring.js';
import { getRanking, getAllModeRankings } from '../persist/prefs.js';

export function bindNumberButtons(onNumber) {
  document.querySelectorAll('.num').forEach(btn => {
    btn.addEventListener('click', () => {
      const n = parseInt(btn.dataset.n, 10);
      onNumber(n);
    });
  });
}

export function rebuildNumberPad(n) {
  const pad = document.getElementById('pad');
  pad.querySelectorAll('.num').forEach(b => b.remove());
  const sep = pad.querySelector('.pad-sep');

  // Insert 1→N in natural order (left → right)
  for (let i = 1; i <= n; i++) {
    const btn = document.createElement('button');
    btn.className = 'pad-cell num';
    btn.dataset.n = i;
    btn.textContent = i;
    pad.insertBefore(btn, sep);
  }
  if (!pad.querySelector('[data-n="0"]')) {
    const eraseBtn = document.createElement('button');
    eraseBtn.className = 'pad-cell num erase';
    eraseBtn.dataset.n = '0';
    eraseBtn.setAttribute('aria-label', 'Erase');
    eraseBtn.textContent = '⌫';
    pad.insertBefore(eraseBtn, sep);
  }

  // N≥5: 2 files (números + accions) perquè no hi caben en una sola fila a mòbil
  pad.querySelectorAll('.pad-break').forEach(b => b.remove());
  if (n >= 5) {
    pad.classList.add('pad--wrap');
    if (n === 9) document.body.classList.add('size-9');
    else         document.body.classList.remove('size-9');
    const br = document.createElement('div');
    br.className = 'pad-break';
    pad.insertBefore(br, pad.querySelector('.pad-sep'));
  } else {
    pad.classList.remove('pad--wrap');
    document.body.classList.remove('size-9');
  }
}

export function bindButton(id, handler) {
  document.getElementById(id).addEventListener('click', handler);
}

export function setInfo({ level, time, errors, hints, validations, cell }) {
  if (level !== undefined) document.getElementById('pill-name').textContent = level;
  if (time !== undefined) document.getElementById('info-time').textContent = time;
  if (errors !== undefined) {
    document.getElementById('info-errors').textContent = errors;
    const chip = document.getElementById('chip-errors');
    if (chip) chip.dataset.active = errors > 0;
  }
  if (hints !== undefined) {
    document.getElementById('info-hints').textContent = hints || '—';
    const chip = document.getElementById('chip-hints');
    if (chip) chip.dataset.active = hints > 0;
  }
  if (validations !== undefined) {
    const el = document.getElementById('info-validations');
    if (el) el.textContent = validations;
  }
  if (cell !== undefined) {
    const el = document.getElementById('info-cell');
    if (!cell) { el.innerHTML = ''; return; }
    el.innerHTML =
      `<span class="ax">x</span><span class="no">${cell.x + 1}</span>` +
      `<span class="ax">y</span><span class="no">${cell.y + 1}</span>` +
      `<span class="ax">z</span><span class="no">${cell.z + 1}</span>` +
      (cell.fixed ? '<span class="tag">fixed</span>' : '');
  }
}

export function renderDifficultyButtons({ current, unlocked, completed, onPick }) {
  const container = document.getElementById('diff-popover');
  container.innerHTML = '';
  for (const id of DIFFICULTY_ORDER) {
    const d = DIFFICULTIES[id];
    const btn = document.createElement('button');
    btn.className = 'diff-item' + (id === current ? ' active' : '');
    const isUnlocked = unlocked.includes(id);
    btn.disabled = !isUnlocked;
    const done = completed[id] || 0;
    const badgeHtml = d.badge
      ? `<span class="diff-badge ${d.badge}">${d.badge === 'rec' ? 'Recommended' : 'Hard'}</span>`
      : '';
    btn.innerHTML = `
      <div class="diff-top">
        <span class="name">${isUnlocked ? '' : '🔒 '}${d.label}</span>
        <span class="meta">${d.clues} clues · ${done}✓</span>
      </div>
      <div class="diff-top" style="margin-top:1px">
        <span class="diff-desc">${d.desc}</span>
        ${badgeHtml}
      </div>
    `;
    btn.addEventListener('click', () => {
      if (!isUnlocked) return;
      container.classList.remove('open');
      onPick(id);
    });
    container.appendChild(btn);
  }
}

export function bindDifficultyPopover() {
  const pill = document.getElementById('level-pill');
  const pop = document.getElementById('diff-popover');
  pill.addEventListener('click', e => {
    e.stopPropagation();
    pop.classList.toggle('open');
  });
  document.addEventListener('click', e => {
    if (!pop.contains(e.target) && !pill.contains(e.target)) {
      pop.classList.remove('open');
    }
  });
}

export function bindHelp(getMode) {
  const btn = document.getElementById('help-btn');
  const overlay = document.getElementById('help-overlay');
  const sudoku3dSection  = document.getElementById('help-sudoku3d');
  const sudoku2dSection  = document.getElementById('help-sudoku2d');
  const kakuroSection    = document.getElementById('help-kakuro');
  const futoshikiSection = document.getElementById('help-futoshiki');
  const binairoSection   = document.getElementById('help-binairo');
  const closeBtn = document.getElementById('help-close-btn');

  const open = () => {
    const m = getMode ? getMode() : '';
    if (sudoku3dSection)  sudoku3dSection.style.display  = m === '3d'        ? '' : 'none';
    if (sudoku2dSection)  sudoku2dSection.style.display  = m === '2d'        ? '' : 'none';
    if (kakuroSection)    kakuroSection.style.display    = m === 'kakuro'    ? '' : 'none';
    if (futoshikiSection) futoshikiSection.style.display = m === 'futoshiki' ? '' : 'none';
    if (binairoSection)   binairoSection.style.display   = m === 'binairo'   ? '' : 'none';
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
  };
  const shut = () => { overlay.classList.remove('open'); overlay.setAttribute('aria-hidden', 'true'); };

  btn.addEventListener('click', open);
  if (closeBtn) closeBtn.addEventListener('click', shut);
  overlay.addEventListener('click', e => { if (e.target === overlay) shut(); });
  addEventListener('keydown', e => { if (e.key === 'Escape') shut(); });

  // Generic step-wizard helper
  function bindWizard({ steps, dots, nextLabels, prevId, nextId }) {
    let current = 0;
    const go = (idx) => {
      steps[current].classList.replace('active', 'inactive');
      dots[current].classList.remove('done');
      current = idx;
      steps[current].classList.replace('inactive', 'active');
      dots[current].classList.add('done');
      document.getElementById(prevId).disabled = current === 0;
      const nextBtn = document.getElementById(nextId);
      nextBtn.textContent = nextLabels[current] ?? 'Done ✓';
    };
    document.getElementById(prevId)?.addEventListener('click', () => { if (current > 0) go(current - 1); });
    document.getElementById(nextId)?.addEventListener('click', () => {
      if (current < steps.length - 1) go(current + 1);
      else shut();
    });
  }

  // Sudoku 3D help navigation
  bindWizard({
    steps: ['s3-step-0', 's3-step-1', 's3-step-2', 's3-step-3'].map(id => document.getElementById(id)),
    dots:  ['s3-dot-0',  's3-dot-1',  's3-dot-2',  's3-dot-3' ].map(id => document.getElementById(id)),
    nextLabels: ['Step 2 · Navigate the cube →', 'Step 3 · Enter numbers →', 'Step 4 · Help & controls →', null],
    prevId: 's3-help-prev',
    nextId: 's3-help-next',
  });

  // Sudoku 2D help navigation
  if (document.getElementById('s2-step-0')) {
    bindWizard({
      steps: ['s2-step-0', 's2-step-1', 's2-step-2'].map(id => document.getElementById(id)),
      dots:  ['s2-dot-0',  's2-dot-1',  's2-dot-2' ].map(id => document.getElementById(id)),
      nextLabels: ['Step 2 · Enter numbers →', 'Step 3 · Help & controls →', null],
      prevId: 's2-help-prev',
      nextId: 's2-help-next',
    });
  }

  // Kakuro help navigation
  bindWizard({
    steps: ['kk-step-0', 'kk-step-1', 'kk-step-2'].map(id => document.getElementById(id)),
    dots:  ['kk-dot-0',  'kk-dot-1',  'kk-dot-2' ].map(id => document.getElementById(id)),
    nextLabels: ['Step 2 · The rules →', 'Step 3 · Tips & controls →', null],
    prevId: 'kk-help-prev',
    nextId: 'kk-help-next',
  });

  // Futoshiki help navigation
  bindWizard({
    steps: ['ft-step-0', 'ft-step-1', 'ft-step-2'].map(id => document.getElementById(id)),
    dots:  ['ft-dot-0',  'ft-dot-1',  'ft-dot-2' ].map(id => document.getElementById(id)),
    nextLabels: ['Step 2 · Inequality signs →', 'Step 3 · Tips & controls →', null],
    prevId: 'ft-help-prev',
    nextId: 'ft-help-next',
  });

  // Binairo help navigation
  if (document.getElementById('bn-step-0')) {
    bindWizard({
      steps: ['bn-step-0', 'bn-step-1', 'bn-step-2'].map(id => document.getElementById(id)),
      dots:  ['bn-dot-0',  'bn-dot-1',  'bn-dot-2' ].map(id => document.getElementById(id)),
      nextLabels: ['Step 2 · No three in a row →', 'Step 3 · Unique rows and tips →', null],
      prevId: 'bn-help-prev',
      nextId: 'bn-help-next',
    });
  }
}

export function showVictory({ diffId, size, sizeLabel, seconds, errors, score, bestTime, bestScore, newBestTime, newBestScore, unlockedNext, streak, onNewPuzzle, onGoHome }) {
  const overlay = document.getElementById('victory');
  const d = DIFFICULTIES[diffId];

  document.getElementById('v-level').textContent = sizeLabel
    ? `${d.label} · ${sizeLabel}`
    : `${d.label} · ${size ?? 4}³`;

  document.getElementById('v-time-num').textContent = formatTime(seconds);
  document.getElementById('v-time-tag').textContent = newBestTime ? '🏅 record' : '';
  document.getElementById('v-time-card').classList.toggle('record', !!newBestTime);

  document.getElementById('v-errors').textContent = errors;

  document.getElementById('v-score-num').textContent = score;
  document.getElementById('v-score-tag').textContent = newBestScore ? '🏅 record' : '';
  document.getElementById('v-score-card').classList.toggle('record', !!newBestScore);

  document.getElementById('v-best-time').textContent  = formatTime(bestTime);
  document.getElementById('v-best-score').textContent = bestScore;

  const streakEl = document.getElementById('v-streak');
  if (streak != null) {
    streakEl.textContent  = streak === 1 ? '1 day' : `${streak} days`;
    streakEl.style.color  = streak >= 7 ? 'var(--accent)' : 'var(--muted)';
  }

  const unlockEl = document.getElementById('v-unlock');
  if (unlockedNext) {
    unlockEl.classList.add('show');
    unlockEl.textContent = `You unlocked ${DIFFICULTIES[unlockedNext].label}.`;
  } else {
    unlockEl.classList.remove('show');
  }

  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden', 'false');

  const close = () => {
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
  };

  const btn = document.getElementById('victory-new');
  const handler = () => { close(); btn.removeEventListener('click', handler); onNewPuzzle(); };
  btn.addEventListener('click', handler);

  const homeBtn = document.getElementById('victory-home');
  if (homeBtn && onGoHome) {
    const homeHandler = () => { close(); homeBtn.removeEventListener('click', homeHandler); onGoHome(); };
    homeBtn.addEventListener('click', homeHandler);
  }
}

export function setProgress(filled, total) {
  const el = document.getElementById('info-progress');
  if (!el) return;
  el.textContent = `${filled}/${total}`;
  const chip = document.getElementById('chip-progress');
  if (chip) chip.dataset.done = filled >= total;
}

export function setAccent(hex) {
  document.documentElement.style.setProperty('--accent', hex);
}

const GAME_MODES = [
  { key: '3d',        label: 'Sudoku 3D',  icon: '🧊', accent: '#c06040' },
  { key: '2d',        label: 'Sudoku 2D',  icon: '🔢', accent: '#5090b0' },
  { key: 'kakuro',    label: 'Kakuro',     icon: '➕', accent: '#508050' },
  { key: 'futoshiki', label: 'Futoshiki',  icon: '⚖️', accent: '#9060b0' },
  { key: 'binairo',   label: 'Takuzu',     icon: '⬛', accent: '#408878' },
];

export function showRanking(filterMode = null) {
  const all = getAllModeRankings();
  const content = document.getElementById('ranking-content');
  const modes = filterMode ? GAME_MODES.filter(m => m.key === filterMode) : GAME_MODES;

  content.innerHTML = modes.map(({ key, label, icon, accent }) => {
    const entries = (all[key] || []).slice(0, 3);
    const DIFF_SHORT = { beginner: 'Beg', intermediate: 'Int', advanced: 'Adv', expert: 'Exp' };
    const rows = entries.length
      ? entries.map((e, i) => `
          <div class="rk-row">
            <span class="rk-pos">${i + 1}</span>
            <span class="rk-score">${e.score.toLocaleString()}</span>
            <span class="rk-diff">${DIFF_SHORT[e.diffId] ?? ''}</span>
            <span class="rk-time">${formatTime(e.seconds)}</span>
            <span class="rk-date">${e.date.slice(5)}</span>
          </div>`).join('')
      : `<div class="rk-empty">No games yet</div>`;

    return `
      <div class="rk-card">
        <div class="rk-card-head" style="--card-accent:${accent}">
          <span class="rk-icon">${icon}</span>
          <span class="rk-name">${label}</span>
        </div>
        <div class="rk-body">${rows}</div>
      </div>`;
  }).join('');

  const overlay = document.getElementById('ranking-overlay');
  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden', 'false');
}
