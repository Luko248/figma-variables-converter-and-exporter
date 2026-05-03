# Changelog

## 2026-05-03

- Added token naming convention selection to the converter step with `camelCase` as the default and `kebab-case` as an alternative.
- Added inline naming examples and tooltips in the converter UI so users can understand the convention before converting.
- Wired the selected naming convention into variable conversion so Figma Dev Mode syntax and exported token names stay aligned.
- Replaced the Tailwind-only export toggle with an export format selector.
- Added SCSS export support alongside CSS and Tailwind theme export options.
- Updated export file naming so CSS uses `variables.css`, Tailwind uses `theme.css`, and SCSS uses `variables.scss`.
- Updated the README to document the new conversion flow, naming options, and export formats.
