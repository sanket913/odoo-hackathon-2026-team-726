import { chromium } from 'playwright'
import { readFile, mkdir, writeFile } from 'node:fs/promises'

// Runs against the existing local API. Only signs in, reads data, and checks
// eligibility. Never creates/edits records or executes payroll transitions.
const baseURL = process.env.UI_BASE_URL || 'http://localhost:5173'
const apiURL = process.env.UI_API_URL || 'http://127.0.0.1:8000/api/v1'
const out = 'ui-audit'
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' })
const page = await context.newPage()
const errors = [], results = [], checks = []
page.on('pageerror', error => errors.push(error.message))
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
try {
  await page.goto(`${baseURL}/login`)
  await page.getByLabel('Email address').waitFor()
  await page.screenshot({ path: `${out}/login-desktop.png`, fullPage: true })
  await page.getByLabel('Email address').fill(process.env.UI_EMAIL || 'admin@peoplepay360.com')
  await page.getByLabel('Password', { exact: true }).fill(process.env.UI_PASSWORD || 'Admin@123')
  const loginResponse = page.waitForResponse(r => r.url().endsWith('/auth/login') && r.request().method() === 'POST')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  const login = await (await loginResponse).json()
  await page.waitForURL('**/employees')
  // Clear expected unauthenticated bootstrap 401 messages before the session.
  errors.length = 0
  const headers = { Authorization: `Bearer ${login.data.access_token}` }
  const theme = await page.evaluate(() => ({
    body: getComputedStyle(document.body).color,
    background: getComputedStyle(document.body).backgroundColor,
    topbar: getComputedStyle(document.querySelector('.o_topbar')).backgroundColor,
    topbarHeight: document.querySelector('.o_topbar').getBoundingClientRect().height,
  }))
  if (theme.body !== 'rgb(28, 35, 48)' || theme.background !== 'rgb(252, 251, 253)' || theme.topbar !== 'rgb(107, 74, 122)' || theme.topbarHeight !== 46) throw new Error(`Theme mismatch: ${JSON.stringify(theme)}`)
  checks.push('Computed light theme, text contrast palette, and 46px purple navbar')
  const families = {
    employees: 'employees', contracts: 'contracts', schedules: 'schedules', attendance: 'attendance',
    'time-off/requests': 'time-off/requests', 'time-off/allocations': 'time-off/allocations', 'time-off/types': 'time-off/types',
    'payroll/payruns': 'payruns', 'payroll/payslips': 'payslips', 'payroll/salary-structures': 'salary-structures', 'payroll/salary-rules': 'salary-rules',
  }
  const ids = {}
  for (const [route, endpoint] of Object.entries(families)) {
    const response = await context.request.get(`${apiURL}/${endpoint}`, { headers })
    if (!response.ok()) throw new Error(`Cannot discover ${endpoint}: ${response.status()}`)
    const data = (await response.json()).data
    if (!data?.length) throw new Error(`No existing record available for ${route}`)
    ids[route] = data[0].id
  }
  const source = await readFile('src/App.jsx', 'utf8')
  const routes = [...source.matchAll(/<Route path="([^"]+)"/g)].map(m => m[1]).filter(r => r !== '*' && r !== '/login' && r !== '/')
  for (const pattern of routes) {
    const family = pattern.slice(1).split('/:')[0]
    const route = pattern.replace(/:[^/]+/, ids[family])
    await page.goto(baseURL + route)
    await page.locator('main h1').waitFor({ timeout: 15000 })
    await page.waitForLoadState('networkidle')
    const title = await page.locator('main h1').innerText()
    const failed = await page.getByText(/Could not load|Something went wrong|Access restricted/).count()
    if (failed) throw new Error(`${route}: failed page state`)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)
    results.push({ pattern, route, title, desktopOverflow: overflow })
  }
  console.log(`Desktop: ${results.length} routes loaded`)
  for (const [name, route] of Object.entries({ employees: '/employees', employee: `/employees/${ids.employees}`, dashboard: '/payroll/dashboard', payrun: `/payroll/payruns/${ids['payroll/payruns']}`, form: '/employees/new' })) {
    await page.goto(baseURL + route)
    await page.locator('main h1').waitFor()
    await page.waitForLoadState('networkidle')
    await page.screenshot({ path: `${out}/${name}-desktop.png`, fullPage: true })
  }
  await page.goto(`${baseURL}/employees`)
  await page.getByRole('button', { name: 'Kanban view' }).click()
  await page.locator('.o_kanban_view').waitFor()
  await page.getByRole('button', { name: 'List view', exact: true }).click()
  await page.getByLabel('Search employees').fill('Ava')
  await page.waitForLoadState('networkidle')
  if (!(await page.locator('tbody').innerText()).includes('Ava')) throw new Error('Employee search failed')
  checks.push('Employee list/kanban toggle and real API search')
  await page.goto(`${baseURL}/employees/${ids.employees}`)
  for (const label of ['Attendance', 'Time Off', 'Allocations', 'Contracts']) await page.locator('.o_notebook').getByRole('button', { name: label, exact: true }).click()
  checks.push('Employee notebook navigation')
  await page.getByRole('button', { name: 'Private Information', exact: true }).click()
  await page.getByText('Bank account', { exact: true }).waitFor()
  await page.getByRole('button', { name: 'Work Information', exact: true }).click()
  checks.push('Employee Work / Private Information tabs preserve record fields')
  await page.goto(`${baseURL}/schedules`)
  await page.getByRole('button', { name: 'Calendar', exact: true }).click()
  await page.getByRole('columnheader', { name: 'Monday', exact: true }).waitFor()
  await page.screenshot({ path: `${out}/schedules-calendar-desktop.png`, fullPage: true })
  await page.getByRole('button', { name: 'List', exact: true }).click()
  await page.getByText('Columns', { exact: true }).click()
  await page.getByRole('checkbox', { name: 'Days / Week', exact: true }).uncheck()
  if (await page.getByRole('columnheader', { name: 'Days / Week', exact: true }).count()) throw new Error('Column visibility control failed')
  await page.getByRole('checkbox', { name: 'Days / Week', exact: true }).check()
  checks.push('Schedule calendar/list switch and column controls')
  await page.goto(`${baseURL}/admin/users`)
  await page.getByRole('button', { name: 'Edit roles' }).first().click()
  await page.getByRole('dialog').waitFor()
  await page.keyboard.press('Escape')
  if (await page.getByRole('dialog').count()) throw new Error('Modal Escape failed')
  checks.push('Role modal opens and closes without saving')
  await page.getByRole('button', { name: 'New User', exact: true }).click()
  await page.getByRole('dialog', { name: 'New User', exact: true }).waitFor()
  await page.getByLabel('Initial password').waitFor()
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  checks.push('New user form opens with supported fields; no account created')
  await page.getByRole('button', { name: 'My attendance', exact: true }).click()
  await page.getByRole('dialog', { name: 'My attendance', exact: true }).waitFor()
  await page.waitForLoadState('networkidle')
  await page.screenshot({ path: `${out}/attendance-widget-desktop.png`, fullPage: true })
  await page.keyboard.press('Escape')
  checks.push('Personal attendance popup reads actual status without recording attendance')
  await page.goto(`${baseURL}/employees/${ids.employees}/edit`)
  await page.getByLabel('Full name').waitFor()
  if (!await page.getByLabel('Full name').inputValue()) throw new Error('Employee edit defaults missing')
  await page.getByRole('link', { name: 'Cancel', exact: true }).click()
  await page.waitForURL(`**/employees/${ids.employees}`)
  checks.push('Employee edit loads persisted values and Cancel returns to detail')
  await page.goto(`${baseURL}/payroll/payruns/new`)
  await page.getByLabel('Salary structure').selectOption(String(ids['payroll/salary-structures']))
  await page.getByLabel('Period start').fill('2026-10-01')
  await page.getByLabel('Period end').fill('2026-10-31')
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await page.getByText('Step 2 of 2', { exact: true }).waitFor()
  await page.screenshot({ path: `${out}/payrun-step2-desktop.png`, fullPage: true })
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await page.getByText('Step 1 of 2', { exact: true }).waitFor()
  checks.push('Real payrun eligibility advances to step 2 and Back preserves step 1')
  await page.goto(`${baseURL}/payroll/payslips/${ids['payroll/payslips']}`)
  const downloadEvent = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download PDF' }).click()
  const download = await downloadEvent
  if (await download.failure()) throw new Error('Payslip PDF download failed')
  checks.push('Existing payslip PDF download')
  for (const width of [1280, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 900 })
    for (const result of results) {
      await page.goto(baseURL + result.route)
      await page.locator('main h1').waitFor()
      await page.waitForLoadState('networkidle')
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)
      result[`overflow${width}`] = overflow
    }
    await page.goto(`${baseURL}/employees`)
    await page.locator('main h1').waitFor()
    await page.waitForLoadState('networkidle')
    await page.screenshot({ path: `${out}/employees-${width}.png`, fullPage: true })
    if (width < 1024) {
      await page.getByRole('button', { name: 'Open navigation' }).click()
      await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Contracts', exact: true }).click()
      await page.waitForURL('**/contracts')
      checks.push(`Sidebar navigation works at ${width}px`)
    }
    console.log(`${width}px: ${results.length} routes checked`)
  }
  await page.getByRole('button', { name: 'Logout', exact: true }).click()
  await page.waitForURL('**/login')
  checks.push('Logout returns to login')
  await page.screenshot({ path: `${out}/login-mobile.png`, fullPage: true })
} finally {
  await writeFile(`${out}/results.json`, JSON.stringify({ results, checks, errors }, null, 2))
  await browser.close()
}
const overflows = results.filter(r => Object.entries(r).some(([key, value]) => key.toLowerCase().includes('overflow') && value))
console.log(JSON.stringify({ routes: results.length, checks, errors, overflows }, null, 2))
if (errors.length || overflows.length) process.exitCode = 1
