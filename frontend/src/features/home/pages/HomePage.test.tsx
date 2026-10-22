// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { AppRoutes } from '@/app/router'
import { ApiError } from '@/lib/errors'
import { getLeagueSummary } from '../services/leagueService'
import type { LeagueSummary } from '../types/league.types'

vi.mock('../services/leagueService', () => ({ getLeagueSummary: vi.fn() }))
const summary: LeagueSummary = { totalPlayers: 23, freePlayers: 7, totalClubs: 6, totalMatches: 2, leader: { name: 'Delta FC', points: 6 } }

beforeEach(() => { vi.mocked(getLeagueSummary).mockReset() })
afterEach(cleanup)

function renderHome() { return render(<MemoryRouter><AppRoutes /></MemoryRouter>) }

describe('tela inicial Passe', () => {
 
  it('mostra W01 com liderança e estatísticas reais recebidas pelo serviço', async () => {
    vi.mocked(getLeagueSummary).mockResolvedValue(summary)
    renderHome()
    expect(await screen.findByText('líder: Delta FC, 6 pontos')).toBeTruthy()
    expect(screen.getByText('23')).toBeTruthy()
    expect(screen.getByText('7')).toBeTruthy()
    expect(screen.getByText('Não precisa de login')).toBeTruthy()
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Gestão da liga, do mercado à classificação')
  })

  it('mostra W02 sem inventar líder com uma liga vazia', async () => {
    vi.mocked(getLeagueSummary).mockResolvedValue({ totalPlayers: 0, freePlayers: 0, totalClubs: 0, totalMatches: 0, leader: null })
    renderHome()
    expect(await screen.findByText('nenhuma partida ainda')).toBeTruthy()
    expect(screen.getAllByText('0')).toHaveLength(4)
    expect(screen.queryByText(/líder:/)).toBeNull()
  })

  it('informa carregamento sem mostrar zeros como dados reais', () => {
    vi.mocked(getLeagueSummary).mockReturnValue(new Promise(() => {}))
    renderHome()
    expect(screen.getByText('Carregando estatísticas da liga…')).toBeTruthy()
    expect(screen.getAllByText('—')).toHaveLength(4)
  })

  it('preserva message da API e permite tentar novamente', async () => {
    vi.mocked(getLeagueSummary).mockRejectedValueOnce(new ApiError(503, 'Liga temporariamente indisponível.')).mockResolvedValueOnce(summary)
    renderHome()
    expect((await screen.findByRole('alert')).textContent).toContain('Liga temporariamente indisponível.')
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(await screen.findByText('líder: Delta FC, 6 pontos')).toBeTruthy()
    expect(getLeagueSummary).toHaveBeenCalledTimes(2)
  })

  it('exibe falha de rede sem apresentar o estado sem partidas', async () => {
    vi.mocked(getLeagueSummary).mockRejectedValue(new TypeError('Failed to fetch'))
    renderHome()
    expect((await screen.findByRole('alert')).textContent).toContain('Verifique a conexão')
    expect(screen.queryByText('nenhuma partida ainda')).toBeNull()
  })

  it('navega por Iniciar e transfere foco ao título do destino', async () => {
    vi.mocked(getLeagueSummary).mockResolvedValue(summary)
    renderHome()
    fireEvent.click(screen.getByRole('link', { name: 'Iniciar' }))
    const heading = await screen.findByRole('heading', { name: 'Jogadores', level: 1 })
    expect(document.activeElement).toBe(heading)
    expect(screen.getByRole('link', { name: 'Voltar ao início' })).toBeTruthy()
  })

  it('tem seis cards com destinos próprios e filtros coerentes', async () => {
    vi.mocked(getLeagueSummary).mockResolvedValue(summary)
    renderHome()
    const links = within(screen.getByRole('navigation', { name: 'Etapas da gestão da liga' })).getAllByRole('link')
    expect(links.map(link => link.getAttribute('href'))).toEqual(['/players', '/clubs', '/players?free=true', '/clubs?action=sell', '/clubs?tab=history', '/clubs?tab=lineup'])
    await screen.findByText('líder: Delta FC, 6 pontos')
  })

  it('Enter fora dos controles leva à primeira etapa', async () => {
    vi.mocked(getLeagueSummary).mockResolvedValue(summary)
    renderHome()
    fireEvent.keyDown(window, { key: 'Enter' })
    expect(await screen.findByRole('heading', { name: 'Jogadores', level: 1 })).toBeTruthy()
  })

  it('não captura Enter quando o foco está em um card', async () => {
    vi.mocked(getLeagueSummary).mockResolvedValue(summary)
    renderHome()
    const link = screen.getByRole('link', { name: /02 Clubes/ })
    fireEvent.keyDown(link, { key: 'Enter' })
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Gestão da liga, do mercado à classificação')
    await screen.findByText('líder: Delta FC, 6 pontos')
  })

  it('cancela consultas ao sair da tela', () => {
    vi.mocked(getLeagueSummary).mockReturnValue(new Promise(() => {}))
    const view = renderHome()
    const signal = vi.mocked(getLeagueSummary).mock.calls[0][0]
    view.unmount()
    expect(signal?.aborted).toBe(true)
  })

})
