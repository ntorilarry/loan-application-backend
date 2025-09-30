export interface User {
  id: number
  fullname: string
  email: string
  phone: string
  company_name?: string
  company_address?: string
  password_hash: string
  is_email_verified: boolean
  email_verification_token?: string
  reset_password_token?: string
  reset_password_expires?: Date
  role_id: number
  created_at: Date
  updated_at: Date
}

export interface CreateUserRequest {
  fullname: string
  email: string
  phone: string
  company_name?: string
  company_address?: string
  password: string
  role_id?: number
}

export interface LoginRequest {
  email: string
  password: string
}

export interface ForgotPasswordRequest {
  email: string
}

export interface ResetPasswordRequest {
  token: string
  password: string
}

export interface AuthResponse {
  user: Omit<User, "password_hash">
  access_token: string
  refresh_token: string | null
  refresh_token_expires: Date | null
}