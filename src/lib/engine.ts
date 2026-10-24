import type {
  DimensionKey,
  DimensionResult,
  GossipAnalysis,
  GossipPersona,
  PresetCase,
  TwistResult,
} from '../types'
import { clampScore, getTier } from './tiers'
import { findPreset } from '../data/presets'

/* ────────────────────────────────────────────────────────────────
 * 本地演示模式：基于文本特征的可解释评分模型
 * 不是随机数，所有分数都可以从原文特征中找到依据。
 * ──────────────────────────────────────────────────────────────── */

const CONFLICT_WORDS = [
  '吵',
  '骂',
  '对线',
  '翻脸',
  '冲突',
  '对峙',
  '撕',
  '举报',
  '报警',
  '阴阳',
  '绝交',
  '分手',
  '生气',
  '愤怒',
  '怼',
  '背刺',
  '摊牌',
  '质问',
  '爆发',
  '争',
  '冷战',
  '拉黑',
  '理论',
  '投诉',
]

const TWIST_WORDS = [
  '结果',
  '居然',
  '没想到',
  '原来',
  '反转',
  '其实',
  '竟然',
  '谁知',
  '才发现',
  '发现',
  '却',
  '反而',
  '不料',
  '最后',
  '直到',
  '根本不是',
]

const SPREAD_WORDS = [
  '群',
  '朋友圈',
  '热搜',
  '转发',
  '围观',
  '吃瓜',
  '评论',
  '吐槽',
  '全网',
  '帖子',
  '微博',
  '小红书',
  '直播',
  '弹幕',
  '论坛',
  '同事',
  '同学',
  '小区',
  '公司',
  '粉丝',
  '传播',
  '传开',
  '刷屏',
  '业主',
]

const ABSURD_WORDS = [
  '小号',
  '大号',
  '假发',
  '猫',
  '狗',
  '外卖',
  '老板',
  '室友',
  '前任',
  '相亲',
  '剧本',
  '广场舞',
  '快递',
  '螺蛳粉',
  '马桶',
  '无人机',
  '表情包',
  '物业',
  '董事',
  '保安',
  '班主任',
  '游戏',
  '直播',
  '火箭',
  '核爆',
  '外星',
  '平行宇宙',
  '穿越',
  '双胞胎',
  '代练',
  '群主',
  '车位',
  'AI',
  '机器人',
  '元宇宙',
  '年会',
  '作业',
]

const PLACES: Array<[string, string]> = [
  ['宿舍', '宿舍'],
  ['办公室', '办公室'],
  ['公司', '办公室'],
  ['教室', '教室'],
  ['学校', '学校'],
  ['地铁', '地铁'],
  ['小区', '小区'],
  ['婚礼', '婚礼现场'],
  ['餐厅', '餐厅'],
  ['直播间', '直播间'],
  ['朋友圈', '朋友圈'],
  ['群', '群聊'],
  ['家', '家里'],
  ['停车场', '停车场'],
  ['医院', '医院'],
  ['健身房', '健身房'],
  ['超市', '超市'],
]

const ROLES: Array<[string, string]> = [
  ['室友', '室友'],
  ['老板', '老板'],
  ['同事', '同事'],
  ['前任', '前任'],
  ['闺蜜', '闺蜜'],
  ['邻居', '邻居'],
  ['婆婆', '婆婆'],
  ['班主任', '班主任'],
  ['外卖员', '外卖员'],
  ['保安', '保安'],
  ['物业', '物业'],
  ['群主', '群主'],
  ['相亲对象', '相亲对象'],
  ['主播', '主播'],
  ['我妈', '我妈'],
  ['我爸', '我爸'],
  ['队友', '队友'],
  ['对象', '对象'],
]

const OBJECTS: Array<[string, string]> = [
  ['小号', '小号'],
  ['外卖', '外卖'],
  ['车位', '车位'],
  ['照片', '照片'],
  ['作业', '作业'],
  ['红包', '红包'],
  ['猫', '猫'],
  ['狗', '狗'],
  ['假发', '假发'],
  ['游戏', '游戏'],
  ['直播', '直播间'],
  ['合同', '合同'],
  ['表情包', '表情包'],
  ['年会', '年会'],
  ['火箭', '火箭'],
  ['螺蛳粉', '螺蛳粉'],
  ['无人机', '无人机'],
  ['密码', '密码'],
  ['摄像头', '摄像头'],
]

const VERBS = ['出道', '破防', '沉默', '申请加班', '连夜改名', '重新做人']

const TITLE_TEMPLATES = [
  (place: string, _role: string, object: string) => `《${place}${object}疑云》`,
  (place: string, role: string, object: string) => `《关于${role}在${place}制造${object}这件事》`,
  (place: string, role: string, object: string) => `《${role}、${object}与${place}风暴》`,
  (place: string, role: string, object: string) => `《${place}惊现${object}，${role}连夜${VERBS[0]}》`,
  (_place: string, _role: string, object: string) => `《${object}疑云：第 2 季》`,
  (place: string, role: string, _object: string) => `《我在${place}围观${role}${VERBS[1]}》`,
]

const LOW_COMMENTS = [
  '本局反复扫描三遍，确认这是一颗安静的小瓜。没有冲突，没有反转，甚至连围观群众都在打哈欠。建议先回去充个电，明天再来。',
  '检测结果显示：瓜很新鲜，但没什么戏。你可以把它当成生活里的一个小气泡，噗一声就没了。',
  '这瓜的含糖量不高，但胜在无害。适合在加班的间隙看一眼，然后继续假装在忙。',
]

const MID_COMMENTS = [
  '这不是惊天大瓜，但胜在火候刚好。人物有情绪，剧情有拐弯，适合在午休时间配一份外卖慢慢品。',
  '本局鉴定：一颗合格的下饭瓜。建议不要站队，先看下一集，毕竟当事人的嘴比剧情快。',
  '有冲突，有误会，还有一点点微妙的沉默。本局给出的结论是：值得围观，但不值得熬夜。',
]

const HIGH_COMMENTS = [
  '经本局鉴定，这不是瓜，是一颗拖着社交尾焰的剧情陨石。人物关系已经打成中国结，建议围观群众退后三步，避免被反转波及。',
  '本局已连续加班三小时，只为确认一件事：这瓜是真的绕。建议立刻申请非物质文化遗产，项目名就叫《当事人的嘴》。',
  '剧情浓度严重超标。鉴定员三次试图下班，都被新的反转按回了椅子上。建议全群静音，给编剧一点掌声。',
]

const NUKE_COMMENTS = [
  '警告：瓜田已进入核爆状态。本局服务器冒烟，鉴定员集体沉默。建议立刻拉响防空警报，并给所有群聊设置免打扰——因为接下来的每一秒都可能产生新剧情。',
  '这不是互联网名场面，这是互联网事故现场。本局已启动紧急预案：一台 486 电脑、两包瓜子、三名加班鉴定员，仍无法解释你到底经历了什么。',
  '系统检测到剧情密度超过 1995 年的硬件上限。本局建议：先备份聊天记录，再关闭所有通知，最后给自己的好奇心放个假。',
]

const ADVICES = [
  '建议搬好小板凳，但先把群消息调成免打扰。',
  '先别站队，等第三集更新，编剧可能还有话说。',
  '可以转发给当事人，观察他几秒内是否在线。',
  '围观可以，别把自己围进去，记得给情绪留个安全出口。',
  '建议准备一包瓜子：这不是吃瓜，这是连续剧点播。',
  '别急着下结论，互联网的下一分钟永远比这一分钟离谱。',
  '现场很精彩，但请保持一米社交距离，防止被剧情误伤。',
]

const NOTE_IDS = ['甲', '乙', '丙', '丁', '戊', '己']

function hashText(text: string): number {
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return Math.abs(hash)
}

function pick<T>(list: T[], seed: number): T {
  return list[seed % list.length]
}

function countHits(text: string, words: string[]): { count: number; hits: string[] } {
  let count = 0
  const hits: string[] = []
  for (const word of words) {
    let from = 0
    let found = false
    while (from < text.length) {
      const at = text.indexOf(word, from)
      if (at === -1) break
      count += 1
      found = true
      from = at + word.length
    }
    if (found) hits.push(word)
  }
  return { count, hits }
}

function countChar(text: string, chars: string): number {
  let total = 0
  for (const char of chars) {
    for (const item of text) {
      if (item === char) total += 1
    }
  }
  return total
}

function detect(text: string, pairs: Array<[string, string]>, fallback: string): string {
  for (const [needle, label] of pairs) {
    if (text.includes(needle)) return label
  }
  return fallback
}

function trimTo(text: string, max: number): string {
  if (text.length <= max) return text
  return `${text.slice(0, max - 1)}…`
}

function splitSentences(text: string): string[] {
  return text
    .split(/[。！？!?；;\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function makeReasons(
  _text: string,
  drama: number,
  twist: number,
  spread: number,
  gossip: number,
  conflictHits: string[],
  twistHits: string[],
  spreadHits: string[],
  absurdCount: number,
  preset: boolean,
): Record<DimensionKey, DimensionResult> {
  const dramaReason =
    conflictHits.length > 0
      ? `检测到 ${conflictHits.length} 类冲突信号（${conflictHits.slice(0, 3).join('、')}），人物之间明显有火花。`
      : '没有直接冲突词，但对话关系里有一种“山雨欲来”的安静。'

  const twistReason =
    twistHits.length > 0
      ? `捕捉到 ${twistHits.length} 类转折标记（${twistHits.slice(0, 3).join('、')}），剧情至少拐了一个弯。`
      : '转折标记稀少，故事走的是直球路线，惊喜主要靠当事人的胆子。'

  const spreadReason =
    spreadHits.length > 0
      ? `出现 ${spreadHits.length} 类传播场景（${spreadHits.slice(0, 3).join('、')}），具备被群众自发扩散的体质。`
      : '传播场景较少，暂时只适合小范围口头转述。'

  const gossipReason = preset
    ? `综合抓马 ${drama}、反转 ${twist}、传播 ${spread}，叠加 ${absurdCount} 处离谱设定；预置案例经人工校准，最终判定 ${gossip} 分。`
    : `综合抓马 ${drama}、反转 ${twist}、传播 ${spread}，并计入 ${absurdCount} 处离谱设定，最终判定 ${gossip} 分。`

  return {
    gossip: { score: gossip, reason: gossipReason },
    drama: { score: drama, reason: dramaReason },
    twist: { score: twist, reason: twistReason },
    spread: { score: spread, reason: spreadReason },
  }
}

interface FeatureScore {
  dimensions: Record<DimensionKey, DimensionResult>
  gossip: number
  tags: string[]
  conflictHits: string[]
  twistHits: string[]
  spreadHits: string[]
  absurdCount: number
}

function scoreFeatures(text: string, preset: PresetCase | undefined, twistBonus = 0): FeatureScore {
  const clean = text.replace(/\s+/g, ' ').trim()
  const seed = hashText(clean)
  const conflict = countHits(clean, CONFLICT_WORDS)
  const twistWords = countHits(clean, TWIST_WORDS)
  const spreadWords = countHits(clean, SPREAD_WORDS)
  const absurdWords = countHits(clean, ABSURD_WORDS)
  const exclam = countChar(clean, '！!')
  const question = countChar(clean, '？?')
  const ellipsis = clean.split('……').length - 1
  const sentenceCount = Math.max(1, splitSentences(clean).length)
  const selfMention = /我|咱|本人/.test(clean) ? 1 : 0
  const lenBonus = Math.min(10, Math.floor(clean.length / 22))
  const jitter = (seed % 9) - 4

  const absurdBonus = Math.min(24, absurdWords.count * 4)
  const rawDrama = clampScore(
    32 + conflict.count * 6.4 + exclam * 2.4 + selfMention * 4 + lenBonus * 0.7 + jitter,
  )
  const rawTwist = clampScore(
    30 + twistWords.count * 5.4 + sentenceCount * 1.9 + question * 1.4 + absurdBonus * 0.5 + jitter,
  )
  const rawSpread = clampScore(
    36 + spreadWords.count * 5.8 + question * 2 + ellipsis * 1.6 + lenBonus + jitter,
  )
  const rawGossip = clampScore(
    20 + rawDrama * 0.32 + rawTwist * 0.28 + rawSpread * 0.22 + absurdBonus * 0.8,
  )

  let drama = rawDrama
  let twist = rawTwist
  let spread = rawSpread
  let gossip = rawGossip

  if (preset) {
    const factor = rawGossip > 0 ? Math.min(2.1, preset.hint / rawGossip) : 1
    drama = clampScore(rawDrama * factor)
    twist = clampScore(rawTwist * factor)
    spread = clampScore(rawSpread * factor)
    gossip = preset.hint
  }

  if (twistBonus > 0) {
    drama = clampScore(drama + twistBonus * 0.4)
    twist = clampScore(twist + twistBonus * 0.8)
    spread = clampScore(spread + twistBonus * 0.45)
    gossip = clampScore(gossip + twistBonus)
  }

  const tags = detectTags(clean, conflict.count, twistWords.count)
  return {
    dimensions: makeReasons(
      clean,
      drama,
      twist,
      spread,
      gossip,
      conflict.hits,
      twistWords.hits,
      spreadWords.hits,
      absurdWords.count,
      Boolean(preset),
    ),
    gossip,
    tags,
    conflictHits: conflict.hits,
    twistHits: twistWords.hits,
    spreadHits: spreadWords.hits,
    absurdCount: absurdWords.count,
  }
}

function detectTags(text: string, conflictCount: number, twistCount: number): string[] {
  const tags: string[] = []
  if (/室友|宿舍|寝室|查寝/.test(text)) tags.push('宿舍风云')
  if (/老板|公司|同事|年会|加班|绩效/.test(text)) tags.push('职场迷惑')
  if (/妈|爸|婆婆|亲戚|相亲|催婚/.test(text)) tags.push('家庭伦理')
  if (/群|朋友圈|热搜|直播|弹幕|微博|网友/.test(text)) tags.push('互联网现场')
  if (/外卖|快递|邻居|小区|物业|车位/.test(text)) tags.push('邻里纠纷')
  if (/游戏|队友|开黑|代练|排位/.test(text)) tags.push('电子竞技')
  if (/老师|班主任|作业|同学|学校/.test(text)) tags.push('校园往事')
  if (conflictCount >= 2) tags.push('火花四溅')
  if (twistCount >= 3) tags.push('反转套娃')
  if (tags.length === 0) tags.push('生活观察')
  return tags.slice(0, 3)
}

function makeTitle(text: string, seed: number): string {
  const place = detect(text, PLACES, '现场')
  const role = detect(text, ROLES, '当事人')
  const object = detect(text, OBJECTS, '谜之物件')
  if (!/[宿舍办公室教室学校地铁小区家里餐厅直播群停车医院健身超市]/.test(text) &&
    !/室友|老板|同事|前任|闺蜜|邻居|婆婆|班主任|外卖员|保安|物业|群主|主播|对象/.test(text)) {
    const generic = [
      '《一个瓜的自我修养》',
      '《我在现场，但我看不懂》',
      '《这瓜保熟吗：未删减版》',
      '《当代互联网迷惑行为观察》',
      '《剧情开始的地方》',
    ]
    return pick(generic, seed)
  }
  const template = TITLE_TEMPLATES[seed % TITLE_TEMPLATES.length]
  return trimTo(template(place, role, object), 26)
}

function makeHighlight(text: string, _seed: number): string {
  const sentences = splitSentences(text)
  if (sentences.length === 0) return '原文过于神秘，连标点都选择了沉默。'
  let best = sentences[0]
  let bestScore = -1
  sentences.forEach((sentence, index) => {
    const hit =
      countHits(sentence, TWIST_WORDS).count * 3 +
      countHits(sentence, ABSURD_WORDS).count * 2 +
      countHits(sentence, CONFLICT_WORDS).count * 2 +
      (index === sentences.length - 1 ? 1 : 0)
    if (hit > bestScore) {
      bestScore = hit
      best = sentence
    }
  })
  return trimTo(best, 86)
}

function makeComment(score: number, seed: number): string {
  const pool =
    score > 95
      ? NUKE_COMMENTS
      : score >= 81
        ? HIGH_COMMENTS
        : score >= 41
          ? MID_COMMENTS
          : LOW_COMMENTS
  return pick(pool, seed)
}

function makePersona(tierScore: number, dims: Record<DimensionKey, DimensionResult>, seed: number): GossipPersona {
  const { drama, twist, spread } = dims
  let persona: GossipPersona

  if (tierScore > 95 || (twist.score >= 78 && twist.score >= drama.score && twist.score >= spread.score)) {
    persona = {
      name: '宇宙级围观专家',
      badge: '宙',
      tagline: '见过大场面，也制造过大场面',
      reason: '反转侦测雷达爆表，普通瓜田已经装不下你的好奇心。',
    }
  } else if (spread.score >= 70 && spread.score >= drama.score && spread.score >= twist.score) {
    persona = {
      name: '互联网情报局局长',
      badge: '情',
      tagline: '消息比你快，截图比你全',
      reason: '传播敏感度极高，任何风吹草动都能被你精准播报。',
    }
  } else if (drama.score >= 66 && drama.score >= twist.score) {
    persona = {
      name: '热闹现场第一排',
      badge: '戏',
      tagline: '自带小板凳，永远不迟到',
      reason: '抓马嗅觉灵敏，哪里有火花，哪里就有你的座位。',
    }
  } else if (tierScore >= 64) {
    persona = {
      name: '瓜田驻地观察员',
      badge: '瓜',
      tagline: '不生产瓜，只是瓜田的搬运工',
      reason: '围观经验丰富，能在一地瓜子壳里看出故事结构。',
    }
  } else {
    persona = {
      name: '理性吃瓜研究员',
      badge: '理',
      tagline: '先让子弹飞，再让瓜子嗑',
      reason: '情绪稳定、判断克制，是瓜田里难得的清醒人。',
    }
  }

  // 用 seed 制造一点无害的称号编号差异，但保持可解释
  if (seed % 5 === 0) {
    persona = {
      ...persona,
      tagline: `${persona.tagline} · 编号 ${NOTE_IDS[seed % NOTE_IDS.length]}`,
    }
  }
  return persona
}

function makeAdvice(seed: number): string {
  return pick(ADVICES, seed)
}

export function analyzeLocal(text: string): GossipAnalysis {
  const clean = text.trim()
  const preset = findPreset(clean)
  const seed = hashText(clean)
  const feature = scoreFeatures(clean, preset)
  const persona = makePersona(feature.gossip, feature.dimensions, seed)
  return {
    id: makeId(),
    story: clean,
    title: makeTitle(clean, seed),
    dimensions: feature.dimensions,
    comment: makeComment(feature.gossip, seed),
    highlight: makeHighlight(clean, seed),
    advice: makeAdvice(seed),
    persona,
    tags: preset ? [preset.category, ...feature.tags].slice(0, 3) : feature.tags,
    source: 'local',
    createdAt: Date.now(),
  }
}

export function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `cg95-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function localEntities(text: string) {
  return {
    place: detect(text, PLACES, '现场'),
    role: detect(text, ROLES, '当事人'),
    object: detect(text, OBJECTS, '那个东西'),
  }
}

const NORMAL_TWISTS = [
  (place: string, role: string, object: string, n: number, season: number) =>
    `就在你以为故事结束时，${role}突然发来一段 60 秒语音。语音里只有一句：“${object}是假的，真的那个现在在${place}等你。”你赶到${place}，发现${role}正带着 ${n} 个人拉好横幅，庆祝“第 ${season} 届${place}整活大赛”开幕。`,
  (place: string, role: string, _object: string, n: number, _season: number) =>
    `第二天，${role}主动在群里道歉，态度诚恳到让人不安。结果道歉信的落款是“${place}全体小号运营中心”。你这才发现，群里除了你，剩下 ${n} 个账号的登录设备全是同一台手机。`,
  (_place: string, role: string, object: string, n: number, season: number) =>
    `你决定不再追究，结果${role}把${object}寄到了你公司。快递盒里还有一张手写纸条：“别声张，这是第 ${season} 季的道具。”落款处画着 ${n} 个一模一样的笑脸。`,
  (place: string, role: string, object: string, _n: number, _season: number) =>
    `事情本来已经平息，直到${place}的监控拍到：凌晨三点，${role}抱着${object}在走廊来回踱步，嘴里念叨“这次一定要让她相信”。第二天他宣布，之前的一切都是新综艺的预热。`,
  (_place: string, role: string, _object: string, _n: number, season: number) =>
    `你刚准备删掉聊天记录，${role}发来一张截图。截图里是你和${role}的聊天记录，但你的头像旁边写着“角色 A”。他说：“别紧张，你只是第 ${season} 季特邀嘉宾。”`,
]

const CHAOS_TWISTS = [
  (place: string, role: string, object: string, n: number, _season: number) =>
    `系统检测到剧情浓度超标：${place}连夜成立“${object}管理局”，${role}任局长，你任唯一嫌疑人。全局 ${n} 名工作人员，全部由${role}的小号兼任。`,
  (place: string, role: string, _object: string, n: number, season: number) =>
    `${role}突然承认了一切，并在${place}召开新闻发布会。现场只有 ${n} 把椅子、一块写着“欢迎来到第 ${season} 季”的背景板，以及一只会按快门的猫。`,
  (place: string, role: string, object: string, _n: number, _season: number) =>
    `你醒来发现全世界都在讨论这件事：热搜第一是“${object}成精”，第二是“${role}其实是 AI”。你打开手机，系统提示：本事件已从现实迁移至${place}服务器，可继续围观，但不可退订。`,
]

export function makeLocalTwist(
  original: string,
  index: number,
  chaos: boolean,
  preset?: PresetCase,
): { story: string; punchline: string } {
  const { place, role, object } = localEntities(original)
  const seed = hashText(`${original}-${index}-${chaos ? 'chaos' : 'normal'}`)
  const n = [7, 12, 18, 27, 47][seed % 5]
  const season = 2 + index

  let story: string
  if (chaos && preset?.chaos[index % preset.chaos.length]) {
    story = preset.chaos[index % preset.chaos.length]
  } else if (!chaos && preset?.twists[index]) {
    story = preset.twists[index]
  } else if (chaos) {
    story = CHAOS_TWISTS[(seed + index) % CHAOS_TWISTS.length](place, role, object, n, season)
  } else {
    const template = NORMAL_TWISTS[(seed + index) % NORMAL_TWISTS.length]
    story = template(place, role, object, n, season)
  }

  if (!preset && index >= NORMAL_TWISTS.length) {
    story += ` 本局补充：这已经是第 ${season} 次修改剧情，编剧表示“再改就要报警了”。`
  }

  const punchline = chaos
    ? '本局提醒：离谱模式已开启，以上内容为 AI 虚构创作，现实若如此，建议直接申请宇宙专利。'
    : '本局提醒：以上剧情为 AI 虚构创作，与真实事件无关，请勿对号入座。'

  return { story, punchline }
}

export interface ScoredTwist {
  dimensions: Record<DimensionKey, DimensionResult>
  score: number
}

export function scoreTwist(text: string, index: number, chaos: boolean): ScoredTwist {
  const bonus = Math.min(28, 6 + index * 4 + (chaos ? 8 : 0))
  const feature = scoreFeatures(text, undefined, bonus)
  return { dimensions: feature.dimensions, score: feature.gossip }
}

export function buildLocalTwist(
  original: string,
  index: number,
  chaos: boolean,
  baseScore: number,
): TwistResult {
  const preset = findPreset(original)
  const { story, punchline } = makeLocalTwist(original, index, chaos, preset)
  const scored = scoreTwist(story, index, chaos)
  return {
    id: makeId(),
    story,
    punchline,
    score: scored.score,
    dimension: scored.dimensions,
    delta: scored.score - baseScore,
    chaos,
    source: 'local',
    createdAt: Date.now(),
  }
}

export function tierFor(score: number) {
  return getTier(score)
}
