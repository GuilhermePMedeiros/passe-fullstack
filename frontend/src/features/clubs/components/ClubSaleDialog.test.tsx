// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import type { SaleResult, SquadPlayer } from '../types/club.types'
import { ClubSaleDialog } from './ClubSaleDialog'

const player: SquadPlayer = {
  id: 2, name: 'Felipe Moura', position: 'ZAG', condition: 'APTO', age: 27,
  agility: 70, base_value: 52, market_value: 52, overall: 77, potential: 80,
  pace: 60, shooting: 60, passing: 60, dribbling: 60, defending: 80, physical: 70,
  club_id: 1, contract: { purchase_value: 44.2, loyalty_until: '2027-04-04T15:45:00-03:00', remaining_days: 144, penalty_rate: 10 },
}
const sale: SaleResult = {
  id: 43, club_id: 1, player_id: 2, player_name: player.name, type: 'VENDA',
  value: 52, fee: 0.78, penalty: 5.2, profit: 7.8, cash_change: 46.02,
  created_at: '2026-10-22T15:00:00-03:00', purchase_value: 44.2, remaining_days: 144,
  penalty_rate: 10, contract_status: 'RESCINDIDO', club_cash: 97.6,
}
let write: Mock<(url: string, options?: RequestInit) => Promise<Response>>

beforeEach(() => {
  write = vi.fn<(url: string, options?: RequestInit) => Promise<Response>>(async () => Response.json(sale))
  vi.stubGlobal('fetch', vi.fn((url: string, options?: RequestInit) => {
    if (options?.method === 'POST') return write(url, options)
    return Promise.resolve(Response.json({ club_id: 1, complete: true, formation: '2-1-1', players: [player] }))
  }))
})

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

async function prepare() {
  const onSold = vi.fn()
  render(<MemoryRouter><ClubSaleDialog player={player} onClose={vi.fn()} onSold={onSold} /></MemoryRouter>)
  await screen.findByText(/Felipe Moura é titular/)
  return onSold
}

describe('venda do clube', () => {
  it('consulta titular, mostra contrato e permite vender com envio único', async () => {
    let finish!: (response: Response) => void
    write.mockImplementation(() => new Promise(resolve => { finish = resolve }))
    const onSold = await prepare()
    expect(screen.getByText('44,20')).toBeTruthy()
    expect(screen.getByText('144')).toBeTruthy()
    const button = screen.getByRole('button', { name: 'Confirmar venda' })
    fireEvent.click(button)
    fireEvent.click(button)
    expect(write).toHaveBeenCalledTimes(1)
    expect(write.mock.calls[0][1]?.body).toBeUndefined()
    expect((screen.getByRole('button', { name: 'Cancelar' }) as HTMLButtonElement).disabled).toBe(true)
    finish(Response.json(sale))
    await screen.findByRole('heading', { name: 'Venda concluída' })
    expect(onSold).toHaveBeenCalledTimes(1)
    for (const value of ['5,20', '+7,80', '0,78', '+46,02', '97,60', 'RESCINDIDO']) expect(screen.getByText(value)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Ver histórico' }).getAttribute('href')).toBe('/clubs/1?tab=history')
  })

  it('apresenta multa zero e prejuízo exclusivamente da resposta', async () => {
    write.mockImplementation(async () => Response.json({ ...sale, remaining_days: 0, penalty_rate: 0, penalty: 0, fee: 0, profit: -4.8, cash_change: 24, contract_status: 'ENCERRADO' }))
    await prepare()
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar venda' }))
    await screen.findByRole('heading', { name: 'Venda concluída' })
    expect(screen.getByText('Fidelidade cumprida: sem multa')).toBeTruthy()
    expect(screen.getByText('-4,80')).toBeTruthy()
    expect(screen.getByText('ENCERRADO')).toBeTruthy()
  })

  it('preserva contexto e message na recusa e não anuncia sucesso', async () => {
    write.mockImplementation(async () => Response.json({ message: 'Jogador está livre.' }, { status: 409 }))
    const onSold = await prepare()
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar venda' }))
    expect(await screen.findByText('A venda foi recusada. Jogador está livre.')).toBeTruthy()
    expect(screen.getByText('44,20')).toBeTruthy()
    expect(onSold).not.toHaveBeenCalled()
  })
})
