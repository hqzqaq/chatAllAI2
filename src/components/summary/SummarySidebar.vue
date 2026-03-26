<template>
  <div
    class="summary-sidebar"
    :class="{ collapsed: isCollapsed }"
  >
    <!-- 折叠切换按钮 - 小圆点按钮 -->
    <div
      class="collapse-toggle"
      :class="{ collapsed: isCollapsed }"
      :title="isCollapsed ? '展开总结面板' : '收起总结面板'"
      @click="toggleCollapse"
    >
      <div class="toggle-button">
        <div class="collapse-arrow" />
      </div>
    </div>

    <!-- 侧边栏内容 -->
    <div
      v-show="!isCollapsed"
      class="sidebar-content"
    >
      <!-- 侧边栏头部 - 模型选择 -->
      <div class="sidebar-header">
        <span class="header-title">AI 总结</span>
        <el-select
          v-model="selectedModelId"
          size="small"
          class="model-select"
          @change="handleModelChange"
        >
          <el-option
            v-for="p in availableProviders"
            :key="p.id"
            :label="p.name"
            :value="p.id"
          >
            <div class="provider-option">
              <img
                :src="p.icon"
                class="provider-icon-small"
                @error="handleIconError"
              >
              <span>{{ p.name }}</span>
            </div>
          </el-option>
        </el-select>
      </div>

      <!-- AI卡片区域 -->
      <div class="ai-card-container">
        <AICard
          v-if="provider"
          :key="summaryProviderId"
          :provider="provider"
          :config="cardConfig"
          class="summary-ai-card"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AICard from '../chat/AICard.vue'
import type { AIProvider } from '../../types'

/**
 * 组件属性
 */
interface Props {
  /** 原始AI提供商ID */
  originalProviderId: string
  /** 原始AI提供商名称 */
  originalProviderName: string
  /** 原始AI提供商对象 */
  originalProvider: AIProvider | null
  /** 是否显示 */
  visible: boolean
  /** 可用模型列表 */
  availableProviders: AIProvider[]
  /** 当前选中的模型ID */
  selectedProviderId: string
}

const props = defineProps<Props>()

/**
 * 组件事件
 */
interface Emits {
  /** 更新显示状态 */
  (e: 'update:visible', visible: boolean): void
  /** 模型切换事件 */
  (e: 'model-change', providerId: string): void
}

const emit = defineEmits<Emits>()

// 折叠状态 - 默认收起
const isCollapsed = ref(true)

// 选中的模型ID
const selectedModelId = ref(props.selectedProviderId)

// 切换折叠
const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
}

// 处理模型切换
const handleModelChange = (providerId: string) => {
  emit('model-change', providerId)
}

// 处理图标加载错误
const handleIconError = (event: Event) => {
  const img = event.target as HTMLImageElement
  img.src = '/icons/default.svg'
}

// 总结模型的providerId（加summary后缀）
const summaryProviderId = computed(() => `summary-${props.originalProviderId}`)

// 显示的名称
const providerName = computed(() => props.originalProviderName || '未知模型')

// 构建独立的AIProvider对象
const provider = computed((): AIProvider | null => {
  if (!props.originalProvider) return null

  return {
    ...props.originalProvider,
    id: summaryProviderId.value,
    name: `${props.originalProviderName} (总结)`,
    webviewId: `webview-${summaryProviderId.value}`,
    isEnabled: true,
    isLoggedIn: props.originalProvider.isLoggedIn,
    loadingState: props.originalProvider.isLoggedIn ? 'loaded' : 'loading'
  }
})

// 卡片配置
const cardConfig = computed(() => ({
  id: summaryProviderId.value,
  providerId: summaryProviderId.value,
  position: { x: 0, y: 0 },
  size: { width: '100%', height: '100%' },
  isVisible: true,
  isHidden: false,
  isMinimized: false,
  isMaximized: false,
  zIndex: 1,
  title: `${providerName.value} (总结)`
}))

// 监听visible变化，当显示时自动展开
watch(() => props.visible, (newVisible) => {
  if (newVisible) {
    isCollapsed.value = false
  }
})

// 监听selectedProviderId变化
watch(() => props.selectedProviderId, (newId) => {
  selectedModelId.value = newId
})
</script>

<style scoped>
.summary-sidebar {
  position: fixed;
  right: 0;
  top: 0;
  height: 100vh;
  width: 50%;
  background: var(--el-bg-color);
  border-left: 1px solid var(--el-border-color);
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  transition: transform 0.3s ease;
  display: flex;
}

.summary-sidebar.collapsed {
  transform: translateX(calc(100%));
}

.collapse-toggle {
  position: absolute;
  left: -32px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 1001;
}

.toggle-button {
  width: 28px;
  height: 60px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color);
  border-radius: 8px 0 0 8px;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
}

.toggle-button:hover {
  background: var(--el-fill-color-light);
  width: 32px;
}

.collapse-arrow {
  width: 0;
  height: 0;
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
  border-right: 6px solid var(--el-text-color-regular);
  transition: transform 0.3s;
}

.summary-sidebar.collapsed .collapse-arrow {
  transform: rotate(180deg);
}

.sidebar-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-header {
  height: 50px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--el-border-color);
  background: var(--el-fill-color-light);
}

.header-title {
  font-weight: 600;
  font-size: 16px;
  color: var(--el-text-color-primary);
}

.model-select {
  width: 150px;
}

.provider-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

.provider-icon-small {
  width: 16px;
  height: 16px;
  border-radius: 2px;
  object-fit: contain;
}

.ai-card-container {
  flex: 1;
  overflow: hidden;
  padding: 10px;
}

.summary-ai-card {
  width: 100%;
  height: 100%;
}

.summary-ai-card :deep(.ai-card) {
  height: 100%;
  border: none;
  box-shadow: none;
}

.summary-ai-card :deep(.webview-container) {
  height: calc(100% - 50px);
}
</style>
