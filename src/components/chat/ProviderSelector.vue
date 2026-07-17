<template>
  <div class="model-selector">
    <el-checkbox-group
      v-model="localSelectedProviders"
      class="provider-checkboxes"
      @change="handleProviderSelection"
    >
      <el-checkbox
        v-for="provider in sortedProviders"
        :key="provider.id"
        :label="provider.id"
        :disabled="provider.loadingState === 'loading'"
        class="provider-checkbox"
        draggable="true"
        @dragstart="handleDragStart($event, provider)"
        @dragover="handleDragOver($event)"
        @dragleave="handleDragLeave($event)"
        @drop="handleDrop($event, provider)"
        @dragend="handleDragEnd"
      >
        <div class="provider-option">
          <img
            :src="provider.icon"
            :alt="provider.name"
            class="provider-icon-small"
            @error="handleIconError"
          >
          <span class="provider-name">{{ provider.name }}</span>
          <el-tag
            v-if="provider.isCustom"
            type="info"
            size="small"
            class="custom-tag"
          >
            自定义
          </el-tag>
          <el-tag
            v-if="getProviderAIStatus(provider.id) === 'responding'"
            type="warning"
            size="small"
            class="ai-status-tag"
          >
            回答中
          </el-tag>
          <el-tag
            v-else-if="provider.isLoggedIn && localSelectedProviders.includes(provider.id)"
            type="success"
            size="small"
            class="status-tag"
          >
            已登录
          </el-tag>
          <el-icon
            v-if="provider.loadingState === 'loading'"
            class="loading-icon"
          >
            <Loading />
          </el-icon>
        </div>
      </el-checkbox>
      <div
        class="provider-checkbox add-provider-btn"
        @click="handleAddProvider"
      >
        <div class="provider-option add-option">
          <el-icon class="add-icon">
            <Plus />
          </el-icon>
          <span class="provider-name">添加模型</span>
        </div>
      </div>
    </el-checkbox-group>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Loading, Plus } from '@element-plus/icons-vue'
import type { AIProvider } from '@/types'

/**
 * Provider选择器组件的属性定义
 */
interface Props {
  providers: AIProvider[]
  selectedProviders: string[]
  aiStatusMap: { [providerId: string]: 'waiting_input' | 'responding' | 'completed' }
}

const props = defineProps<Props>()

/**
 * Provider选择器组件的事件定义
 */
const emit = defineEmits<{(e: 'update:selectedProviders', value: string[]): void
  (e: 'addProvider'): void
  (e: 'providerSelectionChange', value: string[]): void
}>()

/**
 * 拖拽中的 provider
 */
const draggedProvider = ref<AIProvider | null>(null)

/**
 * 本地选中的 provider 列表（用于双向绑定）
 */
const localSelectedProviders = computed({
  get: () => props.selectedProviders,
  set: (value: string[]) => {
    emit('update:selectedProviders', value)
  }
})

/**
 * 排序后的 provider 列表
 * 选中的排在前面，且按照选中顺序排列
 */
const sortedProviders = computed(() => {
  const providers = [...props.providers]
  return providers.sort((a, b) => {
    const aSelected = localSelectedProviders.value.includes(a.id)
    const bSelected = localSelectedProviders.value.includes(b.id)

    if (aSelected && !bSelected) {
      return -1
    }
    if (!aSelected && bSelected) {
      return 1
    }

    if (aSelected && bSelected) {
      const aIndex = localSelectedProviders.value.indexOf(a.id)
      const bIndex = localSelectedProviders.value.indexOf(b.id)
      return bIndex - aIndex
    }

    return 0
  })
})

/**
 * 获取 provider 的 AI 状态
 */
const getProviderAIStatus = (
  providerId: string
): 'waiting_input' | 'responding' | 'completed' | undefined => props.aiStatusMap[providerId]

/**
 * 处理 provider 选择变化
 */
const handleProviderSelection = (value: string[]): void => {
  emit('providerSelectionChange', value)
}

/**
 * 处理添加 provider 按钮点击
 */
const handleAddProvider = (): void => {
  emit('addProvider')
}

/**
 * 处理图标加载错误
 */
const handleIconError = (event: Event): void => {
  const img = event.target as HTMLImageElement
  img.src = '/icons/default.svg'
}

/**
 * 拖拽开始
 */
const handleDragStart = (event: DragEvent, provider: AIProvider): void => {
  draggedProvider.value = provider
  const { dataTransfer } = event
  if (dataTransfer) {
    dataTransfer.effectAllowed = 'move'
  }
  const target = event.target as HTMLElement
  const checkbox = target.closest('.provider-checkbox')
  if (checkbox) {
    checkbox.classList.add('dragging')
  }
}

/**
 * 拖拽经过
 */
const handleDragOver = (event: DragEvent): void => {
  event.preventDefault()
  const { dataTransfer } = event
  if (dataTransfer) {
    dataTransfer.dropEffect = 'move'
  }
  const target = event.target as HTMLElement
  const checkbox = target.closest('.provider-checkbox')
  if (checkbox && !checkbox.classList.contains('dragging')) {
    checkbox.classList.add('drag-over')
  }
}

/**
 * 拖拽离开
 */
const handleDragLeave = (event: DragEvent): void => {
  const target = event.target as HTMLElement
  const checkbox = target.closest('.provider-checkbox')
  if (checkbox) {
    checkbox.classList.remove('drag-over')
  }
}

/**
 * 拖拽结束
 */
const handleDragEnd = (): void => {
  const draggingCheckboxes = document.querySelectorAll('.provider-checkbox.dragging')
  draggingCheckboxes.forEach((el) => el.classList.remove('dragging'))
  const dragOverCheckboxes = document.querySelectorAll('.provider-checkbox.drag-over')
  dragOverCheckboxes.forEach((el) => el.classList.remove('drag-over'))
}

/**
 * 拖拽释放
 */
const handleDrop = (event: DragEvent, targetProvider: AIProvider): void => {
  event.preventDefault()

  const target = event.target as HTMLElement
  const checkbox = target.closest('.provider-checkbox')
  if (checkbox) {
    checkbox.classList.remove('drag-over')
  }

  if (!draggedProvider.value || draggedProvider.value.id === targetProvider.id) {
    draggedProvider.value = null
    return
  }

  const draggedIndex = localSelectedProviders.value.indexOf(draggedProvider.value.id)
  const targetIndex = localSelectedProviders.value.indexOf(targetProvider.id)

  if (draggedIndex !== -1 && targetIndex !== -1) {
    const newSelectedProviders = [...localSelectedProviders.value]
    newSelectedProviders.splice(draggedIndex, 1)
    newSelectedProviders.splice(targetIndex, 0, draggedProvider.value.id)
    localSelectedProviders.value = newSelectedProviders
  }

  draggedProvider.value = null
}
</script>

<style scoped>
.model-selector {
  margin-bottom: 12px;
}

.provider-checkboxes {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.provider-checkbox {
  margin: 0;
  cursor: pointer;
}

.provider-option {
  display: flex;
  align-items: center;
  gap: 6px;
}

.provider-icon-small {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  object-fit: contain;
}

.provider-name {
  font-size: 13px;
  color: var(--text-primary, #303133);
}

.custom-tag {
  margin-left: 4px;
}

.ai-status-tag {
  margin-left: 4px;
}

.status-tag {
  margin-left: 4px;
}

.loading-icon {
  margin-left: 4px;
  color: var(--color-primary, #409eff);
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.add-provider-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px 12px;
  border: 1px dashed var(--border-color, #dcdfe6);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.add-provider-btn:hover {
  border-color: var(--color-primary, #409eff);
  color: var(--color-primary, #409eff);
}

.add-option {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--text-secondary, #909399);
  font-size: 13px;
}

.add-icon {
  font-size: 14px;
}

.provider-checkbox.dragging {
  opacity: 0.5;
}

.provider-checkbox.drag-over {
  border: 1px solid var(--color-primary, #409eff);
  border-radius: 4px;
}
</style>
