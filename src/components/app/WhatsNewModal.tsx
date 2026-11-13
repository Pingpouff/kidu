import React from 'react';
import { Sparkles } from 'lucide-react';
import { ChangelogEntry } from '../../domain/changelog';
import { translate, Language } from '../../i18n/dictionary';
import { Modal } from '../../ui/Overlay';
import { ChangelogList } from './ChangelogList';
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

  return (
    <Modal
      layer="dialog"
      label={title}
      closeLabel={translate('btn.close', language)}
      onClose={onClose}
      testId="whats-new"
      panelClassName="max-w-lg p-6 sm:p-8 flex flex-col gap-5 screen-max-h-90"
    >
      <h2 className="flex items-center gap-2 text-2xl font-extrabold text-white pr-8 shrink-0">
        <Sparkles className="w-6 h-6 text-amber-300 shrink-0" />
        {title}
      </h2>

      <div className="min-h-0 overflow-y-auto overscroll-contain pr-1" data-testid="whats-new-list">
        <ChangelogList entries={entries} language={language} />
      </div>

      <button type="button" onClick={onClose} className={buttonClass('primary', 'md', 'self-end shrink-0')}>
        {translate('whatsnew.ok', language)}
      </button>
    </Modal>
  );
};
