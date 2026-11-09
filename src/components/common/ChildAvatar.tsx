import React from 'react';
import { cx } from '../../ui/cx';

type AvatarSize = 'sm' | 'md' | 'lg';

const SIZES: Record<AvatarSize, string> = {
  sm: 'w-14 h-14 text-3xl', // Parent Mode lists
  md: 'w-20 h-20 md:w-24 md:h-24 text-5xl md:text-6xl', // selection screen cards
  lg: 'w-28 h-28 md:w-32 md:h-32 text-7xl md:text-8xl', // celebration
};

const TONES = {
  plain: 'bg-white/10 shadow-inner',
  outlined: 'bg-white/5 border border-white/10 shadow-inner',
  gold: 'bg-yellow-400/20 shadow-lg shadow-yellow-500/20 ring-4 ring-yellow-400/40',
};

/** A child's emoji avatar in a round frame. */
export const ChildAvatar: React.FC<{
  avatar: string;
  size?: AvatarSize;
  tone?: keyof typeof TONES;
  className?: string;
}> = ({ avatar, size = 'md', tone = 'plain', className }) => (
  <div className={cx('shrink-0 rounded-full flex items-center justify-center select-none', SIZES[size], TONES[tone], className)} aria-hidden="true">
    {avatar}
  </div>
);
