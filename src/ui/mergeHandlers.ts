/** Merges event handler objects: handlers for the same event all run, in order. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Handlers = Record<string, ((...args: any[]) => void) | undefined>;

export function mergeHandlers(...all: Handlers[]): Handlers {
  const merged: Handlers = {};
  for (const handlers of all) {
    for (const [name, fn] of Object.entries(handlers)) {
      if (!fn) continue;
      const previous = merged[name];
      merged[name] = previous ? (...args) => { previous(...args); fn(...args); } : fn;
    }
  }
  return merged;
}
