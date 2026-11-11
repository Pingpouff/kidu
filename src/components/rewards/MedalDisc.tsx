import React from 'react';
import { getBadge, getUniverse } from '../../domain/badges';
import { cx } from '../../ui/cx';

/**
 * A medal the child won: a disc in its universe's colors with its motif,
 * a gold rim and a ribbon. (In the data a medal's motif is still called a
 * "badge": `profile.badges`, `badgeOffers`; children only ever see medals.)
 */
export const MedalDisc: React.FC<{ badgeId: string; size?: 'sm' | 'md' | 'lg'; dimmed?: boolean }> = ({
  badgeId,
  size = 'md',
  dimmed = false,
}) => {
  const badge = getBadge(badgeId);
  if (!badge) return null;
  const universe = getUniverse(badge.universe);
  const disc = {
    sm: 'w-12 h-12 text-2xl ring-2',
    md: 'w-20 h-20 text-5xl ring-4',
    lg: 'w-28 h-28 md:w-36 md:h-36 text-6xl md:text-7xl ring-[6px]',
  }[size];
  const ribbon = {
    sm: 'w-3 h-5 -mb-1.5',
    md: 'w-5 h-8 -mb-2.5',
    lg: 'w-7 h-11 md:w-8 md:h-12 -mb-3',
  }[size];
  return (
    <div className={cx('flex flex-col items-center shrink-0', dimmed && 'grayscale opacity-40')} data-testid="medal-disc">
      {/* Ribbon: two slanted strips above the medal */}
      <div className="flex gap-0.5" aria-hidden="true">
        <span className={cx(ribbon, 'bg-gradient-to-b from-sky-400 to-sky-600 -skew-x-12 rounded-t-sm')} />
        <span className={cx(ribbon, 'bg-gradient-to-b from-rose-400 to-rose-600 skew-x-12 rounded-t-sm')} />
      </div>
      <div
        className={cx(
          disc,
          'relative rounded-full bg-gradient-to-br ring-yellow-300/90 shadow-lg shadow-black/30 flex items-center justify-center',
          universe.gradient
        )}
      >
        <span className="drop-shadow">{badge.emoji}</span>
      </div>
    </div>
  );
};
