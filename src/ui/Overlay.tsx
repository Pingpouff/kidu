import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { cx } from './cx';
import { Layer, LAYER } from './layers';

/* ------------------------------------------------------------------ */
/* Open overlays, so Escape closes only the top one and the page behind */
/* doesn't scroll while any overlay is open.                            */
/* ------------------------------------------------------------------ */
const openStack: string[] = [];

function useOverlayStack(id: string, onEscape?: () => void) {
  const escapeRef = useRef(onEscape);
  escapeRef.current = onEscape;

  useEffect(() => {
    openStack.push(id);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && openStack[openStack.length - 1] === id && escapeRef.current) {
        e.stopPropagation();
        escapeRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      const index = openStack.indexOf(id);
      if (index >= 0) openStack.splice(index, 1);
      if (openStack.length === 0) document.body.style.overflow = previousOverflow;
    };
  }, [id]);
}

export interface OverlayProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'role'> {
  /** Stacking level (see layers.ts) */
  layer: Layer;
  /** Escape key (and backdrop clicks with `closeOnBackdrop`) */
  onClose?: () => void;
  /** Close when the backdrop itself (not its content) is clicked */
  closeOnBackdrop?: boolean;
  role?: 'dialog' | 'alertdialog' | 'presentation';
  children: React.ReactNode;
}

/**
 * Full-screen layer: fixed, stacked by `layer`, scroll lock, Escape to close.
 * Background and layout come from `className`.
 */
export const Overlay = React.forwardRef<HTMLDivElement, OverlayProps>(function Overlay(
  { layer, onClose, closeOnBackdrop = false, role = 'dialog', className, onClick, children, ...rest },
  ref
) {
  const id = useId();
  useOverlayStack(id, onClose);

  return (
    <div
      ref={ref}
      role={role}
      aria-modal={role === 'presentation' ? undefined : true}
      className={cx('fixed inset-0', LAYER[layer], className)}
      onClick={(e) => {
        onClick?.(e);
        if (closeOnBackdrop && e.target === e.currentTarget) onClose?.();
      }}
      {...rest}
    >
      {children}
    </div>
  );
});

/** Round "×" button in the corner of a panel. */
export const CloseButton: React.FC<{ onClick: () => void; label: string; size?: 'md' | 'lg'; className?: string }> = ({
  onClick,
  label,
  size = 'md',
  className,
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    className={cx('absolute top-4 right-4 text-white/50 hover:text-white transition-colors', className)}
  >
    <X className={size === 'lg' ? 'w-7 h-7' : 'w-6 h-6'} />
  </button>
);

export interface ModalProps {
  layer?: Layer;
  /** Accessible name of the dialog */
  label: string;
  onClose: () => void;
  /** Text of the close button's accessible label */
  closeLabel: string;
  closeOnBackdrop?: boolean;
  /** Extra classes for the panel (width, padding, layout) */
  panelClassName?: string;
  closeSize?: 'md' | 'lg';
  /** Space between the screen edges and the panel */
  backdropPadding?: string;
  testId?: string;
  children: React.ReactNode;
}

/**
 * Centered glass panel over a dimmed backdrop, with a close button.
 */
export const Modal: React.FC<ModalProps> = ({
  layer = 'overlay',
  label,
  onClose,
  closeLabel,
  closeOnBackdrop = true,
  panelClassName,
  closeSize = 'md',
  backdropPadding = 'p-2 sm:p-4',
  testId,
  children,
}) => (
  <Overlay
    layer={layer}
    role="presentation"
    onClose={onClose}
    closeOnBackdrop={closeOnBackdrop}
    className={cx('flex items-center justify-center bg-black/80 backdrop-blur-sm select-none', backdropPadding)}
  >
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      data-testid={testId}
      className={cx('glass-panel w-full relative', panelClassName)}
      onClick={(e) => e.stopPropagation()}
    >
      <CloseButton onClick={onClose} label={closeLabel} size={closeSize} />
      {children}
    </div>
  </Overlay>
);
