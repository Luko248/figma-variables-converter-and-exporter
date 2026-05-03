# Figma CSS Variables Converter & Exporter

A Figma plugin that converts Figma design variables into modern token outputs with **OKLCH color space** and **rem-based sizing**, then exports them to GitHub.

## What This Plugin Does

1. **Converts Figma Variables**: Transforms your design tokens into production-ready outputs.
   - **Colors**: Converted to modern OKLCH color space for better perceptual uniformity
   - **Sizing/Spacing**: Automatically converted from pixels to rem units (16px base)
   - **Typography**: Exports font families, weights, and sizes as tokens

2. **Updates Figma Dev Mode**: Changes the Dev Mode display so variables appear as `var(--primary)`, `var(--spacing8)`, or the selected naming variant, ready to copy into code.

3. **Exports to GitHub**: Pushes generated token files directly to your GitHub repository.
   - Creates a new feature branch automatically
   - One file per theme (light, dark, high-contrast, etc.)
   - All files committed in a single, organized commit

## Features

### Color Conversion
- **OKLCH Color Space**: All colors are converted to modern `oklch()` format
- **Alpha Channel Support**: Transparent colors keep their opacity with `/ 0.5` syntax
- **Example**: Figma color `rgb(100, 150, 255, 0.8)` → `oklch(0.65 0.2 250 / 0.8)`

### Sizing & Spacing
- **Rem-based Units**: All pixel values are converted to rem
- **Number Preservation**: Variable names keep their numbers intact (`spacing8`, `spacing16`, `spacing24`)
- **Example**: Figma `spacing/16` at 16px → `--spacing16: 1rem`

### Token Naming Convention
- **Choice During Conversion**: Pick the token naming convention before converting variables
- **camelCase by Default**: Produces names like `--buttonPrimaryBackground`
- **kebab-case Option**: Produces names like `--button-primary-background`
- **Shared Behavior**: The selected convention is used in both Figma Dev Mode syntax and exported files

### Export Formats
- **CSS**: Exports `:root { --token: value; }` to `variables.css`
- **Tailwind Theme**: Exports Tailwind CSS v4 `@theme static` tokens to `theme.css`
- **SCSS**: Exports Sass variables to `variables.scss`

### File Organization
- **Multi-theme Support**: One theme folder per mode
- **Grouped Sections**: Variables are organized by type (Colors → Fonts → Measures)
- **Clean Naming**: Theme folders are kebab-case and `-light` suffixes are removed for base themes

### Smart Conversion
- **Alias Resolution**: Figma variable references are automatically resolved
- **Type Detection**: Variables are categorized based on name patterns
- **GitHub Integration**: Direct export to a repository with automatic feature branch creation

## Plugin Flow

1. Open the **Converter** tab and choose the token naming convention.
2. Convert variables so Figma Dev Mode syntax is updated using that convention.
3. Open the **Exporter** tab and choose the output format: CSS, Tailwind theme, or SCSS.
4. Save GitHub settings and export the generated files.

## Example Output

### CSS
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

### SCSS
```scss
/*
 * Design tokens exported from Figma
 * Exported at: 2024-05-29T10:15:00.000Z
 * Format: SCSS variables grouped by kind
 */
/* Colors */
$primary: oklch(0.65 0.2 250);
$surface: oklch(0.98 0.01 180 / 0.95);

/* Fonts */
$body-family: "Inter";
$body-weight: 400;

/* Measures */
$spacing-8: 0.5rem;
$radius-sm: 0.25rem;
```

### Tailwind Theme
```css
/*
 * Design tokens exported from Figma
 * Exported at: 2024-05-29T10:15:00.000Z
 * Format: Tailwind CSS v4 @theme variables
 * Usage: import this file after @import "tailwindcss";
 */
@theme static {
  /* Colors */
  --color-primary: oklch(0.65 0.2 250);
}
```

## Multi-Theme Support

- Each mode exports to its own theme folder such as `light/`, `dark/`, or `high-contrast/`
- CSS exports write `variables.css`, Tailwind exports write `theme.css`, and SCSS exports write `variables.scss`
- Light variants drop the `-light` suffix so the base theme folder stays clean
- Each file contains the full output for that theme

## Configuration

### GitHub Settings
Open the plugin and go to the **Exporter** tab to configure GitHub export settings.

#### Required Fields

1. **GitHub Organization or Username**
   - Your GitHub username or organization name
   - Example: `Luko248`
   - Not the full URL

2. **Repository Name**
   - The name of your repository
   - Example: `figma-variables-test`
   - Not the full URL

3. **Folder Path in Repository**
   - The folder where theme files will be created
   - Example: `src/tokens` or `styles/variables`
   - This is a folder path, not a file path
   - Multiple files will be created inside this folder
   - Examples:
     - CSS: `src/tokens/dark/variables.css`
     - Tailwind theme: `src/tokens/dark/theme.css`
     - SCSS: `src/tokens/dark/variables.scss`

4. **GitHub Access Token**
   - Personal Access Token with `repo` scope
   - Create one at: https://github.com/settings/tokens
   - Required permissions: `repo`

#### Example Configuration
```text
GitHub Username: Luko248
Repository Name: figma-variables-test
Folder Path: src/tokens
Token: ghp_xxxxxxxxxxxxxxxxxxxx
```

#### Notes
- Settings are stored locally in your browser
- No `config.json` file is needed
- The plugin creates a feature branch from `master` or `main`
- Each export creates a new timestamped branch with all theme files in a single commit

## Development

1. Install dependencies: `npm install`
2. Build the plugin: `npm run build`
3. Run inside Figma; use the UI to choose naming, convert variables, and export to GitHub
