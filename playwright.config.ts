/**
 * E2E Test Configuration
 * Playwright setup for end-to-end testing
 * Copyright © 2025 KilatCode Studio
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './e2e',

    // Run tests in parallel
    fullyParallel: true,

    // Fail fast on CI
    forbidOnly: !!process.env.CI,

    // Retries
    retries: process.env.CI ? 2 : 0,

    // Workers
    workers: process.env.CI ? 1 : undefined,

    // Reporter
    reporter: 'html',

    // Shared settings
    use: {
        // Base URL
        baseURL: 'http://localhost:3000',

        // Collect trace on first retry
        trace: 'on-first-retry',

        // Screenshot on failure
        screenshot: 'only-on-failure',

        // Video on failure
        video: 'retain-on-failure'
    },

    // Configure projects for different browsers
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] }
        },
        {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] }
        },
        {
            name: 'webkit',
            use: { ...devices['Desktop Safari'] }
        },
        // Mobile viewports
        {
            name: 'Mobile Chrome',
            use: { ...devices['Pixel 5'] }
        },
        {
            name: 'Mobile Safari',
            use: { ...devices['iPhone 12'] }
        }
    ],

    // Run local dev server before tests
    webServer: {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000
    }
});
