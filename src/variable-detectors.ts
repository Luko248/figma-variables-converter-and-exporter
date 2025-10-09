/**
 * Variable type detection and CSS naming utilities
 */

/**
 * Detects the type of a variable based on its name patterns
 *
 * @param name - The variable name to analyze
 * @returns The detected variable type category
 */
export const detectVariableType = (name: string): string => {
  const lowerName = name.toLowerCase();

  const typeDetectors = [
    { type: "measures", check: isMeasuresVariable },
    { type: "fonts", check: isFontsVariable },
    { type: "shadows", check: isShadowsVariable },
    { type: "gradient", check: isGradientVariable },
  ];

  const detectedType = typeDetectors.find((detector) =>
    detector.check(lowerName)
  );
  return detectedType?.type || "color";
};

// Lambda functions for Supernova category detection
const isMeasuresVariable = (name: string): boolean =>
  [
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
  ].some((term) => name.includes(term)) ||
  /\b(xs|sm|md|lg|xl|xxl|\d+)\b/.test(name);

const isFontsVariable = (name: string): boolean =>
  [
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
  ].some((term) => name.includes(term));

const isShadowsVariable = (name: string): boolean =>
  ["shadow", "elevation", "depth", "boxShadow", "innerShadow"].some((term) =>
    name.includes(term)
  );

const isGradientVariable = (name: string): boolean =>
  ["gradient", "linear", "radial"].some((term) => name.includes(term));

/**
 * Generates a CSS custom property name from a Figma variable
 * Format: --{type}_{clean-name} (e.g., --color_btn-bg, --space_btn-pad-inline)
 *
 * @param _collectionName - Collection name (unused in current implementation)
 * @param variableName - The Figma variable name
 * @returns Formatted CSS custom property name
 */
export const generateCSSVariableName = (
  _collectionName: string,
  variableName: string
): string => {
  const variableType = detectVariableType(variableName);
  const cleanVariable = cleanVariableName(variableName);

  return `--${variableType}${cleanVariable}`;
};

/**
 * Cleans and formats variable name with proper camelCase convention
 * Examples:
 * - "btn/large/paddingBlock" → "BtnLargePaddingBlock"
 * - "spacing-btn-large" → "SpacingBtnLarge"
 * - "Button/Primary/Background" → "ButtonPrimaryBackground"
 *
 * @param name - Raw variable name
 * @returns Cleaned variable name in PascalCase
 */
const cleanVariableName = (name: string): string => {
  // Split by common separators: /, -, _, space
  const parts = name.split(/[/\-_\s]+/).filter((part) => part.length > 0);

  // Capitalize first letter of each part while preserving existing camelCase
  const camelCased = parts
    .map((part) => {
      // Remove leading numbers from each part
      const cleaned = part.replace(/^\d+/, "");
      if (cleaned.length === 0) return "";

      // Capitalize first letter, keep rest as-is (preserving existing camelCase)
      return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    })
    .filter((part) => part.length > 0)
    .join("");

  return camelCased;
};
