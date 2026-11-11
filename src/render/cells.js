import * as THREE from 'three';
import { N } from '../game/grid.js';
import { getTheme } from './themes.js';

export const SPACING = 1.15;
export const OFFSET = (N - 1) * SPACING / 2;
export function getOffset() { return (N - 1) * SPACING / 2; }

const cellGeom = new THREE.BoxGeometry(0.95, 0.95, 0.95);
const edgeGeom = new THREE.EdgesGeometry(cellGeom);

const textureCache = new Map();

export function clearTextureCache() {
  for (const tex of textureCache.values()) tex.dispose();
  textureCache.clear();
}

function makeEmptyMaterial() {
  const t = getTheme().cell;
  return new THREE.MeshStandardMaterial({
    color: t.emptyColor, transparent: true, opacity: t.emptyOpacity, roughness: 0.4,
  });
}

function contrastColor(bgHex) {
  const r = parseInt(bgHex.slice(1, 3), 16) / 255;
  const g = parseInt(bgHex.slice(3, 5), 16) / 255;
  const b = parseInt(bgHex.slice(5, 7), 16) / 255;
  const lin = c => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return L > 0.179 ? '#000000' : '#ffffff';
}

function makeNumberTexture(text, bgHex) {
  const themeId = getTheme().name;
  const cacheKey = `number:${text}:${bgHex}:${themeId}`;
  if (textureCache.has(cacheKey)) return textureCache.get(cacheKey);
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, 128, 128);
  const textCol = contrastColor(bgHex);
  ctx.strokeStyle = textCol === '#000000' ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 124, 124);
  ctx.fillStyle = textCol;
  ctx.font = 'bold 88px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 64, 68);
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  textureCache.set(cacheKey, tex);
  return tex;
}

function makeConflictTexture(value, bgHex) {
  const themeId = getTheme().name;
  const cacheKey = `conflict:${value}:${bgHex}:${themeId}`;
  if (textureCache.has(cacheKey)) return textureCache.get(cacheKey);
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, 128, 128);
  const textCol = contrastColor(bgHex);
  ctx.strokeStyle = textCol === '#000000' ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 124, 124);
  ctx.fillStyle = textCol;
  ctx.font = 'bold 70px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(value), 56, 72);
  ctx.fillStyle = '#ff5555';
  ctx.font = 'bold 30px system-ui';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillText('!', 120, 6);
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  textureCache.set(cacheKey, tex);
  return tex;
}

function makeNotesTexture(noteSet, bgHex, textColor = '#7a9abf') {
  const n = N;
  const themeId = getTheme().name;
  const cacheKey = `notes:${[...noteSet].sort().join(',')}:${bgHex}:${n}:${themeId}`;
  if (textureCache.has(cacheKey)) return textureCache.get(cacheKey);
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, 128, 128);
  const cols = n <= 4 ? 2 : 3;
  const rows = Math.ceil(n / cols);
  const cellW = 128 / cols;
  const cellH = 128 / rows;
  const fontSize = Math.round(cellW * 0.55);
  ctx.font = `bold ${fontSize}px system-ui`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 1; i <= n; i++) {
    if (noteSet.has(i)) {
      const col = (i - 1) % cols;
      const row = Math.floor((i - 1) / cols);
      ctx.fillStyle = textColor;
      ctx.fillText(i, cellW * (col + 0.5), cellH * (row + 0.5));
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  textureCache.set(cacheKey, tex);
  return tex;
}

function makeNumberMaterial(value, bgHex) {
  return new THREE.MeshStandardMaterial({
    map: makeNumberTexture(String(value), bgHex),
    roughness: 0.5, transparent: true, opacity: 1,
  });
}

function makeConflictMaterial(value, bgHex) {
  return new THREE.MeshStandardMaterial({ map: makeConflictTexture(value, bgHex), roughness: 0.5, transparent: true, opacity: 1 });
}

function makeNotesMaterial(noteSet, bgHex, textColor = '#7a9abf') {
  return new THREE.MeshStandardMaterial({ map: makeNotesTexture(noteSet, bgHex, textColor), roughness: 0.5, transparent: true, opacity: 1 });
}

export function createCells(scene, { grid, fixed }) {
  const theme = getTheme();
  const cells = [];
  const offset = getOffset();
  for (let x = 0; x < N; x++) {
    for (let y = 0; y < N; y++) {
      for (let z = 0; z < N; z++) {
        const mesh = new THREE.Mesh(cellGeom, makeEmptyMaterial());
        mesh.position.set(x * SPACING - offset, y * SPACING - offset, z * SPACING - offset);
        mesh.userData.basePos = mesh.position.clone();

        const edgeMat = new THREE.LineBasicMaterial({
          color: theme.edge.normal, transparent: true, opacity: theme.edge.opacity,
        });
        const edges = new THREE.LineSegments(edgeGeom, edgeMat);
        mesh.add(edges);

        scene.add(mesh);
        const cell = { mesh, edges, edgeMat, x, y, z };
        cells.push(cell);
        mesh.userData.cell = cell;

        if (fixed[x][y][z]) {
          setCellVisual(cell, grid[x][y][z], true);
        }
      }
    }
  }
  return cells;
}

export function setCellVisual(cell, value, isFixed, isSelected = false, isConflict = false, noteSet = null, isHighlighted = false) {
  const { mesh, edgeMat } = cell;
  const theme = getTheme();
  const t = theme.cell;

  const disposeMat = m => {
    if (!m) return;
    m.dispose();
  };
  if (Array.isArray(mesh.material)) mesh.material.forEach(disposeMat);
  else disposeMat(mesh.material);

  if (value === 0) {
    if (noteSet && noteSet.size > 0) {
      const emptyBg = '#' + t.emptyColor.toString(16).padStart(6, '0');
      const bg = isSelected ? t.selected : emptyBg;
      const defaultNoteColor = t.noteColor || '#7a9abf';
      const noteTextCol = contrastColor(bg) === '#000000' ? '#111111' : defaultNoteColor;
      const mats = [0,1,2,3,4,5].map(() => makeNotesMaterial(noteSet, bg, noteTextCol));
      mesh.material = mats;
    } else if (isSelected) {
      mesh.material = new THREE.MeshStandardMaterial({
        color: t.selectedEmptyColor, roughness: 0.3, emissive: t.selectedEmptyEmissive,
      });
    } else {
      mesh.material = makeEmptyMaterial();
    }
  } else {
    let bg;
    if (isSelected) bg = t.selected;
    else if (isConflict) bg = isFixed ? t.conflictFixed : t.conflict;
    else bg = isFixed ? t.fixed : t.filled;
    const mats = isConflict
      ? [0,1,2,3,4,5].map(() => makeConflictMaterial(value, bg))
      : [0,1,2,3,4,5].map(() => makeNumberMaterial(value, bg));
    mesh.material = mats;
  }

  if (isConflict) {
    edgeMat.color.setHex(theme.edge.conflict);
    edgeMat.opacity = 1;
  } else if (isSelected) {
    edgeMat.color.setHex(theme.edge.normal);
    edgeMat.opacity = theme.edge.opacity;
  } else if (isHighlighted) {
    edgeMat.color.setHex(theme.edge.highlight);
    edgeMat.opacity = 0.75;
  } else {
    edgeMat.color.setHex(theme.edge.normal);
    edgeMat.opacity = theme.edge.opacity;
  }
}

export function clearCells(scene, cells) {
  for (const cell of cells) {
    scene.remove(cell.mesh);
    const dispose = m => {
      if (!m) return;
      m.dispose();
    };
    if (Array.isArray(cell.mesh.material)) cell.mesh.material.forEach(dispose);
    else dispose(cell.mesh.material);
    cell.edgeMat.dispose();
  }
  clearTextureCache();
}
