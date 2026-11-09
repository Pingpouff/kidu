import React, { useState } from 'react';
import { Modal } from '../../ui/Overlay';
import { ChildProfile, ShopItem } from '../../domain/models';
import { getBadge } from '../../domain/badges';
import { unspentBadges } from '../../domain/rewards';
import { TROPHY_IDS, TROPHY_ICONS } from '../../domain/trophies';
import { translate, Language } from '../../i18n/dictionary';
import { PinModal } from '../parent-mode/PinModal';
import { BadgeDisc } from './BadgeChoice';
import { TreasureView } from './TreasureView';
import { reminderService } from '../../services/ReminderService';
import { fireConfetti } from '../../services/effects';
import { CONFETTI_Z } from '../../ui/layers';

interface PiggyBankProps {
  profile: ChildProfile;
  shop: ShopItem[];
  parentPin: string;
  language: Language;
  onBuy: (itemId: string) => Promise<void>;
  onClose: () => void;
}

type Tab = 'bank' | 'album' | 'trophies';

/**
 * The child's piggy bank: badges to spend in the parent's shop,
 * an album of every badge ever won, and the trophy cabinet.
 */
export const PiggyBank: React.FC<PiggyBankProps> = ({
  profile,
  shop,
  parentPin,
  language,
  onBuy,
  onClose,
}) => {
  const [tab, setTab] = useState<Tab>('bank');
  const [buying, setBuying] = useState<ShopItem | null>(null);
  const [bought, setBought] = useState<ShopItem | null>(null);
  const [showTreasure, setShowTreasure] = useState(false);

  const available = unspentBadges(profile);
  const allBadges = [...(profile.badges ?? [])].sort((a, b) => b.earnedAt - a.earnedAt);
  const trophies = new Map((profile.trophies ?? []).map((t) => [t.id, t.earnedAt]));
  const sep = language === 'fr' ? ' : ' : ': ';
  const dateFormat = new Intl.DateTimeFormat(language === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'short' });

  const handleApproved = async () => {
    if (!buying) return;
    const item = buying;
    setBuying(null);
    await onBuy(item.id);
    setBought(item);
    reminderService.playPurchaseSound();
    reminderService.triggerVoiceReminder(
      language === 'fr' ? `Youpi ! ${item.label} !` : `Hooray! ${item.label}!`,
      language === 'fr' ? 'fr-FR' : 'en-US'
    );
    fireConfetti({ particleCount: 90, spread: 110, origin: { x: 0.5, y: 0.5 }, zIndex: CONFETTI_Z.overlay });
    setTimeout(() => setBought(null), 2500);
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'bank', label: `🐷 ${translate('piggy.tab_bank', language)}` },
    { id: 'album', label: `📒 ${translate('piggy.tab_album', language)}` },
    { id: 'trophies', label: `🏆 ${translate('piggy.tab_trophies', language)}` },
  ];

  return (
    <>
      <Modal
        label={translate('piggy.title', language)}
        testId="piggy-bank"
        onClose={onClose}
        closeLabel={translate('btn.close', language)}
        closeSize="lg"
        panelClassName="max-w-3xl max-h-[94dvh] overflow-y-auto p-4 sm:p-5 md:p-8 flex flex-col gap-5"
      >

        <h2 className="text-2xl md:text-3xl font-black text-white flex items-center gap-3 pr-10">
          <span className="text-4xl animate-wiggle inline-block">🐷</span>
          <span>{translate('piggy.title', language)} {profile.name}</span>
        </h2>

        <button
          onClick={() => setShowTreasure(true)}
          data-testid="open-treasure"
          className="group relative overflow-hidden flex items-center justify-center gap-3 px-5 py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-amber-950 font-black text-xl md:text-2xl shadow-lg shadow-amber-500/30 active:scale-95 transition-transform"
        >
          <span className="text-3xl group-hover:animate-wiggle inline-block">💎</span>
          {translate('treasure.open', language)}
          <span className="text-3xl group-hover:animate-wiggle inline-block">✨</span>
          <span className="treasure-shine" aria-hidden="true" />
        </button>

        <div className="grid grid-cols-3 gap-1.5 sm:flex sm:gap-2" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`px-2 sm:px-4 py-2 rounded-full text-xs sm:text-sm md:text-base font-extrabold border transition-all whitespace-nowrap ${
                tab === t.id ? 'bg-pink-500/30 border-pink-300/50 text-white' : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'bank' && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-3">
              <p className="text-lg font-black text-pink-200" data-testid="piggy-count">
                {available.length} {translate(available.length > 1 ? 'piggy.badges' : 'piggy.badge', language)}
              </p>
              {available.length === 0 ? (
                <p className="text-sm text-white/50">{translate('piggy.empty', language)}</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {available.map((b) => (
                    <BadgeDisc key={b.uid} badgeId={b.badgeId} size="sm" />
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-extrabold text-white/60 uppercase tracking-wider">
                🎁 {translate('piggy.shop', language)}
              </h3>
              {shop.length === 0 && <p className="text-sm text-white/50">{translate('piggy.shop_empty', language)}</p>}
              {shop.map((item) => {
                const missing = item.cost - available.length;
                return (
                  <div key={item.id} className="flex items-center gap-4 p-3 rounded-2xl bg-white/5 border border-white/10" data-testid="shop-item">
                    <span className="text-4xl">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-extrabold text-white truncate">{item.label}</p>
                      <p className="text-sm text-pink-200 font-bold">
                        {item.cost} {translate(item.cost > 1 ? 'piggy.badges' : 'piggy.badge', language)}
                      </p>
                    </div>
                    {missing > 0 ? (
                      <span className="text-xs font-bold text-white/40 text-right">
                        {translate('piggy.missing', language)} {missing}
                      </span>
                    ) : (
                      <button
                        onClick={() => setBuying(item)}
                        className="px-4 py-2 rounded-xl bg-pink-500 hover:bg-pink-400 text-white font-black text-sm active:scale-95 transition-all"
                      >
                        {translate('piggy.exchange', language)}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'album' && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-white/60 font-bold">
              {allBadges.length} {translate('piggy.album_total', language)}
            </p>
            {allBadges.length === 0 && <p className="text-sm text-white/50">{translate('piggy.empty', language)}</p>}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {allBadges.map((owned) => {
                const badge = getBadge(owned.badgeId);
                if (!badge) return null;
                return (
                  <div key={owned.uid} className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white/5 border border-white/10 text-center">
                    <BadgeDisc badgeId={owned.badgeId} />
                    <span className="text-sm font-extrabold text-white leading-tight">{badge.name[language]}</span>
                    <span className="text-[11px] text-white/45 leading-snug">
                      {owned.spentAt
                        ? `${translate('piggy.spent_on', language)}${sep}${owned.spentOn ?? ''}`
                        : dateFormat.format(owned.earnedAt)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'trophies' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {TROPHY_IDS.map((id) => {
              const earnedAt = trophies.get(id);
              const isEarned = earnedAt !== undefined;
              return (
                <div
                  key={id}
                  data-testid={`trophy-${id}`}
                  data-earned={isEarned}
                  className={`flex flex-col items-center text-center gap-2 p-3 rounded-2xl border ${
                    isEarned ? 'bg-yellow-400/10 border-yellow-400/40' : 'bg-white/5 border-white/10'
                  }`}
                >
                  <div
                    className={`w-16 h-16 rounded-full flex items-center justify-center text-4xl ${
                      isEarned
                        ? 'bg-gradient-to-br from-yellow-300 to-amber-600 shadow-lg shadow-yellow-500/30 ring-2 ring-yellow-200/50'
                        : 'bg-white/5 grayscale opacity-40'
                    }`}
                  >
                    {TROPHY_ICONS[id]}
                  </div>
                  <span className={`text-sm font-extrabold ${isEarned ? 'text-yellow-200' : 'text-white/50'}`}>
                    {translate(`trophy.${id}.name`, language)}
                  </span>
                  <span className="text-[11px] leading-snug text-white/50">
                    {isEarned
                      ? `✓ ${dateFormat.format(earnedAt)}`
                      : `${translate('trophies.locked', language)}${sep}${translate(`trophy.${id}.hint`, language)}`}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {bought && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 rounded-[inherit]" role="status">
            <div className="flex flex-col items-center gap-3 animate-medal-reveal">
              <span className="text-8xl">{bought.icon}</span>
              <span className="text-2xl md:text-3xl font-black text-white text-center">{bought.label}</span>
              <span className="text-lg font-bold text-pink-200">{translate('piggy.enjoy', language)}</span>
            </div>
          </div>
        )}
      </Modal>

      {showTreasure && <TreasureView profile={profile} language={language} onClose={() => setShowTreasure(false)} />}

      {buying && (
        <PinModal
          correctPin={parentPin}
          language={language}
          allowHoldBypass={false}
          title={`${buying.icon} ${buying.label}`}
          instruction={translate('piggy.parent_approval', language)}
          onSuccess={handleApproved}
          onClose={() => setBuying(null)}
        />
      )}
    </>
  );
};
