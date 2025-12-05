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
] as const;

/** Keywords that indicate a fonts variable */
export const FONTS_KEYWORDS = [
  "font",
  "fontfamily",
  "fontweight",
  "fontsize",
  "textCase",
  "textDecoration",
  "underline",
] as const;

/** Keywords that indicate opacity values */
export const OPACITY_KEYWORDS = ["opacity", "alpha"] as const;

/** Keywords that indicate font weight values */
export const WEIGHT_KEYWORDS = ["weight", "fontweight"] as const;

/** Keywords that indicate duration/timing values */
export const DURATION_KEYWORDS = ["duration", "timing"] as const;

/** Keywords that indicate z-index values */
export const ZINDEX_KEYWORDS = ["zindex", "z-index"] as const;
