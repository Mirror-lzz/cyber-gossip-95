import { useEffect, useMemo, useState } from 'react'
import { Download, FileText, RefreshCw } from 'lucide-react'
import type { DimensionKey, GossipAnalysis, TwistResult } from '../types'
import { DIMENSION_META, getTier } from '../lib/tiers'
import { RetroButton, WindowFrame } from './Chrome'

interface CertificateProps {
  analysis: GossipAnalysis
  twists: TwistResult[]
  onClose: () => void
}

function seedFrom(text: string): number {
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return Math.abs(hash)
}

function drawWrapped(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
  align: CanvasTextAlign = 'left',
) {
  const chars = Array.from(text)
  let lines: string[] = []
  let line = ''
  for (const char of chars) {
    const test = line + char
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = char
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines)
    let last = kept[maxLines - 1]
    while (last && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1)
    kept[maxLines - 1] = `${last}…`
    lines = kept
  }
  ctx.textAlign = align
  lines.forEach((item, lineIndex) => {
    ctx.fillText(item, x, y + lineIndex * lineHeight)
  })
  ctx.textAlign = 'left'
  return lines.length
}

function drawBarcode(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, seed: number) {
  let value = seed || 1
  const next = () => {
    value = (value * 1103515245 + 12345) & 0x7fffffff
    return value / 0x7fffffff
  }
  ctx.fillStyle = '#16120d'
  let cursor = x
  while (cursor < x + width) {
    const bar = 1 + Math.floor(next() * 5)
    if (next() > 0.32) ctx.fillRect(cursor, y, bar, height)
    cursor += bar + 1 + Math.floor(next() * 3)
  }
}

function drawCertificate(analysis: GossipAnalysis, twists: TwistResult[]): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = 1600
  canvas.height = 1120
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法创建证书画布')

  const latest = twists.length > 0 ? twists[twists.length - 1] : null
  const score = latest ? latest.score : analysis.dimensions.gossip.score
  const tier = getTier(score)
  const dims = latest ? latest.dimension : analysis.dimensions
  const seed = seedFrom(`${analysis.id}-${score}-${analysis.title}`)
  const serial = `CG95-${String(seed % 9000 + 1000)}-${String((seed >> 4) % 9000 + 1000)}`
  const funNo = `GUA-1995-${String(seed % 9000 + 1000)}`
  const date = new Date(analysis.createdAt)
  const dateText = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`

  /* 纸张底纹 */
  ctx.fillStyle = '#f3ead7'
  ctx.fillRect(0, 0, 1600, 1120)
  ctx.fillStyle = 'rgba(84, 66, 38, 0.075)'
  for (let y = 24; y < 1120; y += 9) {
    for (let x = 24; x < 1600; x += 9) {
      ctx.fillRect(x, y, 1, 1)
    }
  }
  ctx.strokeStyle = 'rgba(120, 95, 55, 0.18)'
  ctx.lineWidth = 1
  for (let y = 120; y < 1120; y += 130) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(1600, y)
    ctx.stroke()
  }

  /* 外框与套准线 */
  ctx.strokeStyle = '#17130c'
  ctx.lineWidth = 3
  ctx.strokeRect(38, 38, 1524, 1044)
  ctx.strokeStyle = '#0d5f5f'
  ctx.lineWidth = 2
  ctx.strokeRect(50, 50, 1500, 1020)
  ctx.strokeStyle = '#8a7a5e'
  ctx.lineWidth = 1
  ctx.strokeRect(60, 60, 1480, 1000)
  ctx.strokeStyle = '#17130c'
  ctx.lineWidth = 2
  const marks = [
    [62, 62],
    [1538, 62],
    [62, 1058],
    [1538, 1058],
  ]
  marks.forEach(([x, y]) => {
    ctx.beginPath()
    ctx.moveTo(x - 7, y)
    ctx.lineTo(x + 7, y)
    ctx.moveTo(x, y - 7)
    ctx.lineTo(x, y + 7)
    ctx.stroke()
  })

  /* 页眉 */
  const headerGradient = ctx.createLinearGradient(0, 76, 0, 238)
  headerGradient.addColorStop(0, '#000080')
  headerGradient.addColorStop(1, '#12339a')
  ctx.fillStyle = headerGradient
  ctx.fillRect(76, 76, 1448, 162)
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 2
  ctx.strokeRect(78, 78, 1444, 158)
  ctx.strokeStyle = '#000040'
  ctx.strokeRect(80, 80, 1440, 154)

  const squares = [
    ['#c8322b', 110],
    ['#2f7d32', 146],
    ['#1c5fa8', 110],
    ['#c9a227', 146],
  ] as const
  squares.forEach(([color, x], index) => {
    ctx.fillStyle = color
    ctx.fillRect(x, 108 + (index > 1 ? 30 : 0), 28, 28)
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'
    ctx.lineWidth = 1
    ctx.strokeRect(x + 0.5, 108.5 + (index > 1 ? 30 : 0), 27, 27)
  })

  ctx.fillStyle = '#fff9e8'
  ctx.font = 'bold 56px Tahoma, "MS Sans Serif", sans-serif'
  ctx.fillText('CYBER GOSSIP', 196, 146)
  ctx.fillStyle = '#ffd76a'
  ctx.font = 'bold 60px Tahoma, "MS Sans Serif", sans-serif'
  ctx.fillText('95', 470, 148)
  ctx.fillStyle = '#e9e2c9'
  ctx.font = '22px "SimSun", "Songti SC", serif'
  ctx.fillText('赛博吃瓜鉴定局 · 互联网热闹鉴定证书 / OFFICIAL GOSSIP CERTIFICATE', 198, 185)
  ctx.fillStyle = '#a9b8e8'
  ctx.font = '16px "MS Sans Serif", Tahoma, sans-serif'
  ctx.fillText('FORM 95-G  ·  REV. 1.0  ·  ISSUED BY GUA-TECH SYSTEMS', 198, 214)

  ctx.textAlign = 'right'
  ctx.fillStyle = '#fff9e8'
  ctx.font = 'bold 18px "MS Sans Serif", Tahoma, sans-serif'
  ctx.fillText('1995 EDITION', 1490, 122)
  ctx.fillStyle = '#a9b8e8'
  ctx.font = '15px "MS Sans Serif", Tahoma, sans-serif'
  ctx.fillText('2026 AI INSIDE', 1490, 145)
  drawBarcode(ctx, 1300, 164, 190, 46, seed)
  ctx.fillStyle = '#cfd6ee'
  ctx.font = '13px "MS Sans Serif", Tahoma, sans-serif'
  ctx.fillText(`SERIAL ${serial}`, 1490, 228)
  ctx.textAlign = 'left'

  /* 左侧评分卡 */
  ctx.fillStyle = '#e6dbc3'
  ctx.fillRect(90, 282, 500, 574)
  ctx.strokeStyle = '#2c2416'
  ctx.lineWidth = 3
  ctx.strokeRect(90, 282, 500, 574)
  ctx.strokeStyle = '#fffdf4'
  ctx.lineWidth = 2
  ctx.strokeRect(94, 286, 492, 566)

  ctx.fillStyle = '#0d5f5f'
  ctx.fillRect(96, 288, 488, 48)
  ctx.fillStyle = '#f8f2df'
  ctx.font = 'bold 22px "SimSun", "Songti SC", serif'
  ctx.fillText('吃瓜总评分', 116, 320)
  ctx.textAlign = 'right'
  ctx.font = '15px Tahoma, sans-serif'
  ctx.fillText('GOSSIP SCORE', 560, 318)
  ctx.textAlign = 'left'

  ctx.fillStyle = '#221b12'
  ctx.font = 'bold 172px Tahoma, "Arial Black", sans-serif'
  ctx.fillText(String(score), 116, 520)
  ctx.fillStyle = '#7a6c54'
  ctx.font = 'bold 34px Tahoma, sans-serif'
  ctx.fillText('/100', 442, 510)

  /* 刻度条 */
  const litCount = Math.round((score / 100) * 30)
  for (let i = 0; i < 30; i += 1) {
    ctx.fillStyle = i < litCount ? tier.color : '#c8bda9'
    ctx.fillRect(116 + i * 14, 548, 10, 16)
  }
  ctx.strokeStyle = '#8f8168'
  ctx.lineWidth = 1
  ctx.strokeRect(114, 546, 428, 20)
  ctx.fillStyle = '#7a6c54'
  ctx.font = '13px Tahoma, sans-serif'
  ctx.fillText('0', 116, 584)
  ctx.textAlign = 'center'
  ctx.fillText('50', 326, 584)
  ctx.textAlign = 'right'
  ctx.fillText('100', 542, 584)
  ctx.textAlign = 'left'

  /* 等级 */
  ctx.fillStyle = tier.color
  ctx.font = 'bold 42px "SimSun", "Songti SC", serif'
  ctx.fillText(tier.name, 116, 650)
  ctx.fillStyle = '#6d604c'
  ctx.font = '15px "MS Sans Serif", Tahoma, sans-serif'
  ctx.fillText(tier.code, 116, 680)
  ctx.fillStyle = '#3a3226'
  ctx.font = '20px "SimSun", "Songti SC", serif'
  drawWrapped(ctx, tier.description, 116, 714, 310, 28, 3)

  if (latest) {
    ctx.fillStyle = '#8d2a1c'
    ctx.font = '16px "SimSun", "Songti SC", serif'
    drawWrapped(
      ctx,
      `含 ${twists.length} 段虚构反转加成 · 原始评分 ${analysis.dimensions.gossip.score}`,
      116,
      800,
      340,
      22,
      2,
    )
  } else {
    ctx.fillStyle = '#7a6c54'
    ctx.font = '15px "SimSun", "Songti SC", serif'
    ctx.fillText('本分数由文字特征与剧情浓度模型计算', 116, 808)
  }
  ctx.fillStyle = '#7a6c54'
  ctx.font = '14px Tahoma, sans-serif'
  ctx.fillText('ENTERTAINMENT ONLY · 仅供娱乐', 116, 838)

  /* 红色印章 */
  ctx.save()
  ctx.translate(498, 738)
  ctx.rotate(-0.16)
  ctx.strokeStyle = '#a8211a'
  ctx.fillStyle = '#a8211a'
  ctx.lineWidth = 4
  ctx.strokeRect(-108, -36, 216, 72)
  ctx.lineWidth = 1.5
  ctx.strokeRect(-101, -29, 202, 58)
  ctx.font = 'bold 36px "SimSun", "Songti SC", serif'
  ctx.textAlign = 'center'
  ctx.fillText('已 鉴 定', 0, 13)
  ctx.font = '12px Tahoma, sans-serif'
  ctx.fillText('CYBER GOSSIP BUREAU', 0, 29)
  ctx.restore()
  ctx.textAlign = 'left'

  /* 右侧正文 */
  ctx.fillStyle = '#7a6c54'
  ctx.font = '14px "MS Sans Serif", Tahoma, sans-serif'
  ctx.fillText('CASE TITLE / 事件代号', 628, 312)
  ctx.fillStyle = '#1a150e'
  ctx.font = 'bold 44px "SimSun", "Songti SC", serif'
  drawWrapped(ctx, analysis.title, 628, 360, 880, 54, 2)

  let tagX = 628
  analysis.tags.forEach((tag) => {
    ctx.font = '17px "SimSun", "Songti SC", serif'
    const width = ctx.measureText(`#${tag}`).width + 20
    ctx.fillStyle = '#ddd0b6'
    ctx.fillRect(tagX, 462, width, 28)
    ctx.strokeStyle = '#8f8168'
    ctx.lineWidth = 1
    ctx.strokeRect(tagX + 0.5, 462.5, width - 1, 27)
    ctx.fillStyle = '#3c3325'
    ctx.fillText(`#${tag}`, tagX + 10, 482)
    tagX += width + 10
  })

  ctx.strokeStyle = '#a19277'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(628, 506)
  ctx.lineTo(1508, 506)
  ctx.stroke()

  ctx.fillStyle = '#0d5f5f'
  ctx.font = 'bold 18px "MS Sans Serif", Tahoma, sans-serif'
  ctx.fillText('AI 鉴定意见 / GOSSIP VERDICT', 628, 536)
  ctx.fillStyle = '#2e271c'
  ctx.font = '23px "SimSun", "Songti SC", serif'
  drawWrapped(ctx, analysis.comment, 628, 574, 880, 35, 3)

  ctx.fillStyle = '#8d2a1c'
  ctx.font = 'bold 17px "SimSun", "Songti SC", serif'
  ctx.fillText('最离谱之处 / MOST ABSURD DETAIL', 628, 694)
  ctx.fillStyle = '#2e271c'
  ctx.font = '21px "SimSun", "Songti SC", serif'
  drawWrapped(ctx, analysis.highlight, 648, 726, 850, 29, 2)
  ctx.fillStyle = '#a8211a'
  ctx.fillRect(628, 706, 5, 62)

  /* 人格徽章 */
  ctx.fillStyle = '#000080'
  ctx.fillRect(628, 788, 64, 64)
  ctx.strokeStyle = '#fff9e8'
  ctx.lineWidth = 2
  ctx.strokeRect(631, 791, 58, 58)
  ctx.fillStyle = '#ffd76a'
  ctx.font = 'bold 36px "SimSun", "Songti SC", serif'
  ctx.textAlign = 'center'
  ctx.fillText(analysis.persona.badge, 660, 833)
  ctx.textAlign = 'left'
  ctx.fillStyle = '#1a150e'
  ctx.font = 'bold 25px "SimSun", "Songti SC", serif'
  ctx.fillText(analysis.persona.name, 712, 818)
  ctx.fillStyle = '#6d604c'
  ctx.font = '16px "SimSun", "Songti SC", serif'
  ctx.fillText(analysis.persona.tagline, 712, 842)
  ctx.textAlign = 'right'
  ctx.fillStyle = '#7a6c54'
  ctx.font = '13px "MS Sans Serif", Tahoma, sans-serif'
  ctx.fillText('吃瓜人格 · PERSONA', 1508, 806)
  ctx.textAlign = 'left'

  /* 四维评分条 */
  ctx.fillStyle = '#e6dbc3'
  ctx.fillRect(90, 874, 1418, 82)
  ctx.strokeStyle = '#8f8168'
  ctx.lineWidth = 1
  ctx.strokeRect(90.5, 874.5, 1417, 81)
  const dimColors: Record<DimensionKey, string> = {
    gossip: '#0d5f5f',
    drama: '#a33a24',
    twist: '#b77912',
    spread: '#1c3f8f',
  }
  DIMENSION_META.forEach((meta, index) => {
    const baseX = 112 + index * 352
    ctx.fillStyle = '#6d604c'
    ctx.font = '15px "SimSun", "Songti SC", serif'
    ctx.fillText(meta.label, baseX, 902)
    ctx.fillStyle = '#1a150e'
    ctx.font = 'bold 30px Tahoma, sans-serif'
    ctx.fillText(String(dims[meta.key].score), baseX, 938)
    ctx.fillStyle = '#c8bda9'
    ctx.fillRect(baseX + 82, 920, 216, 12)
    ctx.fillStyle = dimColors[meta.key]
    ctx.fillRect(baseX + 82, 920, (216 * dims[meta.key].score) / 100, 12)
    ctx.strokeStyle = '#8f8168'
    ctx.lineWidth = 1
    ctx.strokeRect(baseX + 82, 920, 216, 12)
  })

  /* 页脚 */
  ctx.strokeStyle = '#a19277'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(76, 978)
  ctx.lineTo(1524, 978)
  ctx.stroke()

  ctx.fillStyle = '#2e271c'
  ctx.font = '16px "Courier New", monospace'
  ctx.fillText(`CERT NO. ${serial}`, 90, 1008)
  ctx.fillText(`趣味编号 ${funNo}`, 90, 1034)
  ctx.fillStyle = '#6d604c'
  ctx.font = '15px "SimSun", "Songti SC", serif'
  ctx.fillText(`签发日期 ${dateText}`, 430, 1008)
  ctx.fillText('签发机关：赛博吃瓜鉴定局（虚构机构）', 430, 1034)

  drawBarcode(ctx, 1080, 986, 170, 40, seed + 7)
  ctx.fillStyle = '#2e271c'
  ctx.font = '13px "Courier New", monospace'
  ctx.fillText(serial, 1080, 1042)

  ctx.textAlign = 'right'
  ctx.fillStyle = '#8d2a1c'
  ctx.font = 'bold 18px "SimSun", "Songti SC", serif'
  ctx.fillText('本鉴定纯属娱乐', 1512, 1006)
  ctx.fillStyle = '#6d604c'
  ctx.font = '14px "SimSun", "Songti SC", serif'
  ctx.fillText('不判断事件真实性 · 不评价当事人 · 请勿对号入座', 1512, 1030)
  ctx.textAlign = 'left'

  ctx.fillStyle = '#8a7a5e'
  ctx.font = '13px "MS Sans Serif", Tahoma, sans-serif'
  ctx.fillText(
    'PRINTED BY CYBER GOSSIP 95 · GUA-TECH SYSTEMS 1995 · GENERATED LOCALLY IN YOUR BROWSER',
    90,
    1062,
  )
  ctx.textAlign = 'right'
  ctx.fillText('PAGE 1 / 1', 1512, 1062)
  ctx.textAlign = 'left'

  return canvas
}

export function CertificateModal({ analysis, twists, onClose }: CertificateProps) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [rendering, setRendering] = useState(true)
  const latestScore = twists.length > 0 ? twists[twists.length - 1].score : analysis.dimensions.gossip.score
  const serial = useMemo(() => {
    const seed = seedFrom(`${analysis.id}-${latestScore}-${analysis.title}`)
    return `CG95-${String(seed % 9000 + 1000)}-${String((seed >> 4) % 9000 + 1000)}`
  }, [analysis.id, analysis.title, latestScore])

  useEffect(() => {
    let cancelled = false
    const render = async () => {
      setRendering(true)
      setError('')
      try {
        await document.fonts.ready
        const canvas = drawCertificate(analysis, twists)
        if (!cancelled) setUrl(canvas.toDataURL('image/png'))
      } catch (renderError) {
        if (!cancelled) {
          setError(renderError instanceof Error ? renderError.message : '证书生成失败')
        }
      } finally {
        if (!cancelled) setRendering(false)
      }
    }
    void render()
    return () => {
      cancelled = true
    }
  }, [analysis, twists])

  const download = () => {
    if (!url) return
    const link = document.createElement('a')
    link.href = url
    link.download = `cyber-gossip-95-${latestScore}分-${serial}.png`
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  return (
    <div className="modal-backdrop cert-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="cert-modal"
        role="dialog"
        aria-modal="true"
        aria-label="吃瓜鉴定证书"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <WindowFrame
          title="我的吃瓜鉴定证书 · PRINT PREVIEW"
          icon={<FileText size={13} strokeWidth={2.4} />}
          onClose={onClose}
          className="cert-window"
        >
          <div className="cert-toolbar">
            <span className="cert-toolbar-note">
              {rendering
                ? '正在调用 1995 年的针式打印机…'
                : error
                  ? '证书打印机卡纸了'
                  : `证书已生成 · 编号 ${serial} · 包含最新虚构评分`}
            </span>
            <div className="cert-toolbar-actions">
              <RetroButton
                icon={rendering ? <RefreshCw size={14} className="spin" /> : <Download size={14} />}
                onClick={download}
                disabled={!url || rendering}
                className="btn-accent"
              >
                下载 PNG
              </RetroButton>
              <RetroButton onClick={onClose}>关闭</RetroButton>
            </div>
          </div>

          <div className="cert-preview">
            {rendering ? (
              <div className="cert-loading">
                <div className="cert-loading-bar">
                  <span />
                </div>
                <p>正在排版、盖章、烘干墨水……</p>
              </div>
            ) : error ? (
              <div className="cert-error">
                <p>{error}</p>
                <RetroButton onClick={onClose}>关闭窗口</RetroButton>
              </div>
            ) : (
              <img src={url} alt={`吃瓜鉴定证书：${analysis.title}，评分 ${latestScore} 分`} />
            )}
          </div>

          <div className="cert-tip">
            下载的 PNG 为 1600 × 1120 高清版本，可直接发群、发朋友圈，或打印出来贴在工位上。
          </div>
        </WindowFrame>
      </div>
    </div>
  )
}
