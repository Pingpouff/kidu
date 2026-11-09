import React from 'react';
import { ChildProfile } from '../../domain/models';
import { translate, Language } from '../../i18n/dictionary';
import { Settings } from 'lucide-react';

interface ProfileSelectorProps {
  profiles: ChildProfile[];
  onSelect: (profile: ChildProfile) => void;
  onEnterParentMode: () => void;
  language: Language;
  /** Number of late tasks per child id */
  lateCounts?: Record<string, number>;
}

export const ProfileSelector: React.FC<ProfileSelectorProps> = ({
  profiles,
  onSelect,
  onEnterParentMode,
  language,
  lateCounts = {},
}) => {
  return (
    <div className="min-h-screen flex flex-col justify-between p-8 theme-indigo relative overflow-hidden select-none">
      {/* Background stars / sparkles */}
      <div className="absolute top-10 left-10 text-white/10 text-6xl animate-pulse">★</div>
      <div className="absolute bottom-20 right-10 text-white/5 text-8xl animate-pulse-slow">★</div>
      <div className="absolute top-1/3 right-1/4 text-white/10 text-4xl animate-bounce">✨</div>
      <div className="absolute bottom-1/3 left-1/5 text-white/10 text-5xl animate-pulse">✨</div>

      {/* Parent mode access icon in top-right corner */}
      <div className="flex justify-end z-10">
        <button
          onClick={onEnterParentMode}
          aria-label={translate('btn.parent_mode', language)}
          className="p-4 bg-white/5 hover:bg-white/15 text-white/60 hover:text-white/90 border border-white/10 rounded-full transition-all duration-200"
        >
          <Settings className="w-8 h-8" />
        </button>
      </div>

      {/* Main card grid */}
      <div className="flex-1 flex flex-col justify-center items-center max-w-4xl mx-auto z-10 -mt-10">
        <h1 className="text-4xl md:text-5xl font-extrabold text-center mb-12 text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-pink-400 to-indigo-300 drop-shadow">
          {language === 'fr' ? 'Bonsoir ! Qui se prépare ? 🌟' : 'Good evening! Who is getting ready? 🌟'}
        </h1>

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-8 justify-center">
          {profiles.map((profile) => {
            // Theme colors mapping
            const colorThemes = {
              indigo: 'from-indigo-500/30 to-indigo-900/40 border-indigo-500/40 hover:border-indigo-400 hover:shadow-indigo-500/20 text-indigo-200',
              purple: 'from-purple-500/30 to-purple-900/40 border-purple-500/40 hover:border-purple-400 hover:shadow-purple-500/20 text-purple-200',
              rose: 'from-rose-500/30 to-rose-900/40 border-rose-500/40 hover:border-rose-400 hover:shadow-rose-500/20 text-rose-200',
              emerald: 'from-emerald-500/30 to-emerald-900/40 border-emerald-500/40 hover:border-emerald-400 hover:shadow-emerald-500/20 text-emerald-200',
              amber: 'from-amber-500/30 to-amber-900/40 border-amber-500/40 hover:border-amber-400 hover:shadow-amber-500/20 text-amber-200',
            };

            const themeClasses = colorThemes[profile.color] || colorThemes.indigo;

            return (
              <button
                key={profile.id}
                onClick={() => onSelect(profile)}
                className={`relative w-48 h-60 md:w-56 md:h-64 rounded-3xl border bg-gradient-to-b ${themeClasses} backdrop-blur-md shadow-xl flex flex-col justify-center items-center p-6 gap-4 transform active:scale-95 transition-all duration-300 group`}
              >
                {/* Late tasks badge */}
                {(lateCounts[profile.id] ?? 0) > 0 && (
                  <span
                    data-testid="profile-late"
                    className="absolute -top-3 -right-3 flex items-center gap-1 bg-rose-500 text-white font-black text-sm px-3 py-1.5 rounded-full shadow-lg animate-wiggle"
                  >
                    ⏰ {lateCounts[profile.id]}
                  </span>
                )}

                {/* Large Avatar container */}
                <div className="w-24 h-24 md:w-28 md:h-28 bg-white/10 rounded-full flex items-center justify-center text-6xl md:text-7xl shadow-inner group-hover:scale-110 transition-transform duration-300">
                  {profile.avatar}
                </div>

                {/* Profile Name */}
                <div className="text-2xl md:text-3xl font-extrabold tracking-wide drop-shadow text-white group-hover:text-yellow-200 transition-colors duration-300">
                  {profile.name}
                </div>

                {/* Star display */}
                <div className="flex items-center gap-1 bg-black/20 px-3 py-1 rounded-full text-sm font-semibold text-yellow-300 border border-yellow-500/20">
                  <span>⭐</span>
                  <span>{profile.stars}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer message */}
      <div className="text-center text-white/30 text-sm z-10">
        {language === 'fr' ? 'Application Routine Enfant' : 'Kids Routine Companion App'}
      </div>
    </div>
  );
};
