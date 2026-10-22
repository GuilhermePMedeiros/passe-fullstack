import { useCallback, useState } from 'react'
import { Check, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/Button'
import { Feedback } from '@/components/ui/Feedback'
import { ErrorState, LoadingState } from '@/components/ui/ListStates'
import { PlayerConditionBadge, PlayerIdentity } from '@/features/players/components/PlayerIdentity'
import { useSubmission } from '@/hooks/useSubmission'
import { getClub, getLineup, saveLineup } from '../services/clubService'
import { useClubQuery } from '../hooks/useClubQuery'
import { getSlots, isLineupValid, lineupDraft, placePlayers } from '../utils/lineup'
import type { ClubDetails, ClubLineup, Formation } from '../types/club.types'
import { FormationSelector } from './FormationSelector'
import { LineupSlots } from './LineupSlots'
import { SoccerFieldPreview } from './SoccerFieldPreview'

function LineupEditor({ club, initial }: { club: ClubDetails; initial: ClubLineup }) {
  const [saved, setSaved] = useState(initial)
  const [draft, setDraft] = useState(() => lineupDraft(initial))
  const [players, setPlayers] = useState(club.players)
  const [synchronized, setSynchronized] = useState(true)
  const submission = useSubmission()
  const slots = getSlots(draft.formation)
  const valid = isLineupValid(draft.formation, draft.ids, players, club.id)
  const reserves = players.filter(player => !draft.ids.includes(String(player.id)))
  const unfit = players.filter(player => draft.ids.includes(String(player.id)) && player.condition === 'MAL_CONDICIONADO')

  function changeFormation(formation: Formation) {
    const selected = players.filter(player => draft.ids.includes(String(player.id)))
    setDraft({ formation, ids: placePlayers(formation, selected) })
  }

  async function synchronize() {
    const [latestClub, lineup] = await Promise.all([getClub(String(club.id)), getLineup(String(club.id))])
    setPlayers(latestClub.players)
    setSaved(lineup)
    setDraft(lineupDraft(lineup))
    setSynchronized(true)
  }

  function save() {
    if (!valid || !synchronized) return
    void submission.run(async () => {
      try {
        const lineup = await saveLineup(String(club.id), draft.formation, draft.ids.map(Number))
        setSaved(lineup)
        setDraft(lineupDraft(lineup))
        toast.success('Escalação salva', { description: `${club.name}: formação ${lineup.formation}, com os titulares devolvidos pela API.` })
      } catch (cause) {
        setSynchronized(false)
        try {
          await synchronize()
        } catch {
          // Keep the failed save message and require a fresh read before another write.
        }
        throw cause
      }
    })
  }

  return (
    <div className="club-lineup-layout">
      <section className="club-panel lineup-editor">
        <header className="club-panel-header lineup-title"><div><h2>Titulares</h2><p>1 goleiro e 4 jogadores de linha, na formação escolhida. Salvar troca os 5 de uma vez.</p></div><Badge variant="outline" className={`status-badge ${saved.complete ? 'status-apto' : 'status-mal_condicionado'}`}>{saved.complete ? 'Completa' : 'Incompleta'}</Badge></header>
        <div className="lineup-notices">
          <Feedback error message={submission.error ? `A escalação foi recusada. ${submission.error}` : ''} />
          {!saved.complete && <Alert className="warning-notice"><TriangleAlert aria-hidden="true" /><AlertDescription>Escalação incompleta: {club.name} não pode jogar partidas. Escolha um titular elegível para cada uma das 5 vagas e salve a escalação.</AlertDescription></Alert>}
          {!synchronized && <><p role="alert">Não foi possível atualizar os dados após a recusa. Consulte novamente antes de salvar.</p><Button variant="outline" disabled={submission.pending} onClick={() => void submission.run(synchronize)}>Atualizar escalação</Button></>}
        </div>
        <FormationSelector value={draft.formation} disabled={submission.pending || !synchronized} onChange={changeFormation} />
        <LineupSlots slots={slots} ids={draft.ids} players={players} disabled={submission.pending || !synchronized} onChange={(index, value) => setDraft(current => ({ ...current, ids: current.ids.map((id, slot) => slot === index ? value : id) }))} />
        {unfit.length > 0 && <Alert className="warning-notice lineup-warning"><TriangleAlert aria-hidden="true" /><AlertDescription>{unfit.map(player => player.name).join(' e ')}: podem jogar, mas cada atributo vale 15% a menos durante a partida.</AlertDescription></Alert>}
        <footer className="lineup-actions">
          <p>{!valid ? 'Escolha um titular para cada vaga para salvar.' : 'A escalação vale até ser trocada. Titular vendido ou DOENTE sai dela; escale novamente antes de jogar.'}</p>
          <Button variant="outline" disabled={submission.pending} onClick={() => setDraft(lineupDraft(saved))}>Cancelar</Button>
          <Button disabled={!valid || submission.pending || !synchronized} onClick={save}><Check aria-hidden="true" />{submission.pending ? 'Salvando…' : 'Salvar escalação'}</Button>
        </footer>
      </section>
      <aside className="lineup-preview">
        <section className="club-panel">
          <header className="club-panel-header"><h2>Em campo</h2><p>Prévia da formação {draft.formation}, do goleiro ao ataque. Alterações precisam ser salvas.</p></header>
          <SoccerFieldPreview slots={slots} ids={draft.ids} players={players} />
          <p className="field-note">Na partida, atacam os 3 jogadores de linha mais avançados e defendem o goleiro e os 2 mais recuados. É gol quando o ataque é maior que a defesa.</p>
        </section>
        <section className="club-panel">
          <header className="club-panel-header"><h2>Reservas</h2><p>Jogadores do elenco fora da escalação.</p></header>
          <div className="lineup-reserves">{reserves.length ? reserves.map(player => <div key={player.id}><PlayerIdentity player={player} /><PlayerConditionBadge player={player} /></div>) : <p>Nenhum reserva: todos os jogadores do elenco estão escolhidos.</p>}<p>Jogador DOENTE não pode ser escalado.</p></div>
        </section>
      </aside>
    </div>
  )
}

export function ClubLineupTab({ club }: { club: ClubDetails }) {
  const load = useCallback((signal: AbortSignal) => getLineup(String(club.id), signal), [club.id])
  const { state, refresh } = useClubQuery(load)
  if (state.status === 'loading') return <section className="club-panel"><LoadingState label="Carregando escalação…" /></section>
  if (state.status === 'error') return <section className="club-panel"><ErrorState title="Não foi possível carregar a escalação" message={state.message} onRetry={refresh} /></section>
  return <LineupEditor key={JSON.stringify(state.data)} club={club} initial={state.data} />
}
