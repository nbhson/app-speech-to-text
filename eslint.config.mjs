import js from "@eslint/js";
import globals from "globals";

const rules = {
  "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
  "no-empty": ["error", { allowEmptyCatch: true }],
};

export default [
  { ignores: ["node_modules/**"] },
  js.configs.recommended,
  {
    // Browser script (script.js)
    files: ["*.js"],
    languageOptions: { ecmaVersion: 2023, sourceType: "script", globals: { ...globals.browser } },
    rules,
  },
  {
    // Node test files
    files: ["tests/**/*.mjs"],
    languageOptions: { ecmaVersion: 2023, sourceType: "module", globals: { ...globals.node } },
    rules,
  },
];
