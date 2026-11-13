import React from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { APP_VERSION, CHANGELOG } from '../../domain/changelog';
import { translate, Language } from '../../i18n/dictionary';
import { Modal } from '../../ui/Overlay';
import { buttonClass } from '../../ui/styles';
import type { AppUpdate } from '../../services/appUpdate';
import { InstallState, promptInstall } from '../../services/install';
import { ChangelogList } from './ChangelogList';

interface AboutModalProps {
  language: Language;
  install: InstallState;
  appUpdate?: AppUpdate;
  onClose: () => void;
}

/** App name, version, install / update actions and the version history. Open to everyone (no PIN). */
export const AboutModal: React.FC<AboutModalProps> = ({ language, install, appUpdate, onClose }) => {
  const title = translate('about.title', language);
  return (
    <Modal
      layer="dialog"
      label={title}
      closeLabel={translate('btn.close', language)}
      onClose={onClose}
      testId="about"
      panelClassName="max-w-lg p-6 sm:p-8 flex flex-col gap-5 screen-max-h-90"
    >
      <div className="flex items-center gap-4 pr-8">
        <img src={`${import.meta.env.BASE_URL}icon-192.png`} alt="" className="w-14 h-14 rounded-2xl shadow-lg" />
        <div className="min-w-0">
          <h2 className="text-2xl font-extrabold text-white">Kidu</h2>
          <p className="text-sm text-white/70">{translate('about.tagline', language)}</p>
          <p className="text-sm font-bold text-indigo-200" data-testid="about-version">
            {translate('about.version', language, { version: APP_VERSION })}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {install.kind === 'available' && (
          <button type="button" onClick={() => promptInstall()} className={buttonClass('primary', 'md', 'self-start')}>
            <Download className="w-4 h-4" />
            {translate('install.button', language)}
          </button>
        )}
        {install.kind === 'ios' && <p className="text-sm text-white/80">{translate('install.ios', language)}</p>}
        {install.kind === 'installed' && <p className="text-sm text-emerald-300">{translate('about.installed', language)}</p>}
        {install.kind === 'unavailable' && <p className="text-xs text-white/60">{translate('install.unavailable', language)}</p>}

        {appUpdate &&
          (appUpdate.updateAvailable ? (
            <button
              type="button"
              onClick={appUpdate.applyUpdate}
              disabled={appUpdate.updating}
              className={buttonClass('success', 'sm', 'self-start')}
            >
              <RefreshCw className={`w-4 h-4 ${appUpdate.updating ? 'animate-spin' : ''}`} />
              {translate(appUpdate.updating ? 'update.applying' : 'update.apply', language)}
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={appUpdate.checkNow}
                disabled={appUpdate.lastCheck === 'checking'}
                className={buttonClass('secondary', 'sm')}
              >
                <RefreshCw className={`w-4 h-4 ${appUpdate.lastCheck === 'checking' ? 'animate-spin' : ''}`} />
                {translate(appUpdate.lastCheck === 'checking' ? 'parent.app.checking' : 'parent.app.check', language)}
              </button>
              {(appUpdate.lastCheck === 'up_to_date' || appUpdate.lastCheck === 'unavailable') && (
                <span className="text-xs text-white/60">{translate(`parent.app.${appUpdate.lastCheck}`, language)}</span>
              )}
            </div>
          ))}
      </div>

      <div className="flex flex-col gap-3 min-h-0">
        <h3 className="text-xs font-bold uppercase tracking-wider text-white/60">{translate('about.changelog', language)}</h3>
        <div className="min-h-0 overflow-y-auto overscroll-contain pr-1" data-testid="about-changelog">
          <ChangelogList entries={CHANGELOG} language={language} />
        </div>
      </div>
    </Modal>
  );
};
