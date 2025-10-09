import Colorizr from "colorizr";

/**
 * Utility functions for the Figma plugin
 */

/**
 * Custom base64 encoding implementation for GitHub API compatibility
 *
 * @param str - String to encode
 * @returns Base64 encoded string
 */
export function base64Encode(str: string): string {
  // Safety check for undefined/null input
  if (str === undefined || str === null) {
    console.error("❌ base64Encode received undefined/null input");
    throw new Error("Cannot encode undefined or null value");
  }

  // Convert to string if needed
  const inputStr = typeof str === 'string' ? str : String(str);

  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let result = "";
  let i = 0;

  while (i < inputStr.length) {
    const a = inputStr.charCodeAt(i++);
    const b = i < inputStr.length ? inputStr.charCodeAt(i++) : 0;
    const c = i < inputStr.length ? inputStr.charCodeAt(i++) : 0;

    const bitmap = (a << 16) | (b << 8) | c;

    result += chars.charAt((bitmap >> 18) & 63);
    result += chars.charAt((bitmap >> 12) & 63);
    result += chars.charAt((bitmap >> 6) & 63);
    result += chars.charAt(bitmap & 63);
  }

  const padding = inputStr.length % 3;
  if (padding === 1) {
    result = result.slice(0, -2) + "==";
  } else if (padding === 2) {
    result = result.slice(0, -1) + "=";
  }

  return result;
}

// Cache for color conversions to improve performance
const colorCache = new Map<string, string>();

const MAX_CACHE_SIZE = 1000;

const clampUnitRange = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
};

const isValidUnitRange = (value: number): boolean =>
  Number.isFinite(value) && value >= 0 && value <= 1;

const toRgbChannel = (value: number): number => Math.round(clampUnitRange(value) * 255);

const roundOklchValues = (L: number, C: number, H: number) => {
  return {
    lightness: Math.round(L * 1000) / 1000,
    chroma: Math.round(C * 1000) / 1000,
    hue: Math.round(H * 10) / 10,
  };
};

const buildOklchString = (
  lightness: number,
  chroma: number,
  hue: number,
  alpha?: number
): string => {
  const parts = [String(lightness), String(chroma), String(hue)];
  if (typeof alpha === "number" && alpha >= 0 && alpha <= 1 && alpha !== 1) {
    const roundedAlpha = Math.round(alpha * 100) / 100;
    parts.push(`/ ${roundedAlpha}`);
  }
  return `oklch(${parts.join(" ")})`;
};

const cacheResult = (key: string, value: string): void => {
  if (!colorCache.has(key) && colorCache.size < MAX_CACHE_SIZE) {
    colorCache.set(key, value);
  }
};

export const rgbToOklch = (r: number, g: number, b: number): string => {
  if (!isValidUnitRange(r) || !isValidUnitRange(g) || !isValidUnitRange(b)) {
    console.warn(`Invalid RGB values: (${r}, ${g}, ${b}). Using fallback.`);
    return "oklch(0 0 0)";
  }

  const cacheKey = `rgb:${r},${g},${b}`;
  if (colorCache.has(cacheKey)) {
    return colorCache.get(cacheKey)!;
  }

  try {
    const color = new Colorizr({
      r: toRgbChannel(r),
      g: toRgbChannel(g),
      b: toRgbChannel(b),
    });

    const { l, c, h } = color.oklch;
    const { lightness, chroma, hue } = roundOklchValues(l, c, h);
    const result = buildOklchString(lightness, chroma, hue);
    cacheResult(cacheKey, result);
    return result;
  } catch (error) {
    console.error("Error converting RGB to OKLCH via Colorizr:", error);
    return "oklch(0 0 0)";
  }
};

export const rgbaToOklch = (
  r: number,
  g: number,
  b: number,
  a: number
): string => {
  if (
    !isValidUnitRange(r) ||
    !isValidUnitRange(g) ||
    !isValidUnitRange(b) ||
    !isValidUnitRange(a)
  ) {
    console.warn(
      `Invalid RGBA values: (${r}, ${g}, ${b}, ${a}). Using fallback.`
    );
    return "oklch(0 0 0 / 0)";
  }

  if (a === 1) {
    return rgbToOklch(r, g, b);
  }

  const cacheKey = `rgba:${r},${g},${b},${a}`;
  if (colorCache.has(cacheKey)) {
    return colorCache.get(cacheKey)!;
  }

  try {
    const color = new Colorizr({
      r: toRgbChannel(r),
      g: toRgbChannel(g),
      b: toRgbChannel(b),
      alpha: clampUnitRange(a),
    });

    const { l, c, h, alpha } = color.oklch;
    const { lightness, chroma, hue } = roundOklchValues(l, c, h);
    const result = buildOklchString(lightness, chroma, hue, alpha);
    cacheResult(cacheKey, result);
    return result;
  } catch (error) {
    console.error("Error converting RGBA to OKLCH via Colorizr:", error);
    return "oklch(0 0 0 / 0)";
  }
};

/**
 * Clears the color conversion cache (useful for memory management)
 */
export const clearColorCache = (): void => {
  colorCache.clear();
};

/**
 * Converts pixel values to rem units (assuming 16px base)
 *
 * @param px - Pixel value
 * @returns Rem value string (e.g., 1rem)
 */
export const pxToRem = (px: number): string => {
  const rem = px / 16;
  return `${rem}rem`;
};

/**
 * Formats decimal alpha values properly (.1, .2, etc.)
 *
 * @param alpha - Alpha value (0-1)
 * @returns Formatted decimal string
 */
export const formatAlpha = (alpha: number): string => {
  if (alpha === 1) return "1";
  if (alpha === 0) return "0";
  return `.${Math.round(alpha * 10)}`;
};
