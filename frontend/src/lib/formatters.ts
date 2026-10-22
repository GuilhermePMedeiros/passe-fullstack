const moneyFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatMoney(value: number) {
  return moneyFormatter.format(value)
}

export function formatSignedMoney(value: number) {
  return `${value >= 0 ? '+' : ''}${formatMoney(value)}`
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(value))
}

export function getInitials(name: string) {
  return name.trim().split(/\s+/u).slice(0, 2).map(word => word[0]).join('').toLocaleUpperCase('pt-BR')
}
