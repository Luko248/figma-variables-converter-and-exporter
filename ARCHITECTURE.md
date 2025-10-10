# Project Architecture

## Overview
The Figma CSS Variables Converter has been refactored into a clean, service-based architecture for better maintainability and readability.

## Directory Structure

```
src/
├── constants/              # Constants and configuration values
│   ├── token-patterns.ts   # Keyword lists for token detection
│   └── conversion.constants.ts  # Conversion constants (batch sizes, fallbacks)
│
├── helpers/               # Pure utility functions
│   ├── cache.helper.ts    # Caching & object pooling
│   ├── color.helper.ts    # Color conversion (RGB to HSL)
│   ├── numeric.helper.ts  # Numeric operations (px to rem)
│   └── string.helper.ts   # String manipulation & base64
│
├── services/              # Business logic services
│   ├── variable-type-detector.service.ts  # Token type detection
│   ├── variable-naming.service.ts         # CSS variable naming
│   ├── value-converter.service.ts         # Safe value conversion
│   ├── css-value-generator.service.ts     # CSS value generation
│   ├── scss-builder.service.ts            # SCSS file building
│   ├── variable-conversion.service.ts     # Conversion orchestration
│   └── export.service.ts                  # Export orchestration
│
├── types/                 # TypeScript type definitions
│   ├── figma.types.ts     # Figma API types
│   ├── variable.types.ts  # Variable-related types
│   ├── github.types.ts    # GitHub API types
│   └── index.ts           # Central export point
│
├── github-service.ts      # GitHub API integration
├── config.ts              # Configuration (injected from config.json)
└── main.ts                # Plugin entry point
```

## Architecture Layers

### 1. **Constants** (`constants/`)
Pure constants and configuration values with no dependencies.

**Files:**
- `token-patterns.ts` - Keyword arrays for detecting token types (colors, measures, fonts, shadows, gradients)
- `conversion.constants.ts` - Numeric constants (batch sizes, fallback values, limits)

### 2. **Helpers** (`helpers/`)
Pure utility functions with no side effects. Single responsibility principle.

**Files:**
- `cache.helper.ts` - Caching utilities and object pooling for performance
- `color.helper.ts` - Color conversion functions (RGB/RGBA to HSL)
- `numeric.helper.ts` - Numeric operations (px to rem, clamping, rounding)
- `string.helper.ts` - String manipulation (kebab-case, sanitization, base64)

### 3. **Services** (`services/`)
Business logic and orchestration. Services can depend on helpers and other services.

**Files:**
- `variable-type-detector.service.ts` - Detects variable category from name
- `variable-naming.service.ts` - Generates CSS variable names
- `value-converter.service.ts` - Safe conversion with error handling
- `css-value-generator.service.ts` - Generates CSS values from Figma variables
- `scss-builder.service.ts` - Builds SCSS files with mixins
- `variable-conversion.service.ts` - Orchestrates entire conversion process
- `export.service.ts` - Orchestrates GitHub export

### 4. **Types** (`types/`)
TypeScript type definitions organized by domain.

**Files:**
- `figma.types.ts` - Figma API global type declarations
- `variable.types.ts` - Variable, conversion result, and SCSS output types
- `github.types.ts` - GitHub API request/response types
- `index.ts` - Central export point for all types

### 5. **Integration** (Root level)
- `github-service.ts` - GitHub API integration (creates commits, pushes files)
- `config.ts` - Configuration injected from config.json
- `main.ts` - Plugin entry point and UI message handling

## Naming Conventions

### Token Types (CSS Variables)
- **color**: `--colorPrimary`, `--colorBtnBackground`
- **measures**: `--measuresSpacingSm`, `--measuresBorderRadius`
- **fonts**: `--fontsWeightBold`, `--fontsFamilyBase`
- **shadow**: `--shadowPanelBoxShadow`, `--shadowElevation1` *(singular)*
- **gradient**: `--gradientPrimary`, `--gradientHero` *(singular)*

### Mixin Names (All Plural)
- `@mixin create-colors { }`
- `@mixin create-measures { }`
- `@mixin create-fonts { }`
- `@mixin create-shadows { }`
- `@mixin create-gradients { }`

## Key Design Decisions

1. **Separation of Concerns**: Each file has a single, clear responsibility
2. **Type Safety**: All types explicitly defined in dedicated type files
3. **No Circular Dependencies**: Strict layered architecture (constants → helpers → services)
4. **Pure Functions**: Helpers are pure functions with no side effects
5. **Service Layer**: Business logic isolated in services for easy testing
6. **Error Handling**: Centralized error handling with fallback values
7. **Performance**: Object pooling and caching built into helpers

## Import Guidelines

- Types: Import from `./types/index`
- Constants: Import directly from specific constant files
- Helpers: Import specific functions from helper files
- Services: Import from service files as needed
- Never create circular dependencies

## Build Process

1. **prebuild**: Injects config from `config.json` → `src/config.ts`
2. **build**: Bundles all TypeScript with `@vercel/ncc` → `code.js`
3. **post-build**: Removes Node.js incompatible code via `fix-figma-compat.js`

## Benefits of This Architecture

✅ **Better Readability**: Clear file organization by responsibility  
✅ **Easier Maintenance**: Changes are localized to specific files  
✅ **Improved Testing**: Services and helpers are easily testable  
✅ **Type Safety**: Centralized type definitions  
✅ **Scalability**: Easy to add new features without touching existing code  
✅ **No Coupling**: Loose coupling between modules  
✅ **Clear Dependencies**: Layered architecture prevents circular deps
