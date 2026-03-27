<template>
  <div
    ref="containerRef"
    class="browserview-wrapper"
    :class="{ loading: isLoading, error: hasError }"
  >
    <!-- 加载状态 -->
    <div
      v-if="isLoading"
      class="loading-overlay"
    >
      <el-icon class="loading-icon">
        <Loading />
      </el-icon>
      <p>正在加载 {{ provider.name }}...</p>
    </div>

    <!-- 错误状态 -->
    <div
      v-if="hasError"
      class="error-overlay"
    >
      <el-icon class="error-icon">
        <Warning />
      </el-icon>
      <p>{{ errorMessage }}</p>
      <el-button
        type="primary"
        @click="retry"
      >
        重试
      </el-button>
    </div>

    <!-- BrowserView 容器 - 用于定位和同步 -->
    <div
      class="browserview-container"
      :style="{
        visibility: hasError ? 'hidden' : 'visible',
        opacity: isLoading ? '0.5' : '1'
      }"
    />
  </div>
</template>

<script setup lang="ts">
import {
  ref, computed, onMounted, onUnmounted, watch
} from 'vue'
import { Loading, Warning } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { AIProvider } from '@/types'
import { getSendMessageScript } from '@/utils/MessageScripts.ts'
import { getLoginCheckScript } from '@/utils/LoginCheckScripts.ts'

// Props
interface Props {
  provider: AIProvider
  width?: number
  height?: number
  autoLoad?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  width: 800,
  height: 600,
  autoLoad: true
})

// Emits
interface Emits {
  (e: 'ready', providerId: string): void
  (e: 'loading', providerId: string, loading: boolean): void
  (e: 'error', providerId: string, error: string): void
  (e: 'login-status-changed', providerId: string, isLoggedIn: boolean): void
  (e: 'title-changed', providerId: string, title: string): void
  (e: 'url-changed', providerId: string, url: string): void
}

const emit = defineEmits<Emits>()

// 响应式数据
const containerRef = ref<HTMLDivElement | null>(null)
const isLoading = ref(false)
const hasError = ref(false)
const errorMessage = ref('')
const retryCount = ref(0)
const maxRetries = 3
const saveSessionTimer = ref<ReturnType<typeof setInterval> | null>(null)
const loginCheckTimer = ref<ReturnType<typeof setInterval> | null>(null)
const sessionLoaded = ref(false)
const isVisible = ref(true)
const isCreated = ref(false)

// ResizeObserver 和 IntersectionObserver 实例
let resizeObserver: ResizeObserver | null = null
let intersectionObserver: IntersectionObserver | null = null

// 计算原始 providerId（处理 summary- 前缀）
const originalProviderId = computed(() => {
  let providerId = props.provider.id
  if (providerId.startsWith('summary-')) {
    providerId = providerId.replace('summary-', '')
  }
  return providerId
})

// 计算 partition
const partition = computed(() => `persist:${originalProviderId.value}`)

/**
 * Throttle 函数 - 限制函数执行频率
 * @param fn 要节流的函数
 * @param delay 延迟时间（毫秒）
 */
function throttle<T extends(...args: any[]) => void>(fn: T, delay: number): (...args: Parameters<T>) => void {
  let lastCall = 0
  return (...args: Parameters<T>) => {
    const now = Date.now()
    if (now - lastCall >= delay) {
      lastCall = now
      fn(...args)
    }
  }
}

/**
 * 获取容器在窗口中的坐标
 * BrowserView 的坐标是相对于 BrowserWindow 的，不是相对于屏幕的
 */
const getContainerScreenBounds = (): { x: number; y: number; width: number; height: number } | null => {
  if (!containerRef.value) return null

  const rect = containerRef.value.getBoundingClientRect()
  
  // BrowserView 的坐标是相对于 BrowserWindow 内容区域的
  // getBoundingClientRect 返回的就是相对于窗口内容区域的坐标
  // 所以直接使用 rect.left 和 rect.top 即可
  const bounds = {
    x: Math.round(rect.left),
    y: Math.round(rect.top),
    width: Math.round(rect.width),
    height: Math.round(rect.height)
  }
  
  // 调试日志
  console.log('[BrowserViewContainer] Coordinate calculation:', {
    provider: props.provider.name,
    rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
    calculated: bounds
  })
  
  return bounds
}

/**
 * 同步 BrowserView 位置和大小
 */
const syncBrowserViewBounds = async(): Promise<void> => {
  if (!isCreated.value || !isVisible.value) return

  const bounds = getContainerScreenBounds()
  if (!bounds) return

  try {
    if (window.electronAPI && 'setBrowserViewBounds' in window.electronAPI) {
      await (window.electronAPI as any).setBrowserViewBounds({
        providerId: originalProviderId.value,
        bounds
      })
    }
  } catch (error) {
    console.error(`Failed to sync BrowserView bounds for ${props.provider.name}:`, error)
  }
}

// 使用 throttle 限制位置更新频率为 60fps (16ms)
const throttledSyncBounds = throttle(syncBrowserViewBounds, 16)

/**
 * 显示 BrowserView
 */
const showBrowserView = async(): Promise<void> => {
  if (!isCreated.value) return

  try {
    if (window.electronAPI && 'showBrowserView' in window.electronAPI) {
      await (window.electronAPI as any).showBrowserView({
        providerId: originalProviderId.value
      })
    }
  } catch (error) {
    console.error(`Failed to show BrowserView for ${props.provider.name}:`, error)
  }
}

/**
 * 隐藏 BrowserView
 */
const hideBrowserView = async(): Promise<void> => {
  if (!isCreated.value) return

  try {
    if (window.electronAPI && 'hideBrowserView' in window.electronAPI) {
      await (window.electronAPI as any).hideBrowserView({
        providerId: originalProviderId.value
      })
    }
  } catch (error) {
    console.error(`Failed to hide BrowserView for ${props.provider.name}:`, error)
  }
}

/**
 * 创建 BrowserView
 */
const createBrowserView = async(): Promise<void> => {
  if (!window.electronAPI) {
    console.error('electronAPI not available')
    return
  }

  if (isCreated.value) {
    console.log(`BrowserView for ${props.provider.name} already exists`)
    return
  }

  try {
    console.log(`Creating BrowserView for ${props.provider.name}`)
    isLoading.value = true
    hasError.value = false
    emit('loading', props.provider.id, true)

    // 获取 preload 脚本路径
    let preloadPath: string | undefined
    try {
      preloadPath = await window.electronAPI.getPreloadPath('webview-preload.js')
    } catch (e) {
      console.warn('Failed to get preload path:', e)
    }

    // 创建 BrowserView
    const createMethod = (window.electronAPI as any).createBrowserView
      || (window.electronAPI as any).createWebView

    if (!createMethod) {
      throw new Error('createBrowserView method not available')
    }

    await createMethod({
      providerId: originalProviderId.value,
      url: props.provider.url,
      partition: partition.value,
      preload: preloadPath ? `file://${preloadPath}` : undefined
    })

    isCreated.value = true
    console.log(`BrowserView created for ${props.provider.name}`)

    // 同步初始位置
    await syncBrowserViewBounds()
    await showBrowserView()

    // 设置事件监听
    setupBrowserViewListeners()

    // 启动登录状态检查定时器
    startLoginCheckTimer()

    // 启动会话保存定时器
    startSessionSaveTimer()

    isLoading.value = false
    emit('loading', props.provider.id, false)
    emit('ready', props.provider.id)
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error(`Failed to create BrowserView for ${props.provider.name}:`, msg)
    isLoading.value = false
    hasError.value = true
    errorMessage.value = `创建失败: ${msg}`
    emit('loading', props.provider.id, false)
    emit('error', props.provider.id, msg)
  }
}

/**
 * 销毁 BrowserView
 */
const destroyBrowserView = async(): Promise<void> => {
  // 清除定时器
  stopTimers()

  if (!isCreated.value || !window.electronAPI) return

  try {
    console.log(`Destroying BrowserView for ${props.provider.name}`)

    const destroyMethod = (window.electronAPI as any).destroyBrowserView
      || (window.electronAPI as any).destroyWebView

    if (destroyMethod) {
      await destroyMethod({
        providerId: originalProviderId.value
      })
    }

    isCreated.value = false
    console.log(`BrowserView destroyed for ${props.provider.name}`)
  } catch (error) {
    console.error(`Failed to destroy BrowserView for ${props.provider.name}:`, error)
  }
}

/**
 * 设置 BrowserView 事件监听
 */
const setupBrowserViewListeners = (): void => {
  if (!window.electronAPI) return

  // 监听页面标题变化
  if ('onBrowserViewTitleChanged' in window.electronAPI) {
    (window.electronAPI as any).onBrowserViewTitleChanged((data: { providerId: string; title: string }) => {
      if (data.providerId === originalProviderId.value) {
        emit('title-changed', props.provider.id, data.title)
      }
    })
  }

  // 监听 URL 变化
  if ('onBrowserViewUrlChanged' in window.electronAPI) {
    (window.electronAPI as any).onBrowserViewUrlChanged((data: { providerId: string; url: string }) => {
      if (data.providerId === originalProviderId.value) {
        emit('url-changed', props.provider.id, data.url)
      }
    })
  }

  // 监听加载状态
  if ('onBrowserViewLoading' in window.electronAPI) {
    (window.electronAPI as any).onBrowserViewLoading((data: { providerId: string; loading: boolean }) => {
      if (data.providerId === originalProviderId.value) {
        isLoading.value = data.loading
        emit('loading', props.provider.id, data.loading)
      }
    })
  }

  // 监听错误
  if ('onBrowserViewError' in window.electronAPI) {
    (window.electronAPI as any).onBrowserViewError((data: { providerId: string; error: string }) => {
      if (data.providerId === originalProviderId.value) {
        hasError.value = true
        errorMessage.value = data.error
        emit('error', props.provider.id, data.error)
      }
    })
  }
}

/**
 * 启动登录状态检查定时器
 */
const startLoginCheckTimer = (): void => {
  if (loginCheckTimer.value) return

  loginCheckTimer.value = setInterval(() => {
    if (isCreated.value && !isLoading.value) {
      checkLoginStatus()
    }
  }, 10 * 1000) // 10秒检查一次
}

/**
 * 启动会话保存定时器
 */
const startSessionSaveTimer = (): void => {
  if (saveSessionTimer.value) return

  saveSessionTimer.value = setInterval(() => {
    if (isCreated.value && props.provider.isLoggedIn) {
      saveSession()
    }
  }, 15 * 60 * 1000) // 15分钟保存一次
}

/**
 * 停止所有定时器
 */
const stopTimers = (): void => {
  if (saveSessionTimer.value) {
    clearInterval(saveSessionTimer.value)
    saveSessionTimer.value = null
  }

  if (loginCheckTimer.value) {
    clearInterval(loginCheckTimer.value)
    loginCheckTimer.value = null
  }
}

/**
 * 检查登录状态
 */
const checkLoginStatus = async(): Promise<boolean> => {
  if (!isCreated.value || !window.electronAPI) return false

  try {
    let isLoggedIn = false

    if (props.provider.id === 'chatgpt') {
      isLoggedIn = true
    } else {
      const providerId = props.provider.id.startsWith('summary-')
        ? props.provider.id.replace('summary-', '')
        : props.provider.id
      const loginCheckScript = getLoginCheckScript(providerId)

      const executeMethod = (window.electronAPI as any).executeScriptInBrowserView
        || (window.electronAPI as any).executeScript

      if (executeMethod) {
        const result = await executeMethod({
          providerId: originalProviderId.value,
          script: loginCheckScript
        })
        isLoggedIn = Boolean(result)
      }
    }

    if (isLoggedIn !== props.provider.isLoggedIn) {
      emit('login-status-changed', props.provider.id, isLoggedIn)

      if (isLoggedIn) {
        await saveSession()
      }
    }

    return isLoggedIn
  } catch (error) {
    console.warn(`Failed to check login status for ${props.provider.name}:`, error)
    return false
  }
}

/**
 * 保存会话数据
 */
const saveSession = async(): Promise<void> => {
  if (!window.electronAPI) return

  try {
    await window.electronAPI.saveSession({ providerId: originalProviderId.value })
    console.log(`Session saved for ${props.provider.name}`)
  } catch (error) {
    console.warn(`Failed to save session for ${props.provider.name}:`, error)
  }
}

/**
 * 加载会话数据
 */
const loadSession = async(): Promise<void> => {
  if (!window.electronAPI || sessionLoaded.value) return

  sessionLoaded.value = true

  try {
    const response = await window.electronAPI.loadSession({ providerId: originalProviderId.value })
    if (response.exists && response.sessionData) {
      console.log(`Session loaded for ${props.provider.name}`)
      setTimeout(() => {
        checkLoginStatus()
      }, 2000)
    }
  } catch (error) {
    console.warn(`Failed to load session for ${props.provider.name}:`, error)
  }
}

/**
 * 重试加载
 */
const retry = (): void => {
  if (retryCount.value >= maxRetries) {
    ElMessage.error(`${props.provider.name} 重试次数已达上限`)
    return
  }

  retryCount.value += 1
  hasError.value = false
  errorMessage.value = ''

  createBrowserView()
}

/**
 * 刷新 BrowserView
 */
const refresh = async(): Promise<void> => {
  if (!isCreated.value || !window.electronAPI) return

  try {
    const reloadMethod = (window.electronAPI as any).reloadBrowserView
      || (window.electronAPI as any).reloadWebView

    if (reloadMethod) {
      await reloadMethod({ providerId: originalProviderId.value })
    }
  } catch (error) {
    console.error(`Failed to refresh BrowserView for ${props.provider.name}:`, error)
    throw error
  }
}

/**
 * 导航到指定 URL
 */
const navigateTo = async(url: string): Promise<void> => {
  if (!isCreated.value || !window.electronAPI) {
    throw new Error('BrowserView not ready')
  }

  try {
    const navigateMethod = (window.electronAPI as any).navigateBrowserView
      || (window.electronAPI as any).navigateWebView

    if (navigateMethod) {
      await navigateMethod({
        providerId: originalProviderId.value,
        url
      })
    }
  } catch (error) {
    console.error(`Failed to navigate BrowserView for ${props.provider.name}:`, error)
    throw error
  }
}

/**
 * 执行 JavaScript 代码
 */
const executeScript = async(script: string): Promise<any> => {
  if (!isCreated.value || !window.electronAPI) {
    throw new Error('BrowserView not ready')
  }

  try {
    const executeMethod = (window.electronAPI as any).executeScriptInBrowserView
      || (window.electronAPI as any).executeScript

    if (!executeMethod) {
      throw new Error('executeScript method not available')
    }

    return await executeMethod({
      providerId: originalProviderId.value,
      script
    })
  } catch (error) {
    console.error(`Failed to execute script in BrowserView for ${props.provider.name}:`, error)
    throw error
  }
}

/**
 * 发送消息到 BrowserView
 */
const sendMessage = async(message: string): Promise<boolean> => {
  if (!isCreated.value || !window.electronAPI) {
    throw new Error('BrowserView not ready')
  }

  try {
    console.log('[BrowserView] Sending message:', message)
    const sendScript = getSendMessageScript(props.provider.id, message)
    console.log('[BrowserView] Send script:', sendScript)
    await executeScript(sendScript)
    return true
  } catch (error) {
    console.error(`Failed to send message to ${props.provider.name}:`, error)
    throw error
  }
}

/**
 * 销毁 BrowserView（供外部调用）
 */
const destroy = async(): Promise<void> => {
  await destroyBrowserView()
}

/**
 * 手动创建 BrowserView（用于按需加载）
 */
const create = async(): Promise<void> => {
  console.log(`Manual create BrowserView for ${props.provider.name}`)

  if (!isCreated.value) {
    await loadSession()
    await createBrowserView()
  } else {
    console.log(`BrowserView already exists for ${props.provider.name}`)
  }
}

/**
 * 初始化 ResizeObserver
 */
const initResizeObserver = (): void => {
  if (!containerRef.value) return

  resizeObserver = new ResizeObserver(() => {
    throttledSyncBounds()
  })

  resizeObserver.observe(containerRef.value)
}

/**
 * 初始化 IntersectionObserver
 */
const initIntersectionObserver = (): void => {
  if (!containerRef.value) return

  intersectionObserver = new IntersectionObserver(
    (entries) => {
      const entry = entries[0]
      isVisible.value = entry.isIntersecting

      if (entry.isIntersecting) {
        showBrowserView()
        syncBrowserViewBounds()
      } else {
        hideBrowserView()
      }
    },
    {
      threshold: 0.1,
      rootMargin: '0px'
    }
  )

  intersectionObserver.observe(containerRef.value)
}

/**
 * 清理观察者
 */
const cleanupObservers = (): void => {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }

  if (intersectionObserver) {
    intersectionObserver.disconnect()
    intersectionObserver = null
  }
}

// 暴露方法给父组件
defineExpose({
  refresh,
  navigateTo,
  executeScript,
  sendMessage,
  destroy,
  checkLoginStatus,
  saveSession,
  loadSession,
  create
})

// 生命周期
onMounted(async() => {
  console.log(`BrowserViewContainer mounted for ${props.provider.name}, autoLoad: ${props.autoLoad}`)

  // 初始化观察者
  initResizeObserver()
  initIntersectionObserver()

  if (props.autoLoad) {
    await loadSession()
    await createBrowserView()
  }
})

onUnmounted(() => {
  cleanupObservers()
  destroyBrowserView()
})

// 监听 provider URL 变化
watch(
  () => props.provider.url,
  async(newUrl) => {
    if (isCreated.value && newUrl) {
      await navigateTo(newUrl)
    }
  }
)
</script>

<style scoped>
.browserview-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  background: var(--el-bg-color-page);
}

.browserview-container {
  width: 100%;
  height: 100%;
}

.loading-overlay,
.error-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--el-bg-color-page);
  z-index: 10;
}

.loading-icon {
  font-size: 32px;
  color: var(--el-color-primary);
  animation: rotate 1s linear infinite;
  margin-bottom: 12px;
}

.error-icon {
  font-size: 32px;
  color: var(--el-color-danger);
  margin-bottom: 12px;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.loading-overlay p,
.error-overlay p {
  color: var(--el-text-color-secondary);
  margin-bottom: 16px;
}

.browserview-wrapper.loading .browserview-container {
  opacity: 0.5;
}

.browserview-wrapper.error .browserview-container {
  display: none;
}
</style>
