/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Valtric Primary - Deep Teal
        teal: {
          950: '#0A2E2E',
          900: '#0D3D3D',
          800: '#115252',
          700: '#1A7A7A',
          600: '#1E8F8F',
          500: '#22A3A3',
          400: '#3DBDBD',
          300: '#6DD4D4',
          200: '#A3E8E8',
          100: '#D1F4F4',
          50: '#EEFAFA',
        },
        // Valtric Accent - Bright Cyan
        cyan: {
          500: '#00CED1',
          400: '#40E0D0',
          300: '#7FEEEA',
        },
        // Sage/Seafoam for gradients
        sage: {
          300: '#B5D4CA',
          200: '#C8E0D8',
          100: '#E0F0EC',
        },
        // Valtric specific
        valtric: {
          dark: '#0C2F2F',
          card: '#0F3A3A',
          light: '#F5FAFA',
        },
      },
      fontFamily: {
        // Serif for headlines (matches Valtric brand)
        display: ['Playfair Display', 'Georgia', 'serif'],
        // Clean sans-serif for body
        body: ['Inter', 'system-ui', 'sans-serif'],
        // Mono for status indicators
        mono: ['JetBrains Mono', 'monospace'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      animation: {
        'breathe': 'breathe 3s ease-in-out infinite',
        'pulse-ring': 'pulse-ring 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'process-spin': 'process-spin 1s linear infinite',
        'waveform-bar': 'waveform-bar 0.8s ease-in-out infinite',
        'slide-in-left': 'slide-in-left 0.3s ease-out forwards',
        'slide-in-right': 'slide-in-right 0.3s ease-out forwards',
        'fade-in-down': 'fade-in-down 0.5s ease-out forwards',
        'fade-in-up': 'fade-in-up 0.5s ease-out forwards',
        'scale-in': 'scale-in 0.5s ease-out forwards',
        'text-reveal': 'text-reveal 0.6s ease-out forwards',
        'gradient-shift': 'gradient-shift 15s ease infinite',
        'bounce-dot': 'bounce-dot 1.4s infinite ease-in-out both',
        'float-particle': 'float-particle 6s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
      },
      boxShadow: {
        'glow-teal': '0 0 30px rgba(26, 122, 122, 0.4)',
        'glow-cyan': '0 0 30px rgba(0, 206, 209, 0.4)',
        'glow-recording': '0 0 40px rgba(220, 38, 38, 0.4)',
        'inner-soft': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
        'card': '0 4px 20px rgba(10, 46, 46, 0.08)',
        'card-hover': '0 8px 30px rgba(10, 46, 46, 0.12)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'valtric-gradient': 'linear-gradient(135deg, #E8F4F4 0%, #D4E8E4 50%, #C8E0D8 100%)',
        'valtric-dark': 'linear-gradient(135deg, #0A2E2E 0%, #0D3D3D 50%, #115252 100%)',
        'neural-mesh': 'radial-gradient(circle at 20% 30%, rgba(0, 206, 209, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(26, 122, 122, 0.1) 0%, transparent 50%)',
      },
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
      borderRadius: {
        'valtric': '0.75rem',
      },
    },
  },
  plugins: [],
};
