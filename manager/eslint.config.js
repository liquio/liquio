const globals = require('globals');
const js = require('@eslint/js');
const jsdoc = require('eslint-plugin-jsdoc');
const tseslint = require('typescript-eslint');

module.exports = [
  js.configs.recommended,
  {
    files: ['**/*.js', '**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.jest,
        config: 'readonly',
        db: 'readonly',
        log: 'readonly',
        models: 'readonly',
        businesses: 'readonly',
      },
    },
    plugins: { jsdoc },
    rules: {
      'max-len': [
        'error',
        {
          code: 150,
          ignoreComments: true,
          ignoreStrings: true,
          ignoreTemplateLiterals: true,
        },
      ],
      indent: ['error', 2, { SwitchCase: 1 }],
      'linebreak-style': ['error', 'unix'],
      'eol-last': ['error', 'always'],
      quotes: ['warn', 'single'],
      semi: ['error', 'always'],
      'no-console': 'off',
      'no-var': 'error',
      'brace-style': ['error', '1tbs', { allowSingleLine: true }],
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  ...tseslint.configs.recommended.map((c) => ({ ...c, files: c.files ?? ['**/*.ts'] })),
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: 'tsconfig.json',
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    ignores: ['coverage/**', 'dist/**', 'node_modules/**'],
  },
];
