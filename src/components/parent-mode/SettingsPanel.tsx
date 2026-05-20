import React, { useState } from 'react';
import { ParentSettings } from '../../domain/models';
import { translate, Language } from '../../i18n/dictionary';
import { Save, AlertOctagon } from 'lucide-react';

interface SettingsPanelProps {
  settings: ParentSettings;
  language: Language;
  onSaveSettings: (settings: ParentSettings) => Promise<void>;
  onResetAllData: () => Promise<void>;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  language,
  onSaveSettings,
  onResetAllData,
}) => {
  const [pin, setPin] = useState(settings.parentPin);
  const [lang, setLang] = useState<Language>(settings.language);
  const [starsPerComp, setStarsPerComp] = useState<number>(settings.rewards.starsPerCompletion);
  const [weeklyGoal, setWeeklyGoal] = useState<number>(settings.rewards.weeklyGoal);
  
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 4 || isNaN(Number(pin))) return;

    await onSaveSettings({
      parentPin: pin,
      language: lang,
      rewards: {
        starsPerCompletion: Number(starsPerComp),
        weeklyGoal: Number(weeklyGoal),
      },
    });

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
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

          {/* Stars Per Completion */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">
              {translate('parent.settings.stars_per_completion', language)}
            </label>
            <input
              type="number"
              min={1}
              max={5}
              required
              value={starsPerComp}
              onChange={(e) => setStarsPerComp(Number(e.target.value))}
              className="px-4 py-2.5 bg-slate-900 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500 text-white text-sm"
            />
          </div>

          {/* Weekly goal */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">
              {translate('parent.settings.weekly_goal', language)}
            </label>
            <input
              type="number"
              min={1}
              max={30}
              required
              value={weeklyGoal}
              onChange={(e) => setWeeklyGoal(Number(e.target.value))}
              className="px-4 py-2.5 bg-slate-900 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500 text-white text-sm"
            />
          </div>

        </div>

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
