import { useEffect, useState, type ReactNode } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  FolderOpen,
  HelpCircle,
  Info,
  Monitor,
  Power,
  Satellite,
  ScanLine,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'

/* ── 通用 95 窗口 ─────────────────────────────────────────────── */

interface WindowFrameProps {
  title: string
  icon?: ReactNode
  children: ReactNode
  className?: string
  onClose?: () => void
  onHelp?: () => void
  onMinimize?: () => void
  onMaximize?: () => void
  footer?: ReactNode
  active?: boolean
}

export function WindowFrame({
  title,
  icon,
  children,
  className = '',
  onClose,
  onHelp,
  onMinimize,
  onMaximize,
  footer,
  active = true,
}: WindowFrameProps) {
  return (
    <section className={`win95-window ${className} ${active ? 'is-active' : ''}`}>
      <div className="win-titlebar">
        <span className="win-title-icon">{icon}</span>
        <span className="win-title-text" title={title}>
          {title}
        </span>
        <div className="win-title-actions">
          {onHelp ? (
            <button type="button" className="win-title-btn help" aria-label="帮助" onClick={onHelp}>
              ?
            </button>
          ) : null}
          <button
            type="button"
            className="win-title-btn"
            aria-label="最小化"
            onClick={onMinimize}
            disabled={!onMinimize}
          >
            <svg viewBox="0 0 8 8" aria-hidden="true">
              <rect x="2" y="5" width="4" height="1" fill="currentColor" />
            </svg>
          </button>
          <button
            type="button"
            className="win-title-btn"
            aria-label="最大化"
            onClick={onMaximize}
            disabled={!onMaximize}
          >
            <svg viewBox="0 0 8 8" aria-hidden="true">
              <path d="M2 2h4v4H2z" fill="none" stroke="currentColor" strokeWidth="1" />
              <path d="M2 2h4v1H2z" fill="currentColor" />
            </svg>
          </button>
          <button
            type="button"
            className="win-title-btn close"
            aria-label="关闭"
            onClick={onClose}
            disabled={!onClose}
          >
            <svg viewBox="0 0 8 8" aria-hidden="true">
              <path d="M2 2l4 4M6 2L2 6" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </button>
        </div>
      </div>
      <div className="win-body">{children}</div>
      {footer}
    </section>
  )
}

/* ── 95 按钮 ─────────────────────────────────────────────────── */

interface RetroButtonProps {
  children: ReactNode
  onClick?: () => void
  className?: string
  disabled?: boolean
  icon?: ReactNode
  type?: 'button' | 'submit'
  title?: string
}

export function RetroButton({
  children,
  onClick,
  className = '',
  disabled = false,
  icon,
  type = 'button',
  title,
}: RetroButtonProps) {
  return (
    <button
      type={type}
      className={`retro-btn ${className}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {icon ? <span className="retro-btn-icon">{icon}</span> : null}
      <span>{children}</span>
    </button>
  )
}

/* ── 分段进度条 ───────────────────────────────────────────────── */

export function BlockProgress({ value, label }: { value: number; label?: string }) {
  const blocks = 22
  const filled = Math.round((Math.max(0, Math.min(100, value)) / 100) * blocks)
  return (
    <div className="block-progress" aria-label={label || '进度'}>
      <div className="block-progress-track">
        {Array.from({ length: blocks }).map((_, index) => (
          <span key={index} className={index < filled ? 'filled' : ''} />
        ))}
      </div>
      <span className="block-progress-value">{Math.round(value)}%</span>
    </div>
  )
}

/* ── 对话弹窗 ─────────────────────────────────────────────────── */

export type DialogTone = 'info' | 'warning' | 'error' | 'question'

export interface DialogAction {
  label: string
  onClick: () => void
  primary?: boolean
}

export interface DialogConfig {
  title: string
  message: ReactNode
  tone?: DialogTone
  actions: DialogAction[]
  note?: string
}

const TONE_ICON: Record<DialogTone, ReactNode> = {
  info: <Info size={30} strokeWidth={2.2} />,
  warning: <AlertTriangle size={30} strokeWidth={2.2} />,
  error: <AlertTriangle size={30} strokeWidth={2.2} />,
  question: <HelpCircle size={30} strokeWidth={2.2} />,
}

export function AlertDialog({ config, onDismiss }: { config: DialogConfig; onDismiss: () => void }) {
  const tone = config.tone || 'info'
  return (
    <div className="modal-backdrop dialog-backdrop" role="presentation" onMouseDown={onDismiss}>
      <div
        className="dialog-window"
        role="alertdialog"
        aria-modal="true"
        aria-label={config.title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="win-titlebar dialog-titlebar">
          <span className="win-title-text">{config.title}</span>
          <div className="win-title-actions">
            <button type="button" className="win-title-btn close" aria-label="关闭" onClick={onDismiss}>
              <X size={10} strokeWidth={3} />
            </button>
          </div>
        </div>
        <div className={`dialog-content tone-${tone}`}>
          <div className="dialog-icon">{TONE_ICON[tone]}</div>
          <div className="dialog-copy">
            <div className="dialog-message">{config.message}</div>
            {config.note ? <div className="dialog-note">{config.note}</div> : null}
          </div>
        </div>
        <div className="dialog-actions">
          {config.actions.map((action) => (
            <RetroButton
              key={action.label}
              onClick={action.onClick}
              className={action.primary ? 'is-default' : ''}
            >
              {action.label}
            </RetroButton>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── 像素徽章 ─────────────────────────────────────────────────── */

export function PixelBadge({ text, size = 'md' }: { text: string; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <div className={`pixel-badge badge-${size}`} aria-hidden="true">
      <span>{text}</span>
    </div>
  )
}

/* ── 桌面图标 ─────────────────────────────────────────────────── */

export interface DesktopIcon {
  id: string
  label: string
  icon: ReactNode
  onOpen: () => void
  accent?: string
}

export function DesktopIcons({ items }: { items: DesktopIcon[] }) {
  const [selected, setSelected] = useState<string | null>(null)
  return (
    <div className="desktop-icons" aria-label="桌面程序">
      {items.map((item) => (
        <button
          type="button"
          key={item.id}
          className={`desktop-icon ${selected === item.id ? 'selected' : ''}`}
          onClick={() => {
            setSelected(item.id)
            if (window.matchMedia('(pointer: coarse)').matches) item.onOpen()
          }}
          onDoubleClick={item.onOpen}
          onKeyDown={(event) => {
            if (event.key === 'Enter') item.onOpen()
          }}
          title={`双击打开 ${item.label}`}
        >
          <span className="desktop-icon-tile" style={{ color: item.accent || '#000080' }}>
            {item.icon}
          </span>
          <span className="desktop-icon-label">{item.label}</span>
        </button>
      ))}
    </div>
  )
}

/* ── 开始菜单 ─────────────────────────────────────────────────── */

export interface StartMenuAction {
  id: string
  label: string
  icon: ReactNode
  onClick: () => void
  disabled?: boolean
  divider?: boolean
}

export function StartMenu({
  items,
  onClose,
}: {
  items: StartMenuAction[]
  onClose: () => void
}) {
  return (
    <>
      <div className="start-menu-backdrop" onClick={onClose} />
      <nav className="start-menu" aria-label="开始菜单">
        <div className="start-menu-rail">
          <span>
            CYBER
            <br />
            GOSSIP
            <br />
            95
          </span>
        </div>
        <div className="start-menu-list">
          {items.map((item) => (
            <div key={item.id}>
              {item.divider ? <div className="menu-separator" /> : null}
              <button
                type="button"
                className="start-menu-item"
                disabled={item.disabled}
                onClick={() => {
                  if (item.disabled) return
                  item.onClick()
                  onClose()
                }}
              >
                <span className="start-menu-icon">{item.icon}</span>
                <span>{item.label}</span>
                <ChevronRight size={11} className="start-menu-arrow" />
              </button>
            </div>
          ))}
          <div className="start-menu-footer">1995 EDITION · 2026 AI INSIDE</div>
        </div>
      </nav>
    </>
  )
}

/* ── 任务栏 ───────────────────────────────────────────────────── */

export function Taskbar({
  onStart,
  startOpen,
  windows,
  soundOn,
  onToggleSound,
  crtOn,
  onToggleCrt,
  online,
  onOpenHistory,
}: {
  onStart: () => void
  startOpen: boolean
  windows: Array<{ id: string; label: string; active: boolean; onClick: () => void; icon: ReactNode }>
  soundOn: boolean
  onToggleSound: () => void
  crtOn: boolean
  onToggleCrt: () => void
  online: number
  onOpenHistory: () => void
}) {
  const [clock, setClock] = useState(() => formatClock())

  useEffect(() => {
    const timer = window.setInterval(() => setClock(formatClock()), 15000)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <footer className="taskbar">
      <button
        type="button"
        className={`start-button ${startOpen ? 'pressed' : ''}`}
        onClick={onStart}
        aria-expanded={startOpen}
      >
        <span className="start-logo" aria-hidden="true">
          <i className="sq-red" />
          <i className="sq-green" />
          <i className="sq-blue" />
          <i className="sq-yellow" />
        </span>
        <span className="start-text">开始</span>
      </button>
      <span className="taskbar-divider" />
      <div className="taskbar-windows">
        {windows.map((item) => (
          <button
            type="button"
            key={item.id}
            className={`taskbar-window ${item.active ? 'active' : ''}`}
            onClick={item.onClick}
          >
            <span className="taskbar-window-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>
      <div className="tray">
        <span className="tray-online" title="虚构装饰数字，不代表真实在线人数" onClick={onOpenHistory}>
          <span className="tray-led" />
          围观 {online.toLocaleString('zh-CN')} 人<sup>虚构</sup>
        </span>
        <button
          type="button"
          className="tray-btn"
          onClick={onToggleSound}
          title={soundOn ? '关闭系统音效' : '开启系统音效'}
          aria-label={soundOn ? '关闭系统音效' : '开启系统音效'}
        >
          {soundOn ? <Volume2 size={14} /> : <VolumeX size={14} />}
        </button>
        <button
          type="button"
          className={`tray-btn ${crtOn ? 'tray-btn-active' : ''}`}
          onClick={onToggleCrt}
          title={crtOn ? '关闭 CRT 扫描线' : '开启 CRT 扫描线'}
          aria-label="切换 CRT 扫描线"
        >
          <ScanLine size={14} />
        </button>
        <span className="tray-clock" title="本地时间">
          {clock}
        </span>
      </div>
    </footer>
  )
}

function formatClock() {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

export const DESKTOP_ICON_GLYPHS = {
  monitor: <Monitor size={28} strokeWidth={1.7} />,
  folder: <FolderOpen size={28} strokeWidth={1.7} />,
  help: <HelpCircle size={28} strokeWidth={1.7} />,
  satellite: <Satellite size={28} strokeWidth={1.7} />,
  trash: <Trash2 size={28} strokeWidth={1.7} />,
  certificate: <CheckCircle2 size={28} strokeWidth={1.7} />,
  power: <Power size={28} strokeWidth={1.7} />,
}
