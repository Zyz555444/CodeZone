# CodeZone · Yohaku Design System Cheatsheet

One-page quick reference. Full Yohaku spec: [github.com/Innei/Yohaku](https://github.com/Innei/Yohaku).

## Invariants (11 rules)

1. Neutrals are three-tier: 1-4 surface/fill, 5-7 border/icon/secondary text, 8-10 body/heading.
2. n-5 must never be used for text. n-6 only for small text. n-7 for secondary text.
3. Tailwind's `neutral-50…950` palette is banned. Use `text-neutral-1…10` only.
4. Accent covers <= 5% of any surface. Reserved for CTA, focus ring, and brand mark.
5. Default body color is n-9 (dark mode auto-inverts).
6. Three font roles only: sans, serif, mono. CJK fallback is mandatory.
7. Type tokens are **role + px**. Tailwind defaults `text-xs/sm/base/lg/xl/2xl/3xl/...` and hardcoded `text-[Npx]` are banned. Default body is `text-copy-14`.
8. Backdrop blur has four levels. Do not invent more.
9. Border radius follows Tailwind defaults; `rounded-2xl` is the cap for hero surfaces.
10. Depth comes from ring or whisper shadow. Hard drop shadows are forbidden.
11. Mockup HTML files must use token vars. Raw hex outside the contract is a lint failure.

## Color

### Neutral (Pure scale)

| Var | Hex | Tier | Use |
|---|---|---|---|
| `--color-neutral-1` | `#f9f8f5` | 1 (surface) | Page background light, lightest fills |
| `--color-neutral-2` | `#f0efeb` | 1 (surface) | Card background |
| `--color-neutral-3` | `#e3e1db` | 1 (surface) | Subtle fill, hover surface |
| `--color-neutral-4` | `#d0cec6` | 1 (surface) | Strong fill, divider behind icons |
| `--color-neutral-5` | `#a8a69f` | 2 (border) | Border on solid surfaces. **Never text.** |
| `--color-neutral-6` | `#787670` | 2 (border/icon) | Icon, very small label only |
| `--color-neutral-7` | `#5c5a55` | 2 (secondary) | Secondary text, captions |
| `--color-neutral-8` | `#403f3a` | 3 (body) | Body text alt, strong secondary |
| `--color-neutral-9` | `#24231f` | 3 (body) | **Default body color** |
| `--color-neutral-10` | `#141312` | 3 (heading) | Headings, max emphasis |

### Accent and semantic

| Var | Hex | Use |
|---|---|---|
| `--color-accent` | `#c56473` (梅 ume) | CTA, focus, brand mark. <= 5% surface. |
| `--color-info` | `#3d6896` (缥 hanada) | Informational state |
| `--color-success` | `#5e9f7e` (若竹 wakatake) | Success state |
| `--color-warning` | `#a87a3d` (朽葉 kuchiba) | Warning state |
| `--color-error` | `#a64953` (蘇芳 suoh) | Error / destructive state |

### Accent derivatives

| Var | Hex | Use |
|---|---|---|
| `--color-accent-light` | `#e095a4` | Light accent for dark mode / hover |
| `--color-accent-subtle` | `rgba(197,100,115,0.08)` | Subtle accent bg, selection |

## Typography

### Type scale (role + px)

**Base anchor**: `html { font-size: 14px }`

| Token | px | line-height | Use |
|---|---|---|---|
| `text-caption-10` | 10 | 1.4 | Eyebrow uppercase + tracking — use sparingly |
| `text-label-12` | 12 | 1.5 | Meta, small label, pagination, footnote |
| `text-copy-13` | 13 | 1.54 | Card description, compact body |
| `text-copy-14` | 14 | 1.57 | **Default body** (1rem at base 14) |
| `text-copy-15` | 15 | 1.6 | Dialog title, search input, `.prose` body |
| `text-copy-16` | 16 | 1.625 | Large body |
| `text-title-20` | 20 | 1.4 | Section heading, subhead |
| `text-title-24` | 24 | 1.33 | Sub-H1 |
| `text-title-28` | 28 | 1.29 | Page H1 |
| `text-display-36` | 36 | 1.22 | Hero, large display |
| `text-display-48` | 48 | 1.17 | OG display title |

### Font weights

- Body: `font-normal` (400)
- Heading: `font-medium` (500). **Never `font-bold` on Chinese text.**
- English emphasis: `font-semibold` (600) acceptable in narrow contexts.

### Font families

```
--font-sans:  Inter -> PingFang SC -> Microsoft YaHei -> Noto Sans SC -> system-ui
--font-serif: Noto Serif CJK SC -> Source Han Serif -> SongTi SC -> Georgia
--font-mono:  JetBrains Mono -> Fira Code -> Consolas -> Monaco -> Hannotate SC
```

## Quick decisions

| Need | Use |
|---|---|
| Body paragraph | `text-copy-14 text-neutral-9` |
| Secondary text | `text-copy-13 text-neutral-7` |
| Small caption | `text-label-12 text-neutral-7` |
| Page H1 | `text-title-28 font-medium text-neutral-10` |
| Section H | `text-title-20 font-medium text-neutral-9` |
| Card | `bg-neutral-2 rounded-lg p-4 ring-1 ring-border` |
| Primary CTA | accent fill, white text |
| Secondary button | `bg-neutral-2 hover:bg-neutral-3 text-neutral-9 ring-1 ring-border` |
| Tag / chip | `bg-neutral-2 text-neutral-7 text-label-12 px-2 py-0.5 rounded-md` |
| Code block | `bg-neutral-1 ring-1 ring-border rounded-md font-mono text-copy-13` |
| Blockquote | left border accent, `text-neutral-7` |
| Section divider | `1px solid var(--color-border)` or `bg-neutral-3 h-px` |

## Backdrop blur

| Level | Class | Use |
|---|---|---|
| Thick | `backdrop-blur-2xl` | Modal scrim, full-screen sheet |
| Default | `backdrop-blur-xl` | Floating panel, popover |
| Thin | `backdrop-blur-md` | Subtle frosted card on hero |
| Ultrathin | `backdrop-blur-sm` | Sticky header on scroll |

## Banned patterns

- `text-neutral-5` as text color → use `text-neutral-7`
- `text-neutral-50…950` from Tailwind defaults
- `text-xs/sm/base/lg/xl/2xl/3xl/4xl/5xl/6xl` → use role+px tokens
- `text-[Npx]` hardcoded pixel sizes
- `font-bold` on Chinese text → use `font-medium`
- `shadow-lg/xl/2xl` hard shadows → use whisper or ring
- `rounded-3xl` and larger → cap at `rounded-2xl`
- Raw hex in className → use token classes
