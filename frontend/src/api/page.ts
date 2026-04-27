export interface PageResult<T> {
  records: T[]
  total: number
  page: number
  size: number
}

export function normalizePageResult<T>(res: PageResult<T> | T[] | any): PageResult<T> {
  if (Array.isArray(res)) {
    return {
      records: res,
      total: res.length,
      page: 1,
      size: res.length || 10
    }
  }
  const records = Array.isArray(res?.records)
    ? res.records
    : Array.isArray(res?.items)
      ? res.items
      : []
  return {
    records,
    total: Number(res?.total ?? records.length ?? 0),
    page: Number(res?.page ?? 1),
    size: Number(res?.size ?? (records.length || 10))
  }
}

export function buildPageQuery(
  page: number,
  size: number,
  extra?: Record<string, string | number | undefined | null>
): string {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('size', String(size))
  if (extra) {
    Object.entries(extra).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return
      params.set(key, String(value))
    })
  }
  return params.toString()
}
