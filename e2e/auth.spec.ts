import { test, expect } from '@playwright/test'

/**
 * Authentication flow E2E tests.
 *
 * These tests verify the login page renders correctly, handles
 * invalid credentials, and enforces route protection for
 * unauthenticated users.
 */

test.describe('Authentication Flows', () => {
  test('login page renders with email and password fields', async ({ page }) => {
    await page.goto('/login')

    // Verify the page title / branding
    await expect(page.getByText('Chester Business Scorecard')).toBeVisible()

    // Verify email input
    const emailInput = page.getByPlaceholder('Email')
    await expect(emailInput).toBeVisible()
    await expect(emailInput).toHaveAttribute('type', 'email')

    // Verify password input
    const passwordInput = page.getByPlaceholder('Password')
    await expect(passwordInput).toBeVisible()

    // Verify sign in button
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()

    // Verify forgot password link
    await expect(page.getByRole('button', { name: /forgot password/i })).toBeVisible()

    // Verify privacy policy and terms links
    await expect(page.getByRole('link', { name: /privacy policy/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /terms of service/i })).toBeVisible()
  })

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/login')

    // Fill in invalid credentials
    await page.getByPlaceholder('Email').fill('invalid@example.com')
    await page.getByPlaceholder('Password').fill('wrongpassword123')

    // Submit the form
    await page.getByRole('button', { name: /sign in/i }).click()

    // Wait for the error toast to appear
    // The login form uses sonner toast with "Invalid email or password"
    await expect(page.getByText('Invalid email or password')).toBeVisible({
      timeout: 10_000,
    })
  })

  test('sign in button shows loading state when clicked', async ({ page }) => {
    await page.goto('/login')

    await page.getByPlaceholder('Email').fill('test@example.com')
    await page.getByPlaceholder('Password').fill('somepassword')

    // Click sign in and check for loading text
    await page.getByRole('button', { name: /sign in/i }).click()

    // The button text changes to "Signing in..." while loading
    await expect(page.getByRole('button', { name: /signing in/i })).toBeVisible()
  })

  test('unauthenticated access to home page redirects to login', async ({ page }) => {
    // Try to access the protected home page directly
    await page.goto('/')

    // Should be redirected to /login
    await page.waitForURL('**/login', { timeout: 10_000 })
    await expect(page.getByText('Chester Business Scorecard')).toBeVisible()
  })

  test('unauthenticated access to portfolio redirects to login', async ({ page }) => {
    await page.goto('/portfolio')

    await page.waitForURL('**/login', { timeout: 10_000 })
    await expect(page.getByPlaceholder('Email')).toBeVisible()
  })

  test('unauthenticated access to admin routes redirects to login', async ({ page }) => {
    await page.goto('/admin/security')

    await page.waitForURL('**/login', { timeout: 10_000 })
    await expect(page.getByPlaceholder('Email')).toBeVisible()
  })

  test('unauthenticated access to city dashboard redirects to login', async ({ page }) => {
    await page.goto('/city')

    await page.waitForURL('**/login', { timeout: 10_000 })
    await expect(page.getByPlaceholder('Email')).toBeVisible()
  })

  test('password toggle shows and hides password text', async ({ page }) => {
    await page.goto('/login')

    const passwordInput = page.getByPlaceholder('Password')
    await passwordInput.fill('mypassword')

    // Initially type is password (masked)
    await expect(passwordInput).toHaveAttribute('type', 'password')

    // Click the toggle button (the eye icon button)
    // The toggle is a sibling button inside the same relative div
    const toggleButton = page.locator('button').filter({ has: page.locator('svg') }).nth(0)
    await toggleButton.click()

    // After clicking, password should be visible
    await expect(passwordInput).toHaveAttribute('type', 'text')
  })

  test('login page has correct page structure', async ({ page }) => {
    await page.goto('/login')

    // Verify the Velocity logo is present
    const logo = page.getByAlt('Velocity')
    await expect(logo).toBeVisible()

    // Verify the tagline
    await expect(page.getByText('Doing good by doing well')).toBeVisible()
  })
})
