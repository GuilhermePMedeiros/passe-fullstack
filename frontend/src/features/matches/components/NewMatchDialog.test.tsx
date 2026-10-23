// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { NewMatchDialog } from './NewMatchDialog'

let write: Mock<(url: string, options?: RequestInit) => Promise<Response>>
const clubs = [
  { id: 1, name: 'Águias FC', acronym: 'AGU' },
  { id: 2, name: 'Delta FC', acronym: 'DEL' },
]
const result = { id: 42, home: { club_id: 1, goals: 1 }, away: { club_id: 2, goals: 2 }, duels: [] }

beforeEach(() => {
  write = vi.fn(async () => Response.json(result))
  vi.stubGlobal('fetch', vi.fn((url: string, options?: RequestInit) => {
    if (options?.method === 'POST') return write(url, options)
    return Promise.resolve(Response.json(clubs))
  }))
})

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

async function choose(label: string, name: string) {
  fireEvent.keyDown(await screen.findByRole('combobox', { name: label }), { key: 'ArrowDown' })
  fireEvent.click(await screen.findByRole('option', { name }))
}

function prepare() {
  const onPlayed = vi.fn()
  render(<MemoryRouter><NewMatchDialog onClose={vi.fn()} onPlayed={onPlayed} /></MemoryRouter>)
  return onPlayed
}

describe('nova partida', () => {
  it('valida os dois obrigatórios sem enviar pedido', async () => {
    prepare()
    fireEvent.click(await screen.findByRole('button', { name: 'Jogar partida' }))
    expect(screen.getByText('Escolha o mandante.')).toBeTruthy()
    expect(screen.getByText('Escolha o visitante.')).toBeTruthy()
    expect(write).not.toHaveBeenCalled()
  })

  it('impede clubes iguais e mostra o motivo junto ao visitante', async () => {
    prepare()
    await choose('Mandante', 'Águias FC (AGU)')
    await choose('Visitante', 'Águias FC (AGU)')
    fireEvent.click(screen.getByRole('button', { name: 'Jogar partida' }))
    expect(screen.getByText('Escolha um clube diferente do mandante.')).toBeTruthy()
    expect(write).not.toHaveBeenCalled()
  })

  it('envia apenas ids, bloqueia cliques duplicados e aguarda a resposta', async () => {
    let finish!: (response: Response) => void
    write.mockImplementation(() => new Promise(resolve => { finish = resolve }))
    const onPlayed = prepare()
    await choose('Mandante', 'Águias FC (AGU)')
    await choose('Visitante', 'Delta FC (DEL)')
    const button = screen.getByRole('button', { name: 'Jogar partida' })
    fireEvent.click(button)
    fireEvent.click(button)
    expect(write).toHaveBeenCalledTimes(1)
    expect(write.mock.calls[0][0]).toBe('/api/v1/matches')
    expect(JSON.parse(String(write.mock.calls[0][1]?.body))).toEqual({ home_club_id: 1, away_club_id: 2 })
    expect((screen.getByRole('combobox', { name: 'Mandante' }) as HTMLButtonElement).disabled).toBe(true)
    expect(onPlayed).not.toHaveBeenCalled()
    finish(Response.json(result))
    await vi.waitFor(() => expect(onPlayed).toHaveBeenCalledWith(result))
  })

  it.each([
    [400, 'Ids inválidos.'],
    [404, 'Clube não encontrado.'],
    [409, 'Escalação incompleta: Delta FC não tem os 5 titulares.'],
  ])('mostra HTTP %s e preserva as seleções: %s', async (status, message) => {
    write.mockImplementation(async () => Response.json({ message }, { status }))
    const onPlayed = prepare()
    await choose('Mandante', 'Águias FC (AGU)')
    await choose('Visitante', 'Delta FC (DEL)')
    fireEvent.click(screen.getByRole('button', { name: 'Jogar partida' }))
    expect(await screen.findByRole('heading', { name: 'Não foi possível jogar a partida' })).toBeTruthy()
    expect(screen.getByText(message)).toBeTruthy()
    expect(screen.getByRole('combobox', { name: 'Mandante' }).textContent).toContain('Águias FC')
    expect(screen.getByRole('combobox', { name: 'Visitante' }).textContent).toContain('Delta FC')
    expect(onPlayed).not.toHaveBeenCalled()
  })
})
