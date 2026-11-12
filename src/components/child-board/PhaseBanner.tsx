import React from 'react';
import { CATEGORY_ICONS, TaskCategory } from '../../domain/models';
import { translate, Language } from '../../i18n/dictionary';
import { useAutoDismiss } from '../../ui/useAutoDismiss';

const SHOW_MS = 2500;

/**
 * "Step complete!" toast: closes by itself, stays while touched, tap to close.
 */
export const PhaseBanner: React.FC<{ category: TaskCategory; language: Language; onClose: () => void }> = ({ category, language, onClose }) => {
  const auto = useAutoDismiss(SHOW_MS, onClose);
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
      <button
        type="button"
        role="status"
        data-testid="phase-banner"
        onClick={onClose}
        {...auto.handlers}
        className="pointer-events-auto glass-panel px-8 py-6 flex flex-col items-center gap-2 animate-bounce border-yellow-400/40"
      >
        <span className="text-6xl">{CATEGORY_ICONS[category]}</span>
        <span className="text-2xl font-black text-yellow-300">{translate('board.phase_done', language)}</span>
      </button>
    </div>
  );
};
