import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiDownload, apiRequest } from './api'
import { ApiError, getErrorMessage } from './errors'

afterEach(() => vi.unstubAllGlobals())

describe('cliente da API', () => {
  it('preserva filtros, false e zero, omitindo apenas valores ausentes', async () => {
    
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ data: [], meta: { total_items: 0 } }))
    
    vi.stubGlobal('fetch', fetchMock)
    
    const result = await apiRequest('/players', {
      query: { search: 'João Lima', free: false, min_value: 0, position: undefined, club_id: null },
    })
    
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/players?search=Jo%C3%A3o+Lima&free=false&min_value=0')
    expect(result).toEqual({ data: [], meta: { total_items: 0 } })
  })

  it.each([400, 404, 409, 500])('preserva status %s e message do backend', async (status) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ message: 'Recusa da API.' }, { status })))
    
    await expect(apiRequest('/players')).rejects.toMatchObject({ status, message: 'Recusa da API.' })
  })

  it('aceita DELETE 204 sem tentar interpretar JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })))
    
    await expect(apiRequest<void>('/players/1', { method: 'DELETE' })).resolves.toBeUndefined()
  })

  it('envia JSON e a data com offset sem alterar o contrato nem repetir a compra', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ club_cash: 261.15 }))
    
    vi.stubGlobal('fetch', fetchMock)
    
    const body = { club_id: 1, loyalty_until: '2027-03-02T10:15-03:00' }
    await apiRequest('/players/2/buy', { method: 'POST', json: body })
    
    expect(fetchMock).toHaveBeenCalledOnce()
    
    const options = fetchMock.mock.calls[0][1] as RequestInit
    
    expect(options.method).toBe('POST')
    expect(options.body).toBe(JSON.stringify(body))
    expect(new Headers(options.headers).get('Content-Type')).toBe('application/json')
  })

  it('preserva conteúdo e filtros na exportação CSV', async () => {
    const csv = 'data_hora;tipo;jogador\n2026-10-21T12:00:00-03:00;VENDA;João Lima\n'
    const fetchMock = vi.fn().mockResolvedValue(new Response(csv, { headers: { 'Content-Type': 'text/csv' } }))
    
    vi.stubGlobal('fetch', fetchMock)
    
    const blob = await apiDownload('/clubs/1/transactions/export', { query: { type: 'VENDA', player_id: 2 } })
    
    expect(await blob.text()).toBe(csv)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/clubs/1/transactions/export?type=VENDA&player_id=2')
  })

  it('trata erro JSON da exportação antes de oferecer o arquivo', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ message: 'Jogador inexistente.' }, { status: 404 })))
    
    await expect(apiDownload('/clubs/1/transactions/export')).rejects.toBeInstanceOf(ApiError)
  })

  it('usa mensagem segura quando o servidor responde erro em HTML', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>falha</html>', { status: 502 })))
   
    await expect(apiRequest('/players')).rejects.toMatchObject({ status: 502, message: expect.not.stringContaining('<html>') })
  })

  it('repassa cancelamento e não converte AbortError em erro de negócio', async () => {
    const controller = new AbortController()
    
    controller.abort()
    
    const fetchMock = vi.fn().mockRejectedValue(new DOMException('Cancelado', 'AbortError'))
    
    vi.stubGlobal('fetch', fetchMock)
   
    await expect(apiRequest('/players', { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' })
    
    expect(fetchMock.mock.calls[0][1].signal).toBe(controller.signal)
  })

  it('exibe message da API e uma alternativa segura para falha de rede', () => {
    expect(getErrorMessage(new ApiError(409, 'Elenco cheio.'))).toBe('Elenco cheio.')
    
    expect(getErrorMessage(new TypeError('Failed to fetch'))).toContain('Verifique a conexão')
  })
})
