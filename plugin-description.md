# Plugin Description

This plugin converts Figma variables into modern, developer-friendly design tokens using OKLCH color space and rem-based sizing, ensuring consistency, accessibility, and future-proof token output. Variables are displayed in Dev Mode as real CSS syntax such as `var(--colorBtnPrimary)` or `var(--color-btn-primary)`, and can be exported directly to GitHub with a clean, automated workflow.

## Key Features

- Convert Figma variables to CSS custom properties
- Choose token naming before conversion: `camelCase` by default or `kebab-case`
- Export colors in OKLCH for better perceptual consistency
- Automatically convert px values to rem using a 16px base
- Generate tokens for typography, spacing, sizing, colors, and measures
- Update Dev Mode to show copy-paste-ready `var(--...)` tokens
- Export tokens to GitHub with automatic branch creation and commits
- Export as CSS, Tailwind CSS v4 `@theme`, or SCSS
- Generate one token file per theme, such as light, dark, or high contrast
- Keep each theme in its own folder for clean multi-theme organization

Perfect for teams that want a single source of truth between design and code without manual token management.
