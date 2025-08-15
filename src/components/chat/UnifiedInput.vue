<template>
  <div class="unified-input">
    <el-card class="input-card">
      <div class="input-header">
        <div class="header-left">
          <el-icon class="input-icon"><EditPen /></el-icon>
          <span class="input-title">统一输入</span>
        </div>
        <div class="header-right">
          <el-tag :type="loggedInCount > 0 ? 'success' : 'info'" size="small">
            {{ loggedInCount }}/{{ totalProviders }} 已连接
          </el-tag>
        </div>
      </div>
      
      <div class="input-content">
        <el-input
          v-model="currentMessage"
          type="textarea"
          :rows="3"
          :placeholder="inputPlaceholder"
          :disabled="loggedInCount === 0"
          @keydown.ctrl.enter="handleSend"
          @keydown.meta.enter="handleSend"
          class="message-input"
          data-testid="message-input"
        />
        
        <div class="input-actions">
          <div class="actions-left">
            <el-button
              :icon="Refresh"
              size="small"
              @click="handleRefresh"
              :disabled="hasSendingMessages"
              data-testid="refresh-button"
            >
              刷新连接
            </el-button>
            
            <el-button
              :icon="Delete"
              size="small"
              @click="handleClear"
              :disabled="!currentMessage"
              data-testid="clear-button"
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
              @click="handleSend"
              data-testid="send-button"
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
import { computed, onMounted, onUnmounted } from 'vue'
import { EditPen, Position, Refresh, Delete } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useChatStore } from '../../stores'
import { messageDispatcher } from '../../services/MessageDispatcher'
import type { MessageSendResult } from '../../services/MessageDispatcher'

const chatStore = useChatStore()

// 计算属性
const currentMessage = computed({
  get: () => chatStore.currentMessage,
  set: (value: string) => {
    chatStore.currentMessage = value
  }
})

const loggedInCount = computed(() => chatStore.loggedInCount)
const totalProviders = computed(() => chatStore.totalProviders)

const hasSendingMessages = computed(() => {
  return messageDispatcher.hasSendingMessages()
})

const inputPlaceholder = computed(() => {
  if (loggedInCount.value === 0) {
    return '请先登录至少一个AI网站...'
  }
  return '输入您的消息，将同时发送给所有已登录的AI...'
})

/**
 * 发送消息
 */
const handleSend = async (): Promise<void> => {
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
    const loggedInProviders = chatStore.loggedInProviders
    const messageContent = currentMessage.value
    
    // 清空输入框（提前清空，避免重复发送）
    chatStore.clearCurrentMessage()
    
    // 使用消息分发器发送消息
    const results = await messageDispatcher.sendMessage(messageContent, loggedInProviders)
    
    // 处理发送结果
    const successCount = results.filter(result => result.success).length
    const errorCount = results.length - successCount
    
    // 将消息添加到对话历史
    results.forEach(result => {
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
const handleRefresh = async (): Promise<void> => {
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
</style>