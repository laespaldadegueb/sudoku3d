export function rebuildSliceUI(n) {
  ['x', 'y', 'z'].forEach(ax => {
    const track = document.getElementById(`slice-${ax}`);
    if (!track) return;
    track.innerHTML = `<button class="slice-seg" data-v="">all</button>` +
      Array.from({length: n}, (_, i) =>
        `<button class="slice-seg" data-v="${i}">${i+1}<sup class="slice-badge" hidden></sup></button>`
      ).join('');
  });
}

export function updateSliceBadges(grid, n) {
  const counts = {
    x: Array.from({length: n}, (_, i) => {
      let c = 0;
      for (let y = 0; y < n; y++) for (let z = 0; z < n; z++) if (grid[i][y][z] === 0) c++;
      return c;
    }),
    y: Array.from({length: n}, (_, j) => {
      let c = 0;
      for (let x = 0; x < n; x++) for (let z = 0; z < n; z++) if (grid[x][j][z] === 0) c++;
      return c;
    }),
    z: Array.from({length: n}, (_, k) => {
      let c = 0;
      for (let x = 0; x < n; x++) for (let y = 0; y < n; y++) if (grid[x][y][k] === 0) c++;
      return c;
    }),
  };
  for (const axis of ['x', 'y', 'z']) {
    const track = document.getElementById(`slice-${axis}`);
    if (!track) continue;
    track.querySelectorAll('button[data-v]:not([data-v=""])').forEach(btn => {
      const badge = btn.querySelector('.slice-badge');
      if (!badge) return;
      const count = counts[axis][parseInt(btn.dataset.v, 10)] ?? 0;
      badge.textContent = count || '';
      badge.hidden = count === 0;
    });
  }
}

const FADE_MS = 160;
const fadingCells = new Map(); // cell → cancelFn

function setMeshOpacity(mesh, opacity) {
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  for (const m of mats) { if (m && m.opacity !== undefined) m.opacity = opacity; }
  if (mesh.userData?.cell?.edgeMat) {
    const em = mesh.userData.cell.edgeMat;
    if (em._baseOpacity === undefined) em._baseOpacity = em.opacity;
    em.opacity = opacity * em._baseOpacity;
  }
}

function fadeCell(cell, toVisible) {
  if (fadingCells.has(cell)) fadingCells.get(cell)();
  let cancelled = false;
  fadingCells.set(cell, () => { cancelled = true; });

  if (toVisible) {
    cell.mesh.visible = true;
    setMeshOpacity(cell.mesh, 0);
  }

  const start = performance.now();
  const step = (now) => {
    if (cancelled) return;
    const t = Math.min((now - start) / FADE_MS, 1);
    const opacity = toVisible ? t : 1 - t;
    setMeshOpacity(cell.mesh, opacity);
    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      fadingCells.delete(cell);
      if (!toVisible) cell.mesh.visible = false;
    }
  };
  requestAnimationFrame(step);
}

export function createSlicer({ getCells, onChange }) {
  const filter = { x: null, y: null, z: null };

  function isVisible(cell) {
    return (filter.x === null || cell.x === filter.x) &&
           (filter.y === null || cell.y === filter.y) &&
           (filter.z === null || cell.z === filter.z);
  }

  function apply() {
    for (const cell of getCells()) {
      const shouldBeVisible = isVisible(cell);
      if (shouldBeVisible !== cell.mesh.visible || fadingCells.has(cell)) {
        fadeCell(cell, shouldBeVisible);
      }
    }
    onChange?.();
  }

  function updateButtons() {
    for (const axis of ['x', 'y', 'z']) {
      const row = document.getElementById(`slice-${axis}`);
      if (!row) continue;
      row.querySelectorAll('button').forEach(b => {
        const raw = b.dataset.v;
        const v = raw === '' ? null : parseInt(raw, 10);
        b.classList.toggle('active', v === filter[axis]);
      });
    }
  }

  function set(axis, value) {
    filter[axis] = value;
    apply();
    updateButtons();
  }

  function bindButtons() {
    for (const axis of ['x', 'y', 'z']) {
      const row = document.getElementById(`slice-${axis}`);
      if (!row) continue;
      row.querySelectorAll('button').forEach(b => {
        b.addEventListener('click', () => {
          const raw = b.dataset.v;
          const v = raw === '' ? null : parseInt(raw, 10);
          set(axis, v);
        });
      });
    }
    updateButtons();
  }

  function reset() {
    filter.x = null;
    filter.y = null;
    filter.z = null;
    apply();
    updateButtons();
  }

  bindButtons();

  return { apply, set, reset, isVisible, get: () => ({ ...filter }) };
}
