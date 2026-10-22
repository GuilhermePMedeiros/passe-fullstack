import { useEffect, useState } from 'react'
import { Clock3 } from 'lucide-react'

const clockFormatter = new Intl.DateTimeFormat('pt-BR', {
 
  timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit',

})

export function LeagueFooter({ year }: { year: string }) {
  const [now, setNow] = useState(() => new Date())
  
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000)
    
    return () => window.clearInterval(timer)
  }, [])
  
  return (
    <footer className="league-footer">
      <Clock3 aria-hidden="true" />
      <span>Liga Fictícia {year} · Horário de Brasília (UTC−3) · <time dateTime={now.toISOString()}>{clockFormatter.format(now)}</time></span>
    </footer>
  )
}
