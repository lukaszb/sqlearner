import type { Config } from 'tailwindcss'

export default {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{vue,ts}'],
  theme: {
    extend: {
      colors: {
        ink: '#17202a',
        panel: '#f7f7f4',
        brand: '#256f63'
      }
    }
  },
  plugins: []
} satisfies Config
