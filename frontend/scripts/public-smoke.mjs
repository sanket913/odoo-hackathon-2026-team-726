import { chromium } from 'playwright'
import assert from 'node:assert/strict'
const base = process.env.UI_BASE_URL || 'http://localhost:5173'
const browser = await chromium.launch({channel:'msedge',headless:true})
try {
  const page = await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'})
  const errors=[]
  page.on('pageerror',error=>errors.push(error.message))
  await page.goto(base+'/')
  await page.getByRole('heading',{level:1}).waitFor()
  await page.evaluate(()=>document.fonts.ready)
  assert.equal(await page.locator('.pp-module').count(),10)
  for(const width of [1440,1280,1024,768,390]) {
    await page.setViewportSize({width,height:1000})
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`${width}px overflow`)
    await page.screenshot({path:`ui-audit/landing-${width}.png`,fullPage:true})
    if(width<=1024) await page.getByRole('button',{name:'Open menu'}).click()
    for(const link of await page.locator('#public-navigation a[href^="#"]').all()) {
      const href=await link.getAttribute('href')
      await link.click()
      assert.equal(new URL(page.url()).hash,href)
      assert.equal(await page.locator(href).count(),1)
      if(width<=1024) await page.getByRole('button',{name:'Open menu'}).click()
    }
    if(width<=1024) {
      await page.keyboard.press('Escape')
      assert.equal(await page.getByRole('button',{name:'Open menu'}).getAttribute('aria-expanded'),'false')
    }
    await page.goto(base+'/')
  }
  const invalidLinks=await page.locator('.pp-public a').evaluateAll(links=>links.map(a=>a.getAttribute('href')).filter(href=>!href || (href.startsWith('#')&&!document.querySelector(href))))
  assert.deepEqual(invalidLinks,[])
  await page.locator('.pp-hero-actions').getByRole('link',{name:'Sign In',exact:true}).click()
  await page.waitForURL('**/login')
  await page.getByRole('button',{name:'Show password'}).click()
  assert.equal(await page.getByLabel('Password',{exact:true}).getAttribute('type'),'text')
  await page.goBack()
  await page.getByRole('heading',{level:1}).waitFor()
  await page.goto(base+'/contracts')
  await page.waitForURL('**/login')
  await page.getByRole('button',{name:'Admin',exact:true}).click()
  await page.getByRole('button',{name:'Sign in',exact:true}).click()
  await page.waitForURL('**/contracts')
  await page.reload()
  await page.getByRole('heading',{name:'Contracts',exact:true}).waitFor()
  await page.setViewportSize({width:1440,height:1000})
  await page.screenshot({path:'ui-audit/branded-contracts.png',fullPage:true})
  await page.goto(base+'/')
  await page.getByRole('heading',{level:1}).waitFor()
  assert.equal(new URL(page.url()).pathname,'/')
  await page.goto(base+'/employees')
  await page.getByRole('button',{name:'Logout',exact:false}).click()
  await page.waitForURL('**/login')
  await page.screenshot({path:'ui-audit/branded-login.png',fullPage:true})
  await page.getByRole('link',{name:'Back to PeoplePay360',exact:false}).click()
  await page.waitForURL(base+'/')
  assert.deepEqual(errors,[])
  console.log('PASS: public anchors, mobile menu/Escape, 5 widths, sign-in/back, protected redirect, login/refresh, authenticated public access, logout; runtime errors: 0')
} finally { await browser.close() }
