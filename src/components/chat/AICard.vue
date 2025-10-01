<template>
  <div
    class="ai-card"
    :class="{
      'minimized': config?.isMinimized,
      'maximized': config?.isMaximized,
      'logged-in': props.provider.isLoggedIn
    }"
    :style="cardStyle"
  >
    <!-- 卡片头部 -->
    <div class="card-header">
      <div class="header-left">
        <img
          :src="props.provider.icon"
          :alt="props.provider.name"
          class="provider-icon"
          @error="handleIconError"
        >
        <span class="provider-name">{{ props.provider.name }}</span>
        <el-tag
          :type="props.provider.isLoggedIn ? 'success' : 'info'"
          size="small"
          class="status-tag"
        >
          {{ props.provider.isLoggedIn ? '已登录' : '未登录' }}
        </el-tag>
      </div>

      <div class="header-right">
        <el-button
          :icon="Connection"
          size="small"
          circle
          :type="proxyConfig.enabled ? 'primary' : 'default'"
          @click="openProxyDialog"
        />
        <el-button
          :icon="Monitor"
          size="small"
          circle
          @click="openDevTools"
          title="打开控制台"
        />
        <el-button
          v-if="!config?.isMaximized"
          :icon="FullScreen"
          size="small"
          circle
          @click="toggleMaximized"
        />
        <el-button
          v-if="config?.isMaximized"
          :icon="Close"
          size="small"
          circle
          @click="toggleMaximized"
        />
        <el-button
          :icon="config?.isMinimized ? ArrowUp : ArrowDown"
          size="small"
          circle
          @click="toggleMinimized"
        />
        <el-button
          :icon="Refresh"
          size="small"
          circle
          :loading="isRefreshing"
          @click="refreshWebView"
        />
      </div>
    </div>

    <!-- WebView容器 -->
    <div
      v-show="!config?.isMinimized"
      class="webview-container"
      :style="webviewStyle"
    >
      <WebView
        v-if="shouldShowWebView"
        ref="webViewRef"
        :provider="props.provider"
        :width="webviewWidth"
        :height="webviewHeight"
        :auto-load="props.provider.isEnabled"
        @ready="handleWebViewReady"
        @loading="handleWebViewLoading"
        @error="handleWebViewError"
        @login-status-changed="handleLoginStatusChanged"
        @title-changed="handleTitleChanged"
        @url-changed="handleUrlChanged"
      />

      <div
          v-else
          class="webview-placeholder"
        >
          <div
            v-if="!props.provider.isLoggedIn && !isLoading"
            class="login-prompt"
          >
            <el-icon class="prompt-icon">
              <User />
            </el-icon>
            <p>请先在左侧选择 {{ props.provider.name }}</p>
            <p class="hint-text">选中后将自动加载登录页面</p>
          </div>

        <div
          v-else-if="isLoading"
          class="loading-state"
        >
          <el-icon class="loading-icon">
            <Loading />
          </el-icon>
          <p>加载中...</p>
        </div>

        <div
          v-else-if="props.provider.loadingState === 'error'"
          class="error-state"
        >
          <el-icon class="error-icon">
            <Close />
          </el-icon>
          <p>{{ props.provider.lastError || '加载失败' }}</p>
          <el-button
            type="primary"
            @click="retryWebView"
          >
            重试
          </el-button>
        </div>
      </div>
    </div>

    <!-- 消息状态指示器 -->
    <div
      v-if="sendingStatus !== 'idle'"
      class="status-indicator"
    >
      <el-icon
        :class="{
          'loading': sendingStatus === 'sending',
          'success': sendingStatus === 'sent',
          'error': sendingStatus === 'error'
        }"
      >
        <component :is="getStatusIcon()" />
      </el-icon>
      <span>{{ getStatusText() }}</span>
    </div>

    <!-- 调整大小手柄 -->
    <div
      v-show="!config?.isMinimized"
      class="resize-handle"
      @mousedown="startResize"
    >
      <el-icon><Rank /></el-icon>
    </div>

    <!-- 代理配置对话框 -->
    <el-dialog
      v-model="proxyDialogVisible"
      :title="`${props.provider.name} - 代理配置`"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="proxyFormRef"
        :model="proxyConfig"
        label-width="100px"
      >
        <el-form-item label="启用代理">
          <el-switch
            v-model="proxyConfig.enabled"
            @change="handleProxyToggle"
          />
        </el-form-item>
        
        <el-form-item label="代理协议">
          <el-select
            v-model="proxyConfig.protocol"
            :disabled="!proxyConfig.enabled"
            style="width: 100%"
          >
            <el-option label="HTTP" value="http" />
            <el-option label="HTTPS" value="https" />
            <el-option label="SOCKS5" value="socks5" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="代理地址">
          <el-input
            v-model="proxyConfig.address"
            :disabled="!proxyConfig.enabled"
            placeholder="请输入代理服务器地址"
          />
        </el-form-item>
        
        <el-form-item label="端口">
          <el-input
            v-model="proxyConfig.port"
            :disabled="!proxyConfig.enabled"
            placeholder="请输入代理端口"
            type="number"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="proxyDialogVisible = false">取消</el-button>
          <el-button
            type="primary"
            @click="saveProxyConfig"
          >
            保存并应用
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import {
  computed, ref, onMounted, nextTick
} from 'vue'
import {
  ArrowUp,
  ArrowDown,
  Refresh,
  User,
  Loading,
  Check,
  Close,
  Rank,
  FullScreen,
  Connection,
  Monitor
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import WebView from '../webview/WebView.vue'
import type { AIProvider, CardConfig } from '../../types'
import { useChatStore, useLayoutStore } from '../../stores'

// Props
interface Props {
  provider: AIProvider
  config?: CardConfig
}

const props = defineProps<Props>()

const chatStore = useChatStore()
const layoutStore = useLayoutStore()

// 响应式数据
const isRefreshing = ref(false)
const isLoading = ref(false)
const webViewRef = ref<InstanceType<typeof WebView> | null>(null)
const proxyDialogVisible = ref(false)
const proxyFormRef = ref()

// 代理配置
const proxyConfig = ref({
  enabled: false,
  protocol: 'http',
  address: '127.0.0.1',
  port: '7897'
})

// 计算属性
const sendingStatus = computed(() => chatStore.sendingStatus[props.provider.id] || 'idle')

const cardStyle = computed(() => {
  if (!props.config) return {}

  // 如果卡片被隐藏（最大化时），使用visibility和opacity隐藏
  const isHidden = props.config.isHidden === true
  
  return {
    width: `${props.config.size.width}px`,
    // 修复输入法问题：使用min-height而不是固定height，避免影响输入框
    height: props.config.isMinimized ? 'auto' : `${props.config.size.height}px`,
    minHeight: props.config.isMinimized ? 'auto' : '0',
    zIndex: props.config.zIndex,
    transition: 'all 0.3s ease',
    visibility: isHidden ? 'hidden' : 'visible',
    opacity: isHidden ? 0 : 1
  }
})

const webviewStyle = computed(() => {
  if (!props.config || props.config.isMinimized) return {}

  return {
    height: `${props.config.size.height - 120}px` // 减去头部和状态栏高度
  }
})

const shouldShowWebView = computed(() =>
  // 只有在provider启用且不在初始加载状态时才显示WebView
  props.provider.isEnabled && (props.provider.loadingState !== 'idle'))

const webviewWidth = computed(() => props.config?.size.width || 800)

const webviewHeight = computed(() => (props.config?.size.height || 800) - 120 // 增加默认高度到800px，减去头部高度
)

/**
 * 获取状态图标
 */
const getStatusIcon = () => {
  switch (sendingStatus.value) {
    case 'sending':
      return Loading
    case 'sent':
      return Check
    case 'error':
      return Close
    default:
      return Loading
  }
}

/**
 * 获取状态文本
 */
const getStatusText = (): string => {
  switch (sendingStatus.value) {
    case 'sending':
      return '发送中...'
    case 'sent':
      return '已发送'
    case 'error':
      return '发送失败'
    default:
      return ''
  }
}

/**
 * 切换最小化状态
 */
const toggleMinimized = (): void => {
  layoutStore.toggleCardMinimized(props.provider.id)
}

/**
 * 切换最大化状态
 */
const toggleMaximized = (): void => {
  layoutStore.toggleCardMaximized(props.provider.id)
}

/**
 * 打开WebView控制台
 */
const openDevTools = async(): Promise<void> => {
  try {
    if (window.electronAPI && window.electronAPI.openDevTools) {
      await window.electronAPI.openDevTools(props.provider.webviewId)
      ElMessage.success(`${props.provider.name} 控制台已打开`)
    } else if (webViewRef.value?.$el?.openDevTools) {
      // 直接调用WebView元素的openDevTools方法
      webViewRef.value.$el.openDevTools()
      ElMessage.success(`${props.provider.name} 控制台已打开`)
    } else {
      ElMessage.error('无法打开控制台：WebView未就绪')
    }
  } catch (error) {
    console.error(`Failed to open devtools for ${props.provider.name}:`, error)
    ElMessage.error(`打开 ${props.provider.name} 控制台失败`)
  }
}

/**
 * 刷新WebView
 */
const refreshWebView = async(): Promise<void> => {
  isRefreshing.value = true
  try {
    if (window.electronAPI) {
      await window.electronAPI.refreshWebView(props.provider.webviewId)
      ElMessage.success(`${props.provider.name} 已刷新`)
    }
  } catch (error) {
    console.error(`Failed to refresh ${props.provider.name}:`, error)
    ElMessage.error(`刷新 ${props.provider.name} 失败`)
  } finally {
    isRefreshing.value = false
  }
}

/**
 * 启用WebView
 */
const enableWebView = async(): Promise<void> => {
  console.log(`Enabling WebView for ${props.provider.name}`)

  isLoading.value = true
  const provider = chatStore.getProvider(props.provider.id)
  if (provider) {
    provider.isEnabled = true
    provider.loadingState = 'loading'
    console.log(`Provider ${props.provider.name} enabled, isEnabled: ${provider.isEnabled}`)
  }

  // 等待下一个tick，确保WebView组件已经渲染
  await nextTick()
  console.log(`After nextTick, webViewRef exists: ${!!webViewRef.value}`)

  // 如果WebView组件存在，手动创建WebView
  if (webViewRef.value) {
    try {
      console.log(`Calling create() for ${props.provider.name}`)
      await webViewRef.value.create()
      console.log(`WebView created successfully for ${props.provider.name}`)
    } catch (error) {
      console.error('Failed to create WebView:', error)
      isLoading.value = false
      if (provider) {
        provider.loadingState = 'error'
        provider.lastError = 'WebView创建失败'
      }
    }
  } else {
    console.error(`WebView ref not found for ${props.provider.name}`)
    isLoading.value = false
  }
}

/**
 * 重试WebView
 */
const retryWebView = (): void => {
  if (webViewRef.value) {
    webViewRef.value.refresh()
  } else {
    enableWebView()
  }
}

/**
 * WebView准备就绪处理
 */
const handleWebViewReady = (): void => {
  isLoading.value = false
  const provider = chatStore.getProvider(props.provider.id)
  if (provider) {
    provider.loadingState = 'loaded'
  }
}

/**
 * WebView加载状态处理
 */
const handleWebViewLoading = (loading: boolean): void => {
  isLoading.value = loading
  const provider = chatStore.getProvider(props.provider.id)
  if (provider && provider.loadingState !== (loading ? 'loading' : 'loaded')) {
    provider.loadingState = loading ? 'loading' : 'loaded'
  }
}

/**
 * WebView错误处理
 */
const handleWebViewError = (error: string): void => {
  isLoading.value = false
  const provider = chatStore.getProvider(props.provider.id)
  if (provider) {
    provider.loadingState = 'error'
    provider.lastError = error
  }
  ElMessage.error(`${props.provider.name}: ${error}`)
}

/**
 * 登录状态变化处理
 */
const handleLoginStatusChanged = (isLoggedIn: boolean): void => {
  // 只有在状态真正发生变化时才更新
  if (props.provider.isLoggedIn !== isLoggedIn) {
    chatStore.updateProviderLoginStatus(props.provider.id, isLoggedIn)
    console.log(`Login status changed for ${props.provider.name}: ${isLoggedIn}`)
  }
}

/**
 * 标题变化处理
 */
const handleTitleChanged = (title: string): void => {
  layoutStore.updateCardTitle(props.provider.id, title)
}

/**
 * URL变化处理
 */
const handleUrlChanged = (url: string): void => {
  // 可以在这里处理URL变化逻辑
  console.log(`${props.provider.name} URL changed:`, url)
}

/**
 * 处理图标加载错误
 */
const handleIconError = (event: Event): void => {
  const img = event.target as HTMLImageElement
  img.src = '/icons/default.svg' // 使用默认图标
}

/**
 * 开始调整大小
 */
const startResize = (event: MouseEvent): void => {
  event.preventDefault()

  const startX = event.clientX
  const startY = event.clientY
  const startWidth = props.config?.size.width || 300
  const startHeight = props.config?.size.height || 400

  const handleMouseMove = (e: MouseEvent): void => {
    const deltaX = e.clientX - startX
    const deltaY = e.clientY - startY

    const newWidth = Math.max(startWidth + deltaX, 300)
    const newHeight = Math.max(startHeight + deltaY, 200) // 最小高度保持200px，但用户可以拖拽到更大高度

    layoutStore.updateCardSize(props.provider.id, {
      width: newWidth,
      height: newHeight
    })
  }

  const handleMouseUp = (): void => {
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
    // 调整大小完成后重新计算布局
    layoutStore.recalculateLayout()
  }

  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

/**
 * 打开代理配置对话框
 */
const openProxyDialog = (): void => {
  // 从存储中加载代理配置
  loadProxyConfig()
  proxyDialogVisible.value = true
}

/**
 * 处理代理开关切换
 */
const handleProxyToggle = (enabled: boolean): void => {
  if (!enabled) {
    // 禁用代理时重置为默认值
    proxyConfig.value = {
      enabled: false,
      protocol: 'http',
      address: '127.0.0.1',
      port: '7897'
    }
  }
}

/**
 * 保存代理配置
 */
const saveProxyConfig = async(): Promise<void> => {
  try {
    // 验证配置
    if (proxyConfig.value.enabled) {
      if (!proxyConfig.value.address || !proxyConfig.value.port) {
        ElMessage.error('请填写完整的代理配置信息')
        return
      }
      
      // 验证端口号
      const port = parseInt(proxyConfig.value.port)
      if (port < 1 || port > 65535) {
        ElMessage.error('端口号必须在1-65535之间')
        return
      }
    }

    // 保存配置到本地存储
    saveProxyConfigToStorage()
    
    // 应用代理配置到webview
    await applyProxyConfig()
    
    ElMessage.success('代理配置已保存并应用')
    proxyDialogVisible.value = false
  } catch (error) {
    console.error('保存代理配置失败:', error)
    ElMessage.error('保存代理配置失败')
  }
}

/**
 * 从存储中加载代理配置
 */
const loadProxyConfig = (): void => {
  try {
    const storedConfig = localStorage.getItem(`proxy-config-${props.provider.id}`)
    if (storedConfig) {
      const config = JSON.parse(storedConfig)
      proxyConfig.value = { ...proxyConfig.value, ...config }
    }
  } catch (error) {
    console.error('加载代理配置失败:', error)
  }
}

/**
 * 保存代理配置到存储
 */
const saveProxyConfigToStorage = (): void => {
  try {
    localStorage.setItem(`proxy-config-${props.provider.id}`, JSON.stringify(proxyConfig.value))
  } catch (error) {
    console.error('保存代理配置到存储失败:', error)
  }
}

/**
 * 应用代理配置到webview
 */
const applyProxyConfig = async(): Promise<void> => {
  if (!window.electronAPI) {
    console.warn('Electron API不可用，无法设置代理')
    return
  }

  try {
    if (proxyConfig.value.enabled) {
      const proxyUrl = `${proxyConfig.value.protocol}://${proxyConfig.value.address}:${proxyConfig.value.port}`
      
      // 通过IPC通知主进程设置代理
      await window.electronAPI.setProxy({
        webviewId: props.provider.webviewId,
        proxyRules: proxyUrl,
        enabled: true
      })
      
      console.log(`已为 ${props.provider.name} 设置代理: ${proxyUrl}`)
    } else {
      // 禁用代理
      await window.electronAPI.setProxy({
        webviewId: props.provider.webviewId,
        proxyRules: 'direct://',
        enabled: false
      })
      
      console.log(`已为 ${props.provider.name} 禁用代理`)
    }
    
    // 重新加载webview使代理配置生效
    if (webViewRef.value) {
      setTimeout(() => {
        webViewRef.value?.refresh()
      }, 500)
    }
  } catch (error) {
    console.error('应用代理配置失败:', error)
    throw error
  }
}

/**
 * 发送消息到WebView
 */
const sendMessage = async(message: string): Promise<boolean> => {
  if (!webViewRef.value) {
    return false
  }

  try {
    await webViewRef.value.sendMessage(message)
    return true
  } catch (error) {
    console.error(`Failed to send message to ${props.provider.name}:`, error)
    return false
  }
}

// 暴露方法给父组件
defineExpose({
  sendMessage,
  refresh: () => webViewRef.value?.refresh(),
  checkLoginStatus: () => webViewRef.value?.checkLoginStatus()
})

// 生命周期
onMounted(() => {
  // 初始化WebView状态
  if (props.provider.isLoggedIn && !props.provider.isEnabled) {
    const provider = chatStore.getProvider(props.provider.id)
    if (provider) {
      provider.isEnabled = true
    }
  }
})
</script>

<style scoped>
.ai-card {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  box-shadow: var(--el-box-shadow-light);
  transition: all 0.3s ease;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.ai-card.logged-in {
  border-color: var(--el-color-success);
}

.ai-card.minimized {
  height: auto !important;
  min-height: 60px !important;
  max-height: 60px !important;
  overflow: hidden;
}

.ai-card.maximized {
  position: fixed !important;
  top: 16px !important;
  left: 16px !important;
  width: calc(100vw - 32px) !important;
  height: calc(100vh - 120px) !important;
  z-index: 1000 !important;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.3) !important;
}

.ai-card.minimized .webview-container {
  display: none !important;
}

.ai-card.minimized .resize-handle {
  display: none !important;
}

.ai-card.maximized .resize-handle {
  display: none !important;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--el-bg-color-page);
  border-bottom: 1px solid var(--el-border-color);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.provider-icon {
  width: 20px;
  height: 20px;
  border-radius: 4px;
}

.provider-name {
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.status-tag {
  margin-left: 4px;
}

.header-right {
  display: flex;
  gap: 4px;
}

.webview-container {
  position: relative;
  overflow: auto; /* 改为auto以支持滚动 */
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 300px; /* 设置最小高度 */
}

.webview-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--el-bg-color-page);
}

.login-prompt,
.loading-state,
.error-state {
  text-align: center;
  color: var(--el-text-color-secondary);
}

.prompt-icon,
.loading-icon {
  font-size: 32px;
  margin-bottom: 12px;
  color: var(--el-color-info);
}

.hint-text {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
  margin-top: 4px;
}

.error-icon {
  font-size: 32px;
  margin-bottom: 12px;
  color: var(--el-color-danger);
}

.loading-icon {
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.status-indicator {
  position: absolute;
  bottom: 8px;
  right: 8px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  font-size: 12px;
}

.status-indicator .loading {
  animation: rotate 1s linear infinite;
  color: var(--el-color-primary);
}

.status-indicator .success {
  color: var(--el-color-success);
}

.status-indicator .error {
  color: var(--el-color-danger);
}

.resize-handle {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 16px;
  height: 16px;
  cursor: nw-resize;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--el-text-color-placeholder);
  background: var(--el-bg-color-page);
  border-top-left-radius: 4px;
}

.resize-handle:hover {
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}
</style>
