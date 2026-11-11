export function createHistory() {
  const stack = [];
  let cursor = 0;

  return {
    push(move) {
      stack.length = cursor;
      stack.push(move);
      cursor = stack.length;
    },
    undo() {
      if (cursor === 0) return null;
      cursor--;
      return stack[cursor];
    },
    redo() {
      if (cursor === stack.length) return null;
      const m = stack[cursor];
      cursor++;
      return m;
    },
    reset() {
      stack.length = 0;
      cursor = 0;
    },
    canUndo() { return cursor > 0; },
    canRedo() { return cursor < stack.length; },
  };
}
