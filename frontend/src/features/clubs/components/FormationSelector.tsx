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
            <svg className="formation-thumbnail" viewBox="0 0 28 40" aria-hidden="true">
              <rect x="1" y="1" width="26" height="38" rx="3" />
              <path d="M1 20H27M8 1V7H20V1M8 39V33H20V39" />
              <circle cx="14" cy="20" r="5" />
              {[attack, midfield, defense, 1].map((count, row) => Array.from({ length: count }, (_, index) => (
                <circle className="formation-dot" key={`${row}-${index}`} cx={28 * (index + 1) / (count + 1)} cy={6 + row * 9} r="1.5" />
              )))}
            </svg>
            <RadioGroupItem value={formation} aria-label={formation} />
            <span><strong>{formation}</strong><small>Defesa {defense}{midfield ? `, meio ${midfield}` : ''}, ataque {attack}</small></span>
          </label>
        ))}
      </RadioGroup>
    </fieldset>
  )
}
