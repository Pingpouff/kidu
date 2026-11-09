import { describe, it, expect, vi } from 'vitest';
import { applyUpdate, FALLBACK_RELOAD_MS, UpdateEnvironment } from '../services/swUpdate';

const env = (waiting: boolean) => {
  let controllerChange: (() => void) | undefined;
  let timer: (() => void) | undefined;
  const e: UpdateEnvironment & { fireControllerChange: () => void; fireTimer: () => void } = {
    registration: { waiting: waiting ? ({} as ServiceWorker) : null },
    skipWaiting: vi.fn(),
    onControllerChange: (l) => (controllerChange = l),
    reload: vi.fn(),
    setTimeout: vi.fn((fn: () => void) => {
      timer = fn;
    }),
    fireControllerChange: () => controllerChange?.(),
    fireTimer: () => timer?.(),
  };
  return e;
};

describe('Applying an update', () => {
  it('activates the waiting worker and reloads once it controls the page', () => {
    const e = env(true);
    expect(applyUpdate(e)).toBe('activating');
    expect(e.skipWaiting).toHaveBeenCalledTimes(1);
    expect(e.reload).not.toHaveBeenCalled();
    e.fireControllerChange();
    e.fireTimer(); // the safety net doesn't reload a second time
    expect(e.reload).toHaveBeenCalledTimes(1);
    expect(e.setTimeout).toHaveBeenCalledWith(expect.any(Function), FALLBACK_RELOAD_MS);
  });

  it('reloads anyway when the worker never takes control', () => {
    const e = env(true);
    applyUpdate(e);
    e.fireTimer();
    expect(e.reload).toHaveBeenCalledTimes(1);
  });

  it('just reloads when the new version is already active (page loaded without a controller)', () => {
    const e = env(false);
    expect(applyUpdate(e)).toBe('reloading');
    expect(e.skipWaiting).not.toHaveBeenCalled();
    expect(e.reload).toHaveBeenCalledTimes(1);
  });
});
