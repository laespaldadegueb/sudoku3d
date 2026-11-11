// Binairo board: N×N grid
// Internal values: 0=empty, 1=binairo "0", 2=binairo "1"
// Visual grouping: thicker borders every 2 rows/columns

const DISPLAY = { 0: '', 1: '0', 2: '1' };

export function createBinairoBoard(n, onCellClick) {
  const container = document.getElementById('board-binairo');
  container.innerHTML = '';
  container.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
  container.style.gridTemplateRows = `repeat(${n}, 1fr)`;

  const cells = [];
  const byKey = new Map();

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const btn = document.createElement('button');
      btn.className = 'bn-cell';
      btn.dataset.r = r;
      btn.dataset.c = c;
      if ((c + 1) % 2 === 0 && c < n - 1) btn.classList.add('bn-cell--sep-c');
      if ((r + 1) % 2 === 0 && r < n - 1) btn.classList.add('bn-cell--sep-r');
      if (c === n - 1) btn.classList.add('bn-cell--last-c');
      if (r === n - 1) btn.classList.add('bn-cell--last-r');
      container.appendChild(btn);
      const cell = { el: btn, r, c };
      cells.push(cell);
      byKey.set(`${r},${c}`, cell);
    }
  }

  container.addEventListener('click', e => {
    const btn = e.target.closest('.bn-cell');
    if (!btn) return;
    const cell = byKey.get(`${btn.dataset.r},${btn.dataset.c}`);
    if (cell) onCellClick(cell);
  });

  return { cells, byKey };
}

export function setCellVisualBinairo(cell, value, isFixed, selected, conflict, highlighted) {
  const el = cell.el;
  const structClasses = ['bn-cell--sep-c', 'bn-cell--sep-r', 'bn-cell--last-c', 'bn-cell--last-r'];
  const kept = structClasses.filter(cls => el.classList.contains(cls));
  el.className = 'bn-cell';
  kept.forEach(cls => el.classList.add(cls));

  if (value === 1) el.classList.add('bn-cell--zero');
  else if (value === 2) el.classList.add('bn-cell--one');

  if (isFixed)          el.classList.add('bn-cell--fixed');
  if (selected)         el.classList.add('bn-cell--selected');
  else if (conflict)    el.classList.add('bn-cell--conflict');
  else if (highlighted) el.classList.add('bn-cell--hl');

  el.textContent = DISPLAY[value] ?? '';
}
