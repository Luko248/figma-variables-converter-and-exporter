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
import { generateCSSVariableName } from "./variable-naming.service";
import { FALLBACK_OKLCH_COLOR } from "../constants/conversion.constants";
import { TokenNamingConvention } from "../types/index";

/**
 * Walk the alias chain forward until we hit a variable that will actually
 * be emitted in the export (i.e. its id is in `exportedIds`), and return
 * `var(--<its-name>)`. If we exhaust the chain without finding an
 * exported target — typical for "orphan" Figma variables that exist by
 * id but aren't members of any collection's `variableIds` — return
 * `null` so the caller falls back to raw value resolution. This keeps
 * inheritance intact when possible without emitting dangling references.
 */
const generateAliasReference = async (
  aliasedVariable: Variable,
  namingConvention: TokenNamingConvention,
  exportedIds: Set<string>
): Promise<string | null> => {
  let cur: Variable | null = aliasedVariable;
  // Cap to a small depth so a cycle (shouldn't happen in Figma, but defend
  // against it) can't hang the exporter.
  for (let depth = 0; depth < 16 && cur; depth += 1) {
    if (exportedIds.has(cur.id)) {
      const cssName = generateCSSVariableName(
        "",
        cur.name,
        namingConvention
      );
      return `var(${cssName})`;
    }
    // Cur is an orphan — try to follow ITS alias to a deeper target.
    const valuesByMode = cur.valuesByMode || {};
    const firstModeId = Object.keys(valuesByMode)[0];
    if (!firstModeId) return null;
    const inner = valuesByMode[firstModeId];
    if (
      !inner ||
      typeof inner !== "object" ||
      !("type" in inner) ||
      (inner as { type: string }).type !== "VARIABLE_ALIAS"
    ) {
      return null;
    }
    const nextId = (inner as VariableAlias).id;
    cur = await figma.variables.getVariableByIdAsync(nextId);
  }
  return null;
};

/**
 * Converts color variables to OKLCH format
 */
const convertColorValue = async (
  variable: Variable,
  modeId: string | undefined,
  collectionName: string,
  modeName: string | undefined,
  namingConvention: TokenNamingConvention,
  exportedIds: Set<string>
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
      const ref = await generateAliasReference(
        aliasedVariable,
        namingConvention,
        exportedIds
      );
      if (ref) {
        console.log(`🔗 Alias ref for ${variable.name} → ${ref}`);
        return ref;
      }
      // Chain led only through orphan variables (no exported target).
      // Fall back to recursive raw resolution so we still produce a
      // valid value instead of a dangling reference.
      const resolved = await resolveAliasToRawValue(
        aliasedVariable,
        targetModeId,
        collectionName,
        modeName
      );
      if (resolved) {
        console.warn(
          `⚠️ Orphan alias chain for ${variable.name} — inlined raw value`
        );
        return resolved;
      }
    }
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
  namingConvention: TokenNamingConvention,
  exportedIds: Set<string>
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
      const ref = await generateAliasReference(
        aliasedVariable,
        namingConvention,
        exportedIds
      );
      if (ref) {
        console.log(`🔗 Alias ref for ${variable.name} → ${ref}`);
        return ref;
      }
      const resolved = await resolveAliasToRawValue(
        aliasedVariable,
        targetModeId,
        collectionName,
        modeName
      );
      if (resolved) {
        console.warn(
          `⚠️ Orphan alias chain for ${variable.name} — inlined raw value`
        );
        return resolved;
      }
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
  namingConvention: TokenNamingConvention,
  exportedIds: Set<string>
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
      const ref = await generateAliasReference(
        aliasedVariable,
        namingConvention,
        exportedIds
      );
      if (ref) {
        console.log(`🔗 Alias ref for ${variable.name} → ${ref}`);
        return ref;
      }
      const resolved = await resolveAliasToRawValue(
        aliasedVariable,
        targetModeId,
        collectionName,
        modeName
      );
      if (resolved) {
        console.warn(
          `⚠️ Orphan alias chain for ${variable.name} — inlined raw value`
        );
        return resolved;
      }
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
  namingConvention: TokenNamingConvention = "camel-case",
  exportedIds: Set<string> = new Set()
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
      namingConvention,
      exportedIds
    );
  } catch (error) {
    console.error(
      `❌ Error generating CSS value for variable ${variable?.name}:`,
      error
    );
    return "";
  }
};
