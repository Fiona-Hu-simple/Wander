export interface UserIdentity {
  userId: number
  username: string
}

export interface AuthSession extends UserIdentity {
  token: string
}

export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}
