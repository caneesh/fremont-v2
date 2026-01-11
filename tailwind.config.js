/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary palette: Deep blue centered on #2563EB
        // This is the ONE accent color for the entire app
        primary: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',  // Main accent
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
        },
        // Alias accent to primary for backwards compatibility
        // Components using accent.DEFAULT will get primary-600
        accent: {
          DEFAULT: '#2563EB',
          strong: '#1D4ED8',
        },
        // Dark mode layered surfaces (unchanged - these work well)
        dark: {
          app: '#0F172A',        // Deepest background
          card: '#1E293B',       // Card surface
          'card-soft': '#334155', // Elevated surface / inputs
          border: '#475569',      // Subtle borders
          'border-strong': '#64748B', // Stronger borders for focus
        },
        // Dark mode text hierarchy (unchanged)
        'dark-text': {
          primary: '#F1F5F9',     // High contrast primary
          secondary: '#CBD5E1',   // Medium contrast
          muted: '#94A3B8',       // Lower contrast helper text
          placeholder: '#64748B', // Placeholder text
        },
      },
      // Simplified shadows - removed neon glow effects
      boxShadow: {
        'dark-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
        'dark-md': '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.3)',
        'dark-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -4px rgba(0, 0, 0, 0.3)',
        // Subtle focus ring instead of glow
        'focus-ring': '0 0 0 2px rgba(37, 99, 235, 0.2)',
      },
    },
  },
  plugins: [],
}
