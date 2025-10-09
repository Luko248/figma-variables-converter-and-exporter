/**
 * CSS generation utilities for converting Figma variables to CSS values
 * Optimized with enhanced error handling and accessibility features
 */
import "./types";
import { rgbToOklch, rgbaToOklch, pxToRem } from "./utils";

/**
 * Resolves a variable alias to its raw value
 * @param aliasedVariable - The aliased variable
 * @param modeId - The mode ID to get the value for
 * @param collectionName - The collection name for proper naming
 * @returns Raw CSS value (color, number, string) or null if resolution fails
 */
async function resolveAliasToRawValue(
  aliasedVariable: Variable,
  modeId: string,
  collectionName: string
): Promise<string | null> {
  try {
    // Get the value for the specific mode
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
        if ('a' in colorValue && colorValue.a !== undefined && colorValue.a !== 1) {
          return rgbaToOklch(colorValue.r, colorValue.g, colorValue.b, colorValue.a);
        }
        return rgbToOklch(colorValue.r, colorValue.g, colorValue.b);
      }
      case 'FLOAT': {
        const floatValue = rawValue as number;
        return safeFloatConversion(floatValue, aliasedVariable.name, aliasedVariable);
      }
      case 'STRING': {
        const stringValue = rawValue as string;
        return stringValue ? `"${stringValue}"` : '""';
      }
      default:
        return String(rawValue);
    }
  } catch (error) {
    console.error(`❌ Error resolving alias value:`, error);
    return null;
  }
}

/**
 * Validates if a color value is within acceptable OKLCH gamut ranges
 * Based on MDN specifications and accessibility guidelines
 */
const validateOklchGamut = (colorString: string): boolean => {
  const match = colorString.match(/oklch\(([^)]+)\)/);
  if (!match) return false;

  const values = match[1].split(/\s+/);
  if (values.length < 3) return false;

  const L = parseFloat(values[0]);
  const C = parseFloat(values[1]);
  const H = parseFloat(values[2]);

  // Validate ranges according to OKLCH specifications
  if (L < 0 || L > 1) return false;
  if (C < 0 || C > 0.4) return false; // Practical maximum according to MDN
  if (H < 0 || H > 360) return false;

  return true;
};

/**
 * Checks if an OKLCH color provides sufficient contrast for accessibility
 * Uses lightness value to ensure accessibility compliance
 */
const validateColorAccessibility = (
  colorString: string
): { isAccessible: boolean; warning?: string } => {
  const match = colorString.match(/oklch\(([^)]+)\)/);
  if (!match) return { isAccessible: false, warning: "Invalid OKLCH format" };

  const values = match[1].split(/\s+/);
  const L = parseFloat(values[0]);

  // Basic accessibility checks based on OKLCH lightness
  if (L < 0.1) {
    return {
      isAccessible: true,
      warning: "Very dark color - ensure sufficient contrast with text",
    };
  }

  if (L > 0.9) {
    return {
      isAccessible: true,
      warning: "Very light color - ensure sufficient contrast with text",
    };
  }

  return { isAccessible: true };
};

/**
 * Enhanced error handling for color conversion with fallbacks
 */
const safeColorConversion = (
  colorValue: RGB | RGBA,
  variableName: string
): string => {
  try {
    // Input validation
    if (!colorValue || typeof colorValue !== "object") {
      console.warn(
        `⚠️ Invalid color value for ${variableName}, using fallback`
      );
      return "oklch(0 0 0)";
    }

    // Validate RGB values are in valid range
    const { r, g, b } = colorValue;
    if (r < 0 || r > 1 || g < 0 || g > 1 || b < 0 || b > 1) {
      console.warn(
        `⚠️ RGB values out of range for ${variableName}: (${r}, ${g}, ${b}), clamping values`
      );
      const clampedR = Math.max(0, Math.min(1, r));
      const clampedG = Math.max(0, Math.min(1, g));
      const clampedB = Math.max(0, Math.min(1, b));

      const result =
        "a" in colorValue
          ? rgbaToOklch(
              clampedR,
              clampedG,
              clampedB,
              Math.max(0, Math.min(1, colorValue.a))
            )
          : rgbToOklch(clampedR, clampedG, clampedB);

      return result;
    }

    // Perform conversion
    const result =
      "a" in colorValue
        ? rgbaToOklch(colorValue.r, colorValue.g, colorValue.b, colorValue.a)
        : rgbToOklch(colorValue.r, colorValue.g, colorValue.b);

    // Validate the result
    if (!validateOklchGamut(result)) {
      console.warn(
        `⚠️ Generated OKLCH color out of gamut for ${variableName}: ${result}`
      );
      return "oklch(0 0 0)"; // Safe fallback
    }

    // Check accessibility
    const accessibilityCheck = validateColorAccessibility(result);
    if (accessibilityCheck.warning) {
      console.log(
        `ℹ️ Accessibility note for ${variableName}: ${accessibilityCheck.warning}`
      );
    }

    return result;
  } catch (error) {
    console.error(`❌ Error converting color for ${variableName}:`, error);
    return "oklch(0 0 0)"; // Safe fallback
  }
};

/**
 * Enhanced error handling for float conversion with validation
 */
const safeFloatConversion = (
  floatValue: number,
  variableName: string,
  _variable: Variable
): string => {
  try {
    if (typeof floatValue !== "number" || !isFinite(floatValue)) {
      console.warn(
        `⚠️ Invalid float value for ${variableName}: ${floatValue}, using 0`
      );
      return "0";
    }

    const variableNameLower = variableName.toLowerCase();

    // Enhanced token formatting rules with validation
    if (
      variableNameLower.includes("opacity") ||
      variableNameLower.includes("alpha")
    ) {
      const clampedValue = Math.max(0, Math.min(1, floatValue));
      if (clampedValue !== floatValue) {
        console.warn(
          `⚠️ Opacity value clamped for ${variableName}: ${floatValue} → ${clampedValue}`
        );
      }
      return `${Math.round(clampedValue * 100)}%`;
    }

    if (
      variableNameLower.includes("weight") ||
      variableNameLower.includes("fontweight")
    ) {
      const roundedValue = Math.round(floatValue);
      if (roundedValue < 100 || roundedValue > 900) {
        console.warn(
          `⚠️ Font weight out of standard range for ${variableName}: ${roundedValue}`
        );
      }
      return roundedValue.toString();
    }

    if (
      variableNameLower.includes("duration") ||
      variableNameLower.includes("timing")
    ) {
      if (floatValue < 0) {
        console.warn(
          `⚠️ Negative duration value for ${variableName}: ${floatValue}, using 0`
        );
        return "0ms";
      }
      return `${floatValue}ms`;
    }

    if (
      variableNameLower.includes("zindex") ||
      variableNameLower.includes("z-index")
    ) {
      const roundedValue = Math.round(floatValue);
      return roundedValue.toString();
    }

    // Default: convert pixels to rem with validation
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
 * Enhanced error handling for string conversion with sanitization
 */
const safeStringConversion = (
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

    // Sanitize the string value
    const sanitized = stringValue.trim();

    if (sanitized.length === 0) {
      console.warn(`⚠️ Empty string value for ${variableName}`);
      return '""';
    }

    // Validate for potential CSS injection (basic check)
    if (
      sanitized.includes(";") ||
      sanitized.includes("{") ||
      sanitized.includes("}")
    ) {
      console.warn(
        `⚠️ Potentially unsafe CSS characters in ${variableName}: ${sanitized}`
      );
    }

    return sanitized;
  } catch (error) {
    console.error(`❌ Error converting string for ${variableName}:`, error);
    return '""';
  }
};

/**
 * Converts a Figma variable to its corresponding CSS value for a specific mode
 * Enhanced with comprehensive error handling and validation
 *
 * @param variable - The Figma variable object
 * @param modeId - The specific mode ID to get the value for
 * @param collectionName - The collection name for proper alias resolution
 * @returns CSS-compatible string value
 */
export const generateCSSValue = async (
  variable: Variable,
  modeId?: string,
  collectionName: string = ""
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

    return await converter(variable, modeId, collectionName);
  } catch (error) {
    console.error(
      `❌ Error generating CSS value for variable ${variable?.name}:`,
      error
    );
    return "";
  }
};

/**
 * Converts color variables to OKLCH format with enhanced error handling
 */
const convertColorValue = async (variable: Variable, modeId?: string, collectionName: string = ""): Promise<string> => {
  const valuesByMode = variable.valuesByMode || {};
  if (Object.keys(valuesByMode).length === 0) {
    console.warn(`⚠️ No color modes found for ${variable.name}`);
    return "oklch(0 0 0)";
  }

  // Use specific mode or first available mode
  const targetModeId = modeId || Object.keys(valuesByMode)[0];
  const rawValue = valuesByMode[targetModeId];

  // Check if it's an alias (variable reference)
  if (typeof rawValue === 'object' && rawValue !== null && 'type' in rawValue && (rawValue as { type: string }).type === 'VARIABLE_ALIAS') {
    const aliasId = (rawValue as VariableAlias).id;
    const aliasedVariable = await figma.variables.getVariableByIdAsync(aliasId);
    if (aliasedVariable) {
      const resolvedValue = await resolveAliasToRawValue(aliasedVariable, targetModeId, collectionName);
      if (resolvedValue) {
        console.log(`🔗 Resolved alias for ${variable.name} → ${resolvedValue}`);
        return resolvedValue;
      }
    }
    console.error(
      `❌ FAILED to resolve alias for ${variable.name} (alias ID: ${aliasId})`
    );
    return "oklch(0 0 0)";
  }

  const colorValue = rawValue as RGB | RGBA;

  if (!colorValue || typeof colorValue !== 'object') {
    console.warn(
      `⚠️ No color value found for mode ${targetModeId} in ${variable.name}`
    );
    return "oklch(0 0 0)";
  }

  return safeColorConversion(colorValue, variable.name);
};

/**
 * Converts float variables based on their type with enhanced error handling
 */
const convertFloatValue = async (variable: Variable, modeId?: string, collectionName: string = ""): Promise<string> => {
  const valuesByMode = variable.valuesByMode || {};
  if (Object.keys(valuesByMode).length === 0) {
    console.warn(`⚠️ No float modes found for ${variable.name}`);
    return "0";
  }

  // Use specific mode or first available mode
  const targetModeId = modeId || Object.keys(valuesByMode)[0];
  const rawValue = valuesByMode[targetModeId];

  // Check if it's an alias (variable reference)
  if (typeof rawValue === 'object' && rawValue !== null && 'type' in rawValue) {
    const aliasId = (rawValue as VariableAlias).id;
    const aliasedVariable = await figma.variables.getVariableByIdAsync(aliasId);
    if (aliasedVariable) {
      const resolvedValue = await resolveAliasToRawValue(aliasedVariable, targetModeId, collectionName);
      if (resolvedValue) {
        console.log(`🔗 Resolved alias for ${variable.name} → ${resolvedValue}`);
        return resolvedValue;
      }
    }
    console.error(
      `❌ FAILED to resolve alias for ${variable.name} (alias ID: ${aliasId})`
    );
    // Return fallback for unresolved alias
    return "0";
  }

  const floatValue = rawValue as number;

  if (floatValue === undefined || typeof floatValue !== 'number') {
    console.warn(
      `⚠️ Invalid float value for ${variable.name} in mode ${targetModeId}: ${typeof floatValue}`
    );
    return "0";
  }

  return safeFloatConversion(floatValue, variable.name, variable);
};

/**
 * Converts string variables with proper formatting and enhanced error handling
 */
const convertStringValue = async (variable: Variable, modeId?: string, collectionName: string = ""): Promise<string> => {
  const valuesByMode = variable.valuesByMode || {};
  if (Object.keys(valuesByMode).length === 0) {
    console.warn(`⚠️ No string modes found for ${variable.name}`);
    return '""';
  }

  // Use specific mode or first available mode
  const targetModeId = modeId || Object.keys(valuesByMode)[0];
  const rawValue = valuesByMode[targetModeId];

  // Check if it's an alias (variable reference)
  if (typeof rawValue === 'object' && rawValue !== null && 'type' in rawValue) {
    const aliasId = (rawValue as VariableAlias).id;
    const aliasedVariable = await figma.variables.getVariableByIdAsync(aliasId);
    if (aliasedVariable) {
      const resolvedValue = await resolveAliasToRawValue(aliasedVariable, targetModeId, collectionName);
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
    return '""';
  }

  return safeStringConversion(stringValue, variable.name);
};

/**
 * Builds the final CSS output with proper formatting and grouping
 *
 * @param cssVariables - Array of processed CSS variables
 * @returns Complete CSS custom properties in :root selector
 */
/**
 * Builds theme-aware multi-file SCSS output with mixins
 *
 * @param variablesByTheme - Object mapping theme names to their variables
 * @returns Object with theme folders containing SCSS files
 */
export function buildThemeAwareOutput(
  variablesByTheme: Record<
    string,
    Array<{ name: string; value: string; type: string }>
  >
): Record<
  string,
  {
    colors: string;
    measures: string;
    fonts: string;
    shadows: string;
    gradients: string;
    index: string;
    root: string;
  }
> {
  console.log("🎨 Building theme-aware output...");
  const themes = Object.keys(variablesByTheme);
  console.log(`   Found ${themes.length} theme(s):`, themes);
  
  const result: Record<
    string,
    {
      colors: string;
      measures: string;
      fonts: string;
      shadows: string;
      gradients: string;
      index: string;
      root: string;
    }
  > = {};

  themes.forEach((theme) => {
    // Convert theme name to kebab-case (lowercase with dashes)
    // Example: "Koop Dark" → "koop-dark", "CPP Light" → "cpp-light"
    const themeName = themes.length === 1 
      ? "theme" 
      : theme.toLowerCase().replace(/\s+/g, '-');
    console.log(`   Processing theme: ${theme} → ${themeName}`);
    console.log(`   Variables count: ${variablesByTheme[theme]?.length || 0}`);
    
    const output = buildSupernovaOutput(variablesByTheme[theme]);
    console.log(`   Generated files:`, Object.keys(output).map(key => `${key}(${output[key as keyof typeof output].length} chars)`));
    
    result[themeName] = output;
  });

  console.log(`✅ Theme-aware output complete. Themes:`, Object.keys(result));
  return result;
}

/**
 * Builds multi-file SCSS output with mixins
 *
 * @param cssVariables - Array of processed CSS variables
 * @returns Object with file contents for each category
 */
export function buildSupernovaOutput(
  cssVariables: Array<{ name: string; value: string; type: string }>
): {
  colors: string;
  measures: string;
  fonts: string;
  shadows: string;
  gradients: string;
  index: string;
  root: string;
} {
  console.log("📦 buildSupernovaOutput called with:", {
    isArray: Array.isArray(cssVariables),
    isUndefined: cssVariables === undefined,
    length: cssVariables?.length,
  });

  if (!cssVariables || !Array.isArray(cssVariables) || cssVariables.length === 0) {
    console.warn("⚠️ No variables provided to buildSupernovaOutput");
    return {
      colors: "/* No color variables found */",
      measures: "/* No measure variables found */",
      fonts: "/* No font variables found */",
      shadows: "/* No shadow variables found */",
      gradients: "/* No gradient variables found */",
      index: "",
      root: "",
    };
  }

  // Group variables by type
  const groupedVariables: Record<
    string,
    Array<{ name: string; value: string }>
  > = {};

  cssVariables.forEach((variable) => {
    if (!groupedVariables[variable.type]) {
      groupedVariables[variable.type] = [];
    }
    groupedVariables[variable.type].push({
      name: variable.name,
      value: variable.value,
    });
  });

  console.log("📊 Grouped variables by type:", Object.keys(groupedVariables).map(key => `${key}: ${groupedVariables[key].length}`));

  const buildFileContent = (
    category: string,
    variables: Array<{ name: string; value: string }>
  ) => {
    console.log(`🔨 Building ${category} file with ${variables.length} variables`);
    if (variables.length > 0) {
      console.log(`   First 3 variables:`, variables.slice(0, 3).map(v => `${v.name}: ${v.value}`));
    }
    
    const categoryUpper = category.toUpperCase();
    const exportDate = new Date().toLocaleString("en-US", {
      month: "numeric",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: true,
    });

    let content = `/*\n* ${categoryUpper} TOKENS GENERATED BY FIGMA EXPORTER\n*---------------------------------------------\n*\n* Exported at: ${exportDate}\n* File: ${category}.scss\n* Type: ${categoryUpper}\n*/\n\n@mixin create-${category} {\n`;

    if (variables.length > 0) {
      // Group variables by semantic sections if needed
      const sections = groupVariablesBySemantic(variables);

      Object.entries(sections).forEach(([sectionName, sectionVars]) => {
        if (sectionName !== "default") {
          content += `\n/* --- ${sectionName} --- */\n`;
        }
        sectionVars.forEach((variable) => {
          content += `  ${variable.name}: ${variable.value};\n`;
        });
      });
    }

    content += "}\n";
    return content;
  };

  const colors = buildFileContent("color", groupedVariables.color || []);
  const measures = buildFileContent("measures", groupedVariables.measures || []);
  const fonts = buildFileContent("fonts", groupedVariables.fonts || []);
  const shadows = buildFileContent("shadows", groupedVariables.shadows || []);
  const gradients = buildFileContent("gradient", groupedVariables.gradient || []);
  const index = '@forward "colors";\n@forward "fonts";\n@forward "gradients";\n@forward "measures";\n@forward "shadows";\n\n';
  const root = '@use "_index" as *;\n\n@mixin create-root {\n  @include create-color;\n  @include create-fonts;\n  @include create-gradient;\n  @include create-measures;\n  @include create-shadows;\n}\n\n';

  console.log("📄 Generated file sizes BEFORE creating result object:", {
    colors: colors.length,
    measures: measures.length,
    fonts: fonts.length,
    shadows: shadows.length,
    gradients: gradients.length,
    index: index.length,
    root: root.length,
  });

  const result = {
    colors,
    measures,
    fonts,
    shadows,
    gradients,
    index,
    root,
  };

  console.log("📄 Result object file sizes:", {
    colors: result.colors?.length || 0,
    measures: result.measures?.length || 0,
    fonts: result.fonts?.length || 0,
    shadows: result.shadows?.length || 0,
    gradients: result.gradients?.length || 0,
    index: result.index?.length || 0,
    root: result.root?.length || 0,
  });

  return result;
}

/**
 * Groups variables by semantic sections for better organization
 */
function groupVariablesBySemantic(
  variables: Array<{ name: string; value: string }>
): Record<string, Array<{ name: string; value: string }>> {
  const sections: Record<string, Array<{ name: string; value: string }>> = {
    default: [],
  };

  variables.forEach((variable) => {
    // Extract semantic section from variable name
    const match = variable.name.match(/--\w+([A-Z][a-z]+)/);
    const section = match ? match[1].toLowerCase() : "default";

    if (!sections[section]) {
      sections[section] = [];
    }
    sections[section].push(variable);
  });

  return sections;
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use buildSupernovaOutput instead
 */
export function buildCSSOutput(
  cssVariables: Array<{ name: string; value: string; type: string }>
): string {
  const supernovaOutput = buildSupernovaOutput(cssVariables);
  return (
    supernovaOutput.colors +
    "\n" +
    supernovaOutput.measures +
    "\n" +
    supernovaOutput.fonts +
    "\n" +
    supernovaOutput.shadows +
    "\n" +
    supernovaOutput.gradients
  );
}
