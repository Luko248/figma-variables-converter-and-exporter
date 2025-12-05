/**
 * Export orchestration service
 */

import { ConversionResult } from "../types/index";
import { buildCssOutput, buildThemeAwareCssOutput } from "./css-builder.service";
import { pushCssThemesToGitHub } from "../github-service";
import { GITHUB_CONFIG } from "../config";

function assertGitHubConfig(): void {
  const missing: string[] = [];
  if (!GITHUB_CONFIG.owner) missing.push("owner");
  if (!GITHUB_CONFIG.repo) missing.push("repo");
  if (!GITHUB_CONFIG.path) missing.push("path");
  if (!GITHUB_CONFIG.token) missing.push("token");

  if (missing.length) {
    throw new Error(
      `GitHub configuration is incomplete. Missing: ${missing.join(", ")}`
    );
  }
}

/**
 * Exports CSS variables to GitHub repository
 */
export async function exportToGitHub(
  data: ConversionResult
): Promise<{ success: boolean; message: string }> {
  try {
    assertGitHubConfig();

    console.log("🚀 Starting GitHub export...");
    console.log("📊 Export data received:");
    console.log(
      "   data.variables:",
      data.variables ? `${data.variables.length} items` : "undefined"
    );
    console.log("   data.themes:", data.themes);
    console.log(
      "   data.variablesByTheme:",
      data.variablesByTheme ? Object.keys(data.variablesByTheme) : "undefined"
    );

    // Handle theme-aware export
    if (data.variablesByTheme && data.themes && data.themes.length > 0) {
      console.log("✅ Multi-theme mode activated!");
      console.log("   Themes to export:", data.themes);
      const themeOutput = buildThemeAwareCssOutput(data.variablesByTheme);
      console.log("🎨 Theme-aware CSS files generated:", Object.keys(themeOutput));

      const totalThemes = Object.keys(themeOutput).length;
      const totalVariables = data.variables?.length || 0;

      console.log(`📤 Pushing ${totalThemes} theme(s) in a single commit...`);
      const githubResult = await pushCssThemesToGitHub(themeOutput);

      if (githubResult.success) {
        console.log(`✅ All themes pushed successfully in one commit`);
        return {
          success: true,
          message: `Successfully exported ${totalVariables} variables across ${totalThemes} theme(s) in a single commit`,
        };
      } else {
        console.error(`❌ Failed to push themes:`, githubResult.message);
        return {
          success: false,
          message: githubResult.message,
        };
      }
    } else {
      // Fallback to single theme export
      console.log("⚠️ FALLING BACK TO SINGLE THEME MODE!");
      const cssOutput = buildCssOutput(data.variables);
      const githubResult = await pushCssThemesToGitHub({ theme: cssOutput });

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
