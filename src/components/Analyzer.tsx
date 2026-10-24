import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Download,
  FileText,
  FolderOpen,
  HelpCircle,
  Info,
  Monitor,
  Play,
  Printer,
  Radio,
  RefreshCw,
  RotateCcw,
  Satellite,
  Sparkles,
  Trash2,
  Dices,
  Check,
} from 'lucide-react'
import type { GossipAnalysis, PresetCase, TwistResult } from '../types'
import { DIMENSION_META, getTier, scoreBand } from '../lib/tiers'
import { BlockProgress, PixelBadge, RetroButton, WindowFrame } from './Chrome'

const SOURCE_LABEL: Record<GossipAnalysis['source'], string> = {
  ai: 'AI 卫星鉴定',
  local: '演示模拟分析',
  'local-fallback': '本地演示 · AI 失联自动降级',
}

interface AnalyzerProps {
  story: string
  onStoryChange: (value: string) => void
  onAnalyze: (text?: string) => void
  onRandom: () => void
  onPreset: (preset: PresetCase) => void
  onReset: () => void
  analyzing: boolean
  progress: number
  logs: string[]
  analysis: GossipAnalysis | null
  twists: TwistResult[]
  twisting: boolean
  chaos: boolean
  onChaosChange: (value: boolean) => void
  onTwist: (chaos: boolean) => void
  onOpenHistory: () => void
  onOpenHelp: () => void
  onOpenCertificate: () => void
  onClearHistory: () => void
  onAbout: () => void
  onClose: () => void
  onMinimize: () => void
  onMaximize: () => void
  presets: PresetCase[]
  aiEnabled: boolean | null
  aiModel: string
  aiError: boolean
  historyCount: number
  active: boolean
}

function useCountUp(target: number, duration = 850) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    let frame = 0
    const start = performance.now()
    const tick = (now: number) => {
      const ratio = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - ratio, 3)
      setValue(Math.round(target * eased))
      if (ratio < 1) frame = window.requestAnimationFrame(tick)
    }
    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [target, duration])
  return value
}

function formatDateTime(timestamp: number) {
  const date = new Date(timestamp)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function shortCaseNo(id: string) {
  return id.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase()
}

/* ── 菜单栏 ───────────────────────────────────────────────────── */

interface MenuItem {
  label: string
  onClick: () => void
  disabled?: boolean
  divider?: boolean
  shortcut?: string
}

function AppMenu({
  onReset,
  onRandom,
  onAnalyze,
  onOpenHistory,
  onClearHistory,
  onOpenHelp,
  onAbout,
  onOpenCertificate,
  onClose,
  analysis,
  analyzing,
  chaos,
  onChaosChange,
  onTwist,
}: {
  onReset: () => void
  onRandom: () => void
  onAnalyze: () => void
  onOpenHistory: () => void
  onClearHistory: () => void
  onOpenHelp: () => void
  onAbout: () => void
  onOpenCertificate: () => void
  onClose: () => void
  analysis: GossipAnalysis | null
  analyzing: boolean
  chaos: boolean
  onChaosChange: (value: boolean) => void
  onTwist: (chaos: boolean) => void
}) {
  const [open, setOpen] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const close = () => setOpen(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [open])

  const menus: Array<{ id: string; label: string; letter: string; items: MenuItem[] }> = [
    {
      id: 'file',
      label: '文件',
      letter: 'F',
      items: [
        { label: '新建鉴定', onClick: onReset, shortcut: 'N' },
        { label: '随机来一瓜', onClick: onRandom, shortcut: 'R' },
        { divider: true, label: '', onClick: () => undefined },
        { label: '生成鉴定证书', onClick: onOpenCertificate, disabled: !analysis, shortcut: 'P' },
        { label: '关闭鉴定中心', onClick: onClose },
      ],
    },
    {
      id: 'judge',
      label: '鉴定',
      letter: 'A',
      items: [
        { label: '开始鉴定这个瓜', onClick: onAnalyze, disabled: analyzing, shortcut: 'Enter' },
        {
          label: chaos ? '关闭离谱模式' : '开启离谱模式',
          onClick: () => onChaosChange(!chaos),
          disabled: !analysis,
        },
        { label: '再加一点戏', onClick: () => onTwist(chaos), disabled: !analysis, shortcut: 'T' },
      ],
    },
    {
      id: 'archive',
      label: '档案',
      letter: 'H',
      items: [
        { label: '打开我的吃瓜档案', onClick: onOpenHistory, shortcut: 'L' },
        { label: '清空全部档案', onClick: onClearHistory },
      ],
    },
    {
      id: 'help',
      label: '帮助',
      letter: 'H',
      items: [
        { label: '使用说明', onClick: onOpenHelp, shortcut: 'F1' },
        { label: '关于本局', onClick: onAbout },
      ],
    },
  ]

  return (
    <nav className="app-menu-bar" aria-label="窗口菜单">
      {menus.map((menu) => (
        <div className="menu-entry" key={menu.id}>
          <button
            type="button"
            className={`menu-label ${open === menu.id ? 'open' : ''}`}
            onClick={(event) => {
              event.stopPropagation()
              setOpen(open === menu.id ? null : menu.id)
            }}
          >
            {menu.label}(<u>{menu.letter}</u>)
          </button>
          {open === menu.id ? (
            <div className="menu-dropdown">
              {menu.items.map((item, index) =>
                item.divider ? (
                  <div className="menu-separator" key={`sep-${index}`} />
                ) : (
                  <button
                    type="button"
                    key={item.label}
                    className="menu-item"
                    disabled={item.disabled}
                    onClick={() => {
                      setOpen(null)
                      item.onClick()
                    }}
                  >
                    <span>{item.label}</span>
                    {item.shortcut ? <span className="menu-shortcut">{item.shortcut}</span> : null}
                  </button>
                ),
              )}
            </div>
          ) : null}
        </div>
      ))}
    </nav>
  )
}

/* ── 侧栏 ─────────────────────────────────────────────────────── */

function LivePanel({
  aiEnabled,
  aiModel,
  aiError,
  historyCount,
  onOpenHistory,
}: {
  aiEnabled: boolean | null
  aiModel: string
  aiError: boolean
  historyCount: number
  onOpenHistory: () => void
}) {
  return (
    <aside className="live-panel">
      <div className="live-module">
        <div className="live-module-head">
          <span className="live-dot" />
          GOSSIP FEED · 现场监控
        </div>
        <div className="live-terminal">
          <p>
            <span>09:41</span> 吃瓜卫星完成例行扫描
          </p>
          <p>
            <span>09:42</span> 检测到 1 个未鉴定事件
          </p>
          <p>
            <span>09:43</span> 围观群众正在集合…
          </p>
          <p className="live-highlight">
            <span>09:44</span> 请尽快投喂，瓜田不等人
          </p>
        </div>
        <div className="fake-disclaimer">虚构装饰数据 · 不代表真实在线情况</div>
      </div>

      <div className="sticky-note">
        <div className="sticky-pin" />
        <strong>投喂提示</strong>
        <p>越具体，越离谱。写清楚人物、地点，以及那个“结果”。</p>
        <p className="sticky-small">例：室友 / 半夜 / 群里 / 小号</p>
      </div>

      <div className="side-status">
        <div className="side-status-row">
          <span className="side-status-key">AI 卫星</span>
          <span className={`side-status-value ${aiEnabled === false || aiError ? 'offline' : 'online'}`}>
            {aiEnabled === null ? '检测中…' : aiEnabled ? `在线 · ${aiModel}` : '本地演示模式'}
          </span>
        </div>
        <div className="side-status-row">
          <span className="side-status-key">鉴定引擎</span>
          <span className="side-status-value">GOSSIP-CORE v1.0</span>
        </div>
        <div className="side-status-row">
          <span className="side-status-key">本地档案</span>
          <button type="button" className="side-link" onClick={onOpenHistory}>
            {historyCount} 份记录 →
          </button>
        </div>
        {aiError ? (
          <div className="side-status-error">AI 卫星未响应，已自动切换本地演示模型。</div>
        ) : null}
      </div>

      <div className="side-manual">
        <div className="side-manual-title">快速操作手册</div>
        <ol>
          <li>投喂一个瓜</li>
          <li>点击「开始鉴定」</li>
          <li>查看丢人报告</li>
          <li>追加虚构反转</li>
          <li>下载复古证书</li>
        </ol>
      </div>
    </aside>
  )
}

/* ── 评分条 ───────────────────────────────────────────────────── */

function DimensionBar({
  metaKey,
  data,
  index,
}: {
  metaKey: (typeof DIMENSION_META)[number]
  data: { score: number; reason: string }
  index: number
}) {
  const [width, setWidth] = useState(0)
  const value = useCountUp(data.score, 1000 + index * 80)

  useEffect(() => {
    const timer = window.setTimeout(() => setWidth(data.score), 120 + index * 110)
    return () => window.clearTimeout(timer)
  }, [data.score, index])

  return (
    <div className={`dim-row dim-${metaKey.key}`}>
      <div className="dim-head">
        <span className="dim-name">
          {metaKey.label}
          <small>{metaKey.en}</small>
        </span>
        <span className="dim-score">{value}</span>
      </div>
      <div className="dim-track">
        <div className="dim-fill" style={{ width: `${width}%` }}>
          <span className="dim-gloss" />
        </div>
        <div className="dim-ticks" aria-hidden="true">
          {Array.from({ length: 10 }).map((_, tick) => (
            <i key={tick} />
          ))}
        </div>
      </div>
      <div className="dim-hint">
        {metaKey.hint} · {data.reason}
      </div>
    </div>
  )
}

/* ── 鉴定报告 ─────────────────────────────────────────────────── */

function Report({
  analysis,
  onOpenCertificate,
  onReset,
  onOpenHistory,
}: {
  analysis: GossipAnalysis
  onOpenCertificate: () => void
  onReset: () => void
  onOpenHistory: () => void
}) {
  const tier = getTier(analysis.dimensions.gossip.score)
  const band = scoreBand(analysis.dimensions.gossip.score)
  const score = useCountUp(analysis.dimensions.gossip.score, 1200)

  return (
    <section className="report" id="report-anchor">
      <div className="report-ribbon">
        <div className="report-ribbon-left">
          <span className="ribbon-stripe" />
          CASE FILE · 鉴定报告
        </div>
        <div className="report-ribbon-right">
          NO. CG95-{shortCaseNo(analysis.id)} · {formatDateTime(analysis.createdAt)}
        </div>
      </div>

      <div className={`report-grid band-${band}`}>
        <div className="score-card">
          <div className="score-card-top">
            <span>吃瓜总评分</span>
            <span className="score-card-en">GOSSIP SCORE</span>
          </div>
          <div className="score-number">
            <span>{score}</span>
            <small>/ 100</small>
          </div>
          <div className="score-meter">
            <div className="score-meter-track">
              {Array.from({ length: 27 }).map((_, index) => (
                <i
                  key={index}
                  className={index < Math.round((score / 100) * 27) ? 'lit' : ''}
                  style={{ background: index < Math.round((score / 100) * 27) ? tier.color : undefined }}
                />
              ))}
            </div>
            <div className="score-meter-scale">
              <span>0</span>
              <span>50</span>
              <span>100</span>
            </div>
          </div>
          <div className="tier-block">
            <div className="tier-code">{tier.code}</div>
            <div className="tier-name" style={{ color: tier.color }}>
              {tier.name}
            </div>
            <div className="tier-desc">{tier.description}</div>
          </div>
          <div className="score-stamp" style={{ color: tier.color, borderColor: tier.color }}>
            已鉴定
          </div>
        </div>

        <div className="report-main">
          <div className="case-title-row">
            <div>
              <div className="case-label">事件代号</div>
              <h2 className="case-title">{analysis.title}</h2>
            </div>
            <div className="case-tags">
              {analysis.tags.map((tag) => (
                <span key={tag} className="case-tag">
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          <div className="opinion-box">
            <div className="opinion-head">
              <span className="opinion-label">
                <Sparkles size={13} /> AI 鉴定意见
              </span>
              <span className={`source-badge source-${analysis.source}`}>{SOURCE_LABEL[analysis.source]}</span>
            </div>
            <p>{analysis.comment}</p>
          </div>

          <div className="report-duo">
            <div className="mini-card">
              <div className="mini-card-title">
                <AlertTriangle size={13} /> 最离谱之处
              </div>
              <p>{analysis.highlight}</p>
            </div>
            <div className="mini-card">
              <div className="mini-card-title">
                <Info size={13} /> 围观建议
              </div>
              <p>{analysis.advice}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="dimensions-panel">
        <div className="dimensions-head">
          <span>多维评分 · SCORE MATRIX</span>
          <span className="dimensions-note">分数由文本特征与剧情浓度计算，仅供娱乐</span>
        </div>
        <div className="dimensions-list">
          {DIMENSION_META.map((meta, index) => (
            <DimensionBar
              key={meta.key}
              metaKey={meta}
              data={analysis.dimensions[meta.key]}
              index={index}
            />
          ))}
        </div>
      </div>

      <div className="persona-panel">
        <PixelBadge text={analysis.persona.badge} size="lg" />
        <div className="persona-copy">
          <div className="persona-eyebrow">本次吃瓜人格鉴定</div>
          <div className="persona-name">{analysis.persona.name}</div>
          <div className="persona-tagline">{analysis.persona.tagline}</div>
          <div className="persona-reason">{analysis.persona.reason}</div>
        </div>
        <div className="persona-note">
          趣味游戏结果
          <br />
          不构成人格评估
        </div>
      </div>

      <div className="report-footer">
        <div className="report-disclaimer">
          <strong>免责声明</strong>
          <span>
            本报告仅用于娱乐，不判断事件真实性，不评价任何当事人。请勿对号入座，更不要拿它去和人对线。
          </span>
        </div>
        <div className="report-actions">
          <RetroButton icon={<RotateCcw size={14} />} onClick={onReset}>
            再鉴定一个
          </RetroButton>
          <RetroButton icon={<FolderOpen size={14} />} onClick={onOpenHistory}>
            打开档案
          </RetroButton>
          <RetroButton className="btn-accent" icon={<Download size={14} />} onClick={onOpenCertificate}>
            生成吃瓜证书
          </RetroButton>
        </div>
      </div>
    </section>
  )
}

/* ── 反转卡片 ─────────────────────────────────────────────────── */

function TwistCard({
  twist,
  index,
  baseScore,
}: {
  twist: TwistResult
  index: number
  baseScore: number
}) {
  const delta = twist.score - baseScore
  const scoreValue = useCountUp(twist.score, 700)
  return (
    <article className={`twist-card ${twist.chaos ? 'is-chaos' : ''}`}>
      <div className="twist-card-head">
        <div className="twist-label">
          <span className="fiction-stamp">FICTION</span>
          <span>AI 虚构创作 · 第 {index + 1} 次反转</span>
        </div>
        <div className={`twist-delta ${delta >= 0 ? 'up' : 'down'}`}>
          {delta >= 0 ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
          {delta >= 0 ? '+' : ''}
          {delta} <small>较原始分</small>
        </div>
      </div>
      <p className="twist-story">{twist.story}</p>
      {twist.punchline ? <p className="twist-punchline">// {twist.punchline}</p> : null}
      <div className="twist-score-row">
        <div className="twist-score">
          <span>新热闹指数</span>
          <strong>{scoreValue}</strong>
          <small>/100</small>
        </div>
        <div className="twist-dims">
          <span>抓马 {twist.dimension.drama.score}</span>
          <span>反转 {twist.dimension.twist.score}</span>
          <span>传播 {twist.dimension.spread.score}</span>
        </div>
        <div className="twist-source">
          <span className={`source-badge source-${twist.source === 'ai' ? 'ai' : 'local'}`}>
            {twist.source === 'ai' ? 'AI 编剧' : '演示模拟'}
          </span>
          <span className="twist-chaos-tag">{twist.chaos ? '离谱模式' : '标准模式'}</span>
        </div>
      </div>
    </article>
  )
}

function SirenOverlay({ chaos, count }: { chaos: boolean; count: number }) {
  return (
    <div className="siren-overlay" role="alert" aria-live="assertive">
      <div className="siren-stripes" aria-hidden="true" />
      <div className="siren-card">
        <div className="siren-beacons" aria-hidden="true">
          <span />
          <span />
        </div>
        <div className="siren-icon">
          <AlertTriangle size={42} strokeWidth={2.4} />
        </div>
        <h3>WARNING · 剧情重构中</h3>
        <p>AI 编剧正在加班，把现实拧成麻花……</p>
        <div className="siren-progress">
          <span />
        </div>
        <div className="siren-meta">
          正在生成第 {count + 1} 段虚构剧情 {chaos ? '· 离谱模式已开启' : '· 标准模式'}
        </div>
        <small>所有反转都会明确标注为虚构创作，请勿当作真实爆料。</small>
      </div>
    </div>
  )
}

/* ── 主窗口内容 ───────────────────────────────────────────────── */

export function Analyzer(props: AnalyzerProps) {
  const {
    story,
    onStoryChange,
    onAnalyze,
    onRandom,
    onPreset,
    onReset,
    analyzing,
    progress,
    logs,
    analysis,
    twists,
    twisting,
    chaos,
    onChaosChange,
    onTwist,
    onOpenHistory,
    onOpenHelp,
    onOpenCertificate,
    onClearHistory,
    onAbout,
    onClose,
    onMinimize,
    onMaximize,
    presets,
    aiEnabled,
    aiModel,
    aiError,
    historyCount,
    active,
  } = props

  const terminalRef = useRef<HTMLDivElement | null>(null)
  const aiModeLabel = useMemo(() => {
    if (aiEnabled === null) return '卫星检测中'
    if (aiEnabled) return `AI 卫星在线 · ${aiModel}`
    return '本地演示模式 · 无需联网'
  }, [aiEnabled, aiModel])

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [logs])

  return (
    <WindowFrame
      title="CYBER GOSSIP 95.EXE — 互联网热闹程度鉴定中心"
      icon={<Monitor size={13} strokeWidth={2.4} />}
      className="main-window"
      active={active}
      onClose={onClose}
      onHelp={onOpenHelp}
      onMinimize={onMinimize}
      onMaximize={onMaximize}
      footer={
        <div className="win-statusbar">
          <span className="status-cell status-main">
            {analyzing
              ? '正在鉴定…'
              : analysis
                ? `已鉴定 · ${analysis.title.replace(/[《》]/g, '')}`
                : '就绪 · 等待投喂'}
          </span>
          <span className="status-cell">{aiModeLabel}</span>
          <span className="status-cell">档案 {historyCount} 份</span>
          <span className="status-cell status-key">CAPS</span>
          <span className="status-cell status-key">NUM</span>
          <span className="status-cell status-key">SCRL</span>
        </div>
      }
    >
      <AppMenu
        onReset={onReset}
        onRandom={onRandom}
        onAnalyze={() => onAnalyze()}
        onOpenHistory={onOpenHistory}
        onClearHistory={onClearHistory}
        onOpenHelp={onOpenHelp}
        onAbout={onAbout}
        onOpenCertificate={onOpenCertificate}
        onClose={onClose}
        analysis={analysis}
        analyzing={analyzing}
        chaos={chaos}
        onChaosChange={onChaosChange}
        onTwist={onTwist}
      />

      <div className="app-scroll">
        <header className="masthead">
          <div className="masthead-left">
            <div className="cg-mark" aria-hidden="true">
              <span className="cg-mark-95">95</span>
              <span className="cg-mark-cg">CG</span>
            </div>
            <div>
              <div className="masthead-kicker">GUA-TECH SYSTEMS PRESENTS</div>
              <h1 className="masthead-title">
                CYBER GOSSIP <span>95</span>
              </h1>
              <p className="masthead-sub">赛博吃瓜鉴定局 · 世界很乱，先吃个瓜。</p>
            </div>
          </div>
          <div className="masthead-right">
            <div className={`masthead-sat ${aiEnabled === false || aiError ? 'is-local' : ''}`}>
              <Satellite size={14} />
              {aiEnabled === false || aiError ? 'LOCAL DEMO ENGINE' : 'AI SATELLITE ONLINE'}
            </div>
            <div className="masthead-edition">1995 EDITION / 2026 AI INSIDE</div>
            <div className="masthead-reg">REG. NO. GUA-95-0001</div>
          </div>
          <div className="masthead-ticker">
            <div className="ticker-track">
              ★ 本局提醒：吃瓜不规范，亲友两行泪&nbsp;&nbsp;&nbsp;★ 所有评分仅供娱乐，不构成任何评价&nbsp;&nbsp;&nbsp;★ 在线围观人数为虚构装饰数字&nbsp;&nbsp;&nbsp;★ 请勿将 AI
              虚构反转当作真实爆料&nbsp;&nbsp;&nbsp;★ 今日瓜田营业中&nbsp;&nbsp;&nbsp;
            </div>
          </div>
        </header>

        <div className="tool-strip">
          <RetroButton icon={<RefreshCw size={14} />} onClick={onReset}>
            新建鉴定
          </RetroButton>
          <RetroButton icon={<Dices size={14} />} onClick={onRandom}>
            随机来一瓜
          </RetroButton>
          <RetroButton icon={<FolderOpen size={14} />} onClick={onOpenHistory}>
            我的吃瓜档案
          </RetroButton>
          <RetroButton icon={<FileText size={14} />} onClick={onOpenCertificate} disabled={!analysis}>
            生成证书
          </RetroButton>
          <div className="tool-spacer" />
          <div className={`tool-status ${aiEnabled === false || aiError ? 'local' : ''}`}>
            <span className="tool-status-led" />
            {aiModeLabel}
          </div>
        </div>

        <div className="workspace">
          <div className="intake-column">
            <section className={`intake-panel ${analyzing ? 'is-busy' : ''}`}>
              <div className="section-label">
                <span className="section-num">01</span>
                <span className="section-title">投喂一个瓜</span>
                <span className="section-en">FEED THE GOSSIP</span>
              </div>

              <label className="input-label" htmlFor="gossip-input">
                把你遇到的离谱事件写在这里。真实性不重要，离谱程度很重要。
              </label>
              <div className="textarea-shell">
                <textarea
                  id="gossip-input"
                  className="gossip-input"
                  value={story}
                  maxLength={800}
                  placeholder="例如：室友半夜偷偷打游戏，我在宿舍群里吐槽，结果发现群主居然是他的小号。"
                  onChange={(event) => onStoryChange(event.target.value)}
                  onKeyDown={(event) => {
                    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                      event.preventDefault()
                      onAnalyze()
                    }
                  }}
                  disabled={analyzing}
                  spellCheck={false}
                />
                <div className="textarea-meta">
                  <span>
                    <kbd>Ctrl</kbd> + <kbd>Enter</kbd> 快速鉴定
                  </span>
                  <span className={story.length > 700 ? 'char-warn' : ''}>{story.length} / 800</span>
                </div>
              </div>

              <div className="preset-row">
                <span className="preset-label">不知道写什么？试试这些瓜：</span>
                <div className="preset-chips">
                  {presets.map((preset) => (
                    <button
                      type="button"
                      key={preset.id}
                      className={`preset-chip ${story === preset.story ? 'selected' : ''}`}
                      onClick={() => onPreset(preset)}
                      title={preset.story}
                      disabled={analyzing}
                    >
                      <span className="preset-cat">{preset.category}</span>
                      <span className="preset-preview">{preset.story.slice(0, 14)}…</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="intake-actions">
                <div className="intake-note">
                  你的内容仅在浏览器与服务端临时处理，不会自动公开或上传到公共数据库。
                </div>
                <button
                  type="button"
                  className="analyze-btn"
                  onClick={() => onAnalyze()}
                  disabled={analyzing}
                >
                  <Play size={17} fill="currentColor" />
                  <span>{analyzing ? '正在鉴定…' : '开始鉴定这个瓜'}</span>
                  <ArrowRight size={18} />
                </button>
              </div>

              {analyzing ? (
                <div className="analysis-progress">
                  <div className="progress-top">
                    <div className="radar" aria-hidden="true">
                      <div className="radar-sweep" />
                      <span className="radar-dot dot-a" />
                      <span className="radar-dot dot-b" />
                    </div>
                    <div className="progress-terminal">
                      <div className="terminal-head">
                        <span>GOSSIP-SAT.TERMINAL</span>
                        <span>COM2 · 9600 BPS</span>
                      </div>
                      <div className="terminal-body" ref={terminalRef}>
                        {logs.map((log, index) => (
                          <div
                            key={`${log}-${index}`}
                            className={index === logs.length - 1 ? 'terminal-current' : ''}
                          >
                            <span className="terminal-prompt">&gt;</span> {log}
                          </div>
                        ))}
                        <span className="terminal-cursor">█</span>
                      </div>
                    </div>
                  </div>
                  <BlockProgress value={progress} label="鉴定进度" />
                  <div className="progress-caption">
                    <span>正在连接吃瓜卫星，请勿关闭窗口…</span>
                    <span>EST. 1995 · RELIABILITY 99.9%</span>
                  </div>
                </div>
              ) : null}
            </section>

            <LivePanel
              aiEnabled={aiEnabled}
              aiModel={aiModel}
              aiError={aiError}
              historyCount={historyCount}
              onOpenHistory={onOpenHistory}
            />
          </div>

          <div className="report-column">
            {!analysis && !analyzing ? (
              <div className="empty-report">
                <div className="empty-report-inner">
                  <div className="empty-icon">
                    <Radio size={30} />
                    <span className="empty-radar" />
                  </div>
                  <h3>等待一个值得围观的瓜</h3>
                  <p>
                    左侧输入任意事件，或点击「随机来一瓜」。本局将分析它的戏剧性、反转程度与围观价值，并出具一份不太严肃的鉴定报告。
                  </p>
                  <div className="empty-features">
                    <span><Check size={12} /> 多维评分</span>
                    <span><Check size={12} /> 剧情反转</span>
                    <span><Check size={12} /> 人格鉴定</span>
                    <span><Check size={12} /> 复古证书</span>
                  </div>
                  <div className="empty-stamp">NO GOSSIP DETECTED</div>
                </div>
              </div>
            ) : null}

            {analysis && !analyzing ? (
              <>
                <Report
                  analysis={analysis}
                  onOpenCertificate={onOpenCertificate}
                  onReset={onReset}
                  onOpenHistory={onOpenHistory}
                />

                <section className={`twist-zone ${twisting ? 'busy' : ''}`}>
                  <div className="twist-zone-head">
                    <div>
                      <div className="section-label compact">
                        <span className="section-num">02</span>
                        <span className="section-title">剧情反转模拟器</span>
                        <span className="section-en">FICTION ENGINE</span>
                      </div>
                      <p className="twist-intro">
                        故事不够刺激？让 AI 在原有剧情上续写一段明确标注为虚构的反转，并重新计算娱乐评分。
                      </p>
                    </div>
                    <label className="retro-checkbox">
                      <input
                        type="checkbox"
                        checked={chaos}
                        onChange={(event) => onChaosChange(event.target.checked)}
                      />
                      <span className="retro-checkbox-box" aria-hidden="true">
                        {chaos ? <Check size={11} strokeWidth={3.5} /> : null}
                      </span>
                      <span className="retro-checkbox-label">
                        离谱模式
                        <small>CHAOS</small>
                      </span>
                    </label>
                  </div>

                  <div className="twist-cta-row">
                    <button
                      type="button"
                      className="twist-btn"
                      onClick={() => onTwist(chaos)}
                      disabled={twisting}
                    >
                      <Sparkles size={18} />
                      <span>{twisting ? '正在重写现实…' : '剧情不够刺激？再加一点戏！'}</span>
                      <span className="twist-btn-alt">T</span>
                    </button>
                    <div className="twist-warning">
                      <AlertTriangle size={13} />
                      所有反转均为 AI 虚构创作，与真实事件无关
                    </div>
                  </div>

                  {twists.length === 0 ? (
                    <div className="twist-placeholder">
                      <span className="placeholder-marker">[ ]</span>
                      反转记录将在这里按集数排列。每生成一次，评分都会基于新剧情重新计算。
                    </div>
                  ) : (
                    <div className="twist-list">
                      {twists.map((twist, index) => (
                        <TwistCard
                          key={twist.id}
                          twist={twist}
                          index={index}
                          baseScore={analysis.dimensions.gossip.score}
                        />
                      ))}
                      <div className="twist-actions">
                        <RetroButton
                          icon={<Printer size={14} />}
                          onClick={onOpenCertificate}
                        >
                          用当前分数生成证书
                        </RetroButton>
                        <RetroButton
                          icon={<Trash2 size={14} />}
                          onClick={onReset}
                        >
                          换一个瓜
                        </RetroButton>
                        <span className="twist-count">
                          已生成 {twists.length} 段虚构剧情 · 最高新分 {Math.max(...twists.map((item) => item.score))}
                        </span>
                      </div>
                    </div>
                  )}
                </section>
              </>
            ) : null}

            {analyzing ? (
              <div className="analyzing-sheet">
                <div className="analyzing-sheet-title">鉴定进行中</div>
                <div className="analyzing-bars">
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
                <p>吃瓜卫星正在扫描事件中的抓马粒子，请保持围观姿势。</p>
                <div className="analyzing-score">SCORE PENDING</div>
              </div>
            ) : null}
          </div>
        </div>

        <footer className="page-footer">
          <span>CYBER GOSSIP 95 · 赛博吃瓜鉴定局</span>
          <span>所有评分与反转均为娱乐内容 · 不判断真实性 · 不评价当事人</span>
          <button type="button" className="footer-link" onClick={onOpenHelp}>
            <HelpCircle size={12} /> 使用说明
          </button>
          <span className="footer-fake">在线围观人数为虚构装饰数字</span>
        </footer>
      </div>

      {twisting ? <SirenOverlay chaos={chaos} count={twists.length} /> : null}
    </WindowFrame>
  )
}
