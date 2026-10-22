// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ClubCreateDialog } from './ClubCreateDialog'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('criação de clube', () => {
  it('valida campos antes de enviar e mostra erros junto aos campos', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    render(<ClubCreateDialog onClose={vi.fn()} onCreated={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Criar clube' }))
    expect(screen.getByText('Use de 3 a 60 caracteres.')).toBeTruthy()
    expect(screen.getByText('Informe 3 letras maiúsculas de A a Z.')).toBeTruthy()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('envia duplicidade à API, mantém o formulário e preserva message', async () => {
    const fetchMock = vi.fn(async () => Response.json({ message: 'Nome de clube já cadastrado.' }, { status: 409 }))
    vi.stubGlobal('fetch', fetchMock)
    render(<ClubCreateDialog onClose={vi.fn()} onCreated={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Águias FC' } })
    fireEvent.change(screen.getByLabelText('Sigla'), { target: { value: 'AGU' } })
    fireEvent.click(screen.getByRole('button', { name: 'Criar clube' }))
    expect(await screen.findByText('Nome de clube já cadastrado.')).toBeTruthy()
    expect((screen.getByLabelText('Nome') as HTMLInputElement).value).toBe('Águias FC')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('trava sincronamente o clique duplo e utiliza o caixa recebido', async () => {
    let finish!: (value: Response) => void
    const fetchMock = vi.fn(() => new Promise<Response>(resolve => { finish = resolve }))
    const onCreated = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    render(<ClubCreateDialog onClose={vi.fn()} onCreated={onCreated} />)
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Leões da Serra' } })
    fireEvent.change(screen.getByLabelText('Sigla'), { target: { value: 'LDS' } })
    const submit = screen.getByRole('button', { name: 'Criar clube' })
    fireEvent.click(submit)
    fireEvent.click(submit)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    finish(Response.json({ id: 1, name: 'Leões da Serra', acronym: 'LDS', cash: 287.13, squad_value: 0, net_worth: 287.13 }))
    await vi.waitFor(() => expect(onCreated).toHaveBeenCalledWith(expect.objectContaining({ cash: 287.13 })))
  })
})
