<template>
  <div class="webview-manager">
    <WebView
      v-for="provider in providers"
      :key="provider.id"
      :ref="(el) => setWebViewRef(provider.id, el)"
      :provider="provider"
      :width="getWebViewWidth(provider.id)"
      :height="getWebViewHeight(provider.id)"
      :auto-load="provider.isEnabled"
      class="webview-instance"
      :style="getWebViewStyle(provider.id)"
      @ready="handleWebViewReady(provider.id)"
      @loading="handleWebViewLoading(provider.id, $event)"
      @error="handleWebViewError(provider.id, $event)"
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
import WebView from './WebView.vue'
import type { AIProvider, Message } from '../../types'
import { useChatStore, useLayoutStore } from '../../stores'

// Props
interface Props {
  providers: AIProvider[]
  currentMessage?: string
}

const props = defineProps<Props>()

// Emits
interface Emits {
  (e: 'provider-ready', providerId: string): void
  (e: 'provider-error', providerId: string, error: string): void
  (e: 'login-status-changed', providerId: string, isLoggedIn: boolean): void
  (e: 'message-sent', providerId: string, success: boolean): void
}

const emit = defineEmits<Emits>()

const chatStore = useChatStore()
const layoutStore = useLayoutStore()

// WebView实例引用
const webViewRefs = ref<Record<string, InstanceType<typeof WebView> | null>>({})

// WebView状态
const webViewStates = ref<Record<string, {
  isReady: boolean
  isLoading: boolean
  hasError: boolean
  errorMessage: string
  title: string
  currentUrl: string
}>>({})

// 重试计数
const retryCounters = ref<Record<string, number>>({})

// 最大重试次数
const MAX_RETRIES = 3

// 重启间隔（毫秒）
const RESTART_DELAY = 2000

/**
 * 设置WebView引用
 */
const setWebViewRef = (providerId: string, el: InstanceType<typeof WebView> | null): void => {
  webViewRefs.value[providerId] = el

  // 初始化状态
  if (!webViewStates.value[providerId]) {
    webViewStates.value[providerId] = {
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
 * 获取WebView宽度
 */
const getWebViewWidth = (providerId: string): number => {
  const cardConfig = layoutStore.getCardConfig(providerId)
  return cardConfig?.size.width || 800
}

/**
 * 获取WebView高度
 */
const getWebViewHeight = (providerId: string): number => {
  const cardConfig = layoutStore.getCardConfig(providerId)
  return cardConfig?.size.height || 600
}

/**
 * 获取WebView样式
 */
const getWebViewStyle = (providerId: string) => {
  const cardConfig = layoutStore.getCardConfig(providerId)
  if (!cardConfig) return {}

  return {
    display: cardConfig.isVisible ? 'block' : 'none',
    position: 'absolute',
    left: `${cardConfig.position.x}px`,
    top: `${cardConfig.position.y}px`,
    width: `${cardConfig.size.width}px`,
    height: `${cardConfig.size.height}px`,
    zIndex: cardConfig.zIndex
  }
}

/**
 * WebView准备就绪处理
 */
const handleWebViewReady = (providerId: string): void => {
  webViewStates.value[providerId].isReady = true
  webViewStates.value[providerId].isLoading = false
  webViewStates.value[providerId].hasError = false
  retryCounters.value[providerId] = 0

  emit('provider-ready', providerId)

  console.log(`WebView ready: ${providerId}`)
}

/**
 * WebView加载状态处理
 */
const handleWebViewLoading = (providerId: string, isLoading: boolean): void => {
  webViewStates.value[providerId].isLoading = isLoading

  // 更新provider状态
  const provider = props.providers.find((p) => p.id === providerId)
  if (provider) {
    provider.loadingState = isLoading ? 'loading' : 'loaded'
  }
}

/**
 * WebView错误处理
 */
const handleWebViewError = (providerId: string, error: string): void => {
  webViewStates.value[providerId].hasError = true
  webViewStates.value[providerId].errorMessage = error
  webViewStates.value[providerId].isReady = false

  const provider = props.providers.find((p) => p.id === providerId)
  if (provider) {
    provider.loadingState = 'error'
    provider.lastError = error
  }

  emit('provider-error', providerId, error)

  // 自动重试机制
  if (retryCounters.value[providerId] < MAX_RETRIES) {
    setTimeout(() => {
      restartWebView(providerId)
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
  webViewStates.value[providerId].title = title

  // 更新卡片标题
  layoutStore.updateCardTitle(providerId, title)
}

/**
 * URL变化处理
 */
const handleUrlChanged = (providerId: string, url: string): void => {
  webViewStates.value[providerId].currentUrl = url
}

/**
 * 重启WebView
 */
const restartWebView = async(providerId: string): Promise<void> => {
  const webViewRef = webViewRefs.value[providerId]
  if (!webViewRef) return

  retryCounters.value[providerId]++

  try {
    // 销毁当前WebView
    webViewRef.destroy()

    // 等待一段时间后重新创建
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // 重新加载
    const provider = props.providers.find((p) => p.id === providerId)
    if (provider) {
      webViewRef.navigateTo(provider.url)
    }

    console.log(`WebView restarted: ${providerId} (attempt ${retryCounters.value[providerId]})`)
  } catch (error) {
    console.error(`Failed to restart WebView ${providerId}:`, error)
  }
}

/**
 * 刷新WebView
 */
const refreshWebView = (providerId: string): void => {
  const webViewRef = webViewRefs.value[providerId]
  if (webViewRef) {
    webViewRef.refresh()
  }
}

/**
 * 刷新所有WebView
 */
const refreshAllWebViews = (): void => {
  Object.keys(webViewRefs.value).forEach((providerId) => {
    refreshWebView(providerId)
  })
}

/**
 * 发送消息到指定WebView
 */
const sendMessageToWebView = async(providerId: string, message: string): Promise<boolean> => {
  const webViewRef = webViewRefs.value[providerId]
  if (!webViewRef || !webViewStates.value[providerId].isReady) {
    return false
  }

  try {
    await webViewRef.sendMessage(message)
    emit('message-sent', providerId, true)
    return true
  } catch (error) {
    console.error(`Failed to send message to ${providerId}:`, error)
    emit('message-sent', providerId, false)
    return false
  }
}

/**
 * 发送消息到所有WebView
 */
const sendMessageToAllWebViews = async(message: string): Promise<Record<string, boolean>> => {
  const results: Record<string, boolean> = {}

  const sendPromises = props.providers
    .filter((provider) => provider.isLoggedIn && provider.isEnabled)
    .map(async(provider) => {
      const success = await sendMessageToWebView(provider.id, message)
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
 * 检查所有WebView的登录状态
 */
const checkAllLoginStatus = async(): Promise<void> => {
  const checkPromises = Object.entries(webViewRefs.value).map(async([providerId, webViewRef]) => {
    if (webViewRef && webViewStates.value[providerId].isReady) {
      try {
        await webViewRef.checkLoginStatus()
      } catch (error) {
        console.warn(`Failed to check login status for ${providerId}:`, error)
      }
    }
  })

  await Promise.all(checkPromises)
}

/**
 * 获取WebView状态
 */
const getWebViewState = (providerId: string) => webViewStates.value[providerId] || null

/**
 * 获取所有WebView状态
 */
const getAllWebViewStates = () => ({ ...webViewStates.value })

/**
 * 启用/禁用WebView
 */
const toggleWebView = (providerId: string, enabled: boolean): void => {
  const provider = props.providers.find((p) => p.id === providerId)
  if (provider) {
    provider.isEnabled = enabled

    if (!enabled) {
      const webViewRef = webViewRefs.value[providerId]
      if (webViewRef) {
        webViewRef.destroy()
      }
    }
  }
}

// 暴露方法给父组件
defineExpose({
  refreshWebView,
  refreshAllWebViews,
  sendMessageToWebView,
  sendMessageToAllWebViews,
  checkAllLoginStatus,
  restartWebView,
  getWebViewState,
  getAllWebViewStates,
  toggleWebView
})

// 生命周期
onMounted(() => {
  // 初始化所有WebView状态
  props.providers.forEach((provider) => {
    if (!webViewStates.value[provider.id]) {
      webViewStates.value[provider.id] = {
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

  // 监听来自IPC的消息发送请求
  if (window.electronAPI) {
    // 注意：这里需要适配电子应用的IPC通信机制
    // 由于Electron的限制，我们采用更直接的方式
  }

  // 保存定时器引用以便清理
  onUnmounted(() => {
    clearInterval(loginCheckInterval)
  })
})

onUnmounted(() => {
  // 销毁所有WebView
  Object.values(webViewRefs.value).forEach((webViewRef) => {
    if (webViewRef) {
      webViewRef.destroy()
    }
  })
})
</script>

<style scoped>
.webview-manager {
  position: relative;
  width: 100%;
  height: 100%;
}

.webview-instance {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: var(--el-box-shadow-light);
  transition: all 0.3s ease;
}

.webview-instance:hover {
  box-shadow: var(--el-box-shadow);
}
</style>
