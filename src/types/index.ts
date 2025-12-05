/**
 * Central export point for all type definitions
 */

// Import Figma types for side effects (global declarations)
import "./figma.types";

// Re-export all types explicitly
export type {
  CSSVariable,
  ProcessedVariable,
  VariablesByTheme,
  ConversionResult,
  ThemeCssOutput,
  VariableCategory,
} from "./variable.types";

export type {
  GitHubFileResponse,
  GitHubApiResponse,
  GitHubTreeItem,
  GitHubConfig,
} from "./github.types";
