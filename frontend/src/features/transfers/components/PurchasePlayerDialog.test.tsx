// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { PurchasePlayerDialog } from './PurchasePlayerDialog'

const purchase = {
  id: 42, club_id: 1, player_id: 2, player_name: 'Eduardo Paiva', type: 'COMPRA',
  value: 37.13, fee: 1.86, penalty: 0, profit: null, cash_change: -38.99,
  created_at: '2026-10-22T15:00:00-03:00', club_cash: 173.47,
  contract: { purchase_value: 37.13, loyalty_until: '2027-03-02T15:00:00-03:00', status: 'ATIVO' },
}
let write: Mock<(url: string, options?: RequestInit) => Promise<Response>>

beforeEach(() => {
  write = vi.fn<(url: string, options?: RequestInit) => Promise<Response>>(async () => Response.json(purchase))
  vi.stubGlobal('fetch', vi.fn((url: string, options?: RequestInit) => {
    if (options?.method === 'POST') return write(url, options)
    if (url.includes('/clubs')) return Promise.resolve(Response.json([{ id: 1, name: 'Clube Teste Azul', acronym: 'CTA', cash: 212.46, squad_value: 0, net_worth: 212.46 }]))
    return Promise.resolve(Response.json({ id: 2, name: 'Eduardo Paiva', position: 'MEI', age: 26, market_value: 46, club_id: null }))
  }))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

async function prepare() {
  const onPurchased = vi.fn()
  render(<MemoryRouter><PurchasePlayerDialog playerId="2" onClose={vi.fn()} onPurchased={onPurchased} /></MemoryRouter>)
  fireEvent.keyDown(await screen.findByRole('combobox', { name: 'Clube comprador' }), { key: 'ArrowDown' })
  fireEvent.click(await screen.findByRole('option', { name: /Clube Teste Azul/ }))
  fireEvent.change(screen.getByLabelText('Data'), { target: { value: '2027-03-02' } })
  fireEvent.change(screen.getByLabelText('Hora'), { target: { value: '15:00' } })
  return onPurchased
}

describe('compra integrada', () => {
  it('valida obrigatórios sem POST e sem estimativas financeiras', async () => {
    render(<MemoryRouter><PurchasePlayerDialog playerId="2" onClose={vi.fn()} onPurchased={vi.fn()} /></MemoryRouter>)
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar compra' }))
    expect(screen.getByText('Escolha o clube comprador.')).toBeTruthy()
    expect(screen.getByText('Informe a data do fim da fidelidade.')).toBeTruthy()
    expect(screen.getByText('Informe a hora do fim da fidelidade.')).toBeTruthy()
    expect(write).not.toHaveBeenCalled()
    expect(screen.queryByText('Custo total', { exact: true })).toBeNull()
  })

  it('envia Brasília, bloqueia clique duplo e mostra somente valores do resultado', async () => {
    let finish!: (response: Response) => void
    write.mockImplementation(() => new Promise(resolve => { finish = resolve }))
    const onPurchased = await prepare()
    const button = screen.getByRole('button', { name: 'Confirmar compra' })
    fireEvent.click(button)
    fireEvent.click(button)
    expect(write).toHaveBeenCalledTimes(1)
    expect(JSON.parse(String(write.mock.calls[0][1]?.body))).toEqual({ club_id: 1, loyalty_until: '2027-03-02T15:00-03:00' })
    expect((screen.getByLabelText('Data') as HTMLInputElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Cancelar' }) as HTMLButtonElement).disabled).toBe(true)
    finish(Response.json(purchase))
    await screen.findByRole('heading', { name: 'Compra concluída' })
    expect(screen.getByText('37,13', { exact: true })).toBeTruthy()
    expect(screen.getByText('1,86', { exact: true })).toBeTruthy()
    expect(screen.getByText('38,99', { exact: true })).toBeTruthy()
    expect(screen.getByText('173,47', { exact: true })).toBeTruthy()
    expect(screen.getByText('ATIVO', { exact: true })).toBeTruthy()
    expect(onPurchased).toHaveBeenCalledWith(purchase)
    expect(screen.getByRole('link', { name: /Ver clube/ }).getAttribute('href')).toBe('/clubs/1')
  })

  it('preserva clube e fidelidade na falha de rede e só confirma depois da resposta', async () => {
    const onPurchased = await prepare()
    write.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar compra' }))
    await screen.findByText(/A compra não foi confirmada/)
    expect((screen.getByLabelText('Data') as HTMLInputElement).value).toBe('2027-03-02')
    expect((screen.getByLabelText('Hora') as HTMLInputElement).value).toBe('15:00')
    expect(onPurchased).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    await screen.findByRole('heading', { name: 'Compra concluída' })
    expect(write).toHaveBeenCalledTimes(2)
  })

  it.each([
    [409, 'Custo ultrapassa 50% do caixa.'],
    [409, 'Elenco já possui 12 jogadores.'],
    [409, 'Clube não pode recomprar jogador que já vendeu.'],
    [404, 'Clube não encontrado.'],
  ])('mostra message de HTTP %s e mantém o formulário: %s', async (status, message) => {
    write.mockImplementation(async () => Response.json({ message }, { status }))
    const onPurchased = await prepare()
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar compra' }))
    expect(await screen.findByText(`Compra recusada. ${message}`)).toBeTruthy()
    expect(onPurchased).not.toHaveBeenCalled()
    expect((screen.getByLabelText('Hora') as HTMLInputElement).value).toBe('15:00')
  })
})
