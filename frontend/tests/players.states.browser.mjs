import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { createServer } from 'vite'

const apiOrigin = process.env.PASSE_PLAYERS_API

if (apiOrigin !== 'http://localhost:18089') {
  throw new Error('Use PASSE_PLAYERS_API=http://localhost:18089, apontando para a API QA isolada.')
}

const output = new URL('../../docs/evidencias/players-shadcn/', import.meta.url)
await mkdir(output, { recursive: true })
const server = await createServer({
  server: { host: 'localhost', port: 15175, strictPort: true, proxy: { '/api': apiOrigin } },
  logLevel: 'error',
})
await server.listen()
let browser

try {
  browser = await chromium.launch({ channel: 'chrome', headless: true })
  const page = await browser.newPage({ viewport: { width: 1366, height: 1008 } })
  const writes = []
  page.on('request', request => {
    if (request.url().includes('/api/v1/') && request.method() !== 'GET') writes.push(request.method())
  })

  async function capture(name) {
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({ path: fileURLToPath(new URL(`${name}.png`, output)), fullPage: true, animations: 'disabled' })
  }

  await page.goto('http://localhost:15175/players')
  await page.locator('.players-list[aria-busy="false"] tbody tr:not([aria-hidden])').first().waitFor()
  await page.getByRole('button', { name: 'Novo jogador' }).click()
  const formDialog = page.getByRole('dialog')
  await formDialog.getByRole('button', { name: 'Salvar jogador' }).click()
  await formDialog.getByText('Use de 3 a 100 caracteres.').waitFor()
  await capture('J06-validation')

  const fields = { Nome: 'Davi Melo', Idade: '23', Agilidade: '70', Velocidade: '66', Finalização: '62', Passe: '74', Drible: '70', Defesa: '48', Físico: '58', Potencial: '82' }
  for (const [name, value] of Object.entries(fields)) {
    await formDialog.getByRole(name === 'Nome' ? 'textbox' : 'spinbutton', { name, exact: true }).fill(value)
  }
  await formDialog.getByRole('radio', { name: /MEI/ }).check()
  assert.equal(await formDialog.locator('.field-error').count(), 0)
  assert.equal(await formDialog.getByRole('progressbar').count(), 6)
  await capture('J05-create')
  await formDialog.getByRole('button', { name: 'Fechar diálogo' }).click()
  await formDialog.waitFor({ state: 'hidden' })

  await page.goto('http://localhost:15175/players?search=zzzinexistente')
  await page.getByRole('heading', { name: 'Nenhum jogador encontrado para “zzzinexistente”' }).waitFor()
  assert.equal(await page.getByRole('tablist').count(), 0)
  assert.equal(await page.getByRole('table').count(), 0)
  await capture('E02-empty')
  await page.locator('.players-list').getByRole('button', { name: 'Limpar filtros' }).click()
  await page.locator('.players-list[aria-busy="false"] tbody tr:not([aria-hidden])').first().waitFor()

  let releaseRequests
  const gate = new Promise(resolve => { releaseRequests = resolve })
  await page.route('**/api/v1/players?**', async route => {
    await gate
    await route.continue()
  })
  await page.getByRole('button', { name: 'Atualizar dados' }).click()
  await page.getByText('Carregando jogadores…').waitFor()
  assert.equal(await page.locator('tbody tr[aria-hidden="true"]').count(), 10)
  assert.equal(await page.getByRole('button', { name: 'Ordenar por' }).count(), 0)
  await capture('E01-loading')
  releaseRequests()
  await page.locator('.players-list[aria-busy="false"] tbody tr:not([aria-hidden])').first().waitFor()
  await page.unroute('**/api/v1/players?**')

  await page.route('**/api/v1/players?**', route => route.fulfill({ status: 503, json: { message: 'Consulta temporariamente indisponível.' } }))
  await page.getByRole('button', { name: 'Atualizar dados' }).click()
  await page.locator('.players-list').getByText('Consulta temporariamente indisponível.').waitFor()
  assert.equal(await page.getByRole('tablist').count(), 0)
  assert.equal(await page.getByRole('table').count(), 0)
  await capture('E03-error')
  await page.unroute('**/api/v1/players?**')
  await page.locator('.players-list').getByRole('button', { name: 'Tentar novamente' }).click()
  await page.locator('.players-list[aria-busy="false"] tbody tr:not([aria-hidden])').first().waitFor()
  assert.deepEqual(writes, [])

  const checks = ['J05/J06: erro removido ao corrigir os campos e prévia válida, sem POST', 'E01: dez linhas Skeleton, status e ordenação em placeholder', 'E02: painel vazio sem abas/tabela, limpeza recupera a lista', 'E03: message sem abas/tabela, nova tentativa recupera a lista', 'Nenhuma requisição de escrita']
  await writeFile(new URL('states-results.json', output), JSON.stringify({ date: new Date().toISOString(), checks }, null, 2))
  console.log(checks.join('\n'))
} finally {
  await browser?.close()
  await server.close()
}
