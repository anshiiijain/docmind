/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],  // ← merged
  theme: {
    extend: {
      colors: {
        primary: '#5e6ad2',
        'primary-hover': '#828fff',
        'primary-focus': '#5e69d1',
        canvas: '#010102',
        's1': '#0f1011',
        's2': '#141516',
        's3': '#18191a',
        hairline: '#23252a',
        'hairline-strong': '#34343a',
        ink: '#f7f8f8',
        'ink-muted': '#d0d6e0',
        'ink-subtle': '#8a8f98',
        'ink-tertiary': '#62666d',
        success: '#27a644',
      },
      fontFamily: {
        display: ['Inter', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        xs: '4px', sm: '6px', md: '8px',
        lg: '12px', xl: '16px', pill: '9999px',
      },
    },
  },
  plugins: [],
}