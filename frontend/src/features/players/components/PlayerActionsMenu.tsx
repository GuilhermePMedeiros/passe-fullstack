import { Eye, HeartPulse, MoreHorizontal, Pencil, ShoppingCart, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import type { Player, PlayerAction } from '../types/player.types'

export function PlayerActionsMenu({ player, onAction }: { player: Player; onAction: (action: PlayerAction, player: Player) => void }) {
  function selectAction(action: PlayerAction) {
    window.requestAnimationFrame(() => onAction(action, player))
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" data-player-action={player.id} aria-label={`Ações de ${player.name}`}>
          <MoreHorizontal aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="actions-menu" align="end" sideOffset={4}>
        <DropdownMenuLabel>{player.name}</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => selectAction('details')}><Eye /> Ver detalhes</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => selectAction('edit')}><Pencil /> Editar</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => selectAction('condition')}><HeartPulse /> Alterar condição</DropdownMenuItem>
        {player.club_id === null && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => selectAction('buy')}><ShoppingCart /> Comprar</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="destructive-text" onSelect={() => selectAction('delete')}><Trash2 /> Excluir</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
