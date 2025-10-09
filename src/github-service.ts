/**
 * GitHub API service for pushing CSS variables to repository
 */
import { base64Encode } from "./utils";
import { GITHUB_CONFIG, GITHUB_API_BASE } from "./config";

/** Response structure for GitHub file API */
interface GitHubFileResponse {
  sha?: string;
  content?: string;
}

/** Standardized response format for GitHub operations */
interface GitHubApiResponse {
  success: boolean;
  message: string;
  sha?: string;
}

/**
 * Checks if a file exists in the GitHub repository
 *
 * @param filePath - Path to the file in the repository
 * @returns File information if exists, null if not found
 */
export async function checkFileExists(
  filePath: string
): Promise<GitHubFileResponse | null> {
  try {
    const url = `${GITHUB_API_BASE}/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${filePath}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${GITHUB_CONFIG.token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "Figma-Variables-Plugin",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (response.status === 404) {
      return null; // File doesn't exist
    }

    if (!response.ok) {
      throw new Error(
        `GitHub API error: ${response.status} ${response.statusText}`
      );
    }

    const data = (await response.json()) as { sha: string; content: string };
    return {
      sha: data.sha,
      content: data.content,
    };
  } catch (error) {
    console.error("Error checking file existence:", error);
    return null;
  }
}

/**
 * Pushes multiple SCSS files to GitHub repository
 *
 * @param files - Object containing file contents by name
 * @param basePath - Base directory path for the files
 * @returns Result object with success status and details
 */
export async function pushScssFilesToGitHub(
  files: {
    colors: string;
    measures: string;
    fonts: string;
    shadows: string;
    gradients: string;
    index: string;
    root: string;
  },
  basePath: string = "tokens"
): Promise<GitHubApiResponse> {
  try {
    console.log("🚀 Starting SCSS files push...");
    console.log("📦 Received files object with sizes:", {
      colors: files?.colors?.length || 0,
      measures: files?.measures?.length || 0,
      fonts: files?.fonts?.length || 0,
      shadows: files?.shadows?.length || 0,
      gradients: files?.gradients?.length || 0,
      index: files?.index?.length || 0,
      root: files?.root?.length || 0,
    });

    // Validate that files object has all required properties
    if (!files || typeof files !== "object") {
      throw new Error("Invalid files object provided");
    }

    // Validate GITHUB_CONFIG
    if (!GITHUB_CONFIG.path) {
      throw new Error(
        "GitHub config path is not set. Please update your config.json with a directory path (e.g., 'src/styles/tokens')"
      );
    }

    const fileList = [
      { name: "_colors.scss", content: files.colors || "/* No colors */" },
      {
        name: "_measures.scss",
        content: files.measures || "/* No measures */",
      },
      { name: "_fonts.scss", content: files.fonts || "/* No fonts */" },
      { name: "_shadows.scss", content: files.shadows || "/* No shadows */" },
      {
        name: "_gradients.scss",
        content: files.gradients || "/* No gradients */",
      },
      { name: "__index.scss", content: files.index || "" },
      { name: "_root.scss", content: files.root || "" },
    ];

    const results: Array<{ file: string; success: boolean; message: string }> =
      [];

    const exportTimestamp = new Date();
    const formattedExportTimestamp = exportTimestamp.toISOString();

    for (const file of fileList) {
      try {
        console.log(`📝 Processing file: ${file.name}`);
        console.log(`   Content type: ${typeof file.content}`);
        console.log(`   Content length: ${file.content?.length || 0} chars`);

        const filePath = `${GITHUB_CONFIG.path}/${basePath}/${file.name}`;
        console.log(`   Target path: ${filePath}`);

        const existingFile = await checkFileExists(filePath);
        const isUpdate = existingFile !== null;
        console.log(`   File ${isUpdate ? "exists" : "does not exist"}`);

        const url = `${GITHUB_API_BASE}/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${filePath}`;

        console.log(`   Encoding content...`);
        const encodedContent = base64Encode(file.content);
        console.log(`   Encoded successfully (${encodedContent.length} chars)`);

        const requestBody = {
          message: `feat(design tokens): New version of Figma variables exported\n\n- Generated at ${formattedExportTimestamp}\n- Token format with mixins\n- Organized by category`,
          content: encodedContent,
          branch: GITHUB_CONFIG.branch,
          ...(isUpdate && existingFile?.sha ? { sha: existingFile.sha } : {}),
        };

        const response = await fetch(url, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${GITHUB_CONFIG.token}`,
            Accept: "application/vnd.github+json",
            "Content-Type": "application/json",
            "User-Agent": "Figma-Variables-Plugin",
            "X-GitHub-Api-Version": "2022-11-28",
          },
          body: JSON.stringify(requestBody),
        });

        if (response.ok) {
          results.push({
            file: file.name,
            success: true,
            message: `Successfully ${isUpdate ? "updated" : "created"} ${
              file.name
            }`,
          });
          console.log(`✅ ${file.name} pushed successfully`);
        } else {
          const errorData = await response.json();
          results.push({
            file: file.name,
            success: false,
            message: `Failed to push ${file.name}: ${response.status} ${response.statusText}`,
          });
          console.error(`❌ Failed to push ${file.name}:`, errorData);
        }
      } catch (fileError) {
        results.push({
          file: file.name,
          success: false,
          message: `Error pushing ${file.name}: ${
            fileError instanceof Error ? fileError.message : "Unknown error"
          }`,
        });
        console.error(`❌ Error pushing ${file.name}:`, fileError);
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const totalCount = results.length;

    if (successCount === totalCount) {
      return {
        success: true,
        message: `Successfully pushed all ${totalCount} SCSS files to ${basePath}/`,
      };
    } else {
      const failedFiles = results
        .filter((r) => !r.success)
        .map((r) => r.file)
        .join(", ");
      return {
        success: false,
        message: `Pushed ${successCount}/${totalCount} files. Failed: ${failedFiles}`,
      };
    }
  } catch (error) {
    console.error("❌ Error pushing SCSS files to GitHub:", error);
    return {
      success: false,
      message: `Error: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}

/**
 * Pushes CSS content to GitHub repository
 * Creates new file or updates existing file with generated CSS variables
 *
 * @param content - CSS content to push to repository
 * @returns Result object with success status and details
 */
export async function pushToGitHub(
  content: string
): Promise<GitHubApiResponse> {
  try {
    console.log("🚀 Starting GitHub push...");

    // Check if file exists to get SHA for updates
    const existingFile = await checkFileExists(GITHUB_CONFIG.path);
    const isUpdate = existingFile !== null;

    console.log(
      `📁 File ${isUpdate ? "exists" : "does not exist"}, ${
        isUpdate ? "updating" : "creating"
      }...`
    );

    const url = `${GITHUB_API_BASE}/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.path}`;

    const requestBody = {
      message: `feat: update CSS variables from Figma\n\n- Generated at ${new Date().toISOString()}\n- Updated variable names to development-friendly format\n- HSL colors with decimal alpha support\n- Rem units for consistent sizing\n- Semantic naming with type prefixes`,
      content: base64Encode(content),
      branch: GITHUB_CONFIG.branch,
      ...(isUpdate && existingFile?.sha ? { sha: existingFile.sha } : {}),
    };

    console.log("📤 Sending request to GitHub API...");

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${GITHUB_CONFIG.token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "User-Agent": "Figma-Variables-Plugin",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify(requestBody),
    });

    const responseData = (await response.json()) as {
      message?: string;
      content?: { sha: string };
    };

    if (!response.ok) {
      console.error("❌ GitHub API error:", {
        status: response.status,
        statusText: response.statusText,
        response: responseData,
        url: url,
        token: GITHUB_CONFIG.token
          ? `${GITHUB_CONFIG.token.substring(0, 10)}...`
          : "NO TOKEN",
      });
      return {
        success: false,
        message: `GitHub API error: ${response.status} ${
          response.statusText
        } - ${responseData.message || "Unknown error"}`,
      };
    }

    console.log("✅ Successfully pushed to GitHub!");

    return {
      success: true,
      message: `Successfully ${isUpdate ? "updated" : "created"} ${
        GITHUB_CONFIG.path
      }`,
      sha: responseData.content?.sha,
    };
  } catch (error) {
    console.error("❌ Error pushing to GitHub:", error);
    return {
      success: false,
      message: `Error: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}
