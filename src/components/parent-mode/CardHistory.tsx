import React from 'react';
import { Trash2 } from 'lucide-react';
import { ChildProfile } from '../../domain/models';
import { recentCards } from '../../domain/cards';
import { translate, Language } from '../../i18n/dictionary';
import { ConfirmIconButton } from '../../ui/controls';
import { PanelHeader } from '../../ui/Panel';
import { cx } from '../../ui/cx';

interface CardHistoryProps {
  profiles: ChildProfile[];
  language: Language;
  onWithdraw: (childId: string, cardId: string) => Promise<void>;
}

/** Recent yellow / red cards of every child; a card given by mistake can be withdrawn. */
export const CardHistory: React.FC<CardHistoryProps> = ({ profiles, language, onWithdraw }) => {
  const cards = recentCards(profiles);
  const byId = new Map(profiles.map((p) => [p.id, p]));
  const when = new Intl.DateTimeFormat(language === 'fr' ? 'fr-FR' : 'en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <section className="flex flex-col gap-3" data-testid="card-history">
      <PanelHeader title={`🟨🟥 ${translate('cards.history', language)}`} />
      {cards.length === 0 ? (
        <p className="text-sm text-white/50">{translate('cards.history_empty', language)}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {cards.map((card) => {
            const child = byId.get(card.childId);
            return (
              <li key={card.id} data-testid="card-entry" className="flex items-center gap-3 p-2.5 sm:p-3 bg-white/5 rounded-2xl border border-white/5">
                <span className={cx('referee-card !w-6 !h-8 !rounded shrink-0', card.color === 'yellow' ? 'is-yellow' : 'is-red')} aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white text-sm truncate">
                    {child ? `${child.avatar} ${child.name}` : '—'} · {translate(`cards.${card.color}`, language)}
                    {card.fromYellows && <span className="text-white/50 font-semibold"> ({translate('cards.auto_red', language)})</span>}
                  </p>
                  <p className="text-xs text-white/50 truncate">
                    {when.format(card.givenAt)}
                    {card.reason && ` · ${card.reason}`}
                    {card.lostProgress ? ` · −${card.lostProgress} ⭐` : ''}
                  </p>
                </div>
                {!card.fromYellows && (
                  <ConfirmIconButton
                    label={translate('cards.withdraw', language)}
                    confirmText={translate('btn.confirm_delete', language)}
                    icon={<Trash2 className="w-4 h-4" />}
                    onConfirm={() => onWithdraw(card.childId, card.id)}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
