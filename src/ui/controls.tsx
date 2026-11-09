import React from 'react';
import { cx } from './cx';
import { iconButtonClass, IconButtonTone } from './styles';
import { useConfirmTap } from './useConfirmTap';

/* ------------------------------------------------------------------ */
/* Buttons                                                              */
/* ------------------------------------------------------------------ */

type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: IconButtonTone;
  /** Accessible name (icon-only button) */
  label: string;
};

export const IconButton: React.FC<IconButtonProps> = ({ tone = 'neutral', label, className, type = 'button', ...rest }) => (
  <button type={type} aria-label={label} className={iconButtonClass(tone, className)} {...rest} />
);

type ConfirmIconButtonProps = Omit<IconButtonProps, 'onClick' | 'tone'> & {
  onConfirm: () => void;
  /** Text shown once armed, e.g. "Delete?" */
  confirmText: string;
  icon: React.ReactNode;
};

/** Danger icon button that asks for a second tap before acting. */
export const ConfirmIconButton: React.FC<ConfirmIconButtonProps> = ({ onConfirm, confirmText, icon, label, className, ...rest }) => {
  const { armed, tap } = useConfirmTap(onConfirm);
  return (
    <button
      type="button"
      aria-label={label}
      data-confirm={armed}
      onClick={tap}
      className={cx(
        iconButtonClass('danger', className),
        armed && 'bg-rose-600 hover:bg-rose-600 border-rose-400 text-white'
      )}
      {...rest}
    >
      {icon}
      {armed && <span>{confirmText}</span>}
    </button>
  );
};

