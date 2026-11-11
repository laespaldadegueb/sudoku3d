import * as THREE from 'three';
import { N } from '../game/grid.js';

const HOVER_SCALE = 1.08;
const FLASH_DURATION = 300;
const SHAKE_DURATION = 350;
const SHAKE_AMPLITUDE = 0.08;
const PULSE_DURATION = 450;
const PULSE_SCALE = 0.25;
const CASCADE_DELAY = 60;
const VICTORY_CASCADE_DELAY = 90;

export function createEffects({ scene, controls }) {
  const particles = [];

  function flash(cell, { correct = true } = {}) {
    cell.mesh.userData.flash = { t: 0, duration: FLASH_DURATION };
    if (!correct) {
      cell.mesh.userData.shake = { t: 0, duration: SHAKE_DURATION };
    }
  }

  function pulse(cell) {
    cell.mesh.userData.pulse = { t: 0, duration: PULSE_DURATION };
  }

  function lineCascade(cellsInLine) {
    cellsInLine.forEach((cell, i) => {
      setTimeout(() => pulse(cell), i * CASCADE_DELAY);
    });
  }

  function victory(cells, onFinished) {
    const cx = (N - 1) / 2, cy = (N - 1) / 2, cz = (N - 1) / 2;
    let maxDelay = 0;
    for (const cell of cells) {
      const d = Math.hypot(cell.x - cx, cell.y - cy, cell.z - cz);
      const delay = d * VICTORY_CASCADE_DELAY;
      if (delay > maxDelay) maxDelay = delay;
      setTimeout(() => pulse(cell), delay);
    }
    spawnParticles(600);
    controls.autoRotate = true;
    const totalMs = maxDelay + PULSE_DURATION + 400;
    setTimeout(() => {
      controls.autoRotate = false;
      onFinished?.();
    }, totalMs);
  }

  function spawnParticles(count) {
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 3 + Math.random() * 5;
      velocities[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
      velocities[i * 3 + 1] = Math.cos(phi) * speed;
      velocities[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * speed;
      const col = new THREE.Color().setHSL(Math.random(), 0.85, 0.6);
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.15, vertexColors: true, transparent: true, opacity: 1,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const points = new THREE.Points(geom, mat);
    scene.add(points);
    particles.push({
      points, positions, velocities, mat,
      life: 0, maxLife: 2.5, count,
    });
  }

  function updateParticles(delta) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life += delta;
      const t = p.life;
      const dt = delta;
      for (let j = 0; j < p.count; j++) {
        p.positions[j * 3]     += p.velocities[j * 3]     * dt;
        p.positions[j * 3 + 1] += p.velocities[j * 3 + 1] * dt;
        p.positions[j * 3 + 2] += p.velocities[j * 3 + 2] * dt;
        p.velocities[j * 3 + 1] -= 6 * dt;
      }
      p.points.geometry.attributes.position.needsUpdate = true;
      p.mat.opacity = Math.max(0, 1 - p.life / p.maxLife);
      if (p.life >= p.maxLife) {
        scene.remove(p.points);
        p.points.geometry.dispose();
        p.mat.dispose();
        particles.splice(i, 1);
      }
    }
  }

  function animateCell(mesh, dt) {
    const d = mesh.userData;
    let scale = 1;

    if (d.hover) scale *= HOVER_SCALE;

    if (d.flash) {
      d.flash.t += dt * 1000;
      const p = Math.min(1, d.flash.t / d.flash.duration);
      if (p < 1) scale *= 1 + 0.18 * Math.sin(p * Math.PI);
      else d.flash = null;
    }

    if (d.pulse) {
      d.pulse.t += dt * 1000;
      const p = Math.min(1, d.pulse.t / d.pulse.duration);
      if (p < 1) scale *= 1 + PULSE_SCALE * Math.sin(p * Math.PI);
      else d.pulse = null;
    }

    mesh.scale.setScalar(scale);

    if (d.shake) {
      d.shake.t += dt * 1000;
      const p = Math.min(1, d.shake.t / d.shake.duration);
      if (p < 1) {
        const amt = (1 - p) * SHAKE_AMPLITUDE;
        mesh.position.x = d.basePos.x + (Math.random() - 0.5) * amt;
        mesh.position.y = d.basePos.y + (Math.random() - 0.5) * amt;
      } else {
        mesh.position.copy(d.basePos);
        d.shake = null;
      }
    }
  }

  function update(cells, dt) {
    for (const cell of cells) animateCell(cell.mesh, dt);
    updateParticles(dt);
  }

  function setHover(cell, on) {
    if (!cell) return;
    cell.mesh.userData.hover = !!on;
  }

  function subcubeCascade(cells) {
    if (!cells || cells.length === 0) return;
    cells.forEach((cell, i) => {
      setTimeout(() => pulse(cell), i * 30);
    });
  }

  return { flash, pulse, lineCascade, subcubeCascade, victory, update, setHover };
}
