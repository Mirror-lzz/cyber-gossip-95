import type { Tier } from '../types'

export const TIERS: Tier[] = [
  {
    name: '风平浪静',
    code: 'LV.0 / CALM',
    description: '建议继续上网冲浪，瓜田今日无风。',
    short: '无风',
    color: '#3d6b3d',
  },
  {
    name: '普通小瓜',
    code: 'LV.1 / SNACK',
    description: '适合饭后消遣，配一杯汽水刚刚好。',
    short: '小瓜',
    color: '#3b6f8f',
  },
  {
    name: '瓜田小震',
    code: 'LV.2 / TREMOR',
    description: '围观群众开始集合，请自备小板凳。',
    short: '小震',
    color: '#8a6a15',
  },
  {
    name: '大型抓马现场',
    code: 'LV.3 / DRAMA',
    description: '人物关系开始打结，编剧看了都沉默。',
    short: '抓马',
    color: '#995a13',
  },
  {
    name: '史诗级互联网名场面',
    code: 'LV.4 / LEGEND',
    description: '建议载入互联网考古档案，加急抢救。',
    short: '名场面',
    color: '#97301f',
  },
  {
    name: '瓜田核爆',
    code: 'LV.5 / MELTDOWN',
    description: '系统正在申请重启，请所有群众后退。',
    short: '核爆',
    color: '#7d1616',
  },
]

export function getTier(score: number): Tier {
  if (score <= 20) return TIERS[0]
  if (score <= 40) return TIERS[1]
  if (score <= 60) return TIERS[2]
  if (score <= 80) return TIERS[3]
  if (score <= 95) return TIERS[4]
  return TIERS[5]
}

export function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(Number.isFinite(value) ? value : 0)))
}

export function scoreBand(score: number): 'low' | 'mid' | 'high' | 'nuke' {
  if (score > 95) return 'nuke'
  if (score >= 81) return 'high'
  if (score >= 41) return 'mid'
  return 'low'
}

export const DIMENSION_META = [
  { key: 'gossip', label: '吃瓜指数', en: 'GOSSIP', hint: '总体围观价值' },
  { key: 'drama', label: '抓马指数', en: 'DRAMA', hint: '人物冲突与戏剧程度' },
  { key: 'twist', label: '反转指数', en: 'PLOT TWIST', hint: '剧情意外程度' },
  { key: 'spread', label: '传播指数', en: 'SPREAD', hint: '引发讨论的潜力' },
] as const
