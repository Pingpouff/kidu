import plugin from 'tailwindcss/plugin.js';
import colors from 'tailwindcss/colors.js';

/**
 * Display styles (see "Display Style" in AGENTS.md): `white`, `slate` and
 * `black` read CSS variables set in index.css. The default (glass) values are
 * Tailwind's own colors; `html.paper` swaps them for ink on cream paper, so
 * `text-white/60` or `bg-white/5` follow the chosen style without per-component
 * changes. `snow` is a white that never changes (e.g. a white bubble on paper).
 */
const token = (name) => `rgb(var(--k-${name}) / <alpha-value>)`;
const SLATE_SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

/*
 * Colored families: on paper, text shades made for dark screens (50–400)
 * become dark ones, and dark background tints (800–950) become light ones.
 * Solid fills (500–700), borders and gradients keep their own colors.
 */
const FAMILIES = ['red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue',
  'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose', 'gray', 'zinc', 'neutral', 'stone'];
const PAPER_TEXT = { 50: 800, 100: 800, 200: 800, 300: 700, 400: 700 };
const PAPER_BG = { 800: 200, 900: 100, 950: 100 };
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(' ');
const familyTokens = (prefix, shades) =>
  Object.fromEntries(FAMILIES.map((f) => [f, Object.fromEntries(Object.keys(shades).map((s) => [s, token(`${prefix}-${f}-${s}`)]))]));
const familyValues = (prefix, shades, paper) =>
  Object.fromEntries(FAMILIES.flatMap((f) =>
    Object.entries(shades).map(([s, to]) => [`--k-${prefix}-${f}-${s}`, rgb(colors[f][paper ? to : s])])));

/*
 * Attribute selectors on purpose: class selectors in a plugin's base styles
 * would be picked up by Tailwind as utilities and copied for every variant.
 */
const anyClass = (names) => names.map((n) => `[class~="${n}"]`).join(', ');
/** Areas that keep the dark (glass) colors inside the paper style (also in index.css for white / slate) */
const NIGHT_AREAS = `html.paper :is(${anyClass(['k-night', 'treasure-bg', 'emo-twilight'])})`;
/** Solid colored fills: their content keeps glass colors (white text on indigo…) */
const SOLID_FILLS = `html.paper :is(${anyClass(
  ['indigo', 'purple', 'rose', 'red', 'pink', 'emerald', 'amber', 'sky'].flatMap((c) => [`bg-${c}-500`, `bg-${c}-600`])
)}), html.paper :is(${anyClass(['hover:bg-indigo-600', 'hover:bg-rose-600', 'hover:bg-emerald-600', 'hover:bg-rose-600/30'])}):hover`;

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        white: token('fg'),
        black: token('shade'),
        slate: Object.fromEntries(SLATE_SHADES.map((s) => [s, token(`slate-${s}`)])),
        snow: '#ffffff',
      },
      textColor: familyTokens('t', PAPER_TEXT),
      // Background tints have their own tokens: on paper, `bg-white/10` is a
      // warm sepia tint (not grey ink) and `bg-black/20` a lighter sheet
      backgroundColor: { ...familyTokens('b', PAPER_BG), white: token('surface'), black: token('recess') },
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      // Stacking order of full-screen layers (see src/ui/layers.ts)
      zIndex: {
        overlay: '50', // piggy bank, celebration
        treasure: '60',
        flying: '70', // stars flying to the counter
        banner: '95', // reminder banner
        dialog: '100', // PIN pad, always above the overlay that opened it
        choice: '105', // badge choice
        reveal: '110', // medal / trophy reveal
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.15)',
        'glass-hover': '0 12px 40px 0 rgba(0, 0, 0, 0.25)',
      },
    },
  },
  plugins: [
    // `paper:` variant: classes that only apply in the paper display style
    plugin(({ addVariant }) => addVariant('paper', ':is(.paper &)')),
    // Values of the colored-family tokens, per style (white / slate tokens are in index.css)
    plugin(({ addBase }) => {
      const glassText = familyValues('t', PAPER_TEXT, false);
      addBase({
        [`:root, ${NIGHT_AREAS}`]: { ...glassText, ...familyValues('b', PAPER_BG, false) },
        'html.paper': { ...familyValues('t', PAPER_TEXT, true), ...familyValues('b', PAPER_BG, true) },
        [SOLID_FILLS]: { '--k-fg': '255 255 255', ...glassText },
      });
    }),
  ],
}
