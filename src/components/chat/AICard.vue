<template>
  <div 
    class="ai-card"
    :class="{ 
      'minimized': config?.isMinimized,
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
        />
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
          :icon="config?.isMinimized ? ArrowUp : ArrowDown"
          size="small"
          circle
          @click="toggleMinimized"
        />
        <el-button
          :icon="Refresh"
          size="small"
          circle
          @click="refreshWebView"
          :loading="isRefreshing"
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
      
      <div v-else class="webview-placeholder">
        <div v-if="!props.provider.isLoggedIn && !isLoading" class="login-prompt">
          <el-icon class="prompt-icon"><User /></el-icon>
          <p>请在此处登录 {{ props.provider.name }}</p>
          <el-button type="primary" @click="enableWebView">
            打开登录页面
          </el-button>
        </div>
        
        <div v-else-if="isLoading" class="loading-state">
          <el-icon class="loading-icon"><Loading /></el-icon>
          <p>加载中...</p>
        </div>
        
        <div v-else-if="props.provider.loadingState === 'error'" class="error-state">
          <el-icon class="error-icon"><Close /></el-icon>
          <p>{{ props.provider.lastError || '加载失败' }}</p>
          <el-button type="primary" @click="retryWebView">
            重试
          </el-button>
        </div>
      </div>
    </div>
    
    <!-- 消息状态指示器 -->
    <div v-if="sendingStatus !== 'idle'" class="status-indicator">
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
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, nextTick } from 'vue'
import { 
  ArrowUp, 
  ArrowDown, 
  Refresh, 
  User, 
  Loading, 
  Check, 
  Close, 
  Rank 
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

// 计算属性
const sendingStatus = computed(() => 
  chatStore.sendingStatus[props.provider.id] || 'idle'
)

const cardStyle = computed(() => {
  if (!props.config) return {}
  
  return {
    width: `${props.config.size.width}px`,
    height: props.config.isMinimized ? 'auto' : `${props.config.size.height}px`,
    minHeight: props.config.isMinimized ? '60px' : `${props.config.size.height}px`,
    zIndex: props.config.zIndex,
    transition: 'all 0.3s ease'
  }
})

const webviewStyle = computed(() => {
  if (!props.config || props.config.isMinimized) return {}
  
  return {
    height: `${props.config.size.height - 120}px` // 减去头部和状态栏高度
  }
})

const shouldShowWebView = computed(() => {
  // 只有在provider启用且不在初始加载状态时才显示WebView
  return props.provider.isEnabled && (props.provider.loadingState !== 'idle')
})

const webviewWidth = computed(() => {
  return props.config?.size.width || 800
})

const webviewHeight = computed(() => {
  return (props.config?.size.height || 600) - 120 // 减去头部高度
})

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
 * 刷新WebView
 */
const refreshWebView = async (): Promise<void> => {
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
const enableWebView = async (): Promise<void> => {
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
    const newHeight = Math.max(startHeight + deltaY, 200)
    
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
 * 发送消息到WebView
 */
const sendMessage = async (message: string): Promise<boolean> => {
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
  overflow: hidden;
  flex: 1;
  display: flex;
  flex-direction: column;
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