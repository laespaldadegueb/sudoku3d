export function bindBottomSwipe(onSwipeUp) {
  let startY = null;
  let active = false;

  document.addEventListener('touchstart', e => {
    const touch = e.touches[0];
    if (touch.clientY > window.innerHeight - 40) {
      startY = touch.clientY;
      active = true;
    } else {
      active = false;
    }
  }, { passive: true });

  document.addEventListener('touchend', e => {
    if (!active || startY === null) return;
    const touch = e.changedTouches[0];
    const dy = startY - touch.clientY;
    if (dy > 50) onSwipeUp();
    startY = null;
    active = false;
  }, { passive: true });
}
