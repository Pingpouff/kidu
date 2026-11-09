import React, { useState } from 'react';
import { AlertOctagon } from 'lucide-react';
import { translate, Language } from '../../../i18n/dictionary';

interface DangerZoneProps {
  language: Language;
  onResetAllData: () => Promise<void>;
}

/** Erase every piece of data, after a second tap (Settings). */
export const DangerZone: React.FC<DangerZoneProps> = ({ language, onResetAllData }) => {
  const [showResetConfirm, setShowResetConfirm] = useState(false);

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
    <div className="bg-rose-950/15 border border-rose-500/20 p-5 rounded-2xl flex flex-col gap-3">
      <div className="flex items-center gap-3 text-rose-400 font-extrabold text-sm uppercase tracking-wider">
        <AlertOctagon className="w-5 h-5" />
        <span>{translate('parent.danger.title', language)}</span>
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
            ? translate('parent.danger.confirm', language)
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
  );
};
