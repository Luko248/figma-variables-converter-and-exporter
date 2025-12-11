/**
 * Color conversion helper functions
 */
import Colorizr from "colorizr";
import "../types/figma.types";

/** Clamps value to 0-1 range */
const clampUnitRange = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
};

/** Calculates hue component for HSL conversion */
const calculateHue = (
  normalizedR: number,
  normalizedG: number,
  normalizedB: number,
  delta: number,
  max: number
): number => {
  if (delta === 0) {
    return 0;
  }

  switch (max) {
    case normalizedR:
      return ((normalizedG - normalizedB) / delta) % 6;
    case normalizedG:
      return (normalizedB - normalizedR) / delta + 2;
    default:
      return (normalizedR - normalizedG) / delta + 4;
  }
};

/** Converts value to percentage */
const toPercent = (value: number): number => Math.round(value * 100);

/** Builds HSL string */
const buildHslString = (
  hue: number,
  saturation: number,
  lightness: number,
  alpha?: string
): string => {
  const h = Math.round(hue);
  const s = toPercent(saturation);
  const l = toPercent(lightness);
  return alpha === undefined
    ? `hsl(${h}, ${s}%, ${l}%)`
    : `hsla(${h}, ${s}%, ${l}%, ${alpha})`;
};

/** Normalizes RGB values */
const normalizeRgb = (r: number, g: number, b: number) => {
  const normalizedR = clampUnitRange(r);
  const normalizedG = clampUnitRange(g);
  const normalizedB = clampUnitRange(b);
  return { normalizedR, normalizedG, normalizedB };
};

/**
 * Converts RGB color to HSL format
 */
export const rgbToHsl = (r: number, g: number, b: number): string => {
  const { normalizedR, normalizedG, normalizedB } = normalizeRgb(r, g, b);
  const max = Math.max(normalizedR, normalizedG, normalizedB);
  const min = Math.min(normalizedR, normalizedG, normalizedB);
  const delta = max - min;

  let hue = calculateHue(normalizedR, normalizedG, normalizedB, delta, max) * 60;
  if (hue < 0) {
    hue += 360;
  }

  const lightness = (max + min) / 2;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));

  return buildHslString(hue, saturation, lightness);
};

/**
 * Converts RGBA color to HSL format with alpha channel
 */
export const rgbaToHsl = (r: number, g: number, b: number, a: number): string => {
  const clampedAlpha = clampUnitRange(a);
  if (clampedAlpha === 1) {
    return rgbToHsl(r, g, b);
  }

  const { normalizedR, normalizedG, normalizedB } = normalizeRgb(r, g, b);
  const max = Math.max(normalizedR, normalizedG, normalizedB);
  const min = Math.min(normalizedR, normalizedG, normalizedB);
  const delta = max - min;

  let hue = calculateHue(normalizedR, normalizedG, normalizedB, delta, max) * 60;
  if (hue < 0) {
    hue += 360;
  }

  const lightness = (max + min) / 2;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
  const alpha = formatAlpha(clampedAlpha);

  return buildHslString(hue, saturation, lightness, alpha);
};

/**
 * Formats decimal alpha values with proper precision (0.1, 0.2, etc.)
 */
export const formatAlpha = (alpha: number): string => {
  if (alpha === 1) return "1";
  if (alpha === 0) return "0";
  // Round to 1 decimal place and format with leading zero
  return (Math.round(alpha * 10) / 10).toString();
};

/**
 * Clamps color component to valid range
 */
export const clampColorComponent = (value: number): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
};

/**
 * Converts RGB/RGBA color to HSL
 */
export const convertColorToHsl = (colorValue: RGB | RGBA): string => {
  const clampedR = clampColorComponent(colorValue.r);
  const clampedG = clampColorComponent(colorValue.g);
  const clampedB = clampColorComponent(colorValue.b);

  if ("a" in colorValue && typeof colorValue.a === "number") {
    return rgbaToHsl(
      clampedR,
      clampedG,
      clampedB,
      clampColorComponent(colorValue.a)
    );
  }

  return rgbToHsl(clampedR, clampedG, clampedB);
};

/**
 * Formats a number for OKLCH values
 * Removes unnecessary trailing zeros but keeps decimal precision
 * Examples: 1.000 → 1, 0.750 → 0.75, 0.500 → 0.5
 */
const formatOklchNumber = (value: number): string => {
  // Convert to string with sufficient precision
  let formatted = value.toFixed(3);

  // Remove trailing zeros after decimal point
  if (formatted.includes('.')) {
    formatted = formatted.replace(/\.?0+$/, '');
  }

  return formatted;
};

/**
 * Converts RGB/RGBA color to OKLCH format.
 * Output format: oklch(l c h / a) with spaces, no commas.
 * Numbers are formatted to remove unnecessary trailing zeros.
 */
export const convertColorToOklch = (colorValue: RGB | RGBA): string => {
    const r = Math.round(clampColorComponent(colorValue.r) * 255);
    const g = Math.round(clampColorComponent(colorValue.g) * 255);
    const b = Math.round(clampColorComponent(colorValue.b) * 255);
    const alpha = "a" in colorValue ? clampColorComponent(colorValue.a) : 1;

    const color = new Colorizr({ r, g, b, alpha });

    // Get OKLCH values from Colorizr
    const oklchValues = color.oklch();
    const l = formatOklchNumber(oklchValues.l);
    const c = formatOklchNumber(oklchValues.c);
    const h = formatOklchNumber(oklchValues.h);

    // Format OKLCH string with properly formatted numbers
    if (alpha < 1) {
      const a = formatOklchNumber(alpha);
      return `oklch(${l} ${c} ${h} / ${a})`;
    }

    return `oklch(${l} ${c} ${h})`;
};
