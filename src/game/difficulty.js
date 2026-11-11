export const DIFFICULTIES = {
  beginner: {
    id: 'beginner',
    label: 'Beginner',
    desc: 'Errors marked automatically · no limit',
    badge: 'rec',
    clues: 34,
    cluesPerSize: { 3: 14, 4: 34, 9: 365 },
    clues2d: 45,
    targetTime: 180,
    scoreMult: 1,
    liveValidation: true,
  },
  intermediate: {
    id: 'intermediate',
    label: 'Intermediate',
    desc: 'Errors marked · up to 5 mistakes',
    badge: null,
    clues: 22,
    cluesPerSize: { 3: 9, 4: 22, 9: 255 },
    clues2d: 36,
    targetTime: 300,
    scoreMult: 2,
    liveValidation: true,
  },
  advanced: {
    id: 'advanced',
    label: 'Advanced',
    desc: 'No automatic error detection',
    badge: null,
    clues: 14,
    cluesPerSize: { 3: 6, 4: 14, 9: 160 },
    clues2d: 28,
    targetTime: 480,
    scoreMult: 4,
    liveValidation: false,
  },
  expert: {
    id: 'expert',
    label: 'Expert',
    desc: 'No errors or hints · 3 mistakes = defeat',
    badge: 'hard',
    clues: 10,
    cluesPerSize: { 3: 4, 4: 10, 9: 110 },
    clues2d: 22,
    targetTime: 720,
    scoreMult: 8,
    liveValidation: false,
  },
};

export const DIFFICULTY_ORDER = ['beginner', 'intermediate', 'advanced', 'expert'];

export const COMPLETIONS_TO_UNLOCK = 3;

export function getClues(diffId, n) {
  return DIFFICULTIES[diffId].cluesPerSize[n] ?? DIFFICULTIES[diffId].cluesPerSize[4];
}

export function getClues2d(diffId) {
  return DIFFICULTIES[diffId].clues2d;
}
