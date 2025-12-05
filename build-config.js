const fs = require('fs');
const path = require('path');

// Resolve config with fallbacks so builds don't fail when config.json is missing
const configPath = path.join(__dirname, 'config.json');
const exampleConfigPath = path.join(__dirname, 'config.example.json');

function loadConfig() {
  if (fs.existsSync(configPath)) {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }

  if (fs.existsSync(exampleConfigPath)) {
    console.warn('⚠️  config.json not found, using config.example.json for build.');
    return JSON.parse(fs.readFileSync(exampleConfigPath, 'utf8'));
  }

  console.warn('⚠️  No config.json or config.example.json found. Using stub config for build.');
  return {
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
      name: 'Figma Variables to GitHub',
      version: '1.0.0',
    },
  };
}

const config = loadConfig();

// Remove non-typed fields (e.g., comment helper) to satisfy TS interfaces
if (config.github && config.github.comment) {
  delete config.github.comment;
}
if (config.github && config.github.branch) {
  delete config.github.branch;
}

// Read the src/config.ts file
const configFilePath = path.join(__dirname, 'src', 'config.ts');
let configContent = fs.readFileSync(configFilePath, 'utf8');

// Replace the placeholder config with actual config
const configPlaceholder = /export const CONFIG: Config = \{[\s\S]*?\};/;
const newConfig = `export const CONFIG: Config = ${JSON.stringify(config, null, 2)};`;

configContent = configContent.replace(configPlaceholder, newConfig);

// Write the updated src/config.ts
fs.writeFileSync(configFilePath, configContent);

console.log('✅ Config injected successfully into src/config.ts from config.json');
