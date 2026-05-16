<template>
  <div
    class="webview-wrapper"
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

    <!-- WebView容器 -->
    <div
      :id="webviewId"
      class="webview-container"
      :style="{
        visibility: hasError ? 'hidden' : 'visible',
        opacity: isLoading && isInitialLoad ? '0.5' : '1'
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
import { buildWebViewElementId } from '@/utils/webviewHelper'
import { useLoginCheck } from '@/composables/useLoginCheck'
import { useSessionPersistence } from '@/composables/useSessionPersistence'
import { useWebViewEvents } from '@/composables/useWebViewEvents'

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
  (e: 'ready'): void
  (e: 'loading', loading: boolean): void
  (e: 'error', error: string): void
  (e: 'login-status-changed', isLoggedIn: boolean): void
  (e: 'title-changed', title: string): void
  (e: 'url-changed', url: string): void
}

const emit = defineEmits<Emits>()

// 计算属性
const webviewId = computed(() => buildWebViewElementId(props.provider.id))

const originalProviderId = computed(() => {
  let providerId = props.provider.id
  if (providerId.startsWith('summary-')) {
    providerId = providerId.replace('summary-', '')
  }
  return providerId
})

const partition = computed(() => `persist:${originalProviderId.value}`)

// Composables
const {
  checkLoginStatus,
  loginCheckTimer,
  startLoginCheckTimer: startLoginTimer,
  stopLoginCheckTimer
} = useLoginCheck(props.provider)

const {
  sessionLoaded,
  saveSessionTimer,
  saveSession,
  loadSession,
  startSaveSessionTimer,
  stopSaveSessionTimer
} = useSessionPersistence(props.provider.name, () => originalProviderId.value)

const {
  isInitialLoad,
  currentUrl,
  bindEvents,
  reset: resetEvents
} = useWebViewEvents({
  onLoadingStart: () => {
    isLoading.value = true
    hasError.value = false
    emit('loading', true)
  },
  onLoadingFinish: () => {
    isLoading.value = false
    hasError.value = false
    retryCount.value = 0
    emit('loading', false)
    emit('ready')
  },
  onError: () => {
    isLoading.value = false
    emit('loading', false)
  },
  onTitleChanged: (title) => emit('title-changed', title),
  onUrlChanged: (url) => emit('url-changed', url),
  onDidLoad: () => {
    checkStatusAndNotify()
    startSaveSessionTimer(() => props.provider.isLoggedIn)
    startLoginTimer(
      () => webviewElement.value,
      isLoading,
      async() => { await saveSession() }
    )
  }
})

// 响应式数据
const isLoading = ref(false)
const hasError = ref(false)
const errorMessage = ref('')
const webviewElement = ref<Electron.WebviewTag | null>(null)
const retryCount = ref(0)
const maxRetries = 3

async function checkStatusAndNotify(): Promise<void> {
  const isLoggedIn = await checkLoginStatus(webviewElement.value)
  if (isLoggedIn !== props.provider.isLoggedIn) {
    emit('login-status-changed', isLoggedIn)
    if (isLoggedIn && window.electronAPI) {
      await saveSession()
    }
  }
}

/**
 * 创建WebView元素
 */
const createWebView = async(): Promise<void> => {
  console.log(`Creating WebView for ${props.provider.name}`)

  const container = document.getElementById(webviewId.value)
  if (!container) {
    console.error(`WebView container not found: ${webviewId.value}`)
    return
  }

  // 清空容器
  container.innerHTML = ''

  // 创建webview元素
  const webview = document.createElement('webview') as Electron.WebviewTag
  webview.id = webviewId.value
  webview.src = props.provider.url
  webview.style.width = '100%'
  webview.style.height = '100%'
  webview.style.border = 'none'

  // 初始化URL状态
  currentUrl.value = props.provider.url
  isInitialLoad.value = true

  // 设置webview属性
  webview.setAttribute('nodeintegration', 'false')
  webview.setAttribute('websecurity', 'true')
  webview.setAttribute('allowpopups', 'true')
  webview.setAttribute('useragent', getUserAgent())
  webview.setAttribute('partition', partition.value)

  // 设置preload脚本
  if (window.electronAPI) {
    try {
      const preloadPath = await window.electronAPI.getPreloadPath('webview-preload.js')
      webview.setAttribute('preload', `file://${preloadPath}`)
      console.log(`Preload script set for ${props.provider.name}: file://${preloadPath}`)
    } catch (e) {
      console.error('Failed to get preload path:', e)
    }
  }

  console.log(`WebView created for ${props.provider.name}, URL: ${props.provider.url}`)

  // 添加到容器
  container.appendChild(webview)
  webviewElement.value = webview

  // 绑定事件
  bindEvents(webview, props.provider.name)
}

/**
 * 获取用户代理字符串
 */
const getUserAgent = (): string => {
  const baseUA = navigator.userAgent
  // 添加自定义标识，避免被某些网站检测为自动化工具
  return baseUA.replace(/Electron\/[\d.]+\s/, '')
}

/**
 * 重试加载
 */
const retry = (): void => {
  if (retryCount.value >= maxRetries) {
    ElMessage.error(`${props.provider.name} 重试次数已达上限`)
    return
  }

  retryCount.value++
  hasError.value = false
  errorMessage.value = ''

  if (webviewElement.value) {
    webviewElement.value.reload()
  } else {
    createWebView()
  }
}

/**
 * 刷新WebView
 */
const refresh = (): void => {
  if (webviewElement.value) {
    webviewElement.value.reload()
  }
}

/**
 * 导航到指定URL
 */
const navigateTo = (url: string): void => {
  if (webviewElement.value) {
    webviewElement.value.src = url
  }
}

/**
 * 执行JavaScript代码
 */
const executeScript = async(script: string): Promise<any> => {
  if (!webviewElement.value) {
    throw new Error('WebView not ready')
  }

  return await webviewElement.value.executeJavaScript(script)
}

/**
 * 发送消息到WebView
 */
const sendMessage = async(message: string): Promise<void> => {
  if (!webviewElement.value) {
    throw new Error('WebView not ready')
  }

  try {
    console.log('[WebView] Sending message:', message)
    const sendScript = getSendMessageScript(props.provider.id, message)
    console.log('[WebView] Send script:', sendScript)
    await webviewElement.value.executeJavaScript(sendScript)
  } catch (error) {
    console.error(`Failed to send message to ${props.provider.name}:`, error)
    throw error
  }
}

/**
 * 销毁WebView
 */
const destroy = (): void => {
  stopSaveSessionTimer()
  stopLoginCheckTimer()

  if (webviewElement.value) {
    const container = document.getElementById(webviewId.value)
    if (container) {
      container.innerHTML = ''
    }
    webviewElement.value = null
  }
}

/**
 * 手动创建WebView（用于按需加载）
 */
const create = async(): Promise<void> => {
  console.log(`Manual create WebView for ${props.provider.name}`)

  if (!webviewElement.value) {
    console.log(`Loading session and creating WebView for ${props.provider.name}`)
    await loadSession()

    // 等待一小段时间确保DOM已经渲染
    await new Promise((resolve) => setTimeout(resolve, 100))

    createWebView()
  } else {
    console.log(`WebView already exists for ${props.provider.name}`)
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
  console.log(`WebView mounted for ${props.provider.name}, autoLoad: ${props.autoLoad}`)

  if (props.autoLoad) {
    // 先尝试加载保存的会话
    await loadSession()
    // 然后创建WebView
    createWebView()
  }
})

onUnmounted(() => {
  destroy()
})

// 监听provider变化
watch(
  () => props.provider.url,
  (newUrl) => {
    if (webviewElement.value && newUrl) {
      navigateTo(newUrl)
    }
  }
)
</script>

<style scoped>
.webview-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  background: var(--el-bg-color-page);
}

.webview-container {
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

.webview-wrapper.loading .webview-container {
  opacity: 0.5;
}

.webview-wrapper.error .webview-container {
  display: none;
}
</style>
