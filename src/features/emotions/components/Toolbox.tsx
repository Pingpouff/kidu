import React from 'react';
import type { ChildProfile, EmotionSettings } from '../../../domain/models';
import { translate, translateDynamic, Language } from '../../../i18n/dictionary';
import { reminderService } from '../../../services/ReminderService';
import { strategiesForLevel } from '../domain/catalog';
import { childLevel } from '../domain/level';
import type { SuggestedStrategy } from '../domain/checkin';
import { emotionRepository } from '../persistence/emotionRepository';
import { StrategyCard } from './StrategyCard';

interface ToolboxProps {
  language: Language;
  profile: ChildProfile;
  settings: EmotionSettings;
}

/**
 * "Ma boîte à outils": every strategy of the child's age level and the
 * parent's own ones. "Ça m'aide" puts one in "what helps me", offered first
 * after a check-in and in the calm corner.
 */
export const Toolbox: React.FC<ToolboxProps> = ({ language, profile, settings }) => {
  const helpful = profile.emotions?.helpful ?? [];
  const all: SuggestedStrategy[] = [
    ...settings.customStrategies.map((c): SuggestedStrategy => ({ kind: 'custom', id: c.id, icon: c.icon, label: c.label })),
    ...strategiesForLevel(childLevel(profile)).map((s): SuggestedStrategy => ({ kind: 'builtin', id: s.id, icon: s.icon })),
  ];
  const byId = new Map(all.map((s) => [s.id, s]));
  const mine = helpful.map((id) => byId.get(id)).filter((s): s is SuggestedStrategy => !!s);
  const others = all.filter((s) => !helpful.includes(s.id));

  const listen = (s: SuggestedStrategy) =>
    reminderService.triggerVoiceReminder(
      s.kind === 'custom' ? s.label : translateDynamic(`emo.strategy.${s.id}.how`, language),
      language === 'fr' ? 'fr-FR' : 'en-US'
    );

  const card = (s: SuggestedStrategy) => (
    <StrategyCard
      key={s.id}
      strategy={s}
      language={language}
      helpful={helpful.includes(s.id)}
      onTry={() => listen(s)}
      onToggleHelpful={() => emotionRepository.toggleHelpful(profile.id, s.id)}
    />
  );

  return (
    <div className="w-full flex flex-col gap-5" data-testid="toolbox">
      <p className="text-lg text-[#C9C3E6] text-center">{translate('emo.toolbox.intro', language)}</p>
      {mine.length > 0 && (
        <section className="flex flex-col gap-3" data-testid="toolbox-mine">
          <h3 className="text-xl font-extrabold">{translate('emo.toolbox.mine', language)}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{mine.map(card)}</div>
        </section>
      )}
      <section className="flex flex-col gap-3" data-testid="toolbox-others">
        <h3 className="text-xl font-extrabold">{translate('emo.toolbox.others', language)}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{others.map(card)}</div>
      </section>
    </div>
  );
};
