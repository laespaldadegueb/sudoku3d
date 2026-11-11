export const THEMES = {
  novell: {
    name: 'Cristall matí',
    accent: '#c27a25',
    cell: {
      fixed: '#3a4a80',
      filled: '#2d6a55',
      selected: '#c27a25',
      conflict: '#8a2a2a',
      conflictFixed: '#6a2838',
      emptyColor: 0x1a2040,
      emptyOpacity: 0.25,
      selectedEmptyColor: 0xffb84d,
      selectedEmptyEmissive: 0x553300,
    },
    edge: { normal: 0x6a7bc0, conflict: 0xff3030, opacity: 0.5, highlight: 0x8090d0 },
    bloom: { strength: 0.35, radius: 0.5, threshold: 0.75 },
  },
  experimentat: {
    name: 'Neó nit',
    accent: '#e04a9d',
    cell: {
      fixed: '#7a3390',
      filled: '#2a4ea0',
      selected: '#e04a9d',
      conflict: '#c22a4a',
      conflictFixed: '#8a2838',
      emptyColor: 0x1a1a40,
      emptyOpacity: 0.22,
      selectedEmptyColor: 0xff80cc,
      selectedEmptyEmissive: 0x882055,
    },
    edge: { normal: 0x8a6ac0, conflict: 0xff4080, opacity: 0.6, highlight: 0xc080c0 },
    bloom: { strength: 0.7, radius: 0.6, threshold: 0.6 },
  },
  avancat: {
    name: 'Obsidiana',
    accent: '#d8a040',
    cell: {
      fixed: '#2a2a2a',
      filled: '#1a1a1a',
      selected: '#b89040',
      conflict: '#5a1a1a',
      conflictFixed: '#3a1818',
      emptyColor: 0x0f0f14,
      emptyOpacity: 0.3,
      selectedEmptyColor: 0xd8a040,
      selectedEmptyEmissive: 0x332200,
    },
    edge: { normal: 0x6a6a7a, conflict: 0xcc3030, opacity: 0.7, highlight: 0x9090a0 },
    bloom: { strength: 0.45, radius: 0.4, threshold: 0.7 },
  },
  expert: {
    name: 'Plasma',
    accent: '#e05c3a',
    cell: {
      fixed: '#4a1a7a',
      filled: '#1a4a7a',
      selected: '#e05c3a',
      conflict: '#aa2060',
      conflictFixed: '#7a1a40',
      emptyColor: 0x151030,
      emptyOpacity: 0.18,
      selectedEmptyColor: 0xcc70ff,
      selectedEmptyEmissive: 0x5a2060,
    },
    edge: { normal: 0x8070e0, conflict: 0xff5050, opacity: 0.8, highlight: 0xb0a0f0 },
    bloom: { strength: 1.0, radius: 0.7, threshold: 0.45 },
  },
  zenPaper: {
    name: 'Zen Paper',
    accent: '#c06040',
    cell: {
      fixed: '#342820',
      filled: '#c06040',
      selected: '#f0d8d0',
      conflict: '#8a2020',
      conflictFixed: '#6a1818',
      emptyColor: 0xe8e4de,
      emptyOpacity: 0.55,
      selectedEmptyColor: 0xf8e8e0,
      selectedEmptyEmissive: 0x200800,
    },
    edge: { normal: 0xb8a898, conflict: 0xcc4040, opacity: 0.7, highlight: 0xc06040 },
    bloom: { strength: 0.08, radius: 0.3, threshold: 0.9 },
  },
  contrast: {
    name: 'Alt contrast',
    accent: '#ffff00',
    cell: {
      fixed: '#ffffff', filled: '#00ff00', selected: '#ffff00',
      conflict: '#ff0000', conflictFixed: '#ff4444',
      emptyColor: 0x000000, emptyOpacity: 0.9,
      selectedEmptyColor: 0xffff00, selectedEmptyEmissive: 0x444400,
      noteColor: '#ffffff',
    },
    edge: { normal: 0xffffff, conflict: 0xff0000, opacity: 1.0, highlight: 0xffff00 },
    bloom: { strength: 0, radius: 0, threshold: 1 },
  },
};

let currentTheme = THEMES.novell;

export function setTheme(id) {
  currentTheme = THEMES[id] || THEMES.novell;
}

export function getTheme() {
  return currentTheme;
}
