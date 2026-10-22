export interface PageMeta {
  page: number
  limit: number
  total_items: number
  total_pages: number
}

export interface ClubSummary {
  id: number
  name: string
  acronym: string
  cash: number
  squad_value: number
  net_worth: number
}
