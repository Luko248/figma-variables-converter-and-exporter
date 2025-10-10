/**
 * Variable naming service
 */

import { cleanVariableName } from "../helpers/string.helper";
import { detectVariableType } from "./variable-type-detector.service";

/**
 * Generates a CSS custom property name from a Figma variable
 * Format: --{type}{CleanName} (e.g., --colorBtnBg, --measuresSpaceBtnPadInline)
 * Removes duplicate type prefix if present in variable name
 */
export const generateCSSVariableName = (
  _collectionName: string,
  variableName: string
): string => {
  const variableType = detectVariableType(variableName);
  let cleanVariable = cleanVariableName(variableName);
  
  // Remove duplicate type prefix if it exists at the start of cleanVariable
  // e.g., "Color/Test Token" becomes "ColorTestToken", but we want just "TestToken"
  const typeCapitalized = variableType.charAt(0).toUpperCase() + variableType.slice(1);
  if (cleanVariable.startsWith(typeCapitalized)) {
    cleanVariable = cleanVariable.slice(typeCapitalized.length);
  }

  return `--${variableType}${cleanVariable}`;
};
