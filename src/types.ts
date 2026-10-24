export type DimensionKey = 'gossip' | 'drama' | 'twist' | 'spread'

export type AnalysisSource = 'ai' | 'local' | 'local-fallback'

export interface DimensionResult {
  score: number
  reason: string
}

export interface GossipPersona {
  name: string
  badge: string
  tagline: string
  reason: string
}

export interface GossipAnalysis {
  id: string
  story: string
  title: string
  dimensions: Record<DimensionKey, DimensionResult>
  comment: string
  highlight: string
  advice: string
  persona: GossipPersona
  tags: string[]
  source: AnalysisSource
  createdAt: number
}

export interface TwistResult {
  id: string
  story: string
  punchline: string
  score: number
  dimension: Record<DimensionKey, DimensionResult>
  delta: number
  chaos: boolean
  source: 'ai' | 'local'
  createdAt: number
}

export interface HistoryRecord {
  id: string
  createdAt: number
  analysis: GossipAnalysis
  twists: TwistResult[]
}

export interface Tier {
  name: string
  code: string
  description: string
  short: string
  color: string
}

export interface PresetCase {
  id: string
  category: string
  story: string
  /** 本地演示模式下的人工校准分，让现场演示覆盖不同等级 */
  hint: number
  twists: string[]
  chaos: string[]
}

export interface AppPreferences {
  sound: boolean
  crt: boolean
}
