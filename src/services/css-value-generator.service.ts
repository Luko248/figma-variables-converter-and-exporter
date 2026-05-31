/**
 * CSS value generation service
 */

import "../types/figma.types";
import {
  safeColorConversion,
  safeFloatConversion,
  safeStringConversion,
} from "./value-converter.service";
import { generateCSSVariableName } from "./variable-naming.service";
import { FALLBACK_OKLCH_COLOR } from "../constants/conversion.constants";
import { TokenNamingConvention } from "../types/index";

/**
 * Emits `var(--<alias-target-name>)` so the exported CSS preserves the
 * inheritance chain from the Figma source (Core → Semantic → Component)
 * instead of flattening every alias to the resolved leaf value.
 *
 * Uses the same `generateCSSVariableName` that the orchestrator uses to
 * emit declarations, so the reference and the declaration always agree
 * on naming. Returns `null` only when the alias target is missing — the
 * caller falls back to raw value resolution in that case so we never
 * emit a dangling `var(--…)`.
 */
const generateAliasReference = (
  aliasedVariable: Variable,
  namingConvention: TokenNamingConvention
): string => {
  const cssName = generateCSSVariableName(
    "",
    aliasedVariable.name,
    namingConvention
  );
  return `var(${cssName})`;
};

/**
 * Converts color variables to OKLCH format
 */
const convertColorValue = async (
  variable: Variable,
  modeId: string | undefined,
  collectionName: string,
  modeName: string | undefined,
  namingConvention: TokenNamingConvention
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
      const ref = generateAliasReference(aliasedVariable, namingConvention);
      console.log(`🔗 Alias ref for ${variable.name} → ${ref}`);
      return ref;
    }
    // Alias target missing in the file. Don't emit `var(--…)` to a
    // dangling name; use the fallback color so the declaration is
    // still parseable and visually identifiable as broken.
    console.error(
      `❌ Alias target missing for ${variable.name} (alias ID: ${aliasId})`
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
  modeId: string | undefined,
  collectionName: string,
  modeName: string | undefined,
  namingConvention: TokenNamingConvention
): Promise<string> => {
  const valuesByMode = variable.valuesByMode || {};
  if (Object.keys(valuesByMode).length === 0) {
    console.warn(`⚠️ No float modes found for ${variable.name}`);
    return "0";
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
      const ref = generateAliasReference(aliasedVariable, namingConvention);
      console.log(`🔗 Alias ref for ${variable.name} → ${ref}`);
      return ref;
    }
    console.error(
      `❌ Alias target missing for ${variable.name} (alias ID: ${aliasId})`
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
  modeId: string | undefined,
  collectionName: string,
  modeName: string | undefined,
  namingConvention: TokenNamingConvention
): Promise<string> => {
  const valuesByMode = variable.valuesByMode || {};
  if (Object.keys(valuesByMode).length === 0) {
    console.warn(`⚠️ No string modes found for ${variable.name}`);
    return '""';
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
      const ref = generateAliasReference(aliasedVariable, namingConvention);
      console.log(`🔗 Alias ref for ${variable.name} → ${ref}`);
      return ref;
    }
    console.error(
      `❌ Alias target missing for ${variable.name} (alias ID: ${aliasId})`
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
  modeName?: string,
  namingConvention: TokenNamingConvention = "camel-case"
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

    return await converter(
      variable,
      modeId,
      collectionName,
      modeName,
      namingConvention
    );
  } catch (error) {
    console.error(
      `❌ Error generating CSS value for variable ${variable?.name}:`,
      error
    );
    return "";
  }
};
