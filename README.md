# ChatAllAI

一个基于 Electron + Vue3 + TypeScript 的桌面应用程序，允许用户通过单一界面同时与多个AI网站进行对话。

## 功能特性

- 🤖 支持多个AI模型同时对话（ChatGPT、Gemini、DeepSeek、豆包、Qwen、Copilot）
- 💬 统一输入框，一次输入多模型响应
- 🎨 卡片式布局，可自由调整大小
- 🔐 会话状态持久化，自动保持登录
- 🔌 支持浏览器插件
- 🎯 跨平台支持（macOS、Windows 11）

## 技术栈

- **Electron**: 跨平台桌面应用框架
- **Vue3**: 现代化前端框架
- **TypeScript**: 类型安全的JavaScript超集
- **Vite**: 快速的构建工具
- **Pinia**: Vue3状态管理
- **Element Plus**: Vue3 UI组件库

## 开发环境设置

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建应用

```bash
# 构建所有平台
npm run build

# 仅构建 macOS
npm run build:mac

# 仅构建 Windows
npm run build:win
```

### 代码规范

```bash
# ESLint 检查
npm run lint

# Prettier 格式化
npm run format
```

## 项目结构

```
chat-all-ai/
├── electron/           # Electron 主进程代码
│   ├── main.ts        # 主进程入口
│   ├── preload.ts     # 预加载脚本
│   └── utils.ts       # 工具函数
├── src/               # Vue3 渲染进程代码
│   ├── components/    # 组件
│   ├── views/         # 页面
│   ├── router/        # 路由
│   ├── stores/        # Pinia 状态管理
│   ├── types/         # TypeScript 类型定义
│   ├── utils/         # 工具函数
│   ├── App.vue        # 根组件
│   └── main.ts        # 渲染进程入口
├── public/            # 静态资源
├── dist/              # 构建输出（渲染进程）
├── dist-electron/     # 构建输出（主进程）
└── package.json       # 项目配置
```

## 开发规范

- 使用 ESLint + Airbnb 规范进行代码检查
- 使用 Prettier 进行代码格式化
- 使用 TypeScript 确保类型安全
- 遵循 Vue3 Composition API 最佳实践
- 优先使用 SVG 图标

## 许可证

MIT License