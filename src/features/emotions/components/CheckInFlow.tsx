import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { BodyZone, ChildProfile, EmotionLog, EmotionSettings } from '../../../domain/models';
import { cx } from '../../../ui/cx';
import { translate, translateDynamic, Language } from '../../../i18n/dictionary';
import { reminderService } from '../../../services/ReminderService';
import { Owl } from '../art/Owl';
import { CloudGlyph } from '../art/CloudGlyph';
import { emotionById, emotionsForLevel, EmotionDef } from '../domain/catalog';
import { childLevel } from '../domain/level';
import { makeCheckIn, suggestStrategies, SuggestedStrategy } from '../domain/checkin';
import { emotionRepository } from '../persistence/emotionRepository';
import { StrategyCard } from './StrategyCard';

interface CheckInFlowProps {
  language: Language;
  profile: ChildProfile;
  settings: EmotionSettings;
  /** Leaves the check-in (back to the emotions hub) */
  onDone: () => void;
  onOpenCalm: () => void;
}

type Step = 'emotion' | 'intensity' | 'body' | 'response';

const BODY_ZONES: BodyZone[] = ['head', 'throat', 'heart', 'belly', 'hands', 'legs'];

const say = (text: string, language: Language) =>
  reminderService.triggerVoiceReminder(text, language === 'fr' ? 'fr-FR' : 'en-US');

const emotionLabel = (e: EmotionDef, language: Language) => translateDynamic(`emo.emotion.${e.id}`, language);

/**
 * "Météo intérieure": recognise and name the feeling (the owl shows it),
 * how strong it is (from 6), where it is felt in the body (optional), then a
 * reply: savour a pleasant feeling, or validate an unpleasant one and offer
 * two of the child's strategies and the calm corner. Saved from the first
 * step; no reward of any kind.
 */
export const CheckInFlow: React.FC<CheckInFlowProps> = ({ language, profile, settings, onDone, onOpenCalm }) => {
  const level = childLevel(profile);
  const emotions = useMemo(() => emotionsForLevel(level), [level]);
  const [step, setStep] = useState<Step>('emotion');
  const [emotionId, setEmotionId] = useState<string | null>(null);
  const [intensity, setIntensity] = useState<1 | 2 | 3 | null>(null);
  const [zones, setZones] = useState<BodyZone[]>([]);
  const [tried, setTried] = useState<string[]>([]);
  const log = useRef<EmotionLog | null>(null);
  const emotion = emotionById(emotionId ?? undefined);

  const suggestions = useMemo(
    () => suggestStrategies(level, profile.emotions?.helpful, settings.customStrategies, { count: 2 }),
    // Fixed for this check-in: marking "it helps" must not reshuffle the cards under the finger
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [level, emotionId]
  );

  useEffect(() => {
    say(translate('emo.checkin.ask', language, { name: profile.name }), language);
  }, [language, profile.name]);

  const save = (changes: Partial<EmotionLog>) => {
    if (!log.current) return;
    log.current = { ...log.current, ...changes };
    emotionRepository.updateLog(log.current.id, changes).catch((err) => console.error('Could not update the check-in', err));
  };

  const pickEmotion = (e: EmotionDef) => {
    setEmotionId(e.id);
    say(emotionLabel(e, language), language);
    if (!log.current) {
      log.current = makeCheckIn(Date.now(), profile.id, e.id);
      emotionRepository.addLog(log.current).catch((err) => console.error('Could not save the check-in', err));
    } else {
      save({ emotionId: e.id });
    }
  };

  const goToReply = () => {
    setStep('response');
    if (emotion) say(translateDynamic(`emo.checkin.validate.${emotion.family}`, language), language);
  };

  const tryStrategy = (s: SuggestedStrategy) => {
    say(s.kind === 'custom' ? s.label : translateDynamic(`emo.strategy.${s.id}.how`, language), language);
    if (!tried.includes(s.id)) {
      const next = [...tried, s.id];
      setTried(next);
      save({ strategyIds: next });
    }
  };

  const continueButton = (onClick: () => void, disabled = false, testId?: string) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      className="min-h-[60px] px-8 rounded-full bg-[#9EE6D8] text-[#16302B] text-xl font-extrabold disabled:opacity-40"
    >
      {translate('emo.checkin.next', language)}
    </button>
  );

  return (
    <div className="w-full flex flex-col items-center gap-4 sm:gap-5" data-testid="checkin" data-step={step}>
      {step === 'emotion' && (
        <>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-center">{translate('emo.checkin.ask', language, { name: profile.name })}</h2>
          <div
            className={cx(
              'w-full grid gap-2.5 sm:gap-3',
              level === 1 ? 'grid-cols-3' : level === 2 ? 'grid-cols-3 sm:grid-cols-4' : 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6'
            )}
            data-testid="checkin-emotions"
          >
            {emotions.map((e) => {
              const selected = emotionId === e.id;
              return (
                <button
                  key={e.id}
                  type="button"
                  aria-pressed={selected}
                  data-testid={`emotion-${e.id}`}
                  onClick={() => pickEmotion(e)}
                  style={{ borderColor: selected ? e.color : undefined }}
                  className={cx(
                    'rounded-3xl border-[3px] flex flex-col items-center justify-center gap-1 px-1 py-2 transition-colors',
                    selected ? 'bg-white/15' : 'bg-white/5 border-white/10 hover:bg-white/10'
                  )}
                >
                  <Owl
                    family={e.family}
                    color={e.color}
                    moon="soft"
                    className={level === 1 ? 'w-24 h-28 sm:w-28 sm:h-32' : level === 2 ? 'w-16 h-[4.6rem] sm:w-20 sm:h-[5.75rem]' : 'w-14 h-16'}
                  />
                  <span className={cx('font-semibold leading-tight text-center', level === 3 ? 'text-sm' : 'text-base sm:text-lg')}>
                    {emotionLabel(e, language)}
                  </span>
                </button>
              );
            })}
          </div>
          {continueButton(() => setStep(level >= 2 ? 'intensity' : 'body'), !emotion, 'checkin-next')}
        </>
      )}

      {step === 'intensity' && emotion && (
        <>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-center">{translate('emo.checkin.intensity', language)}</h2>
          <div className="flex items-end justify-center gap-3 sm:gap-6" data-testid="checkin-intensity">
            {([1, 2, 3] as const).map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={intensity === n}
                data-testid={`intensity-${n}`}
                onClick={() => {
                  setIntensity(n);
                  save({ intensity: n });
                  say(translateDynamic(`emo.checkin.intensity.${n}`, language), language);
                }}
                className={cx(
                  'rounded-3xl border-[3px] flex flex-col items-center gap-2 px-3 py-3 min-w-[6.5rem] transition-colors',
                  intensity === n ? 'bg-white/15 border-[#F4F1FF]' : 'bg-white/5 border-white/10 hover:bg-white/10'
                )}
              >
                <Owl family={emotion.family} color={emotion.color} moon="soft" className={['w-14 h-16', 'w-20 h-[5.75rem]', 'w-28 h-32'][n - 1]} />
                <span className="text-lg font-semibold">{translateDynamic(`emo.checkin.intensity.${n}`, language)}</span>
              </button>
            ))}
          </div>
          {continueButton(() => setStep('body'), intensity === null, 'checkin-next')}
        </>
      )}

      {step === 'body' && emotion && (
        <>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-center">{translate('emo.checkin.body', language)}</h2>
          <p className="text-[#C9C3E6] text-lg -mt-2">{translate('emo.checkin.body_hint', language)}</p>
          <BodyMap
            zones={zones}
            color={emotion.color}
            language={language}
            onToggle={(z) => {
              const next = zones.includes(z) ? zones.filter((x) => x !== z) : [...zones, z];
              setZones(next);
              save({ bodyZones: next });
              if (!zones.includes(z)) say(translateDynamic(`emo.body.${z}`, language), language);
            }}
          />
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={goToReply}
              data-testid="checkin-skip"
              className="min-h-[52px] px-6 rounded-full border border-white/20 bg-white/5 text-lg font-semibold"
            >
              {translate('emo.checkin.skip', language)}
            </button>
            {continueButton(goToReply, zones.length === 0, 'checkin-next')}
          </div>
        </>
      )}

      {step === 'response' && emotion && (
        <section className="w-full flex flex-col items-center gap-4 text-center" data-testid="checkin-response" data-pleasant={emotion.pleasant}>
          <Owl family={emotion.family} color={emotion.color} className="w-36 h-40 sm:w-44 sm:h-52" label={emotionLabel(emotion, language)} />
          <p className="text-2xl sm:text-3xl font-extrabold">
            {emotionLabel(emotion, language)}
          </p>
          <p className="text-lg sm:text-xl text-[#C9C3E6] max-w-2xl">{translateDynamic(`emo.checkin.validate.${emotion.family}`, language)}</p>

          {!emotion.pleasant && (
            <div className="w-full flex flex-col gap-3 mt-1">
              <h3 className="text-xl font-extrabold">{translate('emo.checkin.try', language)}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {suggestions.map((s) => (
                  <StrategyCard
                    key={s.id}
                    strategy={s}
                    language={language}
                    helpful={profile.emotions?.helpful.includes(s.id) ?? false}
                    active={tried.includes(s.id)}
                    onTry={() => tryStrategy(s)}
                    onToggleHelpful={() => emotionRepository.toggleHelpful(profile.id, s.id)}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={onOpenCalm}
                data-testid="checkin-calm"
                className="self-center flex items-center gap-3 min-h-[56px] pl-3 pr-6 rounded-full bg-[#E8E4FF]/10 border border-[#E8E4FF]/25 text-lg font-bold"
              >
                <CloudGlyph className="w-11 h-9" />
                {translate('emo.checkin.calm_link', language)}
              </button>
            </div>
          )}
          {emotion.pleasant && <p className="text-xl font-bold text-[#FFD166]">{translate('emo.checkin.tell_someone', language)}</p>}

          <button
            type="button"
            data-testid="checkin-finish"
            onClick={() => {
              say(translate('emo.checkin.thanks', language), language);
              onDone();
            }}
            className="min-h-[60px] px-8 rounded-full bg-[#9EE6D8] text-[#16302B] text-xl font-extrabold mt-2"
          >
            {translate('emo.checkin.finish', language)}
          </button>
        </section>
      )}
    </div>
  );
};

/* Where is it felt: a simple child silhouette with 6 tappable zones */
const ZONE_SPOTS: Record<BodyZone, { x: number; y: number }[]> = {
  head: [{ x: 50, y: 15 }],
  throat: [{ x: 50, y: 28.5 }],
  heart: [{ x: 50, y: 40.5 }],
  belly: [{ x: 50, y: 56 }],
  hands: [{ x: 17, y: 63 }, { x: 83, y: 63 }],
  legs: [{ x: 50, y: 82 }],
};

const BodyMap: React.FC<{ zones: BodyZone[]; color: string; language: Language; onToggle: (z: BodyZone) => void }> = ({
  zones,
  color,
  language,
  onToggle,
}) => {
  const fill = (z: BodyZone) => (zones.includes(z) ? color : 'rgba(232,228,255,0.18)');
  return (
    <div className="relative w-56 sm:w-64 aspect-[2/3]" data-testid="checkin-body">
      <svg viewBox="0 0 200 300" className="absolute inset-0 w-full h-full" aria-hidden="true">
        <g stroke="#E8E4FF" strokeWidth="3" strokeOpacity="0.5">
          <path d="M62 100 Q34 130 34 190" fill="none" strokeWidth="18" strokeLinecap="round" stroke="rgba(232,228,255,0.18)" />
          <path d="M138 100 Q166 130 166 190" fill="none" strokeWidth="18" strokeLinecap="round" stroke="rgba(232,228,255,0.18)" />
          <rect x="58" y="92" width="84" height="110" rx="32" fill="rgba(232,228,255,0.12)" />
          <rect x="70" y="196" width="26" height="86" rx="13" fill={fill('legs')} />
          <rect x="104" y="196" width="26" height="86" rx="13" fill={fill('legs')} />
          <circle cx="34" cy="192" r="14" fill={fill('hands')} />
          <circle cx="166" cy="192" r="14" fill={fill('hands')} />
          <rect x="88" y="76" width="24" height="18" rx="7" fill={fill('throat')} />
          <circle cx="100" cy="44" r="32" fill={fill('head')} />
          <path d="M100 137 C86 126 84 112 94 110 C98 109 100 112 100 115 C100 112 102 109 106 110 C116 112 114 126 100 137 Z" fill={fill('heart')} />
          <ellipse cx="100" cy="168" rx="30" ry="22" fill={fill('belly')} />
        </g>
      </svg>
      {BODY_ZONES.flatMap((z) =>
        ZONE_SPOTS[z].map((spot, i) => (
          <button
            key={`${z}-${i}`}
            type="button"
            aria-pressed={zones.includes(z)}
            aria-label={translateDynamic(`emo.body.${z}`, language)}
            aria-hidden={i > 0 ? true : undefined}
            tabIndex={i > 0 ? -1 : undefined}
            data-testid={i === 0 ? `zone-${z}` : undefined}
            onClick={() => onToggle(z)}
            className="absolute w-[24%] aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#F4F1FF]"
            style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
          />
        ))
      )}
    </div>
  );
};
