// Configuration loaded from config.json
export interface GitHubConfig {
  owner: string;
  repo: string;
  path: string;
  token: string;
}

export interface Config {
  github: GitHubConfig;
  api: {
    githubBase: string;
  };
  plugin: {
    name: string;
    version: string;
  };
}

// This will be replaced with actual config during build
export const CONFIG: Config = {
  "github": {
    "owner": "your-github-username",
    "repo": "your-repo-name",
    "path": "src/styles/tokens",
    "token": "YOUR_GITHUB_TOKEN_HERE"
  },
  "api": {
    "githubBase": "https://api.github.com"
  },
  "plugin": {
    "name": "Figma Variables to GitHub",
    "version": "1.0.0"
  }
};

export const GITHUB_CONFIG = CONFIG.github;
export const GITHUB_API_BASE = CONFIG.api.githubBase;
