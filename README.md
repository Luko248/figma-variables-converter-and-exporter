# Figma CSS Variables Converter (Raw CSS)

Converts Figma variables into plain CSS custom properties and pushes them to GitHub. The output mirrors your Figma values and is grouped into Colors, Fonts, and Measures inside a single `:root` block for each theme.

## Core Functionality
- **Figma Dev Mode Integration**: Updates dev mode syntax so variables appear as `var(--colorPrimary)`, `var(--fontsBodyFamily)`, etc.
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
  --colorPrimary: hsl(200 75% 60%);
  --colorSurface: hsl(0 0% 98%);

  /* Fonts */
  --fontsBodyFamily: "Inter";
  --fontsBodyWeight: 400;
  --fontsBodySize: 1rem;

  /* Measures */
  --measuresSpacingMd: 1rem;
  --measuresRadiusSm: 0.25rem;
}
```

## Multi-Theme Support
- A single mode exports to `theme.css`.
- Multiple modes export to `<theme-slug>.css` files (kebab-case); light variants drop the `-light` suffix so the base theme stays clean.
- Each file contains the full `:root` block for that theme.

## Configuration
- Open the plugin and go to **Settings**. Enter GitHub owner, repo, path (directory), and a `repo`-scoped token.
- Settings are stored locally (per machine) and applied each time the plugin runs; no `config.json` is required.
- Exports always base from `master`, create a feature branch with a timestamped name and commit message, and push one CSS file per theme inside a theme-named folder.

## Development
1. Install dependencies: `npm install`
2. Build the plugin: `npm run build`
3. Run inside Figma; use the UI to convert variables and trigger the GitHub export.
