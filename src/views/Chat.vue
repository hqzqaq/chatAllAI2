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
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useChatStore, useLayoutStore } from '../stores'
import UnifiedInput from '../components/chat/UnifiedInput.vue'
import AICard from '../components/chat/AICard.vue'

const chatStore = useChatStore()
const layoutStore = useLayoutStore()

// 计算属性
const providers = computed(() => chatStore.providers)

const visibleProviders = computed(() => {
  const enabledProviders = providers.value.filter((provider) => {
    const config = getCardConfig(provider.id)
    // 只有当模型被选中且可见时才显示卡片
    return provider.isEnabled && config?.isVisible !== false
  })

  // 根据网格设置限制显示的provider数量
  const { columns, rows } = layoutStore.gridSettings
  const maxVisibleCount = columns * rows

  return enabledProviders.slice(0, maxVisibleCount)
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

// 生命周期
onMounted(() => {
  // 初始化聊天数据
  chatStore.initializeConversations()

  // 立即更新窗口大小，确保初始布局计算正确
  layoutStore.updateWindowSize(window.innerWidth, window.innerHeight)

  // 立即加载布局配置，不要等待
  const initializeLayout = () => {
    console.log('开始初始化布局...')
    const providerIds = providers.value.map((p) => p.id)
    
    // 先加载保存的布局配置
    layoutStore.loadLayoutConfig()
    console.log('布局配置加载完成，当前网格设置:', layoutStore.gridSettings)
    
    // 检查是否所有provider都有卡片配置，如果没有则初始化
    const missingProviders = providerIds.filter(id => !layoutStore.getCardConfig(id))
    if (missingProviders.length > 0) {
      console.log('初始化缺失的卡片配置:', missingProviders)
      layoutStore.initializeCardConfigs(missingProviders)
    }

    // 重新计算布局，确保所有卡片正确显示
    layoutStore.recalculateLayout()
    console.log('布局重新计算完成')
  }

  // 立即执行布局初始化
  initializeLayout()

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
