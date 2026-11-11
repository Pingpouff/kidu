import React from 'react';

/** The guide cloud, small and still: the calm corner button (home screen, board header). */
export const CloudGlyph: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 200 150" className={className} aria-hidden="true">
    <path
      d="M44 140 C12 140 2 116 8 94 C14 74 30 66 44 68 C46 40 72 22 98 26 C120 29 134 44 138 58 C158 48 190 60 192 86 C196 116 176 140 150 140 Z"
      fill="#E8E4FF"
    />
    <path d="M68 92 Q78 100 88 92" stroke="#2B2550" strokeWidth="7" fill="none" strokeLinecap="round" />
    <path d="M112 92 Q122 100 132 92" stroke="#2B2550" strokeWidth="7" fill="none" strokeLinecap="round" />
    <path d="M88 114 Q100 122 112 114" stroke="#2B2550" strokeWidth="7" fill="none" strokeLinecap="round" />
  </svg>
);
