// Creates the Kakuro board DOM inside #board-kakuro.
// Cells:
//   .kk-black  — pure black cell (no clue)
//   .kk-clue   — black cell with right/down clue numbers and a diagonal line
//   .kk-white  — playable white cell
export function createKakuroBoard(template, rightClues, downClues, onCellClick) {
  const container = document.getElementById('board-kakuro');
  container.innerHTML = '';

  const rows = template.length;
  const cols = template[0].length;

  container.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  container.style.gridTemplateRows    = `repeat(${rows}, 1fr)`;

  const whiteCells = [];
  const byKey = new Map();

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const key = `${r},${c}`;
      const isWhite = template[r][c] === 1;
      const right = rightClues.get(key);
      const down  = downClues.get(key);
      const isClue = !isWhite && (right !== undefined || down !== undefined);

      if (isWhite) {
        const btn = document.createElement('button');
        btn.className = 'kk-white';
        btn.dataset.r = r;
        btn.dataset.c = c;
        container.appendChild(btn);
        const cell = { el: btn, r, c };
        whiteCells.push(cell);
        byKey.set(key, cell);
      } else if (isClue) {
        const div = document.createElement('div');
        div.className = 'kk-clue';
        // SVG diagonal line
        div.innerHTML = `
          <svg class="kk-diag" viewBox="0 0 40 40" preserveAspectRatio="none"><line x1="2" y1="2" x2="38" y2="38"/></svg>
          <span class="kk-down">${down ?? ''}</span>
          <span class="kk-right">${right ?? ''}</span>`;
        container.appendChild(div);
      } else {
        const div = document.createElement('div');
        div.className = 'kk-black';
        container.appendChild(div);
      }
    }
  }

  container.addEventListener('click', e => {
    const btn = e.target.closest('.kk-white');
    if (!btn) return;
    const r = parseInt(btn.dataset.r, 10);
    const c = parseInt(btn.dataset.c, 10);
    const cell = byKey.get(`${r},${c}`);
    if (cell) onCellClick(cell);
  });

  return { whiteCells, byKey };
}

export function setCellVisualKakuro(cell, value, selected, conflict) {
  const el = cell.el;
  el.className = 'kk-white';
  if (selected) el.classList.add('kk-white--selected');
  else if (conflict) el.classList.add('kk-white--conflict');
  el.textContent = value || '';
}
