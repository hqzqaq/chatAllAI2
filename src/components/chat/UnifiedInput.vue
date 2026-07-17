<template>
  <div
    class="unified-input"
    :class="{ collapsed: isCollapsed }"
  >
    <el-card class="input-card">
      <div class="input-body">
        <!-- 模型选择器 -->
        <ProviderSelector
          v-model:selected-providers="selectedProviders"
          :providers="availableProviders"
          :ai-status-map="aiStatusMap"
          @add-provider="handleAddProvider"
          @provider-selection-change="handleProviderSelection"
        />

        <div
          v-if="attachedFiles.length > 0"
          class="attached-files"
        >
          <div
            v-for="(file, index) in attachedFiles"
            :key="index"
            class="file-chip"
          >
            <el-icon class="file-chip-icon">
              <Document />
            </el-icon>
            <span class="file-chip-name">{{ file.name }}</span>
            <el-icon
              class="file-chip-close"
              @click="removeFile(index)"
            >
              <Close />
            </el-icon>
          </div>
        </div>

        <div class="input-content">
          <div class="textarea-container">
            <el-input
              ref="textareaRef"
              v-model="currentMessage"
              type="textarea"
              :rows="textareaRows"
              :placeholder="inputPlaceholder"
              :disabled="loggedInCount === 0"
              class="message-input"
              data-testid="message-input"
              @keydown.ctrl.enter="handleSend"
              @keydown.meta.enter="handleSend"
              @input="handleInput"
              @focus="handleFocus"
              @blur="handleBlur"
            />
            <div
              class="textarea-resize-handle"
              title="拖拽调整大小"
              @mousedown="startResize"
              @touchstart="startResize"
            />
            <div
              class="textarea-expand-button"
              :title="isExpanded ? '收起输入框' : '全屏输入'"
              @click="toggleExpand"
            >
              <el-icon>{{ isExpanded ? 'Minus' : 'Plus' }}</el-icon>
            </div>
          </div>

          <div class="input-actions">
            <div class="actions-left">
              <el-button
                :icon="Upload"
                size="small"
                data-testid="file-button"
                @click="triggerFileSelect"
              >
                选择文件
              </el-button>

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
                type="info"
                :icon="Document"
                :disabled="loggedInCount === 0"
                data-testid="prompt-manager-button"
                @click="handleOpenPromptManager"
              >
                Prompt 管理
              </el-button>
              <el-button
                type="warning"
                :icon="Lightning"
                :disabled="loggedInCount === 0 || !quickPrompt"
                :title="quickPrompt || '暂无快捷 Prompt'"
                data-testid="quick-prompt-button"
                @click="handleApplyQuickPrompt"
              >
                快捷 Prompt
              </el-button>
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
                type="info"
                :icon="DocumentChecked"
                :disabled="!canSummarize"
                title="总结各AI的回答"
                data-testid="summary-button"
                @click="handleSummary"
              >
                总结
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
      </div>
    </el-card>

    <div
      class="collapse-toggle"
      :class="{ collapsed: isCollapsed }"
      :title="isCollapsed ? '展开输入框' : '收起输入框'"
      @click="toggleCollapse"
    >
      <div class="collapse-arrow" />
    </div>

    <PromptManager
      v-model="promptManagerVisible"
      :user-input="currentMessage"
      @apply-prompt="handleApplyPrompt"
    />

    <AddProviderDialog
      v-model="addProviderVisible"
      @added="handleProviderAdded"
    />

    <input
      ref="fileInputRef"
      type="file"
      multiple
      :accept="ACCEPTED_FILE_EXTENSIONS"
      style="display: none"
      @change="handleFileInputChange"
    >
  </div>
</template>

<script setup lang="ts">
import {
  computed, onMounted, onUnmounted, ref, nextTick
} from 'vue'
import {
  Position, Refresh, Delete, Document,
  Lightning, DocumentChecked, Upload, Close
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useChatStore } from '../../stores'
import { messageDispatcher } from '../../services/MessageDispatcher'
import type { MessageSendResult, AttachedFileInfo } from '../../services/MessageDispatcher'
import PromptManager from './PromptManager.vue'
import AddProviderDialog from './AddProviderDialog.vue'
import ProviderSelector from './ProviderSelector.vue'

const chatStore = useChatStore()

// 组件事件
const emit = defineEmits<{(e: 'summary'): void
  (e: 'update:collapsed', collapsed: boolean): void
}>()

const fileInputRef = ref<HTMLInputElement | null>(null)

interface AttachedFile {
  name: string
  content: string
  size: number
  mimeType: string
  base64: string
}

const attachedFiles = ref<AttachedFile[]>([])

const ACCEPTED_FILE_EXTENSIONS = [
  '.txt', '.md', '.json', '.csv', '.py', '.js', '.ts', '.html', '.css',
  '.xml', '.yaml', '.yml', '.log', '.sql', '.java', '.go', '.rs', '.c',
  '.cpp', '.h', '.hpp', '.sh', '.bat', '.ps1', '.ini', '.cfg', '.conf',
  '.toml', '.properties', '.env',
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg', '.webp',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.zip', '.rar', '.7z', '.tar', '.gz'
].join(',')

const selectedProviders = computed({
  get: () => chatStore.selectedProviders,
  set: (value: string[]) => {
    chatStore.updateSelectedProviders(value)
  }
})

// AI状态管理
const aiStatusMap = ref<{ [providerId: string]: 'waiting_input' | 'responding' | 'completed' }>({})

// Prompt 管理器
const promptManagerVisible = ref<boolean>(false)

// 添加模型对话框
const addProviderVisible = ref<boolean>(false)

const handleAddProvider = (): void => {
  addProviderVisible.value = true
}

const handleProviderAdded = (_providerId: string): void => {
  // 新添加的提供商会自动出现在 availableProviders 中
}

// 快捷 Prompt 管理
const quickPrompt = ref<string>('')

// 折叠状态管理
const isCollapsed = ref<boolean>(false)

/**
 * 加载折叠状态
 */
const loadCollapsedState = (): void => {
  try {
    const stored = localStorage.getItem('unified-input-collapsed')
    if (stored !== null) {
      isCollapsed.value = JSON.parse(stored)
    }
  } catch (error) {
    console.error('加载折叠状态失败:', error)
  }
}

/**
 * 保存折叠状态
 */
const saveCollapsedState = (): void => {
  try {
    localStorage.setItem('unified-input-collapsed', JSON.stringify(isCollapsed.value))
  } catch (error) {
    console.error('保存折叠状态失败:', error)
  }
}

/**
 * 切换折叠状态
 */
const toggleCollapse = (): void => {
  isCollapsed.value = !isCollapsed.value
  emit('update:collapsed', isCollapsed.value)
  saveCollapsedState()
}

// 默认 Prompt
const DEFAULT_PROMPT = '请帮我分析以下内容，并提供详细的建议和解决方案。'

// 输入框交互优化相关数据
const textareaRef = ref<any>(null)
const textareaRows = ref<number>(3)
const isExpanded = ref<boolean>(false)
const isResizing = ref<boolean>(false)
const minRows = ref<number>(3)
const maxRows = ref<number>(15)
const preferredHeight = ref<number | null>(null)
const resizeStartY = ref<number>(0)
const resizeStartHeight = ref<number>(0)

// 计算属性
const currentMessage = computed({
  get: () => chatStore.currentMessage,
  set: (value: string) => {
    chatStore.currentMessage = value
    // 自动调整高度
    nextTick(() => {
      autoResize()
    })
  }
})

const availableProviders = computed(() => chatStore.providers)

// 应用选中的提供商到聊天存储
const applySelectedProviders = (): void => {
  chatStore.providers.forEach((provider) => {
    const shouldEnable = selectedProviders.value.includes(provider.id)
    if (provider.isEnabled !== shouldEnable) {
      chatStore.toggleProvider(provider.id, shouldEnable)
      if (!shouldEnable) {
        stopAIStatusMonitoringForProvider(provider.id)
      }
    }
  })
}

// 处理提供商选择变化
const handleProviderSelection = (value: string[]): void => {
  availableProviders.value.forEach((it: any) => {
    if (!value.includes(it.id)) {
      // eslint-disable-next-line no-param-reassign
      it.isLoggedIn = false
    }
  })
  applySelectedProviders()
}

const updateAIStatus = (providerId: string, status: 'waiting_input' | 'responding' | 'completed'): void => {
  aiStatusMap.value[providerId] = status
}

const stopAIStatusMonitoring = async(): Promise<void> => {
  try {
    Object.keys(monitoringTimers).forEach((providerId) => {
      cancelAIStatusMonitoringRetry(providerId)
    })

    if (window.electronAPI) {
      const { loggedInProviders } = chatStore

      await Promise.all(
        loggedInProviders.map(async(provider) => {
          const result = await window.electronAPI?.stopAIStatusMonitoring({
            providerId: provider.id
          })

          if (result?.success) {
            console.log(`AI状态监控已停止: ${provider.name}`)
          }
        })
      )
    }
  } catch (error) {
    console.error('停止AI状态监控失败:', error)
  }
}

// 处理AI状态变化事件
const handleAIStatusChange = (data: any) => {
  const {
    providerId, status, timestamp, details
  } = data

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

// 已选中且已登录的提供商数量
const connectedProviders = computed(() => availableProviders.value.filter(
  (provider) => provider.isLoggedIn && selectedProviders.value.includes(provider.id)
))

const connectedCount = computed(() => connectedProviders.value.length)

const hasSendingMessages = computed(() => messageDispatcher.hasSendingMessages())

// AI状态相关计算属性
const hasRespondingAI = computed(() => Object.values(aiStatusMap.value).some((status) => status === 'responding'))

const respondingAICount = computed(
  () => Object.values(aiStatusMap.value).filter((status) => status === 'responding').length
)

// 是否有AI已完成回答（用于判断是否可以总结）
const hasCompletedAI = computed(() => Object.values(aiStatusMap.value).some((status) => status === 'completed'))

// 是否可以进行总结
// eslint-disable-next-line arrow-body-style
const canSummarize = computed(() => {
  // 至少有一个AI已完成回答，且没有AI正在回答中
  return hasCompletedAI.value && !hasRespondingAI.value && loggedInCount.value > 0
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

// 输入框交互优化相关方法

/**
 * 自动调整输入框高度
 */
const autoResize = (): void => {
  if (!textareaRef.value || isResizing.value || isExpanded.value) return

  const textarea = textareaRef.value.$el.querySelector('.el-textarea__inner') as HTMLTextAreaElement
  if (!textarea) return

  // 重置高度以获取正确的滚动高度
  textarea.style.height = 'auto'

  // 计算所需行数
  const computedStyle = getComputedStyle(textarea)
  const lineHeight = parseFloat(computedStyle.lineHeight)
  const { scrollHeight } = textarea
  const padding = parseFloat(computedStyle.paddingTop) + parseFloat(computedStyle.paddingBottom)
  const contentHeight = scrollHeight - padding
  const rows = Math.ceil(contentHeight / lineHeight)

  // 限制行数在最小和最大之间
  textareaRows.value = Math.max(minRows.value, Math.min(maxRows.value, rows))
}

/**
 * 处理输入事件
 */
const handleInput = (): void => {
  autoResize()
}

/**
 * 处理聚焦事件
 */
const handleFocus = (): void => {
  // 聚焦时可以添加一些视觉反馈
}

/**
 * 处理失焦事件
 */
const handleBlur = (): void => {
  // 失焦时保存用户偏好的高度
  savePreferredHeight()
}

/**
 * 开始调整大小
 */
const startResize = (event: MouseEvent | TouchEvent): void => {
  if (isExpanded.value) return

  isResizing.value = true

  // 获取起始位置
  if (event instanceof MouseEvent) {
    resizeStartY.value = event.clientY
  } else {
    resizeStartY.value = event.touches[0].clientY
  }

  // 获取起始高度
  const textarea = textareaRef.value.$el.querySelector('.el-textarea') as HTMLElement
  if (textarea) {
    resizeStartHeight.value = textarea.offsetHeight
  }

  // 添加事件监听器
  document.addEventListener('mousemove', resize)
  document.addEventListener('touchmove', resize)
  document.addEventListener('mouseup', stopResize)
  document.addEventListener('touchend', stopResize)

  // 防止默认行为
  event.preventDefault()
}

/**
 * 调整大小
 */
const resize = (event: MouseEvent | TouchEvent): void => {
  if (!isResizing.value) return

  // 获取当前位置
  let currentY: number
  if (event instanceof MouseEvent) {
    currentY = event.clientY
  } else {
    currentY = event.touches[0].clientY
  }

  // 计算高度变化
  const deltaY = currentY - resizeStartY.value
  const textareaInner = textareaRef.value.$el.querySelector('.el-textarea__inner') as HTMLElement
  const lineHeight = parseFloat(getComputedStyle(textareaInner).lineHeight)
  const deltaRows = Math.round(deltaY / lineHeight)

  // 更新行数
  textareaRows.value = Math.max(minRows.value, Math.min(maxRows.value, textareaRows.value + deltaRows))

  // 更新起始位置和高度
  resizeStartY.value = currentY
  const textarea = textareaRef.value.$el.querySelector('.el-textarea') as HTMLElement
  if (textarea) {
    resizeStartHeight.value = textarea.offsetHeight
  }
}

/**
 * 停止调整大小
 */
const stopResize = (): void => {
  isResizing.value = false

  // 移除事件监听器
  document.removeEventListener('mousemove', resize)
  document.removeEventListener('touchmove', resize)
  document.removeEventListener('mouseup', stopResize)
  document.removeEventListener('touchend', stopResize)

  // 保存用户偏好的高度
  savePreferredHeight()
}

/**
 * 切换全屏状态
 */
const toggleExpand = (): void => {
  isExpanded.value = !isExpanded.value

  if (isExpanded.value) {
    // 全屏状态
    textareaRows.value = maxRows.value
  } else {
    // 回到最小行数
    textareaRows.value = minRows.value
  }

  // 保存用户偏好
  savePreferredHeight()
}

/**
 * 保存用户偏好的高度
 */
const savePreferredHeight = (): void => {
  if (textareaRef.value) {
    const textarea = textareaRef.value.$el.querySelector('.el-textarea') as HTMLElement
    if (textarea) {
      preferredHeight.value = textarea.offsetHeight
      localStorage.setItem('textarea-preferred-height', JSON.stringify({
        height: preferredHeight.value,
        isExpanded: isExpanded.value
      }))
    }
  }
}

/**
 * 加载用户偏好的高度
 */
const loadPreferredHeight = (): void => {
  try {
    const stored = localStorage.getItem('textarea-preferred-height')
    if (stored) {
      const { height, isExpanded: expanded } = JSON.parse(stored)
      preferredHeight.value = height
      isExpanded.value = expanded

      if (expanded) {
        textareaRows.value = maxRows.value
      } else if (height) {
        // 根据高度计算行数
        const textareaInner = textareaRef.value.$el.querySelector('.el-textarea__inner') as HTMLElement
        const computedStyle = getComputedStyle(textareaInner)
        const lineHeight = parseFloat(computedStyle.lineHeight)
        const padding = parseFloat(computedStyle.paddingTop) + parseFloat(computedStyle.paddingBottom)
        const contentHeight = height - padding
        textareaRows.value = Math.max(
          minRows.value,
          Math.min(maxRows.value, Math.round(contentHeight / lineHeight))
        )
      }
    }
  } catch (error) {
    console.error('加载用户偏好的高度失败:', error)
  }
}

/**
 * 保存快捷 Prompt
 */
const saveQuickPrompt = (): void => {
  try {
    localStorage.setItem('quick-prompt', JSON.stringify({
      content: quickPrompt.value
    }))
  } catch (error) {
    console.error('保存快捷 Prompt 失败:', error)
  }
}

/**
 * 加载快捷 Prompt
 */
const loadQuickPrompt = (): void => {
  try {
    const stored = localStorage.getItem('quick-prompt')
    if (stored) {
      const { content } = JSON.parse(stored)
      quickPrompt.value = content
    } else {
      // 如果没有保存的快捷 Prompt，使用默认值
      quickPrompt.value = DEFAULT_PROMPT
      saveQuickPrompt()
    }
  } catch (error) {
    console.error('加载快捷 Prompt 失败:', error)
    quickPrompt.value = DEFAULT_PROMPT
  }
}

/**
 * 发送消息
 */
const handleSend = async(): Promise<void> => {
  appendFileContentToMessage()

  if (loggedInCount.value === 0) {
    ElMessage.warning('请先登录至少一个AI网站')
    return
  }

  if (!currentMessage.value.trim()) {
    ElMessage.warning('请输入消息内容')
    return
  }

  try {
    // 收起输入框
    if (!isCollapsed.value) {
      isCollapsed.value = true
    }

    // 获取已登录的提供商
    const { loggedInProviders } = chatStore
    const messageContent = currentMessage.value

    // 保存文件数据（提前保存，避免下面清空后丢失）
    // 文本文件：content 已拼入消息，不需要走 webview 注入
    // 二进制文件：已在文件选择时通过 uploadFileImmediately 上传，此处无需再处理

    // 清空输入框（提前清空，避免重复发送）
    chatStore.clearCurrentMessage()
    attachedFiles.value = []
    if (fileInputRef.value) {
      fileInputRef.value.value = ''
    }

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
        status: result.success ? ('sent' as const) : ('error' as const),
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
  attachedFiles.value = []
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

const triggerFileSelect = async(): Promise<void> => {
  if (window.electronAPI && window.electronAPI.openFileDialog) {
    const result = await window.electronAPI.openFileDialog({ multiSelections: true })
    if (result.canceled || result.filePaths.length === 0) return
    await addFilesFromPaths(result.filePaths)
  } else {
    fileInputRef.value?.click()
  }
}

const handleFileInputChange = async(event: Event): Promise<void> => {
  const input = event.target as HTMLInputElement
  const { files } = input
  if (!files || files.length === 0) return

  if (window.electronAPI && window.electronAPI.readFile) {
    for (let i = 0; i < files.length; i += 1) {
      const file = files[i]
      // eslint-disable-next-line no-await-in-loop
      if (file.path) {
        // eslint-disable-next-line no-await-in-loop
        await addFileFromPath(file.path)
      } else {
        readFileViaBrowser(file)
      }
    }
  } else {
    for (let i = 0; i < files.length; i += 1) {
      readFileViaBrowser(files[i])
    }
  }

  input.value = ''
}

const addFilesFromPaths = async(filePaths: string[]): Promise<void> => {
  for (let i = 0; i < filePaths.length; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await addFileFromPath(filePaths[i])
  }
}

const addFileFromPath = async(filePath: string): Promise<void> => {
  if (!window.electronAPI || !window.electronAPI.readFile) return

  // eslint-disable-next-line no-await-in-loop
  const result = await window.electronAPI.readFile({ filePath })
  if (result.success) {
    const isTextFile = isTextMimeType(result.mimeType)
    const newFile: AttachedFile = {
      name: result.name,
      content: isTextFile ? atob(result.base64) : '',
      size: result.size,
      mimeType: result.mimeType,
      base64: result.base64
    }
    attachedFiles.value.push(newFile)

    if (!isTextFile) {
      uploadFileImmediately(newFile)
    }
  } else {
    ElMessage.error(`读取文件失败: ${result.error}`)
  }
}

const TEXT_MIME_PREFIXES = [
  'text/',
  'application/json',
  'application/xml',
  'application/javascript',
  'application/typescript'
]

const isTextMimeType = (mimeType: string): boolean => (
  TEXT_MIME_PREFIXES.some((prefix) => mimeType.startsWith(prefix))
)

const atob = (str: string): string => {
  try {
    const binary = window.atob(str)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i)
    }
    return new TextDecoder('utf-8').decode(bytes)
  } catch {
    return ''
  }
}

const readFileViaBrowser = (file: File): void => {
  const reader = new FileReader()

  reader.onload = (e) => {
    const content = e.target?.result as string
    const isText = isTextMimeType(file.type || 'application/octet-stream')
    attachedFiles.value.push({
      name: file.name,
      content: isText ? content : '',
      size: file.size,
      mimeType: file.type || 'application/octet-stream',
      base64: ''
    })
    if (!isText) {
      ElMessage.warning(`${file.name} 为二进制文件，在浏览器模式下无法获取base64数据，将仅作为附件提示发送`)
    }
  }

  reader.onerror = () => {
    ElMessage.error(`读取文件 ${file.name} 失败`)
  }

  reader.readAsText(file)
}

const removeFile = (index: number): void => {
  attachedFiles.value.splice(index, 1)
}

const uploadedFileKeys = new Set<string>()

const uploadFileImmediately = async(file: AttachedFile): Promise<void> => {
  const fileKey = `${file.name}_${file.size}`
  if (uploadedFileKeys.has(fileKey)) {
    console.log(`[FileUpload:UI] Skip duplicate upload: ${file.name}`)
    return
  }
  uploadedFileKeys.add(fileKey)

  const { loggedInProviders } = chatStore
  if (loggedInProviders.length === 0) {
    console.log('[FileUpload:UI] No logged-in providers, skip immediate upload')
    return
  }

  console.log(`[FileUpload:UI] Immediate upload: ${file.name} to ${loggedInProviders.length} provider(s)`)

  const fileInfo: AttachedFileInfo = {
    name: file.name,
    size: file.size,
    mimeType: file.mimeType,
    base64: file.base64
  }

  try {
    const results = await messageDispatcher.sendFiles([fileInfo], loggedInProviders)
    const successCount = results.filter((r) => r.success).length
    if (successCount > 0) {
      ElMessage.success(`文件 ${file.name} 已注入到AI`)
    }
  } catch (error) {
    console.error('[FileUpload:UI] Immediate upload failed:', error)
    ElMessage.error(`文件 ${file.name} 上传失败`)
  }
}

const appendFileContentToMessage = (): void => {
  const textFiles = attachedFiles.value.filter((f) => f.content)
  if (textFiles.length === 0) return

  const fileContents = textFiles.map((file) => {
    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    let lang = ''
    switch (ext) {
      case 'js': case 'ts': lang = ext; break
      case 'py': lang = 'python'; break
      case 'java': lang = 'java'; break
      case 'go': lang = 'go'; break
      case 'rs': lang = 'rust'; break
      case 'sql': lang = 'sql'; break
      case 'html': lang = 'html'; break
      case 'css': lang = 'css'; break
      case 'xml': lang = 'xml'; break
      case 'yaml': case 'yml': lang = 'yaml'; break
      case 'json': lang = 'json'; break
      case 'sh': case 'bash': lang = 'bash'; break
      case 'bat': case 'ps1': lang = 'powershell'; break
      default: lang = ''
    }

    if (lang) {
      return `### 文件: ${file.name}\n\`\`\`${lang}\n${file.content}\n\`\`\``
    }
    return `### 文件: ${file.name}\n\`\`\`\n${file.content}\n\`\`\``
  }).join('\n\n')

  const existing = currentMessage.value
  if (existing.trim()) {
    chatStore.currentMessage = `${existing}\n\n---\n\n${fileContents}`
  } else {
    chatStore.currentMessage = fileContents
  }
}

const sendBinaryFilesToWebViews = async(files: AttachedFile[]): Promise<void> => {
  if (files.length === 0) return

  const { loggedInProviders } = chatStore
  if (loggedInProviders.length === 0) {
    console.log('[FileUpload:UI] No logged-in providers to upload to')
    return
  }

  console.log(`[FileUpload:UI] Uploading ${files.length} binary file(s) to ${loggedInProviders.length} provider(s)`)

  const fileInfos: AttachedFileInfo[] = files.map((f) => ({
    name: f.name,
    size: f.size,
    mimeType: f.mimeType,
    base64: f.base64
  }))

  try {
    const results = await messageDispatcher.sendFiles(fileInfos, loggedInProviders)
    const successCount = results.filter((r) => r.success).length
    const errorCount = results.length - successCount

    console.log(
      `[FileUpload:UI] Results: total=${results.length} `
      + `success=${successCount} error=${errorCount}`
    )
    results.forEach((r) => {
      console.log(`[FileUpload:UI]   provider=${r.providerId} success=${r.success} error=${r.error || 'none'}`)
    })

    if (errorCount > 0) {
      console.warn(`[FileUpload:UI] ${errorCount} upload(s) failed`)
    }
    if (successCount > 0) {
      ElMessage.success(`${successCount} 个文件已注入到AI`)
    }
  } catch (error) {
    console.error('[FileUpload:UI] Exception:', error)
    ElMessage.error('文件上传失败')
  }
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
    const results = await messageDispatcher.sendNewChatScript(loggedInProviders.map((provider) => provider.id))

    // 检查发送结果
    const successCount = results.filter((result) => result.success).length
    const errorCount = results.filter((result) => !result.success).length

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
 * 打开 Prompt 管理器
 */
const handleOpenPromptManager = (): void => {
  promptManagerVisible.value = true
}

/**
 * 应用 Prompt
 */
const handleApplyPrompt = (prompt: any, userInput?: string): void => {
  let { content } = prompt

  if (userInput) {
    content = content.replace(/\{\{user_input\}\}/g, userInput)
  }

  const now = new Date()
  const date = now.toISOString().split('T')[0]
  const datetime = now
    .toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
    .replace(/\//g, '-')
  content = content.replace(/\{\{date\}\}/g, date)
  content = content.replace(/\{\{datetime\}\}/g, datetime)

  chatStore.currentMessage = content
  promptManagerVisible.value = false

  // 同步更新快捷 Prompt - 保存原始模板（包含 {{user_input}}）
  quickPrompt.value = prompt.content
  saveQuickPrompt()
}

/**
 * 应用快捷 Prompt
 */
const handleApplyQuickPrompt = (): void => {
  if (!quickPrompt.value) {
    ElMessage.warning('暂无快捷 Prompt')
    return
  }

  let content = quickPrompt.value
  if (currentMessage.value) {
    content = content.replace(/\{\{user_input\}\}/g, currentMessage.value)
  }

  const now = new Date()
  const date = now.toISOString().split('T')[0]
  const datetime = now
    .toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
    .replace(/\//g, '-')
  content = content.replace(/\{\{date\}\}/g, date)
  content = content.replace(/\{\{datetime\}\}/g, datetime)

  chatStore.currentMessage = content
  ElMessage.success('已应用快捷 Prompt')
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
 * 处理总结按钮点击
 */
const handleSummary = (): void => {
  if (!canSummarize.value) {
    if (hasRespondingAI.value) {
      ElMessage.warning('请等待AI回答完成后再进行总结')
    } else if (!hasCompletedAI.value) {
      ElMessage.warning('至少需要一个AI完成回答才能进行总结')
    }
    return
  }

  // 触发总结事件，由父组件处理
  emit('summary')
}

let unsubscribeAIStatusChange: (() => void) | null = null

/**
 * 组件挂载时设置事件监听
 */
onMounted(() => {
  messageDispatcher.on('status-changed', handleStatusChanged)
  messageDispatcher.on('message-sent', handleMessageSent)

  // 监听AI状态变化事件
  if (window.electronAPI && window.electronAPI.onAIStatusChange) {
    unsubscribeAIStatusChange = window.electronAPI.onAIStatusChange(handleAIStatusChange)
  }

  // 监听登录状态变化事件
  // eslint-disable-next-line no-undef
  const eventHandler = handleLoginStatusChanged as unknown as EventListener
  window.addEventListener('login-status-changed', eventHandler)

  // 组件挂载后，加载用户偏好的高度
  nextTick(() => {
    loadPreferredHeight()
  })

  // 加载快捷 Prompt
  loadQuickPrompt()

  // 加载折叠状态
  loadCollapsedState()

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
const startAIStatusMonitoringForLoggedInProviders = async(): Promise<void> => {
  const { loggedInProviders } = chatStore

  if (loggedInProviders.length === 0) {
    console.log('没有已登录的提供商，跳过AI状态监控启动')
    return
  }

  console.log(`为${loggedInProviders.length}个已登录提供商启动AI状态监控`)

  await Promise.all(
    loggedInProviders.map((provider) => startAIStatusMonitoringForProvider(provider.id))
  )
}

/**
 * 为单个提供商启动AI状态监控
 */
const MAX_MONITORING_RETRY = 5
const monitoringRetryCount: Record<string, number> = {}
const monitoringTimers: Record<string, ReturnType<typeof setTimeout>> = {}

const cancelAIStatusMonitoringRetry = (providerId: string): void => {
  if (monitoringTimers[providerId]) {
    clearTimeout(monitoringTimers[providerId])
    delete monitoringTimers[providerId]
  }
  delete monitoringRetryCount[providerId]
}

const startAIStatusMonitoringForProvider = async(providerId: string): Promise<void> => {
  try {
    if (!window.electronAPI) {
      console.warn('electronAPI不可用，无法启动AI状态监控')
      return
    }
    if (providerId.includes('summary')) {
      console.warn('总结模型不支持AI状态监控')
      return
    }

    const provider = chatStore.providers.find((p) => p.id === providerId)
    if (!provider) {
      console.warn(`提供商不存在: ${providerId}`)
      return
    }

    if (!provider.isEnabled) {
      console.log(`提供商已禁用，跳过AI状态监控: ${provider.name}`)
      cancelAIStatusMonitoringRetry(providerId)
      return
    }

    const webviewId = `webview-${providerId}`
    console.log(`启动AI状态监控: ${provider.name} (webviewId: ${webviewId})`)

    monitoringTimers[providerId] = setTimeout(async() => {
      try {
        const result = await window.electronAPI.startAIStatusMonitoring({
          webviewId,
          providerId
        })

        if (result.success) {
          console.log(`AI状态监控已启动: ${provider.name}`)
          delete monitoringRetryCount[providerId]
        } else {
          const retryCount = (monitoringRetryCount[providerId] || 0) + 1
          monitoringRetryCount[providerId] = retryCount

          if (retryCount >= MAX_MONITORING_RETRY) {
            console.warn(`AI状态监控启动超过最大重试次数(${MAX_MONITORING_RETRY})，停止重试: ${provider.name}`)
            delete monitoringRetryCount[providerId]
            return
          }

          console.warn(`AI状态监控启动失败(${retryCount}/${MAX_MONITORING_RETRY}): ${provider.name}`, result.error)

          monitoringTimers[providerId] = setTimeout(() => {
            startAIStatusMonitoringForProvider(providerId)
          }, 2000)
        }
      } catch (error) {
        const retryCount = (monitoringRetryCount[providerId] || 0) + 1
        monitoringRetryCount[providerId] = retryCount

        if (retryCount >= MAX_MONITORING_RETRY) {
          console.warn(`AI状态监控启动超过最大重试次数(${MAX_MONITORING_RETRY})，停止重试: ${provider.name}`)
          delete monitoringRetryCount[providerId]
          return
        }

        console.error(`启动AI状态监控时发生错误(${retryCount}/${MAX_MONITORING_RETRY}): ${provider.name}`, error)

        monitoringTimers[providerId] = setTimeout(() => {
          startAIStatusMonitoringForProvider(providerId)
        }, 2000)
      }
    }, 1000)
  } catch (error) {
    console.error(`启动AI状态监控失败: ${providerId}`, error)
  }
}

const stopAIStatusMonitoringForProvider = async(providerId: string): Promise<void> => {
  try {
    cancelAIStatusMonitoringRetry(providerId)

    if (!window.electronAPI) {
      console.warn('electronAPI不可用，无法停止AI状态监控')
      return
    }
    if (providerId.includes('summary')) {
      return
    }

    const provider = chatStore.providers.find((p) => p.id === providerId)
    if (!provider) {
      console.warn(`提供商不存在: ${providerId}`)
      return
    }

    console.log(`停止AI状态监控: ${provider.name}`)

    const result = await window.electronAPI.stopAIStatusMonitoring({
      providerId
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

  // 保存用户偏好的高度
  savePreferredHeight()

  // 移除AI状态变化事件监听
  if (unsubscribeAIStatusChange) {
    unsubscribeAIStatusChange()
  }

  // 停止AI状态监控
  stopAIStatusMonitoring()
})
</script>

<style scoped>
/* 苹果设计系统 — 统一输入区样式 */

.unified-input {
  width: 100%;
  transition: all var(--apple-transition);
}

.unified-input.collapsed .input-card {
  display: none;
}

.input-card {
  box-shadow: var(--apple-shadow-card);
  border: 1px solid var(--apple-border);
  border-radius: var(--apple-radius-lg);
}

.input-body {
  transition: all var(--apple-transition);
}

/* 折叠切换 */
.collapse-toggle {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 28px;
  cursor: pointer;
  background: var(--apple-bg-primary);
  border-top: 1px solid var(--apple-separator);
  transition: all var(--apple-transition-fast);
}

.collapse-toggle:hover {
  background: var(--apple-bg-secondary);
}

.collapse-arrow {
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-bottom: 8px solid var(--apple-text-placeholder);
  transition: transform var(--apple-transition-fast);
}

.collapse-toggle.collapsed .collapse-arrow {
  border-bottom: none;
  border-top: 8px solid var(--apple-text-placeholder);
}

.collapse-toggle:hover .collapse-arrow {
  border-bottom-color: var(--apple-brand);
}

.collapse-toggle.collapsed:hover .collapse-arrow {
  border-top-color: var(--apple-brand);
  border-bottom-color: transparent;
}

/* 模型选择器 — 苹果风格分组容器 */
.model-selector {
  margin-bottom: 12px;
  padding: 14px;
  background: var(--apple-bg-secondary);
  border-radius: var(--apple-radius-md);
  border: 1px solid var(--apple-separator);
}

.provider-checkboxes {
  display: flex;
  flex-wrap: wrap;
  column-gap: 16px;
  row-gap: 8px;
  align-items: start;
}

.provider-checkbox {
  margin: 0;
  min-height: 52px;
  flex: 0 1 auto;
  min-width: 0;
}

.provider-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: var(--apple-bg-primary);
  border: 1px solid var(--apple-border);
  border-radius: var(--apple-radius-sm);
  cursor: pointer;
  transition: all var(--apple-transition);
  position: relative;
  overflow: hidden;
  min-width: 130px;
  max-width: 220px;
  box-sizing: border-box;
}

.drag-handle {
  cursor: grab;
  color: var(--apple-text-placeholder);
  font-size: 14px;
  transition: color var(--apple-transition-fast);
  flex-shrink: 0;
}

.drag-handle:hover {
  color: var(--apple-text-secondary);
}

.drag-handle:active {
  cursor: grabbing;
}

.provider-checkbox[draggable="true"] .drag-handle {
  cursor: grab;
}

.provider-checkbox[draggable="true"]:active .drag-handle {
  cursor: grabbing;
}

.provider-checkbox.dragging {
  opacity: 0.5;
}

.provider-checkbox.drag-over {
  border: 2px dashed var(--apple-brand);
  background: var(--apple-brand-light);
}

/* 苹果风格隐藏原生复选框 */
:deep(.provider-checkbox .el-checkbox__input) {
  display: none;
}

:deep(.provider-checkbox .el-checkbox__label) {
  padding: 0;
  margin: 0;
}

/* 苹果风格选中状态 — 柔和蓝色调 + 左侧品牌色指示条 */
:deep(.provider-checkbox.is-checked .provider-option) {
  background: rgba(10, 132, 255, 0.08);
  border-color: rgba(10, 132, 255, 0.35);
  color: var(--apple-text-primary);
  box-shadow: 0 0 0 1px rgba(10, 132, 255, 0.06), inset 3px 0 0 0 #0a84ff;
}

.provider-option:hover {
  border-color: var(--apple-brand);
  box-shadow: var(--apple-shadow-raised);
}

:deep(.provider-checkbox.is-checked .provider-option .provider-name) {
  color: var(--apple-text-primary);
  font-weight: 600;
}

:deep(.provider-checkbox.is-checked .provider-option .status-tag) {
  background: rgba(10, 132, 255, 0.1);
  border-color: rgba(10, 132, 255, 0.2);
  color: #0a84ff;
}

.provider-icon-small {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  object-fit: contain;
}

.provider-name {
  font-weight: 500;
  color: var(--apple-text-primary);
  font-size: 13px;
  flex: 1;
}

.status-tag {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 10px;
}

.ai-status-tag {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 10px;
  background: var(--apple-warning);
  border-color: var(--apple-warning);
  color: white;
}

.header-right .ai-status-tag {
  margin-left: 6px;
}

.loading-icon {
  color: var(--apple-text-tertiary);
  animation: apple-rotate 1s linear infinite;
}

:deep(.provider-checkbox.is-checked .provider-option .loading-icon) {
  color: var(--apple-brand);
}

/* 禁用状态 */
:deep(.provider-checkbox.is-disabled .provider-option) {
  opacity: 0.5;
  cursor: not-allowed;
}

:deep(.provider-checkbox.is-disabled .provider-option:hover) {
  transform: none;
  border-color: var(--apple-border);
  box-shadow: none;
}

.custom-tag {
  font-size: 10px;
  padding: 0 4px;
  border-radius: 4px;
  background: var(--apple-brand-light);
  border-color: var(--apple-brand-100);
  color: var(--apple-brand);
}

.add-provider-btn {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  min-height: 52px;
}

.add-option {
  border: 1px dashed var(--apple-text-placeholder);
  background: var(--apple-bg-primary);
  color: var(--apple-text-tertiary);
  justify-content: center;
}

.add-option:hover {
  border-color: var(--apple-brand);
  color: var(--apple-brand);
  background: var(--apple-brand-light);
  box-shadow: var(--apple-shadow-raised);
}

.add-icon {
  font-size: 18px;
}

/* 响应式布局 */
@media (max-width: 1200px) {
  .provider-option {
    min-width: 120px;
    max-width: 190px;
  }
}

@media (max-width: 768px) {
  .provider-checkboxes {
    gap: 6px;
  }

  .provider-option {
    min-width: 110px;
    max-width: 170px;
    padding: 8px 10px;
    gap: 6px;
  }

  .provider-icon-small {
    width: 18px;
    height: 18px;
  }

  .provider-name {
    font-size: 12px;
  }

  .status-tag {
    font-size: 9px;
    padding: 1px 4px;
  }
}

@media (max-width: 480px) {
  .provider-checkboxes {
    gap: 4px;
  }

  .provider-option {
    min-width: 100px;
    max-width: 150px;
    padding: 6px 8px;
    gap: 6px;
  }

  .provider-name {
    font-size: 11px;
  }
}

.input-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* 附件 */
.attached-files {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
  padding: 8px 10px;
  background: var(--apple-bg-secondary);
  border-radius: var(--apple-radius-sm);
  border: 1px solid var(--apple-separator);
}

.file-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px;
  background: var(--apple-bg-primary);
  border: 1px solid var(--apple-border);
  border-radius: var(--apple-radius-sm);
  font-size: 12px;
  font-weight: 500;
  transition: all var(--apple-transition-fast);
}

.file-chip:hover {
  border-color: var(--apple-brand);
  box-shadow: var(--apple-shadow-raised);
}

.file-chip-icon {
  color: var(--apple-brand);
  font-size: 14px;
}

.file-chip-name {
  color: var(--apple-text-primary);
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-chip-close {
  color: var(--apple-text-placeholder);
  font-size: 12px;
  cursor: pointer;
  transition: color var(--apple-transition-fast);
}

.file-chip-close:hover {
  color: var(--apple-error);
}

/* 输入框容器 */
.textarea-container {
  position: relative;
  width: 100%;
  transition: all var(--apple-transition);
}

.message-input {
  width: 100%;
  transition: all var(--apple-transition);
}

/* 调整大小手柄 */
.textarea-resize-handle {
  position: absolute;
  right: 6px;
  bottom: 6px;
  width: 14px;
  height: 14px;
  cursor: ns-resize;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%238e8e93' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: center;
  opacity: 0.4;
  transition: opacity var(--apple-transition-fast), transform var(--apple-transition-fast);
  z-index: 10;
  user-select: none;
}

.textarea-resize-handle:hover {
  opacity: 0.8;
  transform: scale(1.1);
}

/* 展开按钮 */
.textarea-expand-button {
  position: absolute;
  right: 6px;
  top: 6px;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.8);
  border: 1px solid var(--apple-border);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0.5;
  transition: all var(--apple-transition-fast);
  z-index: 10;
  user-select: none;
  font-size: 12px;
  color: var(--apple-text-secondary);
}

.textarea-expand-button:hover {
  opacity: 1;
  background-color: var(--apple-bg-primary);
  border-color: var(--apple-brand);
  color: var(--apple-brand);
  box-shadow: var(--apple-shadow-raised);
}

.textarea-expand-button:active {
  transform: scale(0.95);
}

/* 操作区域 */
.input-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all var(--apple-transition);
}

.actions-left,
.actions-right {
  display: flex;
  gap: 6px;
}

/* 输入框苹果风格 */
:deep(.el-textarea) {
  position: relative;
  transition: all var(--apple-transition);
}

:deep(.el-textarea__inner) {
  resize: none;
  min-height: 76px;
  height: auto !important;
  min-height: 76px !important;
  line-height: 1.5;
  font-size: 14px;
  letter-spacing: -0.1px;
  transition: all var(--apple-transition);
  overflow-wrap: break-word;
  word-wrap: break-word;
  hyphens: auto;
  box-sizing: border-box;
  border-radius: var(--apple-radius-sm);
  border-color: var(--apple-border);
}

:deep(.el-textarea__inner:focus) {
  border-color: var(--apple-brand);
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.15);
}

/* 展开状态 */
.textarea-container.expanded :deep(.el-textarea__inner) {
  min-height: 400px;
  max-height: 60vh;
}

/* 调整大小状态 */
.textarea-container.resizing :deep(.el-textarea__inner) {
  cursor: ns-resize;
}

/* 响应式 */
@media (max-width: 768px) {
  .textarea-container {
    width: 100%;
  }

  .textarea-expand-button {
    width: 22px;
    height: 22px;
    font-size: 10px;
  }

  .textarea-resize-handle {
    width: 12px;
    height: 12px;
  }

  :deep(.el-textarea__inner) {
    font-size: 13px;
    line-height: 1.45;
  }
}

@media (max-width: 480px) {
  .textarea-container {
    width: 100%;
  }

  .input-actions {
    flex-direction: column;
    gap: 6px;
    align-items: stretch;
  }

  .actions-left,
  .actions-right {
    justify-content: center;
  }
}

/* 动画过渡 */
:deep(.el-textarea) {
  transition: height var(--apple-transition), min-height var(--apple-transition), max-height var(--apple-transition);
}

:deep(.el-textarea__inner) {
  transition:
    height var(--apple-transition),
    min-height var(--apple-transition),
    max-height var(--apple-transition),
    border-color var(--apple-transition),
    box-shadow var(--apple-transition);
}

/* 苹果风格滚动条 */
:deep(.el-textarea__inner::-webkit-scrollbar) {
  width: 5px;
  height: 5px;
}

:deep(.el-textarea__inner::-webkit-scrollbar-track) {
  background: transparent;
}

:deep(.el-textarea__inner::-webkit-scrollbar-thumb) {
  background: rgba(0, 0, 0, 0.15);
  border-radius: 3px;
}

:deep(.el-textarea__inner::-webkit-scrollbar-thumb:hover) {
  background: rgba(0, 0, 0, 0.3);
}

/* 触摸设备优化 */
@media (hover: none) and (pointer: coarse) {
  .textarea-resize-handle {
    width: 20px;
    height: 20px;
    opacity: 0.7;
  }

  .textarea-expand-button {
    width: 28px;
    height: 28px;
  }
}

@keyframes apple-rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 响应式 */
@media (max-width: 768px) {
  .provider-checkboxes {
    justify-content: center;
  }

  .model-selector {
    padding: 10px;
  }

  .provider-option {
    padding: 8px 10px;
  }
}
</style>
