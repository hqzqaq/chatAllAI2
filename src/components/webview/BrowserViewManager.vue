<template>
  <div
    class="browserview-manager"
    :class="layoutClass"
  >
    <BrowserViewContainer
      v-for="provider in providers"
      :key="provider.id"
      :ref="(el) => setBrowserViewRef(provider.id, el)"
      :provider="provider"
      :width="getBrowserViewWidth(provider.id)"
      :height="getBrowserViewHeight(provider.id)"
      :auto-load="provider.isEnabled"
      class="browserview-instance"
      :style="getBrowserViewStyle(provider.id)"
      @ready="handleBrowserViewReady(provider.id)"
      @loading="handleBrowserViewLoading(provider.id, $event)"
      @error="handleBrowserViewError(provider.id, $event)"
      @login-status-changed="handleLoginStatusChanged(provider.id, $event)"
      @title-changed="handleTitleChanged(provider.id, $event)"
      @url-changed="handleUrlChanged(provider.id, $event)"
    />
  </div>
</template>

<script setup lang="ts">
import {
  ref, computed, onMounted, onUnmounted
} from 'vue'
import { ElMessage } from 'element-plus'
import BrowserViewContainer from './BrowserViewContainer.vue'
import type { AIProvider, Message } from '@/types'
import { useChatStore, useLayoutStore } from '@/stores'

// Props
interface Props {
  providers: AIProvider[]
  layout?: 'grid' | 'list'
  columns?: number
}

const props = withDefaults(defineProps<Props>(), {
  layout: 'grid',
  columns: 3
})

// Emits
interface Emits {
  (e: 'provider-ready', providerId: string): void
  (e: 'provider-error', providerId: string, error: string): void
  (e: 'all-providers-ready'): void
  (e: 'login-status-changed', providerId: string, isLoggedIn: boolean): void
}

const emit = defineEmits<Emits>()

const chatStore = useChatStore()
const layoutStore = useLayoutStore()

// BrowserViewContainer 实例引用
const browserViewRefs = ref<Map<string, InstanceType<typeof BrowserViewContainer> | null>>(
  new Map()
)

// BrowserView 状态
interface BrowserViewState {
  isReady: boolean
  isLoading: boolean
  hasError: boolean
  errorMessage: string
  title: string
  currentUrl: string
}

const browserViewStates = ref<Record<string, BrowserViewState>>({})

// 重试计数
const retryCounters = ref<Record<string, number>>({})

// 最大重试次数
const MAX_RETRIES = 3

// 重启间隔（毫秒）
const RESTART_DELAY = 2000

// 布局类名
const layoutClass = computed(() => ({
  'layout-grid': props.layout === 'grid',
  'layout-list': props.layout === 'list'
}))

/**
 * 设置 BrowserView 引用
 */
const setBrowserViewRef = (
  providerId: string,
  el: InstanceType<typeof BrowserViewContainer> | null
): void => {
  browserViewRefs.value.set(providerId, el)

  // 初始化状态
  if (!browserViewStates.value[providerId]) {
    browserViewStates.value[providerId] = {
      isReady: false,
      isLoading: false,
      hasError: false,
      errorMessage: '',
      title: '',
      currentUrl: ''
    }
  }

  if (!retryCounters.value[providerId]) {
    retryCounters.value[providerId] = 0
  }
}

/**
 * 获取 BrowserView 引用
 */
const getBrowserViewRef = (
  providerId: string
): InstanceType<typeof BrowserViewContainer> | null => (
  browserViewRefs.value.get(providerId) || null
)

/**
 * 获取 BrowserView 宽度
 */
const getBrowserViewWidth = (providerId: string): number => {
  const cardConfig = layoutStore.getCardConfig(providerId)
  return cardConfig?.size.width || 800
}

/**
 * 获取 BrowserView 高度
 */
const getBrowserViewHeight = (providerId: string): number => {
  const cardConfig = layoutStore.getCardConfig(providerId)
  return cardConfig?.size.height || 600
}

/**
 * 获取 BrowserView 样式
 */
const getBrowserViewStyle = (providerId: string) => {
  const cardConfig = layoutStore.getCardConfig(providerId)
  if (!cardConfig) return {}

  // 如果卡片被隐藏（最大化时），使用 visibility 和 opacity 隐藏，但不销毁 BrowserView
  const isHidden = cardConfig.isHidden === true

  return {
    display: cardConfig.isVisible ? 'block' : 'none',
    visibility: isHidden ? 'hidden' : 'visible',
    opacity: isHidden ? 0 : 1,
    position: 'absolute',
    left: `${cardConfig.position.x}px`,
    top: `${cardConfig.position.y}px`,
    width: `${cardConfig.size.width}px`,
    height: `${cardConfig.size.height}px`,
    zIndex: cardConfig.zIndex,
    transition: 'opacity 0.3s ease, visibility 0.3s ease'
  }
}

/**
 * BrowserView 准备就绪处理
 */
const handleBrowserViewReady = (providerId: string): void => {
  browserViewStates.value[providerId].isReady = true
  browserViewStates.value[providerId].isLoading = false
  browserViewStates.value[providerId].hasError = false
  retryCounters.value[providerId] = 0

  emit('provider-ready', providerId)

  // 检查是否所有 provider 都准备就绪
  const allReady = props.providers.every(
    (provider) => browserViewStates.value[provider.id]?.isReady
  )
  if (allReady) {
    emit('all-providers-ready')
  }

  console.log(`BrowserView ready: ${providerId}`)
}

/**
 * BrowserView 加载状态处理
 */
const handleBrowserViewLoading = (providerId: string, isLoading: boolean): void => {
  browserViewStates.value[providerId].isLoading = isLoading

  // 更新 provider 状态
  const provider = props.providers.find((p) => p.id === providerId)
  if (provider) {
    provider.loadingState = isLoading ? 'loading' : 'loaded'
  }
}

/**
 * BrowserView 错误处理
 */
const handleBrowserViewError = (providerId: string, error: string): void => {
  browserViewStates.value[providerId].hasError = true
  browserViewStates.value[providerId].errorMessage = error
  browserViewStates.value[providerId].isReady = false

  const provider = props.providers.find((p) => p.id === providerId)
  if (provider) {
    provider.loadingState = 'error'
    provider.lastError = error
  }

  emit('provider-error', providerId, error)

  // 自动重试机制
  if (retryCounters.value[providerId] < MAX_RETRIES) {
    setTimeout(() => {
      restartBrowserView(providerId)
    }, RESTART_DELAY)
  } else {
    ElMessage.error(`${provider?.name || providerId} 加载失败，已达到最大重试次数`)
  }
}

/**
 * 登录状态变化处理
 */
const handleLoginStatusChanged = (providerId: string, isLoggedIn: boolean): void => {
  chatStore.updateProviderLoginStatus(providerId, isLoggedIn)
  emit('login-status-changed', providerId, isLoggedIn)

  console.log(`Login status changed: ${providerId} = ${isLoggedIn}`)
}

/**
 * 标题变化处理
 */
const handleTitleChanged = (providerId: string, title: string): void => {
  browserViewStates.value[providerId].title = title

  // 更新卡片标题
  layoutStore.updateCardTitle(providerId, title)
}

/**
 * URL 变化处理
 */
const handleUrlChanged = (providerId: string, url: string): void => {
  browserViewStates.value[providerId].currentUrl = url
}

/**
 * 重启 BrowserView
 */
const restartBrowserView = async(providerId: string): Promise<void> => {
  const browserViewRef = browserViewRefs.value.get(providerId)
  if (!browserViewRef) return

  retryCounters.value[providerId] += 1

  try {
    // 销毁当前 BrowserView
    await browserViewRef.destroy()

    // 等待一段时间后重新创建
    await new Promise((resolve) => {
      setTimeout(resolve, 1000)
    })

    // 重新加载
    const provider = props.providers.find((p) => p.id === providerId)
    if (provider) {
      await browserViewRef.navigateTo(provider.url)
    }

    console.log(`BrowserView restarted: ${providerId} (attempt ${retryCounters.value[providerId]})`)
  } catch (error) {
    console.error(`Failed to restart BrowserView ${providerId}:`, error)
  }
}

/**
 * 刷新 BrowserView
 */
const refreshBrowserView = async(providerId: string): Promise<void> => {
  const browserViewRef = browserViewRefs.value.get(providerId)
  if (browserViewRef) {
    try {
      await browserViewRef.refresh()
    } catch (error) {
      console.error(`Failed to refresh BrowserView ${providerId}:`, error)
    }
  }
}

/**
 * 刷新所有 BrowserView
 */
const refreshAllBrowserViews = async(): Promise<void> => {
  const promises: Promise<void>[] = []
  browserViewRefs.value.forEach((_, providerId) => {
    promises.push(refreshBrowserView(providerId))
  })
  await Promise.all(promises)
}

/**
 * 发送消息到指定 BrowserView
 */
const sendMessageToBrowserView = async(
  providerId: string,
  message: string
): Promise<boolean> => {
  const browserViewRef = browserViewRefs.value.get(providerId)
  if (!browserViewRef || !browserViewStates.value[providerId]?.isReady) {
    return false
  }

  try {
    await browserViewRef.sendMessage(message)
    return true
  } catch (error) {
    console.error(`Failed to send message to ${providerId}:`, error)
    return false
  }
}

/**
 * 发送消息到所有 BrowserView
 */
const sendMessageToAllBrowserViews = async(
  message: string
): Promise<Record<string, boolean>> => {
  const results: Record<string, boolean> = {}

  const sendPromises = props.providers
    .filter((provider) => provider.isLoggedIn && provider.isEnabled)
    .map(async(provider) => {
      const success = await sendMessageToBrowserView(provider.id, message)
      results[provider.id] = success

      // 更新发送状态
      chatStore.setSendingStatus(provider.id, success ? 'sent' : 'error')

      // 添加消息到对话历史
      if (success) {
        const messageObj: Message = {
          id: `${Date.now()}-${provider.id}`,
          content: message,
          timestamp: new Date(),
          sender: 'user',
          providerId: provider.id,
          status: 'sent'
        }
        chatStore.addMessage(provider.id, messageObj)
      }
    })

  await Promise.all(sendPromises)
  return results
}

/**
 * 检查所有 BrowserView 的登录状态
 */
const checkAllLoginStatus = async(): Promise<void> => {
  const checkPromises: Promise<void>[] = []

  browserViewRefs.value.forEach((browserViewRef, providerId) => {
    if (browserViewRef && browserViewStates.value[providerId]?.isReady) {
      checkPromises.push(
        browserViewRef.checkLoginStatus().catch((error) => {
          console.warn(`Failed to check login status for ${providerId}:`, error)
        })
      )
    }
  })

  await Promise.all(checkPromises)
}

/**
 * 获取 BrowserView 状态
 */
const getBrowserViewState = (providerId: string): BrowserViewState | null => (
  browserViewStates.value[providerId] || null
)

/**
 * 获取所有 BrowserView 状态
 */
const getAllBrowserViewStates = (): Record<string, BrowserViewState> => (
  { ...browserViewStates.value }
)

/**
 * 启用/禁用 BrowserView
 */
const toggleBrowserView = (providerId: string, enabled: boolean): void => {
  const provider = props.providers.find((p) => p.id === providerId)
  if (provider) {
    provider.isEnabled = enabled

    if (!enabled) {
      const browserViewRef = browserViewRefs.value.get(providerId)
      if (browserViewRef) {
        browserViewRef.destroy().catch((error) => {
          console.error(`Failed to destroy BrowserView ${providerId}:`, error)
        })
      }
    }
  }
}

// 暴露方法给父组件（兼容 WebViewManager 的接口）
defineExpose({
  // 原始 BrowserView 方法
  getBrowserViewRef,
  sendMessageToBrowserView,
  sendMessageToAllBrowserViews,
  checkAllLoginStatus,
  refreshBrowserView,
  refreshAllBrowserViews,
  restartBrowserView,
  getBrowserViewState,
  getAllBrowserViewStates,
  toggleBrowserView,

  // 兼容 WebViewManager 的接口
  getWebViewRef: getBrowserViewRef,
  sendMessageToWebView: sendMessageToBrowserView,
  sendMessageToAllWebViews: sendMessageToAllBrowserViews,
  refreshWebView: refreshBrowserView,
  refreshAllWebViews: refreshAllBrowserViews
})

// 生命周期
onMounted(() => {
  // 初始化所有 BrowserView 状态
  props.providers.forEach((provider) => {
    if (!browserViewStates.value[provider.id]) {
      browserViewStates.value[provider.id] = {
        isReady: false,
        isLoading: false,
        hasError: false,
        errorMessage: '',
        title: provider.name,
        currentUrl: provider.url
      }
    }

    if (!retryCounters.value[provider.id]) {
      retryCounters.value[provider.id] = 0
    }
  })

  // 定期检查登录状态
  const loginCheckInterval = setInterval(() => {
    checkAllLoginStatus()
  }, 30000) // 每30秒检查一次

  // 保存定时器引用以便清理
  onUnmounted(() => {
    clearInterval(loginCheckInterval)
  })
})

onUnmounted(() => {
  // 销毁所有 BrowserView
  browserViewRefs.value.forEach((browserViewRef) => {
    if (browserViewRef) {
      browserViewRef.destroy().catch((error) => {
        console.error('Failed to destroy BrowserView:', error)
      })
    }
  })
})
</script>

<style scoped>
.browserview-manager {
  position: relative;
  width: 100%;
  height: 100%;
}

.browserview-instance {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: var(--el-box-shadow-light);
  transition: all 0.3s ease;
}

.browserview-instance:hover {
  box-shadow: var(--el-box-shadow);
}

/* 网格布局 */
.layout-grid {
  display: grid;
  gap: 16px;
}

/* 列表布局 */
.layout-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.layout-list .browserview-instance {
  width: 100%;
}
</style>
