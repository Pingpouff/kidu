import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChildProfile, EmotionSettings } from '../../../domain/models';
import { Overlay } from '../../../ui/Overlay';
import { cx } from '../../../ui/cx';
import { translate, translateDynamic, Language } from '../../../i18n/dictionary';
import { reminderService } from '../../../services/ReminderService';
import { Cloud, BreathPhase } from '../art/Cloud';
import { childLevel } from '../domain/level';
import { makeCalmLog, suggestStrategies, SuggestedStrategy } from '../domain/checkin';
import { CALM_BREATHS, EXHALE_MS, INHALE_MS } from '../domain/settings';
import { emotionRepository } from '../persistence/emotionRepository';

interface CalmCornerProps {
  language: Language;
  /** The child, when opened from their board (their helpful strategies come first) */
  profile?: ChildProfile | null;
  settings: EmotionSettings;
  onClose: () => void;
}

type Stage = 'intro' | 'breathing' | 'next' | 'bye';

/** Breathing strategies are not offered right after breathing; "hug" is covered by "go and see…" */
const NOT_AFTER_BREATHING = ['hug', 'flower_candle', 'balloon_belly'];

const strategyLabel = (s: SuggestedStrategy, language: Language) =>
  s.kind === 'custom' ? s.label : translateDynamic(`emo.strategy.${s.id}`, language);
const strategyHow = (s: SuggestedStrategy, language: Language) =>
  s.kind === 'custom' ? s.label : translateDynamic(`emo.strategy.${s.id}.how`, language);

/**
 * "Coin calme": a short breathing moment with the cloud, then always back to
 * real life (a grown-up first, then two of the child's strategies). About a
 * minute; "one more breath" once at most — a springboard, not a pacifier.
 * Saved as an EmotionLog when it closes; never rewarded.
 */
const CalmCorner: React.FC<CalmCornerProps> = ({ language, profile, settings, onClose }) => {
  const [stage, setStage] = useState<Stage>('intro');
  const [phase, setPhase] = useState<BreathPhase>('idle');
  const [breath, setBreath] = useState(0); // current breath, 0-based
  const [totalBreaths, setTotalBreaths] = useState(CALM_BREATHS);
  const [againUsed, setAgainUsed] = useState(false);
  const [chosen, setChosen] = useState<{ id: string; icon: string; label: string } | null>(null);
  const breathsDone = useRef(0);
  const nextAction = useRef<string | undefined>(undefined);
  const finished = useRef(false);
  const alive = useRef(true);

  const adult = settings.adultName.trim() || translate('emo.adult_default', language);
  const suggestions = useMemo(
    () =>
      suggestStrategies(childLevel(profile), profile?.emotions?.helpful, settings.customStrategies, {
        count: 2,
        exclude: NOT_AFTER_BREATHING,
      }),
    [profile, settings.customStrategies]
  );

  // Latest callbacks / child in refs: `finish` stays the same function, so a
  // re-render of the app doesn't restart the auto-close timer below
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const childIdRef = useRef(profile?.id);
  childIdRef.current = profile?.id;

  const finish = useCallback(() => {
    if (!finished.current) {
      finished.current = true;
      reminderService.stopSpeaking();
      if (breathsDone.current > 0 || nextAction.current) {
        emotionRepository
          .addLog(makeCalmLog(Date.now(), { childId: childIdRef.current, breaths: breathsDone.current, nextAction: nextAction.current }))
          .catch((err) => console.error('Could not save the calm corner session', err));
      }
    }
    onCloseRef.current();
  }, []);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      reminderService.stopSpeaking();
    };
  }, []);

  // Intro: the cloud says it is here, then the breathing starts
  useEffect(() => {
    if (stage !== 'intro') return;
    let cancelled = false;
    const start = () => {
      if (cancelled || !alive.current) return;
      setStage('breathing');
      setPhase('inhale');
    };
    const timeout = new Promise((resolve) => setTimeout(resolve, 7_000));
    Promise.race([reminderService.speakAndWait(translate('emo.calm.intro_spoken', language), language, 1_000), timeout]).then(() =>
      setTimeout(start, 600)
    );
    return () => {
      cancelled = true;
    };
  }, [stage, language]);

  // Breathing: inhale → exhale → next breath, a soft chime at each change
  useEffect(() => {
    if (stage !== 'breathing' || phase === 'idle') return;
    reminderService.playSoftChime(phase === 'inhale' ? 'in' : 'out');
    // Spoken cues on the first breath only, for children who can't read yet
    if (breath === 0) {
      reminderService.triggerVoiceReminder(
        translate(phase === 'inhale' ? 'emo.calm.inhale' : 'emo.calm.exhale', language),
        language === 'fr' ? 'fr-FR' : 'en-US'
      );
    }
    const timer = setTimeout(
      () => {
        if (phase === 'inhale') {
          setPhase('exhale');
          return;
        }
        breathsDone.current += 1;
        if (breath + 1 < totalBreaths) {
          setBreath(breath + 1);
          setPhase('inhale');
        } else {
          setPhase('idle');
          setStage('next');
        }
      },
      phase === 'inhale' ? INHALE_MS : EXHALE_MS
    );
    return () => clearTimeout(timer);
  }, [stage, phase, breath, totalBreaths, language]);

  // "Next, in real life": spoken once
  useEffect(() => {
    if (stage === 'next') reminderService.triggerVoiceReminder(translate('emo.calm.next_spoken', language), language === 'fr' ? 'fr-FR' : 'en-US');
  }, [stage, language]);

  // The child has gone back to real life: the screen closes by itself
  useEffect(() => {
    if (stage !== 'bye') return;
    const timer = setTimeout(finish, 20_000);
    return () => clearTimeout(timer);
  }, [stage, finish]);

  const choose = (option: { id: string; icon: string; label: string; spoken: string }) => {
    nextAction.current = option.id;
    setChosen(option);
    setStage('bye');
    reminderService.triggerVoiceReminder(option.spoken, language === 'fr' ? 'fr-FR' : 'en-US');
  };

  const oneMoreBreath = () => {
    setAgainUsed(true);
    setTotalBreaths((n) => n + 1);
    setBreath((b) => b + 1);
    setStage('breathing');
    setPhase('inhale');
  };

  const breathing = stage === 'intro' || stage === 'breathing';
  const phaseText =
    stage === 'intro'
      ? translate('emo.calm.intro_spoken', language)
      : translate(phase === 'exhale' ? 'emo.calm.exhale' : 'emo.calm.inhale', language);
  const phaseHint = stage === 'intro' ? '' : translate(phase === 'exhale' ? 'emo.calm.exhale_hint' : 'emo.calm.inhale_hint', language);

  return (
    <Overlay
      layer="dialog"
      aria-label={translate('emo.calm.title', language)}
      onClose={finish}
      className="emo-twilight flex flex-col screen-h overflow-y-auto overflow-x-hidden select-none"
      data-testid="calm-corner"
      data-stage={stage}
    >
      <div className="w-full max-w-3xl mx-auto flex-1 flex flex-col items-center gap-3 sm:gap-4 p-4 sm:p-7">
        {/* Top bar */}
        <div className="w-full flex items-center justify-between gap-3">
          <span className="text-base sm:text-lg font-semibold text-[#C9C3E6]">{translate('emo.calm.title', language)}</span>
          {breathing && (
            <div
              className="flex gap-2"
              role="img"
              aria-label={translate('emo.calm.breath_of', language, { n: Math.min(breath + 1, totalBreaths), total: totalBreaths })}
              data-testid="calm-dots"
            >
              {Array.from({ length: totalBreaths }, (_, i) => (
                <span
                  key={i}
                  className={cx(
                    'w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full transition-colors duration-500',
                    i < breathsDone.current ? 'bg-[#9EE6D8]' : i === breath && stage === 'breathing' ? 'bg-[#F4F1FF]' : 'bg-white/20'
                  )}
                />
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={breathing ? () => setStage('next') : finish}
            data-testid="calm-done"
            className="min-h-[48px] px-5 rounded-full border border-white/20 bg-white/5 text-[#F4F1FF] text-base font-semibold hover:bg-white/10"
          >
            {breathing ? translate('emo.calm.done', language) : translate('btn.close', language)}
          </button>
        </div>

        <Cloud
          phase={breathing ? phase : 'idle'}
          breath={breath}
          inhaleSeconds={INHALE_MS / 1000}
          exhaleSeconds={EXHALE_MS / 1000}
          className={cx('w-full transition-all duration-700', breathing ? 'max-w-[34rem] mt-2 sm:mt-6' : 'max-w-[13rem]')}
        />

        {breathing && (
          <div className="flex flex-col items-center gap-2 text-center mt-auto mb-auto">
            <p className="text-3xl sm:text-4xl md:text-5xl font-extrabold" aria-live="polite" data-testid="calm-phase-text">
              {phaseText}
            </p>
            {phaseHint && <p className="text-lg sm:text-xl text-[#C9C3E6]">{phaseHint}</p>}
          </div>
        )}

        {stage === 'next' && (
          <section className="w-full flex flex-col gap-3 sm:gap-4 mt-2" data-testid="calm-next">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-center">{translate('emo.calm.next_title', language)}</h2>
            <button
              type="button"
              data-testid="calm-option-adult"
              onClick={() =>
                choose({
                  id: 'adult',
                  icon: '🤗',
                  label: translate('emo.calm.go_adult', language, { adult }),
                  spoken: translate('emo.calm.go_adult_spoken', language, { adult }),
                })
              }
              className="min-h-[72px] rounded-3xl bg-[#9EE6D8] text-[#16302B] text-xl sm:text-2xl font-extrabold px-5 flex items-center justify-center gap-3"
            >
              <span aria-hidden="true">🤗</span>
              {translate('emo.calm.go_adult', language, { adult })}
            </button>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  data-testid={`calm-option-${s.id}`}
                  onClick={() => choose({ id: s.id, icon: s.icon, label: strategyLabel(s, language), spoken: strategyHow(s, language) })}
                  className="min-h-[72px] rounded-3xl border border-white/20 bg-white/5 hover:bg-white/10 text-lg sm:text-xl font-semibold px-5 py-3 flex items-center gap-3 text-left"
                >
                  <span className="text-3xl shrink-0" aria-hidden="true">{s.icon}</span>
                  {strategyLabel(s, language)}
                </button>
              ))}
            </div>
            {!againUsed && (
              <button
                type="button"
                data-testid="calm-again"
                onClick={oneMoreBreath}
                className="self-center min-h-[48px] px-5 rounded-full text-[#C9C3E6] text-base font-semibold underline underline-offset-4 decoration-white/30 hover:text-[#F4F1FF]"
              >
                {translate('emo.calm.again', language)}
              </button>
            )}
          </section>
        )}

        {stage === 'bye' && chosen && (
          <section className="w-full flex flex-col items-center gap-4 text-center mt-4" data-testid="calm-bye">
            <span className="text-6xl" aria-hidden="true">{chosen.icon}</span>
            <p className="text-2xl sm:text-3xl font-extrabold">{chosen.label}</p>
            <p className="text-lg sm:text-xl text-[#C9C3E6]">{translate('emo.calm.goodbye', language)}</p>
          </section>
        )}
      </div>
    </Overlay>
  );
};

export default CalmCorner;
