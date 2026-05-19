export type ScopeMode = 'ALL' | 'SELF' | 'SELF_AND_SUBORDINATES' | 'DEPT' | 'DEPT_AND_SUBTREE'

export type ApiClient = <T>(path: string, init?: RequestInit) => Promise<T>

export async function saveRoleScopeWithFallback(
  api: ApiClient,
  roleCode: string,
  scope: ScopeMode
): Promise<void> {
  try {
    await api<void>(`/api/roles/${roleCode}/scope`, {
      method: 'PUT',
      body: JSON.stringify({ mode: scope })
    })
    return
  } catch (error) {
    if (!shouldFallbackToLegacyScopeApi(error)) {
      throw error
    }
  }

  await api<void>('/api/system/scope-mode', {
    method: 'PUT',
    body: JSON.stringify({ mode: scope })
  })
}

function shouldFallbackToLegacyScopeApi(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error || '')
  return (
    message.includes('No static resource') ||
    message.includes('HTTP 404') ||
    message.includes('404 Not Found') ||
    message.includes('Not Found')
  )
}
