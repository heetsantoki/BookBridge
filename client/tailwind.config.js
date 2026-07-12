/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1', // Premium Indigo
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        accent: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981', // Premium Emerald
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
        dark: {
          50: 'rgb(var(--dark-50) / <alpha-value>)',
          105: 'rgb(var(--dark-100) / <alpha-value>)', // Add fallback/compatible naming if needed
          100: 'rgb(var(--dark-100) / <alpha-value>)',
          200: 'rgb(var(--dark-200) / <alpha-value>)',
          300: 'rgb(var(--dark-300) / <alpha-value>)',
          405: 'rgb(var(--dark-405) / <alpha-value>)',
          450: 'rgb(var(--dark-450) / <alpha-value>)',
          500: 'rgb(var(--dark-500) / <alpha-value>)',
          600: 'rgb(var(--dark-600) / <alpha-value>)',
          750: 'rgb(var(--dark-750) / <alpha-value>)',
          800: 'rgb(var(--dark-800) / <alpha-value>)',
          850: 'rgb(var(--dark-850) / <alpha-value>)',
          900: 'rgb(var(--dark-900) / <alpha-value>)',
          950: 'rgb(var(--dark-950) / <alpha-value>)',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        outfit: ['Outfit', 'sans-serif'],
      },
      boxShadow: {
        'glass': 'var(--shadow-glass)',
        'glass-light': '0 8px 32px 0 rgba(99, 102, 241, 0.05)',
        'glass-primary': 'var(--shadow-glass-primary)',
        'glass-accent': 'var(--shadow-glass-accent)',
        'glow-indigo': 'var(--shadow-glow-indigo)',
        'glow-emerald': 'var(--shadow-glow-emerald)',
      },
      backdropBlur: {
        'xs': '2px',
        'md': '12px',
        'xl': '24px',
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'float-slow': 'float 8s ease-in-out infinite',
        'fade-in': 'fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-up': 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0) scale(1)' },
          '50%': { transform: 'translateY(-8px) scale(1.02)' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'scale(0.98)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(99, 102, 241, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(99, 102, 241, 0.6)' },
        }
      }
    },
  },
  plugins: [],
}
