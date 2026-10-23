import { ApiError } from './errors'

const API_BASE_URL = '/api/v1'

type Query = Record<string, string | number | boolean | null | undefined>
type RequestOptions = Omit<RequestInit, 'body'> & { json?: unknown; query?: Query }

async function send(path: string, options: RequestOptions, accept: string): Promise<Response> {
  
  const { json, query, ...init } = options
  const params = new URLSearchParams()
  
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== null && value !== undefined) params.set(key, String(value))
  }
  
  const headers = new Headers(init.headers)
  headers.set('Accept', accept)
  
  if (json !== undefined) headers.set('Content-Type', 'application/json')
  
  const suffix = params.size ? `?${params}` : ''
  const response = await fetch(`${API_BASE_URL}${path}${suffix}`, {
    ...init,
    headers,
    body: json === undefined ? undefined : JSON.stringify(json),
  })

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null)
    const message = typeof body === 'object' && body !== null && 'message' in body
      && typeof body.message === 'string' && body.message.trim()
      ? body.message : `Não foi possível concluir a solicitação (HTTP ${response.status}).`
    throw new ApiError(response.status, message)
  }
  
  return response
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await send(path, options, 'application/json')
  if (response.status === 204) return undefined as T
  
  return response.json() as Promise<T>
}

export async function apiDownload(path: string, options: RequestOptions = {}): Promise<Blob> {
  const response = await send(path, options, 'text/csv')
  
  return response.blob()
}
