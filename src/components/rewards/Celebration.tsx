import React, { useEffect, useState } from 'react';
import { reminderService } from '../../services/ReminderService';
import { fireConfetti, richMotion } from '../../services/effects';
import { ChildProfile } from '../../domain/models';
import { translate, Language } from '../../i18n/dictionary';
import { childTheme } from '../../ui/theme';
import { CONFETTI_Z } from '../../ui/layers';
import { Overlay } from '../../ui/Overlay';
import { ChildAvatar } from '../common/ChildAvatar';

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
  // Bedtime song with karaoke lyrics (if the parent allows songs)
  const [songLine, setSongLine] = useState(-1);
  const [songPlaying, setSongPlaying] = useState(false);
  useEffect(() => {
    // Let the victory fanfare and voice finish first
    const start = setTimeout(() => {
      const playing = reminderService.playBedtimeSong(language, (line) => {
        setSongLine(line);
        if (line === -1) setSongPlaying(false);
      });
      setSongPlaying(playing);
    }, 4500);
    return () => {
      clearTimeout(start);
      reminderService.stopSong();
    };
  }, [language]);
  const lyrics = reminderService.bedtimeLyrics[language];

  useEffect(() => {
    if (!richMotion()) return;
    // Fire confetti bursts
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 25, spread: 360, ticks: 50, zIndex: CONFETTI_Z.celebration };

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
      fireConfetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      });
      fireConfetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  const bgGradient = childTheme(profile.color).celebration;

  return (
    <Overlay
      layer="overlay"
      onClick={onDismiss}
      onClose={onDismiss}
      className={`flex flex-col justify-center items-center bg-gradient-to-b ${bgGradient} cursor-pointer p-6 select-none`}
    >
      {/* Floating sparkles */}
      <div className="absolute top-1/4 left-1/4 text-6xl animate-bounce pointer-events-none">✨</div>
      <div className="absolute top-1/3 right-1/4 text-7xl animate-pulse pointer-events-none">⭐</div>
      <div className="absolute bottom-1/4 left-1/3 text-6xl animate-bounce pointer-events-none">🌈</div>
      <div className="absolute bottom-1/3 right-1/3 text-5xl animate-pulse pointer-events-none">🎈</div>

      {/* Main congratulatory card */}
      <div className="glass-panel p-8 md:p-12 max-w-xl text-center flex flex-col items-center gap-6 shadow-2xl border-white/20 transform hover:scale-[1.01] transition-transform duration-300 pointer-events-none">
        
        {/* Child Avatar inside gold glow circle */}
        <ChildAvatar avatar={profile.avatar} size="lg" tone="gold" className="animate-pulse-slow" />

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

        {/* Stars earned tonight */}
        <div className="flex items-center gap-3 bg-black/40 px-6 py-3 rounded-full border border-yellow-500/40 text-yellow-300 font-extrabold text-2xl animate-float">
          <span>+ {starsEarned}</span>
          <span className="text-3xl text-yellow-400">🌟</span>
          <span className="text-white/40">·</span>
          <span>🏅 {profile.medalCount ?? 0}</span>
        </div>

        {/* Bedtime song lyrics, highlighted line by line */}
        {songPlaying && (
          <div className="flex flex-col gap-1 text-center" data-testid="bedtime-song">
            <span className="text-xs uppercase tracking-widest text-white/40 font-bold">🎵 {language === 'fr' ? 'La chanson du dodo' : 'The bedtime song'}</span>
            {lyrics.map((line, i) => (
              <span
                key={i}
                className={`text-base md:text-xl font-bold transition-all duration-500 ${
                  i === songLine ? 'text-yellow-200 scale-105' : i < songLine ? 'text-white/50' : 'text-white/25'
                }`}
              >
                {line}
              </span>
            ))}
          </div>
        )}

      </div>

      {/* Tapping anywhere action instruction */}
      <div className="mt-12 text-white/50 text-base md:text-lg font-bold tracking-wide animate-pulse pointer-events-none uppercase">
        {language === 'fr' ? 'Tapote l\'écran pour continuer' : 'Tap screen to continue'}
      </div>
    </Overlay>
  );
};
