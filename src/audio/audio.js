let ctx = null;
let sfxGain = null;
let muted = false;
let sfxVolume = 0.6;

function getCtx() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    sfxGain = ctx.createGain();
    sfxGain.gain.value = sfxVolume;
    sfxGain.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, { type = 'sine', attack = 0.005, sustain = 0.08, release = 0.12, gain = 0.25, detune = 0 } = {}) {
  const c = getCtx();
  const osc = c.createOscillator();
  const env = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.detune.value = detune;
  env.gain.setValueAtTime(0, c.currentTime);
  env.gain.linearRampToValueAtTime(gain, c.currentTime + attack);
  env.gain.setValueAtTime(gain, c.currentTime + attack + sustain);
  env.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + attack + sustain + release);
  osc.connect(env);
  env.connect(sfxGain);
  osc.start(c.currentTime);
  osc.stop(c.currentTime + attack + sustain + release + 0.01);
}

function noise(duration = 0.04, gain = 0.08) {
  const c = getCtx();
  const bufSize = c.sampleRate * duration;
  const buf = c.createBuffer(1, bufSize, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const env = c.createGain();
  env.gain.setValueAtTime(gain, c.currentTime);
  env.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
  const filt = c.createBiquadFilter();
  filt.type = 'bandpass';
  filt.frequency.value = 2400;
  src.connect(filt);
  filt.connect(env);
  env.connect(sfxGain);
  src.start(c.currentTime);
}

export function sfxPlace() {
  if (muted) return;
  tone(523.25, { type: 'sine', attack: 0.003, sustain: 0.04, release: 0.12, gain: 0.2 });
  tone(783.99, { type: 'sine', attack: 0.003, sustain: 0.02, release: 0.1, gain: 0.1 });
}

export function sfxError() {
  if (muted) return;
  tone(180, { type: 'sawtooth', attack: 0.003, sustain: 0.06, release: 0.18, gain: 0.12, detune: 30 });
  tone(120, { type: 'sawtooth', attack: 0.01, sustain: 0.06, release: 0.14, gain: 0.08, detune: -20 });
}

export function sfxErase() {
  if (muted) return;
  noise(0.035, 0.06);
}

export function sfxSelect() {
  if (muted) return;
  noise(0.02, 0.03);
}

export function sfxLine() {
  if (muted) return;
  const c = getCtx();
  const freqs = [523.25, 659.25, 783.99];
  freqs.forEach((f, i) => {
    const osc = c.createOscillator();
    const env = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = f;
    const t = c.currentTime + i * 0.08;
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.22, t + 0.005);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    osc.connect(env);
    env.connect(sfxGain);
    osc.start(t);
    osc.stop(t + 0.36);
  });
}

export function sfxVictory() {
  if (muted) return;
  const c = getCtx();
  const scale = [523.25, 587.33, 659.25, 698.46, 783.99, 880, 987.77, 1046.5];
  scale.forEach((f, i) => {
    const osc = c.createOscillator();
    const env = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = f;
    const t = c.currentTime + i * 0.1;
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.2, t + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    osc.connect(env);
    env.connect(sfxGain);
    osc.start(t);
    osc.stop(t + 0.51);
  });
}

export function setSfxVolume(v) {
  sfxVolume = v;
  if (sfxGain) sfxGain.gain.value = muted ? 0 : v;
}

export function toggleMute() {
  muted = !muted;
  if (sfxGain) sfxGain.gain.value = muted ? 0 : sfxVolume;
  return muted;
}

export function isMuted() { return muted; }
export function getSfxVolume() { return sfxVolume; }
