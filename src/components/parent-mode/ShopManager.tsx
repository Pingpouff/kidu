import React, { useState } from 'react';
import { Plus, Trash2, Check } from 'lucide-react';
import { ChildProfile, ShopItem } from '../../domain/models';
import { unspentBadges } from '../../domain/rewards';
import { translate, Language } from '../../i18n/dictionary';
import { EmojiPicker } from './EmojiPicker';
import { ConfirmIconButton, IconButton } from '../../ui/controls';
import { buttonClass, fieldClass } from '../../ui/styles';
import { PanelHeader } from '../../ui/Panel';

interface ShopManagerProps {
  shop: ShopItem[];
  profiles: ChildProfile[];
  language: Language;
  onSaveShop: (shop: ShopItem[]) => Promise<void>;
}

const inputClass = fieldClass('md', 'px-3');

/**
 * Parent-side shop: real-life rewards and their price in badges,
 * plus an overview of each child's piggy bank.
 */
export const ShopManager: React.FC<ShopManagerProps> = ({ shop, profiles, language, onSaveShop }) => {
  const [items, setItems] = useState<ShopItem[]>(shop);
  const [newIcon, setNewIcon] = useState('🎁');
  const [newLabel, setNewLabel] = useState('');
  const [newCost, setNewCost] = useState(3);
  const [showPicker, setShowPicker] = useState(false);
  const [saved, setSaved] = useState(false);

  const persist = async (next: ShopItem[]) => {
    setItems(next);
    await onSaveShop(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim() || newCost < 1) return;
    await persist([
      ...items,
      { id: `shop_${Math.random().toString(36).slice(2, 9)}`, icon: newIcon || '🎁', label: newLabel.trim(), cost: newCost },
    ]);
    setNewLabel('');
  };

  const update = (id: string, patch: Partial<ShopItem>) =>
    setItems((current) => current.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  return (
    <div className="flex flex-col gap-6">
      <PanelHeader title={translate('parent.shop.title', language)} description={translate('parent.shop.description', language)} />

      {/* Piggy banks overview */}
      <div className="flex flex-wrap gap-3">
        {profiles.map((p) => (
          <div key={p.id} className="px-4 py-2 rounded-xl bg-pink-500/10 border border-pink-400/20 text-sm font-bold text-pink-100">
            {p.avatar} {p.name} · 🐷 {unspentBadges(p).length} · 🏅 {p.medalCount ?? 0} · ⭐ {p.stars}
          </div>
        ))}
      </div>

      <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3 bg-white/5 p-4 rounded-2xl border border-white/5">
        <div className="relative sm:w-20">
          <input
            type="text"
            maxLength={4}
            value={newIcon}
            onFocus={() => setShowPicker(true)}
            onChange={(e) => setNewIcon(e.target.value)}
            aria-label="Emoji"
            className={`${inputClass} w-full text-center text-xl cursor-pointer`}
          />
          {showPicker && (
            <EmojiPicker language={language} onSelect={setNewIcon} onClose={() => setShowPicker(false)} />
          )}
        </div>
        <input
          type="text"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder={translate('parent.shop.label_placeholder', language)}
          className={`${inputClass} flex-1`}
        />
        <label className="flex items-center gap-2 text-xs text-white/60 font-bold">
          🐷
          <input
            type="number"
            min={1}
            max={99}
            value={newCost}
            onChange={(e) => setNewCost(Number(e.target.value))}
            aria-label={translate('parent.shop.cost', language)}
            className={`${inputClass} w-20 text-center`}
          />
        </label>
        <button
          type="submit"
          className={buttonClass('primary', 'md')}
        >
          <Plus className="w-4 h-4" />
          <span>{translate('btn.add', language)}</span>
        </button>
      </form>

      <div className="flex flex-col gap-3" data-testid="shop-list">
        {items.map((item) => (
          <div key={item.id} className="flex flex-wrap sm:flex-nowrap items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5">
            <input
              type="text"
              maxLength={4}
              value={item.icon}
              onChange={(e) => update(item.id, { icon: e.target.value })}
              aria-label="Emoji"
              className={`${inputClass} w-16 text-center text-xl`}
            />
            <input
              type="text"
              value={item.label}
              onChange={(e) => update(item.id, { label: e.target.value })}
              className={`${inputClass} flex-1`}
            />
            <label className="flex items-center gap-2 text-xs text-white/60 font-bold">
              🐷
              <input
                type="number"
                min={1}
                max={99}
                value={item.cost}
                onChange={(e) => update(item.id, { cost: Number(e.target.value) })}
                aria-label={translate('parent.shop.cost', language)}
                className={`${inputClass} w-20 text-center`}
              />
            </label>
            <IconButton
              tone="success"
              label={translate('btn.save', language)}
              onClick={() => persist(items.map((i) => ({ ...i, cost: Math.max(1, i.cost), label: i.label.trim() || i.label })))}
            >
              <Check className="w-5 h-5" />
            </IconButton>
            <ConfirmIconButton
              label={translate('btn.delete', language)}
              confirmText={translate('btn.confirm_delete', language)}
              icon={<Trash2 className="w-4 h-4" />}
              onConfirm={() => persist(items.filter((i) => i.id !== item.id))}
            />
          </div>
        ))}
        {saved && <span className="text-xs font-bold text-emerald-400">✓ {translate('parent.shop.saved', language)}</span>}
      </div>
    </div>
  );
};
