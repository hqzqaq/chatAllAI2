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

const visibleProviders = computed(() => {
  const enabledProviders = providers.value.filter(provider => {
    const config = getCardConfig(provider.id)
    // 只有当模型被选中且可见时才显示卡片
    return provider.isEnabled && config?.isVisible !== false
  })

  // 移除行数限制，显示所有启用的provider
  return enabledProviders
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

  // 立即更新窗口大小，确保初始布局计算正确
  layoutStore.updateWindowSize(window.innerWidth, window.innerHeight)

  // 立即加载布局配置，不要等待
  const initializeLayout = () => {
    console.log('开始初始化布局...')
    const providerIds = providers.value.map(p => p.id)

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
