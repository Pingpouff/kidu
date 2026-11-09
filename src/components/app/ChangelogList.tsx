import React from 'react';
import { ChangelogEntry } from '../../domain/changelog';
import { translate, Language } from '../../i18n/dictionary';

/** The changes of each version, newest first. */
export const ChangelogList: React.FC<{ entries: ChangelogEntry[]; language: Language }> = ({ entries, language }) => {
  const dateFormat = new Intl.DateTimeFormat(language === 'fr' ? 'fr-FR' : 'en-US', { dateStyle: 'long' });
  return (
    <div className="flex flex-col gap-5">
      {entries.map((entry) => (
        <section key={entry.version} data-testid="whats-new-entry" className="flex flex-col gap-2">
          <h3 className="flex flex-wrap items-baseline gap-x-2 text-sm font-bold text-indigo-200">
            <span>
              {translate('whatsnew.version', language)} {entry.version}
            </span>
            <span className="text-xs font-normal text-white/60">{dateFormat.format(new Date(`${entry.date}T12:00:00`))}</span>
          </h3>
          <ul className="flex flex-col gap-1.5 text-sm text-white/80 leading-relaxed list-disc pl-5">
            {entry.changes[language].map((change) => (
              <li key={change}>{change}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
};
