module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/tests/load/'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['src/**/*.ts'],
};
