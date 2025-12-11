/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {}],
  },
  testPathIgnorePatterns: ['/bundle/', '/dist/'],
  testMatch: ['**/*.spec.ts'],
};
