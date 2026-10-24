# 赛博吃瓜鉴定局 1995 · CYBER GOSSIP 95

一个 1990 年代 Windows 95 风格的「互联网热闹程度鉴定中心」。输入任意离谱事件，本局会从吃瓜、抓马、反转、传播四个维度给出趣味评分，生成一份不太严肃的鉴定报告，还能续写虚构反转、鉴定吃瓜人格、下载复古 PNG 证书。

> 所有评分、点评与反转均为娱乐内容，不判断事件真实性，不评价任何当事人。

## 功能

- **吃瓜事件鉴定器**：输入事件 → 动态评分动画 → 四维评分（吃瓜 / 抓马 / 反转 / 传播，0–100）
- **六级瓜田等级**：0–20 风平浪静、21–40 普通小瓜、41–60 瓜田小震、61–80 大型抓马现场、81–95 史诗级互联网名场面、96–100 瓜田核爆
- **AI 鉴定报告**：事件代号、标签、AI 点评、最离谱之处、围观建议、吃瓜人格
- **剧情反转模拟器**：AI 续写（或本地虚构引擎）明确标注 `FICTION` 的反转，重新计算评分并显示分数差；支持「离谱模式」
- **复古证书**：Canvas 绘制 1600 × 1120 PNG，浏览器内生成并可直接下载
- **吃瓜档案**：localStorage 保存最近 12 份报告，可重新打开、一键清空
- **8 个预设案例 + 随机来一瓜**
- **系统细节**：BIOS + Win95 启动动画（可跳过）、桌面图标、开始菜单、任务栏、CRT 扫描线、可开关的合成音效、彩蛋
- **双 AI 模式**：有 Key 走服务端 AI；无 Key / 请求失败时自动降级到可解释的本地演示引擎，所有按钮均可用

## 快速开始

```bash
npm install
npm run dev
```

打开 http://localhost:5173 。

`npm run dev` 会同时启动 Vite 前端（5173）和 Express API（8787），前端通过 Vite 代理访问 `/api`。

生产构建与启动：

```bash
npm run build
npm start          # 由 Express 直接托管 dist/，默认 http://localhost:8787
```

## AI 双模式

1. 复制 `.env.example` 为 `.env`，填入兼容 OpenAI Chat Completions 协议的配置：

   ```env
   AI_BASE_URL=https://api.openai.com/v1
   AI_API_KEY=sk-...
   AI_MODEL=gpt-4o-mini
   PORT=8787
   AI_TIMEOUT_MS=25000
   ```

2. 重启 `npm run dev`。侧栏与工具条会显示「AI 卫星在线」。

未配置 Key 时：

- `/api/health` 返回 `aiEnabled: false`
- 前端使用本地评分引擎：关键词特征 + 文本长度 / 标点 / 句数 + 确定性哈希，分数可解释
- 报告会标注「演示模拟分析」；AI 请求超时或报错时标注「本地演示 · AI 失联自动降级」

密钥只保存在服务端，不会进入浏览器代码。服务端对 AI 返回做 zod 结构化校验，并对每个 IP 做简单限流。

## 目录结构

```
.
├─ index.html
├─ vite.config.ts            # Vite + /api 代理到 8787
├─ server/
│  └─ index.mjs              # Express：/api/health、/api/analyze、/api/twist，生产静态托管
├─ src/
│  ├─ main.tsx
│  ├─ App.tsx                # 桌面编排、鉴定/反转流程、档案、彩蛋
│  ├─ types.ts
│  ├─ components/
│  │  ├─ Chrome.tsx          # Win95 窗口、按钮、进度条、弹窗、桌面图标、开始菜单、任务栏
│  │  ├─ BootScreen.tsx      # BIOS + Win95 splash
│  │  ├─ Analyzer.tsx        # 主窗口：输入、评分报告、反转区、动画
│  │  ├─ Certificate.tsx     # Canvas 证书与下载弹窗
│  │  └─ SideWindows.tsx     # 吃瓜档案、使用说明
│  ├─ data/presets.ts        # 8 个预设案例与人工校准分值
│  ├─ lib/
│  │  ├─ engine.ts           # 本地评分引擎、标题/点评/人格、反转生成
│  │  ├─ api.ts              # AI 请求与响应归一化
│  │  ├─ storage.ts          # localStorage 档案与偏好
│  │  ├─ sound.ts            # Web Audio 复古音效
│  │  └─ tiers.ts            # 等级与维度元数据
│  └─ styles/app.css         # 全部 Win95 视觉、布局、动画、响应式
└─ .env.example
```

## 验收路径

1. 打开网站，等待或按 `Esc` 跳过启动动画
2. 输入一段离谱事件（或点一个预设案例）
3. 点击「开始鉴定这个瓜」，查看评分滚动、四维进度条与鉴定报告
4. 点击「剧情不够刺激？再加一点戏！」，查看虚构反转与新评分
5. 点击「生成吃瓜证书」→「下载 PNG」
6. 打开「我的吃瓜档案」，确认记录可用；关闭窗口后可从桌面图标或任务栏重新打开

彩蛋：空输入直接鉴定、把分数推到 96 以上、右键式桌面图标双击、开始菜单里的「关机…」、右上角 `?` 帮助。

## 免责声明

本项目是娱乐产品，不判断事件真实性，不评价任何当事人，也不构成任何建议。AI 生成的反转均为虚构创作，不得冒充真实爆料。在线围观人数为虚构装饰数字。请勿将报告用于攻击、骚扰或传播未经证实的信息。
