/**
 * Variable-related type definitions
 */

/** CSS variable with metadata */
export interface CSSVariable {
  name: string;
  value: string;
  type: VariableCategory;
}

/** CSS variable with additional internal metadata */
export interface ProcessedVariable extends CSSVariable {
  variable: Variable | null;
}

/** Variables organized by theme */
export interface VariablesByTheme {
  [themeName: string]: ProcessedVariable[];
}

/** Conversion result */
export interface ConversionResult {
  variables: CSSVariable[];
  count: number;
  themes?: string[];
  variablesByTheme?: Record<string, CSSVariable[]>;
}

/** Theme-aware CSS output (theme name -> CSS content) */
export interface ThemeCssOutput {
  [themeName: string]: string;
}

/** Variable type categories */
export type VariableCategory = "color" | "measures" | "fonts";
