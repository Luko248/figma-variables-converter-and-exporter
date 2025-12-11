# Quick Setup Guide - Figma CSS Variables Converter

## 1. Install & Build

```bash
git clone https://github.com/Luko248/figma-css-variables-converter.git
cd figma-css-variables-converter
npm install
npm run build
```

## 2. Setup GitHub Integration

1. **Create GitHub Token**: [GitHub Settings → Personal Access Tokens](https://github.com/settings/tokens)
   - Select `repo` scope
   - Copy the token

2. **Configure Plugin**:
```bash
cp config.example.json config.json
```

Edit `config.json`:
```json
{
  "github": {
    "owner": "your-username",
    "repo": "your-repo-name", 
    "path": "variables.css",
    "branch": "main",
    "token": "your_github_token_here"
  }
}
```

3. **Rebuild**:
```bash
npm run build
```

## 3. Install in Figma

1. Figma → Plugins → Development → Import plugin from manifest
2. Select `manifest.json` from project folder

## 4. Customize Naming (Optional)

Variable names are generated in `src/services/variable-naming.service.ts`.
The naming is kept simple: Figma variable names are converted to camelCase without type prefixes.

To modify naming behavior, edit:
```typescript
// src/services/variable-naming.service.ts
export const generateCSSVariableName = (
  _collectionName: string,
  variableName: string
): string => {
  let cleanVariable = cleanVariableName(variableName);
  // Add your custom logic here
  return `--${cleanVariable}`;
};
```

Rebuild after changes: `npm run build`

## 5. Export Tokens

1. Open Figma file with variables
2. Run plugin: Plugins → Development → Figma CSS Variables Converter
3. Check console for progress
4. Verify output in your GitHub repo

## Output Example
```css
:root {
  --primaryBlue: hsl(217 91% 60%);
  --spacingLarge: 1.5rem;
  --familyInter: 'Inter', sans-serif;
}
```

## Troubleshooting

- **No variables found**: Create variables in Figma first
- **GitHub 401 error**: Check token and repo permissions
- **Build failed**: Copy `config.example.json` to `config.json`

## ✅ Quick Checklist

Before using the plugin, ensure:

- [ ] Repository cloned and `npm install` completed
- [ ] GitHub personal access token created with `repo` scope
- [ ] `config.json` configured with your repository details
- [ ] Plugin built with `npm run build`
- [ ] Plugin imported into Figma
- [ ] Figma file contains organized variables
- [ ] Target GitHub repository exists and is accessible

**🎉 You're ready to export design tokens!**