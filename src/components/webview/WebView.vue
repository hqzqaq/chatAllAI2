<template>
  <div
    ref="wrapperRef"
    class="webview-wrapper"
    :class="{ loading: isLoading, error: hasError }"
  >
    <div
      v-if="isLoading"
      class="loading-overlay"
    >
      <el-icon class="loading-icon">
        <Loading />
      </el-icon>
      <p>正在加载 {{ provider.name }}...</p>
    </div>

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

    <div
      ref="containerRef"
      class="webview-container"
    />
  </div>
</template>

<script setup lang="ts">
import {
  ref, computed, onMounted, onUnmounted, onActivated, onDeactivated, watch, nextTick
} from 'vue'
import { Loading, Warning } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { AIProvider } from '@/types'
import { getSendMessageScript } from '@/utils/MessageScripts.ts'
import { getLoginCheckScript } from '@/utils/LoginCheckScripts'
import { useLoginCheck } from '@/composables/useLoginCheck'
import { useSessionPersistence } from '@/composables/useSessionPersistence'
import { useWebViewEvents } from '@/composables/useWebViewEvents'

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

interface Emits {
  (e: 'ready'): void
  (e: 'loading', loading: boolean): void
  (e: 'error', error: string): void
  (e: 'login-status-changed', isLoggedIn: boolean): void
  (e: 'title-changed', title: string): void
  (e: 'url-changed', url: string): void
}

const emit = defineEmits<Emits>()

const containerRef = ref<HTMLElement | null>(null)
const wrapperRef = ref<HTMLElement | null>(null)

const originalProviderId = computed(() => {
  let providerId = props.provider.id
  if (providerId.startsWith('summary-')) {
    providerId = providerId.replace('summary-', '')
  }
  return providerId
})

const {
  checkLoginStatus,
  loginCheckTimer,
  startLoginCheckTimer,
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
    startLoginCheckTimer(
      () => props.provider.id,
      isLoading,
      async() => { await saveSession() }
    )
  }
})

const isLoading = ref(false)
const hasError = ref(false)
const errorMessage = ref('')
const retryCount = ref(0)
const maxRetries = 3
const isViewCreated = ref(false)
let rafId: number | null = null
let lastBounds: { x: number; y: number; width: number; height: number } | null = null
let unsubEvent: (() => void) | null = null
/** 裁剪父容器缓存，避免每帧遍历 DOM */
let cachedClipParent: HTMLElement | null | undefined
/** 视图是否因滚动出裁剪区域而被隐藏 */
let isHiddenByClip = false

async function checkStatusAndNotify(): Promise<void> {
  try {
    const result = await window.electronAPI.executeWebViewScript({
      providerId: props.provider.id,
      script: getLoginCheckScriptForProvider()
    })
    const isLoggedIn = Boolean(result)
    if (isLoggedIn !== props.provider.isLoggedIn) {
      emit('login-status-changed', isLoggedIn)
      if (isLoggedIn && window.electronAPI) {
        await saveSession()
      }
    }
  } catch (error) {
    console.warn(`Failed to check login status for ${props.provider.name}:`, error)
  }
}

function getLoginCheckScriptForProvider(): string {
  const providerId = props.provider.id.startsWith('summary-')
    ? props.provider.id.replace('summary-', '')
    : props.provider.id
  if (providerId === 'chatgpt') {
    return 'true'
  }
  return getLoginCheckScript(providerId)
}

const checkLoginStatusWrapper = async(): Promise<boolean> => {
  try {
    const result = await window.electronAPI.executeWebViewScript({
      providerId: props.provider.id,
      script: getLoginCheckScriptForProvider()
    })
    return Boolean(result)
  } catch {
    return false
  }
}

/**
 * 查找标记了 data-webview-clip 的裁剪父容器
 * WebContentsView 是原生视图，不受 CSS overflow 裁剪，
 * 需要手动查找标记了 data-webview-clip 的父容器并裁剪 bounds
 */
function findClipParent(element: HTMLElement): HTMLElement | null {
  if (cachedClipParent !== undefined) {
    if (cachedClipParent && cachedClipParent.isConnected) {
      return cachedClipParent
    }
    cachedClipParent = undefined
  }

  let parent = element.parentElement
  while (parent) {
    if (parent.hasAttribute('data-webview-clip')) {
      cachedClipParent = parent
      return parent
    }
    parent = parent.parentElement
  }

  cachedClipParent = null
  return null
}

function updateBounds(): void {
  if (!containerRef.value || !isViewCreated.value) return

  const rect = containerRef.value.getBoundingClientRect()

  // 最大化卡片使用 fixed 定位并覆盖整个视口，不应被 cards-grid 等滚动容器裁剪，
  // 否则 native WebContentsView 会被限制在网格可见区域内，导致顶部空白或内容截断。
  const isMaximized = !!containerRef.value.closest('.ai-card.maximized')

  // 查找裁剪父容器，限制 WebContentsView 不超出其可见区域
  const clipParent = isMaximized ? null : findClipParent(containerRef.value)

  let currentBounds: { x: number; y: number; width: number; height: number } | null = null

  if (clipParent) {
    const clipRect = clipParent.getBoundingClientRect()

    // 计算容器与裁剪区域的交集
    const top = Math.max(rect.top, clipRect.top)
    const bottom = Math.min(rect.bottom, clipRect.bottom)
    const left = Math.max(rect.left, clipRect.left)
    const right = Math.min(rect.right, clipRect.right)

    if (top < bottom && left < right) {
      // 有交集，使用裁剪后的 bounds
      currentBounds = {
        x: Math.round(left),
        y: Math.round(top),
        width: Math.round(right - left),
        height: Math.round(bottom - top)
      }
    }
    // 没有交集时 currentBounds 为 null，视图将被隐藏
  } else {
    // 没有裁剪父容器，使用原始 bounds
    currentBounds = {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    }
  }

  // 更新视图状态
  if (currentBounds) {
    // 视图在可见区域内，更新 bounds
    if (
      !lastBounds
      || lastBounds.x !== currentBounds.x
      || lastBounds.y !== currentBounds.y
      || lastBounds.width !== currentBounds.width
      || lastBounds.height !== currentBounds.height
    ) {
      lastBounds = currentBounds
      window.electronAPI.updateWebViewBounds({
        providerId: props.provider.id,
        bounds: currentBounds
      })
    }
    // 如果视图之前因滚动被隐藏，恢复显示
    if (isHiddenByClip) {
      isHiddenByClip = false
      window.electronAPI.setWebViewVisibility({
        providerId: props.provider.id,
        visible: true
      }).catch(() => {})
    }
  } else if (!isHiddenByClip) {
    // 视图完全在裁剪区域外，隐藏视图
    isHiddenByClip = true
    window.electronAPI.setWebViewVisibility({
      providerId: props.provider.id,
      visible: false
    }).catch(() => {})
  }
}

function startBoundsPolling(): void {
  if (!containerRef.value) return

  function poll(): void {
    if (!isViewCreated.value) {
      rafId = requestAnimationFrame(poll)
      return
    }
    updateBounds()
    rafId = requestAnimationFrame(poll)
  }

  rafId = requestAnimationFrame(poll)
}

function stopBoundsPolling(): void {
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
  lastBounds = null
  cachedClipParent = undefined
  isHiddenByClip = false
}

async function createView(): Promise<void> {
  if (isViewCreated.value || !window.electronAPI) return

  console.log(`Creating WebContentsView for ${props.provider.name}`)

  isViewCreated.value = true
  resetEvents()
  isLoading.value = true

  unsubEvent = window.electronAPI.onWebViewEvent((data) => {
    if (data.providerId === props.provider.id) {
      bindEvents(data)
    }
  })

  await window.electronAPI.createWebView({
    providerId: props.provider.id,
    url: props.provider.url
  })

  await nextTick()
  startBoundsPolling()
  updateBounds()

  isLoading.value = false
  hasError.value = false
}

const retry = (): void => {
  if (retryCount.value >= maxRetries) {
    ElMessage.error(`${props.provider.name} 重试次数已达上限`)
    return
  }

  retryCount.value += 1
  hasError.value = false
  errorMessage.value = ''

  window.electronAPI.reloadWebView(props.provider.id)
}

const refresh = (): void => {
  window.electronAPI.reloadWebView(props.provider.id)
}

const navigateTo = (url: string): void => {
  window.electronAPI.navigateWebView({ providerId: props.provider.id, url })
}

const executeScript = async(script: string): Promise<any> => window.electronAPI.executeWebViewScript({
  providerId: props.provider.id,
  script
})

const sendMessage = async(message: string): Promise<void> => {
  try {
    console.log('[WebView] Sending message:', message)
    const sendScript = getSendMessageScript(props.provider.id, message)
    console.log('[WebView] Send script:', sendScript)
    await window.electronAPI.executeWebViewScript({
      providerId: props.provider.id,
      script: sendScript
    })
  } catch (error) {
    console.error(`Failed to send message to ${props.provider.name}:`, error)
    throw error
  }
}

const destroy = (): void => {
  stopSaveSessionTimer()
  stopLoginCheckTimer()

  if (window.electronAPI?.stopAIStatusMonitoring) {
    window.electronAPI.stopAIStatusMonitoring({ providerId: props.provider.id }).catch(() => {})
  }

  if (unsubEvent) {
    unsubEvent()
    unsubEvent = null
  }

  stopBoundsPolling()

  if (isViewCreated.value) {
    window.electronAPI.destroyWebView(props.provider.id)
    isViewCreated.value = false
  }
}

const create = async(): Promise<void> => {
  console.log(`Manual create WebView for ${props.provider.name}`)

  if (!isViewCreated.value) {
    console.log(`Loading session and creating WebView for ${props.provider.name}`)
    await loadSession()

    await new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 100)
    })

    await createView()
  } else {
    console.log(`WebView already exists for ${props.provider.name}`)
  }
}

defineExpose({
  refresh,
  navigateTo,
  executeScript,
  sendMessage,
  destroy,
  checkLoginStatus: checkLoginStatusWrapper,
  saveSession,
  loadSession,
  create
})

onMounted(async() => {
  console.log(`WebView mounted for ${props.provider.name}, autoLoad: ${props.autoLoad}`)

  if (props.autoLoad) {
    await loadSession()
    await createView()
  }
})

onActivated(async() => {
  console.log(`WebView activated for ${props.provider.name}`)
  if (!isViewCreated.value && props.autoLoad) {
    await loadSession()
    await createView()
  }
})

onDeactivated(() => {
  console.log(`WebView deactivated for ${props.provider.name}`)
  destroy()
})

onUnmounted(() => {
  destroy()
})

watch(
  () => props.provider.url,
  (newUrl) => {
    if (isViewCreated.value && newUrl) {
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
