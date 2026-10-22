import { useRef, useState, type FormEvent } from 'react'
import { Shield, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Feedback } from '@/components/ui/Feedback'
import { FormField } from '@/components/ui/FormField'
import { Modal } from '@/components/ui/Modal'
import { useSubmission } from '@/hooks/useSubmission'
import type { ClubSummary } from '@/lib/api.types'
import { createClub } from '../services/clubService'

export function ClubCreateDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (club: ClubSummary) => void }) {
  const [name, setName] = useState('')
  const [acronym, setAcronym] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const submission = useSubmission()
  const normalizedName = name.replace(/^ +| +$/gu, '').replace(/ +/gu, ' ')
  const nameError = [...normalizedName].length < 3 || [...normalizedName].length > 60 ? 'Use de 3 a 60 caracteres.' : ''
  const acronymError = !/^[A-Z]{3}$/u.test(acronym) ? 'Informe 3 letras maiúsculas de A a Z.' : ''

  function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    if (nameError || acronymError) {
      window.requestAnimationFrame(() => formRef.current?.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus())
      return
    }
    void submission.run(async () => {
      const club = await createClub({ name, acronym })
      onCreated(club)
    })
  }

  return (
    <Modal title="Novo clube" description="Informe o nome e a sigla do clube." onClose={onClose} busy={submission.pending}>
      <form className="club-create-form" onSubmit={submit} ref={formRef} noValidate aria-busy={submission.pending}>
        <Feedback error message={submission.error} />
        <FormField label="Nome" icon={Shield} value={name} onChange={event => setName(event.target.value)} disabled={submission.pending} error={submitted ? nameError : ''} hint="De 3 a 60 caracteres e de 2 a 5 palavras; só letras, espaços, hífen e ponto. Não pode repetir outro clube." autoFocus />
        <FormField label="Sigla" value={acronym} onChange={event => setAcronym(event.target.value)} disabled={submission.pending} error={submitted ? acronymError : ''} hint="3 letras de A a Z, maiúsculas, que aparecem no nome nessa ordem; a primeira é a primeira letra do nome. As três não podem ser iguais." />
        <p className="club-info"><Wallet aria-hidden="true" /> O caixa inicial e os valores do clube serão informados pela API após a criação.</p>
        <div className="modal-actions">
          <Button variant="outline" type="button" onClick={onClose} disabled={submission.pending}>Cancelar</Button>
          <Button type="submit" disabled={submission.pending}>{submission.pending ? 'Criando…' : 'Criar clube'}</Button>
        </div>
      </form>
    </Modal>
  )
}
