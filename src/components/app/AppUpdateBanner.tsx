import React from 'react';
import { RefreshCw } from 'lucide-react';
import { translate, Language } from '../../i18n/dictionary';
import { buttonClass } from '../../ui/styles';
import { Swipeable } from '../../ui/Swipeable';

interface AppUpdateBannerProps {
  language: Language;
  onUpdate: () => void;
  /** The update was started: the page is about to reload */
  updating?: boolean;
  onLater: () => void;
}

/**
 * Small bar at the bottom of the screen when a new version is ready.
 * Only shown outside a child's routine board, so an update never cuts a routine.
 */
export const AppUpdateBanner: React.FC<AppUpdateBannerProps> = ({ language, onUpdate, onLater, updating = false }) => (
  <div className="fixed bottom-4 inset-x-4 z-banner flex justify-center pointer-events-none">
  <Swipeable
    onDismiss={onLater}
    role="status"
    data-testid="update-banner"
    className="pointer-events-auto flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-indigo-400/30 bg-slate-900/95 backdrop-blur px-4 py-3 shadow-glass"
  >
    <span className="flex items-center gap-2 text-sm font-bold text-white">
      <RefreshCw className="w-4 h-4 text-indigo-300" />
      {translate('update.available', language)}
    </span>
    <div className="flex gap-2">
      <button type="button" onClick={onUpdate} disabled={updating} className={buttonClass('primary', 'sm')}>
        {updating && <RefreshCw className="w-4 h-4 animate-spin" />}
        {translate(updating ? 'update.applying' : 'update.apply', language)}
      </button>
      <button type="button" onClick={onLater} className={buttonClass('secondary', 'sm')}>
        {translate('update.later', language)}
      </button>
    </div>
  </Swipeable>
  </div>
);
