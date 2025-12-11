/**
 * Runtime configuration for GitHub integration
 *
 * Configuration is set by the user in the UI (Exporter tab) and stored in localStorage.
 * The UI sends config updates to the plugin via 'update-config' messages.
 *
 * DO NOT hardcode tokens or credentials here.
 */

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

// Runtime configuration - updated via UI messages
export const CONFIG: Config = {
  github: {
    owner: '',
    repo: '',
    path: '',
    token: '',
  },
  api: {
    githubBase: 'https://api.github.com',
  },
  plugin: {
    name: 'Figma Variables Converter & Exporter',
    version: '1.0.0',
  },
};

// Mutable references that get updated at runtime
export const GITHUB_CONFIG = CONFIG.github;
export const GITHUB_API_BASE = CONFIG.api.githubBase;
