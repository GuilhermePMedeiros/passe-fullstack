import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { createServer } from 'vite'

const output = new URL('../../docs/evidencias/navigation/', import.meta.url)
await mkdir(output, { recursive: true })
const server = await createServer({
  server: {
    host: 'localhost', port: 15178, strictPort: true,
    proxy: { '/api': { target: 'http://localhost:8080', headers: { Origin: 'http://localhost:5173' } } },
  },
  logLevel: 'error',
})
await server.listen()
let browser
const origin = 'http://localhost:15178'
const checks = []
const errors = []
const writes = []
const club = { id: 1, name: 'Clube Teste Azul', acronym: 'CTA', cash: 286.35, squad_value: 13, net_worth: 299.35 }
const player = { id: 1, name: 'Eduardo Paiva', position: 'MEI', age: 26, agility: 70, condition: 'APTO', base_value: 40, market_value: 40, pace: 75, shooting: 75, passing: 75, dribbling: 75, defending: 75, physical: 75, potential: 80, overall: 75, club_id: null }
const squadPlayer = { ...player, id: 2, name: 'Felipe Moura', position: 'ZAG', club_id: 1, market_value: 13, contract: { purchase_value: 13, loyalty_until: '2027-03-02T15:00:00-03:00', remaining_days: 90, penalty_rate: 10 } }
const transaction = { id: 1, club_id: 1, player_id: 2, player_name: squadPlayer.name, type: 'COMPRA', value: 13, fee: 0.65, penalty: 0, profit: null, cash_change: -13.65, created_at: '2026-10-22T15:00:00-03:00' }

async function fixtures(route) {
  const request = route.request()
  const url = new URL(request.url())
  assert.equal(request.method(), 'GET', 'O teste de navegação nunca deve gravar dados')
  const path = url.pathname.replace('/api/v1', '')
  if (path === '/clubs') return route.fulfill({ json: [club] })
  if (path === '/clubs/1') return route.fulfill({ json: { ...club, players: [squadPlayer] } })
  if (path === '/clubs/1/lineup') return route.fulfill({ json: { club_id: 1, formation: '2-1-1', complete: false, players: [squadPlayer] } })
  if (path === '/clubs/1/transactions') return route.fulfill({ json: { data: [transaction], summary: { total_spent: 13.65, total_received: 0, total_fees: 0.65, total_penalties: 0, total_profit: 0 } } })
  if (path === '/players/1') return route.fulfill({ json: player })
  if (path === '/players/2') return route.fulfill({ json: squadPlayer })
  if (path === '/players') {
    let data = [player, squadPlayer]
    if (url.searchParams.get('free') === 'true') data = [player]
    if (url.searchParams.has('club_id')) data = [squadPlayer]
    const limit = Number(url.searchParams.get('limit') ?? 10)
    return route.fulfill({ json: { data: data.slice(0, limit), meta: { page: 1, limit, total_items: data.length, total_pages: 1 } } })
  }
  if (path === '/matches' || path === '/standings') return route.fulfill({ json: [] })
  return route.fulfill({ status: 404, json: { message: 'Clube não encontrado.' } })
}

try {
  browser = await chromium.launch({ channel: 'chrome', headless: true })
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } })
  await context.route('**/api/v1/**', fixtures)
  context.on('page', page => {
    page.on('pageerror', error => errors.push(error.message))
    page.on('request', request => {
      if (request.url().includes('/api/v1/') && request.method() !== 'GET') writes.push(request.url())
    })
  })
  const routes = [
    ['/', 'Gestão da liga, do mercado à classificação'],
    ['/players', 'Jogadores'],
    ['/players?free=true', 'Jogadores'],
    ['/players?free=true&buy=1', 'Comprar jogador', 'dialog'],
    ['/transfers/buy?player_id=1', 'Comprar jogador', 'dialog'],
    ['/transfers/buy', 'Jogadores'],
    ['/clubs', 'Clubes'],
    ['/clubs?create=true', 'Novo clube', 'dialog'],
    ['/clubs?tab=history', 'Clubes'],
    ['/clubs?tab=lineup', 'Clubes'],
    ['/clubs?action=sell', 'Clubes'],
    ['/clubs/1', club.name],
    ['/clubs/1?tab=history', 'Histórico de transações'],
    ['/clubs/1?tab=lineup', 'Titulares'],
    ['/clubs/999', 'Clube não encontrado'],
    ['/matches', 'Partidas', 'pending'],
    ['/standings', 'Classificação', 'pending'],
    ['/unknown-route', 'Página não encontrada', 'pending'],
  ]
  for (const [path, heading, kind] of routes) {
    const tab = await context.newPage()
    const response = await tab.goto(`${origin}${path}`)
    assert.equal(response.status(), 200)
    await tab.getByRole('heading', { name: heading, exact: true }).waitFor()
    if (kind === 'dialog') await tab.getByRole('dialog').waitFor()
    if (kind === 'pending') await tab.getByText('Esta seção ainda não está disponível. Acompanhe as próximas etapas do Passe.').waitFor()
    await tab.reload()
    await tab.getByRole('heading', { name: heading, exact: true }).waitFor()
    if (path.includes('tab=history') && path.includes('/1')) {
      assert.equal(await tab.getByRole('tab', { name: 'Histórico', exact: true }).getAttribute('data-state'), 'active')
    }
    checks.push(`Nova aba + F5: ${path}`)
    await tab.close()
  }

  const page = await context.newPage()
  async function goHome() {
    await page.goto(origin)
    await page.getByRole('heading', { name: 'Gestão da liga, do mercado à classificação', exact: true }).waitFor()
  }
  async function menuLink(name, width = 1366) {
    if (width < 1024) await page.getByRole('button', { name: 'Abrir menu de navegação' }).click()
    await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link', { name, exact: false }).click()
  }
  async function activeTab(value) {
    await page.locator(`[role="tabpanel"][data-state="active"][id$="-${value}"]`).waitFor()
  }

  for (const width of [1366, 375]) {
    await page.setViewportSize({ width, height: 844 })
    await goHome()
    await page.getByRole('link', { name: /01.*Jogadores/u }).click()
    await page.getByRole('heading', { name: 'Jogadores', exact: true }).waitFor()
    for (const [name, heading] of [['Clubes', 'Clubes'], ['Partidas', 'Partidas'], ['Classificação', 'Classificação'], ['Jogadores', 'Jogadores'], [club.name, club.name]]) {
      await menuLink(name, width)
      await page.getByRole('heading', { name: heading, exact: true }).waitFor()
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    }
    for (const [name, target] of [['05', 'history'], ['06', 'lineup']]) {
      await goHome()
      await page.getByRole('link', { name: new RegExp(`^${name}`) }).click()
      await page.locator('article a[href="/clubs/1?tab=' + target + '"]').first().waitFor()
      if (target === 'history') {
        await page.getByRole('button', { name: /^Ordenar:/u }).click()
        await page.getByRole('menuitemradio', { name: 'Patrimônio (maior para o menor)' }).click()
        await page.waitForURL(url => url.searchParams.get('sort') === 'net_worth_desc' && url.searchParams.get('tab') === target)
      }
      if (width < 1024) await menuLink(club.name, width)
      else await page.locator(`article a[href="/clubs/1?tab=${target}"]`).first().click()
      await activeTab(target)
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      await page.screenshot({ path: fileURLToPath(new URL(`home-${target}-${width}.png`, output)), fullPage: true })
    }
    await goHome()
    await page.getByRole('link', { name: /^04/u }).click()
    await page.getByText('Escolha um clube e use Vender na aba Elenco para negociar um jogador.').waitFor()
    await page.locator('article a[href="/clubs/1"]').first().click()
    await page.getByRole('button', { name: 'Vender Felipe Moura', exact: true }).click()
    await page.getByRole('dialog').getByRole('heading', { name: 'Vender Felipe Moura?', exact: true }).waitFor()
    await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click()
    checks.push(`Home + menu + atalhos Histórico/Escalação/Venda em ${width}px`)
  }

  await page.setViewportSize({ width: 1366, height: 768 })
  await goHome()
  await page.getByRole('link', { name: 'Iniciar', exact: true }).click()
  await page.getByRole('heading', { name: 'Jogadores', exact: true }).waitFor()
  await menuLink('Clubes')
  await page.getByRole('heading', { name: 'Clubes', exact: true }).waitFor()
  await page.goBack()
  await page.getByRole('heading', { name: 'Jogadores', exact: true }).waitFor()
  await page.goBack()
  await page.getByRole('heading', { name: 'Gestão da liga, do mercado à classificação', exact: true }).waitFor()
  await page.goForward()
  await page.getByRole('heading', { name: 'Jogadores', exact: true }).waitFor()
  await page.goForward()
  await page.getByRole('heading', { name: 'Clubes', exact: true }).waitFor()
  checks.push('Voltar/Avançar entre Home, Jogadores e Clubes sem recarregar')

  await page.goto(`${origin}/players`)
  await page.getByRole('tab', { name: /^Livres/u }).click()
  await page.waitForURL(url => url.searchParams.get('free') === 'true')
  await page.getByRole('tab', { name: /^Em clubes/u }).click()
  await page.waitForURL(url => url.searchParams.get('free') === 'false')
  await page.goBack()
  await page.waitForURL(url => url.searchParams.get('free') === 'true')
  await page.goBack()
  await page.waitForURL(url => !url.searchParams.has('free'))
  await page.goForward()
  await page.waitForURL(url => url.searchParams.get('free') === 'true')
  checks.push('Abas de Jogadores: um passo no histórico por mudança de vínculo')

  await page.goto(`${origin}/clubs/1`)
  await page.getByRole('tab', { name: 'Escalação', exact: true }).click()
  await activeTab('lineup')
  await page.getByRole('tab', { name: 'Histórico', exact: true }).click()
  await activeTab('history')
  await page.goBack()
  await activeTab('lineup')
  await page.goBack()
  await activeTab('squad')
  await page.goForward()
  await activeTab('lineup')
  await page.goForward()
  await activeTab('history')
  checks.push('Voltar/Avançar restaura Elenco/Escalação/Histórico')

  await page.goto(`${origin}/players?free=true`)
  await page.getByRole('button', { name: 'Comprar Eduardo Paiva', exact: true }).click()
  await page.getByRole('dialog').getByRole('heading', { name: 'Comprar jogador', exact: true }).waitFor()
  await page.goBack()
  await page.getByRole('dialog').waitFor({ state: 'hidden' })
  await page.goForward()
  await page.getByRole('dialog').getByRole('heading', { name: 'Comprar jogador', exact: true }).waitFor()
  await page.reload()
  await page.getByRole('dialog').getByRole('heading', { name: 'Comprar jogador', exact: true }).waitFor()
  await page.keyboard.press('Escape')
  await page.getByRole('dialog').waitFor({ state: 'hidden' })
  checks.push('Compra: Voltar fecha, Avançar/F5 reabre e Escape limpa buy sem perder free')

  await page.goto(`${origin}/clubs?tab=history`)
  await page.getByRole('button', { name: 'Novo clube', exact: true }).click()
  await page.getByRole('dialog').getByRole('heading', { name: 'Novo clube', exact: true }).waitFor()
  await page.goBack()
  await page.getByRole('dialog').waitFor({ state: 'hidden' })
  await page.goForward()
  await page.getByRole('dialog').getByRole('heading', { name: 'Novo clube', exact: true }).waitFor()
  await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click()
  assert.equal(new URL(page.url()).searchParams.get('tab'), 'history')
  checks.push('Cadastro de clube acompanha Voltar/Avançar e preserva destino Histórico')

  if (process.env.PASSE_NAVIGATION_REAL_API === '1') {
    await context.unroute('**/api/v1/**')
    const liveClubs = await fetch('http://localhost:8080/api/v1/clubs').then(response => response.json())
    for (const path of ['/', '/players', '/clubs', '/matches', '/standings', ...(liveClubs[0] ? [`/clubs/${liveClubs[0].id}`, `/clubs/${liveClubs[0].id}?tab=history`, `/clubs/${liveClubs[0].id}?tab=lineup`] : [])]) {
      await page.goto(`${origin}${path}`)
      await page.locator('h1').waitFor()
      if (path.includes('tab=history')) await page.getByRole('heading', { name: 'Histórico de transações', exact: true }).waitFor()
      if (path.includes('tab=lineup')) await page.getByRole('heading', { name: 'Titulares', exact: true }).waitFor()
      await page.reload()
      await page.locator('h1').waitFor()
      if (path.includes('tab=history')) await page.getByRole('heading', { name: 'Histórico de transações', exact: true }).waitFor()
      if (path.includes('tab=lineup')) await page.getByRole('heading', { name: 'Titulares', exact: true }).waitFor()
    }
    checks.push('API real: entrada direta/F5 na Home, módulos e abas existentes, apenas GET')
  }
  assert.deepEqual(errors, [], 'Exceções JavaScript durante navegação')
  assert.deepEqual(writes, [], 'Nenhuma escrita é permitida neste ensaio')
  await writeFile(new URL('results.json', output), JSON.stringify({ date: new Date().toISOString(), checks, errors, writes }, null, 2))
  console.log(checks.join('\n'))
} finally {
  await browser?.close()
  await server.close()
}
