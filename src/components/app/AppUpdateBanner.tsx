import React from 'react';
import { RefreshCw } from 'lucide-react';
import { translate, Language } from '../../i18n/dictionary';
import { buttonClass } from '../../ui/styles';

interface AppUpdateBannerProps {
  language: Language;
  onUpdate: () => void;
  onLater: () => void;
}

/**
 * Small bar at the bottom of the screen when a new version is ready.
 * Only shown outside a child's routine board, so an update never cuts a routine.
 */
export const AppUpdateBanner: React.FC<AppUpdateBannerProps> = ({ language, onUpdate, onLater }) => (
  <div
    role="status"
    data-testid="update-banner"
    className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-banner flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-indigo-400/30 bg-slate-900/95 backdrop-blur px-4 py-3 shadow-glass"
  >
    <span className="flex items-center gap-2 text-sm font-bold text-white">
      <RefreshCw className="w-4 h-4 text-indigo-300" />
      {translate('update.available', language)}
    </span>
    <div className="flex gap-2">
      <button type="button" onClick={onUpdate} className={buttonClass('primary', 'sm')}>
        {translate('update.apply', language)}
      </button>
      <button type="button" onClick={onLater} className={buttonClass('secondary', 'sm')}>
        {translate('update.later', language)}
      </button>
    </div>
  </div>
);
