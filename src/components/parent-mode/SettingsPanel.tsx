import React, { useState } from 'react';
import {
  ParentSettings,
  DEFAULT_FEEDBACK,
  FeedbackSettings,
  DEFAULT_REMINDERS,
  DEFAULT_TIMER_WARNINGS,
  ReminderSettings,
  TIMER_WARNING_CHOICES,
  VisualsSetting,
  EmotionSettings,
} from '../../domain/models';
import { emotionSettings } from '../../features/emotions/domain/settings';
import { isLowEndDevice, resolveVisuals } from '../../services/performance';
import { starsPerMedal } from '../../domain/rewards';
import { isValidPin } from '../../domain/parentGate';
import {
  NotificationStatus,
  notificationStatus,
  requestNotificationPermission,
  showSystemNotification,
} from '../../services/notifications';
import { translate, Language } from '../../i18n/dictionary';
import { Save } from 'lucide-react';
import type { AppUpdate } from '../../services/appUpdate';
import { buttonClass, chipClass, fieldClass } from '../../ui/styles';
import { PanelHeader } from '../../ui/Panel';
import { BackupSection } from './settings/BackupSection';
import { AppSection } from './settings/AppSection';
import { DangerZone } from './settings/DangerZone';

interface SettingsPanelProps {
  settings: ParentSettings;
  language: Language;
  onSaveSettings: (settings: ParentSettings) => Promise<void>;
  onResetAllData: () => Promise<void>;
  onExportBackup: (includeHistory: boolean) => Promise<void>;
  onImportBackup: (fileContent: string) => Promise<void>;
  appUpdate?: AppUpdate;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  language,
  onSaveSettings,
  onResetAllData,
  onExportBackup,
  onImportBackup,
  appUpdate,
}) => {
  const [pin, setPin] = useState(settings.parentPin);
  const [pinInvalid, setPinInvalid] = useState(false);
  const [lang, setLang] = useState<Language>(settings.language);
  const [perMedal, setPerMedal] = useState<number>(starsPerMedal(settings));
  const [feedback, setFeedback] = useState<FeedbackSettings>({ ...DEFAULT_FEEDBACK, ...settings.feedback });
  const setFeedbackField = <K extends keyof FeedbackSettings>(key: K, value: FeedbackSettings[K]) =>
    setFeedback((f) => ({ ...f, [key]: value }));
  const [emotions, setEmotions] = useState<EmotionSettings>(() => emotionSettings(settings));
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
      // Custom strategies are edited in the Émotions tab: keep the stored ones
      emotions: { ...emotions, adultName: emotions.adultName.trim(), customStrategies: emotionSettings(settings).customStrategies },
      reminders: {
        ...reminders,
        repeatMinutes: Math.max(1, Number(reminders.repeatMinutes)),
        maxReminders: Math.max(1, Number(reminders.maxReminders)),
      },
    });

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
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
            {/* Timed tasks: "minutes left" warnings */}
            <div className="flex flex-wrap items-center gap-2 text-sm text-white/85" role="group" aria-label={translate('parent.reminders.timer_warnings', language)} data-testid="timer-warnings">
              <span>⏳ {translate('parent.reminders.timer_warnings', language)}</span>
              {TIMER_WARNING_CHOICES.map((m) => {
                const current = reminders.timerWarnings ?? DEFAULT_TIMER_WARNINGS;
                const active = current.includes(m);
                return (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      setReminderField('timerWarnings', active ? current.filter((x) => x !== m) : [...current, m].sort((a, b) => b - a))
                    }
                    className={chipClass(active, true)}
                  >
                    {m} min
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-white/50 -mt-1">{translate('parent.reminders.timer_help', language)}</p>
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

        {/* Mes émotions */}
        <fieldset className="flex flex-col gap-3 bg-white/5 border border-white/10 rounded-2xl p-4" data-testid="settings-emotions">
          <legend className="px-2 text-xs font-bold text-slate-400 uppercase tracking-wide">
            {translate('parent.emotions.title', language)}
          </legend>
          <p className="text-xs text-white/50 leading-relaxed -mt-1">{translate('parent.emotions.description', language)}</p>
          <label className="flex items-center gap-3 text-sm text-white/85 cursor-pointer w-fit">
            <input
              type="checkbox"
              checked={emotions.enabled}
              onChange={(e) => setEmotions((em) => ({ ...em, enabled: e.target.checked }))}
              className="w-4 h-4 accent-indigo-500"
            />
            {translate('parent.emotions.enabled', language)}
          </label>
          <label className="flex items-center gap-3 text-sm text-white/85 cursor-pointer w-fit">
            <input
              type="checkbox"
              checked={emotions.eveningCheckIn}
              disabled={!emotions.enabled}
              onChange={(e) => setEmotions((em) => ({ ...em, eveningCheckIn: e.target.checked }))}
              className="w-4 h-4 accent-indigo-500"
              data-testid="settings-evening-checkin"
            />
            {translate('parent.emotions.evening', language)}
          </label>
          <label className="flex flex-wrap items-center gap-3 text-sm text-white/85">
            <span>{translate('parent.emotions.adult_name', language)}</span>
            <input
              type="text"
              value={emotions.adultName}
              maxLength={40}
              placeholder={translate('emo.adult_default', language)}
              onChange={(e) => setEmotions((em) => ({ ...em, adultName: e.target.value }))}
              className={fieldClass('md', 'px-3 w-56')}
              data-testid="settings-adult-name"
            />
          </label>
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
          <label className="flex flex-wrap items-center gap-3 text-sm text-white/85">
            <span>{translate('parent.feedback.visuals', language)}</span>
            <select
              value={feedback.visuals ?? 'auto'}
              onChange={(e) => setFeedbackField('visuals', e.target.value as VisualsSetting)}
              className={fieldClass('md', 'px-3')}
              data-testid="settings-visuals"
            >
              <option value="auto">
                {translate('parent.feedback.visuals_auto', language, {
                  detected: translate(`parent.feedback.visuals_detected_${resolveVisuals('auto', isLowEndDevice())}`, language),
                })}
              </option>
              <option value="rich">{translate('parent.feedback.visuals_rich', language)}</option>
              <option value="lite">{translate('parent.feedback.visuals_lite', language)}</option>
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

      <BackupSection
        settings={settings}
        language={language}
        onExportBackup={onExportBackup}
        onImportBackup={onImportBackup}
      />

      {/* Divider */}
      <AppSection language={language} appUpdate={appUpdate} />

      <hr className="border-white/5 my-2" />

      <DangerZone language={language} onResetAllData={onResetAllData} />
    </div>
  );
};
