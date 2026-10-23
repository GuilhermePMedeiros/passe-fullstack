import { afterEach, describe, expect, it, vi } from 'vitest'
import { getLeagueSummary } from './leagueService'

afterEach(() => vi.unstubAllGlobals())

function mockLeague(matchCount: number, standings = [{ club_name: 'Delta FC', points: 6 }]) {
  const fetchMock = vi.fn(async (url: string) => {
    const path = new URL(url, 'http://localhost')
    if (path.pathname.endsWith('/players')) return Response.json({ data: [{ id: 1 }], meta: { total_items: path.searchParams.has('free') ? 7 : 23 } })
    if (path.pathname.endsWith('/clubs')) return Response.json([{ id: 1 }, { id: 2 }])
    if (path.pathname.endsWith('/matches')) return Response.json(Array.from({ length: matchCount }, (_, id) => ({ id })))
    return Response.json(standings)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('resumo da liga', () => {
  it('usa meta para jogadores e preserva o primeiro clube da classificação da API', async () => {
    const fetchMock = mockLeague(2, [{ club_name: 'Zeta FC', points: 6 }, { club_name: 'Alfa FC', points: 9 }])
    await expect(getLeagueSummary()).resolves.toEqual({ totalPlayers: 23, freePlayers: 7, totalClubs: 2, totalMatches: 2, leader: { name: 'Zeta FC', points: 6 } })
    expect(fetchMock).toHaveBeenCalledTimes(5)
  })

  it('não inventa liderança antes de existir partida, mesmo com clubes zerados na classificação', async () => {
    mockLeague(0)
    expect((await getLeagueSummary()).leader).toBeNull()
  })

  it('aceita liga inteiramente vazia', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => Response.json(url.includes('/players') ? { data: [], meta: { total_items: 0 } } : [])))
    await expect(getLeagueSummary()).resolves.toEqual({ totalPlayers: 0, freePlayers: 0, totalClubs: 0, totalMatches: 0, leader: null })
  })

  it('não converte falha de rede em uma liga sem partidas', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await expect(getLeagueSummary()).rejects.toThrow('Failed to fetch')
  })

  it('repassa o mesmo sinal de cancelamento para as cinco consultas', async () => {
    const fetchMock = mockLeague(1)
    const controller = new AbortController()
    await getLeagueSummary(controller.signal)
    for (const call of fetchMock.mock.calls) expect((call as unknown as [string, RequestInit])[1].signal).toBe(controller.signal)
  })
})
