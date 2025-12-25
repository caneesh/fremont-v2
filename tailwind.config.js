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
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        // Dark mode layered surfaces
        dark: {
          app: '#0F172A',        // Deepest background
          card: '#1E293B',       // Card surface
          'card-soft': '#334155', // Elevated surface / inputs
          border: '#475569',      // Subtle borders
          'border-strong': '#64748B', // Stronger borders for focus
        },
        // Dark mode text hierarchy
        'dark-text': {
          primary: '#F1F5F9',     // High contrast primary
          secondary: '#CBD5E1',   // Medium contrast
          muted: '#94A3B8',       // Lower contrast helper text
          placeholder: '#64748B', // Placeholder text
        },
        // Accent colors
        accent: {
          DEFAULT: '#38BDF8',     // Sky blue accent
          strong: '#0EA5E9',      // Stronger accent for hover
          glow: 'rgba(56, 189, 248, 0.15)', // Subtle glow
        },
      },
      boxShadow: {
        'dark-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
        'dark-md': '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.3)',
        'dark-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -4px rgba(0, 0, 0, 0.3)',
        'dark-glow': '0 0 0 3px rgba(56, 189, 248, 0.15)',
        'dark-glow-strong': '0 0 0 3px rgba(56, 189, 248, 0.25), 0 0 20px rgba(56, 189, 248, 0.1)',
      },
    },
  },
  plugins: [],
}
