import { describe, it, expect } from 'vitest';
import { isLowEndDevice, resolveVisuals } from '../services/performance';

describe('Lite display', () => {
  it('detects weak devices from memory first, core count as a fallback', () => {
    expect(isLowEndDevice({ deviceMemory: 1, cores: 4 })).toBe(true); // Galaxy Tab A 9.7 (1.5 GB)
    expect(isLowEndDevice({ deviceMemory: 2, cores: 8 })).toBe(true);
    expect(isLowEndDevice({ deviceMemory: 4, cores: 4 })).toBe(false);
    expect(isLowEndDevice({ cores: 2 })).toBe(true);
    expect(isLowEndDevice({ cores: 4 })).toBe(false); // many fast phones have 4 cores
    expect(isLowEndDevice({})).toBe(false);
  });

  it("follows the parent's choice, or the device class in auto", () => {
    expect(resolveVisuals('lite', false)).toBe('lite');
    expect(resolveVisuals('rich', true)).toBe('rich');
    expect(resolveVisuals('auto', true)).toBe('lite');
    expect(resolveVisuals('auto', false)).toBe('rich');
    expect(resolveVisuals(undefined, true)).toBe('lite');
  });
});
