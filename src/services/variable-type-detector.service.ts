/**
 * Variable type detection service
 */

import {
  MEASURES_KEYWORDS,
  FONTS_KEYWORDS,
  SHADOWS_KEYWORDS,
  GRADIENT_KEYWORDS,
  SIZE_PATTERN,
} from "../constants/token-patterns";
import { VariableCategory } from "../types/index";

/**
 * Checks if variable is a measures type
 */
const isMeasuresVariable = (name: string): boolean =>
  MEASURES_KEYWORDS.some((term) => name.includes(term)) ||
  SIZE_PATTERN.test(name);

/**
 * Checks if variable is a fonts type
 */
const isFontsVariable = (name: string): boolean =>
  FONTS_KEYWORDS.some((term) => name.includes(term));

/**
 * Checks if variable is a shadows type
 */
const isShadowsVariable = (name: string): boolean =>
  SHADOWS_KEYWORDS.some((term) => name.includes(term));

/**
 * Checks if variable is a gradient type
 */
const isGradientVariable = (name: string): boolean =>
  GRADIENT_KEYWORDS.some((term) => name.includes(term));

/**
 * Detects the type of a variable based on its name patterns
 */
export const detectVariableType = (name: string): VariableCategory => {
  const lowerName = name.toLowerCase();

  const typeDetectors: Array<{
    type: VariableCategory;
    check: (name: string) => boolean;
  }> = [
    { type: "measures", check: isMeasuresVariable },
    { type: "fonts", check: isFontsVariable },
    { type: "shadow", check: isShadowsVariable },
    { type: "gradient", check: isGradientVariable },
  ];

  const detectedType = typeDetectors.find((detector) =>
    detector.check(lowerName)
  );
  
  return detectedType?.type || "color";
};
