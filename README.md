# Focus Timer

一个基于 `Electron + React + TypeScript` 的桌面番茄钟应用，支持专注/休息计时、本地设置持久化与今日统计。

## 主要功能

- 三段计时模式：`Focus` / `Short Break` / `Long Break`
- 主进程计时状态机（`Date.now + endAt`，避免定时漂移）
- 设置弹窗（专注时长、休息时长、长休息间隔、自动开始下一段）
- 今日统计：番茄钟数量与专注分钟数
- 本地持久化：
  - `settings.json`（设置）
  - `history.json`（专注完成记录）
- 轻量中英文 UI（默认跟随系统语言）

## 项目结构

```text
src/
  main/        # Electron 主进程（TimerEngine、IPC、存储）
  preload/     # 安全桥接（window.timer API）
  renderer/    # React UI
  shared/      # 主进程/渲染进程共享类型
```

## 开发环境

推荐：
- Node.js 20+
- npm 10+
- VSCode + ESLint + Prettier

安装依赖：

```bash
npm install
```

## 常用命令

```bash
# 本地开发
npm run dev

# 预览构建产物
npm run start

# 质量检查
npm run typecheck
npm run lint
npm run test

# 构建（按平台）
npm run build:win
npm run build:mac
npm run build:linux
```

## 本地数据位置

应用会在 Electron `app.getPath('userData')` 下创建 `data/` 目录：

- `data/settings.json`
- `data/history.json`

## 说明

- 渲染层不直接暴露 `ipcRenderer`，统一通过 `window.timer` 调用主进程能力。
- 仅“自然完成 focus”会写入历史记录；`skip/reset` 不计入完成记录。
