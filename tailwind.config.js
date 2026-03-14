/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans:  ['Inter', 'system-ui', 'sans-serif'],
        mono:  ['JetBrains Mono', 'Menlo', 'Monaco', 'monospace'],
      },
      colors: {
        base:     '#0d1117',
        surface:  '#161b22',
        elevated: '#21262d',
        border:   '#30363d',
        muted:    '#7d8590',
        text:     '#e6edf3',
        blue:     '#2f81f7',
        green:    '#3fb950',
        red:      '#f85149',
        yellow:   '#d29922',
        purple:   '#bc8cff',
        orange:   '#ffa657',
      },
    },
  },
  plugins: [],
}
