module.exports = {
  // parser: `@babel/eslint-parser`,
  parserOptions: {
    requireConfigFile: false,
    ecmaFeatures: {
      experimentalDecorators: true,
    },
    ecmaVersion: "latest",
    sourceType: "module",
  },
  plugins: ["file-progress", "prettier"],
  extends: [
    "eslint:recommended",
    "eslint-config-prettier",
    "google",
    "plugin:prettier/recommended",
  ],
  rules: {
    "file-progress/activate": 1,
    /* "prettier/prettier": [
      "warn",
      {
        singleQuote: false,
        semi: true,
        quoteProps: "consistent",
        objectCurlySpacing: "always",
        trailingComma: "all",
      },
    ],*/
    "prettier/prettier": [
      "error",
      {
        endOfLine: "auto",
      },
      {
        usePrettierrc: true,
      },
    ],
    "object-curly-spacing": [2, "always"],
    quotes: [2, "double", { avoidEscape: true }],
    curly: [2, "all"],
    "new-cap": "off",
    "require-jsdoc": "off",
    semi: "error",
    "no-unused-expressions": "off",
    camelcase: "off",
    "no-invalid-this": "off",
  },
  env: {
    es6: true,
    node: true,
    jest: true,
  },
  ignorePatterns: [
    "**/models",
    "**/repositories",
    "**/reports",
    "**/dist",
    "**/coverage",
  ],
  overrides: [
    {
      files: ["*.ts"],
      parser: "@typescript-eslint/parser",
      plugins: ["@typescript-eslint/eslint-plugin"],
      extends: ["plugin:@typescript-eslint/recommended"],
      rules: {
        "valid-jsdoc": [
          "error",
          {
            requireParamType: false,
            requireReturnType: false,
            prefer: {
              arg: "param",
              argument: "param",
              class: "constructor",
              return: "return",
              virtual: "abstract",
            },
          },
        ],
        "@typescript-eslint/explicit-function-return-type": ["error"],
        "@typescript-eslint/no-non-null-assertion": ["off"],
        "prettier/prettier": [
          "error",
          {
            endOfLine: "auto",
          },
          {
            usePrettierrc: true,
          },
        ],
      },
    },
    {
      files: [
        "**/common/**/*.ts",
        "**/bin/**/*.ts",
        "**/api/**/*.ts",
        "**/medusa-js/**/resources/**/*.ts",
      ],
      rules: {
        "valid-jsdoc": ["off"],
      },
    },
    {
      // Medusa JS client
      files: ["**/medusa-js/**/resources/**/*.ts"],
      rules: {
        "valid-jsdoc": ["off"],
      },
    },
    {
      files: ["**/api/**/*.ts"],
      rules: {
        "valid-jsdoc": ["off"],
        "@typescript-eslint/explicit-function-return-type": ["off"],
        "@typescript-eslint/no-var-requires": ["off"],
      },
    },
  ],
};
