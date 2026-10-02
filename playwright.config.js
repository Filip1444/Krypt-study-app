const { defineConfig } = require('@playwright/test')

module.exports = defineConfig({
  testDir: './tests/ui',
  timeout: 30000,
  expect: { timeout: 5000 },
  workers: 1,
  fullyParallel: false,
  reporter: 'list'
})
