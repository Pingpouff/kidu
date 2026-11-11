import { DEFAULT_EMOTIONS, EmotionSettings, ParentSettings } from '../../../domain/models';

/** The parent's emotions settings, with defaults for anything missing. */
export function emotionSettings(settings: Pick<ParentSettings, 'emotions'> | undefined | null): EmotionSettings {
  const stored = settings?.emotions;
  return {
    ...DEFAULT_EMOTIONS,
    ...stored,
    customStrategies: stored?.customStrategies ?? DEFAULT_EMOTIONS.customStrategies,
  };
}

/** Breathing rhythm of the calm corner: 4 s in, 6 s out (a longer out-breath slows the heart). */
export const INHALE_MS = 4_000;
export const EXHALE_MS = 6_000;
/** Breaths in a calm corner session; "one more breath" can add one, once. */
export const CALM_BREATHS = 4;
