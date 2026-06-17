<template>
  <div class="chat-view">
    <div
      class="chat-container"
      :style="containerStyle"
    >
      <!-- 统一输入区域 -->
      <div class="input-section">
        <UnifiedInput
          v-model:collapsed="inputCollapsed"
          @summary="handleSummaryClick"
        />
      </div>

      <!-- AI卡片网格 -->
      <div
        class="cards-grid"
        data-webview-clip
        :style="gridStyle"
      >
        <!-- 普通AI卡片 -->
        <AICard
          v-for="provider in visibleProviders"
          :key="provider.id"
          :provider="provider"
          :config="getCardConfig(provider.id)"
          class="card-item"
        />
      </div>
    </div>

    <!-- 总结侧边栏 - 嵌入独立的AI卡片 -->
    <SummarySidebar
      v-model:visible="sidebarVisible"
      v-model:collapsed="sidebarCollapsed"
      :original-provider-id="selectedSummaryProvider?.id || ''"
      :original-provider-name="selectedSummaryProvider?.name || ''"
      :original-provider="selectedSummaryProvider"
      :available-providers="allProviders"
      :selected-provider-id="selectedSummaryProviderId"
      @model-change="handleSummaryModelChange"
    />
  </div>
</template>

<script setup lang="ts">
import {
  computed, onMounted, onUnmounted, watch, ref
} from 'vue'
import { useChatStore, useLayoutStore } from '../stores'
import { useSummary } from '../composables/useSummary'
import { useViewLayering } from '../composables/useViewLayering'
import UnifiedInput from '../components/chat/UnifiedInput.vue'
import AICard from '../components/chat/AICard.vue'
import SummarySidebar from '../components/summary/SummarySidebar.vue'

const chatStore = useChatStore()
const layoutStore = useLayoutStore()

const sidebarCollapsed = ref(true)
const inputCollapsed = ref(false)

// 初始化原生视图层级管理
useViewLayering()

const {
  sidebarVisible,
  selectedSummaryProvider,
  selectedSummaryProviderId,
  loggedInProviders,
  allProviders,
  handleSummaryClick,
  handleSummaryModelChange
} = useSummary()

// 计算属性
const providers = computed(() => chatStore.providers)

const visibleProviders = computed(() => {
  const enabledProviders = providers.value.filter((provider) => {
    const config = getCardConfig(provider.id)
    // 只有当模型被选中且可见时才显示卡片
    return provider.isEnabled && config?.isVisible !== false
  })

  // 使用chatStore的selectedProviders进行排序
  const sortedProviders = [...enabledProviders].sort((a, b) => {
    const aSelected = chatStore.selectedProviders.includes(a.id)
    const bSelected = chatStore.selectedProviders.includes(b.id)

    if (aSelected && !bSelected) {
      return -1
    }
    if (!aSelected && bSelected) {
      return 1
    }

    if (aSelected && bSelected) {
      const aIndex = chatStore.selectedProviders.indexOf(a.id)
      const bIndex = chatStore.selectedProviders.indexOf(b.id)
      return bIndex - aIndex
    }

    return 0
  })

  return sortedProviders
})

const gridStyle = computed(() => {
  const { columns } = layoutStore.gridSettings
  const { gap } = layoutStore.gridSettings

  // 网格布局：stretch 让卡片自动撑满行高，配合 alignContent 默认 stretch
  // 让行高跟随网格高度自适应，避免全屏时上下卡片间出现大片空白
  const style: Record<string, string> = {
    display: 'grid',
    gridTemplateColumns: `repeat(${columns}, 1fr)`,
    gap: `${gap}px`,
    padding: `${gap}px`
  }

  if (inputCollapsed.value) {
    style.paddingTop = '0px'
  }

  return style
})

const containerStyle = computed(() => {
  if (!sidebarVisible.value) return {}
  if (!sidebarCollapsed.value) return { paddingRight: '50vw' }
  return {}
})

/**
 * 获取卡片配置
 */
const getCardConfig = (providerId: string) => layoutStore.getCardConfig(providerId)

// 响应式布局处理
const handleResize = () => {
  layoutStore.updateWindowSize(window.innerWidth, window.innerHeight)
}

// 键盘事件处理
const handleKeyDown = (event: KeyboardEvent) => {
  // 检查是否按下了Ctrl或Cmd键
  const isModifierKey = event.ctrlKey || event.metaKey

  // 检查是否按下了数字键1-9
  if (isModifierKey && event.key >= '1' && event.key <= '9') {
    // 阻止默认行为，避免与浏览器快捷键冲突
    event.preventDefault()

    // 获取数字键对应的索引（从0开始）
    const index = parseInt(event.key, 10) - 1

    // 检查索引是否在可见卡片范围内
    if (index < visibleProviders.value.length) {
      // 获取对应的卡片provider
      const provider = visibleProviders.value[index]

      // 切换卡片最大化状态
      layoutStore.toggleCardMaximized(provider.id)
    }
  }
}

// 生命周期
onMounted(() => {
  // 初始化聊天数据
  chatStore.initializeConversations()

  // 初始化总结侧边栏 - 默认使用 deepseek
  // sidebarVisible 默认为 true，但 SummarySidebar 中的 isCollapsed 默认为 true（收起状态）
  const defaultProvider = chatStore.providers.find((p) => p.id === 'deepseek')
  if (defaultProvider) {
    selectedSummaryProvider.value = defaultProvider
  }

  // 立即更新窗口大小，确保初始布局计算正确
  layoutStore.updateWindowSize(window.innerWidth, window.innerHeight)

  // 立即加载布局配置，不要等待
  const initializeLayout = () => {
    console.log('开始初始化布局...')
    const providerIds = providers.value.map((p) => p.id)

    // 先加载保存的布局配置
    layoutStore.loadLayoutConfig()
    console.log('布局配置加载完成，当前网格设置:', layoutStore.gridSettings)

    // 清空现有卡片配置，强制重新初始化所有provider的配置
    console.log('清空现有卡片配置')
    // @ts-ignore - 直接访问cardConfigs以清空它
    layoutStore.cardConfigs = {}

    // 重新初始化所有卡片配置
    console.log('重新初始化所有卡片配置:', providerIds)
    layoutStore.initializeCardConfigs(providerIds)

    // 重新计算布局，确保所有卡片正确显示
    layoutStore.recalculateLayout()
    console.log('布局重新计算完成')
  }

  // 立即执行布局初始化
  initializeLayout()

  // 监听窗口大小变化
  window.addEventListener('resize', handleResize)

  // 添加键盘事件监听
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  // 移除窗口大小变化监听器
  window.removeEventListener('resize', handleResize)

  // 移除键盘事件监听
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<style scoped>
.chat-view {
  /* 修复：之前用 100vh 会让 chat-view 撑到整个窗口高度，
     溢出 main-content 并盖住 footer。改为 100% 让其填满父容器 */
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.chat-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 6px;
  gap: 16px;
  min-height: 0; /* 允许flex子项收缩 */
  overflow: hidden; /* 防止整体滚动，让滚动仅在卡片网格区域内部进行 */
}

.input-section {
  flex-shrink: 0;
}

.cards-grid {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0; /* 允许flex子项收缩 */
}

.card-item {
  width: 100%;
  max-width: 100%;
  min-width: 300px; /* 最小宽度 */
  height: 100%; /* 根据内容自适应高度 */
  /* 确保卡片在网格中正确显示 */
  grid-column: auto;
  grid-row: auto;
}

/* 响应式布局 */
@media (max-width: 1200px) {
  .cards-grid {
    grid-template-columns: repeat(2, 1fr) !important;
  }
}

@media (max-width: 800px) {
  .cards-grid {
    grid-template-columns: 1fr !important;
  }
}

/* 卡片动画 */
.card-item {
  animation: fadeInUp 0.3s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
