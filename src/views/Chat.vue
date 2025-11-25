<template>
  <div class="chat-view">
    <div class="chat-container">
      <!-- 统一输入区域 -->
      <div class="input-section">
        <UnifiedInput />
      </div>

      <!-- AI卡片网格 -->
      <div
        class="cards-grid"
        :style="gridStyle"
      >
        <AICard
          v-for="provider in visibleProviders"
          :key="provider.id"
          :provider="provider"
          :config="getCardConfig(provider.id)"
          class="card-item"
          @doubao-sse-event="handleDoubaoSSEEvent"
          ref="providerCardRefs"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useChatStore, useLayoutStore } from '../stores'
import UnifiedInput from '../components/chat/UnifiedInput.vue'
import AICard from '../components/chat/AICard.vue'

const chatStore = useChatStore()
const layoutStore = useLayoutStore()

// 计算属性
const providers = computed(() => chatStore.providers)

const visibleProviders = computed(() => providers.value.filter((provider) => {
  const config = getCardConfig(provider.id)
  // 只有当模型被选中且可见时才显示卡片
  return provider.isEnabled && config?.isVisible !== false
}))

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

// 处理豆包SSE事件
const handleDoubaoSSEEvent = (event: any) => {
  // 发送豆包SSE事件到全局事件总线
  if (window.electronAPI) {
    // 使用electronAPI发送事件到所有监听器
    console.log('[Chat] 转发豆包SSE事件:', event)
    
    // 通过自定义事件将事件传递给UnifiedInput
    window.dispatchEvent(new CustomEvent('doubao-sse-event', { 
      detail: event 
    }))
  }
}

// 获取可见的豆包提供商
const doubaoProvider = computed(() => {
  return providers.value.find(provider => provider.id === 'doubao' && provider.isEnabled)
})

// 豆包WebView组件引用
const doubaoWebViewRef = ref<any>(null)

// 响应式布局处理
const handleResize = () => {
  layoutStore.updateWindowSize(window.innerWidth, window.innerHeight)
}

// 提供商卡片引用
const providerCardRefs = ref<any[]>([])

// 获取豆包提供商卡片
const getDoubaoCard = () => {
  return providerCardRefs.value.find(ref => {
    return ref?.provider?.id === 'doubao' && ref?.provider?.isEnabled
  })
}

// 监听豆包WebView的SSE事件
const setupDoubaoSSEListener = () => {
  const doubaoCard = getDoubaoCard()
  if (doubaoCard?.webViewRef?.value?.onSSEEvent) {
    // 直接监听豆包WebView的SSE事件
    doubaoCard.webViewRef.value.onSSEEvent = handleDoubaoSSEEvent
    console.log('[Chat] 已设置豆包WebView SSE事件监听器')
  }
}

// 生命周期
onMounted(() => {
  // 初始化聊天数据
  chatStore.initializeConversations()

  // 立即更新窗口大小，确保初始布局计算正确
  layoutStore.updateWindowSize(window.innerWidth, window.innerHeight)

  // 初始化布局配置 - 先加载保存的配置，再确保所有provider都有配置
  const providerIds = providers.value.map((p) => p.id)
  layoutStore.loadLayoutConfig()
  
  // 检查是否所有provider都有卡片配置，如果没有则初始化
  const missingProviders = providerIds.filter(id => !layoutStore.getCardConfig(id))
  if (missingProviders.length > 0) {
    layoutStore.initializeCardConfigs(missingProviders)
  }

  // 再次重新计算布局，确保所有卡片正确显示
  layoutStore.recalculateLayout()

  // 监听窗口大小变化
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  // 移除窗口大小变化监听器
  window.removeEventListener('resize', handleResize)
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
