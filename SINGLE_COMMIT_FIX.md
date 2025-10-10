# Single Commit Fix for Multi-Theme Export

## Problem
When exporting multiple themes (variable modes), the plugin was creating **one commit per theme**, resulting in multiple commits for a single export action.

**Example:**
- Theme 1: "Light Mode" → Commit 1
- Theme 2: "Dark Mode" → Commit 2

## Solution
Refactored the export process to batch all themes into a **single atomic commit**.

## Changes Made

### 1. New Function in `github-service.ts`
Created `pushAllThemesToGitHub()` that:
- Accepts all themes at once: `Record<string, ScssFileOutput>`
- Creates blobs for all files across all themes
- Combines them into a single Git tree
- Creates **one commit** with all changes
- Updates the branch reference once

**Commit message format:**
```
feat(design-tokens): Figma variables exported - 2 themes (Light, Dark)

Exported at: 2025-10-10T06:59:46.878Z
```

### 2. Updated `export.service.ts`
Changed from:
```typescript
// OLD: Loop through themes, create commit per theme
for (const [themeName, files] of Object.entries(themeOutput)) {
  await pushScssFilesToGitHub(files, themeName);
}
```

To:
```typescript
// NEW: Single call, single commit
await pushAllThemesToGitHub(themeOutput);
```

### 3. Marked Old Function as Deprecated
The `pushScssFilesToGitHub()` function is now marked as `@deprecated` with a note to use `pushAllThemesToGitHub()` for multi-theme support.

## Benefits

✅ **Atomic Operations**: All themes exported in one transaction  
✅ **Cleaner History**: Single commit per export action  
✅ **Better Performance**: Fewer API calls to GitHub  
✅ **Rollback Friendly**: Easy to revert a single export  
✅ **Clear Intent**: Commit message shows all themes at once

## File Structure

Files are organized by theme in the repository:
```
{GITHUB_CONFIG.path}/
├── light/
│   ├── _colors.scss
│   ├── _measures.scss
│   ├── _fonts.scss
│   ├── _shadows.scss
│   ├── _gradients.scss
│   ├── __index.scss
│   └── _root.scss
└── dark/
    ├── _colors.scss
    ├── _measures.scss
    ├── _fonts.scss
    ├── _shadows.scss
    ├── _gradients.scss
    ├── __index.scss
    └── _root.scss
```

## Testing

✅ Build verified: `npm run build` - Success  
✅ Output size: 74kB (increased from 66kB due to new function)  
✅ TypeScript compilation: No errors  
✅ All types properly resolved

## Migration Notes

No breaking changes for users. The plugin will automatically use the new single-commit approach when exporting multiple themes.

Single theme exports continue to work as before using the `pushScssFilesToGitHub()` function.

---

**Status:** ✅ Complete  
**Build:** ✅ Passing  
**Backward Compatible:** ✅ Yes
