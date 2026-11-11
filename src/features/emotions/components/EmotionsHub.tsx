import React, { useState } from 'react';
import { ArrowLeft, X } from 'lucide-react';
import type { ChildProfile, EmotionSettings } from '../../../domain/models';
import { Overlay } from '../../../ui/Overlay';
import { translate, Language } from '../../../i18n/dictionary';
import { reminderService } from '../../../services/ReminderService';
import { Owl } from '../art/Owl';
import { CloudGlyph } from '../art/CloudGlyph';
import { FAMILY_COLORS } from '../domain/catalog';
import { CheckInFlow } from './CheckInFlow';
import { Toolbox } from './Toolbox';

export type HubScreen = 'hub' | 'checkin' | 'toolbox';

interface EmotionsHubProps {
  language: Language;
  profile: ChildProfile;
  settings: EmotionSettings;
  /** Screen to open on (the evening invitation goes straight to the check-in) */
  initial?: HubScreen;
  onClose: () => void;
  /** Opens the calm corner for this child (the hub closes) */
  onOpenCalm: () => void;
}

/**
 * A child's emotions space: "Comment je me sens" (check-in), "Coin calme",
 * "Ma boîte à outils". Twilight background, owl and cloud from the DA.
 */
const EmotionsHub: React.FC<EmotionsHubProps> = ({ language, profile, settings, initial = 'hub', onClose, onOpenCalm }) => {
  const [screen, setScreen] = useState<HubScreen>(initial);
  const title =
    screen === 'checkin' ? translate('emo.hub.checkin', language) : screen === 'toolbox' ? translate('emo.hub.toolbox', language) : translate('emo.hub.title', language);

  const close = () => {
    reminderService.stopSpeaking();
    onClose();
  };
  // Opened on a screen directly (evening invitation): "back" closes
  const back = () => (screen === 'hub' || initial !== 'hub' ? close() : setScreen('hub'));

  return (
    <Overlay
      layer="dialog"
      aria-label={translate('emo.hub.title', language)}
      onClose={close}
      className="emo-twilight flex flex-col h-[100dvh] overflow-y-auto overflow-x-hidden select-none"
      data-testid="emotions-hub"
      data-screen={screen}
    >
      <div className="w-full max-w-4xl mx-auto flex-1 flex flex-col gap-4 p-4 sm:p-7">
        <header className="flex items-center gap-3">
          <button
            type="button"
            onClick={back}
            aria-label={translate('btn.back', language)}
            className="w-12 h-12 shrink-0 rounded-full border border-white/20 bg-white/5 flex items-center justify-center hover:bg-white/10"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="flex-1 text-xl sm:text-2xl font-extrabold truncate">
            {profile.avatar} {title}
          </h1>
          <button
            type="button"
            onClick={close}
            aria-label={translate('emo.hub.close', language)}
            data-testid="emotions-close"
            className="w-12 h-12 shrink-0 rounded-full border border-white/20 bg-white/5 flex items-center justify-center hover:bg-white/10"
          >
            <X className="w-6 h-6" />
          </button>
        </header>

        {screen === 'hub' && (
          <section className="flex-1 flex flex-col items-center justify-center gap-6">
            <p className="text-2xl sm:text-3xl font-extrabold text-center">{translate('emo.hub.hello', language, { name: profile.name })}</p>
            <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                type="button"
                data-testid="hub-checkin"
                onClick={() => setScreen('checkin')}
                className="rounded-[2rem] bg-white/5 border border-white/15 hover:bg-white/10 p-5 flex sm:flex-col items-center gap-4 min-h-[7rem]"
              >
                <Owl family="joy" color={FAMILY_COLORS.joy} className="w-20 h-24 sm:w-28 sm:h-32 shrink-0" />
                <span className="text-xl sm:text-2xl font-extrabold">{translate('emo.hub.checkin', language)}</span>
              </button>
              <button
                type="button"
                data-testid="hub-calm"
                onClick={onOpenCalm}
                className="rounded-[2rem] bg-white/5 border border-white/15 hover:bg-white/10 p-5 flex sm:flex-col items-center gap-4 min-h-[7rem]"
              >
                <CloudGlyph className="w-24 h-[4.5rem] sm:w-36 sm:h-32 shrink-0" />
                <span className="text-xl sm:text-2xl font-extrabold">{translate('emo.hub.calm', language)}</span>
              </button>
              <button
                type="button"
                data-testid="hub-toolbox"
                onClick={() => setScreen('toolbox')}
                className="rounded-[2rem] bg-white/5 border border-white/15 hover:bg-white/10 p-5 flex sm:flex-col items-center gap-4 min-h-[7rem]"
              >
                <span className="text-6xl sm:text-8xl leading-none shrink-0" aria-hidden="true">🧰</span>
                <span className="text-xl sm:text-2xl font-extrabold">{translate('emo.hub.toolbox', language)}</span>
              </button>
            </div>
          </section>
        )}

        {screen === 'checkin' && (
          <CheckInFlow language={language} profile={profile} settings={settings} onDone={back} onOpenCalm={onOpenCalm} />
        )}

        {screen === 'toolbox' && <Toolbox language={language} profile={profile} settings={settings} />}
      </div>
    </Overlay>
  );
};

export default EmotionsHub;
