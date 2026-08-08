import tailwindcssAnimate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      screens: {
        // Small phones (iPhone SE / older Androids) need their own step.
        xs: '400px',
      },
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc8fb',
          400: '#36a9f7',
          500: '#0c8de4',
          600: '#0270c1',
          700: '#03599d',
          800: '#074c81',
          900: '#0c3f6c',
          950: '#082847',
        },
        steel: {
          50: '#f6f7f9',
          100: '#ebedf1',
          200: '#d2d7e0',
          300: '#acb5c6',
          400: '#7e8ca6',
          500: '#5c6c89',
          600: '#485570',
          700: '#3b455c',
          800: '#333b4e',
          900: '#2d3342',
          950: '#1b1e28'
        },

        // --- shadcn/ui semantic tokens (driven by CSS vars in index.css) ---
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderWidth: {
        3: '3px',
      },
      scale: {
        98: '.98',
      },
      spacing: {
        // Height of the sticky app header, kept in sync with --app-header-h.
        header: 'var(--app-header-h)',
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)',
        'card-hover': '0 4px 12px -2px rgb(15 23 42 / 0.08), 0 2px 6px -2px rgb(15 23 42 / 0.06)',
        pop: '0 12px 32px -8px rgb(15 23 42 / 0.22), 0 4px 12px -4px rgb(15 23 42 / 0.12)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'translateY(8px) scale(.97)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'sheet-up': {
          from: { opacity: '0', transform: 'translateY(100%)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-left': {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(0)' },
        },
        'toast-in': {
          from: { opacity: '0', transform: 'translateY(-12px) scale(.96)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-in': 'fade-in .18s ease-out both',
        'scale-in': 'scale-in .2s cubic-bezier(.16,1,.3,1) both',
        'sheet-up': 'sheet-up .28s cubic-bezier(.16,1,.3,1) both',
        'slide-in-left': 'slide-in-left .25s cubic-bezier(.16,1,.3,1) both',
        'toast-in': 'toast-in .22s cubic-bezier(.16,1,.3,1) both',
        shimmer: 'shimmer 1.6s infinite',
      },
    },
  },
  // Required by the shadcn Sheet/Tooltip (`animate-in`, `slide-in-from-left`, …).
  plugins: [tailwindcssAnimate],
}
