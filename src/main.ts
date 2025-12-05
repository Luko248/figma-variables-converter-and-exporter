/**
 * Main plugin entry point
 * Refactored with clean service-based architecture
 */

import "./types/figma.types";
import { ConversionResult } from "./types/index";
import { convertVariablesToCSS } from "./services/variable-conversion.service";
import { exportToGitHub } from "./services/export.service";
import { GITHUB_CONFIG } from "./config";

// Global flag to prevent multiple executions
let isRunning = false;

// Cache for the last conversion result
let lastConversionResult: ConversionResult | null = null;

/**
 * Loads all variable collections
 */
async function loadCollections(): Promise<{
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
 * Loads variables for a specific collection
 */
async function loadVariables(collectionId: string): Promise<{
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
 * Wrapper for conversion with execution control
 */
async function handleConvertVariables(): Promise<ConversionResult> {
  if (isRunning) {
    console.log("⚠️ Plugin already running, ignoring duplicate call");
    throw new Error("Plugin already running");
  }

  isRunning = true;

  try {
    const result = await convertVariablesToCSS();
    lastConversionResult = result;
    return result;
  } finally {
    isRunning = false;
  }
}

/**
 * Wrapper for export with cached result
 */
async function handleExportToGitHub(): Promise<{ success: boolean; message: string }> {
  if (!lastConversionResult) {
    throw new Error("No variables to export. Please convert variables first.");
  }

  return await exportToGitHub(lastConversionResult);
}

/**
 * Main plugin entry point
 */
function main() {
  try {
    console.log("🚀 Plugin starting...");

    // Show the UI
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
      collectionId?: string;
      name?: string;
      variableId?: string;
      value?: unknown;
      variableType?: string;
      githubConfig?: {
        owner?: string;
        repo?: string;
        path?: string;
        token?: string;
      };
    };

    const { type, collectionId, name, variableId, value, variableType } =
      message;

    try {
      switch (type) {
        // Collection Management
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
          figma.ui.postMessage({
            type: "error",
            data: {
              message:
                "Creating collections is not available in the current API version. Please create collections manually in Figma.",
            },
          });
          break;

        case "create-variable":
          figma.ui.postMessage({
            type: "error",
            data: {
              message:
                "Creating variables is not available in the current API version. Please create variables manually in Figma.",
            },
          });
          break;

        case "delete-collection":
          figma.ui.postMessage({
            type: "error",
            data: {
              message:
                "Deleting collections is not available in the current API version. Please delete collections manually in Figma.",
            },
          });
          break;

        case "delete-variable":
          figma.ui.postMessage({
            type: "error",
            data: {
              message:
                "Deleting variables is not available in the current API version. Please delete variables manually in Figma.",
            },
          });
          break;

        // Converter
        case "convert-variables":
          try {
            const result = await handleConvertVariables();

            console.log("📤 Sending to UI:");
            console.log("   variablesCount:", result.variables.length);
            console.log("   themesCount:", result.themes?.length || 0);
            console.log("   themes:", result.themes);

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

        // Exporter
        case "export-github": {
          console.log("📥 Received export-github message");

          try {
            const result = await handleExportToGitHub();
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

        case "update-config": {
          const cfg = message.githubConfig;
          if (cfg) {
            if (cfg.owner !== undefined) GITHUB_CONFIG.owner = cfg.owner;
            if (cfg.repo !== undefined) GITHUB_CONFIG.repo = cfg.repo;
            if (cfg.path !== undefined) GITHUB_CONFIG.path = cfg.path;
            if (cfg.token !== undefined) GITHUB_CONFIG.token = cfg.token;
          }

          figma.ui.postMessage({
            type: "config-updated",
          });
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

// Start the plugin
main();
