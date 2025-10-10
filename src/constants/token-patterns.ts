/**
 * Token detection patterns and keyword lists
 */

/** Keywords that indicate a measures/spacing variable */
export const MEASURES_KEYWORDS = [
  "spacing",
  "space",
  "gap",
  "margin",
  "padding",
  "pad",
  "size",
  "width",
  "height",
  "dimension",
  "radius",
  "rounded",
  "corner",
  "opacity",
  "alpha",
  "transparency",
  "duration",
  "timing",
  "animation",
  "transition",
  "border",
  "fontSize",
  "lineHeight",
] as const;

/** Keywords that indicate a fonts variable */
export const FONTS_KEYWORDS = [
  "font",
  "weight",
  "family",
  "typeface",
  "bold",
  "light",
  "medium",
  "regular",
  "textCase",
  "textDecoration",
  "underline",
] as const;

/** Keywords that indicate a shadows variable */
export const SHADOWS_KEYWORDS = [
  "shadow",
  "elevation",
  "depth",
  "boxShadow",
  "innerShadow",
] as const;

/** Keywords that indicate a gradient variable */
export const GRADIENT_KEYWORDS = [
  "gradient",
  "linear",
  "radial",
] as const;

/** Regex pattern for size-related variable names */
export const SIZE_PATTERN = /\b(xs|sm|md|lg|xl|xxl|\d+)\b/;

/** Keywords that indicate opacity values */
export const OPACITY_KEYWORDS = ["opacity", "alpha"] as const;

/** Keywords that indicate font weight values */
export const WEIGHT_KEYWORDS = ["weight", "fontweight"] as const;

/** Keywords that indicate duration/timing values */
export const DURATION_KEYWORDS = ["duration", "timing"] as const;

/** Keywords that indicate z-index values */
export const ZINDEX_KEYWORDS = ["zindex", "z-index"] as const;
