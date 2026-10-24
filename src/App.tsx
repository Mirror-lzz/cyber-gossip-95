import { useCallback, useEffect, useRef, useState } from 'react'
import {
  FileText,
  FolderOpen,
  HelpCircle,
  Info,
  Monitor,
  Power,
} from 'lucide-react'
import { Analyzer } from './components/Analyzer'
import { BootScreen } from './components/BootScreen'
import { CertificateModal } from './components/Certificate'
import { AlertDialog, DesktopIcons, DESKTOP_ICON_GLYPHS, StartMenu, Taskbar } from './components/Chrome'
import type { DialogConfig, StartMenuAction } from './components/Chrome'
import { HistoryWindow, HelpWindow } from './components/SideWindows'
import { PRESETS } from './data/presets'
import { analyzeLocal, buildLocalTwist, scoreTwist } from './lib/engine'
import {
  fetchHealth,
  makeAiSourcedTwist,
  requestAiAnalysis,
  requestAiTwist,
} from './lib/api'
import type { AiHealth } from './lib/api'
import {
  clearHistory,
  loadHistory,
  loadPrefs,
  pushHistory,
  saveHistory,
  savePrefs,
} from './lib/storage'
import { primeAudio, sfx } from './lib/sound'
import type { GossipAnalysis, HistoryRecord, PresetCase, TwistResult } from './types'

const delay = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error('请求超时，卫星没有回应')), ms)
    }),
  ])
}

const ANALYSIS_STEPS = [
  '正在连接吃瓜卫星……',
  '正在收集围观群众……',
  '正在分析剧情离谱程度……',
  '正在计算瓜田震荡指数……',
]

type FocusWindow = 'main' | 'history' | 'help' | 'cert'

export default function App() {
  const prefs = useRef(loadPrefs()).current
  const [soundOn, setSoundOn] = useState(prefs.sound)
  const [crtOn, setCrtOn] = useState(prefs.crt)
  const [booting, setBooting] = useState(true)
  const [mainOpen, setMainOpen] = useState(true)
  const [focusWindow, setFocusWindow] = useState<FocusWindow>('main')

  const [story, setStory] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [logs, setLogs] = useState<string[]>([])
  const [analysis, setAnalysis] = useState<GossipAnalysis | null>(null)
  const [twists, setTwists] = useState<TwistResult[]>([])
  const [twisting, setTwisting] = useState(false)
  const [chaos, setChaos] = useState(false)

  const [health, setHealth] = useState<AiHealth | null>(null)
  const [aiError, setAiError] = useState(false)
  const [history, setHistory] = useState<HistoryRecord[]>(loadHistory)
  const [online, setOnline] = useState(2048)

  const [historyOpen, setHistoryOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [certOpen, setCertOpen] = useState(false)
  const [startOpen, setStartOpen] = useState(false)
  const [dialog, setDialog] = useState<DialogConfig | null>(null)
  const [toast, setToast] = useState('')

  const analyzingRef = useRef(false)

  const play = useCallback(
    (name: keyof typeof sfx) => {
      if (!soundOn) return
      try {
        sfx[name]()
      } catch {
        /* 音效失败不影响主流程 */
      }
    },
    [soundOn],
  )

  /* ── 启动与基础状态 ─────────────────────────────────────── */

  const handleBootDone = useCallback(() => {
    setBooting(false)
    if (soundOn) {
      try {
        sfx.boot()
      } catch {
        /* noop */
      }
    }
    setDialog({
      title: '欢迎进入赛博吃瓜鉴定局',
      tone: 'info',
      message: (
        <>
          <strong>世界很乱，先吃个瓜。</strong>
          <br />
          <br />
          这里是 1995 年成立的互联网热闹程度鉴定中心。投喂一段离谱事件，本局将为你出具一份
          <em>不太严肃、但很有依据</em>的鉴定报告。
          <br />
          <br />
          核心业务：多维评分 · 剧情反转 · 吃瓜人格 · 复古证书。
        </>
      ),
      note: 'CYBER GOSSIP 95 · EST. 1995 · 所有评分仅供娱乐',
      actions: [
        {
          label: '先看说明',
          onClick: () => {
            setDialog(null)
            setHelpOpen(true)
            setFocusWindow('help')
          },
        },
        { label: '直接开吃', primary: true, onClick: () => setDialog(null) },
      ],
    })
  }, [soundOn])

  useEffect(() => {
    let cancelled = false
    fetchHealth()
      .then((result) => {
        if (!cancelled) setHealth(result)
      })
      .catch(() => {
        if (!cancelled) {
          setHealth({ aiEnabled: false, model: 'local-demo-v1.0' })
          setAiError(true)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    savePrefs({ sound: soundOn, crt: crtOn })
  }, [soundOn, crtOn])

  useEffect(() => {
    if (!soundOn) return
    const handler = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (
        target?.closest(
          'button, .desktop-icon, .preset-chip, .start-menu-item, .menu-item, .menu-label, .side-link',
        )
      ) {
        try {
          sfx.click()
        } catch {
          /* noop */
        }
      }
    }
    document.addEventListener('click', handler, true)
    return () => document.removeEventListener('click', handler, true)
  }, [soundOn])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setOnline((value) => {
        const drift = Math.round((Math.random() - 0.45) * 64)
        return Math.max(1919, Math.min(9999, value + drift))
      })
    }, 6500)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 4600)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (dialog) {
        setDialog(null)
        return
      }
      if (certOpen) {
        setCertOpen(false)
        setFocusWindow('main')
        return
      }
      if (helpOpen) {
        setHelpOpen(false)
        setFocusWindow('main')
        return
      }
      if (historyOpen) {
        setHistoryOpen(false)
        setFocusWindow('main')
        return
      }
      if (startOpen) setStartOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [dialog, certOpen, helpOpen, historyOpen, startOpen])

  /* ── 鉴定流程 ───────────────────────────────────────────── */

  const scrollToReport = (selector = '#report-anchor') => {
    window.setTimeout(() => {
      const target = document.querySelector(selector)
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 180)
  }

  const syncHistoryTwists = (id: string, nextTwists: TwistResult[]) => {
    setHistory((previous) => {
      const next = previous.map((record) =>
        record.id === id ? { ...record, twists: nextTwists } : record,
      )
      saveHistory(next)
      return next
    })
  }

  const handleAnalyze = async (textOverride?: string) => {
    if (analyzingRef.current) return
    const text = (textOverride ?? story).trim()
    if (!text) {
      play('error')
      setDialog({
        title: '警告',
        tone: 'warning',
        message: (
          <>
            <strong>警告：检测不到瓜。</strong>
            <br />
            <br />
            请先在输入框投喂一个事件，再让本局开工。空输入会被系统判定为「空气瓜」，不纳入评分。
          </>
        ),
        note: 'ERROR 95-G: GOSSIP_NOT_FOUND',
        actions: [{ label: '我去投喂', primary: true, onClick: () => setDialog(null) }],
      })
      return
    }

    analyzingRef.current = true
    setStory(text)
    setAnalyzing(true)
    setAnalysis(null)
    setTwists([])
    setCertOpen(false)
    setProgress(0)
    setLogs([])
    setAiError(false)
    setMainOpen(true)
    setFocusWindow('main')
    play('open')

    const started = Date.now()
    const localResult = analyzeLocal(text)
    const aiAttempt: Promise<{ result?: GossipAnalysis; error?: string }> =
      health?.aiEnabled
        ? withTimeout(requestAiAnalysis(text, localResult), 18000)
            .then((result) => ({ result }))
            .catch((error: Error) => ({ error: error.message }))
        : Promise.resolve({ error: '本地演示模式' })

    const steps = [...ANALYSIS_STEPS]
    if (health?.aiEnabled) steps.push('正在校验 AI 卫星回传报告……')

    try {
      for (let index = 0; index < steps.length; index += 1) {
        setLogs((previous) => [...previous, steps[index]])
        setProgress(Math.round(((index + 1) / steps.length) * 86))
        await delay(360)
      }
      setProgress(92)

      let result = localResult
      let failure = ''
      if (health?.aiEnabled) {
        const attempt = await aiAttempt
        if (attempt.result) {
          result = attempt.result
        } else {
          failure = attempt.error || 'AI 卫星未响应'
          result = { ...localResult, source: 'local-fallback' }
          setAiError(true)
        }
      }

      const remaining = 2450 - (Date.now() - started)
      if (remaining > 0) await delay(remaining)

      setProgress(100)
      setLogs((previous) => [...previous, '鉴定完成！'])
      await delay(240)
      setAnalysis(result)
      setAnalyzing(false)
      const record: HistoryRecord = {
        id: result.id,
        createdAt: Date.now(),
        analysis: result,
        twists: [],
      }
      setHistory(pushHistory(record))
      play(result.dimensions.gossip.score > 95 ? 'alert' : 'success')
      if (failure) setToast(`AI 卫星失联：${failure}。已自动切换本地演示模式。`)
      scrollToReport()

      if (result.dimensions.gossip.score > 95) {
        window.setTimeout(() => {
          play('alert')
          setDialog({
            title: '严重警告',
            tone: 'error',
            message: (
              <>
                <strong>严重警告：瓜田即将发生核爆。</strong>
                <br />
                <br />
                本局 486 主机温度已达 95°C，鉴定员正在抱头撤离。建议立即停止投喂，并给所有群聊设置免打扰。
              </>
            ),
            note: 'SYSTEM ALERT 95-NUKE · 本提示纯属娱乐',
            actions: [
              {
                label: '紧急围观',
                primary: true,
                onClick: () => {
                  setDialog(null)
                  setToast('你选择了紧急围观。鉴定局对此表示理解，并递来一把瓜子。')
                },
              },
              {
                label: '重启系统',
                onClick: () => {
                  setDialog(null)
                  setBooting(true)
                  setCertOpen(false)
                  setHistoryOpen(false)
                  setHelpOpen(false)
                },
              },
            ],
          })
        }, 620)
      }
    } finally {
      analyzingRef.current = false
      setAnalyzing(false)
      setProgress((value) => (value >= 100 ? 100 : value))
    }
  }

  const handleTwist = async (chaosMode: boolean) => {
    if (!analysis || twisting) return
    setTwisting(true)
    play('alert')
    const index = twists.length
    const baseScore = analysis.dimensions.gossip.score
    let result = buildLocalTwist(analysis.story, index, chaosMode, baseScore)
    let failure = ''

    if (health?.aiEnabled) {
      try {
        const aiStory = await withTimeout(requestAiTwist(analysis.story, index, chaosMode), 20000)
        const scored = scoreTwist(aiStory.story, index, chaosMode)
        result = makeAiSourcedTwist(
          aiStory.story,
          aiStory.punchline,
          index,
          chaosMode,
          scored.score,
          scored.dimensions,
          baseScore,
        )
      } catch (error) {
        failure = error instanceof Error ? error.message : 'AI 编剧失联'
        setAiError(true)
      }
    }

    await delay(900)
    const nextTwists = [...twists, result]
    setTwists(nextTwists)
    syncHistoryTwists(analysis.id, nextTwists)
    setTwisting(false)
    play(result.score > 95 ? 'alert' : 'success')
    if (failure) setToast(`AI 编剧失联：${failure}。已使用本地虚构引擎续写。`)
  }

  /* ── 各类打开 / 重开操作 ─────────────────────────────────── */

  const openMain = () => {
    setMainOpen(true)
    setFocusWindow('main')
    play('open')
  }

  const handleReset = () => {
    if (analyzing) return
    setStory('')
    setAnalysis(null)
    setTwists([])
    setLogs([])
    setProgress(0)
    setChaos(false)
    setCertOpen(false)
    setMainOpen(true)
    setFocusWindow('main')
    window.setTimeout(() => {
      document.querySelector('.app-scroll')?.scrollTo({ top: 0, behavior: 'smooth' })
      document.getElementById('gossip-input')?.focus()
    }, 80)
  }

  const handlePreset = (preset: PresetCase) => {
    if (analyzing) return
    setStory(preset.story)
    setAnalysis(null)
    setTwists([])
    setCertOpen(false)
    setMainOpen(true)
    setFocusWindow('main')
    setToast(`已填入「${preset.category}」案例，点击「开始鉴定这个瓜」即可开吃。`)
    window.setTimeout(() => {
      document.querySelector('.app-scroll')?.scrollTo({ top: 0, behavior: 'smooth' })
      document.getElementById('gossip-input')?.focus()
    }, 80)
  }

  const handleRandom = () => {
    if (analyzing) return
    const candidates = PRESETS.filter((preset) => preset.story !== story)
    const pool = candidates.length > 0 ? candidates : PRESETS
    handlePreset(pool[Math.floor(Math.random() * pool.length)])
  }

  const openHistory = () => {
    setHistory(loadHistory())
    setHistoryOpen(true)
    setFocusWindow('history')
    play('open')
  }

  const openHelp = () => {
    setHelpOpen(true)
    setFocusWindow('help')
    play('open')
  }

  const openCertificate = () => {
    if (!analysis) {
      setDialog({
        title: '提示',
        tone: 'info',
        message: '还没有鉴定报告。先投喂一个瓜，证书才有内容可以盖章。',
        actions: [{ label: '去投喂', primary: true, onClick: () => setDialog(null) }],
      })
      return
    }
    setCertOpen(true)
    setFocusWindow('cert')
    play('open')
  }

  const handleReopenRecord = (record: HistoryRecord) => {
    setAnalysis(record.analysis)
    setTwists(record.twists)
    setStory(record.analysis.story)
    setChaos(record.twists.length > 0 ? record.twists[record.twists.length - 1].chaos : false)
    setHistoryOpen(false)
    setMainOpen(true)
    setFocusWindow('main')
    play('open')
    setToast('已从档案中恢复这份鉴定报告。')
    scrollToReport()
  }

  const handleClearHistory = () => {
    if (history.length === 0) {
      setToast('档案本来就是空的，连瓜皮都没剩下。')
      return
    }
    setDialog({
      title: '清空吃瓜档案',
      tone: 'warning',
      message: (
        <>
          确定要清空本机保存的 <strong>{history.length} 份</strong>鉴定记录吗？
          <br />
          <br />
          此操作不可撤销，但不会影响当前正在查看的报告。
        </>
      ),
      actions: [
        { label: '取消', onClick: () => setDialog(null) },
        {
          label: '确认清空',
          primary: true,
          onClick: () => {
            clearHistory()
            setHistory([])
            setDialog(null)
            setToast('档案已清空，瓜田恢复出厂设置。')
            play('error')
          },
        },
      ],
    })
  }

  const handleCloseMain = () => {
    setDialog({
      title: '关闭鉴定中心',
      tone: 'question',
      message: (
        <>
          确定要关闭鉴定中心吗？
          <br />
          <br />
          桌面上的瓜还没有鉴定完，围观群众也在等你。
        </>
      ),
      actions: [
        { label: '继续吃瓜', primary: true, onClick: () => setDialog(null) },
        {
          label: '狠心关闭',
          onClick: () => {
            setDialog(null)
            setMainOpen(false)
            play('error')
            setToast('窗口已关闭。双击桌面上的「吃瓜鉴定中心」可以重新打开。')
          },
        },
      ],
    })
  }

  const handleMinimize = () => {
    setMainOpen(false)
    play('open')
    setToast('窗口已最小化到任务栏。')
  }

  const handleMaximize = () => {
    play('click')
    setToast('已经是最大窗口了，再大就要穿过显示器边框。')
  }

  const handleToggleSound = () => {
    const next = !soundOn
    setSoundOn(next)
    if (next) {
      primeAudio()
      try {
        sfx.open()
      } catch {
        /* noop */
      }
      setToast('系统音效已开启。叮。')
    } else {
      setToast('系统音效已关闭，世界清静了。')
    }
  }

  const handleToggleCrt = () => {
    setCrtOn((value) => !value)
    setToast(crtOn ? 'CRT 扫描线已关闭，屏幕变得过于清晰。' : 'CRT 扫描线已开启，1995 年的味道回来了。')
  }

  const showAbout = () => {
    setDialog({
      title: '关于 CYBER GOSSIP 95',
      tone: 'info',
      message: (
        <>
          <strong>赛博吃瓜鉴定局 1995 · v1.0</strong>
          <br />
          <br />
          一台假装来自 1995 年的 486 电脑，运行着 2026 年的 AI 吃瓜引擎。界面使用 Win95 视觉语言手工绘制，评分与反转仅用于娱乐。
          <br />
          <br />
          技术栈：React + TypeScript + Vite + Express。AI 密钥只保存在服务端；没有 Key 时自动使用本地演示模型。
        </>
      ),
      note: '© 1995-2026 GUA-TECH SYSTEMS · 本软件不提供任何真实鉴定服务',
      actions: [{ label: '知道了', primary: true, onClick: () => setDialog(null) }],
    })
  }

  const satelliteEasterEgg = () => {
    play('alert')
    setDialog({
      title: '吃瓜卫星 · 通讯测试',
      tone: 'info',
      message: (
        <>
          卫星回应：<strong>“信号良好，今日适合吃瓜。”</strong>
          <br />
          <br />
          当前轨道位置：北纬 31°，东经 121°，正好悬在你家楼顶。它拒绝透露更多，只说“到时候你就知道了”。
        </>
      ),
      note: 'SATELLITE GX-95 · STATUS: ONLINE (虚构)',
      actions: [{ label: '收到', primary: true, onClick: () => setDialog(null) }],
    })
  }

  const trashEasterEgg = () => {
    play('error')
    setDialog({
      title: '回收站',
      tone: 'warning',
      message: (
        <>
          回收站里只有 <strong>37 个吃剩的瓜皮</strong>，以及一份 1995 年的《如何优雅围观》说明书。
          <br />
          <br />
          系统提示：瓜皮可回收，情绪请自行处理。
        </>
      ),
      actions: [
        { label: '清空回收站', onClick: () => setDialog(null) },
        { label: '留着', primary: true, onClick: () => setDialog(null) },
      ],
    })
  }

  const shutdownEasterEgg = () => {
    setDialog({
      title: '关闭 Windows',
      tone: 'question',
      message: (
        <>
          <strong>系统拒绝关机。</strong>
          <br />
          <br />
          检测到 1 个尚未吃完的瓜、3 个正在输入中的群聊，以及 1 位不肯离开的围观群众。
          <br />
          <br />
          建议继续围观，或者重启整个鉴定局。
        </>
      ),
      actions: [
        { label: '继续吃瓜', primary: true, onClick: () => setDialog(null) },
        {
          label: '重启系统',
          onClick: () => {
            setDialog(null)
            setBooting(true)
            setMainOpen(true)
            setCertOpen(false)
            setHistoryOpen(false)
            setHelpOpen(false)
            setFocusWindow('main')
          },
        },
      ],
    })
  }

  /* ── 桌面与任务栏 ───────────────────────────────────────── */

  const desktopIcons = [
    {
      id: 'main',
      label: '吃瓜鉴定中心',
      icon: DESKTOP_ICON_GLYPHS.monitor,
      accent: '#000080',
      onOpen: () => {
        setMainOpen(true)
        setFocusWindow('main')
        play('open')
      },
    },
    {
      id: 'archive',
      label: '我的吃瓜档案',
      icon: DESKTOP_ICON_GLYPHS.folder,
      accent: '#8a6a15',
      onOpen: openHistory,
    },
    {
      id: 'cert',
      label: '吃瓜证书',
      icon: DESKTOP_ICON_GLYPHS.certificate,
      accent: '#7d1616',
      onOpen: openCertificate,
    },
    {
      id: 'help',
      label: '使用说明',
      icon: DESKTOP_ICON_GLYPHS.help,
      accent: '#1c5fa8',
      onOpen: openHelp,
    },
    {
      id: 'satellite',
      label: '吃瓜卫星.exe',
      icon: DESKTOP_ICON_GLYPHS.satellite,
      accent: '#2f7d32',
      onOpen: satelliteEasterEgg,
    },
    {
      id: 'trash',
      label: '回收站',
      icon: DESKTOP_ICON_GLYPHS.trash,
      accent: '#444444',
      onOpen: trashEasterEgg,
    },
  ]

  const startItems: StartMenuAction[] = [
    {
      id: 'main',
      label: '吃瓜鉴定中心',
      icon: <Monitor size={16} />,
      onClick: openMain,
    },
    {
      id: 'history',
      label: '我的吃瓜档案',
      icon: <FolderOpen size={16} />,
      onClick: openHistory,
    },
    {
      id: 'cert',
      label: '生成吃瓜证书',
      icon: <FileText size={16} />,
      onClick: openCertificate,
      disabled: !analysis,
    },
    {
      id: 'help',
      label: '使用说明',
      icon: <HelpCircle size={16} />,
      onClick: openHelp,
    },
    {
      id: 'about',
      label: '关于本局',
      icon: <Info size={16} />,
      onClick: showAbout,
    },
    {
      id: 'shutdown',
      label: '关机…',
      icon: <Power size={16} />,
      onClick: shutdownEasterEgg,
      divider: true,
    },
  ]

  const taskbarWindows = [
    ...(mainOpen
      ? [
          {
            id: 'main',
            label: '互联网热闹程度鉴定中心',
            active: focusWindow === 'main',
            icon: <Monitor size={14} />,
            onClick: openMain,
          },
        ]
      : []),
    ...(historyOpen
      ? [
          {
            id: 'history',
            label: '我的吃瓜档案',
            active: focusWindow === 'history',
            icon: <FolderOpen size={14} />,
            onClick: () => {
              setHistoryOpen(true)
              setFocusWindow('history')
            },
          },
        ]
      : []),
    ...(helpOpen
      ? [
          {
            id: 'help',
            label: '帮助',
            active: focusWindow === 'help',
            icon: <HelpCircle size={14} />,
            onClick: () => {
              setHelpOpen(true)
              setFocusWindow('help')
            },
          },
        ]
      : []),
    ...(certOpen && analysis
      ? [
          {
            id: 'cert',
            label: '吃瓜证书',
            active: focusWindow === 'cert',
            icon: <FileText size={14} />,
            onClick: () => {
              setCertOpen(true)
              setFocusWindow('cert')
            },
          },
        ]
      : []),
  ]

  return (
    <div className={`desktop ${crtOn ? 'crt-on' : 'crt-off'}`}>
      <div className="desktop-wallpaper" aria-hidden="true">
        <div className="wallpaper-grid" />
        <div className="wallpaper-mark">
          <span>CYBER</span>
          <span>GOSSIP</span>
          <span className="wallpaper-95">95</span>
        </div>
        <div className="wallpaper-caption">世界很乱，先吃个瓜。</div>
        <div className="wallpaper-badge">GUA-TECH SYSTEMS · 1995</div>
      </div>

      <DesktopIcons items={desktopIcons} />

      {mainOpen ? (
        <div className="window-layer">
          <Analyzer
            story={story}
            onStoryChange={setStory}
            onAnalyze={handleAnalyze}
            onRandom={handleRandom}
            onPreset={handlePreset}
            onReset={handleReset}
            analyzing={analyzing}
            progress={progress}
            logs={logs}
            analysis={analysis}
            twists={twists}
            twisting={twisting}
            chaos={chaos}
            onChaosChange={setChaos}
            onTwist={handleTwist}
            onOpenHistory={openHistory}
            onOpenHelp={openHelp}
            onOpenCertificate={openCertificate}
            onClearHistory={handleClearHistory}
            onAbout={showAbout}
            onClose={handleCloseMain}
            onMinimize={handleMinimize}
            onMaximize={handleMaximize}
            presets={PRESETS}
            aiEnabled={health?.aiEnabled ?? null}
            aiModel={health?.model || '本地演示'}
            aiError={aiError}
            historyCount={history.length}
            active={focusWindow === 'main'}
          />
        </div>
      ) : (
        <div className="desktop-closed-hint">
          <Monitor size={40} />
          <p>鉴定中心已最小化。</p>
          <span>双击桌面图标，或点击任务栏按钮重新打开。</span>
        </div>
      )}

      {toast ? (
        <div className="toast" role="status" aria-live="polite">
          <Info size={15} />
          <span>{toast}</span>
        </div>
      ) : null}

      <Taskbar
        onStart={() => setStartOpen((value) => !value)}
        startOpen={startOpen}
        windows={taskbarWindows}
        soundOn={soundOn}
        onToggleSound={handleToggleSound}
        crtOn={crtOn}
        onToggleCrt={handleToggleCrt}
        online={online}
        onOpenHistory={openHistory}
      />

      {startOpen ? <StartMenu items={startItems} onClose={() => setStartOpen(false)} /> : null}

      {historyOpen ? (
        <HistoryWindow
          records={history}
          onOpen={handleReopenRecord}
          onClear={handleClearHistory}
          onClose={() => {
            setHistoryOpen(false)
            setFocusWindow('main')
          }}
        />
      ) : null}

      {helpOpen ? (
        <HelpWindow
          onClose={() => {
            setHelpOpen(false)
            setFocusWindow('main')
          }}
        />
      ) : null}

      {certOpen && analysis ? (
        <CertificateModal
          analysis={analysis}
          twists={twists}
          onClose={() => {
            setCertOpen(false)
            setFocusWindow('main')
          }}
        />
      ) : null}

      {dialog ? <AlertDialog config={dialog} onDismiss={() => setDialog(null)} /> : null}

      <div className="crt-overlay" aria-hidden="true">
        <div className="crt-scanlines" />
        <div className="crt-vignette" />
      </div>

      {booting ? <BootScreen onDone={handleBootDone} /> : null}
    </div>
  )
}
