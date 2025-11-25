<template>
  <div class="settings-view">
    <div class="settings-container">
      <el-card class="settings-card">
        <template #header>
          <div class="card-header">
            <el-icon><Setting /></el-icon>
            <span>应用设置</span>
          </div>
        </template>

        <el-tabs
          v-model="activeTab"
          class="settings-tabs"
        >
          <!-- 通用设置 -->
          <el-tab-pane
            label="通用"
            name="general"
          >
            <div class="settings-section">
              <h3>外观设置</h3>
              <el-form label-width="120px">
                <el-form-item label="主题模式">
                  <el-radio-group
                    v-model="userPreferences.theme"
                    @change="handleThemeChange"
                  >
                    <el-radio label="light">
                      浅色
                    </el-radio>
                    <el-radio label="dark">
                      深色
                    </el-radio>
                    <el-radio label="auto">
                      跟随系统
                    </el-radio>
                  </el-radio-group>
                </el-form-item>

                <el-form-item label="语言">
                  <el-select
                    v-model="userPreferences.language"
                    @change="handleLanguageChange"
                  >
                    <el-option
                      label="简体中文"
                      value="zh-CN"
                    />
                    <el-option
                      label="English"
                      value="en-US"
                    />
                  </el-select>
                </el-form-item>
              </el-form>
            </div>

            <el-divider />

            <div class="settings-section">
              <h3>功能设置</h3>
              <el-form label-width="120px">
                <el-form-item label="自动保存">
                  <el-switch
                    v-model="userPreferences.autoSave"
                    @change="handleAutoSaveChange"
                  />
                </el-form-item>

                <el-form-item label="桌面通知">
                  <el-switch
                    v-model="userPreferences.notifications"
                    @change="handleNotificationsChange"
                  />
                </el-form-item>
              </el-form>
            </div>
          </el-tab-pane>

          <!-- 会话管理 -->
          <el-tab-pane
            label="会话管理"
            name="sessions"
          >
            <SessionStatus :providers="providers" />
          </el-tab-pane>

          <!-- 布局设置 -->
          <el-tab-pane
            label="布局"
            name="layout"
          >
            <div class="settings-section">
              <h3>网格布局</h3>
              <el-form label-width="120px">
                <el-form-item label="列数">
                  <el-input-number
                    v-model="gridSettings.columns"
                    :min="1"
                    :max="6"
                    @change="handleGridChange"
                  />
                </el-form-item>

                <el-form-item label="间距">
                  <el-input-number
                    v-model="gridSettings.gap"
                    :min="8"
                    :max="32"
                    @change="handleGridChange"
                  />
                </el-form-item>
              </el-form>

              <el-button
                type="primary"
                @click="resetLayout"
              >
                重置布局
              </el-button>
            </div>
          </el-tab-pane>

          <!-- 关于 -->
          <el-tab-pane
            label="关于"
            name="about"
          >
            <div class="settings-section">
              <div class="about-info">
                <div class="app-info">
                  <el-icon class="app-icon">
                    <ChatDotRound />
                  </el-icon>
                  <h2>ChatAllAI</h2>
                  <p>版本 {{ appVersion }}</p>
                  <p>多AI模型对话比较工具</p>
                </div>

                <el-divider />

                <div class="tech-stack">
                  <h3>技术栈</h3>
                  <el-tag
                    v-for="tech in techStack"
                    :key="tech"
                    class="tech-tag"
                  >
                    {{ tech }}
                  </el-tag>
                </div>

                <el-divider />

                <div class="system-info">
                  <h3>系统信息</h3>
                  <p>平台: {{ platform }}</p>
                  <p>Node.js: {{ nodeVersion }}</p>
                  <p>Electron: {{ electronVersion }}</p>
                </div>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Setting, ChatDotRound } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import SessionStatus from '../components/session/SessionStatus.vue'
import { useAppStore, useLayoutStore, useChatStore } from '../stores'

const appStore = useAppStore()
const layoutStore = useLayoutStore()
const chatStore = useChatStore()

// 响应式数据
const activeTab = ref('general')

// 计算属性
const userPreferences = computed(() => appStore.userPreferences)
const gridSettings = computed(() => layoutStore.gridSettings)
const appVersion = computed(() => appStore.appVersion)
const providers = computed(() => chatStore.providers)
console.log(chatStore.providers)
// 静态数据
const techStack = [
  'Electron', 'Vue 3', 'TypeScript', 'Vite',
  'Element Plus', 'Pinia', 'Vue Router'
]

// 系统信息 - 在渲染进程中安全获取
const platform = ref('Unknown')
const nodeVersion = ref('Unknown')
const electronVersion = ref('Unknown')

// 获取系统信息
const getSystemInfo = async() => {
  try {
    if (window.electronAPI && window.electronAPI.getSystemInfo) {
      const systemInfo = await window.electronAPI.getSystemInfo()
      platform.value = systemInfo.platform || 'Unknown'
      nodeVersion.value = systemInfo.nodeVersion || 'Unknown'
      electronVersion.value = systemInfo.electronVersion || 'Unknown'
    } else {
      // 使用默认值或从 userAgent 推断
      platform.value = navigator.platform || 'Unknown'
      nodeVersion.value = 'Unknown'
      electronVersion.value = 'Unknown'
    }
  } catch (error) {
    console.warn('Failed to get system info:', error)
    // 使用默认值
    platform.value = navigator.platform || 'Unknown'
    nodeVersion.value = 'Unknown'
    electronVersion.value = 'Unknown'
  }
}

/**
 * 处理主题变化
 */
const handleThemeChange = (theme: string): void => {
  appStore.updateTheme(theme as 'light' | 'dark' | 'auto')
  ElMessage.success('主题设置已更新')
}

/**
 * 处理语言变化
 */
const handleLanguageChange = (language: string): void => {
  appStore.saveUserPreferences()
  ElMessage.success('语言设置已更新')
}

/**
 * 处理自动保存变化
 */
const handleAutoSaveChange = (value: boolean): void => {
  appStore.saveUserPreferences()
  ElMessage.success(`自动保存已${value ? '开启' : '关闭'}`)
}

/**
 * 处理通知变化
 */
const handleNotificationsChange = (value: boolean): void => {
  appStore.saveUserPreferences()
  ElMessage.success(`桌面通知已${value ? '开启' : '关闭'}`)
}

/**
 * 处理网格设置变化
 */
const handleGridChange = (): void => {
  layoutStore.updateGridSettings(gridSettings.value)
  ElMessage.success('布局设置已更新')
}

/**
 * 重置布局
 */
const resetLayout = (): void => {
  layoutStore.resetLayout()
  ElMessage.success('布局已重置')
}

// 组件挂载时获取系统信息
onMounted(() => {
  getSystemInfo()
})
</script>

<style scoped>
.settings-view {
  height: 100%;
  padding: 20px;
  overflow-y: auto;
}

.settings-container {
  max-width: 800px;
  margin: 0 auto;
}

.settings-card {
  box-shadow: var(--el-box-shadow-light);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
}

.settings-tabs {
  margin-top: 20px;
}

.settings-section {
  margin-bottom: 24px;
}

.settings-section h3 {
  margin: 0 0 16px 0;
  color: var(--el-text-color-primary);
  font-size: 14px;
  font-weight: 600;
}

.about-info {
  text-align: center;
}

.app-info {
  margin-bottom: 24px;
}

.app-icon {
  font-size: 48px;
  color: var(--el-color-primary);
  margin-bottom: 16px;
}

.app-info h2 {
  margin: 8px 0;
  color: var(--el-text-color-primary);
}

.app-info p {
  margin: 4px 0;
  color: var(--el-text-color-secondary);
}

.tech-stack {
  margin-bottom: 24px;
}

.tech-tag {
  margin: 4px;
}

.system-info {
  text-align: left;
}

.system-info p {
  margin: 8px 0;
  color: var(--el-text-color-regular);
}
</style>
