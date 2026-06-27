---
name: codezone-yohaku-design
description: 'Build new CodeZone UI following Yohaku design system: HTML mockups, React components, or mockup->React handoff. Triggers on "make a Yohaku mockup / design a new component / add a hero / modal / sheet / convert mockup to React / audit token compliance / Yohaku 化 / 检查 token 合规".'
---

# codezone-yohaku-design

The CodeZone design system based on Yohaku (余白): static tokens, component catalog, and patterns for the CodeZone collaborative development platform. Based on [@yohaku/design-system](https://github.com/Innei/Yohaku).

## Step 1 · Identify the task

| User says | Task tier | Read |
|---|---|---|
| "make a mockup for X" / "design a new hero / modal / sheet" | **New mockup** | `design-system/CHEATSHEET.md` |
| "build component X" / "I need a new Button variant" | **New React component** | `design-system/CHEATSHEET.md` + `frontend/src/components/ui/` |
| "convert this mockup to React" / "implement this design" | **Handoff** | `design-system/CHEATSHEET.md` |
| "audit this file for token compliance" / "is this color right?" / "检查 token 合规" | **Token audit** | `design-system/CHEATSHEET.md` |
| "what size for this text?" / "migrate hardcoded text-[Npx]" | **Type audit** | `design-system/CHEATSHEET.md` Type scale |

If unsure, ask one short question instead of guessing.

## Step 2 · Produce

### New React component
1. **First** check `frontend/src/components/ui/` to confirm the primitive does not already exist. Reuse beats reinvent.
2. Use only the tokens listed in `design-system/CHEATSHEET.md`. Never reach for `text-neutral-50…950`.
3. Use role+px type scale tokens: `text-copy-14` for body, `text-title-28` for page H1, etc.
4. CJK headings cap at `font-medium` (500). Never `font-bold` on Chinese text.
5. Run `npm run lint` on changed files only.

### Token audit
1. Read `design-system/CHEATSHEET.md` banned patterns section.
2. Scan the target file for: `text-neutral-50/100/200/.../950`, raw hex literals, `text-neutral-5` used as text, hardcoded `font-family`, `font-bold` on Chinese text, `text-xs/sm/base/lg/xl/2xl/3xl/4xl/5xl`, hardcoded `text-[Npx]`.
3. Report a punch list with line numbers and proposed replacements.

## Step 3 · Verify

```bash
cd frontend && npm run lint
```

Run before committing changes inside `frontend/src/`.

## Key tokens reference

```
Colors:   neutral-1..10, accent, info, success, warning, error
Type:     caption-10, label-12, copy-13/14/15/16, title-20/24/28, display-36/48
Weights:  font-normal (body), font-medium (heading), NEVER font-bold on CJK
Shadows:  whisper, float, ring-* (never shadow-lg/xl/2xl)
Blur:     sm/md/xl/2xl (four levels only)
```

## When NOT to use this skill

- Editing application logic, routes, queries, hooks — this skill is design-only.
- Modifying backend code.
- Working with Monaco Editor themes or terminal color schemes.

## Languages

This skill and the cheatsheet are English. The web app (CodeZone) and its content are Chinese-first.
