import React, { useRef, useState } from 'react';
import { ParentSettings, DEFAULT_FEEDBACK, FeedbackSettings, DEFAULT_REMINDERS, ReminderSettings } from '../../domain/models';
import { starsPerMedal } from '../../domain/rewards';
import { isValidPin } from '../../domain/parentGate';
import {
  NotificationStatus,
  notificationStatus,
  requestNotificationPermission,
  showSystemNotification,
} from '../../services/notifications';
import { BackupError, parseBackup } from '../../domain/backup';
import { translate, Language, TranslationKey } from '../../i18n/dictionary';
import { Save, AlertOctagon, Download, Upload, HardDrive, Smartphone, RefreshCw, History } from 'lucide-react';
import type { AppUpdate } from '../../services/appUpdate';
import { APP_VERSION, CHANGELOG } from '../../domain/changelog';
import { WhatsNewModal } from '../app/WhatsNewModal';
import { buttonClass, fieldClass } from '../../ui/styles';
import { PanelHeader } from '../../ui/Panel';

interface SettingsPanelProps {
  settings: ParentSettings;
  language: Language;
  onSaveSettings: (settings: ParentSettings) => Promise<void>;
  onResetAllData: () => Promise<void>;
  onExportBackup: (includeHistory: boolean) => Promise<void>;
  onImportBackup: (fileContent: string) => Promise<void>;
  appUpdate?: AppUpdate;
}

type BackupStatus =
  | { kind: 'idle' }
  | { kind: 'confirm'; fileName: string; content: string }
  | { kind: 'success'; messageKey: TranslationKey }
  | { kind: 'error'; messageKey: TranslationKey };

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  language,
  onSaveSettings,
  onResetAllData,
  onExportBackup,
  onImportBackup,
  appUpdate,
}) => {
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [pin, setPin] = useState(settings.parentPin);
  const [pinInvalid, setPinInvalid] = useState(false);
  const [lang, setLang] = useState<Language>(settings.language);
  const [perMedal, setPerMedal] = useState<number>(starsPerMedal(settings));
  const [feedback, setFeedback] = useState<FeedbackSettings>({ ...DEFAULT_FEEDBACK, ...settings.feedback });
  const setFeedbackField = <K extends keyof FeedbackSettings>(key: K, value: FeedbackSettings[K]) =>
    setFeedback((f) => ({ ...f, [key]: value }));
  const [reminders, setReminders] = useState<ReminderSettings>({ ...DEFAULT_REMINDERS, ...settings.reminders });
  const [notifStatus, setNotifStatus] = useState<NotificationStatus>(notificationStatus());
  const [testResult, setTestResult] = useState<'sent' | 'failed' | null>(null);
  const setReminderField = <K extends keyof ReminderSettings>(key: K, value: ReminderSettings[K]) =>
    setReminders((r) => ({ ...r, [key]: value }));

  // System notifications need the browser permission. It is requested right in the
  // tap handler: Android only shows its permission prompt after a user gesture.
  const handleSystemNotifications = async (enabled: boolean) => {
    setTestResult(null);
    if (!enabled) {
      setReminderField('systemNotifications', false);
      return;
    }
    const status = await requestNotificationPermission();
    setNotifStatus(status);
    if (status === 'granted') setReminderField('systemNotifications', true);
  };

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleTestNotification = async () => {
    const ok = await showSystemNotification('⏰ Kidu', {
      body: translate('parent.reminders.test_body', language),
      tag: 'kidu-test',
    });
    setTestResult(ok ? 'sent' : 'failed');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidPin(pin)) {
      setPinInvalid(true);
      return;
    }
    setPinInvalid(false);

    // Keep the fields edited elsewhere (shop, …)
    await onSaveSettings({
      ...settings,
      parentPin: pin,
      language: lang,
      rewards: {
        ...settings.rewards,
        starsPerMedal: Math.max(1, Number(perMedal)),
      },
      feedback,
      reminders: {
        ...reminders,
        repeatMinutes: Math.max(1, Number(reminders.repeatMinutes)),
        maxReminders: Math.max(1, Number(reminders.maxReminders)),
      },
    });

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const [includeHistory, setIncludeHistory] = useState(false);
  const [backupStatus, setBackupStatus] = useState<BackupStatus>({ kind: 'idle' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const backupErrorKey = (err: unknown) =>
    err instanceof BackupError && err.code === 'unsupported_version'
      ? 'parent.backup.error_version'
      : 'parent.backup.error';

  const handleExport = async () => {
    await onExportBackup(includeHistory);
    setBackupStatus({ kind: 'success', messageKey: 'parent.backup.export_success' });
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Allow re-selecting the same file later
    e.target.value = '';
    if (!file) return;

    try {
      const content = await file.text();
      parseBackup(content); // Validate before asking for confirmation
      setBackupStatus({ kind: 'confirm', fileName: file.name, content });
    } catch (err) {
      setBackupStatus({ kind: 'error', messageKey: backupErrorKey(err) });
    }
  };

  const handleConfirmImport = async () => {
    if (backupStatus.kind !== 'confirm') return;
    try {
      await onImportBackup(backupStatus.content);
      setBackupStatus({ kind: 'success', messageKey: 'parent.backup.import_success' });
      // Reload so every screen picks up the restored configuration
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      setBackupStatus({ kind: 'error', messageKey: backupErrorKey(err) });
    }
  };

  const handleResetClick = async () => {
    if (showResetConfirm) {
      await onResetAllData();
      setShowResetConfirm(false);
      window.location.reload();
    } else {
      setShowResetConfirm(true);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PanelHeader title={translate('parent.settings.title', language)} />

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* PIN Input */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">
              {translate('parent.settings.pin_label', language)}
            </label>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              pattern="\d{4}"
              required
              aria-label={translate('parent.settings.pin_label', language)}
              aria-invalid={pinInvalid}
              value={pin}
              onChange={(e) => {
                setPin(e.target.value.replace(/\D/g, '').slice(0, 4));
                setPinInvalid(false);
              }}
              className={fieldClass('md', 'font-mono tracking-widest')}
            />
            {pinInvalid && <p className="text-xs text-rose-400">{translate('parent.settings.pin_invalid', language)}</p>}
          </div>

          {/* Language selection dropdown */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">
              {translate('parent.settings.language', language)}
            </label>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as Language)}
              className={fieldClass('md')}
            >
              <option value="fr">Français 🇫🇷</option>
              <option value="en">English 🇬🇧</option>
            </select>
          </div>

          {/* Stars needed for a medal */}
          <div className="flex flex-col gap-2">
            <label htmlFor="stars-per-medal" className="text-xs font-bold text-slate-400 uppercase tracking-wide">
              {translate('parent.settings.stars_per_medal', language)}
            </label>
            <input
              id="stars-per-medal"
              type="number"
              min={1}
              max={10}
              required
              value={perMedal}
              onChange={(e) => setPerMedal(Number(e.target.value))}
              className={fieldClass('md')}
            />
          </div>

        </div>

        {/* Reminders for late tasks */}
        <fieldset className="flex flex-col gap-3 bg-white/5 border border-white/10 rounded-2xl p-4" data-testid="reminder-settings">
          <legend className="px-2 text-xs font-bold text-slate-400 uppercase tracking-wide">
            {translate('parent.reminders.title', language)}
          </legend>
          <p className="text-xs text-white/50 leading-relaxed -mt-1">
            {translate('parent.reminders.description', language)}
          </p>
          <label className="flex items-center gap-3 text-sm text-white/85 cursor-pointer w-fit">
            <input
              type="checkbox"
              checked={reminders.enabled}
              onChange={(e) => setReminderField('enabled', e.target.checked)}
              className="w-4 h-4 accent-indigo-500"
            />
            {translate('parent.reminders.enabled', language)}
          </label>
          <div className={`flex flex-col gap-3 ${reminders.enabled ? '' : 'opacity-40 pointer-events-none'}`}>
            <label className="flex flex-wrap items-center gap-3 text-sm text-white/85">
              <span>{translate('parent.reminders.repeat', language)}</span>
              <input
                type="number"
                min={1}
                max={60}
                value={reminders.repeatMinutes}
                onChange={(e) => setReminderField('repeatMinutes', Number(e.target.value))}
                className={fieldClass('md', 'w-20 px-3 text-center')}
              />
              <span className="text-white/50 text-xs">min</span>
            </label>
            <label className="flex flex-wrap items-center gap-3 text-sm text-white/85">
              <span>{translate('parent.reminders.max', language)}</span>
              <input
                type="number"
                min={1}
                max={10}
                value={reminders.maxReminders}
                onChange={(e) => setReminderField('maxReminders', Number(e.target.value))}
                className={fieldClass('md', 'w-20 px-3 text-center')}
              />
            </label>
            <label className="flex items-center gap-3 text-sm text-white/85 cursor-pointer w-fit">
              <input
                type="checkbox"
                checked={reminders.systemNotifications}
                onChange={(e) => handleSystemNotifications(e.target.checked)}
                className="w-4 h-4 accent-indigo-500"
              />
              {translate('parent.reminders.system', language)}
            </label>
            <div className="flex flex-wrap items-center gap-3 text-xs" data-testid="notification-status">
              <span className="text-white/50">{translate('parent.reminders.permission', language)}</span>
              <span
                className={`font-bold px-2 py-0.5 rounded-full ${
                  notifStatus === 'granted'
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : notifStatus === 'denied'
                      ? 'bg-rose-500/20 text-rose-300'
                      : 'bg-white/10 text-white/60'
                }`}
              >
                {translate(`parent.reminders.permission_${notifStatus}`, language)}
              </span>
              {notifStatus === 'granted' && (
                <button
                  type="button"
                  onClick={handleTestNotification}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold"
                >
                  🔔 {translate('parent.reminders.test', language)}
                </button>
              )}
              {testResult && (
                <span className={testResult === 'sent' ? 'text-emerald-300' : 'text-amber-300'}>
                  {translate(`parent.reminders.test_${testResult}`, language)}
                </span>
              )}
            </div>
            {notifStatus === 'denied' && (
              <p className="text-xs text-amber-300 leading-relaxed">{translate('parent.reminders.denied_help', language)}</p>
            )}
            {notifStatus === 'unsupported' && (
              <p className="text-xs text-amber-300 leading-relaxed">{translate('parent.reminders.unsupported_help', language)}</p>
            )}
            <p className="text-[11px] text-white/40 leading-relaxed">
              {translate('parent.reminders.limits', language)}
            </p>
          </div>
        </fieldset>

        {/* Sounds & animations */}
        <fieldset className="flex flex-col gap-3 bg-white/5 border border-white/10 rounded-2xl p-4">
          <legend className="px-2 text-xs font-bold text-slate-400 uppercase tracking-wide">
            {translate('parent.feedback.title', language)}
          </legend>
          <p className="text-xs text-white/50 leading-relaxed -mt-1">
            {translate('parent.feedback.description', language)}
          </p>
          {([
            ['sounds', 'parent.feedback.sounds'],
            ['voice', 'parent.feedback.voice'],
            ['songs', 'parent.feedback.songs'],
          ] as const).map(([key, labelKey]) => (
            <label key={key} className="flex items-center gap-3 text-sm text-white/85 cursor-pointer w-fit">
              <input
                type="checkbox"
                checked={feedback[key]}
                onChange={(e) => setFeedbackField(key, e.target.checked)}
                className="w-4 h-4 accent-indigo-500"
              />
              {translate(labelKey, language)}
            </label>
          ))}
          <label className="flex flex-wrap items-center gap-3 text-sm text-white/85">
            <span>{translate('parent.feedback.volume', language)}</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={feedback.volume}
              onChange={(e) => setFeedbackField('volume', Number(e.target.value))}
              className="w-40 accent-indigo-500"
            />
            <span className="text-white/50 text-xs w-10">{Math.round(feedback.volume * 100)}%</span>
          </label>
          <label className="flex flex-wrap items-center gap-3 text-sm text-white/85">
            <span>{translate('parent.feedback.animations', language)}</span>
            <select
              value={feedback.animations}
              onChange={(e) => setFeedbackField('animations', e.target.value as FeedbackSettings['animations'])}
              className={fieldClass('md', 'px-3')}
            >
              <option value="full">{translate('parent.feedback.animations_full', language)}</option>
              <option value="reduced">{translate('parent.feedback.animations_reduced', language)}</option>
            </select>
          </label>
        </fieldset>

        {/* Action Button Row */}
        <div className="flex items-center gap-4 mt-2">
          <button
            type="submit"
            className={buttonClass('primary', 'md', 'px-6')}
          >
            <Save className="w-4.5 h-4.5" />
            <span>{translate('btn.save', language)}</span>
          </button>
          {savedSuccess && (
            <span className="text-xs font-bold text-emerald-400 animate-pulse">
              ✓ {translate('parent.settings.saved', language)}
            </span>
          )}
        </div>
      </form>

      {/* Divider */}
      <hr className="border-white/5 my-2" />

      {/* Backup Zone */}
      <div className="bg-indigo-950/20 border border-indigo-500/20 p-5 rounded-2xl flex flex-col gap-3">
        <div className="flex items-center gap-3 text-indigo-300 font-extrabold text-sm uppercase tracking-wider">
          <HardDrive className="w-5 h-5" />
          <span>{translate('parent.backup.title', language)}</span>
        </div>
        <p className="text-xs text-white/50 leading-relaxed max-w-xl">
          {translate('parent.backup.description', language)}
        </p>

        <label className="flex items-center gap-2 text-xs text-white/70 cursor-pointer w-fit">
          <input
            type="checkbox"
            checked={includeHistory}
            onChange={(e) => setIncludeHistory(e.target.checked)}
            className="accent-indigo-500"
          />
          {translate('parent.backup.include_history', language)}
        </label>

        <div className="flex flex-wrap items-center gap-3 mt-1">
          <button
            type="button"
            onClick={handleExport}
            className={buttonClass('primary', 'sm')}
          >
            <Download className="w-4 h-4" />
            <span>{translate('parent.backup.export', language)}</span>
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white flex items-center gap-2 active:scale-95 transition-all"
          >
            <Upload className="w-4 h-4" />
            <span>{translate('parent.backup.import', language)}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleFileSelected}
            className="hidden"
            data-testid="backup-file-input"
          />
        </div>

        {backupStatus.kind === 'confirm' && (
          <div className="flex flex-col gap-3 mt-1 p-4 rounded-xl bg-amber-950/20 border border-amber-500/30">
            <p className="text-xs text-amber-200 leading-relaxed">
              <span className="font-mono font-bold">{backupStatus.fileName}</span>
              {' — '}
              {translate('parent.backup.import_confirm', language)}
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleConfirmImport}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-500 border border-amber-500 text-white active:scale-95 transition-all"
              >
                {translate('parent.backup.import_confirm_btn', language)}
              </button>
              <button
                type="button"
                onClick={() => setBackupStatus({ kind: 'idle' })}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors"
              >
                {translate('btn.cancel', language)}
              </button>
            </div>
          </div>
        )}
        {backupStatus.kind === 'success' && (
          <span className="text-xs font-bold text-emerald-400" role="status">
            ✓ {translate(backupStatus.messageKey, language)}
          </span>
        )}
        {backupStatus.kind === 'error' && (
          <span className="text-xs font-bold text-rose-400" role="alert">
            {translate(backupStatus.messageKey, language)}
          </span>
        )}
      </div>

      {/* Divider */}
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
            <button type="button" onClick={appUpdate.applyUpdate} className={buttonClass('success', 'sm')}>
              <RefreshCw className="w-4 h-4" />
              <span>{translate('update.apply', language)}</span>
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

      <hr className="border-white/5 my-2" />

      {/* Dangerous Operations Zone */}
      <div className="bg-rose-950/15 border border-rose-500/20 p-5 rounded-2xl flex flex-col gap-3">
        <div className="flex items-center gap-3 text-rose-400 font-extrabold text-sm uppercase tracking-wider">
          <AlertOctagon className="w-5 h-5" />
          <span>{translate('parent.danger.title', language)}</span>
        </div>
        <p className="text-xs text-white/50 leading-relaxed max-w-xl">
          {translate('parent.settings.reset_db_confirm', language)}
        </p>

        <div className="flex flex-wrap items-center gap-3 mt-1">
          <button
            onClick={handleResetClick}
            className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all active:scale-95 ${
              showResetConfirm
                ? 'bg-rose-600 hover:bg-rose-500 border-rose-500 text-white'
                : 'bg-white/5 hover:bg-rose-900/20 border-white/10 text-rose-400'
            }`}
          >
            {showResetConfirm
              ? translate('parent.danger.confirm', language)
              : translate('parent.settings.reset_all_db', language)}
          </button>
          
          {showResetConfirm && (
            <button
              onClick={() => setShowResetConfirm(false)}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors"
            >
              {translate('btn.cancel', language)}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
