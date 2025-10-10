/**
 * Export orchestration service
 */

import { ConversionResult } from "../types/index";
import { buildSupernovaOutput, buildThemeAwareOutput } from "./scss-builder.service";
import { pushAllThemesToGitHub, pushScssFilesToGitHub } from "../github-service";

/**
 * Exports CSS variables to GitHub repository
 */
export async function exportToGitHub(
  data: ConversionResult
): Promise<{ success: boolean; message: string }> {
  try {
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
      const themeOutput = buildThemeAwareOutput(data.variablesByTheme);
      console.log(
        "🎨 Theme-aware SCSS files generated:",
        Object.keys(themeOutput)
      );

      // Push all themes in a single commit
      const totalThemes = Object.keys(themeOutput).length;
      const totalVariables = data.variables?.length || 0;

      console.log(`📤 Pushing ${totalThemes} theme(s) in a single commit...`);
      const githubResult = await pushAllThemesToGitHub(themeOutput);

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
      console.log(
        "   Reason:",
        !data.variablesByTheme
          ? "variablesByTheme is missing/empty"
          : !data.themes
          ? "themes is missing"
          : data.themes.length === 0
          ? "themes array is empty"
          : "unknown"
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
