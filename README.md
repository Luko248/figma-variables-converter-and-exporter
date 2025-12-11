# Figma CSS Variables Converter (Raw CSS)

Converts Figma variables into plain CSS custom properties and pushes them to GitHub. The output mirrors your Figma values and is grouped into Colors, Fonts, and Measures inside a single `:root` block for each theme.

## Core Functionality
- **Figma Dev Mode Integration**: Updates dev mode syntax so variables appear as `var(--primary)`, `var(--bodyFamily)`, etc.
- **GitHub CSS Export**: Generates one CSS file per theme with grouped sections and uploads them in a single commit.

## Features
- Raw CSS output (no SCSS or Supernova mixins)
- Grouped sections with comments: Colors → Fonts → Measures
- Name-based type detection: `color` → Colors, `fontFamily`/`fontWeight`/`fontSize` → Fonts, everything else → Measures
- Multi-theme support with sanitized theme slugs (kebab-case; `-light` suffix removed) and one CSS file per theme in its own folder
- Alias resolution for Figma variable references
- Rem-based sizing and HSL color conversion with alpha support
- Export flow: always base on `master`, create a feature branch, and push the generated CSS files to that branch in one commit

## Example Output

```css
/*
 * Design tokens exported from Figma
 * Exported at: 2024-05-29T10:15:00.000Z
 * Format: Raw CSS variables grouped by kind
 */
:root {
  /* Colors */
  --primary: hsl(200 75% 60%);
  --surface: hsl(0 0% 98%);

  /* Fonts */
  --bodyFamily: "Inter";
  --bodyWeight: 400;
  --bodySize: 1rem;

  /* Measures */
  --spacingMd: 1rem;
  --radiusSm: 0.25rem;
}
```

## Multi-Theme Support
- A single mode exports to `theme.css`.
- Multiple modes export to `<theme-slug>.css` files (kebab-case); light variants drop the `-light` suffix so the base theme stays clean.
- Each file contains the full `:root` block for that theme.

## Configuration

### GitHub Settings
Open the plugin and go to the **Exporter** tab to configure GitHub export settings:

#### Required Fields

1. **GitHub Organization or Username**
   - Your GitHub username or organization name
   - Example: `Luko248`
   - **NOT** the full URL, just the username/org name

2. **Repository Name**
   - The name of your repository (not the full URL)
   - Example: `figma-variables-test`
   - **NOT** `https://github.com/Luko248/figma-variables-test`

3. **Folder Path in Repository**
   - The folder where theme files will be created
   - Example: `src/tokens` or `styles/variables`
   - **Important**: This is a folder path, not a file path
   - Multiple files will be created inside this folder (one per theme)
   - Each theme creates its own subfolder: `src/tokens/dark/variables.css`, `src/tokens/light/variables.css`

4. **GitHub Access Token**
   - Personal Access Token with `repo` scope
   - Create one at: https://github.com/settings/tokens
   - Required permissions: `repo` (full control of private repositories)

#### Example Configuration
```
GitHub Username: Luko248
Repository Name: figma-variables-test
Folder Path: src/tokens
Token: ghp_xxxxxxxxxxxxxxxxxxxx (with repo scope)
```

#### Notes
- Settings are stored locally in your browser (per machine)
- No `config.json` file is needed
- The plugin will create a feature branch from `master` or `main`
- Each export creates a new timestamped branch with all theme files in a single commit

## Development
1. Install dependencies: `npm install`
2. Build the plugin: `npm run build`
3. Run inside Figma; use the UI to convert variables and trigger the GitHub export.
