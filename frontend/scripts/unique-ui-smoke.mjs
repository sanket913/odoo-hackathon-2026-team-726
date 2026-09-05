// UNIQUE FEATURE - real API browser verification using the isolated MySQL QA fixture.
import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
const fixture = JSON.parse(await readFile('ui-audit/unique-mysql.json'))
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const base = process.env.UI_BASE_URL || 'http://localhost:5173'
try {
  for (const [role, count] of [['Admin',7],['HR Manager',5],['HR Payroll User',3],['HR Payroll Manager',3],['Employee',2]]) {
    const context=await browser.newContext({viewport:{width:1440,height:1000}})
    const page=await context.newPage()
    const errors=[]
    page.on('pageerror',e=>errors.push(e.message))
    await page.goto(base+'/login')
    await page.getByRole('button',{name:role,exact:true}).click()
    const loginResponse=page.waitForResponse(r=>r.url().endsWith('/auth/login'))
    await page.getByRole('button',{name:'Sign in',exact:true}).click()
    const login=(await (await loginResponse).json()).data
    await page.waitForURL('**/employees')
    await page.goto(`${base}/employees/${role==='Employee' ? login.user.employee_id : fixture.employee_id}`)
    await page.locator('main h1').waitFor()
    assert.equal(await page.locator('.o_smart_button').count(),count,role)
    if(role==='Admin') {
      await page.goto(`${base}/payroll/dashboard`)
      await page.getByLabel('Department',{exact:true}).selectOption(String(fixture.department_id))
      await page.getByText('INR 13,000.00').first().waitFor()
      await page.goto(`${base}/attendance/${fixture.attendance_id}`)
      await page.getByText('Auto Absent - worked < 4 hours').waitFor()
      await page.getByText('OFFICE',{exact:true}).waitFor()
      await page.goto(`${base}/payroll/payruns/${fixture.payrun_id}`)
      await page.getByText(`Bank account missing for employee ${fixture.employee_id}`,{exact:false}).waitFor()
      await page.getByRole('button', {name: 'Email Payslips', exact: true}).waitFor()
      for(const width of [1440,768,390]) {
        await page.setViewportSize({width,height:1000})
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false)
        await page.screenshot({path:`ui-audit/unique-payrun-${width}.png`,fullPage:true})
      }
    }
    assert.deepEqual(errors,[])
    console.log(`${role}: backend smart buttons verified; browser errors: 0`)
    await context.close()
  }
} finally { await browser.close() }
