<template>
  <div class="chat-view">
    <div class="chat-container">
      <!-- 统一输入区域 -->
      <div class="input-section">
        <UnifiedInput />
      </div>
      
      <!-- AI卡片网格 -->
      <div class="cards-grid" :style="gridStyle">
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

const visibleProviders = computed(() => 
  providers.value.filter(provider => {
    const config = getCardConfig(provider.id)
    return config?.isVisible !== false
  })
)

const gridStyle = computed(() => {
  const columns = layoutStore.gridSettings.columns
  const gap = layoutStore.gridSettings.gap
  
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
const getCardConfig = (providerId: string) => {
  return layoutStore.getCardConfig(providerId)
}

// 响应式布局处理
const handleResize = () => {
  layoutStore.updateWindowSize(window.innerWidth, window.innerHeight)
}

// 生命周期
onMounted(() => {
  // 初始化聊天数据
  chatStore.initializeConversations()
  
  // 初始化布局配置
  const providerIds = providers.value.map(p => p.id)
  layoutStore.initializeCardConfigs(providerIds)
  layoutStore.loadLayoutConfig()
  
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
  height: 100%;
  display: flex;
  flex-direction: column;
}

.chat-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px;
  gap: 16px;
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