import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const origin = 'http://localhost:5173'
const output = new URL('../../docs/evidencias/url-oficial/', import.meta.url)
await mkdir(output, { recursive: true })
const checks = []
const errors = []
const forbiddenWrites = []

async function api(path) {
  const response = await fetch(`${origin}/api/v1${path}`)
  assert.equal(response.status, 200, `API pelo Nginx: ${path}`)
  return response.json()
}

const rootResponse = await fetch(origin)
const html = await rootResponse.text()
assert.match(rootResponse.headers.get('server') ?? '', /nginx/iu, 'Inicie o modo Docker do README antes deste teste')
assert.match(html, /\/assets\/[^" ]+\.js/u)
assert.ok(!html.includes('/@vite/client'), 'A URL oficial não pode ser um Vite paralelo')

const before = {
  clubs: await api('/clubs'),
  players: await api('/players?limit=1'),
  matches: await api('/matches'),
  standings: await api('/standings'),
}
const clubDetails = await Promise.all(before.clubs.map(club => api(`/clubs/${club.id}`)))
const club = clubDetails.find(item => item.players.length >= 5) ?? clubDetails[0]
const emptyClub = clubDetails.find(item => !item.players.length)
const latestMatch = before.matches[0]
const freePlayers = await api('/players?free=true&limit=1')
const freePlayer = freePlayers.data[0]
const browser = await chromium.launch({ channel: 'chrome', headless: true })

try {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } })
  context.on('page', page => page.on('pageerror', error => errors.push(error.message)))
  await context.route('**/api/v1/**', async route => {
    if (route.request().method() !== 'GET') {
      forbiddenWrites.push(route.request().url())
      return route.abort()
    }
    return route.continue()
  })
  const page = await context.newPage()
  const paths = [
    ['/', 'Gestão da liga, do mercado à classificação'],
    ['/players', 'Jogadores'],
    ['/players?free=true', 'Jogadores'],
    ['/clubs', 'Clubes'],
    ['/clubs?create=true', 'Novo clube'],
    ['/matches', 'Partidas'],
    ['/matches?create=true', 'Nova partida'],
    ['/standings', 'Classificação'],
  ]
  if (club) {
    paths.push([`/clubs/${club.id}`, club.name])
    if (club.players.length) paths.push([`/clubs/${club.id}?tab=lineup`, 'Titulares'])
    paths.push([`/clubs/${club.id}?tab=history`, 'Histórico de transações'])
  }
  if (latestMatch) paths.push([`/matches/${latestMatch.id}`, 'Duelos'])
  if (freePlayer) paths.push([`/transfers/buy?player_id=${freePlayer.id}`, 'Comprar jogador'])

  async function settled() {
    await page.locator('main').waitFor()
    await page.waitForFunction(() => !document.querySelector('[aria-busy="true"]'))
    await page.evaluate(() => document.fonts.ready)
  }

  async function noOverflow() {
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Overflow em ${page.url()}`)
  }

  async function capture(name) {
    await page.screenshot({ path: fileURLToPath(new URL(`${name}.png`, output)), fullPage: true, animations: 'disabled' })
  }

  for (const width of [1366, 375]) {
    await page.setViewportSize({ width, height: width === 1366 ? 768 : 844 })
    for (const [path, heading] of paths) {
      const tab = await context.newPage()
      await tab.setViewportSize({ width, height: width === 1366 ? 768 : 844 })
      assert.equal((await tab.goto(`${origin}${path}`)).status(), 200)
      await tab.getByRole('heading', { name: heading, exact: true }).waitFor()
      assert.equal((await tab.reload()).status(), 200)
      await tab.getByRole('heading', { name: heading, exact: true }).waitFor()
      const dimensions = await tab.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: innerWidth }))
      if (dimensions.content > dimensions.viewport) {
        console.log('Overflow:', path, width, dimensions)
        const label = path.replace(/[^a-z0-9]/giu, '-')
        await tab.screenshot({ path: fileURLToPath(new URL(`overflow-${width}-${label}.png`, output)), fullPage: true })
      }
      assert.ok(dimensions.content <= dimensions.viewport, `${path} em ${width}px: conteúdo ${dimensions.content}px`)
      await tab.close()
    }
    checks.push(`${paths.length} rotas/variações no Nginx: URL direta em nova aba e F5 em ${width}px`)

    for (const step of ['01', '02', '03', '04', '05', '06']) {
      await page.goto(origin)
      await page.getByRole('link', { name: new RegExp(`^${step}`) }).click()
      await page.waitForURL(url => url.pathname !== '/')
      await page.locator('article h1').waitFor()
      await settled()
      await noOverflow()
    }
    checks.push(`Seis atalhos da Home e módulos integrados em ${width}px`)

    await page.goto(`${origin}/players`)
    for (const [name, heading] of [['Clubes', 'Clubes'], ['Partidas', 'Partidas'], ['Classificação', 'Classificação'], ['Jogadores', 'Jogadores']]) {
      if (width === 375) await page.getByRole('button', { name: 'Abrir menu de navegação' }).click()
      await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link', { name: new RegExp(`^${name}`) }).click()
      await page.getByRole('heading', { name: heading, exact: true }).waitFor()
      await settled()
      await noOverflow()
    }
    checks.push(`Sidebar/menu entre módulos em ${width}px`)
    await capture(`official-players-${width}`)
  }

  await page.goto(origin)
  await page.getByRole('link', { name: 'Iniciar', exact: true }).click()
  await page.getByRole('heading', { name: 'Jogadores', exact: true }).waitFor()
  await page.getByRole('button', { name: 'Abrir menu de navegação' }).click()
  await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link', { name: /^Partidas/u }).click()
  await page.getByRole('heading', { name: 'Partidas', exact: true }).waitFor()
  await page.goBack()
  await page.getByRole('heading', { name: 'Jogadores', exact: true }).waitFor()
  await page.goBack()
  await page.getByRole('heading', { name: 'Gestão da liga, do mercado à classificação', exact: true }).waitFor()
  await page.goForward()
  await page.getByRole('heading', { name: 'Jogadores', exact: true }).waitFor()
  await page.goForward()
  await page.getByRole('heading', { name: 'Partidas', exact: true }).waitFor()
  checks.push('Voltar/Avançar entre Home, Jogadores e Partidas na porta oficial')

  if (before.players.meta.total_items > 10) {
    await page.goto(`${origin}/players`)
    const pagination = page.getByRole('navigation', { name: 'Paginação de jogadores', exact: true })
    await pagination.getByRole('link', { name: 'Página 2', exact: true }).click()
    await page.waitForURL(url => url.searchParams.get('page') === '2')
    await settled()
    await noOverflow()
    await page.goBack()
    await page.waitForURL(url => !url.searchParams.has('page'))
    await page.goForward()
    await page.waitForURL(url => url.searchParams.get('page') === '2')
    await settled()
    await noOverflow()
    checks.push('Paginação real com várias páginas: controles acessíveis em 375px e Voltar/Avançar')
  }

  if (club?.players.length) {
    await page.goto(`${origin}/clubs/${club.id}`)
    await page.getByRole('tab', { name: 'Escalação', exact: true }).click()
    await page.getByRole('heading', { name: 'Titulares', exact: true }).waitFor()
    await page.getByRole('tab', { name: 'Histórico', exact: true }).click()
    await page.getByText('Total pago em compras', { exact: true }).waitFor()
    await page.goBack()
    await page.getByRole('heading', { name: 'Titulares', exact: true }).waitFor()
    await page.goForward()
    await page.getByText('Total pago em compras', { exact: true }).waitFor()
    await capture('official-history-375')
    checks.push('Elenco/Escalação/Histórico, Voltar/Avançar e totais reais em 375px')
  }

  if (latestMatch) {
    await page.goto(`${origin}/matches/${latestMatch.id}`)
    const duelRegion = page.getByRole('region', { name: 'Duelos da partida: tabela com rolagem horizontal' })
    await duelRegion.locator('tbody tr').first().waitFor()
    assert.equal(await duelRegion.locator('tbody tr').count(), 6)
    await noOverflow()
    await capture('official-duels-375')
    await page.getByRole('navigation', { name: 'Caminho da página' }).getByRole('link', { name: 'Partidas', exact: true }).click()
    await page.getByRole('heading', { name: 'Histórico de partidas', exact: true }).waitFor()
    checks.push('Detalhe real com seis duelos e breadcrumb para Partidas')
  }

  await page.goto(`${origin}/standings`)
  if (before.standings.length) {
    const region = page.getByRole('region', { name: 'Classificação: tabela com rolagem horizontal' })
    await region.getByRole('link', { name: before.standings[0].club_name, exact: true }).waitFor()
    assert.deepEqual(await region.locator('tbody tr td:nth-child(2)').allTextContents(), before.standings.map(row => row.club_name))
  }
  await capture('official-standings-375')
  checks.push('Classificação na ordem da API real pelo proxy Nginx')

  const listScenarios = [
    { name: 'players', path: '/players', endpoint: '/players', loading: 'Carregando jogadores…', empty: 'Nenhum jogador encontrado', payload: { data: [], meta: { page: 1, limit: 10, total_items: 0, total_pages: 0 } } },
    { name: 'clubs', path: '/clubs', endpoint: '/clubs', loading: 'Carregando clubes…', empty: 'Nenhum clube cadastrado', payload: [] },
    { name: 'matches', path: '/matches', endpoint: '/matches', loading: 'Carregando partidas…', empty: 'Nenhuma partida encontrada', payload: [] },
    { name: 'standings', path: '/standings', endpoint: '/standings', loading: 'Carregando classificação…', empty: 'Nenhum clube cadastrado', payload: [] },
  ]
  if (club) {
    listScenarios.push({ name: 'squad', path: `/clubs/${club.id}`, endpoint: `/clubs/${club.id}`, loading: 'Carregando clube e elenco…', empty: 'Nenhum jogador no elenco', payload: { ...club, players: [] } })
    listScenarios.push({ name: 'history', path: `/clubs/${club.id}?tab=history`, endpoint: `/clubs/${club.id}/transactions`, loading: 'Carregando histórico…', empty: 'Nenhuma transação ainda', payload: { data: [], summary: { total_spent: 0, total_received: 0, total_fees: 0, total_penalties: 0, total_profit: 0 } } })
  }

  for (const scenario of listScenarios) {
    for (const mode of ['loading', 'empty', 'error']) {
      let release
      const gate = new Promise(resolve => { release = resolve })
      const pattern = `**/api/v1${scenario.endpoint}*`
      const handler = async route => {
        const path = new URL(route.request().url()).pathname.replace('/api/v1', '')
        if (path !== scenario.endpoint) return route.fallback()
        if (mode === 'loading') await gate
        if (mode === 'error') return route.fulfill({ status: 503, json: { message: `Falha controlada em ${scenario.name}.` } })
        return route.fulfill({ json: scenario.payload })
      }
      await context.route(pattern, handler)
      try {
        await page.goto(`${origin}${scenario.path}`)
        if (mode === 'loading') {
          await page.getByText(scenario.loading, { exact: true }).first().waitFor()
          release()
          await page.getByRole('heading', { name: scenario.empty, exact: true }).waitFor()
        } else if (mode === 'empty') {
          await page.getByRole('heading', { name: scenario.empty, exact: true }).waitFor()
        } else {
          await page.locator('article').getByText(`Falha controlada em ${scenario.name}.`, { exact: false }).first().waitFor()
        }
        await noOverflow()
      } finally {
        release()
        await context.unroute(pattern, handler)
      }
    }
    checks.push(`${scenario.name}: loading/vazio/erro controlados apenas no navegador, mesmo Nginx/porta, sem escrita`)
  }

  if (emptyClub && !(await api(`/clubs/${emptyClub.id}/transactions`)).data.length) {
    await page.goto(`${origin}/clubs/${emptyClub.id}?tab=history`)
    await page.getByRole('heading', { name: 'Nenhuma transação ainda', exact: true }).waitFor()
    checks.push('Histórico vazio também verificado com clube real')
  }

  const after = {
    clubs: await api('/clubs'),
    players: await api('/players?limit=1'),
    matches: await api('/matches'),
    standings: await api('/standings'),
  }
  assert.deepEqual(after, before, 'As consultas do teste não devem alterar o banco')
  assert.deepEqual(errors, [], 'Exceções JavaScript')
  assert.deepEqual(forbiddenWrites, [], 'Pedidos de escrita inesperados')
  await writeFile(new URL('results.json', output), JSON.stringify({ origin, date: new Date().toISOString(), server: rootResponse.headers.get('server'), checks, errors, forbiddenWrites, clubs: before.clubs.length, players: before.players.meta.total_items, matches: before.matches.length }, null, 2))
  console.log(checks.join('\n'))
} finally {
  await browser.close()
}
