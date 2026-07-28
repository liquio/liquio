/**
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */

/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest/presets/js-with-ts',
  coverageProvider: 'v8',
  // Scoped to the actual naming convention (*.spec.[jt]s) rather than Jest's default, which also
  // matches any file literally named "test.js"/"test.ts" — a false positive on src/controllers/test.ts
  // (the Test Controller, not a test file).
  testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/*.spec.[tj]s?(x)'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  watchPathIgnorePatterns: ['<rootDir>/dist/'],
};

module.exports = config;
