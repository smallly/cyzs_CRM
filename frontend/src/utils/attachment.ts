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

export function isStoredAttachmentPreviewable(raw?: string | null): boolean {
  const parsed = parseStoredAttachment(raw)
  if (!parsed?.data) return false
  const source = parsed.data.trim().toLowerCase()
  if (/^data:image\//.test(source) || /^data:application\/pdf/.test(source)) return true
  return /\.(png|jpe?g|gif|webp|bmp|svg|pdf)(\?.*)?$/.test(parsed.name.toLowerCase()) || /\.(png|jpe?g|gif|webp|bmp|svg|pdf)(\?.*)?$/.test(source)
}

export function openStoredAttachment(raw?: string | null): boolean {
  const parsed = parseStoredAttachment(raw)
  if (!parsed?.data) return false
  window.open(parsed.data, '_blank', 'noopener,noreferrer')
  return true
}
