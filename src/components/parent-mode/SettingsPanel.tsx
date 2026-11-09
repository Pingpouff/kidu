import React, { useRef, useState } from 'react';
import { ParentSettings, DEFAULT_FEEDBACK, FeedbackSettings } from '../../domain/models';
import { starsPerMedal } from '../../domain/rewards';
import { BackupError, parseBackup } from '../../domain/backup';
import { translate, Language } from '../../i18n/dictionary';
import { Save, AlertOctagon, Download, Upload, HardDrive } from 'lucide-react';

interface SettingsPanelProps {
  settings: ParentSettings;
  language: Language;
  onSaveSettings: (settings: ParentSettings) => Promise<void>;
  onResetAllData: () => Promise<void>;
  onExportBackup: (includeHistory: boolean) => Promise<void>;
  onImportBackup: (fileContent: string) => Promise<void>;
}

type BackupStatus =
  | { kind: 'idle' }
  | { kind: 'confirm'; fileName: string; content: string }
  | { kind: 'success'; messageKey: string }
  | { kind: 'error'; messageKey: string };

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  language,
  onSaveSettings,
  onResetAllData,
  onExportBackup,
  onImportBackup,
}) => {
  const [pin, setPin] = useState(settings.parentPin);
  const [lang, setLang] = useState<Language>(settings.language);
  const [perMedal, setPerMedal] = useState<number>(starsPerMedal(settings));
  const [feedback, setFeedback] = useState<FeedbackSettings>({ ...DEFAULT_FEEDBACK, ...settings.feedback });
  const setFeedbackField = <K extends keyof FeedbackSettings>(key: K, value: FeedbackSettings[K]) =>
    setFeedback((f) => ({ ...f, [key]: value }));
  
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 4 || isNaN(Number(pin))) return;

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
      <h3 className="text-xl font-bold text-slate-100">
        {translate('parent.settings.title', language)}
      </h3>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* PIN Input */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">
              {translate('parent.settings.pin_label', language)}
            </label>
            <input
              type="text"
              maxLength={4}
              pattern="\d{4}"
              required
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="px-4 py-2.5 bg-slate-900 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500 text-white font-mono tracking-widest text-sm"
            />
          </div>

          {/* Language selection dropdown */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">
              {translate('parent.settings.language', language)}
            </label>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as Language)}
              className="px-4 py-2.5 bg-slate-900 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500 text-white text-sm"
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
              className="px-4 py-2.5 bg-slate-900 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500 text-white text-sm"
            />
          </div>

        </div>

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
              className="px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-white text-sm"
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
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 border border-indigo-400/20 text-white font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all text-sm"
          >
            <Save className="w-4.5 h-4.5" />
            <span>{translate('btn.save', language)}</span>
          </button>
          {savedSuccess && (
            <span className="text-xs font-bold text-emerald-400 animate-pulse">
              ✓ {language === 'fr' ? 'Paramètres sauvegardés !' : 'Settings saved!'}
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
            className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 border border-indigo-400/20 text-white flex items-center gap-2 active:scale-95 transition-all"
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
      <hr className="border-white/5 my-2" />

      {/* Dangerous Operations Zone */}
      <div className="bg-rose-950/15 border border-rose-500/20 p-5 rounded-2xl flex flex-col gap-3">
        <div className="flex items-center gap-3 text-rose-400 font-extrabold text-sm uppercase tracking-wider">
          <AlertOctagon className="w-5 h-5" />
          <span>Zone de danger</span>
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
              ? (language === 'fr' ? 'Confirmer la suppression' : 'Confirm suppression')
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
