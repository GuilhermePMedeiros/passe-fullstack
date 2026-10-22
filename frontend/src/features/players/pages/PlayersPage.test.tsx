// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { WorkspaceContext } from '@/components/layout/WorkspaceContext'
import { TooltipProvider } from '@/components/ui/tooltip'
import { PlayersPage } from './PlayersPage'
import type { Player } from '../types/player.types'

const player: Player = {
  id: 1, name: 'João Silva', position: 'MEI', age: 23, agility: 70,
  condition: 'APTO', base_value: 26, market_value: 26, overall: 68,
  pace: 66, shooting: 62, passing: 74, dribbling: 70, defending: 48,
  physical: 58, potential: 82, club_id: null,
}

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchMock = vi.fn(async (url: string) => {
    const path = new URL(url, 'http://localhost')

    if (path.pathname === '/api/v1/players/1') return Response.json(player)

    return Response.json({ data: [player], meta: { page: Number(path.searchParams.get('page') ?? 1), limit: 10, total_items: 11, total_pages: 2 } })
  })
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function renderPlayers(entry = '/players') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <WorkspaceContext.Provider value={{ data: { clubs: [], totalPlayers: 11, matches: [] }, error: '', refresh: vi.fn() }}>
        <TooltipProvider><PlayersPage /></TooltipProvider>
      </WorkspaceContext.Provider>
    </MemoryRouter>,
  )
}

async function chooseFilter(label: string, option: string) {
  fireEvent.keyDown(screen.getByRole('combobox', { name: label }), { key: 'ArrowDown' })
  fireEvent.click(await screen.findByRole('option', { name: option }))
}

describe('página de jogadores', () => {
  it('mostra colunas obrigatórias e solicita dez itens por página', async () => {
    renderPlayers()
    await screen.findByText('João Silva')
    expect(screen.getByRole('columnheader', { name: 'Overall' })).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: 'Valor de mercado' })).toBeTruthy()
    expect(fetchMock.mock.calls.some(call => String(call[0]).includes('limit=10'))).toBe(true)
    fireEvent.click(screen.getByRole('link', { name: 'Próxima' }))
    await screen.findByText('Página 2 de 2')
    expect(fetchMock.mock.calls.some(call => String(call[0]).includes('page=2'))).toBe(true)
  })

  it('encaminha busca sem transformar os nomes e combina filtros na API', async () => {
    renderPlayers()
    await screen.findByText('João Silva')
    fireEvent.change(screen.getByLabelText('Buscar por nome'), { target: { value: 'JOAO' } })
    await chooseFilter('Posição', 'MEI · Meio-campo')
    await chooseFilter('Condição', 'Apto')
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }))
    await screen.findByText('João Silva')
    await vi.waitFor(() => expect(fetchMock.mock.calls.some(call => /search=JOAO/.test(String(call[0])) && /position=MEI/.test(String(call[0])) && /condition=APTO/.test(String(call[0])))).toBe(true))
  })

  it('impede clube com só livres e envia ordenação para o backend', async () => {
    renderPlayers()
    await screen.findByText('João Silva')
    fireEvent.keyDown(screen.getByRole('tab', { name: /^Livres/ }), { key: 'Enter' })
    expect((screen.getByRole('combobox', { name: 'Clube' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.keyDown(await screen.findByRole('button', { name: 'Ordenar por' }), { key: 'Enter' })
    fireEvent.click(await screen.findByRole('menuitemradio', { name: 'Maior valor de mercado' }))
    await screen.findByText('João Silva')
    expect(fetchMock.mock.calls.some(call => String(call[0]).includes('sort=value_desc'))).toBe(true)
  })

  it('apresenta campos inválidos sem enviar POST', async () => {
    renderPlayers()
    fireEvent.click(screen.getByRole('button', { name: 'Novo jogador' }))
    fireEvent.click(screen.getByRole('button', { name: 'Salvar jogador' }))
    expect(await screen.findByText('Use de 3 a 100 caracteres.')).toBeTruthy()
    expect(screen.getByText('Escolha uma posição.')).toBeTruthy()
    expect(fetchMock.mock.calls.some(call => (call[1] as RequestInit | undefined)?.method === 'POST')).toBe(false)
  })

  it('volta à última página válida quando uma exclusão esvazia a página atual', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      const path = new URL(url, 'http://localhost')
      const page = Number(path.searchParams.get('page') ?? 1)
      return Response.json({
        data: page === 2 ? [] : [player],
        meta: { page, limit: 10, total_items: 10, total_pages: 1 },
      })
    })

    renderPlayers('/players?page=2')
    expect(await screen.findByText('João Silva')).toBeTruthy()
    expect(screen.getByText('Página 1 de 1')).toBeTruthy()
  })

  it('mostra ausência de resultados e permite limpar filtros', async () => {
    fetchMock.mockImplementation(async () => Response.json({ data: [], meta: { page: 1, limit: 10, total_items: 0, total_pages: 0 } }))
    renderPlayers()
    expect(await screen.findByText('Nenhum jogador encontrado')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Limpar filtros' })).toBeTruthy()
  })

  it('mostra loading sem zeros fictícios', () => {
    fetchMock.mockReturnValue(new Promise(() => {}))
    renderPlayers()
    expect(screen.getByText('Carregando jogadores…')).toBeTruthy()
    expect(screen.getByRole('table', { name: 'Jogadores' })).toBeTruthy()
    expect(document.querySelectorAll('tbody tr[aria-hidden="true"]').length).toBe(10)
  })

  it('preserva message da API e tenta carregar novamente', async () => {
    fetchMock.mockImplementation(async () => Response.json({ message: 'Falha temporária da consulta.' }, { status: 503 }))
    renderPlayers()
    expect(await screen.findByText('Falha temporária da consulta.')).toBeTruthy()
    fetchMock.mockImplementation(async () => Response.json({ data: [player], meta: { page: 1, limit: 10, total_items: 1, total_pages: 1 } }))
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(await screen.findByText('João Silva')).toBeTruthy()
  })

  it('fecha cadastro por Escape e devolve o foco ao acionador', async () => {
    renderPlayers()
    const trigger = screen.getByRole('button', { name: 'Novo jogador' })
    fireEvent.click(trigger)
    const dialog = screen.getByRole('dialog')
    fireEvent.keyDown(within(dialog).getByLabelText('Nome'), { key: 'Escape' })
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await vi.waitFor(() => expect(document.activeElement).toBe(trigger))
  })
})
