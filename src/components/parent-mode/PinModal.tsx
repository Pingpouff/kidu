import React, { useEffect, useState } from 'react';
import { translate, Language, TranslationKey } from '../../i18n/dictionary';
import { Lock, Delete, ShieldAlert, Clock } from 'lucide-react';
import { Modal } from '../../ui/Overlay';
import { buttonClass, fieldClass } from '../../ui/styles';
import {
  afterFailure,
  GrownUpChallenge,
  isLocked,
  lockSecondsLeft,
  makeChallenge,
  OPEN_GUARD,
  PinGuard,
} from '../../domain/parentGate';

interface PinModalProps {
  correctPin: string;
  language: Language;
  onSuccess: () => void;
  onClose: () => void;
  /** "Forgot the PIN?" grown-up question; only for entering Parent Mode, not to approve a purchase or a card */
  allowForgotPin?: boolean;
  /** Optional custom title/instruction (defaults to the parent mode texts) */
  title?: string;
  instruction?: string;
}

// Shared by every PIN pad and kept while the page is open, so closing and
// reopening the pad doesn't reset the lock-out.
let guard: PinGuard = OPEN_GUARD;

const keyClass =
  'h-14 bg-white/5 hover:bg-white/10 active:bg-white/20 border border-white/10 rounded-2xl flex items-center justify-center text-xl font-bold text-white transition-all transform active:scale-95 disabled:opacity-30';

export const PinModal: React.FC<PinModalProps> = ({
  correctPin,
  language,
  onSuccess,
  onClose,
  allowForgotPin = false,
  title,
  instruction,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<TranslationKey | null>(null);
  const [challenge, setChallenge] = useState<GrownUpChallenge | null>(null);
  const [answer, setAnswer] = useState('');
  const [now, setNow] = useState(() => Date.now());

  const locked = isLocked(guard, now);
  const secondsLeft = lockSecondsLeft(guard, now);

  // Count down while locked
  useEffect(() => {
    if (!locked) return;
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, [locked]);

  const fail = (messageKey: TranslationKey) => {
    guard = afterFailure(guard, Date.now());
    setNow(Date.now());
    setError(messageKey);
  };

  const succeed = () => {
    guard = OPEN_GUARD;
    onSuccess();
  };

  const handleKeyPress = (num: string) => {
    if (locked || pin.length >= 4) return;
    setError(null);
    const nextPin = pin + num;
    setPin(nextPin);
    if (nextPin.length === 4) {
      if (nextPin === correctPin) {
        succeed();
      } else {
        setTimeout(() => {
          fail('pin.error');
          setPin('');
        }, 200);
      }
    }
  };

  const handleAnswer = (e: React.FormEvent) => {
    e.preventDefault();
    if (locked || !challenge) return;
    if (Number(answer) === challenge.answer) {
      succeed();
    } else {
      fail('pin.challenge_wrong');
      setChallenge(makeChallenge());
      setAnswer('');
    }
  };

  const heading = title ?? translate('pin.title', language);

  return (
    <Modal
      layer="dialog"
      label={heading}
      onClose={onClose}
      closeLabel={translate('btn.close', language)}
      closeOnBackdrop={false}
      backdropPadding="p-4"
      panelClassName="max-w-sm p-6 border-white/10 flex flex-col items-center gap-6"
      testId="pin-pad"
    >
      <div className="flex flex-col items-center gap-2 text-center mt-2">
        <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
          <Lock className="w-7 h-7 text-white/80" />
        </div>
        <h2 className="text-xl font-extrabold text-white mt-2">{heading}</h2>
        {!challenge && (
          <p className="text-xs text-white/60 max-w-[250px] leading-relaxed">
            {instruction ?? translate('pin.instruction', language)}
          </p>
        )}
      </div>

      {locked && (
        <div role="alert" className="flex items-center gap-2 text-amber-300 text-sm font-bold -mt-2" data-testid="pin-locked">
          <Clock className="w-4 h-4" />
          <span>{translate('pin.locked', language).replace('{s}', String(secondsLeft))}</span>
        </div>
      )}
      {!locked && error && (
        <div role="alert" className="flex items-center gap-2 text-rose-400 text-sm font-bold -mt-2">
          <ShieldAlert className="w-4 h-4" />
          <span>{translate(error, language)}</span>
        </div>
      )}

      {challenge ? (
        <form onSubmit={handleAnswer} className="flex flex-col items-center gap-4 w-full" data-testid="pin-challenge">
          <p className="text-sm text-white/80 text-center">
            {translate('pin.challenge', language)}{' '}
            <strong className="text-white text-lg">
              {challenge.a} × {challenge.b}
            </strong>{' '}
            ?
          </p>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            aria-label={translate('pin.challenge_answer', language)}
            value={answer}
            onChange={(e) => setAnswer(e.target.value.replace(/\D/g, ''))}
            disabled={locked}
            autoFocus
            className={fieldClass('lg', 'w-32 text-center text-xl')}
          />
          <button type="submit" disabled={locked || answer === ''} className={buttonClass('primary', 'md', 'w-full')}>
            {translate('pin.challenge_ok', language)}
          </button>
          <button
            type="button"
            onClick={() => {
              setChallenge(null);
              setError(null);
            }}
            className="text-xs text-white/60 hover:text-white underline"
          >
            {translate('pin.back_to_pin', language)}
          </button>
        </form>
      ) : (
        <>
          <div className="flex gap-4 justify-center my-2">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                  error === 'pin.error' && pin.length === 0
                    ? 'bg-rose-500 border-rose-500'
                    : pin.length > idx
                      ? 'bg-white border-white scale-110'
                      : 'bg-transparent border-white/30'
                }`}
              />
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3 w-full">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
              <button key={num} onClick={() => handleKeyPress(num)} disabled={locked} className={keyClass}>
                {num}
              </button>
            ))}
            <button
              onClick={() => setPin('')}
              className="h-14 bg-transparent border border-transparent rounded-2xl flex items-center justify-center text-xs font-bold text-white/60 hover:text-white transition-colors"
            >
              {translate('pin.clear', language)}
            </button>
            <button onClick={() => handleKeyPress('0')} disabled={locked} className={keyClass}>
              0
            </button>
            <button
              onClick={() => {
                setError(null);
                setPin(pin.slice(0, -1));
              }}
              aria-label={translate('pin.backspace', language)}
              className="h-14 bg-white/5 hover:bg-white/10 active:bg-white/20 border border-white/10 rounded-2xl flex items-center justify-center text-white/70 hover:text-white transition-colors"
            >
              <Delete className="w-6 h-6" />
            </button>
          </div>

          {allowForgotPin && (
            <button
              type="button"
              onClick={() => {
                setChallenge(makeChallenge());
                setAnswer('');
                setError(null);
              }}
              className="text-xs text-white/60 hover:text-white underline -mt-2"
            >
              {translate('pin.forgot', language)}
            </button>
          )}
        </>
      )}
    </Modal>
  );
};
