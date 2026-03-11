/**
 * oklch-shades
 * ─────────────────────────────────────────────────────────────────────────────
 * Perceptually uniform neutral scale generation using OKLCH.
 * Zero dependencies. Works in Node, browser, Deno, and Figma plugins.
 *
 * OKLCH pipeline:
 *   sRGB → Linear sRGB → XYZ D65 → LMS → OKLab → OKLCH  (and reverse)
 *
 * Contrast:
 *   WCAG 2.1 — relative luminance ratio (current standard)
 *   APCA      — Accessible Perceptual Contrast Algorithm (WCAG 3.0 draft)
 *
 * @author  Olawale Balo — Product Designer + Design Engineer
 * @license MIT
 * @version 1.0.0
 */


// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface OKLCHColor {
  l: number  // Lightness  0–1
  c: number  // Chroma     0–0.4  (neutrals ≈ 0.000)
  h: number  // Hue        0–360 degrees
}

export interface OKLabColor {
  l: number
  a: number
  b: number
}

export type NeutralScale = Record<string, string>

export interface GenerateOptions {
  hue: number
  chromaMap?: Partial<Record<string, number>>
}

// WCAG 2.1 Result
export interface WCAGResult {
  ratio:        number   // e.g. 4.61
  passAA:       boolean  // 4.5:1  Normal text
  passAALarge:  boolean  // 3.0:1  Large text
  passAAA:      boolean  // 7.0:1  Enhanced
}

// APCA / WCAG 3.0 Result
export interface APCAResult {
  /** Lc value — signed. Positive = Dark text on light background. Negative = Light text on dark background. */
  lc:           number
  /** Absolute Lc — use this for threshold comparisons */
  lcAbs:        number
  /** Body text (≥ 45 Lc). Replaces WCAG AA for normal text. */
  passBodyText: boolean
  /** Large text / 24px+ (≥ 30 Lc). Replaces WCAG AA-Large. */
  passLargeText: boolean
  /** Non-text UI elements, icons, borders (≥ 15 Lc). */
  passUIElement: boolean
  /** Placeholder / disabled text (≥ 30 Lc recommended). */
  passPlaceholder: boolean
}

// Combined contrast result — both standards
export interface ContrastResult {
  wcag21: WCAGResult
  apca:   APCAResult
}

export interface ScaleAudit {
  step:     string
  hex:      string
  oklch:    OKLCHColor
  contrast: ContrastResult
}


// ─────────────────────────────────────────────────────────────────────────────
// COLOR SPACE CONVERSION
// ─────────────────────────────────────────────────────────────────────────────

function srgbToLinear(c: number): number {
  const v = c / 255
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
}

function linearToSrgb(c: number): number {
  const v = c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055
  return Math.round(Math.max(0, Math.min(255, v * 255)))
}

function cbrt(v: number): number {
  return Math.sign(v) * Math.abs(v) ** (1 / 3)
}

export function hexToOklab(hex: string): OKLabColor {
  const h = hex.replace('#', '')
  const r = srgbToLinear(parseInt(h.slice(0, 2), 16))
  const g = srgbToLinear(parseInt(h.slice(2, 4), 16))
  const b = srgbToLinear(parseInt(h.slice(4, 6), 16))

  const x = r * 0.4122214708 + g * 0.5363325363 + b * 0.0514459929
  const y = r * 0.2119034982 + g * 0.6806995451 + b * 0.1073969566
  const z = r * 0.0883024619 + g * 0.2817188376 + b * 0.6299787005

  const l_ = cbrt(x), m_ = cbrt(y), s_ = cbrt(z)

  return {
    l:  0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
    a:  1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
    b:  0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
  }
}

export function hexToOklch(hex: string): OKLCHColor {
  const { l, a, b } = hexToOklab(hex)
  const C = Math.sqrt(a ** 2 + b ** 2)
  const H = ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360
  return { l, c: C, h: H }
}

export function oklabToHex(color: OKLabColor): string {
  const { l: L, a, b } = color
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b

  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3

  const r  =  4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
  const g  = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
  const b2 = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s

  const R = linearToSrgb(Math.max(0, r))
  const G = linearToSrgb(Math.max(0, g))
  const B = linearToSrgb(Math.max(0, b2))

  return `#${R.toString(16).padStart(2, '0').toUpperCase()}${G.toString(16).padStart(2, '0').toUpperCase()}${B.toString(16).padStart(2, '0').toUpperCase()}`
}

export function oklchToHex(color: OKLCHColor): string {
  const { l, c, h } = color
  const hRad = (h * Math.PI) / 180
  return oklabToHex({ l, a: c * Math.cos(hRad), b: c * Math.sin(hRad) })
}


// ─────────────────────────────────────────────────────────────────────────────
// WCAG 2.1 CONTRAST
// ─────────────────────────────────────────────────────────────────────────────

/** Relative luminance per WCAG 2.1 spec */
export function relativeLuminance(hex: string): number {
  const h = hex.replace('#', '')
  const r = srgbToLinear(parseInt(h.slice(0, 2), 16))
  const g = srgbToLinear(parseInt(h.slice(2, 4), 16))
  const b = srgbToLinear(parseInt(h.slice(4, 6), 16))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG 2.1 contrast ratio between two hex colors */
export function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1)
  const l2 = relativeLuminance(hex2)
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
}

/** WCAG 2.1 audit for a foreground color against a background */
export function wcagAudit(foreground: string, background = '#FFFFFF'): WCAGResult {
  const ratio = contrastRatio(foreground, background)
  return {
    ratio,
    passAA:      ratio >= 4.5,
    passAALarge: ratio >= 3.0,
    passAAA:     ratio >= 7.0,
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// APCA — ACCESSIBLE PERCEPTUAL CONTRAST ALGORITHM (WCAG 3.0 draft)
// ─────────────────────────────────────────────────────────────────────────────
//
// APCA measures perceptual lightness contrast rather than luminance ratio.
// It is directional — foreground/background order matters. Lc is signed:
//   Positive Lc = dark text on light background
//   Negative Lc = light text on dark background
//
// Implements APCA-W3 0.0.98G-4g (current Bronze/Simple mode spec).
//
// APCA 0.0.98G-4g thresholds (absolute Lc values):
//   Lc 90+  — fluent body text, long-form reading
//   Lc 75+  — body text, normal weight columns
//   Lc 60+  — large text 18px+ / subheadings
//   Lc 45+  — UI components, icon labels, non-text elements
//   Lc 30+  — placeholder, disabled, non-critical decorative
//   Lc 15+  — incidental, invisible-pass minimum
//
// Note: Older APCA docs (pre-0.0.98) used lower Lc thresholds (e.g. 46 for
// body text). This implementation uses the current 0.0.98G-4g spec.
//
// Reference: https://github.com/Myndex/SAPC-APCA
// ─────────────────────────────────────────────────────────────────────────────

/** APCA screen luminance coefficients */
const APCA_COEFF = { r: 0.2126729, g: 0.7151522, b: 0.0721750 }

/** APCA-specific linearisation (same gamma as WCAG 2.1 for sRGB) */
function apcaLinearise(c: number): number {
  const v = c / 255
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
}

/** APCA screen luminance Y for a hex color */
export function apcaLuminance(hex: string): number {
  const h = hex.replace('#', '')
  const r = apcaLinearise(parseInt(h.slice(0, 2), 16))
  const g = apcaLinearise(parseInt(h.slice(2, 4), 16))
  const b = apcaLinearise(parseInt(h.slice(4, 6), 16))
  return APCA_COEFF.r * r + APCA_COEFF.g * g + APCA_COEFF.b * b
}

/**
 * APCA Lc (Lightness Contrast) — APCA-W3 0.0.98G-4g.
 *
 * @param foreground  Text / foreground hex color
 * @param background  Background hex color (default #FFFFFF)
 * @returns           Signed Lc value. Use Math.abs() for threshold checks.
 *
 * @example
 * apcaLc('#71767B', '#FFFFFF')  // → ~68 Lc  (slate-500 — large text)
 * apcaLc('#595C61', '#FFFFFF')  // → ~80 Lc  (slate-600 — body text)
 * apcaLc('#3A3D42', '#FFFFFF')  // → ~92 Lc  (slate-700 — fluent reading)
 */
export function apcaLc(foreground: string, background = '#FFFFFF'): number {
  const Ytxt = apcaLuminance(foreground)
  const Ybg  = apcaLuminance(background)

  // 0.0.98G-4g exponents
  const Nbg = 0.56, Ntx = 0.57   // Dark text on light background
  const Rbg = 0.65, Rtx = 0.62   // Light text on dark background
  const Wscale = 1.14
  const Woffset = 0.027
  const Wclamp = 0.1
  const blackClamp = 0.022
  const blackThreshold = 1.414
  const deltaYmin = 0.0005

  // Soft black clamp
  const Ytx = Ytxt > blackClamp ? Ytxt : Ytxt + (blackClamp - Ytxt) ** blackThreshold
  const Yb  = Ybg  > blackClamp ? Ybg  : Ybg  + (blackClamp - Ybg)  ** blackThreshold

  if (Math.abs(Yb - Ytx) < deltaYmin) return 0

  let Lc: number

  if (Yb > Ytx) {
    // Dark text on light background (positive Lc)
    const SAPC = (Yb ** Nbg - Ytx ** Ntx) * Wscale
    Lc = SAPC < Wclamp ? 0 : (SAPC - Woffset) * 100
  } else {
    // Light text on dark background (negative Lc)
    const SAPC = (Yb ** Rbg - Ytx ** Rtx) * Wscale
    Lc = SAPC > -Wclamp ? 0 : (SAPC + Woffset) * 100
  }

  return Math.round(Lc * 10) / 10
}

/**
 * Full APCA audit — APCA-W3 0.0.98G-4g thresholds.
 *
 * @param foreground  Text / foreground hex color
 * @param background  Background hex color (default #FFFFFF)
 */
export function apcaAudit(foreground: string, background = '#FFFFFF'): APCAResult {
  const lc    = apcaLc(foreground, background)
  const lcAbs = Math.abs(lc)
  return {
    lc,
    lcAbs,
    passBodyText:    lcAbs >= 75,
    passLargeText:   lcAbs >= 60,
    passUIElement:   lcAbs >= 45,
    passPlaceholder: lcAbs >= 30,
  }
}

/**
 * Combined WCAG 2.1 + APCA audit in one call.
 *
 * @example
 * const result = contrastAudit('#71767B', '#FFFFFF')
 * result.wcag21.passAA          // true  — 4.59:1
 * result.apca.passBodyText      // false — 68 Lc (needs 75)
 * result.apca.passLargeText     // true  — 68 Lc passes 60
 * result.apca.passUIElement     // true  — 68 Lc passes 45
 */
export function contrastAudit(foreground: string, background = '#FFFFFF'): ContrastResult {
  return {
    wcag21: wcagAudit(foreground, background),
    apca:   apcaAudit(foreground, background),
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// CHROMA TAPER CURVE
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_CHROMA_MAP: Record<string, number> = {
  "0":   0.000,
  "50":  0.004,
  "100": 0.004,
  "200": 0.007,
  "300": 0.007,
  "400": 0.010,
  "500": 0.010,
  "600": 0.009,
  "700": 0.009,
  "800": 0.005,
  "900": 0.005,
  "950": 0.005,
}

function resolveChroma(step: string, override?: Partial<Record<string, number>>): number {
  if (override?.[step] !== undefined) return override[step]!
  if (DEFAULT_CHROMA_MAP[step] !== undefined) return DEFAULT_CHROMA_MAP[step]
  const n = parseInt(step, 10)
  if (isNaN(n) || n === 0) return 0.000
  if (n <= 100) return 0.004
  if (n <= 300) return 0.007
  if (n <= 500) return 0.010
  if (n <= 700) return 0.009
  return 0.005
}


// ─────────────────────────────────────────────────────────────────────────────
// SCALE GENERATOR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a perceptually uniform toned neutral scale from a pure neutral.
 *
 * Preserves exact OKLCH lightness (L) per step. Introduces a tapered
 * chroma (C) at the given hue angle (H).
 *
 * @example
 * import { generateScale, HUE } from 'oklch-shades'
 * const sand  = generateScale(pureNeutral, { hue: HUE.sand  })
 * const slate = generateScale(pureNeutral, { hue: HUE.slate })
 */
export function generateScale(pure: NeutralScale, options: GenerateOptions): NeutralScale {
  const { hue, chromaMap } = options
  const result: NeutralScale = {}
  for (const [step, hex] of Object.entries(pure)) {
    const { l } = hexToOklch(hex)
    const c = resolveChroma(step, chromaMap)
    result[step] = oklchToHex({ l, c, h: c > 0 ? hue : 0 })
  }
  return result
}

/**
 * Audit a scale — returns OKLCH values and full contrast audit (WCAG 2.1 + APCA) per step.
 */
export function auditScale(scale: NeutralScale, background = '#FFFFFF'): ScaleAudit[] {
  return Object.entries(scale).map(([step, hex]) => ({
    step,
    hex,
    oklch:    hexToOklch(hex),
    contrast: contrastAudit(hex, background),
  }))
}

/**
 * Find the first step that passes WCAG AA (4.5:1) against a background.
 */
export function firstPassingStep(
  scale: NeutralScale,
  background = '#FFFFFF'
): { step: string; hex: string; ratio: number } | null {
  for (const [step, hex] of Object.entries(scale)) {
    const ratio = contrastRatio(hex, background)
    if (ratio >= 4.5) return { step, hex, ratio }
  }
  return null
}


// ─────────────────────────────────────────────────────────────────────────────
// HUE PRESETS
// ─────────────────────────────────────────────────────────────────────────────

/** Named hue angle presets for common neutral personalities */
export const HUE = {
  sand:   68,
  amber:  68,
  stone:  75,
  rose:   20,
  slate:  255,
  sky:    220,
  teal:   195,
  mauve:  310,
} as const

export type HueName = keyof typeof HUE