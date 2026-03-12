import typescriptRules from "@ethberry/eslint-config/presets/tsx.mjs";

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
          "./packages/*/tsconfig.eslint.json",
          "./services/*/tsconfig.eslint.json",
        ],
        tsconfigRootDir: process.dirname,
      },
    },
  },

  ...typescriptRules,
];
