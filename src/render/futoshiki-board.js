// Inequality keys:
//   hIneq: Map 'h:r,c' → '<' | '>'   shown between (r,c) and (r,c+1)
//   vIneq: Map 'v:r,c' → '^' | 'v'   shown between (r,c) and (r+1,c)
//
// Grid template uses interleaved cell/gap tracks so cells stay square:
//   columns: repeat(n-1, 1fr IQ_SIZE) 1fr
//   rows:    same template
//
// Cell (r,c) → gridColumn: 2c+1, gridRow: 2r+1
// H-ineq between (r,c)↔(r,c+1) → col 2c+2, row 2r+1
// V-ineq between (r,c)↔(r+1,c) → col 2c+1, row 2r+2

const IQ_SIZE = { 4: '20px', 5: '18px', 6: '16px' };

const DISPLAY = { '<': '<', '>': '>', '^': '∧', v: '∨' };

export function createFutoshikiBoard(n, hIneq, vIneq, onCellClick) {
  const container = document.getElementById('board-futoshiki');
  container.innerHTML = '';

  const iq = IQ_SIZE[n] ?? '16px';
  const track = `repeat(${n - 1}, 1fr ${iq}) 1fr`;
  container.style.gridTemplateColumns = track;
  container.style.gridTemplateRows    = track;

  const cells  = [];
  const byKey  = new Map();

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      // Cell button
      const btn = document.createElement('button');
      btn.className = 'ft-cell';
      btn.dataset.r = r;
      btn.dataset.c = c;
      btn.style.gridColumn = 2 * c + 1;
      btn.style.gridRow    = 2 * r + 1;
      container.appendChild(btn);
      const cell = { el: btn, r, c };
      cells.push(cell);
      byKey.set(`${r},${c}`, cell);

      // Horizontal inequality to the right
      if (c < n - 1) {
        const sym = hIneq.get(`h:${r},${c}`);
        const div = document.createElement('div');
        div.className = 'ft-ineq ft-ineq-h';
        div.style.gridColumn = 2 * c + 2;
        div.style.gridRow    = 2 * r + 1;
        if (sym) { div.textContent = DISPLAY[sym]; div.dataset.v = sym; }
        container.appendChild(div);
      }

      // Vertical inequality below
      if (r < n - 1) {
        const sym = vIneq.get(`v:${r},${c}`);
        const div = document.createElement('div');
        div.className = 'ft-ineq ft-ineq-v';
        div.style.gridColumn = 2 * c + 1;
        div.style.gridRow    = 2 * r + 2;
        if (sym) { div.textContent = DISPLAY[sym]; div.dataset.v = sym; }
        container.appendChild(div);
      }

      // Corner spacer
      if (r < n - 1 && c < n - 1) {
        const sp = document.createElement('div');
        sp.style.gridColumn = 2 * c + 2;
        sp.style.gridRow    = 2 * r + 2;
        container.appendChild(sp);
      }
    }
  }

  container.addEventListener('click', e => {
    const btn = e.target.closest('.ft-cell');
    if (!btn) return;
    const cell = byKey.get(`${btn.dataset.r},${btn.dataset.c}`);
    if (cell) onCellClick(cell);
  });

  return { cells, byKey };
}

export function setCellVisualFutoshiki(cell, value, isFixed, selected, conflict, notes, n, highlighted) {
  const el = cell.el;
  el.className = 'ft-cell';
  if (isFixed)         el.classList.add('ft-cell--fixed');
  if (selected)        el.classList.add('ft-cell--selected');
  else if (conflict)   el.classList.add('ft-cell--conflict');
  else if (highlighted) el.classList.add('ft-cell--hl');

  if (value) {
    el.textContent = value;
  } else if (notes && notes.size > 0) {
    const cols = n <= 4 ? 2 : 3;
    let html = `<div class="ft-notes" style="grid-template-columns:repeat(${cols},1fr)">`;
    for (let i = 1; i <= n; i++)
      html += `<span>${notes.has(i) ? i : ''}</span>`;
    html += '</div>';
    el.innerHTML = html;
  } else {
    el.textContent = '';
  }
}
