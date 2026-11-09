import React, { useState } from 'react';
import { ChildProfile } from '../../domain/models';
import { translate, Language } from '../../i18n/dictionary';
import { Plus, Trash2, Edit2, Check, X, Star } from 'lucide-react';
import { CHILD_COLORS, childTheme } from '../../ui/theme';

interface ProfileManagerProps {
  profiles: ChildProfile[];
  language: Language;
  onAddProfile: (profile: Omit<ChildProfile, 'id'>) => Promise<void>;
  onUpdateProfile: (profile: ChildProfile) => Promise<void>;
  onDeleteProfile: (id: string) => Promise<void>;
}

export const ProfileManager: React.FC<ProfileManagerProps> = ({
  profiles,
  language,
  onAddProfile,
  onUpdateProfile,
  onDeleteProfile,
}) => {
  // Add Profile form states
  const [newName, setNewName] = useState('');
  const [newAvatar, setNewAvatar] = useState('🦊');
  const [newColor, setNewColor] = useState<ChildProfile['color']>('indigo');
  const [newAge, setNewAge] = useState<string>('');

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [editColor, setEditColor] = useState<ChildProfile['color']>('indigo');
  const [editAge, setEditAge] = useState<string>('');
  const [editStars, setEditStars] = useState<number>(0);

  const colorsList = CHILD_COLORS;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newAvatar.trim()) return;

    await onAddProfile({
      name: newName.trim(),
      avatar: newAvatar.trim(),
      color: newColor,
      age: newAge ? Number(newAge) : undefined,
      stars: 0,
    });

    setNewName('');
    setNewAvatar('🦊');
    setNewColor('indigo');
    setNewAge('');
  };

  const startEdit = (profile: ChildProfile) => {
    setEditingId(profile.id);
    setEditName(profile.name);
    setEditAvatar(profile.avatar);
    setEditColor(profile.color);
    setEditAge(profile.age ? String(profile.age) : '');
    setEditStars(profile.stars);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (profile: ChildProfile) => {
    if (!editName.trim() || !editAvatar.trim()) return;

    await onUpdateProfile({
      ...profile,
      name: editName.trim(),
      avatar: editAvatar.trim(),
      color: editColor,
      age: editAge ? Number(editAge) : undefined,
      stars: Number(editStars),
    });

    setEditingId(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <h3 className="text-xl font-bold text-slate-100">
        {translate('parent.children.title', language)}
      </h3>

      {/* Profile Creation Form */}
      <form onSubmit={handleAdd} className="flex flex-col gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input
            type="text"
            required
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={translate('parent.children.name_placeholder', language)}
            className="px-4 py-2.5 bg-slate-900 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500 text-white placeholder:text-white/20 text-sm"
          />
          <input
            type="text"
            maxLength={4}
            required
            value={newAvatar}
            onChange={(e) => setNewAvatar(e.target.value)}
            placeholder={translate('parent.children.avatar_placeholder', language)}
            className="px-4 py-2.5 bg-slate-900 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500 text-center text-white placeholder:text-white/20 text-sm"
          />
          <input
            type="number"
            value={newAge}
            onChange={(e) => setNewAge(e.target.value)}
            placeholder={translate('parent.children.age', language)}
            className="px-4 py-2.5 bg-slate-900 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500 text-white placeholder:text-white/20 text-sm"
          />
          <select
            value={newColor}
            onChange={(e) => setNewColor(e.target.value as ChildProfile['color'])}
            className="px-3 py-2.5 bg-slate-900 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500 text-white text-sm"
          >
            {colorsList.map((col) => (
              <option key={col} value={col}>
                {col.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="w-full sm:w-auto self-end px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 border border-indigo-400/20 text-white font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all text-sm"
        >
          <Plus className="w-5 h-5" />
          <span>{translate('parent.children.add', language)}</span>
        </button>
      </form>

      {/* Profiles list */}
      <div className="flex flex-col gap-3 max-h-[350px] overflow-y-auto scrollbar-thin pr-1">
        {profiles.map((profile) => {
          const isEditing = editingId === profile.id;

          const themeBorder = childTheme(profile.color).managerRow;

          return (
            <div
              key={profile.id}
              className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white/5 rounded-2xl border ${themeBorder} gap-4 transition-all`}
            >
              {isEditing ? (
                /* Edit inputs form row */
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-3 items-center">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="px-3 py-1.5 bg-slate-900 border border-indigo-500/30 rounded-lg text-white text-sm"
                  />
                  <input
                    type="text"
                    maxLength={4}
                    value={editAvatar}
                    onChange={(e) => setEditAvatar(e.target.value)}
                    className="px-3 py-1.5 bg-slate-900 border border-indigo-500/30 rounded-lg text-center text-white text-sm"
                  />
                  <div className="flex items-center gap-1.5 text-xs text-white/50">
                    <span>{translate('parent.children.age', language)}:</span>
                    <input
                      type="number"
                      value={editAge}
                      onChange={(e) => setEditAge(e.target.value)}
                      className="w-16 px-2 py-1 bg-slate-900 border border-indigo-500/30 rounded text-center text-white"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-white/50">
                    <span>{translate('parent.children.theme', language)}:</span>
                    <select
                      value={editColor}
                      onChange={(e) => setEditColor(e.target.value as ChildProfile['color'])}
                      className="px-2 py-1 bg-slate-900 border border-indigo-500/30 rounded text-white text-xs"
                    >
                      {colorsList.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-4 flex items-center gap-2 text-xs text-white/50 mt-1">
                    <Star className="w-4 h-4 text-yellow-400" />
                    <span>{translate('parent.children.stars', language)}:</span>
                    <input
                      type="number"
                      value={editStars}
                      onChange={(e) => setEditStars(Number(e.target.value))}
                      className="w-20 px-2 py-1 bg-slate-900 border border-indigo-500/30 rounded text-center text-white text-sm"
                    />
                  </div>
                </div>
              ) : (
                /* Static view */
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-14 h-14 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-3xl shadow-inner select-none">
                    {profile.avatar}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-white text-lg">
                      {profile.name}
                    </h4>
                    <div className="flex flex-wrap gap-2 text-xs text-white/40 mt-1">
                      {profile.age && (
                        <span className="bg-white/5 px-2 py-0.5 rounded border border-white/5">
                          {profile.age} {language === 'fr' ? 'ans' : 'years old'}
                        </span>
                      )}
                      <span className="bg-white/5 px-2 py-0.5 rounded border border-white/5 uppercase">
                        Theme: {profile.color}
                      </span>
                      <span className="text-yellow-400 font-bold flex items-center gap-1">
                        ⭐ {profile.stars}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons Row */}
              <div className="flex items-center gap-2 justify-end">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => saveEdit(profile)}
                      aria-label="save changes"
                      className="p-2 bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/20 rounded-xl text-emerald-400 hover:text-white transition-colors"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                    <button
                      onClick={cancelEdit}
                      aria-label="cancel"
                      className="p-2 bg-white/5 hover:bg-white/15 border border-white/10 rounded-xl text-white/60 hover:text-white transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => startEdit(profile)}
                      aria-label="edit profile"
                      className="p-2 bg-white/5 hover:bg-indigo-600/30 border border-white/10 hover:border-indigo-500/30 rounded-xl text-white/50 hover:text-indigo-200 transition-colors"
                    >
                      <Edit2 className="w-4.5 h-4.5" />
                    </button>
                    <button
                      onClick={() => onDeleteProfile(profile.id)}
                      aria-label="delete profile"
                      className="p-2 bg-white/5 hover:bg-rose-600 border border-white/10 hover:border-rose-500 rounded-xl text-rose-400 hover:text-white transition-colors"
                    >
                      <Trash2 className="w-4.5 h-4.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
