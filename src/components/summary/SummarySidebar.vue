<template>
  <!-- 折叠切换按钮 - 放在侧边栏外部，完全独立定位 -->
  <div
    v-show="!isMaximized && !layoutStore.maximizedCardId"
    class="collapse-toggle"
    :class="{ collapsed: isCollapsed }"
    :title="isCollapsed ? '展开总结面板' : '收起总结面板'"
    @click="toggleCollapse"
  >
    <div class="toggle-button">
      <svg
        class="collapse-arrow"
        width="10"
        height="14"
        viewBox="0 0 12 16"
      >
        <path
          v-if="!isCollapsed"
          d="M4 3 L10 8 L4 13"
          stroke="currentColor"
          stroke-width="2"
          fill="none"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          v-else
          d="M8 3 L2 8 L8 13"
          stroke="currentColor"
          stroke-width="2"
          fill="none"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </div>
  </div>

  <div
    class="summary-sidebar"
    :class="{ collapsed: isCollapsed }"
  >
    <!-- 侧边栏内容 -->
    <div
      v-show="!isCollapsed"
      class="sidebar-content"
    >
      <!-- 侧边栏头部 - 模型选择 -->
      <div class="sidebar-header">
        <span class="header-title">AI 总结</span>
        <div class="header-actions">
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
          <el-button
            :icon="isMaximized ? Close : FullScreen"
            size="small"
            circle
            :title="isMaximized ? '还原' : '最大化'"
            @click="isMaximized = !isMaximized"
          />
        </div>
      </div>

      <!-- AI卡片区域 -->
      <div
        class="ai-card-container"
        data-webview-clip
      >
        <SummaryCard
          v-if="provider"
          :key="summaryProviderId"
          :provider="provider"
          :config="cardConfig"
          :maximized="isMaximized"
          @toggle-maximized="handleToggleMaximized"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { FullScreen, Close } from '@element-plus/icons-vue'
import SummaryCard from '../chat/SummaryCard.vue'
import { useLayoutStore } from '../../stores'
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
  /** 是否折叠 */
  collapsed?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  collapsed: true
})

/**
 * 组件事件
 */
interface Emits {
  /** 更新显示状态 */
  (e: 'update:visible', visible: boolean): void
  /** 更新折叠状态 */
  (e: 'update:collapsed', collapsed: boolean): void
  /** 模型切换事件 */
  (e: 'model-change', providerId: string): void
}

const emit = defineEmits<Emits>()

const layoutStore = useLayoutStore()

// 折叠状态 - 默认收起
const isCollapsed = ref(props.collapsed)

// 监听父组件折叠状态变化并同步
watch(() => props.collapsed, (newCollapsed) => {
  isCollapsed.value = newCollapsed
})

// 最大化状态
const isMaximized = ref(false)

// 选中的模型ID
const selectedModelId = ref(props.selectedProviderId)

// 切换折叠
const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
  emit('update:collapsed', isCollapsed.value)
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

// 处理最大化切换
const handleToggleMaximized = () => {
  isMaximized.value = !isMaximized.value
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
    emit('update:collapsed', isCollapsed.value)
  }
})

// 监听selectedProviderId变化
watch(() => props.selectedProviderId, (newId) => {
  selectedModelId.value = newId
})

// 监听折叠状态变化，更新原生视图层级
watch(isCollapsed, (collapsed) => {
  if (collapsed) {
    layoutStore.onSidebarCollapse()
  } else {
    layoutStore.onSidebarExpand()
  }
})
</script>

<style scoped>
/**
 * 折叠切换按钮 - 根据侧边栏状态动态定位
 * 收起时：在屏幕右边缘
 * 展开时：在侧边栏左边缘（屏幕中间）
 */
.collapse-toggle {
  position: fixed;
  right: 50%;
  top: 50%;
  transform: translateY(-50%);
  z-index: 210;
  transition: right 0.3s ease;
}

.collapse-toggle.collapsed {
  right: 0;
}

.toggle-button {
  width: 24px;
  height: 48px;
  background: var(--el-color-primary);
  border: 1px solid var(--el-color-primary-dark-2);
  border-radius: 6px 0 0 6px;
  box-shadow: -1px 0 8px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
  color: #fff;
}

.toggle-button:hover {
  background: var(--el-color-primary-light-3);
  width: 28px;
  box-shadow: -2px 0 12px rgba(0, 0, 0, 0.2);
}

.toggle-button:active {
  transform: scale(0.95);
}

.collapse-arrow {
  color: #fff;
  transition: transform 0.3s;
}

.collapse-toggle.collapsed .collapse-arrow {
  transform: rotate(180deg);
}

.summary-sidebar {
  position: fixed;
  right: 0;
  top: 0;
  height: 100vh;
  width: 50%;
  background: var(--el-bg-color);
  border-left: 1px solid var(--el-border-color);
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
  z-index: 100;
  transition: transform 0.3s ease;
  display: flex;
}

.summary-sidebar.collapsed {
  transform: translateX(calc(100%));
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
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
