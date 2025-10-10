/**
 * GitHub API service for pushing CSS variables to repository
 */
import { base64Encode } from "./helpers/string.helper";
import { GITHUB_CONFIG, GITHUB_API_BASE } from "./config";
import { GitHubFileResponse, GitHubApiResponse, ScssFileOutput } from "./types/index";

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
 * Pushes multiple themes (with their SCSS files) to GitHub in a single commit
 *
 * @param themeFiles - Object mapping theme names to their SCSS files
 * @returns Result object with success status and details
 */
export async function pushAllThemesToGitHub(
  themeFiles: Record<string, ScssFileOutput>
): Promise<GitHubApiResponse> {
  try {
    console.log("🚀 Starting multi-theme SCSS files push...");
    const themeNames = Object.keys(themeFiles);
    console.log(`📦 Pushing ${themeNames.length} theme(s):`, themeNames);

    // Validate GITHUB_CONFIG
    if (!GITHUB_CONFIG.path) {
      throw new Error(
        "GitHub config path is not set. Please update your config.json with a directory path (e.g., 'src/styles/tokens')"
      );
    }

    const exportTimestamp = new Date();
    const formattedExportTimestamp = exportTimestamp.toISOString();

    // Get the current reference (branch) SHA
    const refUrl = `${GITHUB_API_BASE}/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/git/refs/heads/${GITHUB_CONFIG.branch}`;
    const refResponse = await fetch(refUrl, {
      headers: {
        Authorization: `Bearer ${GITHUB_CONFIG.token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "Figma-Variables-Plugin",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!refResponse.ok) {
      throw new Error(
        `Failed to get branch reference: ${refResponse.status} ${refResponse.statusText}`
      );
    }

    const refData = (await refResponse.json()) as {
      object: { sha: string };
    };
    const currentCommitSha = refData.object.sha;
    console.log(`📍 Current commit SHA: ${currentCommitSha}`);

    // Get the current commit to access its tree
    const commitUrl = `${GITHUB_API_BASE}/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/git/commits/${currentCommitSha}`;
    const commitResponse = await fetch(commitUrl, {
      headers: {
        Authorization: `Bearer ${GITHUB_CONFIG.token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "Figma-Variables-Plugin",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!commitResponse.ok) {
      throw new Error(
        `Failed to get commit: ${commitResponse.status} ${commitResponse.statusText}`
      );
    }

    const commitData = (await commitResponse.json()) as {
      tree: { sha: string };
    };
    const baseTreeSha = commitData.tree.sha;
    console.log(`🌳 Base tree SHA: ${baseTreeSha}`);

    // Create blobs for all files across all themes
    const treeItems = [];
    let totalFiles = 0;

    for (const [themeName, files] of Object.entries(themeFiles)) {
      console.log(`📁 Processing theme: ${themeName}`);
      
      const fileList = [
        { name: "_colors.scss", content: files.colors || "/* No colors */" },
        { name: "_measures.scss", content: files.measures || "/* No measures */" },
        { name: "_fonts.scss", content: files.fonts || "/* No fonts */" },
        { name: "_shadows.scss", content: files.shadows || "/* No shadows */" },
        { name: "_gradients.scss", content: files.gradients || "/* No gradients */" },
        { name: "__index.scss", content: files.index || "" },
        { name: "_root.scss", content: files.root || "" },
      ];

      for (const file of fileList) {
        console.log(`📝 Creating blob for: ${themeName}/${file.name}`);
        const filePath = `${GITHUB_CONFIG.path}/${themeName}/${file.name}`;

        const blobUrl = `${GITHUB_API_BASE}/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/git/blobs`;
        const blobResponse = await fetch(blobUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${GITHUB_CONFIG.token}`,
            Accept: "application/vnd.github+json",
            "Content-Type": "application/json",
            "User-Agent": "Figma-Variables-Plugin",
            "X-GitHub-Api-Version": "2022-11-28",
          },
          body: JSON.stringify({
            content: base64Encode(file.content),
            encoding: "base64",
          }),
        });

        if (!blobResponse.ok) {
          throw new Error(
            `Failed to create blob for ${themeName}/${file.name}: ${blobResponse.status}`
          );
        }

        const blobData = (await blobResponse.json()) as { sha: string };
        treeItems.push({
          path: filePath,
          mode: "100644",
          type: "blob",
          sha: blobData.sha,
        });
        totalFiles++;
        console.log(`✅ Blob created for ${themeName}/${file.name}`);
      }
    }

    // Create a new tree with all the file changes
    const treeUrl = `${GITHUB_API_BASE}/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/git/trees`;
    const treeResponse = await fetch(treeUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GITHUB_CONFIG.token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "User-Agent": "Figma-Variables-Plugin",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree: treeItems,
      }),
    });

    if (!treeResponse.ok) {
      throw new Error(
        `Failed to create tree: ${treeResponse.status} ${treeResponse.statusText}`
      );
    }

    const treeData = (await treeResponse.json()) as { sha: string };
    const newTreeSha = treeData.sha;
    console.log(`🌳 New tree created: ${newTreeSha}`);

    // Create a new commit with the tree
    const themesLabel = themeNames.length === 1 ? themeNames[0] : `${themeNames.length} themes (${themeNames.join(", ")})`;
    const commitMessage = `feat(design-tokens): Figma variables exported - ${themesLabel}\n\nExported at: ${formattedExportTimestamp}`;
    const newCommitUrl = `${GITHUB_API_BASE}/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/git/commits`;
    const newCommitResponse = await fetch(newCommitUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GITHUB_CONFIG.token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "User-Agent": "Figma-Variables-Plugin",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        message: commitMessage,
        tree: newTreeSha,
        parents: [currentCommitSha],
      }),
    });

    if (!newCommitResponse.ok) {
      throw new Error(
        `Failed to create commit: ${newCommitResponse.status} ${newCommitResponse.statusText}`
      );
    }

    const newCommitData = (await newCommitResponse.json()) as { sha: string };
    const newCommitSha = newCommitData.sha;
    console.log(`💾 New commit created: ${newCommitSha}`);

    // Update the branch reference to point to the new commit
    const updateRefUrl = `${GITHUB_API_BASE}/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/git/refs/heads/${GITHUB_CONFIG.branch}`;
    const updateRefResponse = await fetch(updateRefUrl, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${GITHUB_CONFIG.token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "User-Agent": "Figma-Variables-Plugin",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        sha: newCommitSha,
        force: false,
      }),
    });

    if (!updateRefResponse.ok) {
      throw new Error(
        `Failed to update branch: ${updateRefResponse.status} ${updateRefResponse.statusText}`
      );
    }

    console.log(`✅ Branch ${GITHUB_CONFIG.branch} updated successfully`);

    return {
      success: true,
      message: `Successfully pushed ${totalFiles} files across ${themeNames.length} theme(s) in a single commit`,
      sha: newCommitSha,
    };
  } catch (error) {
    console.error("❌ Error pushing themes to GitHub:", error);
    return {
      success: false,
      message: `Error: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}

/**
 * Pushes multiple SCSS files to GitHub repository in a single commit
 * @deprecated Use pushAllThemesToGitHub for multi-theme support
 * @param files - Object containing file contents by name
 * @param basePath - Base directory path for the files
 * @returns Result object with success status and details
 */
export async function pushScssFilesToGitHub(
  files: ScssFileOutput,
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

    const exportTimestamp = new Date();
    const formattedExportTimestamp = exportTimestamp.toISOString();

    // Get the current reference (branch) SHA
    const refUrl = `${GITHUB_API_BASE}/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/git/refs/heads/${GITHUB_CONFIG.branch}`;
    const refResponse = await fetch(refUrl, {
      headers: {
        Authorization: `Bearer ${GITHUB_CONFIG.token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "Figma-Variables-Plugin",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!refResponse.ok) {
      throw new Error(
        `Failed to get branch reference: ${refResponse.status} ${refResponse.statusText}`
      );
    }

    const refData = (await refResponse.json()) as {
      object: { sha: string };
    };
    const currentCommitSha = refData.object.sha;
    console.log(`📍 Current commit SHA: ${currentCommitSha}`);

    // Get the current commit to access its tree
    const commitUrl = `${GITHUB_API_BASE}/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/git/commits/${currentCommitSha}`;
    const commitResponse = await fetch(commitUrl, {
      headers: {
        Authorization: `Bearer ${GITHUB_CONFIG.token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "Figma-Variables-Plugin",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!commitResponse.ok) {
      throw new Error(
        `Failed to get commit: ${commitResponse.status} ${commitResponse.statusText}`
      );
    }

    const commitData = (await commitResponse.json()) as {
      tree: { sha: string };
    };
    const baseTreeSha = commitData.tree.sha;
    console.log(`🌳 Base tree SHA: ${baseTreeSha}`);

    // Create blobs for all files
    const treeItems = [];
    for (const file of fileList) {
      console.log(`📝 Creating blob for: ${file.name}`);
      const filePath = `${GITHUB_CONFIG.path}/${basePath}/${file.name}`;

      const blobUrl = `${GITHUB_API_BASE}/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/git/blobs`;
      const blobResponse = await fetch(blobUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GITHUB_CONFIG.token}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
          "User-Agent": "Figma-Variables-Plugin",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        body: JSON.stringify({
          content: base64Encode(file.content),
          encoding: "base64",
        }),
      });

      if (!blobResponse.ok) {
        throw new Error(
          `Failed to create blob for ${file.name}: ${blobResponse.status}`
        );
      }

      const blobData = (await blobResponse.json()) as { sha: string };
      treeItems.push({
        path: filePath,
        mode: "100644",
        type: "blob",
        sha: blobData.sha,
      });
      console.log(`✅ Blob created for ${file.name}`);
    }

    // Create a new tree with all the file changes
    const treeUrl = `${GITHUB_API_BASE}/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/git/trees`;
    const treeResponse = await fetch(treeUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GITHUB_CONFIG.token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "User-Agent": "Figma-Variables-Plugin",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree: treeItems,
      }),
    });

    if (!treeResponse.ok) {
      throw new Error(
        `Failed to create tree: ${treeResponse.status} ${treeResponse.statusText}`
      );
    }

    const treeData = (await treeResponse.json()) as { sha: string };
    const newTreeSha = treeData.sha;
    console.log(`🌳 New tree created: ${newTreeSha}`);

    // Create a new commit with the tree
    const commitMessage = `feat(design-tokens): Figma variables exported ${formattedExportTimestamp}`;
    const newCommitUrl = `${GITHUB_API_BASE}/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/git/commits`;
    const newCommitResponse = await fetch(newCommitUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GITHUB_CONFIG.token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "User-Agent": "Figma-Variables-Plugin",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        message: commitMessage,
        tree: newTreeSha,
        parents: [currentCommitSha],
      }),
    });

    if (!newCommitResponse.ok) {
      throw new Error(
        `Failed to create commit: ${newCommitResponse.status} ${newCommitResponse.statusText}`
      );
    }

    const newCommitData = (await newCommitResponse.json()) as { sha: string };
    const newCommitSha = newCommitData.sha;
    console.log(`💾 New commit created: ${newCommitSha}`);

    // Update the branch reference to point to the new commit
    const updateRefUrl = `${GITHUB_API_BASE}/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/git/refs/heads/${GITHUB_CONFIG.branch}`;
    const updateRefResponse = await fetch(updateRefUrl, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${GITHUB_CONFIG.token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "User-Agent": "Figma-Variables-Plugin",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        sha: newCommitSha,
        force: false,
      }),
    });

    if (!updateRefResponse.ok) {
      throw new Error(
        `Failed to update branch: ${updateRefResponse.status} ${updateRefResponse.statusText}`
      );
    }

    console.log(`✅ Branch ${GITHUB_CONFIG.branch} updated successfully`);

    return {
      success: true,
      message: `Successfully pushed all ${fileList.length} SCSS files to ${basePath}/ in a single commit`,
      sha: newCommitSha,
    };
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
