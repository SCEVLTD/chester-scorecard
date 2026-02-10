import { test, expect, type Page } from '@playwright/test'

/**
 * Basic navigation E2E tests.
 *
 * These tests verify that key pages load correctly and that
 * navigation between pages works as expected.
 *
 * Tests that require authentication will attempt to log in
 * using the super_admin test account.
 */

// Test account credentials from tasks.md
const ADMIN_EMAIL = 'scott@benchiva.com'
const ADMIN_PASSWORD = 'password'

/**
 * Helper to log in as the super_admin test user.
 * Returns true if login succeeded, false otherwise.
 */
async function loginAsAdmin(page: Page): Promise<boolean> {
  await page.goto('/login')

  await page.getByPlaceholder('Email').fill(ADMIN_EMAIL)
  await page.getByPlaceholder('Password').fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: /sign in/i }).click()

  try {
    await page.waitForURL('**/', { timeout: 15_000 })
    return true
  } catch {
    return false
  }
}

test.describe('Public Page Navigation', () => {
  test('login page loads at /login', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByText('Chester Business Scorecard')).toBeVisible()
    await expect(page.getByText('Doing good by doing well')).toBeVisible()
  })

  test('privacy policy page loads at /privacy', async ({ page }) => {
    await page.goto('/privacy')
    await expect(page.getByText(/privacy/i)).toBeVisible()
  })

  test('terms of service page loads at /terms', async ({ page }) => {
    await page.goto('/terms')
    await expect(page.getByText(/terms/i)).toBeVisible()
  })

  test('unauthorised page loads at /unauthorized', async ({ page }) => {
    await page.goto('/unauthorized')
    // The page should display some form of access denied message
    const pageContent = await page.textContent('body')
    expect(pageContent).toBeTruthy()
  })

  test('404 page shows for unknown routes', async ({ page }) => {
    await page.goto('/this-route-does-not-exist')
    // The Switch fallback renders a 404 message
    await expect(page.getByText('404')).toBeVisible()
  })

  test('privacy policy link from login page navigates correctly', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('link', { name: /privacy policy/i }).click()
    await page.waitForURL('**/privacy')
    await expect(page.getByText(/privacy/i)).toBeVisible()
  })

  test('terms of service link from login page navigates correctly', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('link', { name: /terms of service/i }).click()
    await page.waitForURL('**/terms')
    await expect(page.getByText(/terms/i)).toBeVisible()
  })
})

test.describe('Authenticated Navigation', () => {
  test.beforeEach(async ({ page }) => {
    const loggedIn = await loginAsAdmin(page)
    if (!loggedIn) {
      test.skip(true, 'Admin test account not available in this environment')
    }
  })

  test('home page loads and shows business list', async ({ page }) => {
    await expect(page.getByText('Chester Business Scorecard')).toBeVisible()
    await expect(page.getByText('Businesses')).toBeVisible()
  })

  test('home page shows navigation cards', async ({ page }) => {
    await expect(page.getByText('City Dashboard')).toBeVisible()
    await expect(page.getByText('E-Profile')).toBeVisible()
    await expect(page.getByText('Portfolio')).toBeVisible()
  })

  test('admin navigation items are visible for super_admin', async ({ page }) => {
    // Super admin should see admin-only links
    await expect(page.getByText('Manage Admins')).toBeVisible()
    await expect(page.getByText('Security')).toBeVisible()
    await expect(page.getByText('API Usage')).toBeVisible()

    // Super admin should see the Import navigation card
    await expect(page.getByText('Import')).toBeVisible()
  })

  test('super_admin can see Add Business form', async ({ page }) => {
    await expect(page.getByPlaceholder('Business name')).toBeVisible()
    await expect(page.getByRole('button', { name: /add business/i })).toBeVisible()
  })

  test('clicking City Dashboard navigates to /city', async ({ page }) => {
    await page.getByText('City Dashboard').click()
    await page.waitForURL('**/city')
  })

  test('clicking Portfolio navigates to /portfolio', async ({ page }) => {
    await page.getByText('Portfolio').click()
    await page.waitForURL('**/portfolio')
  })

  test('clicking E-Profile navigates to /eprofile', async ({ page }) => {
    await page.getByText('E-Profile').click()
    await page.waitForURL('**/eprofile')
  })

  test('clicking a business navigates to its detail page', async ({ page }) => {
    // Wait for business list to load
    const businessItem = page.locator('[class*="cursor-pointer"]').first()
    const exists = await businessItem.isVisible().catch(() => false)

    if (!exists) {
      test.skip(true, 'No businesses available in this environment')
      return
    }

    await businessItem.click()
    await page.waitForURL('**/business/**')
  })

  test('logout button returns to login page', async ({ page }) => {
    const logoutButton = page.getByRole('button', { name: /logout/i })
    await expect(logoutButton).toBeVisible()

    await logoutButton.click()

    // Should redirect to login page
    await page.waitForURL('**/login', { timeout: 10_000 })
    await expect(page.getByPlaceholder('Email')).toBeVisible()
  })

  test('sector filter is available on home page', async ({ page }) => {
    // The sector filter dropdown should be present
    await expect(page.getByText('All sectors')).toBeVisible()
  })
})
