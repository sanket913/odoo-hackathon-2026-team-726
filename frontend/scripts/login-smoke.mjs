import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const baseURL = process.env.UI_BASE_URL || 'http://localhost:5173'
const browser = await chromium.launch({ channel: 'msedge', headless: true })
try {
  for (const role of ['Employee', 'HR Manager', 'HR Payroll User', 'HR Payroll Manager', 'Admin']) {
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.goto(`${baseURL}/login`)
    await page.getByRole('button', { name: role, exact: true }).click()
    await page.getByRole('button', { name: 'Show password', exact: true }).click()
    assert.equal(await page.getByLabel('Password', { exact: true }).getAttribute('type'), 'text')
    await page.getByRole('button', { name: 'Hide password', exact: true }).click()
    const response = page.waitForResponse(r => r.url().endsWith('/auth/login') && r.request().method() === 'POST')
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    assert.equal((await response).status(), 200)
    await page.waitForURL('**/employees')
    const refresh = page.waitForResponse(r => r.url().endsWith('/auth/refresh') && r.request().method() === 'POST')
    await page.reload()
    assert.equal((await refresh).status(), 200)
    await page.getByRole('heading', { name: 'Employees', exact: true }).waitFor()
    console.log(`${role}: login and session refresh passed`)
    await context.close()
  }
  const page = await browser.newPage()
  await page.goto(`${baseURL}/login`)
  await page.getByRole('button', { name: 'Admin', exact: true }).click()
  await page.getByLabel('Password', { exact: true }).fill('incorrect-password')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await page.getByRole('alert').waitFor()
  assert.doesNotMatch(await page.getByRole('alert').innerText(), /network error/i)
  assert.match(page.url(), /\/login$/)
  await page.route('**/api/v1/auth/login', route => route.abort('failed'))
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await page.getByText("We couldn't reach PeoplePay360. Please check your connection and try again.").waitFor()
  console.log('Incorrect credentials and connection-error feedback passed')
} finally {
  await browser.close()
}
