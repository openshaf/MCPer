# MCPer / toolRelay — UI Implementation Guide

> **Purpose:** Exact specification to reproduce the warm editorial UI on any branch.  
> Follow this file top-to-bottom. Every value, class name, and animation timing is canonical.

> [!IMPORTANT]  
> The `main` branch uses a **completely different dark design system** (`Inter` font, `--bg-primary: #070b14`, `@import "tailwindcss"`, indigo/violet palette). When applying to `main`, remove the Tailwind import and replace all dark tokens before adding components.

---

## 1. Design Tokens

### 1.1 Color Palette

| Token | Value | Usage |
|---|---|---|
| `--bg` | `#F5F1E8` | Page background (warm parchment) |
| `--bg-card` | `#FFFFFF` | Input cards, result panels |
| `--text-primary` | `#1A1A1A` | Headings, body text |
| `--text-secondary` | `#5A5550` | Sub-copy, descriptions |
| `--text-muted` | `#9A948C` | Labels, placeholders, ghost elements |
| `--accent` | `#FF6B1A` | CTA button, badge, verify arrow, progress dots |
| `--accent-hover` | `#E55A0A` | Hover state for accent elements |
| `--border` | `#C8C4BC` | Dashed borders, section separators |
| `--border-input` | `#D4CFC8` | Input card border at rest |

### 1.2 Typography

| Role | Family | Weight | Size |
|---|---|---|---|
| Headings | `Instrument Serif` | 400 | `clamp(3rem, 8vw, 5.5rem)` |
| UI / Body | `Instrument Sans` | 400–700 | 12–16px |
| Badge label | `Special Elite` | 400 | 22px |
| Monospace / code | `JetBrains Mono` | 400–500 | 12px |

**Google Fonts link** (add to `<head>` in `layout.tsx`):

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
<link href="https://fonts.googleapis.com/css2?family=Bangers&family=Oswald:wght@200..700&family=Special+Elite&display=swap" rel="stylesheet" />
```

Also add Instrument fonts in `globals.css`:

```css
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Instrument+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
```

---

## 2. `globals.css` — Complete File

```css
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Instrument+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

/* ── Design tokens ─────────────────────────────────────────────── */
:root {
  --bg:             #F5F1E8;
  --bg-card:        #FFFFFF;
  --text-primary:   #1A1A1A;
  --text-secondary: #5A5550;
  --text-muted:     #9A948C;
  --accent:         #FF6B1A;
  --accent-hover:   #E55A0A;
  --border:         #C8C4BC;
  --border-input:   #D4CFC8;
}

/* ── Base ──────────────────────────────────────────────────────── */
html { scroll-behavior: smooth; }
*, *::before, *::after { box-sizing: border-box; }
body {
  background-color: var(--bg);
  color: var(--text-primary);
  font-family: 'Instrument Sans', ui-sans-serif, system-ui, sans-serif;
  min-height: 100vh;
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
}

::-webkit-scrollbar       { width: 5px; }
::-webkit-scrollbar-track { background: var(--bg); }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: #AAA49C; }

/* ── Badge ─────────────────────────────────────────────────────── */
.badge-accent {
  display: inline-block;
  padding: 5px 14px;
  background: var(--accent);
  color: #fff;
  font-family: 'Instrument Sans', sans-serif;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  border-radius: 5px;
  transform: rotate(-2deg);
}

/* ── Primary button ────────────────────────────────────────────── */
.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 28px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-family: 'Instrument Sans', sans-serif;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: .02em;
  cursor: pointer;
  transition: background 0.18s ease, transform 0.15s ease, box-shadow 0.18s ease;
  box-shadow: 0 4px 16px rgba(255,107,26,.28);
}
.btn-primary:hover  { background: var(--accent-hover); transform: translateY(-1px); box-shadow: 0 6px 22px rgba(255,107,26,.36); }
.btn-primary:active { transform: translateY(0); }
.btn-primary:disabled { opacity: .55; cursor: not-allowed; transform: none; box-shadow: none; }

/* ── Keyframes ─────────────────────────────────────────────────── */
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(18px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes spin  { to { transform: rotate(360deg); } }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }

.animate-fade-in-up { animation: fadeInUp 0.55s ease both; }
.delay-100 { animation-delay: .1s; }
.delay-200 { animation-delay: .2s; }
.delay-300 { animation-delay: .3s; }

/* ── Result card ───────────────────────────────────────────────── */
.result-card {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px 24px;
  box-shadow: 0 2px 12px rgba(0,0,0,.05);
  text-align: left;
  max-height: 80vh;
  overflow-y: auto;
}
```

---

## 3. `layout.tsx`

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MCPer — Turn Any API into an MCP Server",
  description: "MCPer converts OpenAPI / Swagger specs into fully functional FastMCP servers.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Bangers&family=Oswald:wght@200..700&family=Special+Elite&display=swap" rel="stylesheet" />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
```

> `suppressHydrationWarning` on `<body>` prevents SSR/client UUID mismatch errors.

---

## 4. `page.tsx` — State Machine & Animation

### 4.1 State Variables

```tsx
const [entries, setEntries]     = useState<ApiEntry[]>(() => [createEntry()]);
const [buildStep, setBuildStep] = useState<BuildStep>("idle");
const [result, setResult]       = useState<BuildResult | null>(null);
const [globalErr, setGlobalErr] = useState<string | null>(null);
const [submitted, setSubmitted] = useState(false); // controls exit animations
```

### 4.2 ID Generation (SSR-safe)

```tsx
function createEntry(): ApiEntry {
  const id = typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `api-${Math.random().toString(36).slice(2)}`;
  return { id, mode: "url", value: "", status: "idle" };
}
```

### 4.3 `submitted` Triggers

```tsx
const handleBuild = async () => {
  setGlobalErr(null);
  setResult(null);
  if (!validate()) return;
  setSubmitted(true);  // ← triggers all exit animations
  // ... rest of build logic
};

const handleReset = () => {
  setEntries([createEntry()]);
  setBuildStep("idle");
  setResult(null);
  setGlobalErr(null);
  setSubmitted(false); // ← reverses all animations
};
```

### 4.4 Exit Animation Spec

| Element | `translateY` exit | Duration | Delay |
|---|---|---|---|
| Hero heading + badge | `-60px` | `0.85s` | `0ms` |
| Sub-copy paragraph | `-48px` | `0.85s` | `120ms` |
| Form (inputs + buttons) | `-36px` | `0.85s` | `250ms` |

**Easing for all:** `cubic-bezier(0.4,0,0.2,1)`  
All elements also: `opacity: submitted ? 0 : 1`, `pointerEvents: submitted ? "none" : "auto"`

**Back button (top-left):**  
- `opacity: submitted ? 1 : 0`  
- `transform: submitted ? "translateX(0)" : "translateX(-16px)"`  
- `transition: "opacity 0.5s ease 0.4s, transform 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.4s"`

### 4.5 Badge Positioning (overlaps the "W")

```tsx
<div style={{ position: "relative", display: "inline-block", marginBottom: 20, /* + exit animation styles */ }}>
  <span
    className="badge-accent"
    style={{
      position: "absolute",
      top: "-5px",
      left: "-8px",
      transform: "rotate(-8deg)",  // 8° anti-clockwise
      zIndex: 2,
      fontFamily: "'Special Elite', cursive",
      fontSize: 22,
      letterSpacing: "2px",
    }}
  >
    toolRelay
  </span>
  <h1 style={{ fontFamily: "'Instrument Serif'", fontSize: "clamp(3rem, 8vw, 5.5rem)", fontWeight: 400 }}>
    What are you <em style={{ fontStyle: "italic" }}>building?</em>
  </h1>
</div>
```

---

## 5. `ApiEntryCard.tsx` Spec

### Card wrapper
```
background: #fff
border: 1px solid <dynamic>
borderRadius: 10
overflow: hidden
```

### Border color logic
```
success → #86EFAC
error   → #FCA5A5
focused → var(--accent)
idle    → var(--border-input)
```

### Box shadow logic
```
focused → "0 0 0 3px rgba(255,107,26,.10), 0 2px 12px rgba(0,0,0,.06)"
success → "0 0 0 3px rgba(16,185,129,.08)"
error   → "0 0 0 3px rgba(239,68,68,.08)"
idle    → "0 2px 8px rgba(0,0,0,.04)"
```

### Input row (padding: `6px 6px 6px 18px`)
- **Index number:** shown only when `canRemove = true`, 12px muted
- **URL input:** `type="url"`, placeholder `"API Base URL or Direct Spec URL"`, 16px, transparent bg
- **Success badge:** shown when `entry.status === "success" && entry.apiTitle`, green `#059669`
- **Verify button:** 44×44px, `borderRadius: 8`, orange default → green on success → red on error
  - Content: `→` (idle) / `…` (verifying) / `✓` (success) / `!` (error)
  - `opacity: 0.35` when empty and not verifying
- **Remove button:** 36×36px, ghost → red hover, only shown when `canRemove`

### Footer row (padding: `0 18px 12px`)
- **"Add API key":** ghost button, muted → orange hover
- **Key expanded:** input (monospace, `#fafafa` bg) + 👁 toggle inside + ✕ cancel beside
  - Cancel clears: `setKeyExpanded(false)` + `onUpdate(id, { apiKey: undefined })`
- **Error:** `#dc2626`, 12px, with ⚠ prefix
- **Success count:** `#059669`, 12px

---

## 6. `BuildProgress.tsx` Spec

### Step dots
- **Dot size:** 28×28px, `borderRadius: "50%"`
- **Done:** `#FF6B1A` bg, white `✓`
- **Active:** `#FF6B1A` bg, `SpinIcon`, `box-shadow: 0 0 0 4px rgba(255,107,26,.15)`
- **Pending:** `#E8E4DC` bg, `#9A948C` text

### Connector bars
- Track: `height: 2`, `background: #E8E4DC`
- Fill: `background: #FF6B1A`, `transition: width .6s ease`
- Before dot: fills to `50%` when active, `100%` when done past
- After dot: fills to `100%` when all done

### Labels
- `fontSize: 10`, uppercase, `letterSpacing: .06em`
- Done/Active: `#FF6B1A` — Pending: `#C8C4BC`

### Status bar
```
background: #fff
border: 1px solid #E8E4DC
borderRadius: 8
padding: 12px 16px
```
- Idle/building: orange `SpinIcon` + `#5A5550` message text
- Done: `✓` + `#059669` text
- Error: `⚠` `#dc2626` + `#dc2626` text

---

## 7. `ResultPanel.tsx` Spec

### Success banner
```
background: rgba(255,107,26,.06)
border: 1px solid rgba(255,107,26,.2)
borderRadius: 10
padding: 16px 20px
```
- Icon: 40×40, `background: rgba(255,107,26,.12)`, `borderRadius: 10`, 🎉
- Title: 15px, `fontWeight: 700`, `#1A1A1A`
- Meta text: 12px, `#7A7470`

### `CodeBlock` header bar
```
background: #F5F1E8
border-bottom: 1px solid #E8E4DC
padding: 8px 14px
```
- Label: 10px, uppercase, `#9A948C`, `letterSpacing: .08em`
- Copy button: `background: rgba(255,107,26,.1)`, `color: #FF6B1A`; copied → `background: rgba(5,150,105,.12)`, `color: #059669`

### `CodeBlock` code area
```
highlight=true:  background: #1C1917, color: #FCD34D
highlight=false: background: #2A2623, color: #D4CFC9
font-family: 'JetBrains Mono', monospace
font-size: 12px, line-height: 1.65
white-space: pre-wrap, word-break: break-all
```

### Reset button
```
border: 1.5px dashed #D8D4CC
color: #9A948C
borderRadius: 8
```
Hover: `borderColor → #FF6B1A`, `color → #FF6B1A`

---

## 8. `FeatureCard.tsx` Spec

Used in the features grid section (currently commented out in page.tsx but should be themed).

### Card wrapper
```
background: #fff
border: 1px solid var(--border)
borderRadius: 12
padding: 20px 24px
boxShadow: 0 2px 8px rgba(0,0,0,.04)
```

Hover:
```
borderColor → var(--accent)
boxShadow → 0 4px 16px rgba(255,107,26,.08)
```

### Icon container
```
width/height: 40px, borderRadius: 10
background: rgba(255,107,26,.08)
border: 1px solid rgba(255,107,26,.15)
font-size: 20px
```

### Badge variants (renamed from dark indigo/cyan/emerald/amber)

| Variant | bg | color | border |
|---|---|---|---|
| `accent` | `rgba(255,107,26,.10)` | `#FF6B1A` | `rgba(255,107,26,.25)` |
| `success` | `rgba(5,150,105,.08)` | `#059669` | `rgba(5,150,105,.2)` |
| `warning` | `rgba(217,119,6,.08)` | `#B45309` | `rgba(217,119,6,.2)` |
| `neutral` | `#F0EDE6` | `#7A7470` | `#E8E4DC` |

### Text
- Title: 14px, `fontWeight: 700`, `var(--text-primary)`, Instrument Sans
- Description: 13px, `var(--text-secondary)`, `lineHeight: 1.6`

---

## 9. Checklist for New Branch

- [ ] `globals.css` — full file from §2 (no Tailwind import)
- [ ] `layout.tsx` — font links + `suppressHydrationWarning` on `<body>`
- [ ] `page.tsx` — 5 state variables including `submitted`
- [ ] `page.tsx` — SSR-safe `crypto.randomUUID()` for entry IDs
- [ ] `page.tsx` — `setSubmitted(true)` in `handleBuild` after validation
- [ ] `page.tsx` — `setSubmitted(false)` in `handleReset`
- [ ] `page.tsx` — staggered exit animations on heading / subtext / form
- [ ] `page.tsx` — fixed back button slides in from left on submit
- [ ] `page.tsx` — badge: `position: absolute`, `top: -5px`, `left: -8px`, `rotate(-8deg)`
- [ ] `ApiEntryCard.tsx` — white card, warm borders, orange verify button
- [ ] `BuildProgress.tsx` — orange dots, cream track, white status bar
- [ ] `ResultPanel.tsx` — warm banner, dark warm code blocks, orange copy
- [ ] Zero `rgba(0,0,0,.4+)` or `rgba(255,255,255,...)` dark-mode remnants anywhere
