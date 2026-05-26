import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AIProvider, Message, Session } from '../types'
import { storage } from '../utils/storage'
import { providerConfigs, createDefaultProvider } from '../config/providers'

/**
 * 聊天状态管理
 */
export const useChatStore = defineStore('chat', () => {
  // AI提供商列表
  const providers = ref<AIProvider[]>(providerConfigs.map(createDefaultProvider))

  // 当前输入的消息
  const currentMessage = ref<string>('')

  // 选中的提供商列表（用于排序）
  const selectedProviders = ref<string[]>([])

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
   * 加载所有提供商的代理配置
   */
  const loadProxyConfigs = (): void => {
    try {
      providers.value.forEach((provider) => {
        const storedConfig = storage.get(`proxy-config-${provider.id}`)
        if (storedConfig) {
          console.log(`Loaded proxy config for ${provider.name}:`, storedConfig)
        }
      })
    } catch (error) {
      console.error('Failed to load proxy configs:', error)
    }
  }

  /**
   * 加载选中的提供商列表
   */
  const loadSelectedProviders = (): void => {
    try {
      const stored = storage.get<string[]>('selected-providers')
      if (stored) {
        selectedProviders.value = stored
      }
    } catch (error) {
      console.error('加载选中的提供商失败:', error)
    }
  }

  /**
   * 保存选中的提供商列表
   */
  const saveSelectedProviders = (): void => {
    try {
      storage.set('selected-providers', selectedProviders.value)
    } catch (error) {
      console.error('保存选中的提供商失败:', error)
    }
  }

  /**
   * 更新选中的提供商列表
   */
  const updateSelectedProviders = (providerIds: string[]): void => {
    selectedProviders.value = providerIds
    saveSelectedProviders()
  }

  /**
   * 应用选中的提供商（启用选中的提供商）
   */
  const applySelectedProviders = (): void => {
    providers.value = providers.value.map((provider) => {
      const shouldEnable = selectedProviders.value.includes(provider.id)
      if (provider.isEnabled !== shouldEnable) {
        return {
          ...provider,
          isEnabled: shouldEnable,
          loadingState: shouldEnable ? 'loading' : 'idle'
        }
      }
      return provider
    })
  }

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
    // 加载代理配置
    loadProxyConfigs()
    // 加载选中的提供商列表
    loadSelectedProviders()
    // 应用选中的提供商（启用选中的提供商）
    applySelectedProviders()
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
    selectedProviders,
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
    loadSelectedProviders,
    saveSelectedProviders,
    updateSelectedProviders,
    applySelectedProviders,
    updateProviderLoadingState,
    updateProviderError,
    toggleProvider,
    resetProviderState,
    updateProviderActiveTime
  }
})
