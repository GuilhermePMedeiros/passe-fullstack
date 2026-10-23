// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { PlayerForm } from './PlayerForm'
import type { Player } from '../types/player.types'

const player: Player = {
  id: 7, name: 'Davi Melo', position: 'MEI', age: 23, agility: 70,
  condition: 'APTO', base_value: 26, market_value: 26, overall: 68,
  pace: 66, shooting: 62, passing: 74, dribbling: 70, defending: 48,
  physical: 58, potential: 82, club_id: null,
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('falhas ao salvar jogador', () => {
  it('remove o erro de validação quando o campo é corrigido, sem enviar antes de salvar', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    render(<PlayerForm player={player} onSaved={vi.fn()} onCancel={vi.fn()} onBusy={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Agilidade'), { target: { value: '101' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))
    expect(await screen.findByText('Use uma agilidade de 1 a 100.')).toBeTruthy()

    fireEvent.change(screen.getByLabelText('Agilidade'), { target: { value: '71' } })
    expect(screen.queryByText('Use uma agilidade de 1 a 100.')).toBeNull()
    expect(screen.getByLabelText('Agilidade').getAttribute('aria-invalid')).toBe('false')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('preserva message de conflito e o formulário, sem anunciar sucesso', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ message: 'Jogador vinculado a um clube durante a edição.' }, { status: 409 })))
    const onSaved = vi.fn()
    render(<PlayerForm player={player} onSaved={onSaved} onCancel={vi.fn()} onBusy={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Davi Almeida' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(await screen.findByText('Jogador vinculado a um clube durante a edição.')).toBeTruthy()
    expect((screen.getByLabelText('Nome') as HTMLInputElement).value).toBe('Davi Almeida')
    expect(onSaved).not.toHaveBeenCalled()
    expect((screen.getByRole('button', { name: 'Salvar alterações' }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('permite nova tentativa após falha de rede sem perder os dados', async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce(Response.json(player))
    vi.stubGlobal('fetch', fetchMock)
    const onSaved = vi.fn()
    render(<PlayerForm player={player} onSaved={onSaved} onCancel={vi.fn()} onBusy={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))
    expect((await screen.findByRole('alert')).textContent).toContain('Verifique a conexão')
    expect(onSaved).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))
    await vi.waitFor(() => expect(onSaved).toHaveBeenCalledWith(player))
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
