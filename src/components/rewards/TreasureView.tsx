import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { ChildProfile } from '../../domain/models';
import { getBadge, getUniverse } from '../../domain/badges';
import {
  collectionProgress,
  itemGradient,
  RANK_ICONS,
  TreasureItem,
  treasureItems,
  treasureRank,
  treasureStats,
} from '../../domain/treasure';
import { translate, Language } from '../../i18n/dictionary';
import { reminderService } from '../../services/ReminderService';
import { fireConfetti, richMotion } from '../../services/effects';

interface TreasureViewProps {
  profile: ChildProfile;
  language: Language;
  onClose: () => void;
}

const SPARKLES = [
  { top: '8%', left: '12%', delay: '0s', size: 'text-2xl' },
  { top: '18%', left: '85%', delay: '0.6s', size: 'text-xl' },
  { top: '42%', left: '6%', delay: '1.2s', size: 'text-lg' },
  { top: '60%', left: '92%', delay: '0.3s', size: 'text-2xl' },
  { top: '80%', left: '18%', delay: '1.6s', size: 'text-xl' },
  { top: '88%', left: '75%', delay: '0.9s', size: 'text-lg' },
  { top: '30%', left: '50%', delay: '2s', size: 'text-base' },
];

const voiceLang = (language: Language) => (language === 'fr' ? 'fr-FR' : 'en-US');

/**
 * Full-screen "My treasure" view: the child opens a chest, then browses
 * everything they won in big (trophies and badges), with their collections.
 * Sounds, voice and animations follow the parent's feedback settings.
 */
export const TreasureView: React.FC<TreasureViewProps> = ({ profile, language, onClose }) => {
  const items = useMemo(() => treasureItems(profile), [profile]);
  const collections = useMemo(() => collectionProgress(profile), [profile]);
  const stats = useMemo(() => treasureStats(profile), [profile]);
  const rank = treasureRank(stats);

  const [phase, setPhase] = useState<'closed' | 'opening' | 'open'>('closed');
  const opened = phase !== 'closed';
  const scroller = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [spin, setSpin] = useState(0);
  const touchStart = useRef<number | null>(null);
  const dateFormat = useMemo(
    () => new Intl.DateTimeFormat(language === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'long' }),
    [language]
  );

  const current: TreasureItem | undefined = items[Math.min(index, items.length - 1)];

  const itemName = useCallback(
    (item: TreasureItem) =>
      item.kind === 'badge' ? getBadge(item.badgeId)?.name[language] ?? '' : translate(`trophy.${item.trophyId}.name`, language),
    [language]
  );

  const openChest = () => {
    if (opened) return;
    setPhase('opening');
    // Let the lid swing open and the light burst before showing the treasures
    setTimeout(() => setPhase('open'), richMotion() ? 1100 : 0);
    reminderService.playChestOpenSound();
    reminderService.triggerVoiceReminder(
      translate(items.length ? 'treasure.spoken_open' : 'treasure.spoken_empty', language).replace('{name}', profile.name),
      voiceLang(language)
    );
    if (items.length) {
      fireConfetti({
        particleCount: 120,
        spread: 120,
        startVelocity: 40,
        origin: { x: 0.5, y: 0.55 },
        colors: ['#facc15', '#fde047', '#f59e0b', '#fbbf24', '#ffffff'],
        shapes: ['circle'],
        zIndex: 130,
      });
    }
  };

  const go = useCallback(
    (delta: number) => {
      if (items.length < 2) return;
      setIndex((i) => (i + delta + items.length) % items.length);
      reminderService.playTreasureSwipeSound();
    },
    [items.length]
  );

  const select = (key: string) => {
    const i = items.findIndex((it) => it.key === key);
    if (i < 0) return;
    setIndex(i);
    reminderService.playTreasureSwipeSound();
  };

  const tapSpotlight = () => {
    if (!current) return;
    setSpin((s) => s + 1);
    reminderService.playTreasureTapSound();
    reminderService.triggerVoiceReminder(itemName(current), voiceLang(language));
    fireConfetti({ particleCount: 35, spread: 60, startVelocity: 25, origin: { x: 0.5, y: 0.4 }, zIndex: 130 });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (!opened && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        openChest();
      } else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const subtitle = (item: TreasureItem): string => {
    if (item.kind === 'trophy') {
      return `🏆 ${translate('treasure.trophy', language)} · ${translate('treasure.won_on', language)} ${dateFormat.format(item.earnedAt)}`;
    }
    const universe = getUniverse(item.universe);
    return `${universe.icon} ${universe.name[language]}`;
  };

  const stat = (icon: string, value: number, label: string, testId: string) => (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15" data-testid={testId}>
      <span className="text-xl">{icon}</span>
      <span className="text-lg font-black text-white">{value}</span>
      <span className="text-xs font-bold text-white/60 hidden sm:inline">{label}</span>
    </div>
  );

  return (
    <div
      role="dialog"
      aria-label={`${translate('treasure.title', language)} ${profile.name}`}
      data-testid="treasure-view"
      ref={scroller}
      className="fixed inset-0 z-[60] treasure-bg overflow-y-auto overflow-x-hidden select-none"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Twinkling sparkles in the background */}
      {SPARKLES.map((s, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={`treasure-sparkle ${s.size}`}
          style={{ top: s.top, left: s.left, animationDelay: s.delay }}
        >
          ✦
        </span>
      ))}

      <button
        onClick={onClose}
        aria-label={translate('btn.close', language)}
        className="fixed top-4 right-4 z-10 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
      >
        <X className="w-7 h-7" />
      </button>

      {phase !== 'open' ? (
        /* Step 1: the closed chest, waiting to be opened */
        <div className="min-h-full flex flex-col items-center justify-center gap-10 p-6">
          <h2 className="text-3xl md:text-5xl font-black text-center text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-400 to-amber-300">
            {translate('treasure.title', language)} {profile.name}
          </h2>
          <button
            onClick={openChest}
            data-testid="treasure-chest"
            aria-label={translate('treasure.tap_chest', language)}
            className={`chest scale-110 md:scale-150 my-6 ${opened ? 'is-open' : 'animate-chest-nudge'}`}
          >
            <span className="chest-glow" aria-hidden="true" />
            <span className="chest-lid" aria-hidden="true" />
            <span className="chest-body" aria-hidden="true" />
          </button>
          <p className={`text-xl md:text-2xl font-extrabold text-white/80 text-center animate-pulse transition-opacity ${opened ? 'opacity-0' : ''}`}>
            👆 {translate('treasure.tap_chest', language)}
          </p>
        </div>
      ) : (
        /* Step 2: the showcase */
        <div className="min-h-full flex flex-col items-center gap-6 px-4 py-6 md:py-10 max-w-4xl mx-auto">
          <div className="flex flex-col items-center gap-2 text-center pr-12 pl-12">
            <h2 className="text-2xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-400 to-amber-300">
              {translate('treasure.title', language)} {profile.name}
            </h2>
            <p className="text-base md:text-lg font-extrabold text-amber-200" data-testid="treasure-rank">
              {RANK_ICONS[rank]} {translate(`treasure.rank.${rank}`, language)}
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {stat('⭐', stats.stars, translate('treasure.stars', language), 'treasure-stars')}
            {stat('🏅', stats.medals, translate('treasure.medals', language), 'treasure-medals')}
            {stat('🎖️', stats.badges, translate('treasure.badges', language), 'treasure-badges')}
            {stat('🏆', stats.trophies, translate('treasure.trophies', language), 'treasure-trophies')}
          </div>

          {!current ? (
            <div className="flex flex-col items-center gap-4 py-10 text-center animate-treasure-rise">
              <span className="text-8xl">🗝️</span>
              <p className="text-lg md:text-xl font-bold text-white/70 max-w-md">{translate('treasure.empty', language)}</p>
            </div>
          ) : (
            <>
              {/* Spotlight: the current treasure, in big */}
              <div
                className="flex items-center justify-center gap-2 md:gap-8 w-full"
                onTouchStart={(e) => (touchStart.current = e.touches[0].clientX)}
                onTouchEnd={(e) => {
                  if (touchStart.current === null) return;
                  const dx = e.changedTouches[0].clientX - touchStart.current;
                  touchStart.current = null;
                  if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
                }}
              >
                <button
                  onClick={() => go(-1)}
                  disabled={items.length < 2}
                  aria-label={translate('treasure.previous', language)}
                  className="relative z-10 w-12 h-12 md:w-16 md:h-16 shrink-0 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-20 text-white flex items-center justify-center active:scale-90 transition-all"
                >
                  <ChevronLeft className="w-8 h-8 md:w-10 md:h-10" />
                </button>

                <div className="relative w-60 h-60 md:w-80 md:h-80 flex items-center justify-center">
                  <div className="absolute inset-[-25%] medal-rays pointer-events-none" aria-hidden="true" />
                  <button
                    key={current.key}
                    onClick={tapSpotlight}
                    data-testid="treasure-spotlight"
                    data-item={current.key}
                    aria-label={itemName(current)}
                    className="relative animate-spotlight-in"
                  >
                    <div className="animate-float">
                      <div
                        key={spin}
                        className={`relative w-48 h-48 md:w-64 md:h-64 rounded-full bg-gradient-to-br ${itemGradient(current)} ring-8 ${
                          current.kind === 'trophy' ? 'ring-yellow-200/70' : 'ring-white/40'
                        } shadow-2xl shadow-yellow-500/40 flex items-center justify-center ${spin ? 'animate-treasure-spin' : ''}`}
                      >
                        <span className="text-[7rem] md:text-[9rem] leading-none drop-shadow-lg">{current.icon}</span>
                        <span className="treasure-shine" aria-hidden="true" />
                        {current.kind === 'badge' && current.count > 1 && (
                          <span className="absolute -top-1 -right-1 min-w-[3rem] h-12 px-2 rounded-full bg-pink-500 ring-4 ring-slate-900 text-white text-xl font-black flex items-center justify-center">
                            ×{current.count}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                </div>

                <button
                  onClick={() => go(1)}
                  disabled={items.length < 2}
                  aria-label={translate('treasure.next', language)}
                  className="relative z-10 w-12 h-12 md:w-16 md:h-16 shrink-0 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-20 text-white flex items-center justify-center active:scale-90 transition-all"
                >
                  <ChevronRight className="w-8 h-8 md:w-10 md:h-10" />
                </button>
              </div>

              <div key={`info-${current.key}`} className="flex flex-col items-center gap-1 text-center animate-treasure-rise min-h-[6rem]">
                <h3 className="text-3xl md:text-5xl font-black text-white" data-testid="treasure-name">
                  {itemName(current)}
                </h3>
                <p className="text-base md:text-lg font-bold text-white/60">{subtitle(current)}</p>
                {current.kind === 'badge' && (
                  <p className="text-sm md:text-base font-bold text-pink-200">
                    {current.available > 0 && `🐷 ${current.available} ${translate('treasure.in_bank', language)}`}
                    {current.available > 0 && current.spentOn.length > 0 && ' · '}
                    {current.spentOn.length > 0 && `🎁 ${translate('treasure.spent_for', language)} ${current.spentOn.join(', ')}`}
                  </p>
                )}
                <p className="text-xs font-bold text-white/30 mt-1">
                  {Math.min(index, items.length - 1) + 1} / {items.length}
                </p>
              </div>

              {/* Shelf: every treasure, small, to jump to one */}
              <div className="w-full overflow-x-auto pb-2" data-testid="treasure-shelf">
                <div className="flex gap-3 w-max mx-auto px-3 py-2">
                  {items.map((item, i) => (
                    <button
                      key={item.key}
                      onClick={() => select(item.key)}
                      aria-label={itemName(item)}
                      aria-pressed={item.key === current.key}
                      style={{ animationDelay: richMotion() ? `${Math.min(i, 12) * 60}ms` : undefined }}
                      className={`animate-treasure-rise w-14 h-14 md:w-16 md:h-16 shrink-0 rounded-full bg-gradient-to-br ${itemGradient(item)} flex items-center justify-center text-3xl transition-all ${
                        item.key === current.key ? 'ring-4 ring-yellow-300 scale-110' : 'ring-2 ring-white/20 opacity-80 hover:opacity-100'
                      }`}
                    >
                      {item.icon}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Collections: one row per universe, missing badges shown as "?" */}
          <section className="w-full flex flex-col gap-3 mt-2" data-testid="treasure-collections">
            <h3 className="text-lg md:text-xl font-black text-white">📚 {translate('treasure.collections', language)}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {collections.map((c) => {
                const universe = getUniverse(c.universe);
                return (
                  <div
                    key={c.universe}
                    data-testid={`collection-${c.universe}`}
                    className={`p-3 rounded-2xl border flex flex-col gap-2 ${
                      c.complete ? 'bg-yellow-400/15 border-yellow-300/60' : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-extrabold text-white text-sm md:text-base">
                        {universe.icon} {universe.name[language]}
                      </span>
                      <span className={`text-sm font-black ${c.complete ? 'text-yellow-300' : 'text-white/50'}`} data-testid="collection-count">
                        {c.complete ? `✨ ${translate('treasure.complete', language)}` : `${c.owned.size}/${c.badgeIds.length}`}
                      </span>
                    </div>
                    <div className="flex gap-1.5 justify-between">
                      {c.badgeIds.map((id) => {
                        const owned = c.owned.has(id);
                        const badge = getBadge(id)!;
                        return owned ? (
                          <button
                            key={id}
                            onClick={() => {
                              select(`badge:${id}`);
                              scroller.current?.scrollTo?.({ top: 0, behavior: richMotion() ? 'smooth' : 'auto' });
                            }}
                            aria-label={badge.name[language]}
                            className={`w-10 h-10 md:w-11 md:h-11 rounded-full bg-gradient-to-br ${universe.gradient} ring-2 ring-white/40 flex items-center justify-center text-xl md:text-2xl hover:scale-110 transition-transform`}
                          >
                            {badge.emoji}
                          </button>
                        ) : (
                          <span
                            key={id}
                            aria-hidden="true"
                            className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-white/5 border-2 border-dashed border-white/15 flex items-center justify-center text-lg font-black text-white/25"
                          >
                            ?
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
