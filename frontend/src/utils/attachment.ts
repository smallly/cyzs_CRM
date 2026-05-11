export interface StoredAttachment {
  name: string
  data: string
}

export function parseStoredAttachment(raw?: string | null): StoredAttachment | null {
  const text = (raw || '').trim()
  if (!text) return null
  try {
    const parsed = JSON.parse(text) as { name?: string; data?: string } | string
    if (typeof parsed === 'string') {
      return { name: parsed, data: '' }
    }
    return {
      name: parsed.name || text,
      data: parsed.data || ''
    }
  } catch {
    return { name: text, data: '' }
  }
}

export function getStoredAttachmentName(raw?: string | null): string {
  return parseStoredAttachment(raw)?.name || ''
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

export function openStoredAttachment(raw?: string | null): boolean {
  const parsed = parseStoredAttachment(raw)
  if (!parsed?.data) return false
  window.open(parsed.data, '_blank', 'noopener,noreferrer')
  return true
}
