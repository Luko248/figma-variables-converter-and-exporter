# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Figma plugin that converts Figma design variables into CSS custom properties and exports them to GitHub. The plugin updates Figma Dev Mode to display variables as `var(--variableName)` syntax and generates organized CSS files with multi-theme support.

## Development Commands

```bash
# Build the plugin (production)
npm run build

# Watch mode for development
npm run watch

# Lint code
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Clean build artifacts
npm run clean
```

### Build Pipeline Details

The build process has two steps:

1. **Main build** (esbuild): Bundles TypeScript into a single `code.js` file using:
   - Entry: `src/main.ts`
   - Target: ES2017 (Figma runtime compatibility)
   - Format: IIFE (Immediately Invoked Function Expression)
   - Platform: Browser

2. **Post-build** (`fix-figma-compat.js`): Removes Node.js-specific code that would break in Figma's runtime:
   - Strips `__dirname` references
   - Removes `module.exports`
   - Adds global stubs for `module` and `exports`

## Architecture

The codebase follows a **strict layered service-oriented architecture** with no circular dependencies:

```
constants/ → helpers/ → services/ → main.ts
     ↓           ↓          ↓
   types/ (used by all layers)
```

### Layer Responsibilities

**Constants** (`constants/`): Pure configuration values
- `token-patterns.ts`: Keywords for detecting token types (colors, fonts, measures)
- `conversion.constants.ts`: Batch sizes, fallback values, limits

**Helpers** (`helpers/`): Pure utility functions with no side effects
- `cache.helper.ts`: Object pooling and memoization for performance
- `color.helper.ts`: RGB/RGBA to HSL conversion
- `numeric.helper.ts`: Pixel-to-rem conversion, rounding, clamping
- `string.helper.ts`: camelCase/kebab-case conversion, base64 encoding

**Services** (`services/`): Business logic and orchestration
- `variable-conversion.service.ts`: Main orchestrator for conversion process
- `export.service.ts`: GitHub export orchestration
- `css-builder.service.ts`: Generates `:root { ... }` blocks
- `css-value-generator.service.ts`: Converts Figma values to CSS syntax
- `variable-type-detector.service.ts`: Categorizes variables by name patterns
- `variable-naming.service.ts`: Generates CSS variable names
- `value-converter.service.ts`: Safe type conversion with fallbacks

**Integration**: Root-level files for external systems
- `github-service.ts`: GitHub API integration (branches, commits, file uploads)
- `main.ts`: Plugin entry point, UI message routing
- `ui.html`: Single-file UI with tabs and local storage for GitHub settings

### Dependency Rules

- **Constants** depend on nothing
- **Helpers** may only depend on constants
- **Services** may depend on constants, helpers, and other services
- **Never create circular dependencies** between services
- **Types** are imported from `./types/index` by all layers

## CSS Variable Naming Convention

Variables use **camelCase matching their Figma names WITHOUT type prefixes**:

```css
/* Colors */
--primary
--btnBackground
--surfaceElevated

/* Measures */
--spacingSm
--borderRadius
--contentWidth

/* Fonts */
--weightBold
--familyBase
--sizeH1
```

**Important**: The naming service (`variable-naming.service.ts`) generates these names. Do not add prefixes like `color-`, `spacing-`, or `font-`.

## Variable Type Detection

Variables are categorized by **name-based pattern matching** (see `token-patterns.ts`):

- **Colors**: Contains `color`, `bg`, `background`, `border`, `fill`, `stroke`, `shadow`, `gradient`
- **Fonts**: Contains `fontFamily`, `fontWeight`, `fontSize`, `lineHeight`, `letterSpacing`, `textCase`, `textDecoration`
- **Measures**: Everything else (spacing, sizing, radius, etc.)

CSS output groups variables in this order: Colors → Fonts → Measures

## Multi-Theme Support

**Theme Detection**: Automatically detected from Figma variable collection modes

**File Organization**: Each theme generates its own folder:
```
{folder-path}/
  ├── dark/
  │   └── variables.css
  ├── light/
  │   └── variables.css
  └── high-contrast/
      └── variables.css
```

**Theme Naming**:
- Converted to kebab-case
- `-light` suffix is removed for cleaner base theme
- Example: "Light Mode" → `light/`, "Dark Mode" → `dark/`

## GitHub Export Flow

**Branching Strategy**:
1. Fetches base from `master` (fallback to `main`)
2. Creates feature branch: `feat/figma-variables-YYYYMMDD-HHMM` (CET timezone)
3. Commits all theme CSS files in a single commit
4. Commit message: `feat(figma-variables): New version of Figma variables was exported <timestamp CET>`

**File Structure**:
- One commit contains all themes
- Each theme goes in its own folder
- File name is always `variables.css`

## CSS Output Format

Generated CSS follows this structure:

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

  /* Measures */
  --spacing8: 0.5rem;
  --spacing16: 1rem;
  --radiusSm: 0.25rem;
}
```

**Key Format Rules**:
- **Colors**: Modern OKLCH syntax with space-separated values (better perceptual uniformity than HSL)
- **Alpha channel**: `/ 0.5` suffix format
- **Sizing**: Rem-based (16px base)
- **Naming**: Numbers preserved in variable names (e.g., `spacing8`, `spacing16`)
- **Organization**: Alphabetically sorted within each section
- **Header**: ISO timestamp in comment

## Configuration

**Manual UI Configuration**: GitHub settings (owner, repo, path, token) are configured by users directly in the plugin UI:
- Users enter their GitHub credentials in the **Exporter** tab (Step 3)
- Settings are stored in the browser's localStorage
- Configuration is sent to the plugin at runtime via `update-config` messages
- No configuration files or build-time injection needed

**Runtime Config** (`src/config.ts`): Exports empty default values that get populated when users save their settings in the UI. Never hardcode credentials in this file.

## Performance Considerations

**Batch Processing**: Variables are processed in batches to prevent UI blocking (configured in `conversion.constants.ts`)

**Object Pooling**: The cache helper uses object pools for `ProcessedVariable` objects to reduce garbage collection

**Memoization**: CSS variable names are cached to avoid redundant string operations

**Memory Management**: The cache helper includes cleanup functions called after major operations

## Common Patterns

**Error Handling**: Services use try-catch with fallback values. Check `value-converter.service.ts` for examples.

**Alias Resolution**: When a variable references another variable, the CSS value generator recursively resolves the reference chain.

**Type Safety**: All Figma API types are declared globally in `types/figma.types.ts`. Use these types rather than `any`.

**Console Logging**: Extensive console logging is used for debugging. Each service logs its operations for troubleshooting.
