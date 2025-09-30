import type { Request } from "express"

export interface ApiResponse<T = any> {
  success: boolean
  message: string
  data?: T
  error?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number
    email: string
    role_id: number
    permissions: string[]
  }
}
