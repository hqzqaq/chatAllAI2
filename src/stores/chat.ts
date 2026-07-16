import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  AIProvider, Message, Session, CustomProviderConfig
} from '../types'
import { storage } from '../utils/storage'
import { providerConfigs, createDefaultProvider } from '../config/providers'
import { usePersistentRef } from '../composables/usePersistentRef'

/**
 * localStorage key for custom providers
 */
const STORAGE_KEY_CUSTOM_PROVIDERS = 'chatallai_custom_providers'

/**
 * 聊天状态管理
 */
export const useChatStore = defineStore('chat', () => {
  // 内置AI提供商列表
  const builtInProviders = ref<AIProvider[]>(providerConfigs.map((config) => ({
    ...createDefaultProvider(config),
    isCustom: false
  })))

  // 自定义AI提供商列表
  const customProviders = ref<AIProvider[]>([])

  // 合并后的AI提供商列表
  const providers = computed<AIProvider[]>(() => [
    ...builtInProviders.value,
    ...customProviders.value
  ])

  // 当前输入的消息
  const currentMessage = ref<string>('')

  const {
    data: selectedProviders,
    save: saveSelectedProviders,
    load: loadSelectedProviders
  } = usePersistentRef<string[]>(
    'selected-providers',
    [],
    { immediate: false }
  )

  // 对话历史记录
  const conversations = ref<Record<string, Message[]>>({})

  // 会话数据
  const sessions = ref<Record<string, Session>>({})

  // 消息发送状态
  const sendingStatus = ref<Record<string, 'idle' | 'sending' | 'sent' | 'error'>>({})

  const providerMap = computed<Map<string, AIProvider>>(() => {
    const map = new Map<string, AIProvider>()
    providers.value.forEach((provider) => {
      map.set(provider.id, provider)
    })
    return map
  })

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

  const updateSelectedProviders = (providerIds: string[]): void => {
    selectedProviders.value = providerIds
  }

  /**
   * 应用选中的提供商（启用选中的提供商）
   */
  const applySelectedProviders = (): void => {
    // 遍历所有提供商（内置 + 自定义），更新 isEnabled 状态
    const allProviders = [...builtInProviders.value, ...customProviders.value]
    allProviders.forEach((provider) => {
      const shouldEnable = selectedProviders.value.includes(provider.id)
      if (provider.isEnabled !== shouldEnable) {
        // eslint-disable-next-line no-param-reassign
        provider.isEnabled = shouldEnable
        // eslint-disable-next-line no-param-reassign
        provider.loadingState = shouldEnable ? 'loading' : 'idle'
      }
    })
  }

  /**
   * 加载自定义提供商列表
   */
  const loadCustomProviders = (): void => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_CUSTOM_PROVIDERS)
      if (stored) {
        const parsed: CustomProviderConfig[] = JSON.parse(stored)
        customProviders.value = parsed.map((config) => {
          const provider = createDefaultProvider(config)
          provider.isCustom = true
          // 反序列化 Date 对象
          if (provider.sessionData.lastActiveTime) {
            provider.sessionData.lastActiveTime = new Date(provider.sessionData.lastActiveTime)
          }
          if (provider.lastActiveTime) {
            provider.lastActiveTime = new Date(provider.lastActiveTime)
          }
          return provider
        })
      }
    } catch (error) {
      console.error('加载自定义提供商失败:', error)
    }
  }

  /**
   * 保存自定义提供商列表
   */
  const saveCustomProviders = (): void => {
    try {
      const configs: CustomProviderConfig[] = customProviders.value.map((provider) => ({
        id: provider.id,
        name: provider.name,
        url: provider.url,
        icon: provider.icon,
        createdAt: new Date().toISOString()
      }))
      localStorage.setItem(STORAGE_KEY_CUSTOM_PROVIDERS, JSON.stringify(configs))
    } catch (error) {
      console.error('保存自定义提供商失败:', error)
    }
  }

  /**
   * 添加自定义提供商
   */
  const addCustomProvider = (config: { name: string; url: string; icon?: string }): AIProvider | null => {
    try {
      const id = `custom-${Date.now()}`
      const providerConfig = {
        id,
        name: config.name,
        url: config.url,
        icon: config.icon || './icons/default.svg'
      }
      const provider = createDefaultProvider(providerConfig)
      provider.isCustom = true
      customProviders.value.push(provider)
      saveCustomProviders()

      // 初始化该提供商的对话历史
      if (!conversations.value[id]) {
        conversations.value[id] = []
      }
      if (!sessions.value[id]) {
        sessions.value[id] = {
          providerId: id,
          cookies: [],
          localStorage: {},
          sessionStorage: {},
          isActive: false
        }
      }
      sendingStatus.value[id] = 'idle'

      return provider
    } catch (error) {
      console.error('添加自定义提供商失败:', error)
      return null
    }
  }

  /**
   * 更新自定义提供商
   */
  const updateCustomProvider = (providerId: string, config: { name: string; url: string; icon?: string }): boolean => {
    try {
      const provider = customProviders.value.find((p) => p.id === providerId)
      if (!provider) return false
      provider.name = config.name
      provider.url = config.url
      if (config.icon !== undefined) {
        provider.icon = config.icon
      }
      saveCustomProviders()
      return true
    } catch (error) {
      console.error('更新自定义提供商失败:', error)
      return false
    }
  }

  /**
   * 删除自定义提供商
   */
  const removeCustomProvider = (providerId: string): boolean => {
    try {
      const index = customProviders.value.findIndex((p) => p.id === providerId)
      if (index === -1) return false
      customProviders.value.splice(index, 1)
      saveCustomProviders()
      return true
    } catch (error) {
      console.error('删除自定义提供商失败:', error)
      return false
    }
  }

  /**
   * 初始化对话历史
   */
  const initializeConversations = (): void => {
    // 先加载自定义提供商
    loadCustomProviders()

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
    const provider = providerMap.value.get(providerId)
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
  const getProvider = (providerId: string): AIProvider | undefined => providerMap.value.get(providerId)

  /**
   * 获取对话历史
   */
  const getConversation = (providerId: string): Message[] => conversations.value[providerId] || []

  /**
   * 更新提供商加载状态
   */
  const updateProviderLoadingState = (providerId: string, state: 'idle' | 'loading' | 'loaded' | 'error'): void => {
    const provider = providerMap.value.get(providerId)
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
    const provider = providerMap.value.get(providerId)
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
    const provider = providerMap.value.get(providerId)
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
    const provider = providerMap.value.get(providerId)
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
    const provider = providerMap.value.get(providerId)
    if (provider) {
      provider.lastActiveTime = new Date()
      provider.sessionData.lastActiveTime = new Date()
    }
  }

  return {
    providers,
    providerMap,
    builtInProviders,
    customProviders,
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
    updateProviderActiveTime,
    addCustomProvider,
    updateCustomProvider,
    removeCustomProvider,
    loadCustomProviders,
    saveCustomProviders
  }
})
