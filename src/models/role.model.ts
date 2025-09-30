export interface Role {
  id: number
  name: string
  description?: string
  created_at: Date
}

export interface Permission {
  id: number
  entity: string
  action: string
  description?: string
  created_at: Date
}

export interface RolePermission {
  id: number
  role_id: number
  permission_id: number
  created_at: Date
}

export interface RoleWithPermissions extends Role {
  permissions: Permission[]
}
