# oklch-shades

Perceptually uniform neutral scale generation using OKLCH.  
WCAG 2.1 + APCA (WCAG 3.0) contrast auditing.  
Zero dependencies. Works in Node, browser, Deno, and Figma plugins.

**Author:** [Olawale Balo](https://github.com/theolawalemi) — Product Designer + Design Engineer

---

## What it does

Takes any pure neutral hex scale and generates perceptually uniform warm or cool variants by:

1. Converting each step to OKLCH
2. Keeping **L (lightness) identical** — same perceived brightness
3. Introducing a small, tapered **chroma (C)** at a fixed **hue angle (H)**
4. Converting back to hex

Unlike RGB channel nudging, this method preserves perceptual uniformity across the full scale. The WCAG AA boundary stays locked.

---

## Install
```bash
npm install oklch-shades
```

Or use locally in a monorepo:
```json
{
  "dependencies": {
    "oklch-shades": "file:../oklch-shades"
  }
}
```

---

## Usage
```ts
import { generateScale, auditScale, firstPassingStep, HUE } from 'oklch-shades'

const gray = {
  "0":   "#FFFFFF",
  "50":  "#FAFAFA",
  "100": "#F5F5F5",
  "200": "#E5E5E5",
  "300": "#D3D3D3",
  "400": "#A1A1A1",
  "500": "#757575",
  "600": "#5C5C5C",
  "700": "#3D3D3D",
  "800": "#262626",
  "900": "#1C1C1C",
  "950": "#0A0A0A",
}

// Generate warm (sand) and cool (slate) variants
const sand  = generateScale(gray, { hue: HUE.sand  })  // 68°  yellow-amber
const slate = generateScale(gray, { hue: HUE.slate })  // 255° blue-slate

// Audit a scale against white — OKLCH values + WCAG results per step
const audit = auditScale(slate)

// Find the first step that passes WCAG AA (4.5:1)
const boundary = firstPassingStep(slate)
// → { step: "500", hex: "#71767B", ratio: 4.59 }
```

---

## Hue presets
```ts
import { HUE } from 'oklch-shades'

HUE.sand   // 68°  — yellow-amber warm
HUE.amber  // 68°
HUE.stone  // 75°  — slightly more orange-warm
HUE.rose   // 20°  — red-warm
HUE.slate  // 255° — blue-slate cool
HUE.sky    // 220° — lighter blue cool
HUE.teal   // 195° — teal cool
HUE.mauve  // 310° — purple-adjacent
```

---

## Custom chroma

Control toning intensity per step:
```ts
const subtle = generateScale(gray, {
  hue: HUE.slate,
  chromaMap: {
    "500": 0.005,  // much quieter midtone
    "600": 0.005,
  }
})

const strong = generateScale(gray, {
  hue: HUE.sand,
  chromaMap: {
    "400": 0.018,  // push toward tinted
    "500": 0.020,
  }
})
```

Default chroma curve (tapers at extremes):

| Step | Chroma |
|------|--------|
| 0    | 0.000  |
| 50   | 0.004  |
| 100  | 0.004  |
| 200  | 0.007  |
| 300  | 0.007  |
| 400  | 0.010  |
| 500  | 0.010  |
| 600  | 0.009  |
| 700  | 0.009  |
| 800  | 0.005  |
| 900  | 0.005  |
| 950  | 0.005  |

---

## API

### `generateScale(pure, options)`
Generate a toned neutral scale from a pure neutral.

| Param | Type | Description |
|-------|------|-------------|
| `pure` | `NeutralScale` | Source scale `{ "500": "#757575" }` |
| `options.hue` | `number` | OKLCH hue angle 0–360 |
| `options.chromaMap` | `object?` | Override chroma per step |

Returns `NeutralScale`

---

### `auditScale(scale, background?)`
Audit every step — returns OKLCH values and WCAG contrast results.

Returns `ScaleAudit[]`

---

### `firstPassingStep(scale, background?)`
Find the first step that passes WCAG AA (4.5:1).

Returns `{ step, hex, ratio } | null`

---

### `hexToOklch(hex)` / `oklchToHex(color)`
Direct OKLCH ↔ hex conversion.

---

### `contrastAudit(foreground, background?)`
Combined WCAG 2.1 + APCA audit in one call. Returns both results.
```ts
const result = contrastAudit('#71767B', '#FFFFFF')

// WCAG 2.1
result.wcag21.ratio          // 4.59
result.wcag21.passAA         // true
result.wcag21.passAAA        // false

// APCA (WCAG 3.0)
result.apca.lc               // 68.5  (signed — positive = dark on light)
result.apca.lcAbs            // 68.5
result.apca.passBodyText     // false — needs 75 Lc
result.apca.passLargeText    // true  — passes 60 Lc
result.apca.passUIElement    // true  — passes 45 Lc
result.apca.passPlaceholder  // true  — passes 30 Lc
```

---

### `apcaLc(foreground, background?)`
Raw APCA Lc value. Signed — positive = dark text on light bg.

Implements **APCA-W3 0.0.98G-4g** (current Bronze/Simple mode spec).
```ts
apcaLc('#3A3D42', '#FFFFFF')  // → 91.5 Lc  — fluent body text
apcaLc('#71767B', '#FFFFFF')  // → 68.5 Lc  — large text
apcaLc('#9DA2A7', '#FFFFFF')  // → 47.8 Lc  — UI components
apcaLc('#FFFFFF', '#0A0A0A')  // → -104 Lc  — light on dark
```

---

### APCA thresholds (0.0.98G-4g)

| Lc (abs) | Use case |
|----------|----------|
| 90+      | Fluent body text, long-form reading |
| 75+      | Body text, normal weight columns |
| 60+      | Large text 18px+ / subheadings |
| 45+      | UI components, icons, non-text |
| 30+      | Placeholder, disabled, decorative |
| 15+      | Incidental / invisible-pass minimum |

> Note: APCA is a draft standard. WCAG 2.1 remains the current legal requirement.
> Use both for forward-compatible, perceptually sound decisions.

---

### `apcaAudit(foreground, background?)`
Full APCA audit with all threshold checks.

---

### `wcagAudit(foreground, background?)`
Full WCAG audit — returns `{ ratio, passAA, passAALarge, passAAA }`.

---

## Use with Style Dictionary
```js
// build-tokens.js
import { generateScale, HUE } from 'oklch-shades'
import StyleDictionary from 'style-dictionary'

const gray  = { /* your gray scale */ }
const slate = generateScale(gray, { hue: HUE.slate })

// Pass slate into your token definition
const tokens = {
  color: {
    neutral: Object.fromEntries(
      Object.entries(slate).map(([step, hex]) => [
        step,
        { value: hex, type: 'color' }
      ])
    )
  }
}
```

---

## Output sample
```
gray  neutral-0     #FFFFFF
gray  neutral-50    #FAFAFA
gray  neutral-500   #757575   4.61:1 ✓

sand  neutral-0     #FFFFFF
sand  neutral-50    #FCFAF7
sand  neutral-500   #79746F   4.62:1 ✓

slate neutral-0     #FFFFFF
slate neutral-50    #F8FAFD
slate neutral-500   #71767B   4.59:1 ✓
```

---

## License

MIT