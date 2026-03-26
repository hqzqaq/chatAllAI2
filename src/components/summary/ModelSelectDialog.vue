<template>
  <el-dialog
    v-model="dialogVisible"
    title="选择总结模型"
    width="500px"
    :close-on-click-modal="false"
    :close-on-press-escape="!isLoading"
    :show-close="!isLoading"
    class="model-select-dialog"
  >
    <div class="dialog-content">
      <p class="dialog-description">
        请选择用于执行总结的AI模型，该模型将对所有其他AI的回答进行总结分析。
      </p>

      <div class="provider-list">
        <div
          v-for="provider in availableProviders"
          :key="provider.id"
          class="provider-item"
          :class="{ selected: selectedProvider === provider.id }"
          @click="selectProvider(provider.id)"
        >
          <div class="provider-radio">
            <el-radio
              v-model="selectedProvider"
              :label="provider.id"
              :disabled="isLoading"
            >
              <div class="provider-info">
                <img
                  :src="provider.icon"
                  :alt="provider.name"
                  class="provider-icon"
                  @error="handleIconError"
                >
                <span class="provider-name">{{ provider.name }}</span>
                <el-tag
                  v-if="provider.isLoggedIn && provider.id === recommendedProvider"
                  type="success"
                  size="small"
                  class="recommend-tag"
                >
                  推荐
                </el-tag>
              </div>
            </el-radio>
          </div>
        </div>
      </div>

      <div
        v-if="selectedProviderInfo"
        class="selected-info"
      >
        <el-alert
          :title="`将使用 ${selectedProviderInfo.name} 进行总结`"
          type="info"
          :closable="false"
          show-icon
        >
          <template #default>
            <p class="info-text">
              该AI将接收所有其他AI的回答内容，并生成一份结构化的总结报告。
            </p>
          </template>
        </el-alert>
      </div>

      <div
        v-if="isLoading"
        class="loading-section"
      >
        <el-progress
          :percentage="progressPercentage"
          :status="progressStatus"
          :stroke-width="8"
        />
        <p class="loading-text">
          {{ loadingText }}
        </p>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button
          :disabled="isLoading"
          @click="handleCancel"
        >
          取消
        </el-button>
        <el-button
          type="primary"
          :disabled="!selectedProvider || isLoading"
          :loading="isLoading"
          @click="handleConfirm"
        >
          {{ isLoading ? '处理中...' : '开始总结' }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { AIProvider } from '../../types'

/**
 * 组件属性
 */
interface Props {
  /** 是否显示对话框 */
  visible: boolean
  /** 可用的AI提供商列表 */
  providers: AIProvider[]
  /** 是否正在加载 */
  isLoading?: boolean
  /** 加载进度文本 */
  loadingText?: string
  /** 加载进度百分比 */
  progressPercentage?: number
  /** 进度状态 */
  progressStatus?: string
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
  loadingText: '',
  progressPercentage: 0,
  progressStatus: ''
})

/**
 * 组件事件
 */
interface Emits {
  /** 更新显示状态 */
  (e: 'update:visible', visible: boolean): void
  /** 确认选择 */
  (e: 'confirm', providerId: string): void
  /** 取消 */
  (e: 'cancel'): void
}

const emit = defineEmits<Emits>()

// 选中的AI提供商
const selectedProvider = ref<string>('')

// 推荐的AI提供商（根据经验，长文本处理能力较强的模型）
const recommendedProvider = ref<string>('kimi')

// 对话框显示状态
const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

// 所有AI提供商列表（显示所有模型，包括未登录的）
const availableProviders = computed(() => props.providers)

// 选中的AI提供商信息
const selectedProviderInfo = computed(() => availableProviders.value.find((p) => p.id === selectedProvider.value))

/**
 * 选择AI提供商
 * @param providerId AI提供商ID
 */
const selectProvider = (providerId: string): void => {
  if (props.isLoading) return
  selectedProvider.value = providerId
}

/**
 * 处理图标加载错误
 * @param event 错误事件
 */
const handleIconError = (event: Event): void => {
  const img = event.target as HTMLImageElement
  img.src = '/icons/default.svg'
}

/**
 * 处理取消
 */
const handleCancel = (): void => {
  dialogVisible.value = false
  emit('cancel')
}

/**
 * 处理确认
 */
const handleConfirm = (): void => {
  if (!selectedProvider.value || props.isLoading) return
  emit('confirm', selectedProvider.value)
}

// 监听对话框显示状态
watch(() => props.visible, (newVisible) => {
  if (newVisible) {
    // 重置选择
    selectedProvider.value = ''

    // 如果有推荐的且可用，自动选中
    const recommended = availableProviders.value.find((p) => p.id === recommendedProvider.value)
    if (recommended) {
      selectedProvider.value = recommended.id
    } else if (availableProviders.value.length > 0) {
      // 否则选中第一个
      selectedProvider.value = availableProviders.value[0].id
    }
  }
})
</script>

<style scoped>
.model-select-dialog :deep(.el-dialog__body) {
  padding: 20px;
}

.dialog-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.dialog-description {
  color: var(--el-text-color-regular);
  font-size: 14px;
  line-height: 1.6;
  margin: 0;
}

.provider-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
}

.provider-item {
  padding: 12px 16px;
  border: 2px solid var(--el-border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.provider-item:hover {
  border-color: var(--el-color-primary-light-5);
  background-color: var(--el-fill-color-light);
}

.provider-item.selected {
  border-color: var(--el-color-primary);
  background-color: var(--el-color-primary-light-9);
}

.provider-radio :deep(.el-radio) {
  margin-right: 0;
  width: 100%;
}

.provider-radio :deep(.el-radio__label) {
  padding-left: 8px;
  width: 100%;
}

.provider-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.provider-icon {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  object-fit: contain;
}

.provider-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.recommend-tag {
  margin-left: auto;
}

.selected-info {
  margin-top: 8px;
}

.info-text {
  margin: 8px 0 0 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}

.loading-section {
  margin-top: 16px;
  padding: 16px;
  background-color: var(--el-fill-color-light);
  border-radius: 8px;
}

.loading-text {
  margin: 12px 0 0 0;
  text-align: center;
  font-size: 14px;
  color: var(--el-text-color-regular);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* 滚动条样式 */
.provider-list::-webkit-scrollbar {
  width: 6px;
}

.provider-list::-webkit-scrollbar-track {
  background: var(--el-fill-color-light);
  border-radius: 3px;
}

.provider-list::-webkit-scrollbar-thumb {
  background: var(--el-border-color);
  border-radius: 3px;
}

.provider-list::-webkit-scrollbar-thumb:hover {
  background: var(--el-border-color-darker);
}
</style>
