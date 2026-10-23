import { getInitials } from '@/lib/formatters'
import type { Player } from '@/features/players/types/player.types'
import type { LineupSlot } from '../utils/lineup'

export function SoccerFieldPreview({ slots, ids, players }: { slots: LineupSlot[]; ids: string[]; players: Player[] }) {
  return (
    <div className="soccer-field" role="img" aria-label="Prévia da escalação, do ataque ao goleiro">
      <svg viewBox="0 0 240 320" preserveAspectRatio="none" aria-hidden="true">
        <rect x="8" y="8" width="224" height="304" rx="3" />
        <path d="M8 160H232M76 8V50H164V8M76 312V270H164V312" />
        <circle cx="120" cy="160" r="34" />
        <circle cx="120" cy="160" r="2" />
      </svg>
      {(['attack', 'midfield', 'defense', 'goal'] as const).map(sector => {
        const sectorSlots = slots.map((slot, index) => ({ ...slot, index })).filter(slot => slot.sector === sector)
        if (!sectorSlots.length) return null
        return <div key={sector} className="field-sector">{sectorSlots.map(slot => {
          const player = players.find(item => String(item.id) === ids[slot.index])
          return <div className="field-player" key={slot.key}>
            <span className={player ? 'field-marker' : 'field-marker vacant'}>{player ? getInitials(player.name) : '+'}</span>
            <span>{player ? player.name : slot.label}</span>
            {player?.condition === 'MAL_CONDICIONADO' && <small>Mal condicionado</small>}
          </div>
        })}</div>
      })}
    </div>
  )
}
