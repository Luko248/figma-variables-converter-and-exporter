/**
 * Main plugin entry point
 * Refactored with clean service-based architecture
 */

import "./types/figma.types";
import { ConversionResult } from "./types/index";
import { convertVariablesToCSS } from "./services/variable-conversion.service";
import { exportToGitHub } from "./services/export.service";
import { GITHUB_CONFIG } from "./config";

// Storage key for GitHub config
const GITHUB_CONFIG_STORAGE_KEY = "figma-tokens-github-config";

// Global flag to prevent multiple executions
let isRunning = false;

// Cache for the last conversion result
let lastConversionResult: ConversionResult | null = null;

/**
 * Load GitHub config from persistent storage
 */
async function loadGitHubConfigFromStorage(): Promise<void> {
  try {
    const storedConfig = (await figma.clientStorage.getAsync(
      GITHUB_CONFIG_STORAGE_KEY
    )) as
      | {
          owner?: string;
          repo?: string;
          path?: string;
          token?: string;
        }
      | undefined;

    if (storedConfig) {
      if (storedConfig.owner) GITHUB_CONFIG.owner = storedConfig.owner;
      if (storedConfig.repo) GITHUB_CONFIG.repo = storedConfig.repo;
      if (storedConfig.path) GITHUB_CONFIG.path = storedConfig.path;
      if (storedConfig.token) GITHUB_CONFIG.token = storedConfig.token;
      console.log("✅ Loaded GitHub config from storage");
    }
  } catch (error) {
    console.warn("⚠️ Could not load GitHub config from storage:", error);
  }
}

/**
 * Save GitHub config to persistent storage
 */
async function saveGitHubConfigToStorage(): Promise<void> {
  try {
    await figma.clientStorage.setAsync(GITHUB_CONFIG_STORAGE_KEY, {
      owner: GITHUB_CONFIG.owner,
      repo: GITHUB_CONFIG.repo,
      path: GITHUB_CONFIG.path,
      token: GITHUB_CONFIG.token,
    });
    console.log("✅ Saved GitHub config to storage");
  } catch (error) {
    console.warn("⚠️ Could not save GitHub config to storage:", error);
  }
}

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
async function handleExportToGitHub(): Promise<{
  success: boolean;
  message: string;
}> {
  if (!lastConversionResult) {
    throw new Error("No variables to export. Please convert variables first.");
  }

  return await exportToGitHub(lastConversionResult);
}

/**
 * Main plugin entry point
 */
async function main() {
  try {
    console.log("🚀 Plugin starting...");
    console.log("📍 Editor type:", figma.editorType);
    console.log("📍 Mode:", figma.mode || "normal");

    // Load saved GitHub config first
    await loadGitHubConfigFromStorage();

    // Handle Codegen event in Dev Mode (prevents timeout)
    if (figma.editorType === "dev" && figma.codegen) {
      figma.codegen.on("generate", () => {
        return [
          {
            language: "CSS",
            code: "/* Open the plugin UI to convert variables */",
            title: "CSS Variables Converter",
          },
        ];
      });
    }

    // Show the UI (Dev Mode supports UI when launched as a normal plugin)
    figma.showUI(__html__, {
      width: 420,
      height: 700,
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

    const { type, collectionId } = message;

    try {
      switch (type) {
        // UI Ready
        case "ui-ready":
          // Send editor type and saved config when UI is ready
          figma.ui.postMessage({
            type: "editor-type",
            data: { editorType: figma.editorType },
          });
          // Send saved GitHub config to UI
          if (
            GITHUB_CONFIG.owner ||
            GITHUB_CONFIG.repo ||
            GITHUB_CONFIG.path ||
            GITHUB_CONFIG.token
          ) {
            figma.ui.postMessage({
              type: "load-saved-config",
              data: {
                owner: GITHUB_CONFIG.owner,
                repo: GITHUB_CONFIG.repo,
                path: GITHUB_CONFIG.path,
                token: GITHUB_CONFIG.token,
              },
            });
          }
          break;

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

            // Save to persistent storage
            await saveGitHubConfigToStorage();
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
