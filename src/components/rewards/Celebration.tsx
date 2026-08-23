import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { ChildProfile } from '../../domain/models';
import { translate, Language } from '../../i18n/dictionary';

interface CelebrationProps {
  profile: ChildProfile;
  language: Language;
  onDismiss: () => void;
  starsEarned: number;
}

export const Celebration: React.FC<CelebrationProps> = ({
  profile,
  language,
  onDismiss,
  starsEarned,
}) => {
  useEffect(() => {
    // Fire confetti bursts
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 25, spread: 360, ticks: 50, zIndex: 100 };

    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min;
    };

    const interval: ReturnType<typeof setInterval> = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 40 * (timeLeft / duration);

      // Confetti from left and right corners
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  const bgGradients = {
    indigo: 'from-indigo-950 via-slate-900 to-indigo-950',
    purple: 'from-purple-950 via-slate-900 to-purple-950',
    rose: 'from-rose-950 via-slate-900 to-rose-950',
    emerald: 'from-emerald-950 via-slate-900 to-emerald-950',
    amber: 'from-amber-950 via-slate-900 to-amber-950',
  };

  const bgGradient = bgGradients[profile.color] || bgGradients.indigo;

  return (
    <div
      onClick={onDismiss}
      className={`fixed inset-0 w-screen h-screen z-50 flex flex-col justify-center items-center bg-gradient-to-b ${bgGradient} cursor-pointer p-6 select-none`}
    >
      {/* Floating sparkles */}
      <div className="absolute top-1/4 left-1/4 text-6xl animate-bounce pointer-events-none">✨</div>
      <div className="absolute top-1/3 right-1/4 text-7xl animate-pulse pointer-events-none">⭐</div>
      <div className="absolute bottom-1/4 left-1/3 text-6xl animate-bounce pointer-events-none">🌈</div>
      <div className="absolute bottom-1/3 right-1/3 text-5xl animate-pulse pointer-events-none">🎈</div>

      {/* Main congratulatory card */}
      <div className="glass-panel p-8 md:p-12 max-w-xl text-center flex flex-col items-center gap-6 shadow-2xl border-white/20 transform hover:scale-[1.01] transition-transform duration-300 pointer-events-none">
        
        {/* Child Avatar inside gold glow circle */}
        <div className="w-28 h-28 md:w-32 md:h-32 bg-yellow-400/20 rounded-full flex items-center justify-center text-7xl md:text-8xl shadow-lg shadow-yellow-500/20 ring-4 ring-yellow-400/40 animate-pulse-slow">
          {profile.avatar}
        </div>

        {/* Large congratulations heading */}
        <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-pink-400 to-yellow-300 drop-shadow animate-bounce">
          {translate('reward.congratulations', language)}
        </h1>

        {/* Success description */}
        <p className="text-xl md:text-2xl font-bold text-white/90 leading-relaxed px-4">
          {language === 'fr' 
            ? `Bravo ${profile.name} ! Tu as fini toute ta routine du soir !`
            : `Great job ${profile.name}! You completed your entire routine!`}
        </p>

        {/* Stars earned block */}
        <div className="flex items-center gap-3 bg-black/40 px-6 py-3 rounded-full border border-yellow-500/40 text-yellow-300 font-extrabold text-2xl animate-float">
          <span>+ {starsEarned}</span>
          <span className="text-3xl text-yellow-400">🌟</span>
        </div>

        {/* Stars accumulation hint */}
        <p className="text-sm md:text-base text-yellow-200/60 font-semibold italic mt-2">
          {language === 'fr'
            ? `Tu as maintenant un total de ${profile.stars + starsEarned} étoiles !`
            : `You now have a total of ${profile.stars + starsEarned} stars!`}
        </p>

      </div>

      {/* Tapping anywhere action instruction */}
      <div className="mt-12 text-white/50 text-base md:text-lg font-bold tracking-wide animate-pulse pointer-events-none uppercase">
        {language === 'fr' ? 'Tapote l\'écran pour continuer' : 'Tap screen to continue'}
      </div>
    </div>
  );
};
