<template>
  <header class="app-header">
    <div class="header-left">
      <h1 class="app-title">
        <el-icon class="title-icon">
          <ChatDotRound />
        </el-icon>
        ChatAllAI
      </h1>
    </div>

    <div class="header-center">
      <!-- 左侧空白区域 - 可拖动 -->
      <div class="drag-area left-drag-area"></div>
      
      <!-- 菜单区域 - 不可拖动 -->
      <div class="menu-container">
        <el-menu
          :default-active="activeRoute"
          mode="horizontal"
          :ellipsis="false"
          @select="handleMenuSelect"
        >
          <el-menu-item index="/">
            <el-icon><House /></el-icon>
            <span>首页</span>
          </el-menu-item>
          <el-menu-item index="/chat">
            <el-icon><ChatDotRound /></el-icon>
            <span>对话</span>
          </el-menu-item>
          <el-menu-item index="/settings">
            <el-icon><Setting /></el-icon>
            <span>设置</span>
          </el-menu-item>
        </el-menu>
      </div>
      
      <!-- 右侧空白区域 - 可拖动 -->
      <div class="drag-area right-drag-area"></div>
    </div>

    <div class="header-right">
      <!-- 登录状态指示器 -->
      <div class="login-status">
        <el-badge
          :value="loggedInCount"
          :max="99"
          class="status-badge"
        >
          <el-icon
            class="status-icon"
            :class="{ 'online': loggedInCount > 0 }"
          >
            <Connection />
          </el-icon>
        </el-badge>
        <span class="status-text">{{ loggedInCount }}/{{ totalProviders }}</span>
      </div>

      <!-- 主题切换 -->
      <el-button
        :icon="isDarkMode ? Sunny : Moon"
        circle
        class="theme-toggle"
        @click="toggleTheme"
      />

      <!-- 窗口控制按钮 -->
      <div class="window-controls">
        <el-button
          :icon="Minus"
          circle
          size="small"
          @click="minimizeWindow"
        />
        <el-button
          :icon="FullScreen"
          circle
          size="small"
          @click="toggleFullScreen"
        />
        <el-button
          :icon="Close"
          circle
          size="small"
          type="danger"
          @click="closeWindow"
        />
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ChatDotRound,
  House,
  Setting,
  Connection,
  Sunny,
  Moon,
  Minus,
  Close,
  FullScreen
} from '@element-plus/icons-vue'
import { useAppStore, useChatStore } from '../../stores'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const chatStore = useChatStore()

// 计算属性
const activeRoute = computed(() => route.path)
const isDarkMode = computed(() => appStore.isDarkMode)
const loggedInCount = computed(() => chatStore.loggedInCount)
const totalProviders = computed(() => chatStore.totalProviders)

/**
 * 处理菜单选择
 */
const handleMenuSelect = (index: string): void => {
  router.push(index)
}

/**
 * 切换主题
 */
const toggleTheme = (): void => {
  const currentTheme = appStore.userPreferences.theme
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark'
  appStore.updateTheme(newTheme)
}

/**
 * 最小化窗口
 */
const minimizeWindow = (): void => {
  if (window.electronAPI) {
    window.electronAPI.minimizeWindow()
  }
}

/**
 * 关闭窗口
 */
const closeWindow = (): void => {
  if (window.electronAPI) {
    window.electronAPI.closeWindow()
  }
}

/**
 * 切换全屏状态
 */
const toggleFullScreen = (): void => {
  if (window.electronAPI) {
    window.electronAPI.toggleFullScreen()
  }
}
</script>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 60px;
  padding: 0 20px;
  background-color: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color);
}

.header-center {
  display: flex;
  align-items: center;
  flex: 1;
  justify-content: center;
  height: 100%;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
  -webkit-app-region: no-drag; /* 右侧区域禁止拖动，允许点击 */
}

.header-left {
  display: flex;
  align-items: center;
  -webkit-app-region: no-drag; /* 左侧区域禁止拖动，允许点击 */
}

/* 拖动区域样式 */
.drag-area {
  flex: 1;
  height: 100%;
  -webkit-app-region: drag; /* 允许拖动窗口 */
}

.left-drag-area {
  margin-right: auto;
}

.right-drag-area {
  margin-left: auto;
}

/* 菜单容器样式 */
.menu-container {
  -webkit-app-region: no-drag; /* 菜单区域禁止拖动 */
}

.app-title {
  display: flex;
  align-items: center;
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--el-color-primary);
}

.title-icon {
  margin-right: 8px;
  font-size: 24px;
}

.header-center {
  flex: 1;
  justify-content: center;
}

.header-right {
  gap: 12px;
}

.login-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-icon {
  font-size: 18px;
  color: var(--el-color-info);
  transition: color 0.3s ease;
}

.status-icon.online {
  color: var(--el-color-success);
}

.status-text {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.theme-toggle {
  margin-left: 8px;
}

.window-controls {
  display: flex;
  gap: 4px;
  margin-left: 12px;
}

/* 菜单样式覆盖 */
:deep(.el-menu--horizontal) {
  border-bottom: none;
}

:deep(.el-menu-item) {
  border-bottom: 2px solid transparent !important;
}

:deep(.el-menu-item.is-active) {
  border-bottom-color: var(--el-color-primary) !important;
}
</style>
