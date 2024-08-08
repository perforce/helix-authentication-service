import unicorn from "eslint-plugin-unicorn";
import globals from "globals";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all
});

export default [
  {
    // ignores is a unique snowflake that needs to come before everything else
    // or it will have no effect
    ignores: ["client/dist/assets/*", "private/admin/assets/*"],
  },
  ...compat.extends("eslint:recommended"), {
    plugins: {
      unicorn,
    },

    languageOptions: {
      globals: {
        ...globals.node,
      },

      ecmaVersion: "latest",
      sourceType: "module",
    },

    rules: {
      "unicorn/prefer-module": "error",
      "unicorn/prefer-node-protocol": "warn",
    },
  }
];