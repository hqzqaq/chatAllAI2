<template>
  <div class="unified-input">
    <el-card class="input-card">
      <div class="input-header">
        <div class="header-left">
          <el-icon class="input-icon">
            <EditPen />
          </el-icon>
          <span class="input-title">统一输入</span>
        </div>
        <div class="header-right">
          <el-tag
            :type="loggedInCount > 0 ? 'success' : 'info'"
            size="small"
          >
            {{ loggedInCount }}/{{ totalProviders }} 已连接
          </el-tag>
          <el-tag
            v-if="hasRespondingAI"
            type="warning"
            size="small"
            class="ai-status-tag"
          >
            {{ respondingAICount }} 个AI回答中
          </el-tag>
        </div>
      </div>

      <!-- 模型选择器 -->
      <div class="model-selector">
        <div class="selector-header">
          <el-icon class="selector-icon">
            <Select />
          </el-icon>
          <span class="selector-title">选择AI模型</span>
        </div>
        <el-checkbox-group 
          v-model="selectedProviders" 
          class="provider-checkboxes"
          @change="handleProviderSelection"
        >
          <el-checkbox 
            v-for="provider in availableProviders" 
            :key="provider.id" 
            :label="provider.id"
            :disabled="provider.loadingState === 'loading'"
            class="provider-checkbox"
          >
            <div class="provider-option">
              <img 
                :src="provider.icon" 
                :alt="provider.name" 
                class="provider-icon-small"
                @error="handleIconError"
              />
              <span class="provider-name">{{ provider.name }}</span>
              <!-- AI状态显示 -->
              <el-tag 
                v-if="getProviderAIStatus(provider.id) === 'responding'" 
                type="warning" 
                size="small"
                class="ai-status-tag"
              >
                回答中
              </el-tag>
              <el-tag 
                v-else-if="provider.isLoggedIn && selectedProviders.includes(provider.id)" 
                type="success" 
                size="small"
                class="status-tag"
              >
                已登录
              </el-tag>
              <el-icon v-if="provider.loadingState === 'loading'" class="loading-icon">
                <Loading />
              </el-icon>
            </div>
          </el-checkbox>
        </el-checkbox-group>
      </div>

      <div class="input-content">
        <el-input
          v-model="currentMessage"
          type="textarea"
          :rows="3"
          :placeholder="inputPlaceholder"
          :disabled="loggedInCount === 0"
          class="message-input"
          data-testid="message-input"
          @keydown.ctrl.enter="handleSend"
          @keydown.meta.enter="handleSend"
        />

        <div class="input-actions">
          <div class="actions-left">
            <el-button
              :icon="Refresh"
              size="small"
              :disabled="hasSendingMessages"
              data-testid="refresh-button"
              @click="handleRefresh"
            >
              刷新连接
            </el-button>

            <el-button
              :icon="Delete"
              size="small"
              :disabled="!currentMessage"
              data-testid="clear-button"
              @click="handleClear"
            >
              清空
            </el-button>
          </div>

          <div class="actions-right">
            <el-button
              type="success"
              :icon="Plus"
              :disabled="loggedInCount === 0"
              data-testid="new-chat-button"
              @click="handleNewChat"
            >
              新建对话
            </el-button>
            <el-button
              type="primary"
              :icon="Position"
              :loading="hasSendingMessages"
              :disabled="!currentMessage || loggedInCount === 0 || hasRespondingAI"
              data-testid="send-button"
              @click="handleSend"
            >
              发送到所有AI (Ctrl+Enter)
            </el-button>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import {
  EditPen, Position, Refresh, Delete, Select, Loading, Plus
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useChatStore } from '../../stores'
import { messageDispatcher } from '../../services/MessageDispatcher'
import type { MessageSendResult } from '../../services/MessageDispatcher'
import { getNewChatScript } from '../../utils/NewChatScripts'

const chatStore = useChatStore()

// 响应式数据
const selectedProviders = ref<string[]>([])

// AI状态管理
const aiStatusMap = ref<{ [providerId: string]: 'waiting_input' | 'responding' | 'completed' }>({})

// 计算属性
const currentMessage = computed({
  get: () => chatStore.currentMessage,
  set: (value: string) => {
    chatStore.currentMessage = value
  }
})

const availableProviders = computed(() => chatStore.providers)

// 从本地存储加载选中的提供商
const loadSelectedProviders = (): void => {
  try {
    const stored = localStorage.getItem('selected-providers')
    if (stored) {
      selectedProviders.value = JSON.parse(stored)
      // 应用选中的提供商
      applySelectedProviders()
    }
  } catch (error) {
    console.error('加载选中的提供商失败:', error)
  }
}

// 保存选中的提供商到本地存储
const saveSelectedProviders = (): void => {
  try {
    localStorage.setItem('selected-providers', JSON.stringify(selectedProviders.value))
  } catch (error) {
    console.error('保存选中的提供商失败:', error)
  }
}

// 应用选中的提供商到聊天存储
const applySelectedProviders = (): void => {
  chatStore.providers.forEach(provider => {
    const shouldEnable = selectedProviders.value.includes(provider.id)
    if (provider.isEnabled !== shouldEnable) {
      chatStore.toggleProvider(provider.id, shouldEnable)
    }
  })
}

// 处理提供商选择变化
const handleProviderSelection = (): void => {
  saveSelectedProviders()
  applySelectedProviders()
}

// 处理图标加载错误
const handleIconError = (event: Event): void => {
  const img = event.target as HTMLImageElement
  img.src = '/icons/default.svg'
}

// AI状态相关方法
const getProviderAIStatus = (providerId: string): 'waiting_input' | 'responding' | 'completed' | undefined => {
  return aiStatusMap.value[providerId]
}

const updateAIStatus = (providerId: string, status: 'waiting_input' | 'responding' | 'completed'): void => {
  aiStatusMap.value[providerId] = status
}

/**
 * 启动AI状态监控
 * 此函数现在主要用于批量处理，单个提供商的监控通过startAIStatusMonitoringForProvider函数处理
 */
const startAIStatusMonitoring = async (): Promise<void> => {
  try {
    if (!window.electronAPI) {
      console.warn('electronAPI不可用，无法启动AI状态监控')
      return
    }

    const { loggedInProviders } = chatStore

    if (loggedInProviders.length === 0) {
      console.log('没有已登录的提供商，跳过AI状态监控启动')
      return
    }

    console.log(`为${loggedInProviders.length}个已登录提供商启动AI状态监控`)

    for (const provider of loggedInProviders) {
      await startAIStatusMonitoringForProvider(provider.id)
    }
  } catch (error) {
    console.error('启动AI状态监控失败:', error)
  }
}

const stopAIStatusMonitoring = async (): Promise<void> => {
  try {
    if (window.electronAPI) {
      const { loggedInProviders } = chatStore
      
      for (const provider of loggedInProviders) {
        const result = await window.electronAPI.stopAIStatusMonitoring({
          providerId: provider.id
        })
        
        if (result.success) {
          console.log(`AI状态监控已停止: ${provider.name}`)
        }
      }
    }
  } catch (error) {
    console.error('停止AI状态监控失败:', error)
  }
}

// 处理AI状态变化事件
const handleAIStatusChange = (data: any) => {
  const { providerId, status, timestamp, details } = data
  
  console.log(`AI状态变化: ${providerId} -> ${status}`, details)
  
  // 更新状态映射
  updateAIStatus(providerId, status)
  
  // 根据状态变化进行相应处理
  if (status === 'responding') {
    // AI开始回答，可以在这里添加相关逻辑
    console.log(`${providerId} 开始回答`)
  } else if (status === 'completed') {
    // AI回答完成，可以在这里添加相关逻辑
    console.log(`${providerId} 回答完成`)
  } else if (status === 'waiting_input') {
    // AI等待输入，可以在这里添加相关逻辑
    console.log(`${providerId} 等待输入`)
  }
}

const loggedInCount = computed(() => chatStore.loggedInCount)
const totalProviders = computed(() => chatStore.totalProviders)

const hasSendingMessages = computed(() => messageDispatcher.hasSendingMessages())

// AI状态相关计算属性
const hasRespondingAI = computed(() => {
  return Object.values(aiStatusMap.value).some(status => status === 'responding')
})

const respondingAICount = computed(() => {
  return Object.values(aiStatusMap.value).filter(status => status === 'responding').length
})

const inputPlaceholder = computed(() => {
  if (loggedInCount.value === 0) {
    return '请先登录至少一个AI网站...'
  }
  if (hasRespondingAI.value) {
    return 'AI正在回答中，请等待回答完成后再发送新消息...'
  }
  return '输入您的消息，将同时发送给所有已登录的AI...'
})

/**
 * 发送消息
 */
const handleSend = async(): Promise<void> => {
  if (loggedInCount.value === 0) {
    ElMessage.warning('请先登录至少一个AI网站')
    return
  }

  if (!currentMessage.value.trim()) {
    ElMessage.warning('请输入消息内容')
    return
  }

  try {
    // 获取已登录的提供商
    const { loggedInProviders } = chatStore
    const messageContent = currentMessage.value

    // 清空输入框（提前清空，避免重复发送）
    chatStore.clearCurrentMessage()

    // 使用消息分发器发送消息
    const results = await messageDispatcher.sendMessage(messageContent, loggedInProviders)

    // 处理发送结果
    const successCount = results.filter((result) => result.success).length
    const errorCount = results.length - successCount

    // 将消息添加到对话历史
    results.forEach((result) => {
      const message = {
        id: result.messageId,
        content: messageContent,
        timestamp: result.timestamp,
        sender: 'user' as const,
        providerId: result.providerId,
        status: result.success ? 'sent' as const : 'error' as const,
        errorMessage: result.error
      }
      chatStore.addMessage(result.providerId, message)
    })

    // 显示结果消息
    if (successCount > 0 && errorCount === 0) {
      ElMessage.success(`消息已成功发送到 ${successCount} 个AI`)
    } else if (successCount > 0 && errorCount > 0) {
      ElMessage.warning(`消息已发送到 ${successCount} 个AI，${errorCount} 个发送失败`)
    } else {
      ElMessage.error('所有消息发送失败')
    }
  } catch (error) {
    console.error('Failed to send messages:', error)
    ElMessage.error('发送消息失败')
  }
}

/**
 * 刷新连接
 */
const handleRefresh = async(): Promise<void> => {
  try {
    // 重置消息分发器状态
    messageDispatcher.resetAllStatus()

    // 刷新所有WebView的连接状态
    if (window.electronAPI) {
      await window.electronAPI.refreshAllWebViews()
      ElMessage.success('连接状态已刷新')
    }
  } catch (error) {
    console.error('Failed to refresh connections:', error)
    ElMessage.error('刷新连接失败')
  }
}

/**
 * 清空输入
 */
const handleClear = (): void => {
  chatStore.clearCurrentMessage()
}

/**
 * 新建对话
 */
const handleNewChat = async(): Promise<void> => {
  if (loggedInCount.value === 0) {
    ElMessage.warning('请先登录至少一个AI网站')
    return
  }

  try {
    // 获取已登录的提供商
    const { loggedInProviders } = chatStore
    
    // 使用messageDispatcher发送新建对话脚本
    const results = await messageDispatcher.sendNewChatScript(
      loggedInProviders.map(provider => provider.id)
    )
    
    // 检查发送结果
    const successCount = results.filter(result => result.success).length
    const errorCount = results.filter(result => !result.success).length
    
    if (errorCount === 0) {
      ElMessage.success(`新建对话请求已发送到 ${successCount} 个AI模型`)
    } else if (successCount > 0) {
      ElMessage.warning(`新建对话请求已发送到 ${successCount} 个AI模型，${errorCount} 个失败`)
    } else {
      ElMessage.error('新建对话请求发送失败')
    }
  } catch (error) {
    console.error('Failed to create new chat:', error)
    ElMessage.error('新建对话失败')
  }
}

/**
 * 处理消息分发器状态变化
 */
const handleStatusChanged = (data: { providerId: string; status: string; messageId: string; error?: any }) => {
  // 更新聊天存储中的发送状态
  chatStore.setSendingStatus(data.providerId, data.status as any)
}

/**
 * 处理消息发送完成
 */
const handleMessageSent = (data: { messageId: string; results: MessageSendResult[] }) => {
  console.log('Message sent:', data)
}

/**
 * 组件挂载时设置事件监听
 */
onMounted(() => {
  messageDispatcher.on('status-changed', handleStatusChanged)
  messageDispatcher.on('message-sent', handleMessageSent)
  
  // 监听AI状态变化事件
  if (window.electronAPI && window.electronAPI.onAIStatusChange) {
    window.electronAPI.onAIStatusChange(handleAIStatusChange)
  }
  
  // 监听登录状态变化事件
  window.addEventListener('login-status-changed', handleLoginStatusChanged)
  
  // 加载选中的提供商
  loadSelectedProviders()
  
  // 初始检查：为当前已登录的提供商启动AI状态监控
  startAIStatusMonitoringForLoggedInProviders()
})

/**
 * 处理登录状态变化事件
 */
const handleLoginStatusChanged = (event: CustomEvent) => {
  const { providerId, isLoggedIn } = event.detail
  console.log(`登录状态变化: ${providerId} -> ${isLoggedIn ? '已登录' : '未登录'}`)
  
  if (isLoggedIn) {
    // 用户从未登录状态变为登录状态，启动AI状态监控
    startAIStatusMonitoringForProvider(providerId)
  } else {
    // 用户从登录状态变为未登录状态，停止AI状态监控
    stopAIStatusMonitoringForProvider(providerId)
  }
}

/**
 * 为当前已登录的提供商启动AI状态监控
 */
const startAIStatusMonitoringForLoggedInProviders = async (): Promise<void> => {
  const { loggedInProviders } = chatStore
  
  if (loggedInProviders.length === 0) {
    console.log('没有已登录的提供商，跳过AI状态监控启动')
    return
  }
  
  console.log(`为${loggedInProviders.length}个已登录提供商启动AI状态监控`)
  
  for (const provider of loggedInProviders) {
    await startAIStatusMonitoringForProvider(provider.id)
  }
}

/**
 * 为单个提供商启动AI状态监控
 */
const startAIStatusMonitoringForProvider = async (providerId: string): Promise<void> => {
  try {
    if (!window.electronAPI) {
      console.warn('electronAPI不可用，无法启动AI状态监控')
      return
    }
    
    const provider = chatStore.providers.find(p => p.id === providerId)
    if (!provider) {
      console.warn(`提供商不存在: ${providerId}`)
      return
    }
    
    const webviewId = `webview-${providerId}`
    console.log(`启动AI状态监控: ${provider.name} (webviewId: ${webviewId})`)
    
    // 延迟启动，确保webview和登录检测脚本已完全加载
    setTimeout(async () => {
      try {
        const result = await window.electronAPI.startAIStatusMonitoring({
          webviewId,
          providerId: providerId
        })
        
        if (result.success) {
          console.log(`AI状态监控已启动: ${provider.name}`)
        } else {
          console.warn(`AI状态监控启动失败: ${provider.name}`, result.error)
          
          // 启动失败时重试
          setTimeout(() => {
            startAIStatusMonitoringForProvider(providerId)
          }, 2000)
        }
      } catch (error) {
        console.error(`启动AI状态监控时发生错误: ${provider.name}`, error)
        
        // 发生错误时重试
        setTimeout(() => {
          startAIStatusMonitoringForProvider(providerId)
        }, 2000)
      }
    }, 1000) // 延迟1秒，确保登录检测脚本已执行
  } catch (error) {
    console.error(`启动AI状态监控失败: ${providerId}`, error)
  }
}

/**
 * 为单个提供商停止AI状态监控
 */
const stopAIStatusMonitoringForProvider = async (providerId: string): Promise<void> => {
  try {
    if (!window.electronAPI) {
      console.warn('electronAPI不可用，无法停止AI状态监控')
      return
    }
    
    const provider = chatStore.providers.find(p => p.id === providerId)
    if (!provider) {
      console.warn(`提供商不存在: ${providerId}`)
      return
    }
    
    console.log(`停止AI状态监控: ${provider.name}`)
    
    const result = await window.electronAPI.stopAIStatusMonitoring({
      providerId: providerId
    })
    
    if (result.success) {
      console.log(`AI状态监控已停止: ${provider.name}`)
    } else {
      console.warn(`AI状态监控停止失败: ${provider.name}`, result.error)
    }
  } catch (error) {
    console.error(`停止AI状态监控失败: ${providerId}`, error)
  }
}

/**
 * 组件卸载时清理事件监听
 */
onUnmounted(() => {
  messageDispatcher.off('status-changed', handleStatusChanged)
  messageDispatcher.off('message-sent', handleMessageSent)
  
  // 移除AI状态变化事件监听
  if (window.electronAPI && window.electronAPI.removeAllListeners) {
    window.electronAPI.removeAllListeners('ai-status:change')
  }
  
  // 停止AI状态监控
  stopAIStatusMonitoring()
})
</script>

<style scoped>
.unified-input {
  width: 100%;
}

.input-card {
  box-shadow: var(--el-box-shadow-light);
}

.input-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.input-icon {
  color: var(--el-color-primary);
  font-size: 18px;
}

.input-title {
  font-weight: 600;
  color: var(--el-text-color-primary);
}

/* 模型选择器样式 */
.model-selector {
  margin-bottom: 16px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 12px;
  border: 1px solid #e9ecef;
}

.selector-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.selector-icon {
  color: #007AFF;
  font-size: 16px;
}

.selector-title {
  font-weight: 600;
  color: #1c1c1e;
  font-size: 14px;
}

.provider-checkboxes {
  display: flex;
  flex-wrap: wrap;
  column-gap: 20px;
  row-gap: 8px;
  align-items: start;
}

.provider-checkbox {
  margin: 0;
  min-height: 60px;
  flex: 0 1 auto;
  min-width: 0;
}

.provider-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #ffffff;
  border: 2px solid #e5e5ea;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  position: relative;
  overflow: hidden;
  min-width: 140px;
  max-width: 240px;
  box-sizing: border-box;
}

/* iOS风格复选框样式 */
:deep(.provider-checkbox .el-checkbox__input) {
  display: none;
}

:deep(.provider-checkbox .el-checkbox__label) {
  padding: 0;
  margin: 0;
}

.provider-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #ffffff;
  border: 2px solid #e5e5ea;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  position: relative;
  overflow: hidden;
}

/* iOS风格选中状态 */
:deep(.provider-checkbox.is-checked .provider-option) {
  background: linear-gradient(135deg, #4A90E2 0%, #7B68EE 100%);
  border-color: #4A90E2;
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(74, 144, 226, 0.3);
}

/* iOS风格悬停效果 */
.provider-option:hover {
  border-color: #007AFF;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 122, 255, 0.2);
}

/* iOS风格选中状态下的图标和文字 */
:deep(.provider-checkbox.is-checked .provider-option .provider-icon-small) {
  /* 移除图标变白效果，保持原色 */
}

:deep(.provider-checkbox.is-checked .provider-option .provider-name) {
  color: white;
}

:deep(.provider-checkbox.is-checked .provider-option .status-tag) {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
  color: white;
}

.provider-icon-small {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  object-fit: contain;
}

.provider-name {
  font-weight: 500;
  color: #1c1c1e;
  font-size: 14px;
  flex: 1;
}

.status-tag {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 10px;
}

.ai-status-tag {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 10px;
  background: #f59e0b;
  border-color: #f59e0b;
  color: white;
}

.header-right .ai-status-tag {
  margin-left: 8px;
}

.loading-icon {
  color: #8e8e93;
  animation: rotate 1s linear infinite;
}

:deep(.provider-checkbox.is-checked .provider-option .loading-icon) {
  color: rgba(255, 255, 255, 0.8);
}

/* 禁用状态样式 */
:deep(.provider-checkbox.is-disabled .provider-option) {
  opacity: 0.5;
  cursor: not-allowed;
}

:deep(.provider-checkbox.is-disabled .provider-option:hover) {
  transform: none;
  border-color: #e5e5ea;
  box-shadow: none;
}

/* 响应式布局优化 */
@media (max-width: 1200px) {
  .provider-option {
    min-width: 130px;
    max-width: 200px;
  }
}

@media (max-width: 768px) {
  .provider-checkboxes {
    gap: 6px;
  }
  
  .provider-option {
    min-width: 120px;
    max-width: 180px;
    padding: 10px 12px;
    gap: 8px;
  }
  
  .provider-icon-small {
    width: 20px;
    height: 20px;
  }
  
  .provider-name {
    font-size: 12px;
  }
  
  .status-tag {
    font-size: 10px;
    padding: 1px 4px;
  }
}

@media (max-width: 480px) {
  .provider-checkboxes {
    gap: 4px;
  }
  
  .provider-option {
    min-width: 110px;
    max-width: 160px;
    padding: 8px 10px;
    gap: 6px;
  }
  
  .provider-name {
    font-size: 11px;
  }
}

.input-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message-input {
  width: 100%;
}

.input-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.actions-left,
.actions-right {
  display: flex;
  gap: 8px;
}

:deep(.el-textarea__inner) {
  resize: vertical;
  min-height: 80px;
  /* 修复输入法问题：确保输入框有正确的布局和高度 */
  height: auto !important;
  min-height: 80px !important;
  line-height: 1.5;
}

:deep(.el-textarea__inner:focus) {
  border-color: var(--el-color-primary);
}

/* 修复输入法兼容性问题 */
:deep(.el-textarea) {
  position: relative;
}

:deep(.el-textarea .el-textarea__inner) {
  /* 确保输入框有正确的盒模型 */
  box-sizing: border-box;
  /* 修复输入法输入时的显示问题 */
  overflow-wrap: break-word;
  word-wrap: break-word;
  hyphens: auto;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .provider-checkboxes {
    justify-content: center;
  }
  
  .model-selector {
    padding: 12px;
  }
  
  .provider-option {
    padding: 10px 12px;
  }
}
</style>
