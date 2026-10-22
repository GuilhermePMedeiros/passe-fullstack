import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { FORMATIONS } from '../utils/lineup'
import type { Formation } from '../types/club.types'

export function FormationSelector({ value, disabled, onChange }: { value: Formation; disabled: boolean; onChange: (value: Formation) => void }) {
  return (
    <fieldset className="formation-selector" disabled={disabled}>
      <legend>Formação</legend>
      <p>Os números contam os jogadores de linha de trás para frente. O goleiro fica fora da conta.</p>
      <RadioGroup value={value} onValueChange={next => onChange(next as Formation)} aria-label="Formação" disabled={disabled}>
        {Object.entries(FORMATIONS).map(([formation, [defense, midfield, attack]]) => (
          <label key={formation} className="formation-choice">
            <RadioGroupItem value={formation} aria-label={formation} />
            <span><strong>{formation}</strong><small>Defesa {defense}{midfield ? `, meio ${midfield}` : ''}, ataque {attack}</small></span>
          </label>
        ))}
      </RadioGroup>
    </fieldset>
  )
}
