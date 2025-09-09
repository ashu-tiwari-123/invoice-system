// @ts-check
import globals from "globals";
import js from "@eslint/js";
import babelParser from "@babel/eslint-parser";
import eslintReact from "@eslint-react/eslint-plugin";
import prettierConfig from "eslint-config-prettier";

/**
 * Flat ESLint config (array form).
 * Important: for any rules referencing a plugin (e.g. "@eslint-react/..."),
 * the config object that contains those rules must also declare that plugin
 * in `plugins: { "<plugin-name>": <pluginModule> }`.
 */
export default [
  // 1. Global ignore patterns (flat config support)
  {
    ignores: [
      "node_modules/",
      "dist/",
      "build/",
      "**/*.config.js",
      "**/*.css",
      "**/*.md",
      "**/*.json",
    ],
  },

  // 2. Base (all js files) — register the @eslint-react plugin here
  {
    files: ["apps/**/*.{js,jsx}"],
    // Register plugin under short name "@eslint-react"
    plugins: {
      "@eslint-react": eslintReact,
    },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.node },
    },
    rules: {
      "no-constant-binary-expression": "off",
      "no-undef": "off",
      "no-empty": "warn",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      // use the short plugin prefix (plugin was registered above)
      "@eslint-react/dom/no-missing-button-type": "off",
      "@eslint-react/no-unstable-context-value": "warn",
    },
  },

  // 3. ESlint recommended JS rules
  js.configs.recommended,

  // 4. React-specific (web only)
  {
    files: ["apps/web/**/*.{js,jsx}"],
    // this block also needs the plugin registered because it will reference plugin rules
    plugins: {
      "@eslint-react": eslintReact,
    },
    languageOptions: {
      parser: babelParser,
      parserOptions: {
        requireConfigFile: false,
        babelOptions: { presets: ["@babel/preset-react"] },
      },
      globals: { ...globals.browser },
    },
    // include the plugin's recommended config (works because we included eslintReact object)
    ...eslintReact.configs.recommended,
    rules: {
      // override plugin rules if needed
      "@eslint-react/no-unstable-context-value": "warn",
      // Example: if you used an old react rule (react/react-in-jsx-scope), remove it or replace
    },
    settings: {
      react: { version: "detect" },
    },
  },

  // 5. Prettier (last)
  prettierConfig,
];
