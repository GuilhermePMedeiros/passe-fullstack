import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { createServer } from 'vite'

const output = new URL('../../docs/evidencias/home/', import.meta.url)
await mkdir(output, { recursive: true })

const server = await createServer({ server: { host: 'localhost', port: 15174, strictPort: true }, logLevel: 'error' })
await server.listen()

let browser

const checks = []

try {
  browser = await chromium.launch({ channel: 'chrome', headless: true })
  
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(`${message.text()} @ ${message.location().url}`) })
  
    let scenario = 'with-matches'
    await page.route('**/api/v1/**', async route => {
    const url = new URL(route.request().url())
    if (scenario === 'unavailable') return route.fulfill({ status: 503, json: { message: 'Liga temporariamente indisponível.' } })
    const empty = scenario === 'empty'
    let response = []
    if (url.pathname.endsWith('/players')) response = { data: [], meta: { total_items: empty ? 0 : url.searchParams.has('free') ? 7 : 23 } }
    if (url.pathname.endsWith('/clubs')) response = empty ? [] : Array.from({ length: 6 }, (_, id) => ({ id }))
    if (url.pathname.endsWith('/matches')) response = scenario === 'with-matches' ? [{ id: 1 }, { id: 2 }] : []
    if (url.pathname.endsWith('/standings')) response = empty ? [] : [{ club_name: 'Delta FC', points: 6 }]
    return route.fulfill({ json: response })
  })

  for (const width of [375, 768, 1366, 1920]) {
    for (const state of ['with-matches', 'without-matches']) {
      scenario = state
      const heights = { 375: 844, 768: 1024, 1366: 768, 1920: 1080 }
      
      await page.setViewportSize({ width, height: heights[width] })
      await page.goto('http://localhost:15174/')
      await page.getByText(state === 'with-matches' ? 'líder: Delta FC, 6 pontos' : 'nenhuma partida ainda').waitFor()
      await page.evaluate(() => document.fonts.ready)
      
      const size = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth }))
      
      assert.ok(size.scroll <= size.viewport, `${width}px: overflow horizontal`)
      assert.equal(await page.getByRole('navigation').getByRole('link').count(), 6)
      
      for (const link of await page.getByRole('navigation').getByRole('link').all()) {
        await link.scrollIntoViewIfNeeded()
        assert.ok(await link.isVisible())
      }
      
      await page.screenshot({ path: fileURLToPath(new URL(`${state}-${width}.png`, output)), fullPage: true })
      
      checks.push(`${state}: ${width}px sem overflow, seis cards acessíveis`)
    }
  }

  scenario = 'empty'
  await page.goto('http://localhost:15174/')
  await page.getByText('nenhuma partida ainda').waitFor()
  assert.equal(await page.locator('dd').allTextContents().then(values => values.join(',')), '0,0,0,0')
  checks.push('Liga sem jogadores, clubes e partidas: quatro totais zero')

  await page.keyboard.press('Tab')
  
  assert.equal(await page.getByRole('link', { name: 'Iniciar' }).evaluate(element => element === document.activeElement), true)
  assert.equal(await page.getByRole('link', { name: 'Iniciar' }).evaluate(element => getComputedStyle(element).outlineStyle), 'solid')
  
  await page.keyboard.press('Enter')
  
  await page.getByRole('heading', { name: 'Jogadores', exact: true }).waitFor()
  
  assert.equal(new URL(page.url()).pathname, '/players')
  
  await page.waitForFunction(() => document.querySelector('h1') === document.activeElement)
  assert.equal(await page.locator('h1').evaluate(element => element === document.activeElement), true)
  
  await page.getByRole('link', { name: 'Voltar ao início' }).click()
  await page.getByRole('heading', { name: 'Gestão da liga, do mercado à classificação' }).waitFor()
  
  const destinations = ['/players', '/clubs', '/players?free=true&action=buy', '/clubs?action=sell', '/clubs?tab=history', '/matches']
  
  for (let index = 0; index < destinations.length; index++) {
    const link = page.getByRole('navigation').getByRole('link').nth(index)
    await link.focus()
    await page.keyboard.press('Enter')
    await page.waitForURL(url => `${url.pathname}${url.search}` === destinations[index])
    assert.equal(page.url().replace('http://localhost:15174', ''), destinations[index])
    await page.getByRole('link', { name: 'Voltar ao início' }).click()
    await page.getByRole('heading', { name: 'Gestão da liga, do mercado à classificação' }).waitFor()
  }
  
  checks.push('Iniciar e seis cards por Enter: URLs corretas, foco e retorno sem reload')
  assert.deepEqual(errors, [], 'Erros inesperados no console/navegador')

  scenario = 'unavailable'
  
  await page.reload()
  await page.getByRole('alert').filter({ hasText: 'Liga temporariamente indisponível.' }).waitFor()
  
  assert.equal(await page.getByText('nenhuma partida ainda').count(), 0)
  scenario = 'without-matches'
  
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await page.getByText('nenhuma partida ainda').waitFor()
  
  checks.push('API indisponível: message preservado e recuperação após tentar novamente')
  
  errors.length = 0

  if (process.env.PASSE_TEST_REAL_API === '1') {
    await page.unroute('**/api/v1/**')
    const requests = []
   
    page.on('response', response => { if (response.url().includes('/api/v1/')) requests.push({ url: response.url(), status: response.status() }) })
    
    await page.goto('http://localhost:15174/')
    
    await page.locator('.league-statistics[aria-busy="false"]').waitFor()
    
    assert.equal(await page.getByRole('alert').count(), 0)
    
    const [players, free, clubs, matches, standings] = await Promise.all([
      page.request.get('http://localhost:8080/api/v1/players?limit=1').then(response => response.json()),
      page.request.get('http://localhost:8080/api/v1/players?limit=1&free=true').then(response => response.json()),
      page.request.get('http://localhost:8080/api/v1/clubs').then(response => response.json()),
      page.request.get('http://localhost:8080/api/v1/matches').then(response => response.json()),
      page.request.get('http://localhost:8080/api/v1/standings').then(response => response.json()),
    ])
    const totals = [players.meta.total_items, free.meta.total_items, clubs.length, matches.length].map(value => value.toLocaleString('pt-BR'))
    
    assert.deepEqual(await page.locator('dd').allTextContents(), totals)
    
    assert.ok(requests.length >= 5 && requests.every(request => request.status === 200))
    
    if (matches.length && standings.length) await page.getByText(`líder: ${standings[0].club_name}, ${standings[0].points} ${standings[0].points === 1 ? 'ponto' : 'pontos'}`).waitFor()
    await page.screenshot({ path: fileURLToPath(new URL('real-api.png', output)), fullPage: true })
    
    assert.deepEqual(errors, [], 'Erros inesperados na integração real')
   
    checks.push(`API real via proxy: totais ${totals.join('/')}, consultas GET sem gravação`)
  }

  await writeFile(new URL('results.json', output), JSON.stringify({ checkedAt: new Date().toISOString(), browser: browser.version(), checks }, null, 2))
 
  console.log(checks.join('\n'))
} finally {
  
  await browser?.close()
  
  await server.close()
}
