import type { AnalysisSource, DimensionKey, GossipAnalysis, GossipPersona, TwistResult } from '../types'
import { clampScore, getTier } from './tiers'
import { makeId } from './engine'

export interface AiHealth {
  aiEnabled: boolean
  model: string
}

interface RawDimension {
  score?: unknown
  reason?: unknown
}

interface RawAnalysis {
  title?: unknown
  comment?: unknown
  highlight?: unknown
  advice?: unknown
  dimensions?: Record<string, RawDimension> | undefined
  persona?: Record<string, unknown> | undefined
  tags?: unknown
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status = 500) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function fetchJson<T>(url: string, init?: RequestInit, timeout = 30000): Promise<T> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeout)
  try {
    const response = await fetch(url, { ...init, signal: controller.signal })
    const data = (await response.json().catch(() => null)) as
      | { ok?: boolean; message?: string }
      | null
    if (!response.ok || !data || data.ok === false) {
      throw new ApiError(data?.message || `服务返回 ${response.status}`, response.status)
    }
    return data as T
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError('请求超时，AI 卫星没有回应', 408)
    }
    throw new ApiError('无法连接鉴定局服务，已切换本地模型', 0)
  } finally {
    window.clearTimeout(timer)
  }
}

export async function fetchHealth(): Promise<AiHealth> {
  const data = await fetchJson<{ ok: boolean; aiEnabled: boolean; model: string }>(
    '/api/health',
    undefined,
    8000,
  )
  return { aiEnabled: Boolean(data.aiEnabled), model: String(data.model || 'local-model') }
}

function readScore(raw: RawDimension | undefined, fallback: number): number {
  if (!raw) return clampScore(fallback)
  return clampScore(Number(raw.score))
}

function readText(value: unknown, fallback: string, max = 400): string {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  if (!trimmed) return fallback
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed
}

export function normalizeAiAnalysis(
  payload: RawAnalysis,
  story: string,
  fallback: GossipAnalysis,
): GossipAnalysis {
  const dims = payload.dimensions || {}
  const dimensions: Record<DimensionKey, { score: number; reason: string }> = {
    gossip: {
      score: readScore(dims.gossip, fallback.dimensions.gossip.score),
      reason: readText(dims.gossip?.reason, fallback.dimensions.gossip.reason, 160),
    },
    drama: {
      score: readScore(dims.drama, fallback.dimensions.drama.score),
      reason: readText(dims.drama?.reason, fallback.dimensions.drama.reason, 160),
    },
    twist: {
      score: readScore(dims.twist, fallback.dimensions.twist.score),
      reason: readText(dims.twist?.reason, fallback.dimensions.twist.reason, 160),
    },
    spread: {
      score: readScore(dims.spread, fallback.dimensions.spread.score),
      reason: readText(dims.spread?.reason, fallback.dimensions.spread.reason, 160),
    },
  }

  const personaRaw = payload.persona || {}
  const allowed = ['互联网情报局局长', '瓜田驻地观察员', '理性吃瓜研究员', '热闹现场第一排', '宇宙级围观专家']
  const personaName = allowed.includes(String(personaRaw.name))
    ? String(personaRaw.name)
    : fallback.persona.name
  const persona: GossipPersona = {
    name: personaName,
    badge: readText(personaRaw.badge, fallback.persona.badge, 2),
    tagline: readText(personaRaw.tagline, fallback.persona.tagline, 40),
    reason: readText(personaRaw.reason, fallback.persona.reason, 120),
  }

  const tags = Array.isArray(payload.tags)
    ? payload.tags
        .filter((tag): tag is string => typeof tag === 'string')
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 3)
    : fallback.tags

  const source: AnalysisSource = 'ai'
  return {
    ...fallback,
    id: makeId(),
    story,
    title: readText(payload.title, fallback.title, 40),
    dimensions,
    comment: readText(payload.comment, fallback.comment, 400),
    highlight: readText(payload.highlight, fallback.highlight, 220),
    advice: readText(payload.advice, fallback.advice, 160),
    persona,
    tags: tags.length > 0 ? tags : fallback.tags,
    source,
    createdAt: Date.now(),
  }
}

export async function requestAiAnalysis(story: string, fallback: GossipAnalysis): Promise<GossipAnalysis> {
  const data = await fetchJson<{ ok: boolean; analysis: RawAnalysis }>(
    '/api/analyze',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ story }),
    },
    40000,
  )
  return normalizeAiAnalysis(data.analysis, story, fallback)
}

export function normalizeAiTwist(payload: { story?: unknown; punchline?: unknown }, fallbackStory: string) {
  const story = readText(payload.story, fallbackStory, 800)
  const punchline = readText(
    payload.punchline,
    '以上剧情为 AI 虚构创作，与真实事件无关，请勿对号入座。',
    180,
  )
  return { story, punchline }
}

export async function requestAiTwist(
  original: string,
  twistCount: number,
  chaos: boolean,
): Promise<{ story: string; punchline: string }> {
  const data = await fetchJson<{
    ok: boolean
    story: string
    punchline: string
  }>(
    '/api/twist',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ story: original, count: twistCount, chaos }),
    },
    40000,
  )
  return normalizeAiTwist(data, 'AI 构思了半天，最后决定让剧情先休息一下。')
}

export function tierLabel(score: number): string {
  return getTier(score).name
}

export function makeAiSourcedTwist(
  story: string,
  punchline: string,
  _index: number,
  chaos: boolean,
  score: number,
  dimensions: TwistResult['dimension'],
  baseScore: number,
): TwistResult {
  return {
    id: makeId(),
    story,
    punchline,
    score,
    dimension: dimensions,
    delta: score - baseScore,
    chaos,
    source: 'ai',
    createdAt: Date.now(),
  }
}
