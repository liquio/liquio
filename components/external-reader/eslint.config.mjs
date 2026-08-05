import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import noRelativeImportPaths from 'eslint-plugin-no-relative-import-paths';
import eslintPluginImport from 'eslint-plugin-import';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      ecmaVersion: 5,
      sourceType: 'module',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    settings: {
      'import/resolver': {
        'eslint-import-resolver-custom-alias': {
          alias: {
            '@common': './src/common',
            '@components': './src/components',
            '@integrations': './src/integrations',
            src: './src/',
          },
          extensions: ['.js', '.jsx', '.ts', '.tsx'],
        },
      },
    },
    plugins: {
      import: eslintPluginImport,
      'no-relative-import-paths': noRelativeImportPaths,
    },
  },
  {
    rules: {
      // ts rules
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // prettier
      'prettier/prettier': ['error', { endOfLine: 'auto' }],

      // js rules
      'arrow-parens': ['error', 'always'],
      'require-await': 'error',

      // import rules
      'no-relative-import-paths/no-relative-import-paths': ['error', { allowSameFolder: true }],
      'import/order': [
        'error',
        {
          'newlines-between': 'always',
          pathGroups: [
            {
              pattern: '@nest/**',
              group: 'external',
              position: 'after',
            },
            {
              pattern: '@/**',
              group: 'external',
              position: 'after',
            },
            {
              pattern: '@*/**',
              group: 'external',
              position: 'after',
            },
            {
              pattern: './**',
              group: 'external',
              position: 'after',
            },
          ],
          pathGroupsExcludedImportTypes: ['external'],
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
    },
  },
);
