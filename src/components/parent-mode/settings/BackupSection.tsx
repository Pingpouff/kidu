import React, { useRef, useState } from 'react';
import { Download, Upload, HardDrive } from 'lucide-react';
import { ParentSettings } from '../../../domain/models';
import { BackupError, parseBackup } from '../../../domain/backup';
import { translate, Language, TranslationKey } from '../../../i18n/dictionary';
import { buttonClass } from '../../../ui/styles';

type BackupStatus =
  | { kind: 'idle' }
  | { kind: 'confirm'; fileName: string; content: string }
  | { kind: 'success'; messageKey: TranslationKey }
  | { kind: 'error'; messageKey: TranslationKey };

interface BackupSectionProps {
  settings: ParentSettings;
  language: Language;
  onExportBackup: (includeHistory: boolean) => Promise<void>;
  onImportBackup: (fileContent: string) => Promise<void>;
}

/** Export the configuration to a file, or restore it from one (Settings). */
export const BackupSection: React.FC<BackupSectionProps> = ({ settings, language, onExportBackup, onImportBackup }) => {
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

  return (
    <div className="bg-indigo-950/20 border border-indigo-500/20 p-5 rounded-2xl flex flex-col gap-3">
      <div className="flex items-center gap-3 text-indigo-300 font-extrabold text-sm uppercase tracking-wider">
        <HardDrive className="w-5 h-5" />
        <span>{translate('parent.backup.title', language)}</span>
      </div>
      <p className="text-xs text-white/50 leading-relaxed max-w-xl">
        {translate('parent.backup.description', language)}
      </p>
      <p className="text-xs text-white/60" data-testid="last-backup">
        {translate('parent.backup.last', language)}{' '}
        <strong className="text-white/80">
          {settings.lastBackupAt
            ? new Intl.DateTimeFormat(language === 'fr' ? 'fr-FR' : 'en-US', { dateStyle: 'long', timeStyle: 'short' }).format(settings.lastBackupAt)
            : translate('parent.backup.never', language)}
        </strong>
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
  );
};
