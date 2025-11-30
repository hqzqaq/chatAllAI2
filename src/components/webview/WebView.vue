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
  (e: 'ready'): void
  (e: 'loading', loading: boolean): void
  (e: 'error', error: string): void
  (e: 'login-status-changed', isLoggedIn: boolean): void
  (e: 'title-changed', title: string): void
  (e: 'url-changed', url: string): void
}

const emit = defineEmits<Emits>()

// 响应式数据
const isLoading = ref(false)
const hasError = ref(false)
const errorMessage = ref('')
const webviewElement = ref<Electron.WebviewTag | null>(null)
const retryCount = ref(0)
const maxRetries = 3
const saveSessionTimer = ref<NodeJS.Timeout | null>(null)
const loginCheckTimer = ref<NodeJS.Timeout | null>(null)
const sessionLoaded = ref(false)
const isInitialLoad = ref(true)
const currentUrl = ref('')

// 计算属性
const webviewId = computed(() => `webview-${props.provider.id}`)

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
  webview.id = `${webviewId.value}-element`
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
  webview.setAttribute('partition', `persist:${props.provider.id}`)

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
  bindWebViewEvents(webview)
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
 * 判断是否是重要的导航（需要显示加载状态）
 */
const isSignificantNavigation = (newUrl: string): boolean => {
  if (!currentUrl.value) return true // 首次加载

  try {
    const current = new URL(currentUrl.value)
    const next = new URL(newUrl)

    // 如果域名不同，认为是重要导航
    if (current.hostname !== next.hostname) {
      return true
    }

    // 针对不同AI网站的特殊处理
    const { hostname } = current

    // kimi - 对话ID变化不算重要导航
    if (hostname.includes('kimi.com')) {
      const currentPath = current.pathname
      const nextPath = next.pathname

      // /c/xxx 到 /c/yyy 的变化不重要
      if (/^\/c\/[a-f0-9-]+/.test(currentPath) && /^\/c\/[a-f0-9-]+/.test(nextPath)) {
        return false
      }
      return false
    }

    // 豆包 - 聊天相关的导航不重要
    if (hostname.includes('doubao.com')) {
      const currentPath = current.pathname
      const nextPath = next.pathname

      // 聊天页面内的导航不重要
      if (currentPath.includes('/chat') && nextPath.includes('/chat')) {
        return false
      }

      // 对话ID变化不重要
      if (/\/chat\/[a-f0-9-]+/.test(currentPath) && /\/chat\/[a-f0-9-]+/.test(nextPath)) {
        return false
      }
      return false
    }

    // Grok - 对话页面内导航不重要，但其他导航重要
    if (hostname.includes('grok.com')) {
      const currentPath = current.pathname
      const nextPath = next.pathname

      // 对话页面内导航不重要（不需要显示加载状态）
      if (currentPath.includes('/c/') && nextPath.includes('/c/')) {
        return false
      }

      return false
    }

    // DeepSeek - 聊天导航不重要
    if (hostname.includes('deepseek.com')) {
      const currentPath = current.pathname
      const nextPath = next.pathname

      if (currentPath.includes('/chat') && nextPath.includes('/chat')) {
        return false
      }
      return false
    }

    // Qwen - 对话导航不重要
    if (hostname.includes('tongyi.aliyun.com')) {
      const currentPath = current.pathname
      const nextPath = next.pathname

      if (currentPath.includes('/qianwen') && nextPath.includes('/qianwen')) {
        return false
      }
    }

    // Copilot - 聊天导航不重要，但登录相关页面是重要导航
    if (hostname.includes('copilot.microsoft.com')) {
      const currentPath = current.pathname
      const nextPath = next.pathname

      // 如果导航到登录页面或Microsoft认证页面，这是重要导航
      if (nextPath.includes('/login') || next.hostname.includes('login.microsoftonline.com')) {
        return false
      }

      // 只有聊天页面之间的导航才不重要
      if (currentPath.includes('/chats') && nextPath.includes('/chats')) {
        return false
      }
    }

    // yuanbao - 聊天导航不重要
    if (hostname.includes('yuanbao.tencent.com')) {
      return false
    }

    // GLM - 聊天导航不重要
    if (hostname.includes('chatglm.cn')) {
      return false
    }

    // 通用规则：查询参数或锚点变化不重要
    if (current.origin + current.pathname === next.origin + next.pathname) {
      return false
    }

    return false // 其他情况认为是重要导航
  } catch (error) {
    console.warn(`Failed to parse URLs for navigation check: ${error}`)
    // URL解析失败，保守起见认为是重要导航
    return false
  }
}

/**
 * 绑定WebView事件
 */
const bindWebViewEvents = (webview: Electron.WebviewTag): void => {
  // 页面开始加载
  webview.addEventListener('did-start-loading', () => {
    const isSignificant = isInitialLoad.value || isSignificantNavigation(webview.src)
    console.log(`${props.provider.name} did-start-loading, significant: ${isSignificant}, URL: ${webview.src}`)

    // 只有在初始加载或URL发生重大变化时才显示加载状态
    if (isSignificant) {
      isLoading.value = true
      hasError.value = false
      emit('loading', true)
    }
  })

  // 页面加载完成
  webview.addEventListener('did-finish-load', () => {
    const newUrl = webview.src
    const wasInitialLoad = isInitialLoad.value

    // 更新当前URL
    currentUrl.value = newUrl

    const isSignificant = wasInitialLoad || isSignificantNavigation(newUrl)
    console.log(`${props.provider.name} did-finish-load, significant: ${isSignificant}, URL: ${newUrl}`)

    // 只有在初始加载或重大导航时才更新加载状态
    if (isSignificant) {
      isLoading.value = false
      hasError.value = false
      retryCount.value = 0
      emit('loading', false)
      emit('ready')

      // 检查登录状态
      checkLoginStatus()

      // 设置定期保存会话（每15分钟），但只设置一次
      if (!saveSessionTimer.value) {
        saveSessionTimer.value = setInterval(
          () => {
            // 只有在登录状态下才保存会话
            if (props.provider.isLoggedIn) {
              saveSession()
            }
          },
          15 * 60 * 1000
        )
      }

      // 设置定期检查登录状态（每10秒）
      if (!loginCheckTimer.value) {
        loginCheckTimer.value = setInterval(() => {
          if (webviewElement.value && !isLoading.value) {
            checkLoginStatus()
          }
        }, 10 * 1000) // 10秒检查一次
      }
    }

    // 标记初始加载完成
    isInitialLoad.value = false
  })

  // 页面加载失败
  webview.addEventListener('did-fail-load', (event) => {
    if (event.errorCode === -3) return // 用户取消加载，忽略

    isLoading.value = false
    hasError.value = true
    errorMessage.value = `加载失败: ${event.errorDescription || '未知错误'}`
    emit('loading', false)
    emit('error', errorMessage.value)
  })

  // 页面标题变化
  webview.addEventListener('page-title-updated', (event) => {
    emit('title-changed', event.title)
  })

  // URL变化
  webview.addEventListener('will-navigate', (event) => {
    console.log(`${props.provider.name} navigating to: ${event.url}`)
    emit('url-changed', event.url)
  })

  // 新窗口请求
  webview.addEventListener('new-window', (event) => {
    // 在默认浏览器中打开新窗口
    if (window.electronAPI) {
      window.electronAPI.openExternal(event.url)
    }
  })

  // 控制台消息（用于调试）
  webview.addEventListener('console-message', (event) => {
    if (event.level === 0) {
      // 错误级别
      console.error(`WebView Console [${props.provider.name}]:`, event.message)
    }
  })
}

/**
 * 检查登录状态
 */
const checkLoginStatus = async(): Promise<void> => {
  if (!webviewElement.value) return

  try {
    // 根据不同的AI网站检查不同的登录标识
    const loginCheckScript = getLoginCheckScript(props.provider.id)
    const result = await webviewElement.value.executeJavaScript(loginCheckScript)

    const isLoggedIn = Boolean(result)

    // 只有在登录状态真正发生变化时才触发事件和保存会话
    if (isLoggedIn !== props.provider.isLoggedIn) {
      emit('login-status-changed', isLoggedIn)

      // 如果登录成功，保存会话
      if (isLoggedIn && window.electronAPI) {
        await saveSession()
      }
    }
  } catch (error) {
    console.warn(`Failed to check login status for ${props.provider.name}:`, error)
  }
}

/**
 * 保存会话数据
 */
const saveSession = async(): Promise<void> => {
  if (!window.electronAPI) return

  try {
    await window.electronAPI.saveSession({ providerId: props.provider.id })
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
    const response = await window.electronAPI.loadSession({ providerId: props.provider.id })
    if (response.exists && response.sessionData) {
      console.log(`Session loaded for ${props.provider.name}`)
      // 会话数据已经在后端恢复，这里只需要检查登录状态
      setTimeout(() => {
        checkLoginStatus()
      }, 2000) // 等待页面加载完成后检查
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
  // 清除定时器
  if (saveSessionTimer.value) {
    clearInterval(saveSessionTimer.value)
    saveSessionTimer.value = null
  }

  if (loginCheckTimer.value) {
    clearInterval(loginCheckTimer.value)
    loginCheckTimer.value = null
  }

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
