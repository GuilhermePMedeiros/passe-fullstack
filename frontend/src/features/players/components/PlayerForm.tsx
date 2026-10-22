import { useState, type FormEvent } from 'react'
import { Info, LockKeyhole, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { Feedback } from '@/components/ui/Feedback'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import { useSubmission } from '@/hooks/useSubmission'
import { formatMoney } from '@/lib/formatters'
import { createPlayer, updatePlayer } from '../services/playerService'
import { ATTRIBUTES, POSITIONS, type Player } from '../types/player.types'
import { getInitialValues, toCreateRequest, toEditRequest, validatePlayerForm } from '../utils/playerForm'
import type { PlayerFormErrors, PlayerFormValues } from '../utils/playerForm'
import { PlayerAttributesPreview } from './PlayerAttributesPreview'

interface PlayerFormProps {
  player?: Player
  onSaved: (player: Player) => void
  onCancel: () => void
  onBusy: (busy: boolean) => void
}

export function PlayerForm({ player, onSaved, onCancel, onBusy }: PlayerFormProps) {
  const [values, setValues] = useState(() => getInitialValues(player))
  const [errors, setErrors] = useState<PlayerFormErrors>({})
  const submission = useSubmission()

  function updateValue(key: keyof PlayerFormValues, value: string) {
    const nextValues = { ...values, [key]: value }
    setValues(nextValues)

    if (Object.keys(errors).length > 0) {
      setErrors(validatePlayerForm(nextValues, player))
    }
  }

  function focusInvalidField(nextErrors: PlayerFormErrors) {
    const key = Object.keys(nextErrors)[0]
    const selector = key === 'position' ? '.position-options [role="radio"]' : `[name="${key}"]`
    document.querySelector<HTMLElement>(selector)?.focus()
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const nextErrors = validatePlayerForm(values, player)
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length) {
      focusInvalidField(nextErrors)
      return
    }

    void submission.run(async () => {
      onBusy(true)

      try {
        const saved = player
          ? await updatePlayer(player.id, toEditRequest(values))
          : await createPlayer(toCreateRequest(values))

        onSaved(saved)
      } finally {
        onBusy(false)
      }
    })
  }

  function numberField(key: keyof PlayerFormValues, label: string, min: number, max: number, hint?: string) {
    return (
      <FormField
        key={key}
        label={label}
        name={key}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={1}
        value={values[key]}
        onChange={event => updateValue(key, event.target.value)}
        error={errors[key]}
        hint={hint}
        required
      />
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="player-form">
      <Feedback error message={submission.error} />
      <fieldset disabled={submission.pending} className="form-fields">
        <legend className="sr-only">Dados do jogador</legend>
        <FormField
          label="Nome"
          icon={UserRound}
          name="name"
          value={values.name}
          onChange={event => updateValue('name', event.target.value)}
          error={errors.name}
          hint="De 3 a 100 caracteres, com pelo menos duas palavras e sem números."
          required
          autoComplete="off"
        />
        <fieldset className="position-options" aria-describedby={errors.position ? 'position-error' : 'position-hint'}>
          <legend id="player-position-label">Posição</legend>
          <RadioGroup name="position" value={values.position} onValueChange={value => updateValue('position', value)} aria-labelledby="player-position-label">
            {Object.entries(POSITIONS).map(([code, label]) => (
              <Label key={code} htmlFor={`position-${code}`} className="position-choice">
                <RadioGroupItem
                  id={`position-${code}`}
                  value={code}
                  disabled={player?.club_id != null && code !== player.position}
                  aria-invalid={Boolean(errors.position)}
                />
                <span><strong>{code}</strong><small>{label}</small></span>
              </Label>
            ))}
          </RadioGroup>
          {errors.position && <p className="field-error" id="position-error">{errors.position}</p>}
          <p className="field-hint" id="position-hint">{player?.club_id != null ? 'Jogador com clube não pode mudar de posição.' : 'Escolha uma das cinco posições.'}</p>
        </fieldset>
        <div className={`form-grid ${player ? 'edit-form-grid' : ''}`}>
          {numberField('age', 'Idade', 16, 45, player ? `De 16 a 45 anos, sem diminuir a idade atual (${player.age}).` : 'De 16 a 45 anos.')}
          {numberField('agility', 'Agilidade', 1, 100, 'De 1 a 100; com 35 anos ou mais, até 85.')}
          {!player && <div className="readonly-value"><Label htmlFor="base-preview">Valor base (moedas)</Label><div><LockKeyhole aria-hidden="true" /><Input id="base-preview" value="Após salvar" disabled /></div><small>Calculado no cadastro.</small></div>}
        </div>
        {!player && (
          <section className="attribute-fields">
            <Separator />
            <h3>Indicadores técnicos</h3>
            <p>Seis atributos e potencial de 1 a 99. A soma dos seis atributos não pode passar de 480.</p>
            <div className="attributes-form-layout">
              <div className="attribute-inputs">
                {ATTRIBUTES.map(({ key, label }) => numberField(key, label, 1, 99))}
                {numberField('potential', 'Potencial', 1, 99, 'No mínimo o maior atributo; igual a ele com 33 anos ou mais.')}
                <div className="readonly-value"><Label htmlFor="overall-preview">Overall</Label><div><LockKeyhole aria-hidden="true" /><Input id="overall-preview" value="Após salvar" disabled /></div><small>Calculado automaticamente.</small></div>
              </div>
              <PlayerAttributesPreview values={values} potential={values.potential} preview />
            </div>
          </section>
        )}
        {player && <p className="immutable-notice"><LockKeyhole aria-hidden="true" /> Não mudam depois do cadastro: valor base ({formatMoney(player.base_value)}), indicadores e potencial.</p>}
      </fieldset>
      <footer className="modal-actions">
        {!player && <p className="form-footer-note"><Info aria-hidden="true" /> O jogador começa livre e Apto.</p>}
        <Button variant="outline" onClick={onCancel} disabled={submission.pending}>Cancelar</Button>
        <Button type="submit" disabled={submission.pending}>{submission.pending ? 'Salvando…' : player ? 'Salvar alterações' : 'Salvar jogador'}</Button>
      </footer>
    </form>
  )
}
