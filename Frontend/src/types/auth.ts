export type UserRole = 'farmer' | 'buyer' | 'seller'

export interface RegisterPayload {
  fullName: string
  email:    string
  phone:    string
  password: string
  role:     'farmer' | 'buyer' | 'seller'
  intent?:  'buy' | 'sell'
}

export interface LoginPayload {
  email:    string
  password: string
}

export interface AuthResponse {
  token: string
  user: {
    id:    string
    name:  string
    email: string
    role:  UserRole
  }
}

export interface ApiError {
  message: string
  field?:  string
}