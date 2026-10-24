import { AlertTriangle, FolderOpen, HelpCircle, Info, Trash2 } from 'lucide-react'
import type { HistoryRecord } from '../types'
import { getTier, TIERS } from '../lib/tiers'
import { RetroButton, WindowFrame } from './Chrome'

function formatTime(timestamp: number) {
  const date = new Date(timestamp)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function HistoryWindow({
  records,
  onOpen,
  onClear,
  onClose,
}: {
  records: HistoryRecord[]
  onOpen: (record: HistoryRecord) => void
  onClear: () => void
  onClose: () => void
}) {
  return (
    <div className="modal-backdrop history-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="history-modal"
        role="dialog"
        aria-modal="true"
        aria-label="我的吃瓜档案"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <WindowFrame
          title="我的吃瓜档案 — C:\\GOSSIP\\ARCHIVE"
          icon={<FolderOpen size={13} strokeWidth={2.4} />}
          onClose={onClose}
          className="history-window"
        >
          <div className="history-toolbar">
            <div className="history-toolbar-info">
              <span className="history-count">{records.length} 份鉴定记录</span>
              <span>保存于本机浏览器 · 不会上传公共数据库</span>
            </div>
            <RetroButton
              icon={<Trash2 size={13} />}
              onClick={onClear}
              disabled={records.length === 0}
            >
              一键清空
            </RetroButton>
          </div>

          {records.length === 0 ? (
            <div className="history-empty">
              <FolderOpen size={36} />
              <p>档案柜空空如也。</p>
              <span>完成一次鉴定后，报告会自动存入这里。</span>
            </div>
          ) : (
            <div className="history-list">
              {records.map((record) => {
                const score =
                  record.twists.length > 0
                    ? record.twists[record.twists.length - 1].score
                    : record.analysis.dimensions.gossip.score
                const tier = getTier(score)
                return (
                  <article className="history-row" key={record.id}>
                    <div className="history-score" style={{ borderColor: tier.color, color: tier.color }}>
                      <strong>{score}</strong>
                      <span>{tier.short}</span>
                    </div>
                    <div className="history-main">
                      <div className="history-title">{record.analysis.title}</div>
                      <div className="history-story">{record.analysis.story}</div>
                      <div className="history-meta">
                        <span>{formatTime(record.createdAt)}</span>
                        <span>{tier.name}</span>
                        <span>反转 {record.twists.length} 段</span>
                        <span className="history-source">
                          {record.analysis.source === 'ai' ? 'AI 鉴定' : '演示模拟'}
                        </span>
                      </div>
                    </div>
                    <div className="history-actions">
                      <RetroButton onClick={() => onOpen(record)}>打开报告</RetroButton>
                    </div>
                  </article>
                )
              })}
            </div>
          )}

          <div className="history-footer">
            <Info size={12} />
            历史记录保存在浏览器 localStorage 中，换设备或清理缓存后会消失。
          </div>
        </WindowFrame>
      </div>
    </div>
  )
}

export function HelpWindow({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop help-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="help-modal"
        role="dialog"
        aria-modal="true"
        aria-label="使用说明"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <WindowFrame
          title="帮助主题：如何使用赛博吃瓜鉴定局"
          icon={<HelpCircle size={13} strokeWidth={2.4} />}
          onClose={onClose}
          className="help-window"
        >
          <div className="help-body">
            <div className="help-hero">
              <div className="help-hero-icon">?</div>
              <div>
                <h3>世界很乱，先吃个瓜。</h3>
                <p>
                  本程序是一个 1995 年风格的互联网娱乐工具。输入任意事件，本局会从吃瓜、抓马、反转、传播四个维度给出趣味评分，并生成一份仅供娱乐的鉴定报告。
                </p>
              </div>
            </div>

            <section className="help-section">
              <h4>1. 如何鉴定一个瓜</h4>
              <ol>
                <li>在左侧输入框写下事件，越具体越好：人物、地点、冲突，以及那个“结果”。</li>
                <li>点击「开始鉴定这个瓜」，或按 Ctrl + Enter。</li>
                <li>等待卫星扫描完成，查看评分、点评与吃瓜人格。</li>
                <li>点击「剧情不够刺激？再加一点戏！」，生成明确标注为虚构的反转。</li>
                <li>点击「生成吃瓜证书」，下载 1600 × 1120 的复古 PNG 证书。</li>
              </ol>
            </section>

            <section className="help-section">
              <h4>2. 评分等级对照表</h4>
              <div className="tier-table">
                {TIERS.map((tier, index) => (
                  <div className="tier-row" key={tier.code}>
                    <span className="tier-range">
                      {index === 0
                        ? '0 – 20'
                        : index === 1
                          ? '21 – 40'
                          : index === 2
                            ? '41 – 60'
                            : index === 3
                              ? '61 – 80'
                              : index === 4
                                ? '81 – 95'
                                : '96 – 100'}
                    </span>
                    <span className="tier-dot" style={{ background: tier.color }} />
                    <span className="tier-name">{tier.name}</span>
                    <span className="tier-desc">{tier.description}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="help-section">
              <h4>3. 两种鉴定模式</h4>
              <div className="help-mode">
                <strong>AI 卫星模式</strong>
                <p>
                  服务端配置了兼容 OpenAI 协议的 API Key 时启用。评分、点评与反转由大模型生成，并进行结构化校验；密钥只保存在服务端。
                </p>
              </div>
              <div className="help-mode">
                <strong>本地演示模式</strong>
                <p>
                  没有 API Key 或 AI 请求失败时自动启用。基于文本特征的可解释规则计算分数，并内置预设案例与反转。所有核心功能仍然可用，报告中会明确标注「演示模拟分析」。
                </p>
              </div>
            </section>

            <section className="help-section">
              <h4>4. 快捷键 & 彩蛋</h4>
              <ul className="help-shortcuts">
                <li><kbd>Ctrl</kbd> + <kbd>Enter</kbd> 开始鉴定</li>
                <li><kbd>Esc</kbd> 跳过启动动画 / 关闭弹窗</li>
                <li>试试空输入直接点击鉴定，或把分数推到 96 以上。</li>
                <li>双击桌面图标、观察任务栏，以及点击「开始」菜单。</li>
              </ul>
            </section>

            <section className="help-section help-disclaimer">
              <h4><AlertTriangle size={14} /> 5. 重要声明</h4>
              <p>
                本程序是娱乐产品，不判断事件真实性，不评价任何当事人，也不构成任何建议。AI 生成的反转均为虚构创作，不得冒充真实爆料。在线围观人数为虚构装饰数字。请勿将报告用于攻击、骚扰或传播未经证实的信息。
              </p>
            </section>

            <div className="help-footer">
              <span>CYBER GOSSIP 95 · HELP.HLP · 640K MEMORY REQUIRED</span>
              <RetroButton onClick={onClose}>知道了</RetroButton>
            </div>
          </div>
        </WindowFrame>
      </div>
    </div>
  )
}
