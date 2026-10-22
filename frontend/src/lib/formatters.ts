const moneyFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatMoney(value: number) {
  return moneyFormatter.format(value)
}

export function getInitials(name: string) {
  return name.trim().split(/\s+/u).slice(0, 2).map(word => word[0]).join('').toLocaleUpperCase('pt-BR')
}
