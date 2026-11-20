/**
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */

/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest/presets/js-with-ts',
  coverageProvider: 'v8',
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.spec.ts', '!src/**/*.d.ts'],
  coverageReporters: ['text', 'text-summary', 'json-summary', 'lcov'],
  testMatch: ['**/*.spec.[tj]s?(x)', '**/*.e2e-spec.[tj]s?(x)'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  watchPathIgnorePatterns: ['<rootDir>/dist/'],
};

module.exports = config;
