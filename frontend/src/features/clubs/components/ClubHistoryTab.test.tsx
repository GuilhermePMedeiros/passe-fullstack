// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { ApiError } from '@/lib/errors'
import * as service from '../services/clubService'
import type { TransactionHistory } from '../types/club.types'
import { ClubHistoryTab } from './ClubHistoryTab'

const sale = {
  id: 4, club_id: 1, player_id: 2, player_name: 'Nome Histórico', type: 'VENDA' as const,
  value: 42.5, fee: 0, penalty: 8.5, profit: -7.5, cash_change: 34,
  created_at: '2026-10-22T15:00:00-03:00',
}
const history: TransactionHistory = {
  data: [sale],
  summary: { total_spent: 0, total_received: 34, total_fees: 0, total_penalties: 8.5, total_profit: -7.5 },
}

beforeEach(() => {
  vi.spyOn(service, 'getHistory').mockResolvedValue(history)
  vi.spyOn(service, 'downloadHistory').mockResolvedValue(undefined)
})
afterEach(() => { cleanup(); vi.restoreAllMocks() })

function prepare(query = '') {
  return render(<MemoryRouter initialEntries={[`/clubs/1?tab=history${query}`]}><ClubHistoryTab clubId="1" revision={0} /></MemoryRouter>)
}

describe('histórico de transações', () => {
  it('usa os filtros da URL na consulta e no CSV, preservando valores e sinais', async () => {
    prepare('&type=VENDA&player_id=2')
    await screen.findByText('Total pago em compras')
    expect(service.getHistory).toHaveBeenCalledWith('1', { type: 'VENDA', player_id: '2' }, expect.any(AbortSignal))
    expect(screen.getByText('+34,00')).toBeTruthy()
    expect(screen.getAllByText('-7,50')).toHaveLength(2)
    expect(screen.getByText('22/10/2026, 15:00')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Exportar CSV' }))
    await vi.waitFor(() => expect(service.downloadHistory).toHaveBeenCalledWith('1', { type: 'VENDA', player_id: '2' }))
  })

  it('mantém filtros e nome histórico após 404, oculta totais e permite limpar', async () => {
    vi.mocked(service.getHistory).mockImplementation(async (_id, filters) => {
      if (filters.player_id) throw new ApiError(404, 'Jogador não encontrado.')
      return history
    })
    prepare('&type=VENDA&player_id=2')
    await screen.findByText('Jogador não encontrado.')
    expect(screen.getByRole('combobox', { name: 'Todos os jogadores' }).textContent).toContain('Nome Histórico')
    expect((screen.getByRole('checkbox', { name: 'Venda' }) as HTMLInputElement).checked).toBe(true)
    expect((screen.getByRole('checkbox', { name: 'Compra' }) as HTMLInputElement).checked).toBe(false)
    expect(screen.queryByText('Total recebido em vendas')).toBeNull()
    expect((screen.getByRole('button', { name: 'Exportar CSV' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros do histórico' }))
    expect(await screen.findByText('Total recebido em vendas')).toBeTruthy()
    expect((screen.getByRole('checkbox', { name: 'Venda' }) as HTMLInputElement).checked).toBe(true)
    expect((screen.getByRole('checkbox', { name: 'Compra' }) as HTMLInputElement).checked).toBe(true)
  })

  it('mostra vazio com os totais zero da API e permite exportar o cabeçalho', async () => {
    vi.mocked(service.getHistory).mockResolvedValue({ data: [], summary: { total_spent: 0, total_received: 0, total_fees: 0, total_penalties: 0, total_profit: 0 } })
    prepare()
    await screen.findByText('Nenhuma transação ainda')
    expect(screen.getAllByText('0,00')).toHaveLength(4)
    expect(screen.getByText('+0,00')).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Exportar CSV' }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('recupera falha de rede pelo retry sem fabricar totais', async () => {
    vi.mocked(service.getHistory).mockRejectedValueOnce(new TypeError('Falha de rede'))
    prepare('&type=VENDA')
    // O catálogo e a consulta são independentes; a primeira falha é do catálogo.
    await screen.findByRole('heading', { name: 'Não foi possível carregar os jogadores do filtro' })
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    await vi.waitFor(() => expect(screen.queryByRole('heading', { name: 'Não foi possível carregar os jogadores do filtro' })).toBeNull())
  })
})
