import React from 'react';
import { Download } from 'lucide-react';
import { translate, Language } from '../../i18n/dictionary';
import { buttonClass } from '../../ui/styles';
import { InstallState, promptInstall } from '../../services/install';

interface InstallBannerProps {
  install: InstallState;
  language: Language;
  onDismiss: () => void;
}

/** Home screen invitation to install the app (replaces the browser's easy-to-miss one). */
export const InstallBanner: React.FC<InstallBannerProps> = ({ install, language, onDismiss }) => {
  if (install.kind !== 'available' && install.kind !== 'ios') return null;
  return (
    <div
      role="status"
      data-testid="install-banner"
      className="z-10 w-full max-w-3xl mx-auto flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-indigo-300/30 bg-indigo-950/70 backdrop-blur px-4 py-3 text-sm text-white/90"
    >
      <span className="text-center">📲 {translate(install.kind === 'ios' ? 'install.ios' : 'install.invite', language)}</span>
      <div className="flex gap-2">
        {install.kind === 'available' && (
          <button type="button" onClick={() => promptInstall()} className={buttonClass('primary', 'sm')}>
            <Download className="w-4 h-4" />
            {translate('install.button', language)}
          </button>
        )}
        <button type="button" onClick={onDismiss} className={buttonClass('secondary', 'sm')}>
          {translate(install.kind === 'ios' ? 'install.ios_ok' : 'install.later', language)}
        </button>
      </div>
    </div>
  );
};
