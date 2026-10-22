import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { createServer } from 'vite'

const apiOrigin = process.env.PASSE_CLUBS_API
if (apiOrigin !== 'http://localhost:18089') throw new Error('Use PASSE_CLUBS_API=http://localhost:18089 exclusivamente com a API QA isolada.')
const output = new URL('../../docs/evidencias/clubs/', import.meta.url)
await mkdir(output, { recursive: true })
const checks = []
const server = await createServer({
  server: {
    host: 'localhost', port: 15176, strictPort: true,
    proxy: { '/api': { target: apiOrigin, configure(proxy) {
      proxy.on('proxyReq', request => request.setHeader('Origin', 'http://localhost:15175'))
    } } },
  },
  logLevel: 'error',
})
await server.listen()
let browser

async function api(path, method = 'GET', body) {
  const response = await fetch(`${apiOrigin}/api/v1${path}`, {
    method, headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
  const result = await response.json()
  assert.ok(response.ok, JSON.stringify(result))
  return result
}

try {
  browser = await chromium.launch({ channel: 'chrome', headless: true })
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  const writes = []
  page.on('request', request => {
    if (request.url().includes('/api/v1/') && request.method() !== 'GET') writes.push({ url: request.url(), method: request.method() })
  })
  const main = page.locator('article.clubs-page')
  async function capture(name) {
    await page.evaluate(() => document.fonts.ready)
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    await page.screenshot({ path: fileURLToPath(new URL(`${name}.png`, output)), fullPage: true, animations: 'disabled' })
  }
  async function readyClub(name) {
    await main.getByRole('heading', { name, exact: true }).waitFor()
    await page.locator('article[aria-busy="false"]').waitFor()
  }
  async function select(label, option) {
    await main.getByRole('combobox', { name: label, exact: true }).click()
    await page.getByRole('option', { name: option, exact: true }).click()
  }

  const clubs = await api('/clubs')
  assert.ok(clubs.length < 18, 'QA sem espaço: use outra base isolada, sem reset automático.')
  await page.goto('http://localhost:15176/clubs')
  await main.locator('tbody tr:not([aria-hidden])').first().waitFor()
  const receivedNames = await main.locator('tbody tr td:first-child').allTextContents()
  assert.deepEqual(receivedNames.map(name => name.replace(/^[A-Z]{3}/u, '')), clubs.map(club => club.name))
  await main.getByRole('button', { name: /^Ordenar:/ }).click()
  await page.getByRole('menuitemradio', { name: 'Patrimônio (maior para o menor)' }).click()
  await main.locator('tbody tr:not([aria-hidden])').first().waitFor()
  const sorted = await api('/clubs?sort=net_worth_desc')
  await page.waitForFunction(expected => JSON.stringify([...document.querySelectorAll('article tbody tr:not([aria-hidden]) td:nth-child(2)')].map(cell => cell.textContent)) === JSON.stringify(expected), sorted.map(club => club.acronym))
  assert.deepEqual(await main.locator('tbody tr td:nth-child(2)').allTextContents(), sorted.map(club => club.acronym))
  await capture('C01-list')
  checks.push('F05/F07: ordem por nome e patrimônio igual à API')

  await main.getByRole('button', { name: 'Novo clube', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Criar clube', exact: true }).click()
  await dialog.getByText('Use de 3 a 60 caracteres.').waitFor()
  await dialog.getByLabel('Nome', { exact: true }).fill(clubs[0].name)
  await dialog.getByLabel('Sigla', { exact: true }).fill(clubs[0].acronym)
  await dialog.getByRole('button', { name: 'Criar clube', exact: true }).click()
  await dialog.getByRole('alert').waitFor()
  const duplicateMessage = await dialog.getByRole('alert').textContent()
  assert.ok(duplicateMessage.includes('cadastrad'))
  await capture('C03-duplicate')

  const suffix = String(Date.now()).slice(-5).split('').map(digit => String.fromCharCode(65 + Number(digit))).join('')
  const clubName = `Clube Ensaio ${suffix}`
  const used = new Set(clubs.map(club => club.acronym))
  const acronym = [...'ENSAIO'].map(letter => `CE${letter}`).find(value => !used.has(value))
  assert.ok(acronym)
  await dialog.getByLabel('Nome', { exact: true }).fill(clubName)
  await dialog.getByLabel('Sigla', { exact: true }).fill(acronym)
  const beforeCreate = writes.length
  await dialog.getByRole('button', { name: 'Criar clube', exact: true }).dblclick()
  await readyClub(clubName)
  assert.equal(writes.length - beforeCreate, 1)
  const clubId = page.url().match(/clubs\/(\d+)/u)[1]
  const created = await api(`/clubs/${clubId}`)
  assert.equal(created.cash, 300)
  await main.getByRole('heading', { name: 'Nenhum jogador no elenco' }).waitFor()
  await capture('C04-created-empty')
  checks.push('F05: validação, duplicidade real, criação com envio único e caixa da API')

  const positions = ['GOL', 'ZAG', 'LAT', 'MEI', 'ATA', 'MEI']
  const names = ['Bruno Tavares', 'Felipe Moura', 'Diego Ramos', 'Sávio Lima', 'João Silva', 'Lucas Ferraz']
  const players = []
  const loyaltyUntil = new Date(Date.now() + 90 * 86400000 - 3 * 3600000).toISOString().slice(0, 16) + '-03:00'
  for (let index = 0; index < positions.length; index++) {
    const player = await api('/players', 'POST', {
      name: names[index], position: positions[index], age: 25, agility: 70,
      pace: 60, shooting: 60, passing: 60, dribbling: 60, defending: 60, physical: 60, potential: 75,
    })
    await api(`/players/${player.id}/buy`, 'POST', { club_id: Number(clubId), loyalty_until: loyaltyUntil })
    players.push(player)
  }
  await api(`/players/${players[5].id}/condition`, 'PATCH', { condition: 'DOENTE' })
  await api(`/players/${players[3].id}/condition`, 'PATCH', { condition: 'MAL_CONDICIONADO' })
  await page.getByRole('button', { name: 'Atualizar dados' }).click()
  await readyClub(clubName)
  const detail = await api(`/clubs/${clubId}`)
  assert.deepEqual(await main.locator('tbody tr td:first-child strong').allTextContents(), detail.players.map(player => player.name))
  await main.getByRole('columnheader', { name: 'Dias restantes', exact: true }).waitFor()
  await capture('C05-squad')
  checks.push('F07: elenco, valores e contratos reais, ordem preservada')

  await main.getByRole('tab', { name: 'Escalação', exact: true }).click()
  await main.getByRole('button', { name: 'Salvar escalação', exact: true }).waitFor()
  assert.equal(await main.getByRole('button', { name: 'Salvar escalação', exact: true }).isDisabled(), true)
  await main.getByText(/não pode jogar partidas/u).waitFor()
  for (const [index, label] of ['Goleiro 1', 'Defesa 2', 'Defesa 3', 'Meio 4', 'Ataque 5'].entries()) {
    await select(label, `${players[index].name} (${players[index].position})`)
  }
  const beforeSave = writes.length
  await main.getByRole('button', { name: 'Salvar escalação', exact: true }).dblclick()
  await main.getByText('Completa', { exact: true }).waitFor()
  assert.equal(writes.length - beforeSave, 1)
  assert.equal((await api(`/clubs/${clubId}/lineup`)).complete, true)
  await capture('C08-lineup-saved')
  checks.push('F12: cinco vagas válidas, DOENTE fora, mal condicionado permitido, gravação única e resposta real')

  await page.route(`**/api/v1/clubs/${clubId}/lineup`, async route => {
    if (route.request().method() === 'PUT') await route.fulfill({ status: 409, json: { message: 'Jogador DOENTE não pode ser escalado.' } })
    else await route.continue()
  })
  await main.getByRole('button', { name: 'Salvar escalação', exact: true }).click()
  await main.getByText(/A escalação foi recusada.*Jogador DOENTE/u).waitFor()
  await main.getByText('Completa', { exact: true }).waitFor()
  await capture('C10-rejection')
  await page.unroute(`**/api/v1/clubs/${clubId}/lineup`)
  checks.push('C10: recusa controlada preserva message e consulta escalação salva')

  await main.getByRole('tab', { name: /^Elenco/u }).click()
  await main.getByRole('button', { name: 'Vender Felipe Moura', exact: true }).click()
  const beforeSale = writes.length
  await dialog.getByRole('button', { name: 'Confirmar venda', exact: true }).dblclick()
  await dialog.getByRole('heading', { name: 'Venda concluída', exact: true }).waitFor()
  assert.equal(writes.length - beforeSale, 1)
  for (const label of ['Valor de compra', 'Valor de venda', 'Dias restantes', 'Multa', 'Lucro', 'Comissão', 'Crédito no caixa', 'Novo caixa']) await dialog.getByText(label, { exact: true }).waitFor()
  await capture('sale-result')
  await dialog.getByRole('button', { name: 'Fechar', exact: true }).click()
  await readyClub(clubName)
  await main.getByRole('tab', { name: 'Escalação', exact: true }).click()
  await main.getByText('Incompleta', { exact: true }).waitFor()
  assert.equal(await main.getByRole('button', { name: 'Salvar escalação', exact: true }).isDisabled(), true)
  const afterSale = await api(`/clubs/${clubId}/lineup`)
  assert.equal(afterSale.formation, '2-1-1')
  assert.equal(afterSale.players.length, 4)
  await capture('C11-after-sale')
  checks.push('F08/C11: venda confirmada única, oito valores, atualização e escalação incompleta real')

  await main.getByRole('tab', { name: 'Histórico', exact: true }).click()
  await main.getByRole('heading', { name: 'Histórico de transações', exact: true }).waitFor()
  await main.locator('tbody tr:not([aria-hidden])').first().waitFor()
  await select('Todos os tipos', 'Venda')
  await main.locator('tbody tr:not([aria-hidden])').first().waitFor()
  const history = await api(`/clubs/${clubId}/transactions?type=VENDA`)
  assert.equal(await main.locator('tbody tr').count(), history.data.length)
  const format = value => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
  const summary = history.summary
  assert.deepEqual(await main.locator('.history-totals dd').allTextContents(), [summary.total_spent, summary.total_received, summary.total_fees, summary.total_penalties].map(format).concat(`${summary.total_profit >= 0 ? '+' : ''}${format(summary.total_profit)}`))
  await select('Todos os jogadores', 'Felipe Moura')
  await main.locator('tbody tr:not([aria-hidden])').first().waitFor()
  const downloadPromise = page.waitForEvent('download')
  await main.getByRole('button', { name: 'Exportar CSV' }).click()
  const download = await downloadPromise
  assert.equal(download.suggestedFilename(), `clube-${clubId}-transacoes.csv`)
  await download.saveAs(fileURLToPath(new URL('filtered-history.csv', output)))
  const expectedCsv = await fetch(`${apiOrigin}/api/v1/clubs/${clubId}/transactions/export?type=VENDA&player_id=${players[1].id}`).then(response => response.text())
  assert.equal(await readFile(new URL('filtered-history.csv', output), 'utf8'), expectedCsv)
  await capture('history-filtered')
  checks.push('F09/F10/F11: histórico real, tipos/jogador e exportação filtrada')

  for (const width of [360, 375, 390, 768, 1366, 1920]) {
    await page.setViewportSize({ width, height: width >= 1366 ? 768 : 844 })
    await main.getByRole('heading', { name: 'Histórico de transações', exact: true }).waitFor()
    await main.getByRole('button', { name: 'Exportar CSV', exact: true }).waitFor()
    const size = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: innerWidth }))
    assert.ok(size.scroll <= size.width, `Overflow no histórico a ${width}: ${size.scroll}`)
    await capture(`history-${width}`)
    await main.getByRole('tab', { name: 'Escalação', exact: true }).click()
    await main.getByRole('button', { name: 'Salvar escalação', exact: true }).waitFor()
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Overflow na escalação a ${width}`)
    await capture(`lineup-${width}`)
    await main.getByRole('tab', { name: 'Histórico', exact: true }).click()
    await main.getByRole('heading', { name: 'Histórico de transações', exact: true }).waitFor()
    await main.locator('tbody tr:not([aria-hidden])').first().waitFor()
  }
  checks.push('F5: histórico e escalação sem overflow global em 360/375/390/768/1366/1920')

  await page.setViewportSize({ width: 375, height: 844 })
  await page.getByRole('button', { name: 'Abrir menu de navegação' }).click()
  await page.getByRole('dialog').getByRole('link', { name: /^Clubes/u }).click()
  await main.locator('tbody tr:not([aria-hidden])').first().waitFor()
  await main.getByRole('button', { name: 'Novo clube', exact: true }).click()
  const bounds = await dialog.boundingBox()
  assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 375)
  await page.keyboard.press('Tab')
  assert.equal(await dialog.evaluate(node => node.contains(document.activeElement)), true)
  await page.keyboard.press('Escape')
  await dialog.waitFor({ state: 'hidden' })
  assert.equal(await main.getByRole('button', { name: 'Novo clube', exact: true }).evaluate(node => node === document.activeElement), true)
  checks.push('375px: menu, diálogo dentro da viewport, teclado/Escape e retorno de foco')

  await page.route('**/api/v1/clubs?sort=*', route => route.fulfill({ json: [] }))
  await page.getByRole('button', { name: 'Atualizar dados' }).click()
  await main.getByRole('heading', { name: 'Nenhum clube cadastrado' }).waitFor()
  await capture('C09-empty')
  await page.unroute('**/api/v1/clubs?sort=*')
  await page.route('**/api/v1/clubs?sort=*', route => route.fulfill({ status: 503, json: { message: 'Consulta de clubes indisponível.' } }))
  await page.getByRole('button', { name: 'Atualizar dados' }).click()
  await main.getByText('Consulta de clubes indisponível.').waitFor()
  await page.unroute('**/api/v1/clubs?sort=*')
  await main.getByRole('button', { name: 'Tentar novamente' }).click()
  await main.locator('tbody tr:not([aria-hidden])').first().waitFor()
  await page.goto('http://localhost:15176/clubs/2147483647')
  await main.getByRole('heading', { name: 'Clube não encontrado' }).waitFor()
  await capture('E04-not-found')
  await page.goto(`http://localhost:15176/clubs/${clubId}?tab=history`)
  await main.locator('tbody tr:not([aria-hidden])').first().waitFor()
  await page.route(`**/api/v1/clubs/${clubId}/transactions*`, route => route.fulfill({ status: 503, json: { message: 'Histórico temporariamente indisponível.' } }))
  await page.getByRole('button', { name: 'Atualizar dados' }).click()
  await main.getByRole('heading', { name: 'Não foi possível carregar o histórico' }).waitFor()
  assert.equal(await main.getByRole('button', { name: 'Exportar CSV' }).count(), 0)
  assert.equal(await main.locator('.history-totals').count(), 0)
  await capture('E05-history-error')
  await page.unroute(`**/api/v1/clubs/${clubId}/transactions*`)
  await main.getByRole('button', { name: 'Tentar novamente' }).click()
  await main.locator('tbody tr:not([aria-hidden])').first().waitFor()
  checks.push('C09/E04/E05: vazio controlado, 404 real, erro de histórico sem totais/CSV e retry')
  assert.deepEqual(errors, [])
  await writeFile(new URL('results.json', output), JSON.stringify({ date: new Date().toISOString(), clubId, checks, errors }, null, 2))
  console.log(checks.join('\n'))
} finally {
  await browser?.close()
  await server.close()
}
