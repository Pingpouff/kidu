import React, { useState } from 'react';
import { ChildProfile } from '../../domain/models';
import { translate, Language } from '../../i18n/dictionary';
import { Plus, Trash2, Edit2, Check, X, Star } from 'lucide-react';
import { CHILD_COLORS, childTheme } from '../../ui/theme';
import { ConfirmIconButton, IconButton } from '../../ui/controls';
import { buttonClass, fieldClass } from '../../ui/styles';
import { PanelHeader } from '../../ui/Panel';
import { ChildAvatar } from '../common/ChildAvatar';

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
      <PanelHeader title={translate('parent.children.title', language)} />

      {/* Profile Creation Form */}
      <form onSubmit={handleAdd} className="flex flex-col gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input
            type="text"
            required
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={translate('parent.children.name_placeholder', language)}
            className={fieldClass('md')}
          />
          <input
            type="text"
            maxLength={4}
            required
            value={newAvatar}
            onChange={(e) => setNewAvatar(e.target.value)}
            placeholder={translate('parent.children.avatar_placeholder', language)}
            className={fieldClass('md', 'text-center')}
          />
          <input
            type="number"
            value={newAge}
            onChange={(e) => setNewAge(e.target.value)}
            placeholder={translate('parent.children.age', language)}
            className={fieldClass('md')}
          />
          <select
            value={newColor}
            onChange={(e) => setNewColor(e.target.value as ChildProfile['color'])}
            className={fieldClass('md', 'px-3')}
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
          className={buttonClass('primary', 'md', 'w-full sm:w-auto self-end px-6')}
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
                    className={fieldClass('sm', undefined, { editing: true })}
                  />
                  <input
                    type="text"
                    maxLength={4}
                    value={editAvatar}
                    onChange={(e) => setEditAvatar(e.target.value)}
                    className={fieldClass('sm', 'text-center', { editing: true })}
                  />
                  <div className="flex items-center gap-1.5 text-xs text-white/50">
                    <span>{translate('parent.children.age', language)}:</span>
                    <input
                      type="number"
                      value={editAge}
                      onChange={(e) => setEditAge(e.target.value)}
                      className={fieldClass('sm', 'w-16 text-center', { editing: true })}
                    />
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-white/50">
                    <span>{translate('parent.children.theme', language)}:</span>
                    <select
                      value={editColor}
                      onChange={(e) => setEditColor(e.target.value as ChildProfile['color'])}
                      className={fieldClass('sm', undefined, { editing: true })}
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
                      className={fieldClass('sm', 'w-20 text-center', { editing: true })}
                    />
                  </div>
                </div>
              ) : (
                /* Static view */
                <div className="flex items-center gap-4 flex-1">
                  <ChildAvatar avatar={profile.avatar} size="sm" tone="outlined" />
                  <div>
                    <h4 className="font-extrabold text-white text-lg">
                      {profile.name}
                    </h4>
                    <div className="flex flex-wrap gap-2 text-xs text-white/60 mt-1">
                      {profile.age && (
                        <span className="bg-white/5 px-2 py-0.5 rounded border border-white/5">
                          {profile.age} {translate('parent.profiles.years', language)}
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
                    <IconButton tone="success" label="save changes" onClick={() => saveEdit(profile)}>
                      <Check className="w-5 h-5" />
                    </IconButton>
                    <IconButton tone="neutral" label="cancel" onClick={cancelEdit}>
                      <X className="w-5 h-5" />
                    </IconButton>
                  </>
                ) : (
                  <>
                    <IconButton tone="edit" label="edit profile" onClick={() => startEdit(profile)}>
                      <Edit2 className="w-4.5 h-4.5" />
                    </IconButton>
                    <ConfirmIconButton
                      label="delete profile"
                      confirmText={translate('btn.confirm_delete', language)}
                      icon={<Trash2 className="w-4.5 h-4.5" />}
                      onConfirm={() => onDeleteProfile(profile.id)}
                    />
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
