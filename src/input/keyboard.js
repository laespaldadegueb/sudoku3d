import { N } from '../game/grid.js';

export function bindKeyboard({ getSelected, selectAt, placeValue, undo, redo, toggleNoteMode, toggleMute, onHint, onValidate, onCameraView }) {
  addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
      e.preventDefault(); undo(); return;
    }
    if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
      e.preventDefault(); redo(); return;
    }

    if ((e.ctrlKey || e.metaKey) && ['1','2','3','4','5','6'].includes(e.key)) {
      e.preventDefault(); onCameraView?.(parseInt(e.key, 10) - 1); return;
    }

    if (e.code === 'Numpad1') { e.preventDefault(); onCameraView?.(0); return; }
    if (e.code === 'Numpad2') { e.preventDefault(); onCameraView?.(1); return; }
    if (e.code === 'Numpad3') { e.preventDefault(); onCameraView?.(2); return; }
    if (e.code === 'Numpad4') { e.preventDefault(); onCameraView?.(3); return; }
    if (e.code === 'Numpad5') { e.preventDefault(); onCameraView?.(4); return; }
    if (e.code === 'Numpad6') { e.preventDefault(); onCameraView?.(5); return; }

    if (e.key.toLowerCase() === 'n') { toggleNoteMode?.(); return; }
    if (e.key.toLowerCase() === 'm') { toggleMute?.(); return; }
    if (e.key.toLowerCase() === 'h') { onHint?.(); return; }
    if (e.key.toLowerCase() === 'v') { onValidate?.(); return; }

    if (/^[1-9]$/.test(e.key)) {
      placeValue(parseInt(e.key, 10));
      return;
    }

    if (e.key === '0' || e.key === 'Backspace' || e.key === 'Delete') {
      placeValue(0);
      return;
    }

    const sel = getSelected();
    if (!sel) return;
    let { x, y, z } = sel;
    let moved = false;

    switch (e.key) {
      case 'ArrowRight': x = (x + 1) % N; moved = true; break;
      case 'ArrowLeft':  x = (x - 1 + N) % N; moved = true; break;
      case 'ArrowUp':    y = (y + 1) % N; moved = true; break;
      case 'ArrowDown':  y = (y - 1 + N) % N; moved = true; break;
      case 'PageUp':     z = (z + 1) % N; moved = true; break;
      case 'PageDown':   z = (z - 1 + N) % N; moved = true; break;
    }
    if (moved) {
      e.preventDefault();
      selectAt(x, y, z);
    }
  });
}
