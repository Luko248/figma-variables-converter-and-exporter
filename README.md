# Figma CSS Variables Converter & Exporter

A Figma plugin that converts Figma design variables into modern CSS custom properties with **OKLCH color space** and **rem-based sizing**, then exports them to GitHub.

## What This Plugin Does

1. **Converts Figma Variables to CSS**: Transforms your Figma design tokens into production-ready CSS variables
   - **Colors**: Converted to modern OKLCH color space for better perceptual uniformity
   - **Sizing/Spacing**: Automatically converted from pixels to rem units (16px base)
   - **Typography**: Exports font families, weights, and sizes as CSS variables

2. **Updates Figma Dev Mode**: Changes the dev mode display so variables appear as `var(--primary)`, `var(--spacing8)`, making them ready to copy-paste into your code

3. **Exports to GitHub**: Pushes generated CSS files directly to your GitHub repository
   - Creates a new feature branch automatically
   - One CSS file per theme (light, dark, high-contrast, etc.)
   - All files committed in a single, organized commit

## Features

### Color Conversion
- **OKLCH Color Space**: All colors converted to modern `oklch()` format for better perceptual uniformity and color accuracy
- **Alpha Channel Support**: Transparent colors maintain their opacity with `/ 0.5` syntax
- **Example**: Figma color `rgb(100, 150, 255, 0.8)` → `oklch(0.65 0.2 250 / 0.8)`

### Sizing & Spacing
- **Rem-based Units**: All pixel values automatically converted to rem (16px base)
- **Number Preservation**: Variable names keep their numbers intact (`spacing8`, `spacing16`, `spacing24`)
- **Example**: Figma `spacing/16` at 16px → `--spacing16: 1rem`

### File Organization
- **Multi-theme Support**: One CSS file per theme in its own folder
- **Grouped Sections**: Variables organized by type (Colors → Fonts → Measures)
- **Clean Naming**: Theme folders in kebab-case, `-light` suffix removed for base themes

### Smart Conversion
- **Alias Resolution**: Figma variable references automatically resolved to their values
- **Type Detection**: Automatically categorizes variables based on name patterns
- **GitHub Integration**: Direct export to repository with feature branch creation

## Example Output

```css
/*
 * Design tokens exported from Figma
 * Exported at: 2024-05-29T10:15:00.000Z
 * Format: Raw CSS variables grouped by kind
 */
:root {
  /* Colors */
  --primary: oklch(0.65 0.2 250);
  --surface: oklch(0.98 0.01 180 / 0.95);

  /* Fonts */
  --bodyFamily: "Inter";
  --bodyWeight: 400;
  --bodySize: 1rem;

  /* Measures */
  --spacing8: 0.5rem;
  --spacing16: 1rem;
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
