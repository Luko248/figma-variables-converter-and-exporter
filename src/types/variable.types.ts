/**
 * Variable-related type definitions
 */

/** CSS variable with metadata */
export interface CSSVariable {
  name: string;
  value: string;
  type: string;
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

/** SCSS file output structure */
export interface ScssFileOutput {
  colors: string;
  measures: string;
  fonts: string;
  shadows: string;
  gradients: string;
  index: string;
  root: string;
}

/** Theme-aware SCSS output */
export interface ThemeScssOutput {
  [themeName: string]: ScssFileOutput;
}

/** Variable type categories */
export type VariableCategory = 
  | "color" 
  | "measures" 
  | "fonts" 
  | "shadow" 
  | "gradient";
