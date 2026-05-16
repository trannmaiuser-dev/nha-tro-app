import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#E8F5EE',
          100: '#C8E6D5',
          200: '#A5D6BC',
          300: '#6DC49E',
          400: '#3AAE82',
          500: '#1D9E75',
          600: '#1D9E75',
          700: '#0D7A5A',
          800: '#085E45',
          900: '#044530',
        },
        accent: {
          50:  '#FFF3EE',
          100: '#FFE0D4',
          500: '#FF7043',
          600: '#F4511E',
        },
        surface: '#FFFFFF',
        border:  '#E8E0D8',
        'text-1': '#2D2D2D',
        'text-2': '#6B6B6B',
        'text-3': '#A0A0A0',
      },
      fontFamily: {
        sans: ['var(--font-nunito)', 'Nunito', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        // Cards
        card:       '0 2px 8px rgba(0,0,0,0.08), 0 0 1px rgba(0,0,0,0.04)',
        'card-md':  '0 4px 16px rgba(0,0,0,0.10), 0 0 1px rgba(0,0,0,0.04)',
        'card-lg':  '0 8px 32px rgba(0,0,0,0.12), 0 0 1px rgba(0,0,0,0.04)',
        // Colored shadow for primary button
        primary:    '0 4px 14px -2px rgba(13, 122, 90, 0.42)',
        'primary-lg':'0 6px 22px -2px rgba(13, 122, 90, 0.52)',
        // Soft header shadow
        soft:       '0 1px 0 rgba(0,0,0,0.06), 0 2px 12px rgba(0,0,0,0.04)',
        // Float (modals, tooltips)
        float:      '0 12px 40px rgba(0,0,0,0.14), 0 0 1px rgba(0,0,0,0.06)',
        // Focus glow
        'focus-green': '0 0 0 3px rgba(29, 158, 117, 0.18)',
        'focus-red':   '0 0 0 3px rgba(229, 57, 53, 0.18)',
        // Dropdown
        dropdown:   '0 8px 24px rgba(0,0,0,0.12), 0 0 1px rgba(0,0,0,0.06)',
      },
      animation: {
        'fade-in':    'fadeIn 0.4s ease-out',
        'fade-in-up': 'fadeInUp 0.4s ease-out',
        'slide-up':   'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down': 'slideDown 0.15s ease-out',
        'slide-down-md': 'slideDown 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        'bounce-sm':  'bounceSm 0.6s ease-in-out',
        'float':      'float 3s ease-in-out infinite',
        'float-slow': 'float 4.5s ease-in-out infinite',
        'wiggle':     'wiggle 2.5s ease-in-out infinite',
        'spin-slow':  'spin 2s linear infinite',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'shimmer':    'shimmer 1.8s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:     { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        fadeInUp:   { '0%': { opacity: '0', transform: 'translateY(12px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideUp:    { '0%': { opacity: '0', transform: 'translateY(20px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideDown:  { '0%': { opacity: '0', transform: 'translateY(-8px) scaleY(0.96)' }, '100%': { opacity: '1', transform: 'translateY(0) scaleY(1)' } },
        bounceSm:   { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
        float:      { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-7px)' } },
        wiggle:     { '0%,100%': { transform: 'rotate(-4deg)' }, '50%': { transform: 'rotate(4deg)' } },
        pulseSoft:  { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.6' } },
        shimmer:    { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #1D9E75, #0D7A5A)',
        'shimmer': 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
      },
    },
  },
  plugins: [],
}

export default config
