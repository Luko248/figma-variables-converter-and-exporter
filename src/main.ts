/**
 * Main plugin logic for converting Figma variables to CSS custom properties
 */
import "./types";
import {
  generateCSSValue,
  buildSupernovaOutput,
  buildThemeAwareOutput,
} from "./css-generator";
import { generateCSSVariableName, detectVariableType } from "./variable-detectors";
import { pushScssFilesToGitHub } from "./github-service";
import { clearColorCache } from "./utils";

// Global flag to prevent multiple executions
let isRunning = false;

// Cache for the last conversion result (to preserve theme data)
let lastConversionResult: {
  variables: Array<{ name: string; value: string; type: string }>;
  count: number;
  themes?: string[];
  variablesByTheme?: Record<string, Array<{ name: string; value: string; type: string }>>;
} | null = null;

// Object pool for variable processing to reduce garbage collection
const variablePool: Array<{
  name: string;
  value: string;
  type: string;
  variable: Variable | null;
}> = [];

// Cache for CSS variable names to avoid repeated generation
const cssNameCache = new Map<string, string>();

/**
 * Gets a variable object from the pool or creates a new one
 */
const getPooledVariableObject = (): {
  name: string;
  value: string;
  type: string;
  variable: Variable | null;
} => {
  return variablePool.pop() || {
    name: '',
    value: '',
    type: '',
    variable: null
  };
};

/**
 * Returns a variable object to the pool for reuse
 */
const _returnToPool = (obj: {
  name: string;
  value: string;
  type: string;
  variable: Variable | null;
}): void => {
  // Reset object properties
  obj.name = '';
  obj.value = '';
  obj.type = '';
  obj.variable = null;
  
  // Return to pool (limit pool size to prevent memory leaks)
  if (variablePool.length < 100) {
    variablePool.push(obj);
  }
};

/**
 * Optimized CSS variable name generation with caching
 */
const getCachedCSSVariableName = (collectionName: string, variableName: string): string => {
  const cacheKey = `${collectionName}:${variableName}`;
  
  if (cssNameCache.has(cacheKey)) {
    return cssNameCache.get(cacheKey)!;
  }
  
  const cssName = generateCSSVariableName(collectionName, variableName);
  
  // Limit cache size to prevent memory leaks
  if (cssNameCache.size < 500) {
    cssNameCache.set(cacheKey, cssName);
  }
  
  return cssName;
};

/**
 * Clears all caches and performs cleanup
 */
const performMemoryCleanup = (): void => {
  clearColorCache();
  cssNameCache.clear();
  
  // Clear the object pool
  variablePool.length = 0;
  
  console.log("🧹 Memory cleanup completed");
};

/**
 * Converts Figma variables to CSS format and updates Figma web devmode
 * Optimized with batch processing to prevent UI blocking
 *
 * @returns Promise with conversion results
 */
export async function convertVariablesToCSS(): Promise<{
  variables: Array<{ name: string; value: string; type: string }>;
  count: number;
  themes?: string[];
  variablesByTheme?: Record<
    string,
    Array<{ name: string; value: string; type: string }>
  >;
}> {
  // Prevent multiple simultaneous executions
  if (isRunning) {
    console.log("⚠️ Plugin already running, ignoring duplicate call");
    throw new Error("Plugin already running");
  }

  isRunning = true;

  try {
    // Check if variables API is available
    if (!figma.variables || !figma.variables.getLocalVariableCollectionsAsync) {
      throw new Error(
        "Variables API not available. Please update Figma or check plugin permissions."
      );
    }

    const collections: VariableCollection[] =
      await figma.variables.getLocalVariableCollectionsAsync();

    if (collections.length === 0) {
      throw new Error(
        "No variable collections found! Create some variables first."
      );
    }

    console.log(`📊 Found ${collections.length} variable collection(s)`);

    /** Object to collect variables organized by theme */
    const variablesByTheme: Record<
      string,
      Array<{
        name: string;
        value: string;
        type: string;
        variable: Variable | null;
      }>
    > = {};

    // First, collect all variable collections and their modes to detect themes
    const allModes: Record<string, string> = {}; // modeId -> modeName

    for (const collection of collections) {
      if (collection.modes && Array.isArray(collection.modes)) {
        collection.modes.forEach((mode: { modeId: string; name: string }) => {
          allModes[mode.modeId] = mode.name;
        });
      } else {
        // Fallback: if modes not available, extract from first variable
        if (collection.variableIds.length > 0) {
          const firstVariable = await figma.variables.getVariableByIdAsync(
            collection.variableIds[0]
          );
          if (firstVariable && firstVariable.valuesByMode) {
            Object.keys(firstVariable.valuesByMode).forEach((modeId, index) => {
              allModes[modeId] = `Mode ${index + 1}`;
            });
          }
        }
      }
    }

    console.log(`🎨 Found themes:`, Object.values(allModes));

    // Performance optimization: Batch process variables to prevent UI blocking
    const BATCH_SIZE = 10; // Process 10 variables at a time
    let totalProcessed = 0;
    let totalVariables = 0;

    // Calculate total for progress tracking
    for (const collection of collections) {
      totalVariables += collection.variableIds.length;
    }

    console.log(
      `🔄 Processing ${totalVariables} variables in batches of ${BATCH_SIZE}...`
    );

    for (const collection of collections) {
      console.log(`🔍 Processing collection: ${collection.name}`);

      // Process variables in chunks to prevent blocking
      const variableIds = collection.variableIds;
      for (let i = 0; i < variableIds.length; i += BATCH_SIZE) {
        const batch = variableIds.slice(i, i + BATCH_SIZE);

        // Process batch asynchronously
        await processBatchOfVariables(
          batch,
          collection,
          allModes,
          variablesByTheme
        );

        totalProcessed += batch.length;
        const progress = Math.round((totalProcessed / totalVariables) * 100);
        console.log(
          `⏳ Progress: ${progress}% (${totalProcessed}/${totalVariables})`
        );

        // Yield control to prevent UI blocking
        await new Promise<void>((resolve) => resolve());
      }
    }

    const totalVariableCount = Object.values(variablesByTheme).reduce(
      (sum, vars) => sum + vars.length,
      0
    );
    if (totalVariableCount === 0) {
      throw new Error("No valid CSS variables could be generated!");
    }

    console.log(
      `📝 Generated ${totalVariableCount} CSS variables across ${
        Object.keys(variablesByTheme).length
      } themes`
    );

    // Update Figma web devmode syntax (use first theme's variables for syntax)
    const firstTheme = Object.values(variablesByTheme)[0] || [];
    await updateFigmaSyntax(firstTheme);

    // Set syntax highlighting in Figma
    figma.codegen.preferences.language = "CSS";

    console.log(
      `✅ Successfully converted variables for ${
        Object.keys(variablesByTheme).length
      } themes`
    );

    // Perform memory cleanup before building output
    performMemoryCleanup();

    // Return variables organized by theme, but flattened for backward compatibility
    const allVariables: Array<{ name: string; value: string; type: string }> =
      [];
    Object.values(variablesByTheme).forEach((themeVars) => {
      themeVars.forEach((v) => {
        allVariables.push({
          name: v.name,
          value: v.value,
          type: v.type,
        });
      });
    });

    const themeData: Record<
      string,
      Array<{ name: string; value: string; type: string }>
    > = {};
    Object.entries(variablesByTheme).forEach(([theme, vars]) => {
      themeData[theme] = vars.map((v) => ({
        name: v.name,
        value: v.value,
        type: v.type,
      }));
    });

    const result = {
      variables: allVariables,
      count: totalVariableCount,
      themes: Object.keys(variablesByTheme),
      variablesByTheme: themeData,
    };

    console.log("📦 convertVariablesToCSS returning:", {
      variablesCount: result.variables.length,
      themesCount: result.themes.length,
      themes: result.themes,
      variablesByThemeKeys: Object.keys(result.variablesByTheme),
    });

    return result;
  } catch (error) {
    console.error("Error in conversion:", error);
    // Ensure cleanup happens even on error
    performMemoryCleanup();
    throw error;
  } finally {
    isRunning = false;
    // Final cleanup
    performMemoryCleanup();
  }
}

/**
 * Processes a batch of variables asynchronously to prevent UI blocking
 */
async function processBatchOfVariables(
  variableIds: string[],
  collection: VariableCollection,
  allModes: Record<string, string>,
  variablesByTheme: Record<
    string,
    Array<{
      name: string;
      value: string;
      type: string;
      variable: Variable | null;
    }>
  >
): Promise<void> {
  const promises = variableIds.map(async (variableId) => {
    try {
      const variable: Variable = await figma.variables.getVariableByIdAsync(
        variableId
      );

      if (!variable) {
        console.warn(`⚠️ Variable with ID ${variableId} not found`);
        return;
      }

      const cssVariableName = getCachedCSSVariableName(
        collection.name,
        variable.name
      );

      // Process variable for each theme/mode
      const variableModes = Object.keys(variable.valuesByMode || {});

      for (const modeId of variableModes) {
        const modeName = allModes[modeId] || "default";
        const cssValue = await generateCSSValue(variable, modeId, collection.name);

        if (cssValue) {
          if (!variablesByTheme[modeName]) {
            variablesByTheme[modeName] = [];
          }

          // Use object pooling to reduce garbage collection
          const variableObj = getPooledVariableObject();
          variableObj.name = cssVariableName;
          variableObj.value = cssValue;
          variableObj.type = detectVariableType(variable.name);
          variableObj.variable = variable;

          variablesByTheme[modeName].push(variableObj);

          console.log(`✅ [${modeName}] ${cssVariableName}: ${cssValue}`);
        } else {
          console.warn(
            `⚠️ Could not generate CSS value for ${variable.name} in mode ${modeName}`
          );
        }
      }
    } catch (error) {
      console.error(`❌ Error processing variable ${variableId}:`, error);
    }
  });

  // Wait for all variables in this batch to complete
  await Promise.all(promises);
}

/**
 * Updates Figma syntax in batches to prevent blocking
 */
async function updateFigmaSyntax(
  variables: Array<{
    name: string;
    value: string;
    type: string;
    variable: Variable | null;
  }>
): Promise<void> {
  const SYNTAX_BATCH_SIZE = 5; // Smaller batches for syntax updates
  let syntaxUpdateCount = 0;

  console.log(`🔧 Updating Figma syntax for ${variables.length} variables...`);

  for (let i = 0; i < variables.length; i += SYNTAX_BATCH_SIZE) {
    const batch = variables.slice(i, i + SYNTAX_BATCH_SIZE);

    for (const cssVar of batch) {
      try {
        if (cssVar.variable) {
          cssVar.variable.setVariableCodeSyntax("WEB", `var(${cssVar.name})`);
          syntaxUpdateCount++;
        }
      } catch (syntaxError) {
        console.warn(
          `⚠️ Failed to set syntax for ${cssVar.name}:`,
          syntaxError
        );
      }
    }

    // Yield control after each batch
    await new Promise<void>((resolve) => resolve());
  }

  console.log(
    `✅ Updated Figma web syntax for ${syntaxUpdateCount}/${variables.length} variables`
  );
}

/**
 * Exports CSS variables to GitHub repository
 *
 * @param variables - Array of CSS variables to export
 * @returns Promise with export results
 */
export async function exportToGitHub(data: {
  variables: Array<{ name: string; value: string; type: string }>;
  themes?: string[];
  variablesByTheme?: Record<
    string,
    Array<{ name: string; value: string; type: string }>
  >;
}): Promise<{ success: boolean; message: string }> {
  try {
    console.log("🚀 Starting GitHub export...");
    console.log("📊 Export data received:");
    console.log("   data.variables:", data.variables ? `${data.variables.length} items` : "undefined");
    console.log("   data.themes:", data.themes);
    console.log("   data.variablesByTheme:", data.variablesByTheme ? Object.keys(data.variablesByTheme) : "undefined");

    // Handle theme-aware export
    if (data.variablesByTheme && data.themes && data.themes.length > 0) {
      console.log("✅ Multi-theme mode activated!");
      console.log("   Themes to export:", data.themes);
      const themeOutput = buildThemeAwareOutput(data.variablesByTheme);
      console.log(
        "🎨 Theme-aware SCSS files generated:",
        Object.keys(themeOutput)
      );

      // Push each theme folder
      let successCount = 0;
      const totalThemes = Object.keys(themeOutput).length;

      for (const [themeName, files] of Object.entries(themeOutput)) {
        const githubResult = await pushScssFilesToGitHub(files, themeName);
        if (githubResult.success) {
          successCount++;
          console.log(`✅ Theme '${themeName}' pushed successfully`);
        } else {
          console.error(
            `❌ Failed to push theme '${themeName}':`,
            githubResult.message
          );
        }
      }

      const totalVariables = data.variables?.length || 0;
      
      if (successCount === totalThemes) {
        return {
          success: true,
          message: `Successfully exported ${totalVariables} variables across ${totalThemes} themes`,
        };
      } else {
        return {
          success: false,
          message: `Exported ${successCount}/${totalThemes} themes successfully`,
        };
      }
    } else {
      // Fallback to single theme export
      console.log("⚠️ FALLING BACK TO SINGLE THEME MODE!");
      console.log("   Reason:", 
        !data.variablesByTheme ? "variablesByTheme is missing/empty" :
        !data.themes ? "themes is missing" :
        data.themes.length === 0 ? "themes array is empty" :
        "unknown"
      );
      console.log("🔍 About to call buildSupernovaOutput with data.variables:");
      console.log("   Type:", typeof data.variables);
      console.log("   Is Array:", Array.isArray(data.variables));
      console.log("   Length:", data.variables?.length || 0);
      if (data.variables && data.variables.length > 0) {
        console.log("   First 3 items:", data.variables.slice(0, 3));
      }
      
      const supernovaOutput = buildSupernovaOutput(data.variables);
      console.log(
        "🎨 Single theme SCSS files generated:",
        Object.keys(supernovaOutput)
      );

      const githubResult = await pushScssFilesToGitHub(
        supernovaOutput,
        "theme"
      );

      const totalVariables = data.variables?.length || 0;
      
      if (githubResult.success) {
        console.log("✅ GitHub push successful:", githubResult.message);
        return {
          success: true,
          message: `Successfully exported ${totalVariables} variables`,
        };
      } else {
        console.error("❌ GitHub push failed:", githubResult.message);
        return { success: false, message: githubResult.message };
      }
    }
  } catch (error) {
    console.error("❌ Error in GitHub export:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Loads all variable collections (read-only with current API)
 */
export async function loadCollections(): Promise<{
  collections: { id: string; name: string; variableCount: number }[];
}> {
  try {
    const collections =
      await figma.variables.getLocalVariableCollectionsAsync();

    const collectionsData = collections.map((collection) => ({
      id: collection.id,
      name: collection.name,
      variableCount: collection.variableIds.length,
    }));

    return { collections: collectionsData };
  } catch (error) {
    console.error("Error loading collections:", error);
    throw new Error("Failed to load collections");
  }
}

/**
 * Loads variables for a specific collection (by matching collection ID with variables)
 */
export async function loadVariables(collectionId: string): Promise<{
  variables: {
    id: string;
    name: string;
    resolvedType: string;
    valuesByMode: Record<string, unknown>;
  }[];
}> {
  try {
    const collections =
      await figma.variables.getLocalVariableCollectionsAsync();
    const targetCollection = collections.find((c) => c.id === collectionId);

    if (!targetCollection) {
      throw new Error("Collection not found");
    }

    const variables = [];

    for (const variableId of targetCollection.variableIds) {
      const variable = await figma.variables.getVariableByIdAsync(variableId);
      if (variable) {
        variables.push({
          id: variable.id,
          name: variable.name,
          resolvedType: variable.resolvedType,
          valuesByMode: variable.valuesByMode,
        });
      }
    }

    return { variables };
  } catch (error) {
    console.error("Error loading variables:", error);
    throw new Error("Failed to load variables");
  }
}

/**
 * Creates a new variable collection - Currently not supported in limited API
 */
export async function createCollection(
  _name: string
): Promise<{ success: boolean; collection?: VariableCollection }> {
  try {
    // The current API doesn't expose collection creation methods
    throw new Error(
      "Creating collections is not available in the current API version. Please create collections manually in Figma."
    );
  } catch (error) {
    console.error("Error creating collection:", error);
    throw error instanceof Error
      ? error
      : new Error("Failed to create collection");
  }
}

/**
 * Creates a new variable in a collection - Currently not supported in limited API
 */
export async function createVariable(
  _collectionId: string,
  _name: string,
  _type: string,
  _value: string | number | RGB | RGBA
): Promise<{ success: boolean; variable?: Variable }> {
  try {
    // The current API doesn't expose variable creation methods
    throw new Error(
      "Creating variables is not available in the current API version. Please create variables manually in Figma."
    );
  } catch (error) {
    console.error("Error creating variable:", error);
    throw error instanceof Error
      ? error
      : new Error("Failed to create variable");
  }
}

/**
 * Deletes a variable collection - Currently not supported in limited API
 */
export async function deleteCollection(
  _collectionId: string
): Promise<{ success: boolean }> {
  try {
    // The current API doesn't expose collection deletion methods
    throw new Error(
      "Deleting collections is not available in the current API version. Please delete collections manually in Figma."
    );
  } catch (error) {
    console.error("Error deleting collection:", error);
    throw error instanceof Error
      ? error
      : new Error("Failed to delete collection");
  }
}

/**
 * Deletes a variable - Currently not supported in limited API
 */
export async function deleteVariable(
  _variableId: string
): Promise<{ success: boolean }> {
  try {
    // The current API doesn't expose variable deletion methods
    throw new Error(
      "Deleting variables is not available in the current API version. Please delete variables manually in Figma."
    );
  } catch (error) {
    console.error("Error deleting variable:", error);
    throw error instanceof Error
      ? error
      : new Error("Failed to delete variable");
  }
}

/**
 * Main plugin entry point with UI support
 */
function main() {
  try {
    console.log("🚀 Plugin starting...");

    // Show the UI with increased height for the new tabs
    figma.showUI(__html__, {
      width: 320,
      height: 580,
      themeColors: true,
    });

    console.log("✅ UI loaded successfully");
  } catch (error) {
    console.error("❌ Failed to initialize plugin:", error);
    figma.notify("Plugin failed to load. Check console for details.", {
      error: true,
    });
    return;
  }

  // Handle messages from UI
  figma.ui.onmessage = async (msg) => {
    const message = msg as {
      type: string;
      variables?: {
        variables: Array<{ name: string; value: string; type: string }>;
        themes?: string[];
        variablesByTheme?: Record<string, Array<{ name: string; value: string; type: string }>>;
      };
      collectionId?: string;
      name?: string;
      variableId?: string;
      value?: unknown;
      variableType?: string;
    };
    
    const {
      type,
      collectionId,
      name,
      variableId,
      value,
      variableType,
    } = message;

    try {
      switch (type) {
        // Design Tokens Messages
        case "load-collections":
          try {
            const result = await loadCollections();
            figma.ui.postMessage({
              type: "collections-loaded",
              data: result,
            });
          } catch (error) {
            figma.ui.postMessage({
              type: "error",
              data: {
                message:
                  error instanceof Error
                    ? error.message
                    : "Failed to load collections",
              },
            });
          }
          break;

        case "load-variables":
          try {
            if (!collectionId) {
              throw new Error("Collection ID is required");
            }
            const result = await loadVariables(collectionId);
            figma.ui.postMessage({
              type: "variables-loaded",
              data: result,
            });
          } catch (error) {
            figma.ui.postMessage({
              type: "error",
              data: {
                message:
                  error instanceof Error
                    ? error.message
                    : "Failed to load variables",
              },
            });
          }
          break;

        case "create-collection":
          try {
            if (!name) {
              throw new Error("Collection name is required");
            }
            await createCollection(name);
            figma.ui.postMessage({
              type: "collection-created",
              data: { success: true },
            });
          } catch (error) {
            figma.ui.postMessage({
              type: "error",
              data: {
                message:
                  error instanceof Error
                    ? error.message
                    : "Failed to create collection",
              },
            });
          }
          break;

        case "create-variable":
          try {
            if (!collectionId || !name) {
              throw new Error("Collection ID and variable name are required");
            }
            await createVariable(
              collectionId,
              name,
              variableType || "COLOR",
              value as string | number | RGB | RGBA
            );
            figma.ui.postMessage({
              type: "variable-created",
              data: { success: true },
            });
          } catch (error) {
            figma.ui.postMessage({
              type: "error",
              data: {
                message:
                  error instanceof Error
                    ? error.message
                    : "Failed to create variable",
              },
            });
          }
          break;

        case "delete-collection":
          try {
            if (!collectionId) {
              throw new Error("Collection ID is required");
            }
            await deleteCollection(collectionId);
            figma.ui.postMessage({
              type: "collection-deleted",
              data: { success: true },
            });
          } catch (error) {
            figma.ui.postMessage({
              type: "error",
              data: {
                message:
                  error instanceof Error
                    ? error.message
                    : "Failed to delete collection",
              },
            });
          }
          break;

        case "delete-variable":
          try {
            if (!variableId) {
              throw new Error("Variable ID is required");
            }
            await deleteVariable(variableId);
            figma.ui.postMessage({
              type: "variable-deleted",
              data: { success: true },
            });
          } catch (error) {
            figma.ui.postMessage({
              type: "error",
              data: {
                message:
                  error instanceof Error
                    ? error.message
                    : "Failed to delete variable",
              },
            });
          }
          break;

        // Converter Messages (existing functionality)
        case "convert-variables":
          try {
            const result = await convertVariablesToCSS();
            
            // Cache the full result for export
            lastConversionResult = result;
            
            console.log("📤 Sending to UI:");
            console.log("   variablesCount:", result.variables.length);
            console.log("   themesCount:", result.themes?.length || 0);
            console.log("   themes:", result.themes);
            console.log("   hasVariablesByTheme:", !!result.variablesByTheme);
            console.log("   variablesByTheme keys:", result.variablesByTheme ? Object.keys(result.variablesByTheme) : "UNDEFINED");
            console.log("   ✅ Cached conversion result");
            
            figma.ui.postMessage({
              type: "convert-success",
              data: {
                variables: result.variables,
                count: result.count,
                themes: result.themes,
                variablesByTheme: result.variablesByTheme,
              },
            });
          } catch (error) {
            figma.ui.postMessage({
              type: "convert-error",
              data: {
                message:
                  error instanceof Error ? error.message : "Unknown error",
              },
            });
          }
          break;

        // Exporter Messages (existing functionality)
        case "export-github": {
          console.log("📥 Received export-github message");
          
          if (!lastConversionResult) {
            figma.ui.postMessage({
              type: "export-error",
              data: { message: "No variables to export. Please convert variables first." },
            });
            return;
          }

          try {
            // Use cached conversion result to preserve theme data
            const exportData = {
              variables: lastConversionResult.variables,
              themes: lastConversionResult.themes,
              variablesByTheme: lastConversionResult.variablesByTheme,
            };
            
            console.log("🔄 Using cached conversion result:");
            console.log("   variables:", exportData.variables.length, "items");
            console.log("   themes:", exportData.themes);
            console.log("   variablesByTheme:", exportData.variablesByTheme ? Object.keys(exportData.variablesByTheme) : "MISSING");
            
            const result = await exportToGitHub(exportData);
            if (result.success) {
              figma.ui.postMessage({
                type: "export-success",
                data: { message: result.message },
              });
            } else {
              figma.ui.postMessage({
                type: "export-error",
                data: { message: result.message },
              });
            }
          } catch (error) {
            figma.ui.postMessage({
              type: "export-error",
              data: {
                message:
                  error instanceof Error ? error.message : "Unknown error",
              },
            });
          }
          break;
        }

        case "close-plugin":
          figma.closePlugin();
          break;

        default:
          console.warn("Unknown message type:", type);
      }
    } catch (error) {
      console.error("Error handling message:", error);
      figma.ui.postMessage({
        type: "status-update",
        data: {
          message: "An unexpected error occurred",
          type: "error",
        },
      });
    }
  };
}

// Start the plugin with UI
main();
