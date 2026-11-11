export function createBoard2d(onCellClick) {
  const container = document.getElementById('board2d');
  container.innerHTML = '';

  const cells = [];
  const byKey = new Map();

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const el = document.createElement('button');
      el.className = 'cell2d';
      el.dataset.r = r;
      el.dataset.c = c;
      container.appendChild(el);
      const cell = { el, r, c };
      cells.push(cell);
      byKey.set(`${r},${c}`, cell);
    }
  }

  container.addEventListener('click', e => {
    const el = e.target.closest('.cell2d');
    if (!el) return;
    const r = parseInt(el.dataset.r, 10);
    const c = parseInt(el.dataset.c, 10);
    const cell = byKey.get(`${r},${c}`);
    if (cell) onCellClick(cell);
  });

  return { cells, byKey };
}

export function setCellVisual2d(cell, value, fixed, selected, conflict, notes, highlighted) {
  const el = cell.el;
  el.className = 'cell2d';
  // data-r / data-c are set on creation and never change

  if (fixed) el.classList.add('cell2d--fixed');
  if (selected) el.classList.add('cell2d--selected');
  else if (conflict) el.classList.add('cell2d--conflict');
  else if (highlighted) el.classList.add('cell2d--hl');

  if (value) {
    el.textContent = value;
  } else if (notes && notes.size > 0) {
    let html = '<div class="notes2d">';
    for (let n = 1; n <= 9; n++) {
      html += `<span>${notes.has(n) ? n : ''}</span>`;
    }
    html += '</div>';
    el.innerHTML = html;
  } else {
    el.textContent = '';
  }
}
