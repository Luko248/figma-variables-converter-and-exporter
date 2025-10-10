/**
 * GitHub API type definitions
 */

/** Response structure for GitHub file API */
export interface GitHubFileResponse {
  sha?: string;
  content?: string;
}

/** Standardized response format for GitHub operations */
export interface GitHubApiResponse {
  success: boolean;
  message: string;
  sha?: string;
}

/** GitHub API tree item */
export interface GitHubTreeItem {
  path: string;
  mode: string;
  type: string;
  sha: string;
}

/** GitHub configuration */
export interface GitHubConfig {
  owner: string;
  repo: string;
  branch: string;
  path: string;
  token: string;
}
