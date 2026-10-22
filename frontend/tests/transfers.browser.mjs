import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { createServer } from 'vite'

const apiOrigin = process.env.PASSE_TRANSFERS_API
if (apiOrigin !== 'http://localhost:18089') throw new Error('Use apenas PASSE_TRANSFERS_API=http://localhost:18089 com a API QA isolada.')
const output = new URL('../../docs/evidencias/transfers/', import.meta.url)
await mkdir(output, { recursive: true })
const server = await createServer({
  server: { host: 'localhost', port: 15177, strictPort: true, proxy: {
    '/api': { target: apiOrigin, configure(proxy) {
      proxy.on('proxyReq', request => request.setHeader('Origin', 'http://localhost:15175'))
    } },
  } },
  logLevel: 'error',
})
await server.listen()
const checks = []
let browser
const money = value => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
const loyalty = new Date(Date.now() + 90 * 86400000 - 3 * 3600000).toISOString().slice(0, 16)

async function api(path, method = 'GET', body) {
  const response = await fetch(`${apiOrigin}/api/v1${path}`, {
    method, headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
  const result = await response.json()
  assert.ok(response.ok, `${path}: ${JSON.stringify(result)}`)
  return result
}

try {
  const existing = await api('/clubs')
  assert.ok(existing.length < 18, 'Sem espaço na QA: use outra base isolada; nenhum reset será executado.')
  const suffix = String(Date.now()).slice(-6).split('').map(value => String.fromCharCode(65 + Number(value))).join('')
  const used = new Set(existing.map(club => club.acronym))
  const acronym = [...'EGOCIAS'].map(letter => `CN${letter}`).find(value => !used.has(value))
  assert.ok(acronym, 'Sem sigla disponível para outro ensaio nesta QA.')
  const club = await api('/clubs', 'POST', { name: `Clube Negociações ${suffix}`, acronym })
  const player = await api('/players', 'POST', {
    name: `Eduardo Paiva ${suffix}`, position: 'MEI', age: 26, agility: 70,
    pace: 75, shooting: 75, passing: 75, dribbling: 75, defending: 75, physical: 75, potential: 80,
  })
  browser = await chromium.launch({ channel: 'chrome', headless: true })
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  const errors = []
  const writes = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('request', request => {
    if (request.method() === 'POST' && /\/api\/v1\/players\/\d+\/(buy|sell)$/u.test(request.url())) writes.push(request)
  })
  const dialog = page.getByRole('dialog')
  const main = page.locator('article')
  async function capture(name) {
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({ path: fileURLToPath(new URL(`${name}.png`, output)), fullPage: true, animations: 'disabled' })
  }
  async function chooseClub() {
    await dialog.getByRole('combobox', { name: 'Clube comprador' }).click()
    await page.getByRole('option', { name: new RegExp(club.name) }).click()
  }
  async function openPurchase(id) {
    await page.goto(`http://localhost:15177/transfers/buy?player_id=${id}`)
    await dialog.getByRole('heading', { name: 'Comprar jogador', exact: true }).waitFor()
    await dialog.getByRole('combobox', { name: 'Clube comprador' }).waitFor()
    await chooseClub()
    await dialog.getByLabel('Data', { exact: true }).fill(loyalty.slice(0, 10))
    await dialog.getByLabel('Hora', { exact: true }).fill(loyalty.slice(11, 16))
  }
  async function compareFacts(expected) {
    for (const [label, value] of Object.entries(expected)) {
      const row = dialog.locator('dl > div').filter({ has: page.locator('dt', { hasText: new RegExp(`^${label}`) }) })
      assert.equal(await row.locator('dd').textContent(), value, label)
    }
  }

  await openPurchase(player.id)
  assert.ok(page.url().includes('/players?free=true&buy='))
  await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click()
  await page.goto(`http://localhost:15177/players?free=true&search=${encodeURIComponent(player.name)}`)
  await main.getByRole('button', { name: `Comprar ${player.name}`, exact: true }).click()
  await dialog.getByRole('combobox', { name: 'Clube comprador' }).waitFor()
  await chooseClub()
  await dialog.getByLabel('Data', { exact: true }).fill(loyalty.slice(0, 10))
  await dialog.getByLabel('Hora', { exact: true }).fill(loyalty.slice(11, 16))
  assert.ok(page.url().includes('/players?free=true&search='))
  await capture('M01-confirmation')
  await page.route(`**/api/v1/players/${player.id}/buy`, route => route.abort('failed'))
  await dialog.getByRole('button', { name: 'Confirmar compra', exact: true }).click()
  await dialog.getByText(/A compra não foi confirmada/u).waitFor()
  assert.equal(await dialog.getByLabel('Data', { exact: true }).inputValue(), loyalty.slice(0, 10))
  await capture('M03-network-error')
  await page.unroute(`**/api/v1/players/${player.id}/buy`)
  checks.push('M01/M03: deep link abre modal sobre livres; falha de rede preserva clube/data/hora')

  let releasePurchase
  const purchaseGate = new Promise(resolve => { releasePurchase = resolve })
  await page.route(`**/api/v1/players/${player.id}/buy`, async route => {
    await purchaseGate
    await route.continue()
  })
  const purchaseResponse = page.waitForResponse(response => response.url().endsWith(`/players/${player.id}/buy`) && response.status() === 200)
  const beforeBuy = writes.length
  await dialog.getByRole('button', { name: 'Tentar de novo', exact: true }).dblclick()
  await dialog.getByText('Comprando…', { exact: true }).waitFor()
  assert.equal(await dialog.getByRole('button', { name: 'Cancelar', exact: true }).isDisabled(), true)
  assert.equal(await dialog.getByLabel('Hora', { exact: true }).isDisabled(), true)
  await page.keyboard.press('Escape')
  assert.equal(await dialog.count(), 1)
  await capture('M02-submitting')
  releasePurchase()
  const purchase = await (await purchaseResponse).json()
  await dialog.getByRole('heading', { name: 'Compra concluída', exact: true }).waitFor()
  assert.equal(writes.length - beforeBuy, 1)
  assert.equal(JSON.parse(writes.at(-1).postData()).loyalty_until, `${loyalty}-03:00`)
  await page.unroute(`**/api/v1/players/${player.id}/buy`)
  await compareFacts({ Valor: money(purchase.value), Taxa: money(purchase.fee), 'Custo total': money(purchase.value + purchase.fee), Contrato: purchase.contract.status, 'Novo caixa': money(purchase.club_cash) })
  await capture('M05-success')
  await dialog.getByRole('button', { name: 'Fechar', exact: true }).click()
  await dialog.waitFor({ state: 'hidden' })
  await main.locator('.players-list[aria-busy="false"]').waitFor()
  assert.equal(await main.getByRole('button', { name: `Comprar ${player.name}`, exact: true }).count(), 0)
  await page.goto(`http://localhost:15177/players?club_id=${club.id}`)
  await main.getByText(player.name, { exact: true }).waitFor()
  await main.getByText(club.name, { exact: true }).first().waitFor()
  await capture('M06-after-purchase')
  checks.push('M02/M05/M06: POST único, Brasília, resultado real e lista/filtro por clube atualizados')

  const squad = [player]
  for (const [position, name] of [['GOL', 'Bruno Tavares'], ['ZAG', 'Felipe Moura'], ['LAT', 'Diego Ramos'], ['ATA', 'João Silva']]) {
    const member = await api('/players', 'POST', { name: `${name} ${suffix}`, position, age: 25, agility: 70, pace: 40, shooting: 40, passing: 40, dribbling: 40, defending: 40, physical: 40, potential: 60 })
    await api(`/players/${member.id}/buy`, 'POST', { club_id: club.id, loyalty_until: `${loyalty}-03:00` })
    squad.push(member)
  }
  await api(`/clubs/${club.id}/lineup`, 'PUT', { formation: '2-1-1', player_ids: squad.map(member => member.id) })
  await api(`/players/${player.id}/condition`, 'PATCH', { condition: 'MAL_CONDICIONADO' })
  await page.goto(`http://localhost:15177/clubs/${club.id}`)
  await main.getByRole('button', { name: `Vender ${player.name}`, exact: true }).click()
  await dialog.getByText(new RegExp(`${player.name} é titular`)).waitFor()
  await dialog.getByText('Dias restantes', { exact: true }).waitFor()
  await capture('V01-starter-confirmation')
  await page.route(`**/api/v1/players/${player.id}/sell`, route => route.fulfill({ status: 409, json: { message: 'Jogador está livre.' } }))
  await dialog.getByRole('button', { name: 'Confirmar venda', exact: true }).click()
  await dialog.getByText('A venda foi recusada. Jogador está livre.', { exact: true }).waitFor()
  await capture('V04-rejected')
  await page.unroute(`**/api/v1/players/${player.id}/sell`)
  let releaseSale
  const saleGate = new Promise(resolve => { releaseSale = resolve })
  await page.route(`**/api/v1/players/${player.id}/sell`, async route => { await saleGate; await route.continue() })
  const saleResponse = page.waitForResponse(response => response.url().endsWith(`/players/${player.id}/sell`) && response.status() === 200)
  const beforeSale = writes.length
  await dialog.getByRole('button', { name: 'Confirmar venda', exact: true }).dblclick()
  await dialog.getByText('Vendendo…', { exact: true }).waitFor()
  assert.equal(await dialog.getByRole('button', { name: 'Cancelar', exact: true }).isDisabled(), true)
  await capture('V05-submitting')
  releaseSale()
  const sale = await (await saleResponse).json()
  await dialog.getByRole('heading', { name: 'Venda concluída', exact: true }).waitFor()
  assert.equal(writes.length - beforeSale, 1)
  await page.unroute(`**/api/v1/players/${player.id}/sell`)
  await compareFacts({ 'Valor de compra': money(sale.purchase_value), 'Dias restantes': String(sale.remaining_days), Lucro: money(sale.profit), Contrato: sale.contract_status, 'Novo caixa': money(sale.club_cash) })
  await capture('V02-sale-success')
  assert.equal((await api(`/players/${player.id}`)).club_id, null)
  const lineup = await api(`/clubs/${club.id}/lineup`)
  assert.equal(lineup.complete, false)
  assert.equal(lineup.players.length, 4)
  await dialog.getByRole('link', { name: 'Ver histórico', exact: true }).click()
  await main.getByRole('heading', { name: 'Histórico de transações', exact: true }).waitFor()
  checks.push('V01/V02/V04/V05: aviso real de titular, recusa controlada, POST único, prejuízo/contrato/caixa reais e lineup invalidada')

  await openPurchase(player.id)
  await dialog.getByRole('button', { name: 'Confirmar compra', exact: true }).click()
  await dialog.getByText(/Clube não pode recomprar jogador que já vendeu/u).waitFor()
  await capture('M08-repurchase')
  await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click()
  const expensive = await api('/players', 'POST', { name: `Otávio Rezende ${suffix}`, position: 'ATA', age: 27, agility: 70, pace: 99, shooting: 99, passing: 70, dribbling: 99, defending: 1, physical: 99, potential: 99 })
  await openPurchase(expensive.id)
  await dialog.getByRole('button', { name: 'Confirmar compra', exact: true }).click()
  await dialog.getByText(/Custo ultrapassa 50% do caixa/u).waitFor()
  await capture('M04-budget')
  checks.push('M04/M08: orçamento e recompra recusados pela API real; nenhum bloqueio financeiro local')

  for (const width of [360, 375, 390, 768, 1366, 1920]) {
    await page.setViewportSize({ width, height: width >= 1366 ? 768 : 844 })
    const rect = await dialog.boundingBox()
    assert.ok(rect.x >= 0 && rect.x + rect.width <= width && rect.y >= 0, `Modal fora da viewport ${width}`)
    assert.ok(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth), `Scroll horizontal no diálogo ${width}`)
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Overflow global ${width}`)
    await dialog.getByRole('button', { name: 'Confirmar compra', exact: true }).scrollIntoViewIfNeeded()
    await capture(`purchase-${width}`)
  }
  await page.setViewportSize({ width: 375, height: 844 })
  await page.keyboard.press('Tab')
  assert.equal(await dialog.evaluate(element => element.contains(document.activeElement)), true)
  await page.keyboard.press('Shift+Tab')
  assert.equal(await dialog.evaluate(element => element.contains(document.activeElement)), true)
  await page.keyboard.press('Escape')
  await dialog.waitFor({ state: 'hidden' })
  checks.push('Compra: seis larguras sem overflow, controles alcançáveis, foco Tab/Shift+Tab e Escape em 375')

  for (let index = 4; index < 12; index++) {
    const member = await api('/players', 'POST', { name: `Reserva Ensaio ${suffix}`, position: 'MEI', age: 25, agility: 70, pace: 40, shooting: 40, passing: 40, dribbling: 40, defending: 40, physical: 40, potential: 60 })
    await api(`/players/${member.id}/buy`, 'POST', { club_id: club.id, loyalty_until: `${loyalty}-03:00` })
  }
  await openPurchase(expensive.id)
  await dialog.getByRole('button', { name: 'Confirmar compra', exact: true }).click()
  await dialog.getByText(/Elenco já possui 12 jogadores/u).waitFor()
  await capture('M07-full-squad')
  checks.push('M07: clube com 12 jogadores continua selecionável; API real recusa o 13º')
  await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click()

  await page.goto(`http://localhost:15177/clubs/${club.id}`)
  await main.getByRole('button', { name: `Vender ${squad[1].name}`, exact: true }).click()
  await dialog.getByText(new RegExp(`${squad[1].name} é titular`)).waitFor()
  await page.route(`**/api/v1/players/${squad[1].id}/sell`, route => route.fulfill({ json: { ...sale, player_name: squad[1].name, remaining_days: 0, penalty_rate: 0, penalty: 0, fee: 0, profit: -4.8, cash_change: 24, contract_status: 'ENCERRADO' } }))
  await dialog.getByRole('button', { name: 'Confirmar venda', exact: true }).click()
  await dialog.getByText('Fidelidade cumprida: sem multa', { exact: true }).waitFor()
  for (const width of [360, 375, 390, 768, 1366, 1920]) {
    await page.setViewportSize({ width, height: width >= 1366 ? 768 : 844 })
    await dialog.getByRole('button', { name: 'Fechar', exact: true }).scrollIntoViewIfNeeded()
    assert.ok(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth))
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    await capture(`V03-sale-${width}`)
  }
  checks.push('V03: fidelidade cumprida/zero/prejuízo com resposta controlada e resultado nas seis larguras')
  assert.deepEqual(errors, [])
  await writeFile(new URL('results.json', output), JSON.stringify({ date: new Date().toISOString(), clubId: club.id, checks, errors }, null, 2))
  console.log(checks.join('\n'))
} finally {
  await browser?.close()
  await server.close()
}
