<template>
  <div id="app">
    <AppLayout>
      <router-view />
    </AppLayout>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import AppLayout from './components/layout/AppLayout.vue'
import { useAppStore, useLayoutStore } from './stores'

const appStore = useAppStore()
const layoutStore = useLayoutStore()

// 应用初始化
onMounted(async() => {
  await appStore.initializeApp()
  // 加载布局配置，确保列数等设置在应用启动时被正确恢复
  layoutStore.loadLayoutConfig()
})
</script>

<style>
/* ========== Apple Design System — 全局主题令牌 ========== */

#app {
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text',
    'Helvetica Neue', 'PingFang SC', 'Noto Sans CJK SC', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  height: 100vh;
  margin: 0;
  padding: 0;
  color: #1d1d1f;
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  height: 100%;
}

/* 苹果设计系统 — 亮色主题令牌 */
:root {
  /* 品牌色 (Apple Blue) */
  --apple-brand: #007aff;
  --apple-brand-hover: #0064d6;
  --apple-brand-light: #e8f2ff;
  --apple-brand-50: #e8f2ff;
  --apple-brand-100: #cfe5ff;
  --apple-brand-200: #9fcbff;
  --apple-brand-300: #66abff;
  --apple-brand-400: #2e8dff;
  --apple-brand-500: #007aff;
  --apple-brand-600: #0064d6;
  --apple-brand-700: #004fad;
  --apple-brand-800: #003b82;

  /* 背景色 */
  --apple-bg-primary: #ffffff;
  --apple-bg-secondary: #f2f2f7;
  --apple-bg-tertiary: #f7f7fa;
  --apple-bg-elevated: #ffffff;
  --apple-bg-grouped: #f2f2f7;

  /* 文字色 */
  --apple-text-primary: #1d1d1f;
  --apple-text-secondary: #6e6e73;
  --apple-text-tertiary: #8e8e93;
  --apple-text-placeholder: #aeaeb2;
  --apple-text-disabled: #c7c7cc;

  /* 边框色 */
  --apple-border: #e5e5ea;
  --apple-border-light: #f2f2f7;
  --apple-border-dark: #d1d1d6;
  --apple-separator: rgba(60, 60, 67, 0.12);

  /* 状态色 */
  --apple-success: #34c759;
  --apple-success-bg: #e9f9ee;
  --apple-warning: #ff9f0a;
  --apple-warning-bg: #fff6e5;
  --apple-error: #ff3b30;
  --apple-error-bg: #ffecea;
  --apple-info: #5ac8fa;

  /* 圆角 */
  --apple-radius-sm: 8px;
  --apple-radius-md: 12px;
  --apple-radius-lg: 16px;
  --apple-radius-xl: 20px;

  /* 阴影 — 苹果风格克制阴影 */
  --apple-shadow-card: 0 1px 2px rgba(0, 0, 0, 0.05), 0 1px 3px -1px rgba(0, 0, 0, 0.05);
  --apple-shadow-raised: 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 1px 2px -1px rgba(0, 0, 0, 0.05);
  --apple-shadow-hover: 0 4px 8px -2px rgba(0, 0, 0, 0.06), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
  --apple-shadow-float: 0 8px 24px -8px rgba(0, 0, 0, 0.08), 0 4px 8px -4px rgba(0, 0, 0, 0.05);
  --apple-shadow-modal: 0 16px 40px -10px rgba(0, 0, 0, 0.1), 0 8px 16px -8px rgba(0, 0, 0, 0.06);
  --apple-shadow-maximized: 0 24px 64px -12px rgba(0, 0, 0, 0.12);

  /* 过渡 */
  --apple-transition: 0.25s cubic-bezier(0.25, 0.1, 0.25, 1);
  --apple-transition-fast: 0.15s cubic-bezier(0.25, 0.1, 0.25, 1);
  --apple-transition-spring: 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);

  /* Element Plus 变量映射到苹果令牌 */
  --el-color-primary: var(--apple-brand);
  --el-color-primary-light-3: var(--apple-brand-300);
  --el-color-primary-light-5: var(--apple-brand-200);
  --el-color-primary-light-7: var(--apple-brand-100);
  --el-color-primary-light-8: var(--apple-brand-50);
  --el-color-primary-light-9: #f0f6ff;
  --el-color-primary-dark-2: var(--apple-brand-700);
  --el-color-success: var(--apple-success);
  --el-color-warning: var(--apple-warning);
  --el-color-danger: var(--apple-error);
  --el-color-info: var(--apple-info);
  --el-border-radius-base: var(--apple-radius-sm);
  --el-border-radius-small: 6px;

  /* Element Plus 功能变量映射 */
  --el-bg-color: var(--apple-bg-primary);
  --el-bg-color-page: var(--apple-bg-secondary);
  --el-bg-color-overlay: var(--apple-bg-elevated);
  --el-text-color-primary: var(--apple-text-primary);
  --el-text-color-regular: var(--apple-text-primary);
  --el-text-color-secondary: var(--apple-text-secondary);
  --el-text-color-placeholder: var(--apple-text-placeholder);
  --el-border-color: var(--apple-border);
  --el-border-color-light: var(--apple-border-light);
  --el-border-color-lighter: var(--apple-separator);
  --el-border-color-dark: var(--apple-border-dark);
  --el-fill-color: var(--apple-bg-secondary);
  --el-fill-color-light: var(--apple-bg-tertiary);
  --el-fill-color-lighter: var(--apple-bg-grouped);
  --el-fill-color-extra-light: #fafafa;
  --el-fill-color-blank: var(--apple-bg-primary);
  --el-box-shadow: var(--apple-shadow-card);
  --el-box-shadow-light: var(--apple-shadow-raised);
  --el-box-shadow-lighter: 0 0 0 1px var(--apple-separator);
  --el-box-shadow-dark: var(--apple-shadow-hover);
}

/* 苹果设计系统 — 深色模式令牌 (柔和暖灰调) */
.dark-mode {
  /* 背景 — 升温提亮，避免纯黑 */
  --apple-bg-primary: #1e1e20;
  --apple-bg-secondary: #252528;
  --apple-bg-tertiary: #2e2e31;
  --apple-bg-elevated: #2a2a2d;
  --apple-bg-grouped: #1a1a1d;

  /* 文字 — 主色降亮、次色提亮，压缩对比度 */
  --apple-text-primary: #e8e8ed;
  --apple-text-secondary: #98989f;
  --apple-text-tertiary: #78787f;
  --apple-text-placeholder: #5e5e65;
  --apple-text-disabled: #48484e;

  /* 边框 — 柔和半透明，去除硬线条感 */
  --apple-border: rgba(255, 255, 255, 0.08);
  --apple-border-light: rgba(255, 255, 255, 0.05);
  --apple-border-dark: rgba(255, 255, 255, 0.12);
  --apple-separator: rgba(255, 255, 255, 0.06);

  --apple-success-bg: rgba(52, 199, 89, 0.12);
  --apple-warning-bg: rgba(255, 159, 10, 0.12);
  --apple-error-bg: rgba(255, 59, 48, 0.12);

  /* 阴影 — 混入微量暖色，降低纯黑浓度 */
  --apple-shadow-card: 0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06);
  --apple-shadow-raised: 0 2px 6px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
  --apple-shadow-hover: 0 4px 12px rgba(0, 0, 0, 0.14), 0 2px 6px rgba(0, 0, 0, 0.08);
  --apple-shadow-float: 0 12px 32px rgba(0, 0, 0, 0.2), 0 4px 12px rgba(0, 0, 0, 0.12);
  --apple-shadow-modal: 0 24px 48px rgba(0, 0, 0, 0.3), 0 8px 24px rgba(0, 0, 0, 0.2);
  --apple-shadow-maximized: 0 32px 80px rgba(0, 0, 0, 0.35);

  /* Element Plus 深色模式映射 */
  --el-bg-color: var(--apple-bg-primary);
  --el-bg-color-page: var(--apple-bg-grouped);
  --el-bg-color-overlay: var(--apple-bg-elevated);
  --el-text-color-primary: var(--apple-text-primary);
  --el-text-color-regular: var(--apple-text-primary);
  --el-text-color-secondary: var(--apple-text-secondary);
  --el-text-color-placeholder: var(--apple-text-placeholder);
  --el-text-color-disabled: var(--apple-text-disabled);
  --el-border-color: var(--apple-border);
  --el-border-color-light: var(--apple-border-light);
  --el-border-color-lighter: var(--apple-separator);
  --el-border-color-extra-light: rgba(255, 255, 255, 0.04);
  --el-border-color-dark: var(--apple-border-dark);
  --el-border-color-darker: rgba(255, 255, 255, 0.18);
  --el-fill-color: var(--apple-bg-secondary);
  --el-fill-color-light: var(--apple-bg-tertiary);
  --el-fill-color-lighter: var(--apple-bg-primary);
  --el-fill-color-extra-light: #1a1a1d;
  --el-fill-color-dark: var(--apple-bg-tertiary);
  --el-fill-color-darker: #3a3a3e;
  --el-fill-color-blank: transparent;
  --el-box-shadow: var(--apple-shadow-card);
  --el-box-shadow-light: var(--apple-shadow-raised);
  --el-box-shadow-lighter: 0 0 0 1px var(--apple-separator);
  --el-box-shadow-dark: var(--apple-shadow-hover);
}

/* 苹果风格自定义滚动条 — 细窄、半透明 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

.dark-mode ::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.35);
}

.dark-mode ::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.35);
}

/* 苹果风格动画 — 更细腻的过渡 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--apple-transition-fast);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-enter-active,
.slide-leave-active {
  transition: transform var(--apple-transition);
}

.slide-enter-from {
  transform: translateX(-100%);
}

.slide-leave-to {
  transform: translateX(100%);
}

/* 苹果风格 — Element Plus 按钮优化 */
.el-button--primary {
  background: rgba(10, 132, 255, 0.12);
  border-color: rgba(10, 132, 255, 0.3);
  color: #0a84ff;
  font-weight: 600;
  box-shadow: 0 0 0 1px rgba(10, 132, 255, 0.06);
  transition: all var(--apple-transition-fast);
}

.el-button--primary:hover {
  background: rgba(10, 132, 255, 0.18);
  border-color: rgba(10, 132, 255, 0.45);
  color: #0a84ff;
}

.el-button--primary:active {
  background: rgba(10, 132, 255, 0.22);
  border-color: rgba(10, 132, 255, 0.5);
}

.el-button--primary.is-disabled {
  background: rgba(10, 132, 255, 0.06);
  border-color: rgba(10, 132, 255, 0.15);
  color: rgba(10, 132, 255, 0.4);
}

.dark-mode .el-button--primary {
  background: rgba(10, 132, 255, 0.1);
  border-color: rgba(10, 132, 255, 0.25);
  color: #0a84ff;
}

.dark-mode .el-button--primary:hover {
  background: rgba(10, 132, 255, 0.16);
  border-color: rgba(10, 132, 255, 0.35);
}

.el-button--info {
  background: rgba(142, 142, 147, 0.08);
  border-color: rgba(142, 142, 147, 0.25);
  color: var(--apple-text-secondary);
  font-weight: 500;
  transition: all var(--apple-transition-fast);
}

.el-button--info:hover {
  background: rgba(142, 142, 147, 0.14);
  border-color: rgba(142, 142, 147, 0.35);
  color: var(--apple-text-primary);
}

.el-button--info:active {
  background: rgba(142, 142, 147, 0.18);
}

.el-button--info.is-disabled {
  background: rgba(142, 142, 147, 0.04);
  border-color: rgba(142, 142, 147, 0.12);
  color: rgba(142, 142, 147, 0.5);
}
</style>
