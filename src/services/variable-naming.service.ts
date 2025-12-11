/**
 * Variable naming service
 */

import { cleanVariableName } from "../helpers/string.helper";

/**
 * Generates a CSS custom property name from a Figma variable
 * Format: --{cleanName} in camelCase (e.g., --btnBg, --spacingMd, --bodyFamily)
 * Converts Figma variable names to camelCase without type prefixes
 */
export const generateCSSVariableName = (
  _collectionName: string,
  variableName: string
): string => {
  let cleanVariable = cleanVariableName(variableName);

  // Convert first character to lowercase for camelCase
  if (cleanVariable.length > 0) {
    cleanVariable = cleanVariable.charAt(0).toLowerCase() + cleanVariable.slice(1);
  }

  return `--${cleanVariable}`;
};
