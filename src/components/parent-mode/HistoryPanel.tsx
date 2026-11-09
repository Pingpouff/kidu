import React from 'react';
import { HistoryEntry } from '../../domain/models';
import { translate, Language } from '../../i18n/dictionary';
import { Calendar, Trash2, CheckCircle2, Clock } from 'lucide-react';
import { ConfirmIconButton } from '../../ui/controls';
import { PanelHeader } from '../../ui/Panel';

interface HistoryPanelProps {
  history: HistoryEntry[];
  language: Language;
  onDeleteHistory: (id: string) => Promise<void>;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  history,
  language,
  onDeleteHistory,
}) => {
  const formatTime = (epoch?: number) => {
    if (!epoch) return '';
    const date = new Date(epoch);
    return date.toLocaleTimeString(language === 'fr' ? 'fr-FR' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return date.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <PanelHeader title={translate('parent.history.title', language)} />

      {history.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-2 border border-dashed border-white/5 rounded-2xl">
          <Calendar className="w-12 h-12 stroke-[1.5]" />
          <p className="text-sm font-semibold">{translate('parent.history.empty', language)}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 max-h-[380px] overflow-y-auto scrollbar-thin pr-1">
          {history.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className={`p-2 rounded-xl flex items-center justify-center ${
                  entry.isCompleted ? 'bg-emerald-500/10 text-emerald-400' : 'bg-yellow-500/10 text-yellow-400'
                }`}>
                  <CheckCircle2 className="w-6 h-6" />
                </div>

                <div className="min-w-0">
                  <p className="font-bold text-white text-sm md:text-base capitalize">
                    {formatDate(entry.date)}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/40 mt-1">
                    <span className="font-semibold text-indigo-400">
                      {entry.childName}
                    </span>
                    <span>•</span>
                    <span>
                      {entry.completedTasks} / {entry.totalTasks} {translate('parent.history.tasks_completed', language)}
                    </span>
                    {entry.completedAt && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formatTime(entry.completedAt)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <ConfirmIconButton
                label="delete history entry"
                confirmText={translate('btn.confirm_delete', language)}
                icon={<Trash2 className="w-4 h-4" />}
                onConfirm={() => onDeleteHistory(entry.id)}
                className="ml-4"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
