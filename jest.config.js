module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/*.test.ts"],
  moduleNameMapper: {
    "^obsidian$": "<rootDir>/src/__mocks__/obsidian.ts",
  },
};
