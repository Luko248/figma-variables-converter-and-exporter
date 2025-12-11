/**
 * String manipulation helper functions
 */

/**
 * Cleans and formats variable name with proper PascalCase convention
 * Examples:
 * - "btn/large/paddingBlock" → "BtnLargePaddingBlock"
 * - "spacing-btn-large" → "SpacingBtnLarge"
 * - "Button/Primary/Background" → "ButtonPrimaryBackground"
 * - "spacing/8" → "Spacing8"
 * - "spacing/16" → "Spacing16"
 * - "spacing8" → "Spacing8"
 */
export const cleanVariableName = (name: string): string => {
  // Split by common separators: /, -, _, space
  const parts = name.split(/[/\-_\s]+/).filter((part) => part.length > 0);

  // Capitalize first letter of each part while preserving numbers
  const camelCased = parts
    .map((part) => {
      // If part is purely numeric, keep it as-is (e.g., "8", "16", "24")
      if (/^\d+$/.test(part)) {
        return part;
      }

      // For mixed alphanumeric, capitalize first letter
      // This preserves numbers at the end (e.g., "spacing8" → "Spacing8")
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .filter((part) => part.length > 0)
    .join("");

  return camelCased;
};

/**
 * Converts theme name to kebab-case
 * Example: "Koop Dark" → "koop-dark"
 */
export const toKebabCase = (str: string): string => {
  return str.toLowerCase().replace(/\s+/g, '-');
};

/**
 * Sanitizes string value for CSS
 */
export const sanitizeString = (value: string): string => {
  if (typeof value !== "string") {
    return String(value || "");
  }
  return value.trim();
};

/**
 * Checks if string contains potentially unsafe CSS characters
 */
export const hasPotentiallyUnsafeChars = (value: string): boolean => {
  return value.includes(";") || value.includes("{") || value.includes("}");
};

/**
 * Custom base64 encoding implementation for GitHub API compatibility
 */
export function base64Encode(str: string): string {
  // Safety check for undefined/null input
  if (str === undefined || str === null) {
    console.error("❌ base64Encode received undefined/null input");
    throw new Error("Cannot encode undefined or null value");
  }

  // Convert to string if needed
  const inputStr = typeof str === "string" ? str : String(str);

  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let result = "";
  let i = 0;

  while (i < inputStr.length) {
    const a = inputStr.charCodeAt(i++);
    const b = i < inputStr.length ? inputStr.charCodeAt(i++) : 0;
    const c = i < inputStr.length ? inputStr.charCodeAt(i++) : 0;

    const bitmap = (a << 16) | (b << 8) | c;

    result += chars.charAt((bitmap >> 18) & 63);
    result += chars.charAt((bitmap >> 12) & 63);
    result += chars.charAt((bitmap >> 6) & 63);
    result += chars.charAt(bitmap & 63);
  }

  const padding = inputStr.length % 3;
  if (padding === 1) {
    result = result.slice(0, -2) + "==";
  } else if (padding === 2) {
    result = result.slice(0, -1) + "=";
  }

  return result;
}
