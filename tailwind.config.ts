import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'matrix-black': '#000000',
        'matrix-dark': '#0a0a0a',
        'matrix-darker': '#050505',
        'matrix-green': '#00ff41',
        'matrix-green-dim': '#00cc33',
        'matrix-green-dark': '#008822',
        'matrix-blue': '#00ffff',
        'matrix-blue-dim': '#0099cc',
        'matrix-red': '#ff0040',
        'matrix-gray': '#1a1a1a',
        'matrix-gray-light': '#333333',
        'matrix-text': '#00ff41',
        'matrix-text-dim': '#cccccc',
      },
      fontFamily: {
        'matrix': ['Orbitron', 'monospace'],
        'matrix-mono': ['Courier Prime', 'Courier New', 'monospace'],
      },
      animation: {
        'matrix-glow': 'matrix-glow 2s ease-in-out infinite alternate',
        'matrix-pulse': 'matrix-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'matrix-scan': 'matrix-scan 3s linear infinite',
        'typing': 'typing 2s steps(40, end)',
      },
      keyframes: {
        'matrix-glow': {
          '0%': { 
            boxShadow: '0 0 20px rgba(0, 255, 65, 0.3)',
            textShadow: '0 0 20px rgba(0, 255, 65, 0.5)'
          },
          '100%': { 
            boxShadow: '0 0 40px rgba(0, 255, 65, 0.8)',
            textShadow: '0 0 30px rgba(0, 255, 65, 1)'
          },
        },
        'matrix-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        'matrix-scan': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'typing': {
          'from': { width: '0' },
          'to': { width: '100%' },
        },
      },
      backdropBlur: {
        'matrix': '10px',
      },
      boxShadow: {
        'matrix': '0 0 20px rgba(0, 255, 65, 0.3)',
        'matrix-strong': '0 0 30px rgba(0, 255, 65, 0.6)',
        'matrix-inset': 'inset 0 0 20px rgba(0, 255, 65, 0.1)',
      },
    },
  },
  plugins: [],
};

export default config; 