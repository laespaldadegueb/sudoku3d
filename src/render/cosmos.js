let canvas, ctx, W, H, texture;
let reduced = false;
let running = false;

function drawWarmPaper() {
  // Base fill
  ctx.fillStyle = '#faf8f5';
  ctx.fillRect(0, 0, W, H);

  // Soft radial light: brightest at centre, warm cream at edges
  const cx = W / 2, cy = H / 2;
  const r  = Math.max(W, H) * 0.7;
  const gCenter = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  gCenter.addColorStop(0,   'rgba(255,253,248,0.55)');
  gCenter.addColorStop(0.6, 'rgba(250,248,245,0)');
  ctx.fillStyle = gCenter;
  ctx.fillRect(0, 0, W, H);

  // Subtle warm vignette at corners
  const gVig = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r * 1.2);
  gVig.addColorStop(0,   'rgba(200,185,165,0)');
  gVig.addColorStop(1,   'rgba(200,185,165,0.18)');
  ctx.fillStyle = gVig;
  ctx.fillRect(0, 0, W, H);
}

export function initCosmos(cosmosCanvas, cosmosTexture, opts = {}) {
  canvas  = cosmosCanvas;
  texture = cosmosTexture;
  ctx     = canvas.getContext('2d');
  reduced = opts.reducedMotion || false;
  W = canvas.width;
  H = canvas.height;
  running = true;
  drawWarmPaper();
  if (texture) texture.needsUpdate = true;
}

export function updateCosmos(dt) {
  if (!running || !canvas || reduced) return;
  // Static paper — no per-frame redraw needed; texture set once on init/resize
}

export function resizeCosmos(w, h) {
  if (!canvas) return;
  canvas.width = w;
  canvas.height = h;
  W = w; H = h;
  drawWarmPaper();
  if (texture) texture.needsUpdate = true;
}

export function setCosmosReducedMotion(val) {
  reduced = val;
}
