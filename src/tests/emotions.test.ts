import { describe, it, expect } from 'vitest';
import { translations } from '../i18n/dictionary';
import { EMOTIONS, EMOTION_FAMILIES, FAMILY_COLORS, STRATEGIES, emotionsForLevel, strategiesForLevel, DEFAULT_SUGGESTIONS } from '../features/emotions/domain/catalog';
import { ageLevel, childLevel } from '../features/emotions/domain/level';
import { localDate, makeCalmLog, makeCheckIn, suggestStrategies, toggleHelpful } from '../features/emotions/domain/checkin';
import { emotionSettings } from '../features/emotions/domain/settings';
import { DEFAULT_EMOTIONS } from '../domain/models';

const keys = (lang: 'fr' | 'en') => new Set(Object.keys(translations[lang]));

describe('Emotions — catalog', () => {
  it('has 6, 12 and 24 emotions for the three age levels, with unique ids and a known family', () => {
    expect(emotionsForLevel(1)).toHaveLength(6);
    expect(emotionsForLevel(2)).toHaveLength(12);
    expect(emotionsForLevel(3)).toHaveLength(24);
    expect(new Set(EMOTIONS.map((e) => e.id)).size).toBe(EMOTIONS.length);
    for (const e of EMOTIONS) {
      expect(EMOTION_FAMILIES).toContain(e.family);
      expect(e.color).toMatch(/^#[0-9A-F]{6}$/i);
    }
    // Level 1 is exactly one emotion per family, in its base color
    expect(emotionsForLevel(1).map((e) => e.family).sort()).toEqual([...EMOTION_FAMILIES].sort());
    for (const e of emotionsForLevel(1)) expect(e.color).toBe(FAMILY_COLORS[e.family]);
  });

  it('gives every strategy a label and a spoken instruction in French and English', () => {
    expect(new Set(STRATEGIES.map((s) => s.id)).size).toBe(STRATEGIES.length);
    for (const lang of ['fr', 'en'] as const) {
      const k = keys(lang);
      for (const s of STRATEGIES) {
        expect(k, `${lang} emo.strategy.${s.id}`).toContain(`emo.strategy.${s.id}`);
        expect(k, `${lang} emo.strategy.${s.id}.how`).toContain(`emo.strategy.${s.id}.how`);
      }
    }
  });

  it('names every emotion, family reply and body zone in French and English', () => {
    for (const lang of ['fr', 'en'] as const) {
      const k = keys(lang);
      for (const e of EMOTIONS) expect(k, `${lang} emo.emotion.${e.id}`).toContain(`emo.emotion.${e.id}`);
      for (const f of EMOTION_FAMILIES) expect(k, `${lang} validate.${f}`).toContain(`emo.checkin.validate.${f}`);
      for (const z of ['head', 'throat', 'heart', 'belly', 'hands', 'legs']) expect(k).toContain(`emo.body.${z}`);
      for (const n of [1, 2, 3]) expect(k).toContain(`emo.checkin.intensity.${n}`);
    }
  });

  it('only suggests by default strategies the level allows', () => {
    for (const level of [1, 2, 3] as const) {
      const allowed = strategiesForLevel(level).map((s) => s.id);
      for (const id of DEFAULT_SUGGESTIONS[level]) expect(allowed).toContain(id);
    }
  });

  it('has the same emo.* keys in French and English', () => {
    const fr = [...keys('fr')].filter((k) => k.startsWith('emo.') || k.startsWith('parent.emotions.'));
    const en = keys('en');
    for (const k of fr) expect(en, k).toContain(k);
  });
});

describe('Emotions — age level', () => {
  it('maps ages to levels, unknown age to the middle level', () => {
    expect(ageLevel(3)).toBe(1);
    expect(ageLevel(5)).toBe(1);
    expect(ageLevel(6)).toBe(2);
    expect(ageLevel(8)).toBe(2);
    expect(ageLevel(9)).toBe(3);
    expect(ageLevel(11)).toBe(3);
    expect(ageLevel(undefined)).toBe(2);
  });

  it("prefers the parent's choice over the age", () => {
    expect(childLevel({ age: 4 })).toBe(1);
    expect(childLevel({ age: 4, emotions: { level: 3, helpful: [] } })).toBe(3);
    expect(childLevel(null)).toBe(2);
  });
});

describe('Emotions — suggestions and toolbox', () => {
  it('offers what helps the child first, then the defaults of their level', () => {
    expect(suggestStrategies(1).map((s) => s.id)).toEqual(['squeeze_pillow', 'wet_dog']);
    expect(suggestStrategies(1, ['draw']).map((s) => s.id)).toEqual(['draw', 'squeeze_pillow']);
  });

  it('never offers a built-in strategy above the child level, even if marked helpful', () => {
    const ids = suggestStrategies(1, ['countdown', 'five_things'], [], { count: 4 }).map((s) => s.id);
    expect(ids).not.toContain('countdown');
    expect(ids).not.toContain('five_things');
    expect(ids).toHaveLength(4);
  });

  it("includes the parent's own strategies, and leaves out excluded ones", () => {
    const custom = [{ id: 'cat', icon: '🐈', label: 'Aller voir le chat' }];
    const result = suggestStrategies(2, [], custom, { count: 2, exclude: ['squeeze_pillow'] });
    expect(result[0]).toEqual({ kind: 'custom', id: 'cat', icon: '🐈', label: 'Aller voir le chat' });
    expect(result[1].id).toBe('five_things');
  });

  it('toggles a helpful strategy, most recent first', () => {
    expect(toggleHelpful([], 'draw')).toEqual(['draw']);
    expect(toggleHelpful(['draw'], 'jumps')).toEqual(['jumps', 'draw']);
    expect(toggleHelpful(['jumps', 'draw'], 'draw')).toEqual(['jumps']);
  });
});

describe('Emotions — logs and settings', () => {
  it('records a calm corner session with its local date, without a child from the home screen', () => {
    const at = new Date(2026, 10, 11, 23, 30).getTime();
    const log = makeCalmLog(at, { breaths: 4, nextAction: 'adult' });
    expect(log).toMatchObject({ kind: 'calm', at, date: '2026-11-11', breaths: 4, nextAction: 'adult' });
    expect(log).not.toHaveProperty('childId');
    expect(makeCalmLog(at, { childId: 'leo', breaths: 2 }).childId).toBe('leo');
    expect(makeCalmLog(at, { breaths: 1 }).id).not.toBe(log.id);
    expect(localDate(new Date(2026, 0, 5, 0, 1).getTime())).toBe('2026-01-05');
  });

  it('records a check-in for the child, with the emotion they picked', () => {
    const at = new Date(2026, 10, 11, 20, 0).getTime();
    expect(makeCheckIn(at, 'leo', 'anger')).toMatchObject({ kind: 'checkin', childId: 'leo', emotionId: 'anger', at, date: '2026-11-11' });
  });

  it('fills missing emotions settings with the defaults', () => {
    expect(emotionSettings(undefined)).toEqual(DEFAULT_EMOTIONS);
    expect(emotionSettings({ emotions: { ...DEFAULT_EMOTIONS, adultName: 'Maman' } }).adultName).toBe('Maman');
  });
});
