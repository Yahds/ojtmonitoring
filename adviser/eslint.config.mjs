import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
  // will fix when fixing ui
  { ignores: ["ojt-monitoring-files/**"] },
  {
    files: ["**/*.js"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: {
      sourceType: "commonjs",
      globals: globals.node,
    },
    rules: {
      "no-unused-vars": "warn",
    },
  },
  {
    files: ["tests/**/*.js"],
    languageOptions: { globals: { ...globals.node, ...globals.jest } },
  },
]);
