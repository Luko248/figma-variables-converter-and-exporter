/**
 * Variable type detection service
 */

import {
  MEASURES_KEYWORDS,
  FONTS_KEYWORDS,
} from "../constants/token-patterns";
import { VariableCategory } from "../types/index";

/**
 * Checks if variable is a measures type
 */
const isMeasuresVariable = (name: string): boolean =>
  MEASURES_KEYWORDS.some((term) => name.includes(term));

/**
 * Checks if variable is a fonts type
 */
const isFontsVariable = (name: string): boolean =>
  FONTS_KEYWORDS.some((term) => name.includes(term));

/**
 * Detects the type of a variable based on its name patterns
 */
export const detectVariableType = (name: string): VariableCategory => {
  const lowerName = name.toLowerCase();

  if (lowerName.includes("color")) {
    return "color";
  }

  if (
    lowerName.includes("fontfamily") ||
    lowerName.includes("fontweight") ||
    lowerName.includes("fontsize") ||
    isFontsVariable(lowerName)
  ) {
    return "fonts";
  }

  return "measures";
};
