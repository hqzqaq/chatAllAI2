<template>
  <div class="app-layout" :class="{ 'dark-mode': isDarkMode }">
    <!-- 顶部导航栏 -->
    <AppHeader />

    <!-- 主内容区域 -->
    <main class="main-content">
      <router-view />
    </main>

    <!-- 底部状态栏 -->
    <AppFooter />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAppStore } from '../../stores'
import AppHeader from './AppHeader.vue'
import AppFooter from './AppFooter.vue'

const appStore = useAppStore()

// 计算属性
const isDarkMode = computed(() => appStore.isDarkMode)
</script>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: var(--el-bg-color);
  color: var(--el-text-color-primary);
  transition:
    background-color 0.3s ease,
    color 0.3s ease;
}

.main-content {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.dark-mode {
  --el-bg-color: #1a1a1a;
  --el-text-color-primary: #e5e5e5;
  --el-border-color: #333;
}
</style>
