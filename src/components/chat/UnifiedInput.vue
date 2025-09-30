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
              <el-tag 
                v-if="provider.isLoggedIn" 
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
              type="primary"
              :icon="Position"
              :loading="hasSendingMessages"
              :disabled="!currentMessage || loggedInCount === 0"
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
  EditPen, Position, Refresh, Delete, Select, Loading
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useChatStore } from '../../stores'
import { messageDispatcher } from '../../services/MessageDispatcher'
import type { MessageSendResult } from '../../services/MessageDispatcher'

const chatStore = useChatStore()

// 响应式数据
const selectedProviders = ref<string[]>([])

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

const loggedInCount = computed(() => chatStore.loggedInCount)
const totalProviders = computed(() => chatStore.totalProviders)

const hasSendingMessages = computed(() => messageDispatcher.hasSendingMessages())

const inputPlaceholder = computed(() => {
  if (loggedInCount.value === 0) {
    return '请先登录至少一个AI网站...'
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
  // 加载选中的提供商
  loadSelectedProviders()
})

/**
 * 组件卸载时清理事件监听
 */
onUnmounted(() => {
  messageDispatcher.off('status-changed', handleStatusChanged)
  messageDispatcher.off('message-sent', handleMessageSent)
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
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 8px;
  align-items: start;
}

.provider-checkbox {
  margin: 0;
  width: 100%;
  min-height: 60px;
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
  background: linear-gradient(135deg, #007AFF 0%, #5856D6 100%);
  border-color: #007AFF;
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 122, 255, 0.3);
}

/* iOS风格悬停效果 */
.provider-option:hover {
  border-color: #007AFF;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 122, 255, 0.2);
}

/* iOS风格选中状态下的图标和文字 */
:deep(.provider-checkbox.is-checked .provider-option .provider-icon-small) {
  filter: brightness(0) invert(1);
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
  .provider-checkboxes {
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  }
}

@media (max-width: 768px) {
  .provider-checkboxes {
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 6px;
  }
  
  .provider-option {
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
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 4px;
  }
  
  .provider-option {
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
}

:deep(.el-textarea__inner:focus) {
  border-color: var(--el-color-primary);
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .provider-checkboxes {
    grid-template-columns: 1fr;
  }
  
  .model-selector {
    padding: 12px;
  }
  
  .provider-option {
    padding: 10px 12px;
  }
}
</style>
