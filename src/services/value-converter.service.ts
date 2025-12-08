/**
 * Value conversion service for converting Figma values to CSS
 */

import "../types/figma.types";
import {
  convertColorToOklch
} from "../helpers/color.helper";
import { pxToRem, isValidNumber, clamp } from "../helpers/numeric.helper";
import { sanitizeString, hasPotentiallyUnsafeChars } from "../helpers/string.helper";
import {
  FALLBACK_OKLCH_COLOR,
  MIN_FONT_WEIGHT,
  MAX_FONT_WEIGHT,
} from "../constants/conversion.constants";
import {
  OPACITY_KEYWORDS,
  WEIGHT_KEYWORDS,
  DURATION_KEYWORDS,
  ZINDEX_KEYWORDS,
} from "../constants/token-patterns";

/**
 * Safe color conversion with fallback
 */
export const safeColorConversion = (
  colorValue: RGB | RGBA,
  variableName: string
): string => {
  try {
    if (!colorValue || typeof colorValue !== "object") {
      console.warn(
        `⚠️ Invalid color value for ${variableName}, using fallback`
      );
      return FALLBACK_OKLCH_COLOR;
    }

    return convertColorToOklch(colorValue);
  } catch (error) {
    console.error(`❌ Error converting color for ${variableName}:`, error);
    return FALLBACK_OKLCH_COLOR;
  }
};

/**
 * Safe float conversion with validation
 */
export const safeFloatConversion = (
  floatValue: number,
  variableName: string,
  _variable: Variable
): string => {
  try {
    if (!isValidNumber(floatValue)) {
      console.warn(
        `⚠️ Invalid float value for ${variableName}: ${floatValue}, using 0`
      );
      return "0";
    }

    const variableNameLower = variableName.toLowerCase();

    // Opacity/alpha values
    if (OPACITY_KEYWORDS.some((keyword) => variableNameLower.includes(keyword))) {
      const clampedValue = clamp(floatValue, 0, 1);
      if (clampedValue !== floatValue) {
        console.warn(
          `⚠️ Opacity value clamped for ${variableName}: ${floatValue} → ${clampedValue}`
        );
      }
      return `${Math.round(clampedValue * 100)}%`;
    }

    // Font weight values
    if (WEIGHT_KEYWORDS.some((keyword) => variableNameLower.includes(keyword))) {
      const roundedValue = Math.round(floatValue);
      if (roundedValue < MIN_FONT_WEIGHT || roundedValue > MAX_FONT_WEIGHT) {
        console.warn(
          `⚠️ Font weight out of standard range for ${variableName}: ${roundedValue}`
        );
      }
      return roundedValue.toString();
    }

    // Duration/timing values
    if (DURATION_KEYWORDS.some((keyword) => variableNameLower.includes(keyword))) {
      if (floatValue < 0) {
        console.warn(
          `⚠️ Negative duration value for ${variableName}: ${floatValue}, using 0`
        );
        return "0ms";
      }
      return `${floatValue}ms`;
    }

    // Z-index values
    if (ZINDEX_KEYWORDS.some((keyword) => variableNameLower.includes(keyword))) {
      const roundedValue = Math.round(floatValue);
      return roundedValue.toString();
    }

    // Default: convert pixels to rem
    if (floatValue < 0) {
      console.warn(
        `⚠️ Negative pixel value for ${variableName}: ${floatValue}, using absolute value`
      );
      return pxToRem(Math.abs(floatValue));
    }

    return pxToRem(floatValue);
  } catch (error) {
    console.error(`❌ Error converting float for ${variableName}:`, error);
    return "0";
  }
};

/**
 * Safe string conversion with sanitization
 * Does NOT add quotes so complex CSS values remain intact
 */
export const safeStringConversion = (
  stringValue: string,
  variableName: string
): string => {
  try {
    if (typeof stringValue !== "string") {
      console.warn(
        `⚠️ Invalid string value for ${variableName}: ${stringValue}, converting to string`
      );
      return String(stringValue || "");
    }

    const sanitized = sanitizeString(stringValue);

    if (sanitized.length === 0) {
      console.warn(`⚠️ Empty string value for ${variableName}`);
      return "";
    }

    if (hasPotentiallyUnsafeChars(sanitized)) {
      console.warn(
        `⚠️ Potentially unsafe CSS characters in ${variableName}: ${sanitized}`
      );
    }

    // Return raw value without quotes so consumers can decide quoting
    return sanitized;
  } catch (error) {
    console.error(`❌ Error converting string for ${variableName}:`, error);
    return "";
  }
};

/**
 * Resolves a variable alias to its raw value
 */
export async function resolveAliasToRawValue(
  aliasedVariable: Variable,
  modeId: string,
  collectionName: string
): Promise<string | null> {
  try {
    const valuesByMode = aliasedVariable.valuesByMode;
    if (!valuesByMode || !valuesByMode[modeId]) {
      console.warn(`⚠️ No value found for mode ${modeId} in alias ${aliasedVariable.name}`);
      return null;
    }

    const rawValue = valuesByMode[modeId];

    // If the aliased variable is itself an alias, recursively resolve it
    if (typeof rawValue === 'object' && rawValue !== null && 'type' in rawValue && (rawValue as VariableAlias).type === 'VARIABLE_ALIAS') {
      const nestedAliasId = (rawValue as VariableAlias).id;
      const nestedVariable = await figma.variables.getVariableByIdAsync(nestedAliasId);
      if (nestedVariable) {
        return await resolveAliasToRawValue(nestedVariable, modeId, collectionName);
      }
      return null;
    }

    // Generate the actual CSS value based on type
    switch (aliasedVariable.resolvedType) {
      case 'COLOR': {
        const colorValue = rawValue as RGB | RGBA;
        return safeColorConversion(colorValue, aliasedVariable.name);
      }
      case 'FLOAT': {
        const floatValue = rawValue as number;
        return safeFloatConversion(floatValue, aliasedVariable.name, aliasedVariable);
      }
      case 'STRING': {
        const stringValue = rawValue as string;
        return safeStringConversion(stringValue, aliasedVariable.name);
      }
      default:
        return String(rawValue);
    }
  } catch (error) {
    console.error(`❌ Error resolving alias value:`, error);
    return null;
  }
}
