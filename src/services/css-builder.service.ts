/**
 * CSS file builder service
 * Produces :root blocks grouped into Colors, Fonts, and Measures sections.
 */

import { CSSVariable, ThemeCssOutput, VariableCategory } from "../types/index";
import { toKebabCase } from "../helpers/string.helper";

type GroupedVariables = Record<VariableCategory, Array<{ name: string; value: string }>>;

const SECTION_LABELS: Record<VariableCategory, string> = {
  color: "Colors",
  fonts: "Fonts",
  measures: "Measures",
};

const GROUP_ORDER: VariableCategory[] = ["color", "fonts", "measures"];

const groupVariablesByType = (variables: CSSVariable[]): GroupedVariables => {
  const grouped: GroupedVariables = {
    color: [],
    fonts: [],
    measures: [],
  };

  variables.forEach((variable) => {
    const bucket =
      grouped[variable.type as VariableCategory] || grouped.measures;
    bucket.push({
      name: variable.name,
      value: variable.value,
    });
  });

  return grouped;
};

const formatSection = (
  type: VariableCategory,
  variables: Array<{ name: string; value: string }>
): string => {
  if (!variables.length) {
    return `  /* ${SECTION_LABELS[type]} */`;
  }

  const lines = variables
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((variable) => `  ${variable.name}: ${variable.value};`)
    .join("\n");

  return [`  /* ${SECTION_LABELS[type]} */`, lines].join("\n");
};

/**
 * Builds a CSS string with :root containing grouped variables.
 */
export const buildCssOutput = (cssVariables: CSSVariable[] = []): string => {
  const grouped = groupVariablesByType(cssVariables);
  const exportTimestamp = new Date().toISOString();

  const sections = GROUP_ORDER.map((type) => formatSection(type, grouped[type]));

  return [
    "/*",
    " * Design tokens exported from Figma",
    ` * Exported at: ${exportTimestamp}`,
    " * Format: Raw CSS variables grouped by kind",
    " */",
    ":root {",
    sections.join("\n"),
    "}",
    "",
  ].join("\n");
};

/**
 * Builds theme-aware CSS output with sanitized theme names as keys.
 */
export const buildThemeAwareCssOutput = (
  variablesByTheme: Record<string, CSSVariable[]>
): ThemeCssOutput => {
  const themes = Object.keys(variablesByTheme);
  const result: ThemeCssOutput = {};

  themes.forEach((theme) => {
    let themeName =
      themes.length === 1 ? "theme" : toKebabCase(theme);

    // Remove light suffix to keep primary theme clean (dark stays with suffix)
    if (themeName.endsWith("-light")) {
      themeName = themeName.replace(/-light$/, "");
    }

    result[themeName] = buildCssOutput(variablesByTheme[theme] || []);
  });

  return result;
};
