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
import { useWebViewBoundsScheduler, type WebViewBoundsState } from '@/composables/useWebViewBoundsScheduler'
import { useLayoutStore } from '@/stores'

interface Props {
  provider: AIProvider
  autoLoad?: boolean
}

const props = withDefaults(defineProps<Props>(), {
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
const layoutStore = useLayoutStore()
// WebContentsView 统一 Bounds 调度器（模块级单例），替代组件内独立的 rAF 循环
const scheduler = useWebViewBoundsScheduler()

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
let lastBounds: { x: number; y: number; width: number; height: number } | null = null
let unsubEvent: (() => void) | null = null
/** 裁剪父容器缓存，避免每帧遍历 DOM */
let cachedClipParent: HTMLElement | null | undefined

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

/**
 * 计算 webview 当前的目标状态（位置 + 显隐）
 * 由调度器每帧调用，返回 null 表示该 webview 暂时不参与调度
 *
 * 改造说明：原 updateBounds 直接下发 IPC，现改为纯函数仅返回目标状态，
 * 由 useWebViewBoundsScheduler 统一 diff 后下发，避免每帧重复 IPC
 */
function computeBounds(): WebViewBoundsState | null {
  if (!containerRef.value || !isViewCreated.value) return null

  // 任意模态层打开时，标记不可见但保留 lastBounds 缓存
  // 调度器的 pause() 会阻止 IPC 下发，dialog 关闭后 resume() 立即用最新位置
  if (layoutStore.dialogLayerCount > 0) {
    return lastBounds ? { bounds: lastBounds, visible: false } : null
  }

  const rect = containerRef.value.getBoundingClientRect()

  // 最大化卡片使用 fixed 定位覆盖整个视口，不应被 cards-grid 裁剪
  const isMaximized = !!containerRef.value.closest('.ai-card.maximized')
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
      currentBounds = {
        x: Math.round(left),
        y: Math.round(top),
        width: Math.round(right - left),
        height: Math.round(bottom - top)
      }
    }
    // 没有交集时 currentBounds 保持 null，视图将被标记不可见
  } else {
    currentBounds = {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    }
  }

  // 有交集：可见，返回新 bounds
  if (currentBounds) {
    lastBounds = currentBounds
    return { bounds: currentBounds, visible: true }
  }

  // 无交集（滚出裁剪区）：不可见，保留 lastBounds 用于恢复时 fallback
  return lastBounds ? { bounds: lastBounds, visible: false } : null
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
  // 注册到统一调度器，由调度器每帧调用 computeBounds 并 diff 后下发 IPC
  // register 内部会触发 scheduleImmediate，确保首帧位置尽快同步
  scheduler.register(props.provider.id, computeBounds)

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

  // 注销调度器条目（内部会下发 visible=false 避免原生视图残留），
  // 并清理本地缓存的 bounds 与裁剪父容器，与原独立轮询的清理行为对齐
  scheduler.unregister(props.provider.id)
  lastBounds = null
  cachedClipParent = undefined

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
  // keep-alive 复用组件时 DOM 父链可能变化，重置裁剪父容器缓存
  cachedClipParent = undefined
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

watch(
  () => props.provider.id,
  () => {
    // provider 切换时 DOM 父链可能变化，重置裁剪父容器缓存
    cachedClipParent = undefined
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
