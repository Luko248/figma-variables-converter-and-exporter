/**
 * CSS file builder service
 * Produces :root blocks grouped into Colors, Fonts, and Measures sections.
 */

import { CSSVariable, ThemeCssOutput, VariableCategory } from "../types/index";
import { toKebabCase } from "../helpers/string.helper";

type GroupedVariables = Record<VariableCategory, Array<{ name: string; value: string }>>;
type GroupedVariablesScss = Record<VariableCategory, Array<{ name: string; scssName: string; value: string }>>;
type CssOutputFormat = "css-variables" | "tailwind-theme" | "scss";

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

const toTailwindSegment = (name: string): string => {
  const rawName = name
    .replace(/^--/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();

  return rawName
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
};

const stripLeadingTokens = (segment: string, tokens: string[]): string => {
  let result = segment;

  tokens.forEach((token) => {
    if (result === token) {
      result = "";
    } else if (result.startsWith(`${token}-`)) {
      result = result.slice(token.length + 1);
    } else if (
      result.startsWith(token) &&
      /^[0-9]/.test(result.slice(token.length))
    ) {
      result = result.slice(token.length);
    }
  });

  return result || "default";
};

const toTailwindThemeVariableName = (variable: CSSVariable): string => {
  const segment = toTailwindSegment(variable.name);

  if (variable.type === "color") {
    return `--color-${stripLeadingTokens(segment, ["color"])}`;
  }

  if (variable.type === "fonts") {
    if (segment.includes("weight")) {
      return `--font-weight-${stripLeadingTokens(segment, [
        "font-weight",
        "font",
        "weight",
      ])}`;
    }

    if (segment.includes("size") || segment.startsWith("text-")) {
      return `--text-${stripLeadingTokens(segment, [
        "font-size",
        "font",
        "size",
        "text",
      ])}`;
    }

    if (segment.includes("line-height") || segment.includes("leading")) {
      return `--leading-${stripLeadingTokens(segment, [
        "line-height",
        "leading",
      ])}`;
    }

    if (segment.includes("letter-spacing") || segment.includes("tracking")) {
      return `--tracking-${stripLeadingTokens(segment, [
        "letter-spacing",
        "tracking",
      ])}`;
    }

    return `--font-${stripLeadingTokens(segment, ["font-family", "font"])}`;
  }

  if (segment.includes("radius") || segment.includes("rounded") || segment.includes("corner")) {
    return `--radius-${stripLeadingTokens(segment, [
      "border-radius",
      "radius",
      "rounded",
      "corner",
    ])}`;
  }

  if (segment.includes("shadow")) {
    return `--shadow-${stripLeadingTokens(segment, ["box-shadow", "shadow"])}`;
  }

  if (segment.includes("blur")) {
    return `--blur-${stripLeadingTokens(segment, ["blur"])}`;
  }

  if (segment.includes("opacity") || segment.includes("alpha")) {
    return `--opacity-${stripLeadingTokens(segment, ["opacity", "alpha"])}`;
  }

  if (segment.includes("z-index") || segment.includes("zindex")) {
    return `--z-${stripLeadingTokens(segment, ["z-index", "zindex"])}`;
  }

  if (segment.includes("duration") || segment.includes("timing")) {
    return `--duration-${stripLeadingTokens(segment, ["duration", "timing"])}`;
  }

  if (segment.includes("ease")) {
    return `--ease-${stripLeadingTokens(segment, ["ease"])}`;
  }

  if (segment.includes("animate") || segment.includes("animation")) {
    return `--animate-${stripLeadingTokens(segment, ["animate", "animation"])}`;
  }

  return `--spacing-${stripLeadingTokens(segment, [
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
  ])}`;
};

const groupTailwindVariablesByType = (
  variables: CSSVariable[]
): GroupedVariables => {
  const grouped: GroupedVariables = {
    color: [],
    fonts: [],
    measures: [],
  };

  variables.forEach((variable) => {
    const bucket =
      grouped[variable.type as VariableCategory] || grouped.measures;
    bucket.push({
      name: toTailwindThemeVariableName(variable),
      value: variable.value,
    });
  });

  return grouped;
};

const toScssVariableName = (name: string): string => {
  const normalized = name
    .replace(/^--/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");

  return `$${normalized}`;
};

const groupScssVariablesByType = (
  variables: CSSVariable[]
): GroupedVariablesScss => {
  const grouped: GroupedVariablesScss = {
    color: [],
    fonts: [],
    measures: [],
  };

  variables.forEach((variable) => {
    const bucket =
      grouped[variable.type as VariableCategory] || grouped.measures;
    bucket.push({
      name: variable.name,
      scssName: toScssVariableName(variable.name),
      value: variable.value,
    });
  });

  return grouped;
};

const formatScssSection = (
  type: VariableCategory,
  variables: Array<{ scssName: string; value: string }>
): string => {
  if (!variables.length) {
    return `/* ${SECTION_LABELS[type]} */`;
  }

  const lines = variables
    .slice()
    .sort((a, b) => a.scssName.localeCompare(b.scssName))
    .map((variable) => `${variable.scssName}: ${variable.value};`)
    .join("\n");

  return [`/* ${SECTION_LABELS[type]} */`, lines].join("\n");
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
 * Builds a Tailwind CSS v4 theme file.
 */
export const buildTailwindThemeOutput = (
  cssVariables: CSSVariable[] = []
): string => {
  const grouped = groupTailwindVariablesByType(cssVariables);
  const exportTimestamp = new Date().toISOString();

  const sections = GROUP_ORDER.map((type) => formatSection(type, grouped[type]));

  return [
    "/*",
    " * Design tokens exported from Figma",
    ` * Exported at: ${exportTimestamp}`,
    " * Format: Tailwind CSS v4 @theme variables",
    " * Usage: import this file after @import \"tailwindcss\";",
    " */",
    "@theme static {",
    sections.join("\n"),
    "}",
    "",
  ].join("\n");
};

/**
 * Builds an SCSS variables file.
 */
export const buildScssOutput = (cssVariables: CSSVariable[] = []): string => {
  const grouped = groupScssVariablesByType(cssVariables);
  const exportTimestamp = new Date().toISOString();

  const sections = GROUP_ORDER.map((type) =>
    formatScssSection(type, grouped[type])
  );

  return [
    "/*",
    " * Design tokens exported from Figma",
    ` * Exported at: ${exportTimestamp}`,
    " * Format: SCSS variables grouped by kind",
    " */",
    sections.join("\n\n"),
    "",
  ].join("\n");
};

/**
 * Builds theme-aware CSS output with sanitized theme names as keys.
 */
export const buildThemeAwareCssOutput = (
  variablesByTheme: Record<string, CSSVariable[]>,
  format: CssOutputFormat = "css-variables"
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

    const variables = variablesByTheme[theme] || [];
    result[themeName] =
      format === "tailwind-theme"
        ? buildTailwindThemeOutput(variables)
        : format === "scss"
          ? buildScssOutput(variables)
          : buildCssOutput(variables);
  });

  return result;
};
