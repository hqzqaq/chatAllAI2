import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ScriptType, ProviderScriptConfig, ScriptConfigExport } from '../types'
import { STORAGE_KEY_CUSTOM_SCRIPTS } from '../types'

export const useScriptConfigStore = defineStore('scriptConfig', () => {
  const customScripts = ref<Record<string, ProviderScriptConfig>>({})

  const loadFromStorage = (): void => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CUSTOM_SCRIPTS)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed && typeof parsed === 'object') {
          customScripts.value = parsed
        }
      }
    } catch (error) {
      console.error('Failed to load custom scripts from storage:', error)
    }
  }

  const saveToStorage = (): void => {
    try {
      localStorage.setItem(
        STORAGE_KEY_CUSTOM_SCRIPTS,
        JSON.stringify(customScripts.value)
      )
    } catch (error) {
      console.error('Failed to save custom scripts to storage:', error)
    }
  }

  const getCustomScript = (
    providerId: string,
    scriptType: ScriptType
  ): string | null => {
    const providerConfig = customScripts.value[providerId]
    if (!providerConfig) return null
    const script = providerConfig.scripts[scriptType]
    if (!script || script.trim() === '') return null
    return script
  }

  const saveCustomScript = (
    providerId: string,
    scriptType: ScriptType,
    content: string
  ): void => {
    if (!customScripts.value[providerId]) {
      customScripts.value[providerId] = {
        providerId,
        scripts: {}
      }
    }
    customScripts.value[providerId].scripts[scriptType] = content
    saveToStorage()
  }

  const resetCustomScript = (
    providerId: string,
    scriptType: ScriptType
  ): void => {
    const providerConfig = customScripts.value[providerId]
    if (providerConfig && providerConfig.scripts[scriptType] !== undefined) {
      delete providerConfig.scripts[scriptType]
      if (Object.keys(providerConfig.scripts).length === 0) {
        delete customScripts.value[providerId]
      }
      saveToStorage()
    }
  }

  const resetAllCustomScripts = (): void => {
    customScripts.value = {}
    saveToStorage()
  }

  const isCustomized = (pid: string, st: ScriptType): boolean => getCustomScript(pid, st) !== null // eslint-disable-line max-len

  const exportConfig = (): ScriptConfigExport => ({
    version: '1.0',
    exportTime: new Date().toISOString(),
    customScripts: JSON.parse(JSON.stringify(customScripts.value))
  })

  const importConfig = (json: ScriptConfigExport): boolean => {
    try {
      if (!json || !json.customScripts || typeof json.customScripts !== 'object') {
        return false
      }
      customScripts.value = { ...customScripts.value, ...json.customScripts }
      saveToStorage()
      return true
    } catch (error) {
      console.error('Failed to import script config:', error)
      return false
    }
  }

  loadFromStorage()

  return {
    customScripts,
    getCustomScript,
    saveCustomScript,
    resetCustomScript,
    resetAllCustomScripts,
    isCustomized,
    exportConfig,
    importConfig
  }
})
