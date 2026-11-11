import React, { useId } from 'react';

export type BreathPhase = 'idle' | 'inhale' | 'exhale';

interface CloudProps {
  phase: BreathPhase;
  /** Changes on every breath: replays the wind animation */
  breath?: number;
  /** Seconds of the current phase, so the cloud grows / shrinks exactly with the timer */
  inhaleSeconds?: number;
  exhaleSeconds?: number;
  className?: string;
}

/**
 * The guide of the emotions space (DA, version B): a lavender cloud that
 * puffs up when breathing in, then turns towards the wind and blows it out
 * (tapered ribbons, little cloud puffs, a leaf carried away).
 *
 * Driven by `phase` (CSS transitions), not by a free-running loop: it stays
 * in step with the voice and the text. Only transform / opacity move; the
 * wind is decoration and disappears in lite display and reduced motion
 * (`.emo-wind` rules in index.css), the breathing cloud stays.
 */
export const Cloud: React.FC<CloudProps> = ({ phase, breath = 0, inhaleSeconds = 4, exhaleSeconds = 6, className }) => {
  const gradientId = `emo-wind-${useId().replace(/:/g, '')}`;
  const exhale = phase === 'exhale';
  const inhale = phase === 'inhale';
  // Big enough to be seen from across the room on a tablet: +50 % between out and in
  const scale = inhale ? 'scale(1.2, 1.17)' : exhale ? 'scale(0.78)' : 'scale(0.9)';
  const duration = phase === 'inhale' ? inhaleSeconds : exhale ? exhaleSeconds : 1;

  return (
    <svg
      viewBox="-70 0 340 180"
      className={className}
      style={{ overflow: 'visible' }}
      aria-hidden="true"
      data-testid="calm-cloud"
      data-phase={phase}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#E8E4FF" stopOpacity="0" />
          <stop offset="0.28" stopColor="#E8E4FF" stopOpacity="0.9" />
          <stop offset="1" stopColor="#9EE6D8" stopOpacity="0.75" />
        </linearGradient>
      </defs>

      <g
        className="emo-cloud-body"
        style={{ transform: scale, transition: `transform ${duration}s ease-in-out` }}
        data-testid="calm-cloud-body"
      >
        <path
          d="M44 166 C12 166 2 142 8 120 C14 100 30 92 44 94 C46 66 72 48 98 52 C120 55 134 70 138 84 C158 74 190 86 192 112 C196 142 176 166 150 166 Z"
          fill="#E8E4FF"
        />
        {/* The face turns towards the wind while breathing out */}
        <g style={{ transform: `translateX(${exhale ? 40 : 0}px)`, transition: 'transform 0.9s ease-in-out' }}>
          <path d="M68 118 Q78 126 88 118" stroke="#2B2550" strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d="M112 118 Q122 126 132 118" stroke="#2B2550" strokeWidth="5" fill="none" strokeLinecap="round" />
          {/* Cheeks puff up with the air breathed in */}
          {[60, 140].map((cx) => (
            <circle
              key={cx}
              cx={cx}
              cy="134"
              r="8"
              fill="#B39DDB"
              style={{
                transformBox: 'fill-box',
                transformOrigin: 'center',
                transform: `scale(${inhale ? 1.5 : 1})`,
                opacity: inhale ? 0.7 : 0.45,
                transition: `transform ${duration}s ease-in-out, opacity ${duration}s ease-in-out`,
              }}
            />
          ))}
          {exhale ? (
            <ellipse cx="102" cy="141" rx="5.5" ry="6.5" fill="#2B2550" />
          ) : (
            <path d="M90 140 Q100 147 110 140" stroke="#2B2550" strokeWidth="5" fill="none" strokeLinecap="round" />
          )}
        </g>
      </g>

      {exhale && (
        <g key={breath} className="emo-wind" transform="translate(138 92) scale(0.62)">
          <g fill={`url(#${gradientId})`}>
            <path className="emo-swoosh" d="M0 52 C60 34 140 30 204 42 C228 46 246 42 252 30 C256 22 249 16 243 20 C249 20 251 27 246 33 C236 46 214 52 196 50 C140 46 70 48 0 52 Z" />
            <path className="emo-swoosh emo-d2" d="M14 80 C90 66 190 68 292 80 C190 76 96 78 14 80 Z" />
            <path className="emo-swoosh emo-d3" d="M0 104 C50 114 112 122 164 112 C188 108 202 116 198 128 C195 136 184 136 182 128 C186 132 192 128 190 122 C186 114 172 116 160 120 C110 130 50 122 0 104 Z" />
          </g>
          <g fill="#E8E4FF">
            <g className="emo-puff"><circle cx="96" cy="64" r="6" /><circle cx="105" cy="60" r="8" /><circle cx="114" cy="65" r="6" /></g>
            <g className="emo-puff emo-d2"><circle cx="70" cy="92" r="4.5" /><circle cx="77" cy="89" r="6" /><circle cx="84" cy="93" r="4.5" /></g>
            <g className="emo-puff emo-d3"><circle cx="120" cy="96" r="4" /><circle cx="126" cy="93" r="5" /><circle cx="132" cy="96" r="4" /></g>
          </g>
          <g transform="translate(118 70)">
            <g className="emo-leaf">
              <path d="M0 0 C6 -9 20 -9 26 0 C20 9 6 9 0 0 Z" fill="#9EE6D8" />
              <path d="M2 0 L24 0" stroke="#6FC7B6" strokeWidth="1.5" strokeLinecap="round" />
            </g>
          </g>
        </g>
      )}
    </svg>
  );
};
