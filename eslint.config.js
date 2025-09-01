// @ts-check

import globals from "globals";
import js from "@eslint/js";
import babelParser from "@babel/eslint-parser";
import eslintReact from "@eslint-react/eslint-plugin";
import prettierConfig from "eslint-config-prettier";

export default [
  // 1. Global ignore patterns
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

  // 2. Base Configuration for ALL JavaScript files (api and web)
  {
    files: ["apps/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node, // Start with Node.js globals for both
      },
    },
    rules: {
      // Allows unused variables if they are prefixed with an underscore
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },

  // 3. Eslint's recommended rules for ALL JavaScript files
  js.configs.recommended,

  // 4. React/JSX Specific Configuration (ONLY for the 'web' app)
  {
    files: ["apps/web/**/*.{js,jsx}"],
    languageOptions: {
      parser: babelParser,
      parserOptions: {
        requireConfigFile: false,
        babelOptions: {
          presets: ["@babel/preset-react"],
        },
      },
      globals: {
        ...globals.browser, // Add browser globals for the web app
      },
    },
    // @ts-ignore
    settings: {
      react: {
        version: "detect",
      },
    },
    ...eslintReact.configs.recommended, // Spread the recommended React config here
    rules: {
      ...eslintReact.configs.recommended.rules,
      "react/react-in-jsx-scope": "off", // Custom rule override for React
    },
  },

  // 5. Prettier configuration (MUST BE LAST)
  // Turns off all rules that might conflict with Prettier
  prettierConfig,
];
