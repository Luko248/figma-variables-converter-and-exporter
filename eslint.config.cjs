const js = require("@eslint/js");
const figmaPlugin = require("@figma/eslint-plugin-figma-plugins");
const tsPlugin = require("@typescript-eslint/eslint-plugin");

module.exports = [
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "*.js",
      "build-config.js",
      "eslint.config.cjs",
    ],
  },
  js.configs.recommended,
  ...tsPlugin.configs["flat/recommended"],
  figmaPlugin.flatConfigs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
];
