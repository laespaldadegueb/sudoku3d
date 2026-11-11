import * as THREE from 'three';

export function bindPointerSelection(renderer, camera, getCells, onSelect, onLongPress, onDoubleClick) {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  const activePointers = new Map(); // pointerId → {startX, startY}
  let gestureHadDrag = false;

  let longPressTimer = null;
  let lpStartX = 0, lpStartY = 0;
  let lastClickTime = 0;
  let longPressFired = false;

  function syncGestureClass() {
    document.body.classList.toggle('canvas-gesture', activePointers.size > 0);
  }

  renderer.domElement.addEventListener('pointerdown', e => {
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    syncGestureClass();

    if (activePointers.size === 1) {
      gestureHadDrag = false;
      longPressFired = false;
      if (e.pointerType === 'touch') {
        lpStartX = e.clientX; lpStartY = e.clientY;
        longPressTimer = setTimeout(() => {
          longPressTimer = null; longPressFired = true; onLongPress?.();
        }, 500);
      }
    } else {
      // Segon dit o més → és una pinça, cancel·la qualsevol longpress pendent
      if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
      longPressFired = false;
    }
  });

  renderer.domElement.addEventListener('pointermove', e => {
    const start = activePointers.get(e.pointerId);
    if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 6)
      gestureHadDrag = true;

    if (longPressTimer && e.pointerType === 'touch') {
      if (Math.hypot(e.clientX - lpStartX, e.clientY - lpStartY) > 8) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    }
  });

  renderer.domElement.addEventListener('pointercancel', e => {
    activePointers.delete(e.pointerId);
    syncGestureClass();
    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
  });

  renderer.domElement.addEventListener('pointerup', e => {
    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }

    const start = activePointers.get(e.pointerId);
    activePointers.delete(e.pointerId);
    syncGestureClass();

    if (gestureHadDrag) {
      if (activePointers.size === 0) gestureHadDrag = false;
      return;
    }

    if (!start || longPressFired || activePointers.size > 0) return;
    if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > 6) return;

    pointer.x = (e.clientX / innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const meshes = getCells().map(c => c.mesh);
    const hits = raycaster.intersectObjects(meshes, false);
    if (hits.length > 0) {
      const now = performance.now();
      if (onDoubleClick && now - lastClickTime < 300) {
        lastClickTime = 0;
        onDoubleClick(hits[0].face.normal.clone());
      } else {
        lastClickTime = now;
        onSelect(hits[0].object.userData.cell);
      }
    }
  });
}

export function bindPointerHover(renderer, camera, getCells, onHoverChange) {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let hovered = null;

  renderer.domElement.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    pointer.x = (e.clientX / innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const meshes = getCells().map(c => c.mesh);
    const hits = raycaster.intersectObjects(meshes, false);
    const next = hits.length > 0 ? hits[0].object.userData.cell : null;
    if (next !== hovered) {
      const prev = hovered;
      hovered = next;
      onHoverChange(prev, next);
    }
  });

  renderer.domElement.addEventListener('pointerleave', () => {
    if (hovered) {
      const prev = hovered;
      hovered = null;
      onHoverChange(prev, null);
    }
  });
}
