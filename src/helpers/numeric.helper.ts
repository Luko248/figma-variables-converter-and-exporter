/**
 * Numeric conversion helper functions
 */

import { BASE_FONT_SIZE } from "../constants/conversion.constants";

/**
 * Converts pixel values to rem units
 */
export const pxToRem = (px: number): string => {
  const rem = px / BASE_FONT_SIZE;
  return `${rem}rem`;
};

/**
 * Checks if value is a valid finite number
 */
export const isValidNumber = (value: number): boolean => {
  return typeof value === "number" && isFinite(value);
};

/**
 * Rounds to specified decimal places
 */
export const roundToDecimals = (value: number, decimals: number): number => {
  const multiplier = Math.pow(10, decimals);
  return Math.round(value * multiplier) / multiplier;
};

/**
 * Clamps value between min and max
 */
export const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};
