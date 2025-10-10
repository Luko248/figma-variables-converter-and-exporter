/**
 * Variable naming service
 */

import { cleanVariableName } from "../helpers/string.helper";
import { detectVariableType } from "./variable-type-detector.service";

/**
 * Generates a CSS custom property name from a Figma variable
 * Format: --{type}{CleanName} (e.g., --colorBtnBg, --measuresSpaceBtnPadInline)
 */
export const generateCSSVariableName = (
  _collectionName: string,
  variableName: string
): string => {
  const variableType = detectVariableType(variableName);
  const cleanVariable = cleanVariableName(variableName);

  return `--${variableType}${cleanVariable}`;
};
