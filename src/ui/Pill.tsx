import React from 'react';
import { cx } from './cx';

export type PillTone = 'dark' | 'glass';

const TONES: Record<PillTone, string> = {
  dark: 'bg-black/20', // on colored cards
  glass: 'bg-white/10 border border-white/15', // on dark backgrounds
};

type PillProps = React.HTMLAttributes<HTMLSpanElement> & { tone?: PillTone };

/** Small rounded label: stars, streak, counters… Text color and size come from `className`. */
export const Pill: React.FC<PillProps> = ({ tone = 'dark', className, ...rest }) => (
  <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-1', TONES[tone], className)} {...rest} />
);
