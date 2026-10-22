export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export function getErrorMessage(error: unknown): string {
  
  if (error instanceof ApiError) return error.message
  
  return 'Não foi possível concluir a solicitação. Verifique a conexão e tente novamente.'
}
