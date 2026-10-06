import tseslint from 'typescript-eslint';
import prettierPlugin from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';
import importX from 'eslint-plugin-import-x';

const importOrderRule = [
  'error',
  {
    groups: ['builtin', 'external', ['internal', 'parent', 'sibling', 'index']],
    'newlines-between': 'always',
  },
];

export default [
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: 'tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    settings: {
      'import-x/internal-regex': '^(@common|@components|@integrations|src)/|^package\\.json$',
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      prettier: prettierPlugin,
      'import-x': importX,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...prettierConfig.rules,
      'prettier/prettier': 'error',
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'import-x/order': importOrderRule,
    },
  },
  {
    ignores: ['coverage/**', 'dist/**', 'lib/**/*.js', 'eslint.config.js', 'jest.config.js', 'node_modules/**'],
  },
];
