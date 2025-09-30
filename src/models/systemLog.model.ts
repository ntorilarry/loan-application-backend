export interface SystemLog {
  id: number
  user_id?: number
  action: string
  entity_type?: string
  entity_id?: number
  details?: any
  ip_address?: string
  user_agent?: string
  created_at: Date
}

export interface CreateLogRequest {
  user_id?: number
  action: string
  entity_type?: string
  entity_id?: number
  details?: any
  ip_address?: string
  user_agent?: string
}
