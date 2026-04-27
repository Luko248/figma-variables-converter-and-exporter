/**
 * CSS value generation service
 */

import "../types/figma.types";
import {
  safeColorConversion,
  safeFloatConversion,
  safeStringConversion,
  resolveAliasToRawValue,
} from "./value-converter.service";
import { FALLBACK_OKLCH_COLOR } from "../constants/conversion.constants";

/**
 * Converts color variables to OKLCH format
 */
const convertColorValue = async (
  variable: Variable,
  modeId?: string,
  collectionName: string = "",
  modeName?: string
): Promise<string> => {
  const valuesByMode = variable.valuesByMode || {};
  if (Object.keys(valuesByMode).length === 0) {
    console.warn(`⚠️ No color modes found for ${variable.name}`);
    return FALLBACK_OKLCH_COLOR;
  }

  const targetModeId = modeId || Object.keys(valuesByMode)[0];
  const rawValue = valuesByMode[targetModeId];

  // Check if it's an alias
  if (
    typeof rawValue === "object" &&
    rawValue !== null &&
    "type" in rawValue &&
    (rawValue as { type: string }).type === "VARIABLE_ALIAS"
  ) {
    const aliasId = (rawValue as VariableAlias).id;
    const aliasedVariable = await figma.variables.getVariableByIdAsync(aliasId);
    if (aliasedVariable) {
      const resolvedValue = await resolveAliasToRawValue(
        aliasedVariable,
        targetModeId,
        collectionName,
        modeName
      );
      if (resolvedValue) {
        console.log(`🔗 Resolved alias for ${variable.name} → ${resolvedValue}`);
        return resolvedValue;
      }
    }
    console.error(
      `❌ FAILED to resolve alias for ${variable.name} (alias ID: ${aliasId})`
    );
    return FALLBACK_OKLCH_COLOR;
  }

  const colorValue = rawValue as RGB | RGBA;

  if (!colorValue || typeof colorValue !== "object") {
    console.warn(
      `⚠️ No color value found for mode ${targetModeId} in ${variable.name}`
    );
    return FALLBACK_OKLCH_COLOR;
  }

  return safeColorConversion(colorValue, variable.name);
};

/**
 * Converts float variables based on their type
 */
const convertFloatValue = async (
  variable: Variable,
  modeId?: string,
  collectionName: string = "",
  modeName?: string
): Promise<string> => {
  const valuesByMode = variable.valuesByMode || {};
  if (Object.keys(valuesByMode).length === 0) {
    console.warn(`⚠️ No float modes found for ${variable.name}`);
    return "0";
  }

  const targetModeId = modeId || Object.keys(valuesByMode)[0];
  const rawValue = valuesByMode[targetModeId];

  // Check if it's an alias
  if (typeof rawValue === "object" && rawValue !== null && "type" in rawValue) {
    const aliasId = (rawValue as VariableAlias).id;
    const aliasedVariable = await figma.variables.getVariableByIdAsync(aliasId);
    if (aliasedVariable) {
      const resolvedValue = await resolveAliasToRawValue(
        aliasedVariable,
        targetModeId,
        collectionName,
        modeName
      );
      if (resolvedValue) {
        console.log(`🔗 Resolved alias for ${variable.name} → ${resolvedValue}`);
        return resolvedValue;
      }
    }
    console.error(
      `❌ FAILED to resolve alias for ${variable.name} (alias ID: ${aliasId})`
    );
    return "0";
  }

  const floatValue = rawValue as number;

  if (floatValue === undefined || typeof floatValue !== "number") {
    console.warn(
      `⚠️ Invalid float value for ${variable.name} in mode ${targetModeId}: ${typeof floatValue}`
    );
    return "0";
  }

  return safeFloatConversion(floatValue, variable.name, variable);
};

/**
 * Converts string variables with proper formatting
 */
const convertStringValue = async (
  variable: Variable,
  modeId?: string,
  collectionName: string = "",
  modeName?: string
): Promise<string> => {
  const valuesByMode = variable.valuesByMode || {};
  if (Object.keys(valuesByMode).length === 0) {
    console.warn(`⚠️ No string modes found for ${variable.name}`);
    return '""';
  }

  const targetModeId = modeId || Object.keys(valuesByMode)[0];
  const rawValue = valuesByMode[targetModeId];

  // Check if it's an alias
  if (typeof rawValue === "object" && rawValue !== null && "type" in rawValue) {
    const aliasId = (rawValue as VariableAlias).id;
    const aliasedVariable = await figma.variables.getVariableByIdAsync(aliasId);
    if (aliasedVariable) {
      const resolvedValue = await resolveAliasToRawValue(
        aliasedVariable,
        targetModeId,
        collectionName,
        modeName
      );
      if (resolvedValue) {
        console.log(`🔗 Resolved alias for ${variable.name} → ${resolvedValue}`);
        return resolvedValue;
      }
    }
    console.error(
      `❌ FAILED to resolve alias for ${variable.name} (alias ID: ${aliasId})`
    );
    return '""';
  }

  const stringValue = rawValue as string;

  if (!stringValue) {
    console.warn(
      `⚠️ No string value found for mode ${targetModeId} in ${variable.name}`
    );
    return "";
  }

  // Return raw string value without quotes (for shadows/gradients)
  return safeStringConversion(stringValue, variable.name);
};

/**
 * Generates CSS value for a Figma variable
 */
export const generateCSSValue = async (
  variable: Variable,
  modeId?: string,
  collectionName: string = "",
  modeName?: string
): Promise<string> => {
  try {
    if (!variable) {
      console.error("❌ No variable provided to generateCSSValue");
      return "";
    }

    if (!variable.resolvedType) {
      console.error(`❌ Variable ${variable.name} has no resolved type`);
      return "";
    }

    const valueConverters = {
      COLOR: convertColorValue,
      FLOAT: convertFloatValue,
      STRING: convertStringValue,
    };

    const converter =
      valueConverters[variable.resolvedType as keyof typeof valueConverters];

    if (!converter) {
      console.warn(
        `⚠️ Unsupported variable type: ${variable.resolvedType} for ${variable.name}`
      );
      return "";
    }

    return await converter(variable, modeId, collectionName, modeName);
  } catch (error) {
    console.error(
      `❌ Error generating CSS value for variable ${variable?.name}:`,
      error
    );
    return "";
  }
};
