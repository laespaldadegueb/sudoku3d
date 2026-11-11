export function createTimer() {
  let startedAt = 0;
  let accumulated = 0;
  let running = false;

  return {
    start() {
      if (running) return;
      startedAt = performance.now();
      running = true;
    },
    stop() {
      if (!running) return;
      accumulated += performance.now() - startedAt;
      running = false;
    },
    reset() {
      startedAt = 0;
      accumulated = 0;
      running = false;
    },
    resetTo(seconds) {
      startedAt = 0;
      accumulated = seconds * 1000;
      running = false;
    },
    getSeconds() {
      const live = running ? performance.now() - startedAt : 0;
      return Math.floor((accumulated + live) / 1000);
    },
    isRunning() { return running; },
  };
}
