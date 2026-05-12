export interface StoredAttachment {
  name: string
  data: string
}

export function parseStoredAttachmentList(raw?: string | null): StoredAttachment[] {
  const text = (raw || '').trim()
  if (!text) return []
  try {
    const parsed = JSON.parse(text) as
      | { name?: string; data?: string }
      | Array<{ name?: string; data?: string }>
      | string
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => ({
          name: item?.name || '',
          data: item?.data || ''
        }))
        .filter((item) => item.name || item.data)
    }
    if (typeof parsed === 'string') {
      return [{ name: parsed, data: '' }]
    }
    return [{
      name: parsed.name || text,
      data: parsed.data || ''
    }]
  } catch {
    return [{ name: text, data: '' }]
  }
}

export function parseStoredAttachment(raw?: string | null): StoredAttachment | null {
  return parseStoredAttachmentList(raw)[0] || null
}

export function getStoredAttachmentList(raw?: string | null): StoredAttachment[] {
  return parseStoredAttachmentList(raw)
}

export function encodeStoredAttachments(items: StoredAttachment[]): string {
  const normalized = items
    .map((item) => ({
      name: (item?.name || '').trim(),
      data: (item?.data || '').trim()
    }))
    .filter((item) => item.name || item.data)
  return JSON.stringify(normalized)
}

export function getStoredAttachmentName(raw?: string | null): string {
  const list = parseStoredAttachmentList(raw)
  if (!list.length) return ''
  if (list.length === 1) return list[0].name || ''
  const first = list[0].name || ''
  return `${first}${list.length > 1 ? ` +${list.length - 1}` : ''}`
}

export function getStoredAttachmentData(raw?: string | null): string {
  return parseStoredAttachment(raw)?.data || ''
}

export function getStoredAttachmentKind(raw?: string | null): 'image' | 'pdf' | 'other' {
  const parsed = parseStoredAttachment(raw)
  if (!parsed?.data) return 'other'
  const source = parsed.data.trim().toLowerCase()
  const name = (parsed.name || '').trim().toLowerCase()
  if (/^data:image\//.test(source) || /\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/.test(name) || /\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/.test(source)) {
    return 'image'
  }
  if (/^data:application\/pdf/.test(source) || /\.pdf(\?.*)?$/.test(name) || /\.pdf(\?.*)?$/.test(source)) {
    return 'pdf'
  }
  return 'other'
}

export function isStoredAttachmentPreviewable(raw?: string | null): boolean {
  return getStoredAttachmentKind(raw) !== 'other'
}

export async function openInNewTab(url: string): Promise<void> {
  let targetUrl = url
  if (url.startsWith('data:')) {
    const blob = await fetch(url).then((r) => r.blob())
    targetUrl = URL.createObjectURL(blob)
  }
  const a = document.createElement('a')
  a.href = targetUrl
  a.target = '_blank'
  a.rel = 'noopener noreferrer'
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    document.body.removeChild(a)
    if (targetUrl !== url) URL.revokeObjectURL(targetUrl)
  }, 0)
}

export function openStoredAttachment(raw?: string | null): boolean {
  const parsed = parseStoredAttachment(raw)
  if (!parsed?.data) return false
  openInNewTab(parsed.data)
  return true
}
