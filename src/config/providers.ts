import type { AIProvider } from '../types'

export interface ProviderConfig {
  id: string
  name: string
  url: string
  icon: string
}

/**
 * 支持系统浏览器登录 + Cookie 导入的 provider 及其登录入口 URL
 */
export const providerCookieLoginUrls: Record<string, string> = {
  gemini: 'https://gemini.google.com/app',
  chatgpt: 'https://chat.openai.com',
  grok: 'https://grok.com'
  // 注意：Copilot 使用 MSAL，登录态依赖 localStorage 和跨域 live.com 票据，仅导入 Cookie 无法生效，故不显示按钮
}

export const providerConfigs: ProviderConfig[] = [
  {
    id: 'deepseek',
    name: 'DeepSeek',
    url: 'https://chat.deepseek.com',
    icon: './icons/deepseek.svg'
  },
  {
    id: 'doubao',
    name: '豆包',
    url: 'https://www.doubao.com',
    icon: './icons/doubao.png'
  },
  {
    id: 'qwen',
    name: '通义千问',
    url: 'https://qianwen.com',
    icon: './icons/qwen.png'
  },
  {
    id: 'kimi',
    name: 'Kimi',
    url: 'https://www.kimi.com/',
    icon: './icons/kimi.png'
  },
  {
    id: 'grok',
    name: 'Grok',
    url: 'https://grok.com/',
    icon: './icons/grok.png'
  },
  {
    id: 'copilot',
    name: 'Copilot',
    url: 'https://copilot.microsoft.com',
    icon: './icons/copilot.svg'
  },
  {
    id: 'glm',
    name: 'GLM',
    url: 'https://chatglm.cn/',
    icon: './icons/glm.svg'
  },
  {
    id: 'yuanbao',
    name: '元宝',
    url: 'https://yuanbao.tencent.com/chat',
    icon: './icons/yuanbao.svg'
  },
  {
    id: 'miromind',
    name: 'MiroThinker',
    url: 'https://dr.miromind.ai/',
    icon: './icons/miromind.png'
  },
  {
    id: 'gemini',
    name: 'Gemini',
    url: 'https://gemini.google.com/',
    icon: './icons/gemini.svg'
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    url: 'https://chatgpt.com/',
    icon: './icons/chatgpt.png'
  },
  {
    id: 'mimo',
    name: 'mimo',
    url: 'https://aistudio.xiaomimimo.com/#/c',
    icon: './icons/mimo.ico'
  },
  {
    id: 'minimax',
    name: 'Minimax',
    url: 'https://agent.minimax.io/',
    icon: './icons/minimax.png'
  },
  {
    id: 'stepfun',
    name: 'StepFun',
    url: 'https://studio.stepfun.com/',
    icon: './icons/StepFunV2.webp'
  },
  {
    id: 'qwen-studio',
    name: 'qwen studio',
    url: 'https://chat.qwen.ai/',
    icon: './icons/qwen-studio.svg'
  },
  {
    id: 'gemini-studio',
    name: 'gemini studio',
    url: 'https://aistudio.google.com/prompts/new_chat',
    icon: './icons/gemini-studio.png'
  }
]

export function createDefaultProvider(config: ProviderConfig): AIProvider {
  return {
    id: config.id,
    name: config.name,
    url: config.url,
    icon: config.icon,
    isLoggedIn: false,
    sessionData: {
      cookies: [],
      localStorage: {},
      sessionStorage: {},
      isActive: false,
      lastActiveTime: new Date()
    },
    webviewId: `webview-${config.id}`,
    isEnabled: false,
    loadingState: 'idle',
    retryCount: 0
  }
}
