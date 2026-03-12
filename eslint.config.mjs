import typescriptRules from "@ethberry/eslint-config/presets/tsx.mjs";
import jestRules from "@ethberry/eslint-config/tests/jest.mjs";

// DON'T ADD ANY RULES!
// FIX YOUR SHIT!!!

export default [
  {
    ignores: [
      "**/dist",
      "**/static",
      "contracts",
      "eslint.config.mjs"
    ]
  },

  {
    languageOptions: {
      parserOptions: {
        project: [
          "./tsconfig.eslint.json",
          "./services/*/tsconfig.eslint.json",
        ],
        tsconfigRootDir: process.dirname,
      },
    },
  },

  ...typescriptRules,
  ...jestRules,
];
