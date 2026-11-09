import React from 'react';
import { cx } from './cx';

/** Title row of a Parent Mode section, with an optional description and action button. */
export const PanelHeader: React.FC<{
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}> = ({ title, description, action, className }) => (
  <div className={cx('flex justify-between items-start gap-3', className)}>
    <div className="min-w-0">
      <h3 className="text-lg sm:text-xl font-bold text-slate-100">{title}</h3>
      {description && <p className="text-xs text-white/50 mt-1 max-w-xl leading-relaxed">{description}</p>}
    </div>
    {action}
  </div>
);
