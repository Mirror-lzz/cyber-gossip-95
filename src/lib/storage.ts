import type { AppPreferences, HistoryRecord } from '../types'

const HISTORY_KEY = 'cg95:history:v1'
const PREFS_KEY = 'cg95:prefs:v1'
const MAX_HISTORY = 12

export function loadHistory(): HistoryRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (item): item is HistoryRecord =>
          Boolean(item) &&
          typeof item.id === 'string' &&
          Boolean(item.analysis) &&
          typeof item.analysis?.story === 'string',
      )
      .slice(0, MAX_HISTORY)
  } catch {
    return []
  }
}

export function saveHistory(records: HistoryRecord[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(records.slice(0, MAX_HISTORY)))
  } catch {
    /* localStorage 满或不可用时静默失败，不影响主流程 */
  }
}

export function pushHistory(record: HistoryRecord): HistoryRecord[] {
  const next = [record, ...loadHistory().filter((item) => item.analysis.story !== record.analysis.story)]
  const trimmed = next.slice(0, MAX_HISTORY)
  saveHistory(trimmed)
  return trimmed
}

export function removeHistory(id: string): HistoryRecord[] {
  const next = loadHistory().filter((item) => item.id !== id)
  saveHistory(next)
  return next
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(HISTORY_KEY)
  } catch {
    /* noop */
  }
}

export function loadPrefs(): AppPreferences {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) return { sound: false, crt: true }
    const parsed = JSON.parse(raw) as Partial<AppPreferences>
    return {
      sound: parsed.sound === true,
      crt: parsed.crt !== false,
    }
  } catch {
    return { sound: false, crt: true }
  }
}

export function savePrefs(prefs: AppPreferences): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  } catch {
    /* noop */
  }
}
