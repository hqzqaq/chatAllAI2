import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { UserPreferences, LayoutConfig } from '../types'

/**
 * 应用主状态管理
 */
export const useAppStore = defineStore('app', () => {
  // 应用版本
  const appVersion = ref<string>('')

  // 应用初始化状态
  const isInitialized = ref<boolean>(false)

  // 用户偏好设置
  const userPreferences = ref<UserPreferences>({
    theme: 'auto',
    language: 'zh-CN',
    autoSave: true,
    notifications: true,
    shortcuts: {}
  })

  // 布局配置
  const layoutConfig = ref<LayoutConfig>({
    cardPositions: [],
    cardSizes: [],
    gridLayout: {
      columns: 3,
      rows: 2,
      gap: 16
    },
    theme: {
      primaryColor: '#409EFF',
      backgroundColor: '#f5f5f5'
    }
  })

  // 计算属性
  const isDarkMode = computed(() => {
    if (userPreferences.value.theme === 'auto') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return userPreferences.value.theme === 'dark'
  })

  /**
   * 初始化应用
   */
  const initializeApp = async (): Promise<void> => {
    try {
      // 获取应用版本
      if (window.electronAPI) {
        appVersion.value = await window.electronAPI.getAppVersion()
      }

      // 加载用户配置
      await loadUserPreferences()

      isInitialized.value = true
    } catch (error) {
      console.error('Failed to initialize app:', error)
    }
  }

  /**
   * 加载用户偏好设置
   */
  const loadUserPreferences = async (): Promise<void> => {
    try {
      const saved = localStorage.getItem('userPreferences')
      if (saved) {
        userPreferences.value = { ...userPreferences.value, ...JSON.parse(saved) }
      }
    } catch (error) {
      console.error('Failed to load user preferences:', error)
    }
  }

  /**
   * 保存用户偏好设置
   */
  const saveUserPreferences = async (): Promise<void> => {
    try {
      localStorage.setItem('userPreferences', JSON.stringify(userPreferences.value))
    } catch (error) {
      console.error('Failed to save user preferences:', error)
    }
  }

  /**
   * 加载布局配置
   */
  const loadLayoutConfig = async (): Promise<void> => {
    try {
      const saved = localStorage.getItem('layoutConfig')
      if (saved) {
        layoutConfig.value = { ...layoutConfig.value, ...JSON.parse(saved) }
      }
    } catch (error) {
      console.error('Failed to load layout config:', error)
    }
  }

  /**
   * 保存布局配置
   */
  const saveLayoutConfig = async (): Promise<void> => {
    try {
      localStorage.setItem('layoutConfig', JSON.stringify(layoutConfig.value))
    } catch (error) {
      console.error('Failed to save layout config:', error)
    }
  }

  /**
   * 更新主题
   */
  const updateTheme = (theme: 'light' | 'dark' | 'auto'): void => {
    userPreferences.value.theme = theme
    saveUserPreferences()
  }

  return {
    appVersion,
    isInitialized,
    userPreferences,
    layoutConfig,
    isDarkMode,
    initializeApp,
    loadUserPreferences,
    saveUserPreferences,
    loadLayoutConfig,
    saveLayoutConfig,
    updateTheme
  }
})
