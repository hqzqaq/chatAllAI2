<template>
  <footer class="app-footer">
    <div class="footer-left">
      <span class="app-version">v{{ appVersion }}</span>
      <el-divider direction="vertical" />
      <span class="status-text">
        {{ isInitialized ? '就绪' : '初始化中...' }}
      </span>
    </div>

    <div class="footer-center">
      <!-- 消息发送状态 -->
      <div
        v-if="hasSendingMessages"
        class="sending-status"
      >
        <el-icon class="loading-icon">
          <Loading />
        </el-icon>
        <span>正在发送消息...</span>
      </div>
    </div>

    <div class="footer-right">
      <!-- 内存使用情况 -->
      <div class="memory-usage">
        <el-icon><Monitor /></el-icon>
        <span>内存: {{ memoryUsage }}MB</span>
      </div>

      <!-- 网络状态 -->
      <div
        class="network-status"
        :class="{ 'online': isOnline }"
      >
        <el-icon>
          <component :is="isOnline ? 'Connection' : 'Disconnect'" />
        </el-icon>
        <span>{{ isOnline ? '在线' : '离线' }}</span>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import {
  computed, ref, onMounted, onUnmounted
} from 'vue'
import {
  Loading, Monitor, Connection, Disconnect
} from '@element-plus/icons-vue'
import { useAppStore, useChatStore } from '../../stores'

const appStore = useAppStore()
const chatStore = useChatStore()

// 响应式数据
const memoryUsage = ref<number>(0)
const isOnline = ref<boolean>(navigator.onLine)

// 计算属性
const appVersion = computed(() => appStore.appVersion)
const isInitialized = computed(() => appStore.isInitialized)

const hasSendingMessages = computed(() => Object.values(chatStore.sendingStatus).some((status) => status === 'sending'))

/**
 * 更新内存使用情况
 */
const updateMemoryUsage = (): void => {
  if ('memory' in performance) {
    const { memory } = (performance as any)
    memoryUsage.value = Math.round(memory.usedJSHeapSize / 1024 / 1024)
  }
}

/**
 * 处理网络状态变化
 */
const handleOnline = (): void => {
  isOnline.value = true
}

const handleOffline = (): void => {
  isOnline.value = false
}

// 生命周期
onMounted(() => {
  // 定期更新内存使用情况
  const memoryInterval = setInterval(updateMemoryUsage, 5000)
  updateMemoryUsage()

  // 监听网络状态变化
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  // 清理函数
  onUnmounted(() => {
    clearInterval(memoryInterval)
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  })
})
</script>

<style scoped>
.app-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 32px;
  padding: 0 20px;
  background-color: var(--el-bg-color-page);
  border-top: 1px solid var(--el-border-color);
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.footer-left,
.footer-center,
.footer-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.footer-center {
  flex: 1;
  justify-content: center;
}

.app-version {
  font-weight: 500;
}

.status-text {
  color: var(--el-text-color-regular);
}

.sending-status {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--el-color-primary);
}

.loading-icon {
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.memory-usage,
.network-status {
  display: flex;
  align-items: center;
  gap: 4px;
}

.network-status.online {
  color: var(--el-color-success);
}

.network-status:not(.online) {
  color: var(--el-color-danger);
}
</style>
