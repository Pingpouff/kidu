import React from 'react';
import { Sparkles } from 'lucide-react';
import { ChangelogEntry } from '../../domain/changelog';
import { translate, Language } from '../../i18n/dictionary';
import { Modal } from '../../ui/Overlay';
import { buttonClass } from '../../ui/styles';

interface WhatsNewModalProps {
  entries: ChangelogEntry[];
  language: Language;
  /** 'whatsnew' after an update, 'history' when opened from Settings */
  mode?: 'whatsnew' | 'history';
  onClose: () => void;
}

/** Changes of one or more versions, newest first. */
export const WhatsNewModal: React.FC<WhatsNewModalProps> = ({ entries, language, mode = 'whatsnew', onClose }) => {
  const title = translate(mode === 'history' ? 'whatsnew.history_title' : 'whatsnew.title', language);
  const dateFormat = new Intl.DateTimeFormat(language === 'fr' ? 'fr-FR' : 'en-US', { dateStyle: 'long' });

  return (
    <Modal
      layer="dialog"
      label={title}
      closeLabel={translate('btn.close', language)}
      onClose={onClose}
      testId="whats-new"
      panelClassName="max-w-lg p-6 sm:p-8 flex flex-col gap-5 max-h-[90dvh]"
    >
      <h2 className="flex items-center gap-2 text-2xl font-extrabold text-white pr-8">
        <Sparkles className="w-6 h-6 text-amber-300 shrink-0" />
        {title}
      </h2>

      <div className="flex flex-col gap-5 overflow-y-auto pr-1">
        {entries.map((entry) => (
          <section key={entry.version} data-testid="whats-new-entry" className="flex flex-col gap-2">
            <h3 className="flex flex-wrap items-baseline gap-x-2 text-sm font-bold text-indigo-200">
              <span>
                {translate('whatsnew.version', language)} {entry.version}
              </span>
              <span className="text-xs font-normal text-white/40">
                {dateFormat.format(new Date(`${entry.date}T12:00:00`))}
              </span>
            </h3>
            <ul className="flex flex-col gap-1.5 text-sm text-white/80 leading-relaxed list-disc pl-5">
              {entry.changes[language].map((change) => (
                <li key={change}>{change}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <button type="button" onClick={onClose} className={buttonClass('primary', 'md', 'self-end')}>
        {translate('whatsnew.ok', language)}
      </button>
    </Modal>
  );
};
