/**
 * CodeZone - Yohaku Design System
 * 一种主色，三档中性灰，剩下都是留白
 */

export default {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // 中性灰 - 三档暖灰 (60% 暖度)
        neutral: {
          1: '#F9F8F5',
          2: '#F0EFEB',
          3: '#E3E1DB',
          4: '#D0CEC6',
          5: '#A8A69F',
          6: '#787670',
          7: '#5C5A55',
          8: '#403F3A',
          9: '#24231F',
          10: '#141312',
        },
        // 主色 - 梅红
        accent: {
          DEFAULT: '#C56473',
          light: '#E095A4',
          subtle: 'rgba(197, 100, 115, 0.08)',
        },
        // 语义色 - 日本传统色
        info: '#3D6896',
        success: '#5E9F7E',
        warning: '#A87A3D',
        error: '#A64953',
      },
      fontFamily: {
        sans: ['Inter', 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', 'system-ui', 'sans-serif'],
        serif: ['Noto Serif CJK SC', 'Source Han Serif', 'SongTi SC', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      borderRadius: {
        'sm': '4px',
        'md': '6px',
        'lg': '8px',
        'xl': '12px',
        '2xl': '16px',
      },
      boxShadow: {
        'whisper': '0 1px 2px rgba(0, 0, 0, 0.04)',
        'float': '0 4px 12px rgba(0, 0, 0, 0.08)',
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
  ],
}
