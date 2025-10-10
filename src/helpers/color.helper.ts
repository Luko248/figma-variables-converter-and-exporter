/**
 * Color conversion helper functions
 */

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
    ? `hsl(${h} ${s}% ${l}%)`
    : `hsl(${h} ${s}% ${l}% / ${alpha})`;
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
 * Formats decimal alpha values properly (.1, .2, etc.)
 */
export const formatAlpha = (alpha: number): string => {
  if (alpha === 1) return "1";
  if (alpha === 0) return "0";
  return `.${Math.round(alpha * 10)}`;
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
