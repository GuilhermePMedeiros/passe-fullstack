import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PlayerConditionBadge } from '@/features/players/components/PlayerIdentity'
import type { Player } from '@/features/players/types/player.types'
import { DataTable, type TableColumn } from '@/components/ui/DataTable'
import type { LineupSlot } from '../utils/lineup'

interface SlotRow extends LineupSlot {
  id: number
}

export function LineupSlots({ slots, ids, players, disabled, onChange }: { slots: LineupSlot[]; ids: string[]; players: Player[]; disabled: boolean; onChange: (index: number, value: string) => void }) {
  const rows: SlotRow[] = slots.map((slot, index) => ({ ...slot, id: index }))

  function selected(row: SlotRow) {
    return players.find(player => String(player.id) === ids[row.id])
  }

  function renderSelect(row: SlotRow) {
    const options = players.filter(player => row.positions.includes(player.position) && player.condition !== 'DOENTE')
    return (
      <div className="lineup-slot-field">
        <Select value={ids[row.id] || '__empty__'} onValueChange={value => onChange(row.id, value === '__empty__' ? '' : value)} disabled={disabled || !options.length}>
          <SelectTrigger aria-label={`${row.label} ${row.id + 1}`} aria-describedby={!ids[row.id] ? `slot-${row.id}-hint` : undefined} className="lineup-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper" className="passe-select-content">
            <SelectItem value="__empty__">{options.length ? 'Escolha um titular' : `Sem ${row.positions.join(' ou ')} elegível`}</SelectItem>
            {options.map(player => <SelectItem value={String(player.id)} key={player.id} disabled={ids.some((id, index) => index !== row.id && id === String(player.id))}>{player.name} ({player.position})</SelectItem>)}
          </SelectContent>
        </Select>
        {!ids[row.id] && <small className="field-error" id={`slot-${row.id}-hint`}>Escolha um titular para esta vaga.</small>}
      </div>
    )
  }

  const columns: TableColumn<SlotRow>[] = [
    { key: 'slot', label: 'Vaga', render: row => <span>{row.label}<small className="slot-positions">{row.positions.join(' ou ')}</small></span> },
    { key: 'starter', label: 'Titular', render: renderSelect },
    { key: 'condition', label: 'Condição', render: row => { const player = selected(row); return player ? <PlayerConditionBadge player={player} /> : '—' } },
    { key: 'overall', label: 'Overall', render: row => selected(row)?.overall ?? '—' },
    { key: 'attributes', label: 'Atributos usados', render: row => {
      const player = selected(row)
      if (!player) return '—'
      if (player.position === 'GOL') return `Defesa ${player.defending}`
      if (player.position === 'ATA') return `Finalização ${player.shooting}`
      if (player.position === 'MEI') return `Passe ${player.passing}`
      return `Drible ${player.dribbling} · Defesa ${player.defending}`
    } },
  ]
  return <DataTable rows={rows} columns={columns} label="Vagas da escalação" />
}
