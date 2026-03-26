<template>
  <div class="chat-view">
    <div class="chat-container">
      <!-- 统一输入区域 -->
      <div class="input-section">
        <UnifiedInput @summary="handleSummaryClick" />
      </div>

      <!-- AI卡片网格 -->
      <div
        class="cards-grid"
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
  computed, onMounted, onUnmounted, ref, watch
} from 'vue'
import { useChatStore, useLayoutStore, useSummaryStore } from '../stores'
import { summaryService } from '../services/SummaryService'
import UnifiedInput from '../components/chat/UnifiedInput.vue'
import AICard from '../components/chat/AICard.vue'
import SummarySidebar from '../components/summary/SummarySidebar.vue'
import { ElMessage } from 'element-plus'
import type { AIProvider } from '../types'

const chatStore = useChatStore()
const layoutStore = useLayoutStore()
const summaryStore = useSummaryStore()

// 总结侧边栏显示状态
const sidebarVisible = ref(false)

// 选中的总结模型
const selectedSummaryProvider = ref<AIProvider | null>(null)

// 默认总结模型ID
const selectedSummaryProviderId = ref<string>('deepseek')

// 已登录的AI提供商
const loggedInProviders = computed(() => chatStore.loggedInProviders)

// 所有AI提供商（用于选择总结模型）
const allProviders = computed(() => chatStore.providers)

/**
 * 处理总结按钮点击
 */
const handleSummaryClick = (): void => {
  const providerId = selectedSummaryProviderId.value
  const selectedProvider = chatStore.providers.find((p) => p.id === providerId)

  if (!selectedProvider) {
    ElMessage.error('未找到默认总结模型')
    return
  }

  selectedSummaryProvider.value = selectedProvider
  sidebarVisible.value = true

  executeSummary(providerId)
}

/**
 * 执行总结
 * @param providerId 总结模型ID
 */
const executeSummary = async(providerId: string): Promise<void> => {
  const originalQuery = chatStore.currentMessage || '总结各AI的回答'

  const selectedProvider = chatStore.providers.find((p) => p.id === providerId)
  if (!selectedProvider) {
    ElMessage.error('未找到选中的AI模型')
    return
  }

  // 构建providers列表：已登录的模型 + 选中的总结模型（如果不在已登录列表中）
  const providersForSummary = [...loggedInProviders.value]
  if (!providersForSummary.find((p) => p.id === providerId)) {
    providersForSummary.push(selectedProvider)
  }

  const success = await summaryService.executeSummary(
    {
      summaryProviderId: `summary-${providerId}`,
      originalQuery
    },
    providersForSummary
  )

  if (success) {
    ElMessage.success(`已创建 ${selectedProvider.name} (总结) 选项卡，请在侧边栏中查看`)
  }
}

/**
 * 处理总结模型切换
 * @param providerId 新的模型ID
 */
const handleSummaryModelChange = (providerId: string): void => {
  selectedSummaryProviderId.value = providerId
  const selectedProvider = chatStore.providers.find((p) => p.id === providerId)
  if (selectedProvider) {
    selectedSummaryProvider.value = selectedProvider
  }
}

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

  return {
    display: 'grid',
    gridTemplateColumns: `repeat(${columns}, 1fr)`,
    gap: `${gap}px`,
    padding: `${gap}px`,
    alignItems: 'start' // 让卡片顶部对齐
  }
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
  const defaultProvider = chatStore.providers.find((p) => p.id === 'deepseek')
  if (defaultProvider) {
    selectedSummaryProvider.value = defaultProvider
    sidebarVisible.value = true
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
  height: 100vh;
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
}

.input-section {
  flex-shrink: 0;
}

.cards-grid {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0; /* 允许flex子项收缩 */
  max-height: calc(100vh - 120px); /* 确保有足够的高度用于滚动 */
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
