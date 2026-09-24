import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: ["node_modules/", "coverage/", "dist/"] },
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: { ...globals.node },
    },
    rules: {
      // Express identifies error handlers by their 4-argument signature.
      "no-unused-vars": ["error", { argsIgnorePattern: "^next$" }],
    },
  },
];
