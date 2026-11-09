import React, { useState, useMemo } from 'react';
import { translate, Language } from '../../i18n/dictionary';
import { Search, X } from 'lucide-react';

interface EmojiItem {
  emoji: string;
  keywords: string[];
}

// Pre-seeded routine emojis with keywords in both FR and EN
const ROUTINE_EMOJIS: EmojiItem[] = [
  // Hygiene
  { emoji: '🪥', keywords: ['teeth', 'brush', 'dents', 'brosser', 'hygiene', 'toothbrush', 'brosse'] },
  { emoji: '🦷', keywords: ['tooth', 'dents', 'dentiste', 'hygiene'] },
  { emoji: '🚿', keywords: ['shower', 'douche', 'wash', 'bain', 'clean', 'hygiene', 'laver'] },
  { emoji: '🛁', keywords: ['bath', 'bain', 'wash', 'soap', 'clean', 'baignoire', 'laver'] },
  { emoji: '🧼', keywords: ['soap', 'wash', 'hands', 'mains', 'savon', 'propre', 'laver'] },
  { emoji: '🚽', keywords: ['toilet', 'toilette', 'pee', 'pipi', 'pooty', 'wc', 'potty'] },
  { emoji: '🧴', keywords: ['lotion', 'cream', 'creme', 'skin', 'massage', 'hydrater'] },
  { emoji: '💇', keywords: ['hair', 'comb', 'brush', 'cheveux', 'coiffer', 'brosser'] },
  { emoji: '🪞', keywords: ['mirror', 'miroir', 'look', 'voir', 'glace'] },
  { emoji: '🩹', keywords: ['bandage', 'plaster', 'pansement', 'bobo', 'soigner'] },
  
  // Bedtime & Sleep
  { emoji: '☀️', keywords: ['morning', 'sun', 'wake', 'matin', 'soleil', 'reveil', 'lever'] },
  { emoji: '🛏️', keywords: ['bed', 'sleep', 'lit', 'dodo', 'sleeping', 'coucher', 'dormir'] },
  { emoji: '🌙', keywords: ['night', 'moon', 'sleep', 'lune', 'nuit', 'sommeil'] },
  { emoji: '💤', keywords: ['sleep', 'dodo', 'zzz', 'calm', 'dormir', 'nuit'] },
  { emoji: '🥱', keywords: ['yawn', 'sleep', 'tired', 'fatigue', 'bailler'] },
  { emoji: '🧸', keywords: ['toys', 'tidy', 'ranger', 'jouets', 'play', 'bear', 'ourson', 'nounours', 'doudou'] },
  { emoji: '📚', keywords: ['book', 'read', 'story', 'livre', 'lecture', 'histoire', 'lire'] },
  { emoji: '🎧', keywords: ['music', 'story', 'audio', 'ecouter', 'casque', 'musique', 'conte'] },
  { emoji: '💋', keywords: ['kiss', 'bisou', 'hug', 'love', 'calin', 'embrasser'] },
  
  // Clothes & Pyjamas
  { emoji: '👕', keywords: ['clothes', 'pyjama', 'habiller', 'dress', 'vetement', 'pijama', 'shirt'] },
  { emoji: '👖', keywords: ['pants', 'trousers', 'jean', 'pantalon', 'habiller', 'vetement'] },
  { emoji: '🧥', keywords: ['coat', 'jacket', 'manteau', 'veste', 'habiller', 'vetement', 'froid'] },
  { emoji: '👗', keywords: ['dress', 'clothes', 'robe', 'habiller', 'vetement'] },
  { emoji: '🧦', keywords: ['socks', 'chaussettes', 'clothes', 'habiller', 'vetement'] },
  { emoji: '👟', keywords: ['shoes', 'basket', 'chaussures', 'ranger', 'tidy', 'vetement'] },
  { emoji: '🧢', keywords: ['cap', 'hat', 'casquette', 'chapeau', 'habiller', 'vetement'] },
  { emoji: '🧣', keywords: ['scarf', 'echarpe', 'froid', 'habiller', 'vetement'] },
  
  // Food & Drink
  { emoji: '🥛', keywords: ['milk', 'water', 'drink', 'boire', 'verre', 'lait', 'eau'] },
  { emoji: '🥣', keywords: ['bowl', 'cereal', 'soup', 'cereales', 'bol', 'manger', 'petit dejeuner'] },
  { emoji: '🍵', keywords: ['tea', 'hot chocolate', 'drink', 'boire', 'tasse', 'the', 'tisane', 'chocolat'] },
  { emoji: '🍎', keywords: ['food', 'snack', 'apple', 'manger', 'gouter', 'pomme', 'repas'] },
  { emoji: '🍌', keywords: ['banana', 'food', 'snack', 'banane', 'manger'] },
  { emoji: '🍇', keywords: ['grapes', 'raisin', 'food', 'snack', 'manger'] },
  { emoji: '🍪', keywords: ['cookie', 'biscuit', 'snack', 'gouter', 'manger'] },
  { emoji: '💧', keywords: ['water', 'eau', 'drink', 'boire', 'soif'] },

  // Toys & Games
  { emoji: '🧩', keywords: ['puzzle', 'play', 'game', 'jeu', 'toys', 'ranger', 'tidy'] },
  { emoji: '🚗', keywords: ['car', 'voiture', 'toy', 'jouet', 'play', 'jouer', 'ranger'] },
  { emoji: '🧱', keywords: ['blocks', 'lego', 'build', 'construction', 'briques', 'toy', 'ranger'] },
  { emoji: '🦖', keywords: ['dino', 'dinosaur', 'toy', 'jouet', 'play', 'dinosaures'] },
  { emoji: '🦄', keywords: ['unicorn', 'licorne', 'toy', 'jouet', 'play'] },
  { emoji: '🪁', keywords: ['kite', 'cerf-volant', 'play', 'jouer', 'dehors'] },
  { emoji: '🎈', keywords: ['balloon', 'ballon', 'party', 'fete', 'play'] },
  { emoji: '🛹', keywords: ['skateboard', 'skate', 'play', 'jouer', 'glisse'] },
  { emoji: '🚲', keywords: ['bike', 'bicycle', 'velo', 'play', 'jouer', 'rouler'] },
  { emoji: '🎮', keywords: ['game', 'video game', 'console', 'play', 'jouer', 'manette'] },

  // Drawing & School
  { emoji: '🖍️', keywords: ['crayon', 'color', 'paint', 'draw', 'pencils', 'dessin', 'colorier', 'feutre'] },
  { emoji: '✏️', keywords: ['pencil', 'write', 'draw', 'crayon', 'ecrire', 'dessiner'] },
  { emoji: '🎨', keywords: ['paint', 'color', 'draw', 'artist', 'dessin', 'peindre', 'pinceau'] },
  { emoji: '📒', keywords: ['book', 'notebook', 'cahier', 'devoirs', 'school', 'ecrire'] },
  { emoji: '🎒', keywords: ['bag', 'school', 'sac', 'prepare', 'ecole', 'demain', 'cartable'] },
  { emoji: '✂️', keywords: ['scissors', 'cut', 'ciseaux', 'decouper', 'draw', 'dessin'] },

  // Household & Pets
  { emoji: '🐾', keywords: ['pet', 'feed', 'dog', 'cat', 'animaux', 'nourrir', 'chien', 'chat'] },
  { emoji: '🐶', keywords: ['dog', 'chien', 'pet', 'animal'] },
  { emoji: '🐱', keywords: ['cat', 'chat', 'pet', 'animal'] },
  { emoji: '🏠', keywords: ['home', 'house', 'maison', 'rentrer'] },
  { emoji: '⏰', keywords: ['clock', 'alarm', 'reveil', 'time', 'heure'] },
  { emoji: '🌅', keywords: ['morning', 'sunrise', 'reveil', 'matin', 'soleil'] },
  { emoji: '🧘', keywords: ['yoga', 'calm', 'stretch', 'mediter', 'detente', 'etirer'] },
];

interface EmojiPickerProps {
  language: Language;
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export const EmojiPicker: React.FC<EmojiPickerProps> = ({
  language,
  onSelect,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter emojis based on matching text search keywords
  const filteredEmojis = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return ROUTINE_EMOJIS;
    
    return ROUTINE_EMOJIS.filter((item) =>
      item.keywords.some((keyword) => keyword.includes(query)) ||
      item.emoji.includes(query) // Allow pasting emojis directly
    );
  }, [searchQuery]);

  return (
    <div className="absolute top-full left-0 z-30 mt-2 w-72 bg-slate-900 border border-white/10 rounded-2xl p-4 shadow-2xl backdrop-blur-xl">
      {/* Header and Close */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          {translate('emoji.title', language)}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-white/40 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search Input */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input
          type="text"
          autoFocus
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={translate('emoji.search', language)}
          className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-white placeholder:text-white/20"
        />
      </div>

      {/* Emojis Grid */}
      <div className="grid grid-cols-5 gap-2 max-h-48 overflow-y-auto scrollbar-thin pr-1">
        {filteredEmojis.length === 0 ? (
          <div className="col-span-5 text-center py-4 text-xs text-white/30">
            {translate('emoji.none', language)}
          </div>
        ) : (
          filteredEmojis.map((item) => (
            <button
              key={item.emoji}
              type="button"
              onClick={() => {
                onSelect(item.emoji);
                onClose();
              }}
              className="h-10 bg-white/5 hover:bg-white/10 active:bg-white/20 rounded-xl flex items-center justify-center text-xl transition-colors hover:scale-105 active:scale-95 duration-100"
            >
              {item.emoji}
            </button>
          ))
        )}
      </div>
    </div>
  );
};
