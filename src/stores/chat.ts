import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AIProvider, Message, Session } from '../types'

/**
 * 聊天状态管理
 */
export const useChatStore = defineStore('chat', () => {
  // AI提供商列表
  const providers = ref<AIProvider[]>([
    {
      id: 'deepseek',
      name: 'DeepSeek',
      url: 'https://chat.deepseek.com',
      icon: './icons/deepseek.svg',
      isLoggedIn: false,
      sessionData: {
        cookies: [],
        localStorage: {},
        sessionStorage: {},
        isActive: false,
        lastActiveTime: new Date()
      },
      webviewId: 'webview-deepseek',
      isEnabled: false,
      loadingState: 'idle',
      retryCount: 0
    },
    {
      id: 'doubao',
      name: '豆包',
      url: 'https://www.doubao.com',
      icon: './icons/doubao.png',
      isLoggedIn: false,
      sessionData: {
        cookies: [],
        localStorage: {},
        sessionStorage: {},
        isActive: false,
        lastActiveTime: new Date()
      },
      webviewId: 'webview-doubao',
      isEnabled: false,
      loadingState: 'idle',
      retryCount: 0
    },
    {
      id: 'qwen',
      name: 'Qwen',
      url: 'https://tongyi.com',
      icon: './icons/qwen.png',
      isLoggedIn: false,
      sessionData: {
        cookies: [],
        localStorage: {},
        sessionStorage: {},
        isActive: false,
        lastActiveTime: new Date()
      },
      webviewId: 'webview-qwen',
      isEnabled: false,
      loadingState: 'idle',
      retryCount: 0
    },
    {
      id: 'kimi',
      name: 'kimi',
      url: 'https://www.kimi.com/',
      icon: './icons/kimi.png',
      isLoggedIn: false,
      sessionData: {
        cookies: [],
        localStorage: {},
        sessionStorage: {},
        isActive: false,
        lastActiveTime: new Date()
      },
      webviewId: 'webview-kimi',
      isEnabled: false,
      loadingState: 'idle',
      retryCount: 0
    },
    {
      id: 'gork',
      name: 'gork',
      url: 'https://grok.com/',
      icon: './icons/grok.png',
      isLoggedIn: false,
      sessionData: {
        cookies: [],
        localStorage: {},
        sessionStorage: {},
        isActive: false,
        lastActiveTime: new Date()
      },
      webviewId: 'webview-gork',
      isEnabled: false,
      loadingState: 'idle',
      retryCount: 0
    },
    {
      id: 'copilot',
      name: 'Copilot',
      url: 'https://copilot.microsoft.com',
      icon: './icons/copilot.svg',
      isLoggedIn: false,
      sessionData: {
        cookies: [],
        localStorage: {},
        sessionStorage: {},
        isActive: false,
        lastActiveTime: new Date()
      },
      webviewId: 'webview-copilot',
      isEnabled: false,
      loadingState: 'idle',
      retryCount: 0
    },
    {
      id: 'glm',
      name: 'GLM',
      url: 'https://chatglm.cn/main/alltoolsdetail?lang=zh',
      icon: './icons/glm.svg',
      isLoggedIn: false,
      sessionData: {
        cookies: [],
        localStorage: {},
        sessionStorage: {},
        isActive: false,
        lastActiveTime: new Date()
      },
      webviewId: 'webview-glm',
      isEnabled: false,
      loadingState: 'idle',
      retryCount: 0
    },
    {
      id: 'yuanbao',
      name: 'YuanBao',
      url: 'https://yuanbao.tencent.com/chat',
      icon: './icons/yuanbao.svg',
      isLoggedIn: false,
      sessionData: {
        cookies: [],
        localStorage: {},
        sessionStorage: {},
        isActive: false,
        lastActiveTime: new Date()
      },
      webviewId: 'webview-yuanbao',
      isEnabled: false,
      loadingState: 'idle',
      retryCount: 0
    }
  ])

  // 当前输入的消息
  const currentMessage = ref<string>('')

  // 对话历史记录
  const conversations = ref<Record<string, Message[]>>({})

  // 会话数据
  const sessions = ref<Record<string, Session>>({})

  // 消息发送状态
  const sendingStatus = ref<Record<string, 'idle' | 'sending' | 'sent' | 'error'>>({})

  // 计算属性
  const loggedInProviders = computed(() => providers.value.filter((provider) => provider.isLoggedIn))

  const totalProviders = computed(() => providers.value.length)

  const loggedInCount = computed(() => loggedInProviders.value.length)

  /**
     * 初始化对话历史
     */
  const initializeConversations = (): void => {
    providers.value.forEach((provider) => {
      if (!conversations.value[provider.id]) {
        conversations.value[provider.id] = []
      }
      if (!sessions.value[provider.id]) {
        sessions.value[provider.id] = {
          providerId: provider.id,
          cookies: [],
          localStorage: {},
          sessionStorage: {},
          isActive: false
        }
      }
      sendingStatus.value[provider.id] = 'idle'
    })
  }

  /**
     * 添加消息到对话历史
     */
  const addMessage = (providerId: string, message: Message): void => {
    if (!conversations.value[providerId]) {
      conversations.value[providerId] = []
    }
    conversations.value[providerId].push(message)
  }

  /**
     * 更新提供商登录状态
     */
  const updateProviderLoginStatus = (providerId: string, isLoggedIn: boolean): void => {
    const provider = providers.value.find((p) => p.id === providerId)
    if (provider) {
      provider.isLoggedIn = isLoggedIn
    }
  }

  /**
     * 更新会话数据
     */
  const updateSession = (providerId: string, sessionData: Partial<Session>): void => {
    if (sessions.value[providerId]) {
      sessions.value[providerId] = { ...sessions.value[providerId], ...sessionData }
    }
  }

  /**
     * 设置消息发送状态
     */
  const setSendingStatus = (providerId: string, status: 'idle' | 'sending' | 'sent' | 'error'): void => {
    sendingStatus.value[providerId] = status
  }

  /**
     * 获取消息发送状态
     */
  const getSendingStatus = (providerId: string): 'idle' | 'sending' | 'sent' | 'error' => sendingStatus.value[providerId] || 'idle'

  /**
     * 检查是否有正在发送的消息
     */
  const hasSendingMessages = (): boolean => Object.values(sendingStatus.value).some((status) => status === 'sending')

  /**
     * 清空当前消息
     */
  const clearCurrentMessage = (): void => {
    currentMessage.value = ''
  }

  /**
     * 获取提供商信息
     */
  const getProvider = (providerId: string): AIProvider | undefined => providers.value.find((p) => p.id === providerId)

  /**
     * 获取对话历史
     */
  const getConversation = (providerId: string): Message[] => conversations.value[providerId] || []

  /**
     * 更新提供商加载状态
     */
  const updateProviderLoadingState = (providerId: string, state: 'idle' | 'loading' | 'loaded' | 'error'): void => {
    const provider = providers.value.find((p) => p.id === providerId)
    if (provider) {
      provider.loadingState = state
      if (state === 'loaded') {
        provider.retryCount = 0
        provider.lastError = undefined
      }
    }
  }

  /**
     * 更新提供商错误信息
     */
  const updateProviderError = (providerId: string, error: string): void => {
    const provider = providers.value.find((p) => p.id === providerId)
    if (provider) {
      provider.loadingState = 'error'
      provider.lastError = error
      provider.retryCount = (provider.retryCount || 0) + 1
    }
  }

  /**
     * 启用/禁用提供商
     */
  const toggleProvider = (providerId: string, enabled: boolean): void => {
    const provider = providers.value.find((p) => p.id === providerId)
    if (provider) {
      provider.isEnabled = enabled
      if (enabled) {
        provider.loadingState = 'loading'
      } else {
        provider.loadingState = 'idle'
      }
    }
  }

  /**
     * 重置提供商状态
     */
  const resetProviderState = (providerId: string): void => {
    const provider = providers.value.find((p) => p.id === providerId)
    if (provider) {
      provider.loadingState = 'idle'
      provider.lastError = undefined
      provider.retryCount = 0
    }
  }

  /**
     * 更新提供商最后活跃时间
     */
  const updateProviderActiveTime = (providerId: string): void => {
    const provider = providers.value.find((p) => p.id === providerId)
    if (provider) {
      provider.lastActiveTime = new Date()
      provider.sessionData.lastActiveTime = new Date()
    }
  }

  return {
    providers,
    currentMessage,
    conversations,
    sessions,
    sendingStatus,
    loggedInProviders,
    totalProviders,
    loggedInCount,
    initializeConversations,
    addMessage,
    updateProviderLoginStatus,
    updateSession,
    setSendingStatus,
    getSendingStatus,
    hasSendingMessages,
    clearCurrentMessage,
    getProvider,
    getConversation,
    updateProviderLoadingState,
    updateProviderError,
    toggleProvider,
    resetProviderState,
    updateProviderActiveTime
  }
})
