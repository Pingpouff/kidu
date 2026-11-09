import React, { useState, useRef, useEffect } from 'react';
import { translate, Language } from '../../i18n/dictionary';
import { Lock, Delete, X, ShieldAlert } from 'lucide-react';

interface PinModalProps {
  correctPin: string;
  language: Language;
  onSuccess: () => void;
  onClose: () => void;
  /** The 3-second hold shortcut; disabled when a parent must really approve (shop) */
  allowHoldBypass?: boolean;
  /** Optional custom title/instruction (defaults to the parent mode texts) */
  title?: string;
  instruction?: string;
}

export const PinModal: React.FC<PinModalProps> = ({
  correctPin,
  language,
  onSuccess,
  onClose,
  allowHoldBypass = true,
  title,
  instruction,
}) => {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<boolean>(false);
  
  // Hold-to-unlock gesture states
  const [isHolding, setIsHolding] = useState<boolean>(false);
  const [holdProgress, setHoldProgress] = useState<number>(0);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleKeyPress = (num: string) => {
    setError(false);
    if (pin.length < 4) {
      const nextPin = pin + num;
      setPin(nextPin);
      if (nextPin.length === 4) {
        if (nextPin === correctPin) {
          onSuccess();
        } else {
          setTimeout(() => {
            setError(true);
            setPin('');
          }, 200);
        }
      }
    }
  };

  const handleBackspace = () => {
    setError(false);
    setPin(pin.slice(0, -1));
  };

  // Hold-to-unlock triggers
  const startHolding = () => {
    if (!allowHoldBypass) return;
    setIsHolding(true);
    setHoldProgress(0);
    const holdDuration = 3000; // 3 seconds
    const intervalTime = 100;
    let elapsed = 0;

    // Track visual progress
    progressTimer.current = setInterval(() => {
      elapsed += intervalTime;
      const progress = Math.min(100, (elapsed / holdDuration) * 100);
      setHoldProgress(progress);
    }, intervalTime);

    // Trigger success when held for 3s
    holdTimer.current = setTimeout(() => {
      stopHolding();
      onSuccess();
    }, holdDuration);
  };

  const stopHolding = () => {
    setIsHolding(false);
    setHoldProgress(0);
    if (holdTimer.current) clearTimeout(holdTimer.current);
    if (progressTimer.current) clearInterval(progressTimer.current);
  };

  useEffect(() => {
    return () => {
      if (holdTimer.current) clearTimeout(holdTimer.current);
      if (progressTimer.current) clearInterval(progressTimer.current);
    };
  }, []);

  return (
    <div className="fixed inset-0 w-screen h-screen z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm select-none p-4">
      <div className="w-full max-w-sm glass-panel p-6 border-white/10 flex flex-col items-center gap-6 relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Modal Header */}
        <div className="flex flex-col items-center gap-2 text-center mt-2">
          {/* Circular hold-to-unlock target */}
          <div
            onMouseDown={startHolding}
            onMouseUp={stopHolding}
            onMouseLeave={stopHolding}
            onTouchStart={startHolding}
            onTouchEnd={stopHolding}
            className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center relative cursor-pointer active:scale-95 transition-transform duration-150 group"
          >
            {/* SVG Progress Ring */}
            <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
              <circle
                cx="32"
                cy="32"
                r="30"
                className="stroke-white/5 fill-transparent"
                strokeWidth="2"
              />
              <circle
                cx="32"
                cy="32"
                r="30"
                className="stroke-yellow-400 fill-transparent transition-all duration-100 ease-linear"
                strokeWidth="3"
                strokeDasharray={`${2 * Math.PI * 30}`}
                strokeDashoffset={`${2 * Math.PI * 30 * (1 - holdProgress / 100)}`}
              />
            </svg>
            <Lock className={`w-7 h-7 text-white/80 transition-colors ${isHolding ? 'text-yellow-400' : 'group-hover:text-white'}`} />
          </div>

          <h2 className="text-xl font-extrabold text-white mt-2">
            {title ?? translate('pin.title', language)}
          </h2>
          <p className="text-xs text-white/40 max-w-[250px] leading-relaxed">
            {instruction ?? translate('pin.instruction', language)}
          </p>
        </div>

        {/* PIN Indicators Dots */}
        <div className="flex gap-4 justify-center my-2">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                error
                  ? 'bg-rose-500 border-rose-500 animate-bounce'
                  : pin.length > idx
                  ? 'bg-white border-white scale-110'
                  : 'bg-transparent border-white/30'
              }`}
            />
          ))}
        </div>

        {/* Error warning label */}
        {error && (
          <div className="flex items-center gap-2 text-rose-400 text-sm font-bold animate-pulse -mt-2">
            <ShieldAlert className="w-4 h-4" />
            <span>{translate('pin.error', language)}</span>
          </div>
        )}

        {/* Keypad Layout Grid */}
        <div className="grid grid-cols-3 gap-3 w-full">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              onClick={() => handleKeyPress(num)}
              className="h-14 bg-white/5 hover:bg-white/10 active:bg-white/20 border border-white/10 rounded-2xl flex items-center justify-center text-xl font-bold text-white transition-all transform active:scale-95"
            >
              {num}
            </button>
          ))}
          <button
            onClick={() => setPin('')}
            className="h-14 bg-transparent border border-transparent rounded-2xl flex items-center justify-center text-xs font-bold text-white/40 hover:text-white transition-colors"
          >
            {translate('pin.clear', language)}
          </button>
          <button
            onClick={() => handleKeyPress('0')}
            className="h-14 bg-white/5 hover:bg-white/10 active:bg-white/20 border border-white/10 rounded-2xl flex items-center justify-center text-xl font-bold text-white transition-all transform active:scale-95"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            aria-label="backspace"
            className="h-14 bg-white/5 hover:bg-white/10 active:bg-white/20 border border-white/10 rounded-2xl flex items-center justify-center text-white/70 hover:text-white transition-colors"
          >
            <Delete className="w-6 h-6" />
          </button>
        </div>

      </div>
    </div>
  );
};
