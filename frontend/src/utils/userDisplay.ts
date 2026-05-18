export interface UserLike {
  id?: string
  userId?: string
  name?: string
  userName?: string
  realName?: string
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function cleanText(value?: string | null): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function isUuidLike(value?: string | null): boolean {
  return UUID_PATTERN.test(cleanText(value))
}

export function getUserDisplayName(
  users: UserLike[],
  userId?: string | null,
  displayName?: string | null
): string {
  const explicitName = cleanText(displayName)
  if (explicitName) return explicitName

  const normalizedId = cleanText(userId)
  if (!normalizedId) return '-'

  const user = users.find((item) => item.id === normalizedId || item.userId === normalizedId)
  const resolvedName = cleanText(user?.name) || cleanText(user?.userName) || cleanText(user?.realName)
  if (resolvedName) return resolvedName

  return isUuidLike(normalizedId) ? '未知用户' : normalizedId
}
