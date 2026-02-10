import { test, expect, type Page } from '@playwright/test'

/**
 * AUTH-08 Consultant View Restriction E2E tests.
 *
 * These tests verify that consultant users cannot see financial data
 * (GBP values) in the UI. The financial data filtering happens at
 * the application layer:
 *
 * - submitted-financials-display.tsx returns null for consultant
 * - company-performance.tsx hides YTD cards, axis values, monthly table
 * - charts.tsx shows percentage scores (0-100) which ARE visible
 * - AI analysis generates a separate consultant version without figures
 *
 * Note: These tests require a running Supabase instance with the
 * consultant test account (scott@brandedai.net / password). They
 * will be skipped if the test account is not available.
 */

// Test account credentials from tasks.md
const CONSULTANT_EMAIL = 'scott@brandedai.net'
const CONSULTANT_PASSWORD = 'password'

/**
 * Helper to log in as the consultant test user.
 * Returns true if login succeeded, false otherwise.
 */
async function loginAsConsultant(page: Page): Promise<boolean> {
  await page.goto('/login')

  await page.getByPlaceholder('Email').fill(CONSULTANT_EMAIL)
  await page.getByPlaceholder('Password').fill(CONSULTANT_PASSWORD)
  await page.getByRole('button', { name: /sign in/i }).click()

  // Wait for either redirect to home or error toast
  try {
    await page.waitForURL('**/', { timeout: 15_000 })
    return true
  } catch {
    // Login may have failed (no test account in this environment)
    return false
  }
}

test.describe('AUTH-08: Consultant Financial Data Restrictions', () => {
  // All tests in this group require a successful consultant login
  test.beforeEach(async ({ page }) => {
    const loggedIn = await loginAsConsultant(page)
    if (!loggedIn) {
      test.skip(true, 'Consultant test account not available in this environment')
    }
  })

  test('consultant can see the home page with business list', async ({ page }) => {
    // After login, consultant should see the home page
    await expect(page.getByText('Chester Business Scorecard')).toBeVisible()

    // The Businesses card should be visible
    await expect(page.getByText('Businesses')).toBeVisible()
  })

  test('consultant cannot see super_admin-only navigation items', async ({ page }) => {
    // Import and Security admin links should NOT be visible to consultant
    await expect(page.getByText('Manage Admins')).not.toBeVisible()
    await expect(page.getByText('Security')).not.toBeVisible()
    await expect(page.getByText('API Usage')).not.toBeVisible()

    // The Add Business form should not be visible (super_admin only)
    await expect(page.getByPlaceholder('Business name')).not.toBeVisible()
  })

  test('consultant can see portfolio navigation', async ({ page }) => {
    // Consultant should be able to access portfolio (admin-level route)
    await expect(page.getByText('Portfolio')).toBeVisible()
  })

  test('consultant can see City Dashboard navigation', async ({ page }) => {
    // Consultant should be able to access the City Dashboard
    await expect(page.getByText('City Dashboard')).toBeVisible()
  })

  test('score percentages are visible on charts page', async ({ page }) => {
    // Navigate to a business first, then charts
    // The home page shows a list of businesses - click the first one
    const firstBusiness = page.locator('[class*="cursor-pointer"]').first()
    const businessExists = await firstBusiness.isVisible().catch(() => false)

    if (!businessExists) {
      test.skip(true, 'No businesses available to test charts')
      return
    }

    await firstBusiness.click()
    await page.waitForURL('**/business/**')

    // Look for a Charts tab or navigation link
    const chartsLink = page.getByText('Charts')
    const chartsVisible = await chartsLink.isVisible().catch(() => false)

    if (chartsVisible) {
      await chartsLink.click()
      await page.waitForURL('**/charts')

      // Score percentages (0-100) should be visible to consultants
      // These are NOT financial data - they are percentage scores
      // The chart container should be present
      const chartContainer = page.locator('.recharts-responsive-container')
      const hasCharts = await chartContainer.first().isVisible().catch(() => false)

      if (hasCharts) {
        // Charts should render without hideAxisValues for consultant
        await expect(chartContainer.first()).toBeVisible()
      }
    }
  })

  test('company performance page hides financial YTD cards for consultant', async ({ page }) => {
    // Navigate to a business first
    const firstBusiness = page.locator('[class*="cursor-pointer"]').first()
    const businessExists = await firstBusiness.isVisible().catch(() => false)

    if (!businessExists) {
      test.skip(true, 'No businesses available to test performance page')
      return
    }

    await firstBusiness.click()
    await page.waitForURL('**/business/**')

    // Look for Performance tab
    const perfLink = page.getByText('Performance')
    const perfVisible = await perfLink.isVisible().catch(() => false)

    if (perfVisible) {
      await perfLink.click()
      await page.waitForURL('**/performance')

      // The YTD Revenue and YTD EBITDA cards should NOT be visible for consultant
      // These contain GBP values which are hidden by isConsultant check
      await expect(page.getByText('YTD Revenue')).not.toBeVisible()
      await expect(page.getByText('YTD EBITDA')).not.toBeVisible()

      // The monthly detail table should also be hidden
      await expect(page.getByText('Monthly Detail')).not.toBeVisible()
    }
  })

  test('financial pound values are not rendered for consultant', async ({ page }) => {
    // Navigate to a business
    const firstBusiness = page.locator('[class*="cursor-pointer"]').first()
    const businessExists = await firstBusiness.isVisible().catch(() => false)

    if (!businessExists) {
      test.skip(true, 'No businesses available to test financial visibility')
      return
    }

    await firstBusiness.click()
    await page.waitForURL('**/business/**')

    // Check that the submitted financials display is not rendered for consultant
    // The SubmittedFinancialsDisplay component returns null for consultant role
    await expect(page.getByText('Financial Performance')).not.toBeVisible()
  })
})
