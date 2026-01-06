/**
 * GitHub API service for pushing CSS variables to repository
 */
import { base64Encode } from "./helpers/string.helper";
import { GITHUB_CONFIG, GITHUB_API_BASE } from "./config";
import { GitHubApiResponse, ThemeCssOutput } from "./types/index";

const formatCETTimestamp = () => {
  const now = new Date();
  // Convert to CET (UTC+1) or CEST (UTC+2 during daylight saving)
  // Using UTC offset approximation since Intl is not available in Figma plugins
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
  const cetTime = new Date(utcTime + 3600000 * 1); // CET is UTC+1

  const year = cetTime.getFullYear();
  const month = String(cetTime.getMonth() + 1).padStart(2, "0");
  const day = String(cetTime.getDate()).padStart(2, "0");
  const hour = String(cetTime.getHours()).padStart(2, "0");
  const minute = String(cetTime.getMinutes()).padStart(2, "0");

  const label = `${year}-${month}-${day} ${hour}:${minute} CET`;
  const slug = `${year}${month}${day}-${hour}${minute}`;
  return { label, slug };
};

/**
 * Pushes multiple CSS theme files (one per theme) to GitHub in a single commit
 *
 * @param themeFiles - Object mapping theme names to their CSS content
 * @returns Result object with success status and details
 */
export async function pushCssThemesToGitHub(
  themeFiles: ThemeCssOutput
): Promise<GitHubApiResponse> {
  try {
    console.log("🚀 Starting CSS theme push...");
    const themeNames = Object.keys(themeFiles);
    console.log(`📦 Pushing ${themeNames.length} theme(s):`, themeNames);

    if (themeNames.length === 0) {
      throw new Error("No CSS themes to push");
    }

    // Validate GITHUB_CONFIG
    if (!GITHUB_CONFIG.path) {
      throw new Error(
        "GitHub config path is not set. Please update your config.json with a directory path (e.g., 'src/styles/tokens')"
      );
    }

    // Resolve base branch (prefer master, fallback to main)
    const baseBranchCandidates = ["master", "main"];
    let baseBranch = baseBranchCandidates[0];
    let baseSha: string | null = null;

    for (const candidate of baseBranchCandidates) {
      const baseRefUrl = `${GITHUB_API_BASE}/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/git/refs/heads/${candidate}`;
      const response = await fetch(baseRefUrl, {
        headers: {
          Authorization: `Bearer ${GITHUB_CONFIG.token}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "Figma-Variables-Plugin",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      });
      if (response.ok) {
        const refData = (await response.json()) as { object: { sha: string } };
        baseSha = refData.object.sha;
        baseBranch = candidate;
        break;
      }
    }

    if (!baseSha) {
      throw new Error(
        `Failed to resolve base branch. Neither 'master' nor 'main' branch exists in your repository.\n\n` +
          `Please check:\n` +
          `1. Repository ${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo} exists\n` +
          `2. Your GitHub token has correct permissions (repo scope)\n` +
          `3. At least one of these branches exists: ${baseBranchCandidates.join(
            ", "
          )}\n\n` +
          `If your default branch has a different name, please create either 'main' or 'master' branch first.`
      );
    }

    console.log(`📍 Base branch: ${baseBranch} @ ${baseSha}`);

    const { label: timestampLabel, slug: timestampSlug } = formatCETTimestamp();
    let featureBranch = `feat/figma-variables-${timestampSlug}`;

    // Create feature branch from base
    const createRefUrl = `${GITHUB_API_BASE}/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/git/refs`;
    const createRefBody = (branch: string) => ({
      ref: `refs/heads/${branch}`,
      sha: baseSha,
    });

    let refCreated = false;
    let attempt = 0;
    while (!refCreated && attempt < 3) {
      const branchName =
        attempt === 0 ? featureBranch : `${featureBranch}-${attempt}`;
      const createRefResponse = await fetch(createRefUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GITHUB_CONFIG.token}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
          "User-Agent": "Figma-Variables-Plugin",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        body: JSON.stringify(createRefBody(branchName)),
      });

      if (createRefResponse.ok) {
        featureBranch = branchName;
        refCreated = true;
        console.log(`🌿 Created feature branch: ${featureBranch}`);
      } else {
        const body = (await createRefResponse.json()) as { message?: string };
        if (
          createRefResponse.status === 422 &&
          typeof body?.message === "string" &&
          body.message.includes("already exists")
        ) {
          attempt += 1;
          continue;
        }

        // Enhanced error messages for common issues
        if (createRefResponse.status === 403) {
          throw new Error(
            `GitHub Access Denied (403 Forbidden)\n\n` +
              `Your GitHub token doesn't have the required permissions.\n\n` +
              `Please create a new Personal Access Token with these permissions:\n` +
              `• repo (Full control of private repositories)\n` +
              `• workflow (Update GitHub Action workflows)\n\n` +
              `To create a token:\n` +
              `1. Go to: https://github.com/settings/tokens/new\n` +
              `2. Select scopes: 'repo' and 'workflow'\n` +
              `3. Generate token and copy it\n` +
              `4. Update your token in the Exporter tab\n\n` +
              `Repository: ${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}\n` +
              `API Response: ${body?.message || createRefResponse.statusText}`
          );
        }

        if (createRefResponse.status === 404) {
          throw new Error(
            `Repository Not Found (404)\n\n` +
              `The repository '${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}' doesn't exist or you don't have access to it.\n\n` +
              `Please verify:\n` +
              `• Repository name is correct\n` +
              `• Repository exists at: https://github.com/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}\n` +
              `• Your GitHub token has access to this repository`
          );
        }

        if (createRefResponse.status === 401) {
          throw new Error(
            `Authentication Failed (401 Unauthorized)\n\n` +
              `Your GitHub token is invalid or expired.\n\n` +
              `Please create a new token at: https://github.com/settings/tokens/new`
          );
        }

        throw new Error(
          `Failed to create branch ${branchName}: ${createRefResponse.status} ${createRefResponse.statusText}\n` +
            `${body?.message || ""}`
        );
      }
    }

    if (!refCreated) {
      throw new Error(
        `Failed to create feature branch after multiple attempts`
      );
    }
    // Get the current commit to access its tree
    const commitUrl = `${GITHUB_API_BASE}/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/git/commits/${baseSha}`;
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

    // Create blobs for all theme files
    const treeItems = [];
    for (const [themeName, content] of Object.entries(themeFiles)) {
      console.log(`📝 Creating blob for theme: ${themeName}`);
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
          content: base64Encode(content || "/* No variables exported */"),
          encoding: "base64",
        }),
      });

      if (!blobResponse.ok) {
        throw new Error(
          `Failed to create blob for ${themeName}.css: ${blobResponse.status}`
        );
      }

      const blobData = (await blobResponse.json()) as { sha: string };
      treeItems.push({
        path: `${GITHUB_CONFIG.path}/${themeName}/variables.css`,
        mode: "100644",
        type: "blob",
        sha: blobData.sha,
      });
      console.log(`✅ Blob created for ${themeName}.css`);
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
    const themesLabel =
      themeNames.length === 1
        ? themeNames[0]
        : `${themeNames.length} themes (${themeNames.join(", ")})`;
    const commitMessage = `feat(figma-variables): Figma variables exported ${timestampLabel}\n\nExported themes: ${themesLabel}\nBase branch: ${baseBranch}`;
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
        parents: [baseSha],
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

    // Update the feature branch reference to point to the new commit
    const updateRefUrl = `${GITHUB_API_BASE}/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/git/refs/heads/${featureBranch}`;
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

    console.log(`✅ Branch ${featureBranch} updated successfully`);

    return {
      success: true,
      message: `Successfully pushed ${themeNames.length} CSS theme file(s) to ${featureBranch} in a single commit`,
      sha: newCommitSha,
    };
  } catch (error) {
    console.error("❌ Error pushing CSS themes to GitHub:", error);
    return {
      success: false,
      message: `Error: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}
