/**
 * oklch-shades
 * ─────────────────────────────────────────────────────────────────────────────
 * Usage example
 * Run: node --input-type=module examples/usage.js
 * (after building: tsc)
 */

// When using after npm install:
// import { generateScale, auditScale, firstPassingStep, HUE } from 'oklch-shades'

// When running from source (JS equivalent):
import {
  generateScale,
  auditScale,
  firstPassingStep,
  hexToOklch,
  contrastRatio,
  HUE,
} from '../src/index.js'

// ─── Your gray scale ─────────────────────────────────────────────────
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

// ─── Generate scales ─────────────────────────────────────────────────────────
const sand  = generateScale(gray, { hue: HUE.sand  })
const slate = generateScale(gray, { hue: HUE.slate })

console.log('sand-500 →', sand['500'])   // #79746F
console.log('slate-500 →', slate['500'])  // #71767B

// ─── Audit a scale ───────────────────────────────────────────────────────────
const audit = auditScale(slate)
audit.forEach(({ step, hex, oklch, contrast }) => {
  const pass = contrast.passAA ? '✓' : '✗'
  console.log(`${pass} slate-${step.padEnd(4)} ${hex}  L=${oklch.l.toFixed(3)}  ${contrast.ratio.toFixed(2)}:1`)
})

// ─── Find the AA text boundary ───────────────────────────────────────────────
const boundary = firstPassingStep(slate)
console.log(`\nFirst AA-passing step: slate-${boundary?.step} (${boundary?.hex})`)

// ─── Custom hue and chroma ───────────────────────────────────────────────────
const custom = generateScale(gray, {
  hue: 195,                        // teal leaning cool
  chromaMap: { "500": 0.015 },     // boost midtone chroma
})
console.log('\ncustom-500 →', custom['500'])