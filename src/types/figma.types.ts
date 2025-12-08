/**
 * Figma Plugin API type definitions
 */

declare global {
  /** Console API available in Figma plugin environment */
  const console: {
    log(...args: unknown[]): void;
    error(...args: unknown[]): void;
    warn(...args: unknown[]): void;
  };

  /** Fetch API available in Figma plugin environment */
  function fetch(
    input: string,
    init?: {
      method?: string;
      headers?: Record<string, string>;
      body?: string;
    }
  ): Promise<{
    ok: boolean;
    status: number;
    statusText: string;
    json(): Promise<unknown>;
  }>;

  /** RGB color representation */
  interface RGB {
    r: number;
    g: number;
    b: number;
  }

  /** RGBA color with alpha channel */
  interface RGBA extends RGB {
    a: number;
  }

  /** Variable alias reference */
  interface VariableAlias {
    type: 'VARIABLE_ALIAS';
    id: string;
  }

  /** Figma variable collection containing multiple design variables */
  interface VariableCollection {
    id: string;
    name: string;
    variableIds: string[];
    modes: { modeId: string; name: string }[];
  }

  /** Individual Figma design variable with type and values */
  interface Variable {
    id: string;
    name: string;
    resolvedType: "COLOR" | "FLOAT" | "STRING" | "BOOLEAN";
    valuesByMode: { 
      [modeId: string]: RGB | RGBA | number | string | boolean | VariableAlias 
    };
    setVariableCodeSyntax(platform: string, syntax: string): void;
  }

  /** Main Figma plugin API object */
  const figma: {
    variables: {
      getLocalVariableCollectionsAsync(): Promise<VariableCollection[]>;
      getVariableByIdAsync(id: string): Promise<Variable>;
    };
    codegen: {
      preferences: {
        language: string;
      };
    };
    ui: {
      postMessage(message: unknown): void;
      onmessage: ((message: unknown) => void) | null;
    };
    notify(message: string, options?: { error?: boolean }): void;
    closePlugin(): void;
    showUI(
      html: string,
      options?: {
        width?: number;
        height?: number;
        themeColors?: boolean;
      }
    ): void;
    /** Editor type - 'figma' for design mode, 'dev' for dev mode */
    editorType: 'figma' | 'dev';
  };

  /** Global variable containing the UI HTML */
  const __html__: string;
}

export {};
