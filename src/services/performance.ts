import type { VisualsSetting } from '../domain/models';

/** Device hints, injectable for tests. */
export interface DeviceHints {
  /** navigator.deviceMemory, in GB (Chrome / Android only, rounded down to 0.25, 0.5, 1, 2, 4, 8) */
  deviceMemory?: number;
  /** navigator.hardwareConcurrency */
  cores?: number;
}

/**
 * Weak devices (old tablets such as a Galaxy Tab A 9.7, 1.5 GB RAM): blur and
 * looping animations make them lag. Memory is the most reliable hint; core
 * count is only a fallback (many fast phones have 4 cores).
 */
export function isLowEndDevice(hints: DeviceHints = currentHints()): boolean {
  if (hints.deviceMemory !== undefined) return hints.deviceMemory <= 2;
  if (hints.cores !== undefined) return hints.cores <= 2;
  return false;
}

/** What to display: the parent's choice, or the detected device class in 'auto'. */
export function resolveVisuals(setting: VisualsSetting | undefined, lowEnd: boolean): 'rich' | 'lite' {
  if (setting === 'rich' || setting === 'lite') return setting;
  return lowEnd ? 'lite' : 'rich';
}

function currentHints(): DeviceHints {
  if (typeof navigator === 'undefined') return {};
  const nav = navigator as Navigator & { deviceMemory?: number };
  return {
    deviceMemory: typeof nav.deviceMemory === 'number' ? nav.deviceMemory : undefined,
    cores: typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency > 0 ? nav.hardwareConcurrency : undefined,
  };
}

/** True while the lite display is on (class set by App.tsx). */
export function liteVisuals(): boolean {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('lite');
}
