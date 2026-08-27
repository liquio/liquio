/**
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */

/** @type {import('jest').Config} */
const config = {
  coverageProvider: 'v8',

  // Transforms both .js and .ts test files through ts-jest.
  preset: 'ts-jest/presets/js-with-ts',

  testMatch: [
    '**/__tests__/**/*.(spec|test).[jt]s?(x)',
    '**/?(*.)+(spec|test).[tj]s?(x)'
  ],
  testPathIgnorePatterns: [
    '/validators/test\\.[jt]s$',
    '/node_modules/',
    '/dist/'
  ],
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  watchPathIgnorePatterns: ['<rootDir>/dist/'],
};

module.exports = config;
