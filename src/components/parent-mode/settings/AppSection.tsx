import React, { useEffect, useState } from 'react';
import { Smartphone, RefreshCw, History } from 'lucide-react';
import { translate, Language } from '../../../i18n/dictionary';
import type { AppUpdate } from '../../../services/appUpdate';
import { APP_VERSION, CHANGELOG } from '../../../domain/changelog';
import { StorageProtection, storageProtection } from '../../../services/storage';
import { WhatsNewModal } from '../../app/WhatsNewModal';
import { buttonClass } from '../../../ui/styles';

interface AppSectionProps {
  language: Language;
  appUpdate?: AppUpdate;
}

/** Installed version, update check, version history and storage protection (Settings). */
export const AppSection: React.FC<AppSectionProps> = ({ language, appUpdate }) => {
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [storage, setStorage] = useState<StorageProtection | null>(null);
  useEffect(() => {
    storageProtection().then(setStorage);
  }, []);

  return (
    <>
      {/* App version and updates */}
      <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col gap-3" data-testid="app-version">
        <div className="flex items-center gap-3 text-indigo-300 font-extrabold text-sm uppercase tracking-wider">
          <Smartphone className="w-5 h-5" />
          <span>{translate('parent.app.title', language)}</span>
        </div>
        <p className="text-sm text-white/70">
          {translate('parent.app.version', language)}{language === 'fr' ? ' : ' : ': '}<strong className="text-white">{APP_VERSION}</strong>
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {appUpdate?.updateAvailable ? (
            <button type="button" onClick={appUpdate.applyUpdate} disabled={appUpdate.updating} className={buttonClass('success', 'sm')}>
              <RefreshCw className={`w-4 h-4 ${appUpdate.updating ? 'animate-spin' : ''}`} />
              <span>{translate(appUpdate.updating ? 'update.applying' : 'update.apply', language)}</span>
            </button>
          ) : (
            appUpdate && (
              <button
                type="button"
                onClick={appUpdate.checkNow}
                disabled={appUpdate.lastCheck === 'checking'}
                className={buttonClass('secondary', 'sm')}
              >
                <RefreshCw className={`w-4 h-4 ${appUpdate.lastCheck === 'checking' ? 'animate-spin' : ''}`} />
                <span>{translate(appUpdate.lastCheck === 'checking' ? 'parent.app.checking' : 'parent.app.check', language)}</span>
              </button>
            )
          )}
          <button type="button" onClick={() => setShowVersionHistory(true)} className={buttonClass('secondary', 'sm')}>
            <History className="w-4 h-4" />
            <span>{translate('parent.app.history', language)}</span>
          </button>
        </div>
        {storage && (
          <p className="text-xs text-white/60" data-testid="storage-protection">
            {translate('parent.app.storage', language)}
            {language === 'fr' ? ' : ' : ': '}
            <strong className={storage === 'persisted' ? 'text-emerald-300' : 'text-amber-300'}>
              {translate(`parent.app.storage_${storage}`, language)}
            </strong>
          </p>
        )}
        {appUpdate?.updateAvailable && (
          <p className="text-xs text-emerald-300">{translate('update.available', language)}</p>
        )}
        {!appUpdate?.updateAvailable && (appUpdate?.lastCheck === 'up_to_date' || appUpdate?.lastCheck === 'unavailable') && (
          <p className="text-xs text-white/50">{translate(`parent.app.${appUpdate.lastCheck}`, language)}</p>
        )}
      </div>

      {showVersionHistory && (
        <WhatsNewModal entries={CHANGELOG} language={language} mode="history" onClose={() => setShowVersionHistory(false)} />
      )}
    </>
  );
};
