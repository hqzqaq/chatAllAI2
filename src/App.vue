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
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  height: 100vh;
  margin: 0;
  padding: 0;
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

/* Element Plus 主题变量覆盖 */
:root {
  --el-color-primary: #409EFF;
  --el-color-primary-light-3: #79bbff;
  --el-color-primary-light-5: #a0cfff;
  --el-color-primary-light-7: #c6e2ff;
  --el-color-primary-light-8: #d9ecff;
  --el-color-primary-light-9: #ecf5ff;
  --el-color-primary-dark-2: #337ecc;
  --el-border-radius-base: 6px;
  --el-border-radius-small: 4px;
}

/* 深色模式主题变量 */
.dark-mode {
  --el-bg-color: #1a1a1a;
  --el-bg-color-page: #0a0a0a;
  --el-bg-color-overlay: #1d1e1f;
  --el-text-color-primary: #e5e5e5;
  --el-text-color-regular: #cfcfcf;
  --el-text-color-secondary: #a3a6ad;
  --el-text-color-placeholder: #8d9095;
  --el-text-color-disabled: #6c6e72;
  --el-border-color: #4c4d4f;
  --el-border-color-light: #414243;
  --el-border-color-lighter: #363637;
  --el-border-color-extra-light: #2b2b2c;
  --el-border-color-dark: #58585b;
  --el-border-color-darker: #636466;
  --el-fill-color: #303133;
  --el-fill-color-light: #262727;
  --el-fill-color-lighter: #1d1d1d;
  --el-fill-color-extra-light: #191919;
  --el-fill-color-dark: #39393a;
  --el-fill-color-darker: #424243;
  --el-fill-color-blank: transparent;
  --el-box-shadow: 0px 12px 32px 4px rgba(0, 0, 0, 0.36), 0px 8px 20px rgba(0, 0, 0, 0.72);
  --el-box-shadow-light: 0px 0px 12px rgba(0, 0, 0, 0.72);
  --el-box-shadow-lighter: 0px 0px 6px rgba(0, 0, 0, 0.72);
  --el-box-shadow-dark: 0px 16px 48px 16px rgba(0, 0, 0, 0.72), 0px 12px 32px rgba(0, 0, 0, 0.72), 0px 8px 16px -8px rgba(0, 0, 0, 0.72);
}

/* 自定义滚动条 */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: var(--el-fill-color-lighter);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: var(--el-border-color-dark);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--el-border-color-darker);
}

/* 动画效果 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease;
}

.slide-enter-from {
  transform: translateX(-100%);
}

.slide-leave-to {
  transform: translateX(100%);
}
</style>
