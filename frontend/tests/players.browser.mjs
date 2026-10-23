import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { createServer } from 'vite'

const apiOrigin = process.env.PASSE_PLAYERS_API
const allowedOrigin = 'http://localhost:18089'

if (apiOrigin !== allowedOrigin) {
  throw new Error(`Defina PASSE_PLAYERS_API=${allowedOrigin}, apontando exclusivamente para um banco QA novo e isolado.`)
}

const output = new URL('../../docs/evidencias/players-shadcn/', import.meta.url)
await mkdir(output, { recursive: true })
const checks = []
const requests = []
let browser

async function api(path, method = 'GET', body) {
  const response = await fetch(`${apiOrigin}/api/v1${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })

  assert.ok(response.ok, `${method} ${path}: ${response.status} ${response.ok ? '' : await response.text()}`)
  return response.status === 204 ? undefined : response.json()
}

async function seedLeague() {
  const original = await api('/players?limit=1')
  const clubs = await api('/clubs')
  assert.equal(original.meta.total_items, 0, 'O banco QA precisa começar vazio; nenhum dado existente será apagado.')
  assert.equal(clubs.length, 0, 'Não usar um banco existente.')

  const names = ['João Silva', 'Bruno Tavares', 'Danilo Freitas', 'Diego Ramos', 'Eduardo Paiva', 'Ênio Carvalho', 'Felipe Moura', 'Gabriel Antunes', 'Heitor Gomes', 'Ícaro Mendes', 'Otávio Rezende', 'Rafael Nogueira']
  const positions = ['GOL', 'ZAG', 'LAT', 'MEI', 'ATA']
  const players = []

  for (const [index, name] of names.entries()) {
    players.push(await api('/players', 'POST', {
      name, position: positions[index % positions.length], age: 25, agility: 70,
      pace: 40, shooting: 40, passing: 40, dribbling: 40,
      defending: 40, physical: 40, potential: 60,
    }))
  }

  const club = await api('/clubs', 'POST', { name: 'Clube Teste Azul', acronym: 'CTA' })
  const loyalty = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16) + '-03:00'

  for (const player of players.slice(0, 5)) {
    await api(`/players/${player.id}/buy`, 'POST', { club_id: club.id, loyalty_until: loyalty })
  }

  await api(`/clubs/${club.id}/lineup`, 'PUT', { formation: '2-1-1', player_ids: players.slice(0, 5).map(player => player.id) })
  return { players, club }
}

const seed = await seedLeague()
const server = await createServer({
  server: { host: 'localhost', port: 15175, strictPort: true, proxy: { '/api': apiOrigin } },
  logLevel: 'error',
})
await server.listen()

try {
  browser = await chromium.launch({ channel: 'chrome', headless: true })
  const page = await browser.newPage({ viewport: { width: 1366, height: 1008 } })
  const consoleErrors = []
  page.on('pageerror', error => consoleErrors.push(error.message))
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(`${message.text()} @ ${message.location().url}`)
  })
  page.on('request', request => {
    if (request.url().includes('/api/v1/')) requests.push({ url: request.url(), method: request.method(), body: request.postDataJSON() })
  })

  function activeDialog() {
    return page.locator('[role="dialog"], [role="alertdialog"]')
  }

  async function capture(name) {
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({ path: fileURLToPath(new URL(name + '.png', output)), fullPage: await activeDialog().count() === 0, animations: 'disabled' })
  }

  async function chooseFilter(label, option) {
    await page.getByRole('combobox', { name: label, exact: true }).click()
    const key = label === 'Posição' ? 'position' : 'condition'
    const value = label === 'Posição' ? option.slice(0, 3) : 'APTO'
    await Promise.all([
      page.waitForURL(url => url.searchParams.get(key) === value),
      page.getByRole('option', { name: option, exact: true }).click(),
    ])
    await listReady()
  }

  async function chooseSort(value) {
    const options = { name: 'Nome', value_desc: 'Maior valor de mercado', value_asc: 'Menor valor de mercado', age_desc: 'Maior idade', age_asc: 'Menor idade', position: 'Posição (GOL a ATA)' }
    await page.getByRole('button', { name: 'Ordenar por' }).click()
    if (value === 'value_desc') await capture('J15-sort-menu')
    await page.getByRole('menuitemradio', { name: options[value], exact: true }).click()
  }

  async function listReady() {
    await page.waitForFunction(() => {
      const list = document.querySelector('.players-list')
      const query = new URLSearchParams(window.location.search).toString()
      return list?.getAttribute('data-query') === query && list.getAttribute('aria-busy') === 'false'
    })
  }

  async function applyFilters() {
    await Promise.all([
      page.waitForResponse(response => response.url().includes('/api/v1/players?') && response.url().includes('limit=10')),
      activeDialog().count().then(count => count ? activeDialog().getByRole('button', { name: 'Aplicar filtros' }).click() : page.getByLabel('Buscar por nome').press('Enter')),
    ])
    await listReady()
  }

  async function openAction(name, action) {
    if (await page.getByRole('button', { name: `Ações de ${name}`, exact: true }).count() === 0) {
      await page.goto(`http://localhost:15175/players?search=${encodeURIComponent(name)}`)
      await listReady()
    }
    await page.getByRole('button', { name: `Ações de ${name}`, exact: true }).click()
    if (action === 'Ver detalhes' && !checks.some(check => check.startsWith('J08/J12:'))) await capture('J08-actions-menu')
    await page.getByRole('menuitem', { name: action, exact: true }).click()
    await activeDialog().waitFor()
    await activeDialog().getByText('Carregando jogador…').waitFor({ state: 'hidden' })
    return activeDialog()
  }

  async function closeDialog() {
    await page.getByRole('button', { name: 'Fechar diálogo' }).click()
    await activeDialog().waitFor({ state: 'hidden' })
  }

  async function clearFilters() {
    await page.goto('http://localhost:15175/players')
    await listReady()
  }

  function money(value) {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  await clearFilters()
  assert.equal(await page.locator('table tbody tr').count(), 10)
  await page.getByText('Mostrando 1–10 de 12 jogadores').waitFor()
  await page.getByRole('link', { name: 'Próxima' }).click()
  await page.getByText('Mostrando 11–12 de 12 jogadores').waitFor()
  assert.equal(await page.locator('table tbody tr').count(), 2)
  await page.getByRole('link', { name: 'Anterior' }).click()
  await page.getByText('Mostrando 1–10 de 12 jogadores').waitFor()
  await capture('J01-list')
  checks.push('J01: dez por página, meta e navegação com 12 jogadores reais')

  await page.getByLabel('Buscar por nome').fill('JOAO')
  await applyFilters()
  assert.equal(await page.locator('table tbody tr').count(), 1)
  await page.getByText('João Silva', { exact: true }).waitFor()
  await capture('J03-search')
  checks.push('J03: JOAO encontra João Silva pela busca real da API')

  await clearFilters()
  await chooseFilter('Posição', 'ZAG · Zagueiro')
  await chooseFilter('Condição', 'Apto')
  await page.getByRole('button', { name: 'Idade', exact: true }).click()
  await page.getByLabel('Idade mínima').fill('20')
  await page.getByLabel('Idade máxima').fill('30')
  await applyFilters()
  await page.getByRole('button', { name: 'Valor de mercado', exact: true }).click()
  await page.getByLabel('Valor mínimo').fill('0')
  await page.getByLabel('Valor máximo').fill('10')
  await applyFilters()
  const filtered = await api('/players?position=ZAG&condition=APTO&min_age=20&max_age=30&min_value=0&max_value=10')
  assert.equal(await page.locator('table tbody tr').count(), filtered.data.length)
  await capture('J02-combined-filters')
  checks.push('J02: posição, condição, faixa etária e valor combinados na API')

  await clearFilters()
  await page.getByRole('tab', { name: /^Livres/ }).click()
  await page.getByText('Mostrando 1–7 de 7 jogadores').waitFor()
  assert.equal(await page.getByRole('combobox', { name: 'Clube', exact: true }).isDisabled(), true)
  await capture('J04-free')
  checks.push('J04: sete livres e clube incompatível desabilitado')

  for (const sort of ['value_desc', 'value_asc', 'age_desc', 'age_asc', 'position', 'name']) {
    await Promise.all([
      page.waitForResponse(response => response.url().includes(`sort=${sort}`) && response.url().includes('limit=10')),
      chooseSort(sort),
    ])
    await listReady()
    const expected = await api(`/players?free=true&sort=${sort}&limit=10`)
    assert.deepEqual(await page.locator('table .player-identity strong').allTextContents(), expected.data.map(player => player.name))
  }
  checks.push('J15: seis ordenações preservam exatamente a ordem da API')

  await clearFilters()
  await page.getByRole('button', { name: 'Novo jogador' }).click()
  let dialog = activeDialog()
  await dialog.getByRole('button', { name: 'Salvar jogador' }).click()
  await dialog.getByText('Use de 3 a 100 caracteres.').waitFor()
  assert.equal(requests.filter(request => request.method === 'POST' && request.url.endsWith('/players')).length, 0)
  await capture('J06-validation')
  checks.push('J06: obrigatórios inválidos exibem mensagens sem POST')

  const createFields = { Nome: 'Davi Melo', Idade: '23', Agilidade: '70', Velocidade: '66', Finalização: '62', Passe: '74', Drible: '70', Defesa: '48', Físico: '58', Potencial: '82' }
  for (const [label, value] of Object.entries(createFields)) {
    const role = label === 'Nome' ? 'textbox' : 'spinbutton'
    await dialog.getByRole(role, { name: label, exact: true }).fill(value)
  }
  await dialog.getByRole('radio', { name: /MEI/ }).check()
  await capture('J05-create')
  await dialog.getByRole('button', { name: 'Salvar jogador' }).evaluate(button => { button.click(); button.click() })
  await page.getByRole('heading', { name: 'Jogador cadastrado', exact: true }).waitFor()
  await capture('J07-created')
  const created = (await api('/players?search=Davi%20Melo')).data[0]
  assert.ok(created)
  assert.equal(requests.filter(request => request.method === 'POST' && request.url.endsWith('/players')).length, 1)
  assert.ok((await activeDialog().textContent()).includes(money(created.base_value)))
  assert.ok((await activeDialog().textContent()).includes(String(created.overall)))
  await closeDialog()
  await listReady()
  checks.push('J05/J07: cadastro real, valores retornados e proteção contra clique duplo')

  dialog = await openAction('Davi Melo', 'Ver detalhes')
  await capture('J12-details')
  assert.equal(await dialog.getByRole('progressbar').count(), 6)
  assert.ok((await dialog.textContent()).includes(money(created.market_value)))
  await closeDialog()
  checks.push('J08/J12: menu e drawer com seis atributos e dados reais')

  dialog = await openAction('Davi Melo', 'Editar')
  await capture('J09-edit')
  assert.equal(await dialog.locator('input[name="pace"]').count(), 0)
  await dialog.getByLabel('Idade', { exact: true }).fill('24')
  await dialog.getByLabel('Agilidade', { exact: true }).fill('71')
  await dialog.getByRole('button', { name: 'Salvar alterações' }).click()
  await activeDialog().waitFor({ state: 'hidden' })
  const edited = await api(`/players/${created.id}`)
  assert.equal(edited.age, 24)
  assert.equal(edited.base_value, created.base_value)
  const editRequest = requests.findLast(request => request.method === 'PUT' && request.url.endsWith(`/players/${created.id}`))
  assert.deepEqual(Object.keys(editRequest.body).sort(), ['age', 'agility', 'name', 'position'])
  await listReady()

  dialog = await openAction('João Silva', 'Editar')
  assert.equal(await dialog.getByRole('radio', { name: /MEI/ }).isDisabled(), true)
  await dialog.getByLabel('Idade', { exact: true }).fill('24')
  await dialog.getByRole('button', { name: 'Salvar alterações' }).click()
  await dialog.getByText('A idade não pode ser menor que 25.').waitFor()
  await closeDialog()
  checks.push('J09: edição envia quatro campos, preserva base/atributos e bloqueia posição com clube/idade reduzida')

  dialog = await openAction('Davi Melo', 'Alterar condição')
  await dialog.getByRole('radio', { name: /^Doente/ }).check()
  await dialog.getByRole('button', { name: 'Salvar condição' }).click()
  await activeDialog().waitFor({ state: 'hidden' })
  await listReady()
  await capture('J11-condition-saved')
  const sick = await api(`/players/${created.id}`)
  assert.equal(sick.condition, 'DOENTE')
  const updatedRow = page.getByRole('row').filter({ hasText: 'Davi Melo' })
  assert.ok((await updatedRow.textContent()).includes(money(sick.market_value)))
  dialog = await openAction('Davi Melo', 'Alterar condição')
  assert.equal(await dialog.getByRole('radio', { name: /^Apto/ }).isDisabled(), true)
  await dialog.getByRole('radio', { name: /^Mal condicionado/ }).check()
  await capture('J10-condition')
  await dialog.getByRole('button', { name: 'Salvar condição' }).click()
  await activeDialog().waitFor({ state: 'hidden' })
  await listReady()
  await capture('J11-condition-saved')
  checks.push('J10/J11: condição e valor atualizados, DOENTE→APTO bloqueado e recuperação via MAL_CONDICIONADO')

  dialog = await openAction('Bruno Tavares', 'Alterar condição')
  await dialog.getByRole('radio', { name: /^Doente/ }).check()
  await capture('J16-starter-warning')
  await dialog.getByText(/Bruno Tavares é titular/).waitFor()
  await dialog.getByRole('button', { name: 'Salvar condição' }).click()
  await activeDialog().waitFor({ state: 'hidden' })
  const lineup = await api(`/clubs/${seed.club.id}/lineup`)
  assert.equal(lineup.complete, false)
  assert.equal(lineup.players.some(player => player.id === seed.players[1].id), false)
  await listReady()
  checks.push('J16: aviso de titular e saída real da escalação na mesma alteração de condição')

  dialog = await openAction('Davi Melo', 'Excluir')
  await capture('J13-delete')
  await dialog.getByRole('button', { name: 'Cancelar' }).click()
  assert.equal((await api(`/players/${created.id}`)).id, created.id)
  dialog = await openAction('Davi Melo', 'Excluir')
  await dialog.getByRole('button', { name: 'Excluir jogador' }).evaluate(button => { button.click(); button.click() })
  await activeDialog().waitFor({ state: 'hidden' })
  await listReady()
  await clearFilters()
  await page.getByText('Mostrando 1–10 de 12 jogadores').waitFor()
  assert.equal(requests.filter(request => request.method === 'DELETE').length, 1)
  assert.equal((await fetch(`${apiOrigin}/api/v1/players/${created.id}`)).status, 404)
  await capture('J14-deleted')
  checks.push('J13/J14: cancelar preserva registro; confirmar exclui logicamente uma única vez e atualiza meta')

  for (const [width, height] of [[360, 640], [375, 844], [390, 844], [768, 1024], [1366, 768], [1920, 1080]]) {
    await page.setViewportSize({ width, height })
    await clearFilters()
    await page.evaluate(() => document.fonts.ready)
    const size = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth }))
    assert.ok(size.scroll <= size.viewport, `${width}: overflow horizontal da página`)
    await page.screenshot({ path: fileURLToPath(new URL(`list-${width}.png`, output)), fullPage: true })
    await page.getByRole('button', { name: 'Novo jogador' }).click()
    const bounds = await activeDialog().boundingBox()
    assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width + 1)
    assert.ok(bounds.y >= 0 && bounds.y + bounds.height <= height + 1)
    await activeDialog().getByRole('button', { name: 'Salvar jogador' }).scrollIntoViewIfNeeded()
    if (width === 375) {
      await page.screenshot({ path: fileURLToPath(new URL('create-375.png', output)), fullPage: true })
      await activeDialog().getByRole('button', { name: 'Salvar jogador' }).focus()
      await page.keyboard.press('Tab')
      assert.equal(await activeDialog().evaluate(element => element.contains(document.activeElement)), true)
      await page.keyboard.press('Shift+Tab')
      assert.equal(await activeDialog().evaluate(element => element.contains(document.activeElement)), true)
    }
    await page.keyboard.press('Escape')
    await activeDialog().waitFor({ state: 'hidden' })
    assert.equal(await page.getByRole('button', { name: 'Novo jogador' }).evaluate(element => element === document.activeElement), true)
    const details = await openAction('Bruno Tavares', 'Ver detalhes')
    const drawerBounds = await details.boundingBox()
    assert.ok(drawerBounds.x >= 0 && drawerBounds.x + drawerBounds.width <= width + 1)
    await details.getByRole('button', { name: 'Alterar condição' }).scrollIntoViewIfNeeded()
    if (width === 375) await page.screenshot({ path: fileURLToPath(new URL('details-375.png', output)), fullPage: true })
    await closeDialog()
    if (width < 1024) {
      await page.getByRole('button', { name: 'Abrir menu de navegação' }).click()
      if (width === 375) await page.screenshot({ path: fileURLToPath(new URL('menu-375.png', output)), fullPage: true })
      await activeDialog().getByRole('link', { name: /Jogadores/ }).click()
      await activeDialog().waitFor({ state: 'hidden' })
    }
    checks.push(`${width}×${height}: lista sem overflow global, tabela contida, diálogo dentro do viewport, Escape/foco e menu móvel`)
  }

  await page.setViewportSize({ width: 1366, height: 1008 })
  await clearFilters()
  await page.getByLabel('Buscar por nome').fill('zzzinexistente')
  await applyFilters()
  await page.getByText('Nenhum jogador encontrado para “zzzinexistente”').waitFor()
  await capture('E02-empty')
  await page.locator('.players-list').getByRole('button', { name: 'Limpar filtros' }).click()
  await page.getByRole('table', { name: 'Jogadores' }).waitFor()
  checks.push('E02: busca sem resultado e limpeza coerente de filtros')

  await page.route('**/api/v1/players?**', async route => {
    await new Promise(resolve => setTimeout(resolve, 800))
    await route.continue()
  })
  await page.getByRole('button', { name: 'Atualizar dados' }).click()
  await page.getByText('Carregando jogadores…').waitFor()
  await capture('E01-loading')
  await listReady()
  await page.unroute('**/api/v1/players?**')
  checks.push('E01: carregamento visível com consulta atrasada')
  assert.deepEqual(consoleErrors, [], 'Erros inesperados no console dos fluxos válidos')

  await page.route('**/api/v1/players?**', route => route.fulfill({ status: 503, json: { message: 'Consulta temporariamente indisponível.' } }))
  await page.getByRole('button', { name: 'Atualizar dados' }).click()
  await page.locator('.players-list').getByText('Consulta temporariamente indisponível.').waitFor()
  await capture('E03-error')
  await page.unroute('**/api/v1/players?**')
  await page.locator('.players-list').getByRole('button', { name: 'Tentar novamente' }).click()
  await page.getByRole('table', { name: 'Jogadores' }).waitFor()
  checks.push('E03: message de falha e recuperação sem recarregar a página')

  await writeFile(new URL('results.json', output), JSON.stringify({ date: new Date().toISOString(), browser: browser.version(), api: apiOrigin, checks }, null, 2))
  console.log(checks.join('\n'))
} catch (error) {
  await writeFile(new URL('last-failure.json', output), JSON.stringify({ date: new Date().toISOString(), message: String(error), checks, requests: requests.slice(-20) }, null, 2))
  throw error
} finally {
  await browser?.close()
  await server.close()
}
