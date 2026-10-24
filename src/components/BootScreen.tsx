import { useCallback, useEffect, useRef, useState } from 'react'

const BIOS_LINES = [
  'CYBER GOSSIP BIOS v4.51PG',
  'Copyright (C) 1995-2026 GuaTech Systems, Inc.',
  '',
  'CPU: GUA-486DX2 @ 66MHz ................ OK',
  'Memory Test: 640K ..................... OK',
  'Detecting Gossip Satellite ............ FOUND',
  'Mounting 围观群众协议 .................. OK',
  'Calibrating 抓马侦测雷达 ............... OK',
  'Loading GOSSIP95.EXE .................. OK',
  '',
  'WARNING: 检测到用户好奇心超标，正在扩容瓜田...',
  'Starting CYBER GOSSIP 95 ...',
]

const MODULES = [
  '正在初始化吃瓜卫星链路',
  '正在加载 1995 年怀旧皮肤',
  '正在挂载围观群众协议',
  '正在校准抓马侦测雷达',
  '正在准备今日份瓜子',
]

export function BootScreen({ onDone }: { onDone: () => void }) {
  const [stage, setStage] = useState<'bios' | 'splash'>('bios')
  const [lineCount, setLineCount] = useState(0)
  const [progress, setProgress] = useState(0)
  const [moduleIndex, setModuleIndex] = useState(0)
  const doneRef = useRef(false)

  const finish = useCallback(() => {
    if (doneRef.current) return
    doneRef.current = true
    onDone()
  }, [onDone])

  useEffect(() => {
    const timers: number[] = []
    const lineTimer = window.setInterval(() => {
      setLineCount((count) => {
        if (count >= BIOS_LINES.length) {
          window.clearInterval(lineTimer)
          timers.push(window.setTimeout(() => setStage('splash'), 420))
          return count
        }
        return count + 1
      })
    }, 95)
    timers.push(lineTimer)

    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') finish()
    }
    window.addEventListener('keydown', escape)
    return () => {
      timers.forEach((timer) => {
        window.clearInterval(timer)
        window.clearTimeout(timer)
      })
      window.removeEventListener('keydown', escape)
    }
  }, [finish])

  useEffect(() => {
    if (stage !== 'splash') return
    let current = 0
    let cancelled = false
    const timer = window.setInterval(() => {
      current = Math.min(100, current + 4 + Math.random() * 6)
      setProgress(current)
      setModuleIndex(Math.min(MODULES.length - 1, Math.floor((current / 100) * MODULES.length)))
      if (current >= 100) {
        window.clearInterval(timer)
        window.setTimeout(() => {
          if (!cancelled) finish()
        }, 420)
      }
    }, 90)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [stage, finish])

  return (
    <div className={`boot-screen boot-${stage}`}>
      <button type="button" className="boot-skip retro-btn" onClick={finish}>
        跳过启动 [ESC]
      </button>

      {stage === 'bios' ? (
        <div className="bios-screen">
          <div className="bios-brand">GUA·TECH</div>
          <pre className="bios-lines">
            {BIOS_LINES.slice(0, lineCount).map((line, index) => (
              <div key={`${line}-${index}`} className={line.startsWith('WARNING') ? 'warn' : ''}>
                {line || ' '}
              </div>
            ))}
            <span className="bios-cursor">█</span>
          </pre>
          <div className="bios-footer">
            <span>Press DEL to enter SETUP</span>
            <span>GUA-95 / 640K BASE MEMORY</span>
          </div>
        </div>
      ) : (
        <div className="splash-screen">
          <div className="splash-cloud cloud-a" />
          <div className="splash-cloud cloud-b" />
          <div className="splash-card">
            <div className="splash-logo" aria-hidden="true">
              <span className="logo-red" />
              <span className="logo-green" />
              <span className="logo-blue" />
              <span className="logo-yellow" />
            </div>
            <div className="splash-wordmark">
              <div className="splash-cyber">CYBER GOSSIP</div>
              <div className="splash-95">95</div>
            </div>
            <div className="splash-cn">赛博吃瓜鉴定局</div>
            <div className="splash-tagline">欢迎进入赛博吃瓜鉴定局 · 世界很乱，先吃个瓜</div>
            <div className="splash-progress">
              <div className="splash-progress-label">
                <span>{MODULES[moduleIndex]}…</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="splash-progress-track">
                <div className="splash-progress-fill" style={{ width: `${progress}%` }} />
              </div>
            </div>
            <div className="splash-copy">© 1995 GUA-TECH SYSTEMS · 本系统仅用于娱乐鉴定</div>
          </div>
        </div>
      )}

      <div className="boot-scanlines" aria-hidden="true" />
    </div>
  )
}
