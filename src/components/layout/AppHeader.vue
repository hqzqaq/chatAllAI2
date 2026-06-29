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
      <div class="drag-area left-drag-area" />

      <!-- 菜单区域 - 不可拖动 -->
      <div class="menu-container">
        <el-menu
          :default-active="activeRoute"
          mode="horizontal"
          :ellipsis="false"
          @select="handleMenuSelect"
        >
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
      <div class="drag-area right-drag-area" />
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
            :class="{ online: loggedInCount > 0 }"
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
  height: 52px;
  padding: 0 16px;
  background-color: rgba(255, 255, 255, 0.72);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  border-bottom: 1px solid var(--apple-separator);
  transition: background-color var(--apple-transition);
}

.dark-mode .app-header,
.dark-mode & .app-header {
  background-color: rgba(30, 30, 32, 0.78);
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
  gap: 10px;
  -webkit-app-region: no-drag;
}

.header-left {
  display: flex;
  align-items: center;
  -webkit-app-region: no-drag;
}

/* 拖动区域 */
.drag-area {
  flex: 1;
  height: 100%;
  -webkit-app-region: drag;
}

.left-drag-area {
  margin-right: auto;
}

.right-drag-area {
  margin-left: auto;
}

/* 菜单容器 */
.menu-container {
  -webkit-app-region: no-drag;
}

/* 标题 — SF Pro Display 风格 */
.app-title {
  display: flex;
  align-items: center;
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: var(--apple-text-primary);
  letter-spacing: -0.2px;
}

.title-icon {
  margin-right: 6px;
  font-size: 20px;
  color: var(--apple-brand);
}

.login-status {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-icon {
  font-size: 16px;
  color: var(--apple-text-tertiary);
  transition: color var(--apple-transition-fast);
}

.status-icon.online {
  color: var(--apple-success);
}

.status-text {
  font-size: 12px;
  font-weight: 500;
  color: var(--apple-text-secondary);
}

.theme-toggle {
  margin-left: 4px;
}

.window-controls {
  display: flex;
  gap: 4px;
  margin-left: 8px;
}

/* 苹果风格菜单 — 去掉下划线，使用胶囊式活跃指示 */
:deep(.el-menu--horizontal) {
  border-bottom: none;
  background: transparent;
  height: 32px;
}

:deep(.el-menu-item) {
  border-bottom: none !important;
  height: 32px;
  line-height: 32px;
  font-size: 13px;
  font-weight: 500;
  color: var(--apple-text-secondary);
  border-radius: var(--apple-radius-sm);
  padding: 0 12px;
  transition: all var(--apple-transition-fast);
}

:deep(.el-menu-item:hover) {
  background-color: var(--apple-bg-secondary);
  color: var(--apple-text-primary);
}

:deep(.el-menu-item.is-active) {
  background-color: rgba(10, 132, 255, 0.1);
  color: #0a84ff !important;
  font-weight: 600;
}
</style>
