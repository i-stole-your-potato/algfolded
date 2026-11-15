/** Portable, versioned snapshots. Credentials and transport queues never travel. */
export interface Backup {
  app: 'algfolded'
  version: 1
  createdAt: string
  data: Record<string, string>
}

export const RECOVERY_KEY = 'algfolded_before_restore_v1'
const globals = ['ltctTrainerSettings', 'ltctLetterScheme', 'ltctEdgeLetterScheme',
  'ltct_locale', 'ltct_theme.is_dark', 'ltct_active_algset', 'ltct_stats_array']
const namespaces = ['ltct_store', 'ltct_srs', 'ltct_srs_counter', 'currentLtctArray',
  'ltct_presets_arrays', 'ltctTrainerNotes', 'algfoldedCustomAlgs',
  'algfoldedPreferredAlgs', 'algfolded_flow_runs', 'algfolded_flow_trouble']
const object = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v)
const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every(x => typeof x === 'string')

export function isPortableKey(key: string): boolean {
  const [base, id, extra] = key.split(':')
  return globals.includes(key) || (namespaces.includes(base) && extra === undefined &&
    (id === undefined || /^[a-zA-Z0-9_-]{1,80}$/.test(id)))
}

function validSlot(base: string, value: unknown): boolean {
  if (base === 'currentLtctArray') return strings(value)
  if (base === 'ltct_srs_counter') return Number.isSafeInteger(value) && (value as number) >= 0
  if (base === 'algfolded_flow_runs' || base === 'ltct_stats_array') return Array.isArray(value) && value.every(object)
  if (!object(value)) return false
  if (['ltctTrainerNotes', 'algfoldedPreferredAlgs', 'ltctLetterScheme', 'ltctEdgeLetterScheme'].includes(base)) {
    return Object.values(value).every(x => typeof x === 'string')
  }
  if (['ltct_presets_arrays', 'algfoldedCustomAlgs'].includes(base)) return Object.values(value).every(strings)
  if (base === 'ltct_store') return strings(value.keys) && object(value.keysCount) &&
    (value.stats === undefined || (Array.isArray(value.stats) && value.stats.every(object))) &&
    (value.upcoming === undefined || (Array.isArray(value.upcoming) && value.upcoming.every(object)))
  if (base === 'ltct_srs' || base === 'algfolded_flow_trouble') return Object.values(value).every(object)
  if (base === 'ltctTrainerSettings') return Object.entries(value).every(([key, v]) =>
    ['bufferOrder', 'edgeBufferOrder'].includes(key) ? strings(v) :
      ['string', 'boolean', 'number'].includes(typeof v))
  return true
}

export function parseBackup(raw: string): Backup {
  // Bound accidental downloads and reject dangerous object keys anywhere in JSON.
  if (raw.length > 20 * 1024 * 1024) throw new Error('invalid_backup')
  const safeParse = (text: string): any => JSON.parse(text, (key, value) => {
    if (['__proto__', 'constructor', 'prototype'].includes(key)) throw new Error('invalid_backup')
    return value
  })
  try {
    const b = safeParse(raw)
    if (!object(b) || b.app !== 'algfolded' || b.version !== 1 ||
      typeof b.createdAt !== 'string' || !Number.isFinite(Date.parse(b.createdAt)) || !object(b.data)) throw 0
    for (const [key, rawValue] of Object.entries(b.data)) {
      if (!isPortableKey(key) || typeof rawValue !== 'string') throw 0
      if (key === 'ltct_locale') { if (!['en', 'de', 'fr', 'it'].includes(rawValue)) throw 0; continue }
      if (key === 'ltct_theme.is_dark') { if (!['true', 'false'].includes(rawValue)) throw 0; continue }
      if (key === 'ltct_active_algset') { if (!/^[a-zA-Z0-9_-]{1,80}$/.test(rawValue)) throw 0; continue }
      const value = safeParse(rawValue)
      const [base, id] = key.split(':')
      // Older combined namespaces are retained so the existing migrations can run.
      if (!validSlot(base, value) && !(id === undefined && namespaces.includes(base) &&
        object(value) && Object.entries(value).every(([set, slot]) =>
          /^[a-zA-Z0-9_-]{1,80}$/.test(set) && validSlot(base, slot)))) throw 0
    }
    return b as unknown as Backup
  } catch { throw new Error('invalid_backup') }
}

export function captureBackup(storage: Storage = localStorage): Backup {
  const data: Record<string, string> = {}
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i)!
    if (isPortableKey(key)) data[key] = storage.getItem(key)!
  }
  return {app: 'algfolded', version: 1, createdAt: new Date().toISOString(), data}
}

function replaceData(data: Record<string, string>, storage: Storage) {
  const keys = Object.keys(captureBackup(storage).data)
  for (const key of keys) storage.removeItem(key)
  for (const [key, value] of Object.entries(data)) storage.setItem(key, value)
}

export function restoreBackup(backup: Backup, storage: Storage = localStorage): void {
  const valid = parseBackup(JSON.stringify(backup))
  const before = captureBackup(storage)
  // Abort before any mutation if a local recovery copy cannot be stored.
  try { storage.setItem(RECOVERY_KEY, JSON.stringify(before)) }
  catch { throw new Error('recovery_space') }
  try { replaceData(valid.data, storage) }
  catch {
    try { replaceData(before.data, storage) }
    catch { throw new Error('recovery_required') }
    throw new Error('restore_failed')
  }
}
