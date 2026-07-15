/** @type {import('tailwindcss').Config} */

// Yohaku 设计系统 · Tailwind v3 适配
// 令牌契约来自 @yohaku/design-system (MIT, Innei)
export default {
  darkMode: ["class", '[data-theme="dark"]'],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        // 纸面底色 — 通过 CSS 变量在浅/深主题间切换
        paper: "var(--surface-paper)",
        border: "var(--color-border)",
        accent: "var(--color-accent)",
        // Yohaku 中性灰 · 三档十级 (浅色带纸张暖意 R>G>B)
        neutral: {
          1: "#f9f8f5",
          2: "#f0efeb",
          3: "#e3e1db",
          4: "#d0cec6",
          5: "#a8a69f",
          6: "#787670",
          7: "#5c5a55",
          8: "#403f3a",
          9: "#24231f",
          10: "#141312",
        },
        // 和色语义 (克制, 与强调色匹配)
        info: "#3d6896",
        success: "#5e9f7e",
        warning: "#a87a3d",
        error: "#a64953",
      },
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "PingFang SC",
          "Microsoft YaHei",
          "Noto Sans SC",
          "Hiragino Sans GB",
          "sans-serif",
          "Apple Color Emoji",
          "Segoe UI Emoji",
        ],
        serif: [
          "Noto Serif SC",
          "Source Han Serif SC",
          "Source Han Serif",
          "SongTi SC",
          "SimSun",
          "Hiragino Sans GB",
          "Georgia",
          "serif",
        ],
        mono: [
          "JetBrains Mono",
          "Fira Code",
          "Cascadia Code",
          "Consolas",
          "Monaco",
          "monospace",
        ],
        logo: ["EB Garamond", "Noto Serif SC", "Georgia", "serif"],
      },
      fontSize: {
        // Yohaku 角色化字号 · role + px
        "caption-10": ["10px", { lineHeight: "1.4" }],
        "label-12": ["12px", { lineHeight: "1.5" }],
        "copy-13": ["13px", { lineHeight: "1.54" }],
        "copy-14": ["14px", { lineHeight: "1.57" }],
        "copy-15": ["15px", { lineHeight: "1.6" }],
        "copy-16": ["16px", { lineHeight: "1.625" }],
        "title-20": ["20px", { lineHeight: "1.4" }],
        "title-24": ["24px", { lineHeight: "1.33" }],
        "title-28": ["28px", { lineHeight: "1.29" }],
        "display-36": ["36px", { lineHeight: "1.22" }],
        "display-48": ["48px", { lineHeight: "1.17" }],
        "icon-sm": ["14px"],
        "icon-md": ["16px"],
        "icon-lg": ["18px"],
      },
      letterSpacing: {
        tightish: "0.01em",
        eyebrow: "0.15em",
      },
      transitionTimingFunction: {
        breathe: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      animation: {
        "fade-in": "fade-in 0.6s var(--ease-breathe) both",
        "fade-up": "fade-up 0.6s var(--ease-breathe) both",
        "breathe": "breathe 2.4s var(--ease-breathe) infinite",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        breathe: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
      },
      backdropBlur: {
        thick: "40px",
        thin: "6px",
      },
    },
  },
  plugins: [],
};
