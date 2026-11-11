import React from 'react';
import type { EmotionFamily } from '../domain/catalog';

/* Approved DA (version B, "violet devant la lune") */
const BODY = '#6E5BA8';
const WING = '#54448A';
const BEAK = '#FFB86B';
const EYE = '#F4F1FF';
const PUPIL = '#1E1B3A';
const MOON = '#E9E4FA';

interface OwlProps {
  /** Expression (body language) of the owl */
  family: EmotionFamily;
  /** Belly color: the emotion's color */
  color: string;
  /** Pale moon behind the owl: full on big owls, soft in grids of small ones */
  moon?: 'full' | 'soft' | 'none';
  className?: string;
  /** Accessible name; without it the owl is decoration (the emotion's name is written next to it) */
  label?: string;
}

const Feet: React.FC<{ y?: number }> = ({ y = 218 }) => (
  <g fill={BEAK}>
    <ellipse cx="82" cy={y} rx="12" ry="6" />
    <ellipse cx="118" cy={y} rx="12" ry="6" />
  </g>
);

const Tufts: React.FC = () => (
  <>
    <path d="M52 52 L44 14 L80 40 Z" fill={BODY} />
    <path d="M148 52 L156 14 L120 40 Z" fill={BODY} />
  </>
);

/** Round body + belly in the emotion's color */
const Body: React.FC<{ color: string }> = ({ color }) => (
  <>
    <ellipse cx="100" cy="128" rx="78" ry="92" fill={BODY} />
    <ellipse cx="100" cy="150" rx="50" ry="62" fill={color} />
  </>
);

const OpenEyes: React.FC<{ r?: number }> = ({ r = 30 }) => (
  <>
    <circle cx="70" cy="86" r={r} fill={EYE} />
    <circle cx="130" cy="86" r={r} fill={EYE} />
  </>
);

function expression(family: EmotionFamily, color: string): React.ReactNode {
  switch (family) {
    case 'joy':
      return (
        <>
          <g stroke={color} strokeWidth="5" strokeLinecap="round">
            <line x1="22" y1="40" x2="10" y2="30" />
            <line x1="178" y1="40" x2="190" y2="30" />
          </g>
          <Tufts />
          <path d="M30 120 Q8 80 20 56 Q40 90 50 112 Z" fill={WING} />
          <path d="M170 120 Q192 80 180 56 Q160 90 150 112 Z" fill={WING} />
          <Body color={color} />
          <OpenEyes />
          <path d="M56 92 Q70 74 84 92" stroke={PUPIL} strokeWidth="6" fill="none" strokeLinecap="round" />
          <path d="M116 92 Q130 74 144 92" stroke={PUPIL} strokeWidth="6" fill="none" strokeLinecap="round" />
          <path d="M90 108 L100 128 L110 108 Z" fill={BEAK} />
          <Feet />
        </>
      );
    case 'sadness':
      return (
        <>
          <path d="M54 58 L30 30 L80 44 Z" fill={BODY} />
          <path d="M146 58 L170 30 L120 44 Z" fill={BODY} />
          <ellipse cx="100" cy="132" rx="76" ry="88" fill={BODY} />
          <ellipse cx="100" cy="154" rx="48" ry="58" fill={color} />
          <circle cx="70" cy="90" r="28" fill={EYE} />
          <circle cx="130" cy="90" r="28" fill={EYE} />
          <path d="M44 84 L96 84 L96 90 Q70 76 44 90 Z" fill={BODY} />
          <path d="M104 84 L156 84 L156 90 Q130 76 104 90 Z" fill={BODY} />
          <circle cx="70" cy="98" r="9" fill={PUPIL} />
          <circle cx="130" cy="98" r="9" fill={PUPIL} />
          <path d="M58 118 q5 10 0 14 q-5 -4 0 -14z" fill={color} />
          <path d="M92 114 L100 128 L108 114 Z" fill={BEAK} />
          <Feet y={220} />
        </>
      );
    case 'anger':
      return (
        <>
          <g stroke={color} strokeWidth="5" strokeLinecap="round" fill="none">
            <path d="M76 12 q6 -8 0 -14" />
            <path d="M124 12 q6 -8 0 -14" />
          </g>
          <path d="M52 50 L46 8 L80 38 Z" fill={BODY} />
          <path d="M148 50 L154 8 L120 38 Z" fill={BODY} />
          {/* Ruffled feathers */}
          <path
            d="M100 34 L120 40 L140 36 L152 52 L170 56 L174 76 L188 92 L180 112 L190 132 L176 148 L180 170 L162 182 L156 204 L134 208 L118 222 L100 214 L82 222 L66 208 L44 204 L38 182 L20 170 L24 148 L10 132 L20 112 L12 92 L26 76 L30 56 L48 52 L60 36 L80 40 Z"
            fill={BODY}
          />
          <ellipse cx="100" cy="150" rx="52" ry="62" fill={color} />
          <circle cx="70" cy="90" r="28" fill={EYE} />
          <circle cx="130" cy="90" r="28" fill={EYE} />
          <path d="M46 70 L94 86" stroke={PUPIL} strokeWidth="7" strokeLinecap="round" />
          <path d="M154 70 L106 86" stroke={PUPIL} strokeWidth="7" strokeLinecap="round" />
          <circle cx="72" cy="98" r="8" fill={PUPIL} />
          <circle cx="128" cy="98" r="8" fill={PUPIL} />
          <path d="M90 112 L100 126 L110 112 Z" fill={BEAK} />
          <Feet y={222} />
        </>
      );
    case 'fear':
      return (
        <>
          <g stroke={color} strokeWidth="4" strokeLinecap="round">
            <line x1="30" y1="110" x2="18" y2="106" />
            <line x1="30" y1="130" x2="16" y2="130" />
            <line x1="170" y1="110" x2="182" y2="106" />
            <line x1="170" y1="130" x2="184" y2="130" />
          </g>
          {/* Small, wings held tight */}
          <g transform="translate(25 40) scale(0.75)">
            <Tufts />
            <Body color={color} />
            <path d="M28 110 Q60 150 96 196 Q40 190 26 150 Z" fill={WING} />
            <path d="M172 110 Q140 150 104 196 Q160 190 174 150 Z" fill={WING} />
            <OpenEyes r={32} />
            <circle cx="70" cy="86" r="6" fill={PUPIL} />
            <circle cx="130" cy="86" r="6" fill={PUPIL} />
            <path d="M94 112 L100 122 L106 112 Z" fill={BEAK} />
          </g>
        </>
      );
    case 'disgust':
      return (
        <>
          <Tufts />
          <Body color={color} />
          <OpenEyes />
          <path d="M52 88 L88 92" stroke={PUPIL} strokeWidth="6" strokeLinecap="round" />
          <circle cx="130" cy="90" r="9" fill={PUPIL} />
          <path d="M108 66 L150 74" stroke={PUPIL} strokeWidth="6" strokeLinecap="round" />
          <path d="M90 108 L100 122 L110 108 Z" fill={BEAK} />
          <path d="M98 120 q6 14 12 4 z" fill="#FF8FA3" />
          <Feet />
        </>
      );
    case 'calm':
    default:
      return (
        <>
          <Tufts />
          <Body color={color} />
          <OpenEyes />
          <path d="M54 90 Q70 102 86 90" stroke={PUPIL} strokeWidth="6" fill="none" strokeLinecap="round" />
          <path d="M114 90 Q130 102 146 90" stroke={PUPIL} strokeWidth="6" fill="none" strokeLinecap="round" />
          <path d="M92 108 L100 124 L108 108 Z" fill={BEAK} />
          <Feet />
        </>
      );
  }
}

/**
 * The child's owl (DA, version B): its body language shows the emotion's
 * family, its belly takes the emotion's color, a pale moon behind keeps it
 * readable on the twilight background.
 */
export const Owl: React.FC<OwlProps> = ({ family, color, moon = 'full', className, label }) => (
  <svg
    viewBox="0 0 200 230"
    className={className}
    {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    data-family={family}
  >
    {moon !== 'none' && <circle cx="100" cy="122" r="98" fill={MOON} opacity={moon === 'full' ? 0.92 : 0.3} />}
    {expression(family, color)}
  </svg>
);
