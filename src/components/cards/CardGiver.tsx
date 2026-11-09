import React, { useState } from 'react';
import { CardColor, ChildProfile } from '../../domain/models';
import { CARD_REASONS, CardsTonight } from '../../domain/cards';
import { translate, Language } from '../../i18n/dictionary';
import { Modal } from '../../ui/Overlay';
import { cx } from '../../ui/cx';
import { buttonClass, chipClass, fieldClass } from '../../ui/styles';
import { PinModal } from '../parent-mode/PinModal';

interface CardGiverProps {
  profile: ChildProfile;
  tonight: CardsTonight;
  parentPin: string;
  language: Language;
  onGive: (color: CardColor, reason?: string) => void;
  onClose: () => void;
}

/**
 * A parent picks a yellow or red card and an optional reason, then confirms
 * with the PIN (the hold-to-bypass shortcut is disabled here).
 */
export const CardGiver: React.FC<CardGiverProps> = ({ profile, tonight, parentPin, language, onGive, onClose }) => {
  const [color, setColor] = useState<CardColor>('yellow');
  const [reason, setReason] = useState('');
  const [askPin, setAskPin] = useState(false);
  const secondYellow = color === 'yellow' && tonight.yellow >= 1 && tonight.red === 0;

  const option = (c: CardColor) => (
    <button
      type="button"
      key={c}
      role="radio"
      aria-checked={color === c}
      data-testid={`card-option-${c}`}
      onClick={() => setColor(c)}
      className={cx(
        'flex-1 flex flex-col items-center gap-2 p-3 sm:p-4 rounded-2xl border-2 transition-all text-center',
        color === c ? (c === 'yellow' ? 'border-yellow-300 bg-yellow-400/15' : 'border-red-400 bg-red-500/15') : 'border-white/10 bg-white/5 opacity-70'
      )}
    >
      <span className={cx('referee-card !w-10 !h-14 !rounded-md', c === 'yellow' ? 'is-yellow' : 'is-red')} aria-hidden="true" />
      <span className="font-black text-white">{translate(`cards.${c}`, language)}</span>
      <span className="text-xs text-white/60 leading-snug">{translate(`cards.${c}_hint`, language)}</span>
    </button>
  );

  return (
    <>
      <Modal
        label={`${translate('cards.give_to', language)} ${profile.name}`}
        testId="card-giver"
        onClose={onClose}
        closeLabel={translate('btn.close', language)}
        panelClassName="max-w-lg p-5 sm:p-6 flex flex-col gap-4"
      >
        <h2 className="text-xl sm:text-2xl font-black text-white pr-10">
          {translate('cards.give_to', language)} {profile.avatar} {profile.name}
        </h2>

        <div className="flex gap-3" role="radiogroup" aria-label={translate('cards.give', language)}>
          {(['yellow', 'red'] as CardColor[]).map(option)}
        </div>

        {secondYellow && (
          <p className="text-sm font-bold text-amber-300" role="status">
            ⚠️ {translate('cards.second_yellow_warning', language)}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold text-white/50 uppercase tracking-wider">{translate('cards.reason', language)}</span>
          <div className="flex flex-wrap gap-2">
            {CARD_REASONS.map((r) => {
              const text = translate(`cards.reason.${r}`, language);
              return (
                <button key={r} type="button" aria-pressed={reason === text} onClick={() => setReason(reason === text ? '' : text)} className={chipClass(reason === text, true)}>
                  {text}
                </button>
              );
            })}
          </div>
          <input
            type="text"
            value={reason}
            maxLength={60}
            onChange={(e) => setReason(e.target.value)}
            placeholder={translate('cards.reason_placeholder', language)}
            aria-label={translate('cards.reason', language)}
            className={fieldClass('md')}
          />
        </div>

        <button type="button" onClick={() => setAskPin(true)} className={buttonClass(color === 'red' || secondYellow ? 'danger' : 'primary', 'lg', 'w-full')}>
          🔒 {translate('cards.validate', language)}
        </button>
      </Modal>

      {askPin && (
        <PinModal
          correctPin={parentPin}
          language={language}
          allowHoldBypass={false}
          title={`${translate(`cards.${color}`, language)} · ${profile.name}`}
          instruction={translate('cards.pin_instruction', language)}
          onSuccess={() => {
            setAskPin(false);
            onGive(color, reason);
          }}
          onClose={() => setAskPin(false)}
        />
      )}
    </>
  );
};
