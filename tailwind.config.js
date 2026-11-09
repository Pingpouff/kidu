/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
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
  plugins: [],
}
