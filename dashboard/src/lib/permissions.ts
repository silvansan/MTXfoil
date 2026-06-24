export type Role = 'superadmin' | 'admin' | 'operator' | 'viewer'

export function getUserRole(user: unknown): Role | null {
  if (!user || typeof user !== 'object') return null
  const role = (user as { role?: string }).role
  return (role as Role) ?? null
}

export function isSuperAdmin(user: unknown): boolean {
  return getUserRole(user) === 'superadmin'
}

export function isAdmin(user: unknown): boolean {
  const role = getUserRole(user)
  return role === 'superadmin' || role === 'admin'
}

export function isOperator(user: unknown): boolean {
  const role = getUserRole(user)
  return role === 'superadmin' || role === 'admin' || role === 'operator'
}

export function canManageStreams(user: unknown): boolean {
  return isOperator(user)
}

export function canManageUsers(user: unknown): boolean {
  return isSuperAdmin(user)
}

export function canAccessAdmin(user: unknown): boolean {
  return isAdmin(user)
}

export function canViewPlayback(user: unknown): boolean {
  return Boolean(user)
}

export function canManageForwarding(user: unknown): boolean {
  return isAdmin(user)
}

export function isViewer(user: unknown): boolean {
  return getUserRole(user) === 'viewer'
}

export function canViewMetrics(user: unknown): boolean {
  return isOperator(user)
}

export function canAccessOperatorRoute(user: unknown, pathname: string): boolean {
  if (!user) return false
  if (isViewer(user)) return pathname.startsWith('/player/')
  return true
}

export function canApplyConfig(user: unknown): boolean {
  return isAdmin(user)
}
