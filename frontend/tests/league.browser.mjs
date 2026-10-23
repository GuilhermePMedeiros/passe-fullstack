import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { createServer } from 'vite'
import { clubs, match, matches, standings, historyFor, zeroSummary, salesCsv, csvHeader } from './fixtures/league.mjs'

const output = new URL('../../docs/evidencias/league/', import.meta.url)
await mkdir(output, { recursive: true })
const checks = []
const errors = []
const requests = []
const state = { historyError: false, historyEmpty: false, listEmpty: false, listError: false, standingsEmpty: false, standingsError: false, rejectMatch: true, delay: 0 }
const server = await createServer({
  server: {
    host: 'localhost', port: 15179, strictPort: true,
    proxy: { '/api': { target: 'http://localhost:8080', headers: { Origin: 'http://localhost:5173' } } },
  },
  logLevel: 'error',
})
await server.listen()
let browser
const origin = 'http://localhost:15179'

async function fixtures(route) {
  const request = route.request()
  const url = new URL(request.url())
  const path = url.pathname.replace('/api/v1', '')
  requests.push({ path, query: url.search, method: request.method(), body: request.postDataJSON() })
  if (state.delay) await new Promise(resolve => setTimeout(resolve, state.delay))
  if (path === '/matches' && request.method() === 'POST') {
    if (state.rejectMatch) return route.fulfill({ status: 409, json: { message: 'Escalação incompleta: Alpha FC não tem os 5 titulares.' } })
    await new Promise(resolve => setTimeout(resolve, 350))
    return route.fulfill({ status: 201, headers: { Location: '/api/v1/matches/11' }, json: match })
  }
  assert.equal(request.method(), 'GET', 'Somente POST /matches pode ser simulado; nenhuma escrita real é permitida')
  if (path === '/clubs') return route.fulfill({ json: clubs })
  if (/^\/clubs\/[123]$/u.test(path)) return route.fulfill({ json: clubs[Number(path.split('/').at(-1)) - 1] })
  if (path === '/players') return route.fulfill({ json: { data: [], meta: { page: 1, limit: 10, total_items: 0, total_pages: 0 } } })
  if (path.endsWith('/transactions/export')) return route.fulfill({ contentType: 'text/csv', body: state.historyEmpty ? csvHeader : salesCsv })
  if (path.endsWith('/transactions')) {
    if (state.historyError && url.searchParams.has('player_id')) return route.fulfill({ status: 404, json: { message: 'Jogador não encontrado.' } })
    return route.fulfill({ json: state.historyEmpty ? { data: [], summary: zeroSummary } : historyFor(url.searchParams) })
  }
  if (path === '/matches') {
    if (state.listError) return route.fulfill({ status: 503, json: { message: 'Histórico de partidas indisponível.' } })
    return route.fulfill({ json: state.listEmpty || url.searchParams.get('club_id') === '3' ? [] : matches })
  }
  if (path === '/matches/11' || path === '/matches/10') return route.fulfill({ json: { ...match, id: Number(path.split('/').at(-1)) } })
  if (path === '/standings') {
    if (state.standingsError) return route.fulfill({ status: 503, json: { message: 'Classificação indisponível.' } })
    return route.fulfill({ json: state.standingsEmpty ? [] : standings })
  }
  return route.fulfill({ status: 404, json: { message: 'Partida não encontrada.' } })
}

try {
  browser = await chromium.launch({ channel: 'chrome', headless: true })
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true })
  await context.route('**/api/v1/**', fixtures)
  context.on('page', tab => tab.on('pageerror', error => errors.push(error.message)))
  const page = await context.newPage()
  async function capture(name) {
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({ path: fileURLToPath(new URL(`${name}.png`, output)), fullPage: true, animations: 'disabled' })
  }
  async function choose(label, option) {
    await page.getByRole('combobox', { name: label, exact: true }).click()
    await page.getByRole('option', { name: option, exact: true }).click()
  }
  async function noOverflow() {
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Overflow em ${page.url()}`)
  }

  for (const [path, heading] of [
    ['/', 'Gestão da liga, do mercado à classificação'],
    ['/matches', 'Partidas'], ['/matches?club_id=3', 'Partidas'], ['/matches?create=true', 'Nova partida'],
    ['/matches/11', 'Detalhes da partida'], ['/matches/999', 'Partida não encontrada'],
    ['/standings', 'Classificação'], ['/clubs/1?tab=history', 'Histórico de transações'],
    ['/clubs/1?tab=history&type=VENDA&player_id=13', 'Histórico de transações'],
  ]) {
    const tab = await context.newPage()
    await tab.goto(`${origin}${path}`)
    await tab.getByRole('heading', { name: heading, exact: true }).waitFor()
    await tab.reload()
    await tab.getByRole('heading', { name: heading, exact: true }).waitFor()
    await tab.close()
  }
  checks.push('Nove URLs: acesso direto em nova aba + F5, incluindo Home, filtros, diálogo e 404')

  await page.goto(origin)
  await page.getByRole('link', { name: /^06/u }).click()
  await page.getByRole('heading', { name: 'Partidas', exact: true }).waitFor()
  await page.getByRole('region', { name: 'Última partida', exact: true }).getByRole('link', { name: 'Ver duelos', exact: true }).waitFor()
  const matchRows = page.getByRole('region', { name: 'Histórico de partidas: tabela com rolagem horizontal' }).locator('tbody tr')
  assert.deepEqual(await matchRows.locator('td:first-child').allTextContents(), ['22/10/2026, 20:00', '21/10/2026, 20:00'])
  await choose('Clube: todos', 'Clube Sem Jogos')
  await page.getByText('Nenhuma partida encontrada', { exact: true }).waitFor()
  assert.equal(new URL(page.url()).searchParams.get('club_id'), '3')
  await page.goBack()
  await matchRows.first().waitFor()
  await page.goForward()
  await page.getByText('Nenhuma partida encontrada', { exact: true }).waitFor()
  await page.getByRole('button', { name: 'Limpar filtro', exact: true }).click()
  await matchRows.first().waitFor()
  checks.push('Home → Liga, última partida, ordem recebida, filtro por clube e Voltar/Avançar')

  await page.getByRole('button', { name: 'Nova partida', exact: true }).click()
  await page.getByRole('dialog').waitFor()
  await page.goBack()
  await page.getByRole('dialog').waitFor({ state: 'hidden' })
  await page.goForward()
  await page.getByRole('dialog').waitFor()
  await choose('Mandante', 'Zulu FC (ZUL)')
  await choose('Visitante', 'Alpha FC (ALP)')
  await page.getByRole('button', { name: 'Jogar partida', exact: true }).click()
  await page.getByText('Não foi possível jogar a partida. Escalação incompleta: Alpha FC não tem os 5 titulares.', { exact: true }).waitFor()
  assert.match(await page.getByRole('combobox', { name: 'Mandante' }).textContent(), /Zulu FC/u)
  assert.match(await page.getByRole('combobox', { name: 'Visitante' }).textContent(), /Alpha FC/u)
  await page.setViewportSize({ width: 375, height: 844 })
  await capture('match-rejected-375')
  await noOverflow()
  state.rejectMatch = false
  const before = requests.filter(request => request.method === 'POST').length
  await page.getByRole('button', { name: 'Jogar partida', exact: true }).dblclick()
  await page.getByText('Partida jogada. Placar e duelos devolvidos pela API.', { exact: true }).waitFor()
  assert.equal(requests.filter(request => request.method === 'POST').length - before, 1)
  assert.deepEqual(requests.filter(request => request.method === 'POST').at(-1).body, { home_club_id: 1, away_club_id: 2 })
  const duels = page.getByRole('region', { name: 'Duelos da partida: tabela com rolagem horizontal' })
  assert.equal(await duels.locator('tbody tr').count(), 6)
  assert.deepEqual(await duels.locator('tbody tr td:last-child').allTextContents(), ['Gol', 'Sem gol', 'Sem gol', 'Gol', 'Sem gol', 'Gol'])
  await duels.getByText('Drible 63', { exact: true }).waitFor()
  await duels.getByText('Defesa 56', { exact: true }).waitFor()
  assert.equal(await page.locator('.match-field-player').count(), 10)
  await page.reload()
  await duels.getByText('Drible 63', { exact: true }).waitFor()
  checks.push('Nova partida: diálogo no histórico, 409 preserva clubes, clique duplo envia uma vez, sucesso e seis duelos/snapshots após F5')

  await page.goto(`${origin}/clubs/1?tab=history`)
  await page.getByText('Total pago em compras', { exact: true }).waitFor()
  await choose('Todos os tipos', 'Venda')
  await choose('Todos os jogadores', 'Meia Histórico')
  await page.getByText('+35,70', { exact: true }).waitFor()
  const totals = page.locator('.history-totals')
  await totals.getByText('35,70', { exact: true }).waitFor()
  assert.deepEqual(await totals.locator('dd').allTextContents(), ['0,00', '35,70', '0,30', '4,00', '+3,00'])
  await page.goBack()
  await totals.getByText('61,54', { exact: true }).waitFor()
  await page.goForward()
  await totals.getByText('35,70', { exact: true }).waitFor()
  await page.reload()
  await totals.getByText('35,70', { exact: true }).waitFor()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportar CSV' }).click()
  assert.equal(await readFile(await (await download).path(), 'utf8'), salesCsv)
  const exported = requests.findLast(request => request.path.endsWith('/transactions/export'))
  assert.equal(new URLSearchParams(exported.query).get('type'), 'VENDA')
  assert.equal(new URLSearchParams(exported.query).get('player_id'), '13')
  state.historyError = true
  await page.getByRole('button', { name: 'Atualizar dados' }).click()
  await page.getByText('Jogador não encontrado.', { exact: true }).waitFor()
  assert.equal(await totals.count(), 0)
  assert.match(await page.getByRole('combobox', { name: 'Todos os jogadores' }).textContent(), /Meia Histórico/u)
  assert.equal(await page.getByRole('button', { name: 'Exportar CSV' }).isDisabled(), true)
  await capture('history-filter-rejected-375')
  await page.getByRole('button', { name: 'Limpar filtros do histórico' }).click()
  await page.getByText('Total pago em compras', { exact: true }).waitFor()
  state.historyError = false
  state.historyEmpty = true
  await page.getByRole('button', { name: 'Atualizar dados' }).click()
  await page.getByText('Nenhuma transação ainda', { exact: true }).waitFor()
  assert.deepEqual(await totals.locator('dd').allTextContents(), ['0,00', '0,00', '0,00', '0,00', '+0,00'])
  const emptyDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportar CSV' }).click()
  assert.equal(await readFile(await (await emptyDownload).path(), 'utf8'), csvHeader)
  state.historyEmpty = false
  checks.push('Histórico: filtros combinados/URL/Voltar/Avançar/F5, summary, CSV exato, 404 sem totais e vazio com CSV de cabeçalho')

  await page.goto(`${origin}/standings`)
  const standingRows = page.getByRole('region', { name: 'Classificação: tabela com rolagem horizontal' }).locator('tbody tr')
  await standingRows.first().waitFor()
  assert.deepEqual(await standingRows.locator('td:nth-child(2)').allTextContents(), ['Zulu FC', 'Alpha FC', 'Clube Sem Jogos'])
  assert.deepEqual(await standingRows.nth(0).locator('td').allTextContents(), ['1', 'Zulu FC', '3', '1', '1', '1', '5', '3', '+2', '4'])
  await page.locator('.recent-matches a').first().click()
  await page.getByRole('heading', { name: 'Duelos', exact: true }).waitFor()
  await page.goBack()
  await page.getByRole('heading', { name: 'Classificação', exact: true }).waitFor()
  checks.push('Classificação: ordem e números recebidos, clube sem jogos e link da última partida')

  for (const [path, flag, title] of [
    ['/matches', 'listError', 'Não foi possível carregar as partidas'],
    ['/standings', 'standingsError', 'Não foi possível carregar a classificação'],
  ]) {
    state[flag] = true
    await page.goto(`${origin}${path}`)
    await page.getByRole('heading', { name: title, exact: true }).waitFor()
    state[flag] = false
    await page.getByRole('button', { name: 'Tentar novamente', exact: true }).first().click()
    await page.getByRole('heading', { name: title, exact: true }).waitFor({ state: 'hidden' })
  }
  state.standingsEmpty = true
  await page.goto(`${origin}/standings`)
  await page.getByText('Nenhum clube cadastrado', { exact: true }).waitFor()
  state.standingsEmpty = false
  state.listEmpty = true
  await page.goto(`${origin}/matches`)
  await page.getByText('Nenhuma partida encontrada', { exact: true }).waitFor()
  state.listEmpty = false
  state.delay = 700
  for (const [path, loading] of [['/matches', 'Carregando partidas…'], ['/standings', 'Carregando classificação…'], ['/clubs/1?tab=history', 'Carregando histórico…']]) {
    await page.goto(`${origin}${path}`)
    await page.getByText(loading, { exact: true }).waitFor()
    await page.getByText(loading, { exact: true }).waitFor({ state: 'hidden' })
  }
  state.delay = 0
  checks.push('Carregamento com skeleton, vazio, erro e retry nas três listas')

  for (const width of [360, 375, 390, 768, 1366]) {
    await page.setViewportSize({ width, height: width === 1366 ? 768 : 844 })
    for (const [path, ready] of [['/matches', 'Histórico de partidas'], ['/matches/11', 'Duelos'], ['/standings', 'Ordem da tabela'], ['/clubs/1?tab=history', 'Total pago em compras'], ['/matches?create=true', 'Nova partida']]) {
      await page.goto(`${origin}${path}`)
      await page.getByRole('heading', { name: ready, exact: true }).or(page.getByText(ready, { exact: true })).first().waitFor()
      await noOverflow()
      await capture(`${path.includes('create') ? 'match-dialog' : path.includes('/11') ? 'match-duels' : path.includes('standings') ? 'standings' : path.includes('clubs') ? 'history' : 'matches'}-${width}`)
    }
    await page.keyboard.press('Escape')
    if (width < 1024) await page.getByRole('button', { name: 'Abrir menu de navegação' }).click()
    await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link', { name: 'Classificação', exact: true }).click()
    await page.getByRole('heading', { name: 'Classificação', exact: true }).waitFor()
    await noOverflow()
  }
  checks.push('360/375/390/768/1366×768: listas, campo, diálogo, sidebar e ausência de overflow global')

  if (process.env.PASSE_LEAGUE_REAL_API === '1') {
    await context.unroute('**/api/v1/**')
    const realRequests = []
    await context.route('**/api/v1/**', async route => {
      assert.equal(route.request().method(), 'GET', 'API real: somente leitura')
      realRequests.push(route.request().url())
      await route.continue()
    })
    const liveClubs = await fetch('http://localhost:8080/api/v1/clubs').then(response => response.json())
    const liveStandings = await fetch('http://localhost:8080/api/v1/standings').then(response => response.json())
    const liveMatches = await fetch('http://localhost:8080/api/v1/matches').then(response => response.json())
    await page.setViewportSize({ width: 375, height: 844 })
    await page.goto(`${origin}/standings`)
    if (liveStandings.length) {
      await standingRows.getByRole('link', { name: liveStandings[0].club_name, exact: true }).waitFor()
      assert.deepEqual(await standingRows.locator('td:nth-child(2)').allTextContents(), liveStandings.map(row => row.club_name))
    }
    for (const path of ['/matches', '/standings', ...(liveClubs[0] ? [`/clubs/${liveClubs[0].id}?tab=history`] : []), ...(liveMatches[0] ? [`/matches/${liveMatches[0].id}`] : [])]) {
      await page.goto(`${origin}${path}`)
      await page.locator('article h1').waitFor()
      await page.reload()
      await page.locator('article h1').waitFor()
      if (path.includes('history')) {
        await page.getByText('Total pago em compras', { exact: true }).waitFor()
        const liveDownload = page.waitForEvent('download')
        await page.getByRole('button', { name: 'Exportar CSV' }).click()
        const actualCsv = await readFile(await (await liveDownload).path(), 'utf8')
        const apiCsv = await fetch(`http://localhost:8080/api/v1/clubs/${liveClubs[0].id}/transactions/export`).then(response => response.text())
        assert.equal(actualCsv, apiCsv)
      }
      await noOverflow()
    }
    checks.push(`API real somente GET: ${liveClubs.length} clubes, ${liveMatches.length} partidas; classificação e CSV comparados; F5 em 375px (${realRequests.length} consultas)`)
  }
  assert.deepEqual(errors, [])
  await writeFile(new URL('results.json', output), JSON.stringify({ date: new Date().toISOString(), checks, errors, simulatedWrites: requests.filter(request => request.method === 'POST') }, null, 2))
  console.log(checks.join('\n'))
} finally {
  await browser?.close()
  await server.close()
}
