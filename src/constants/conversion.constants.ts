/**
 * Constants used in value conversion
 */

/** Fallback color value when conversion fails */
export const FALLBACK_HSL_COLOR = "hsl(0 0% 0%)";

/** Base font size for rem conversion (in pixels) */
export const BASE_FONT_SIZE = 16;

/** Batch size for processing variables to prevent UI blocking */
export const VARIABLE_BATCH_SIZE = 10;

/** Batch size for syntax updates */
export const SYNTAX_BATCH_SIZE = 5;

/** Maximum cache size to prevent memory leaks */
export const MAX_CACHE_SIZE = 500;

/** Maximum object pool size */
export const MAX_POOL_SIZE = 100;

/** Standard font weight range */
export const MIN_FONT_WEIGHT = 100;
export const MAX_FONT_WEIGHT = 900;
