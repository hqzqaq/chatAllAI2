import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { UserPreferences } from '../types'
import { usePersistentRef } from '../composables/usePersistentRef'

const defaultUserPreferences: UserPreferences = {
  theme: 'auto',
  language: 'zh-CN',
  autoSave: true,
  notifications: true,
  shortcuts: {}
}

export const useAppStore = defineStore('app', () => {
  const appVersion = ref<string>('')

  const isInitialized = ref<boolean>(false)

  const {
    data: userPreferences,
    save: saveUserPreferences,
    load: loadUserPreferences
  } = usePersistentRef<UserPreferences>(
    'userPreferences',
    defaultUserPreferences
  )

  const isDarkMode = computed(() => {
    if (userPreferences.value.theme === 'auto') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return userPreferences.value.theme === 'dark'
  })

  const initializeApp = async(): Promise<void> => {
    try {
      if (window.electronAPI) {
        appVersion.value = await window.electronAPI.getAppVersion()
      }

      loadUserPreferences()

      isInitialized.value = true
    } catch (error) {
      console.error('Failed to initialize app:', error)
    }
  }

  const updateTheme = (theme: 'light' | 'dark' | 'auto'): void => {
    userPreferences.value.theme = theme
  }

  return {
    appVersion,
    isInitialized,
    userPreferences,
    isDarkMode,
    initializeApp,
    loadUserPreferences,
    saveUserPreferences,
    updateTheme
  }
})
