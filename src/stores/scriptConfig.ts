import { defineStore } from 'pinia'
import type { ScriptType, ProviderScriptConfig, ScriptConfigExport } from '../types'
import { STORAGE_KEY_CUSTOM_SCRIPTS } from '../types'
import { usePersistentRef } from '../composables/usePersistentRef'

export const useScriptConfigStore = defineStore('scriptConfig', () => {
  const {
    data: customScripts,
    save: saveToStorage,
    load: loadFromStorage
  } = usePersistentRef<Record<string, ProviderScriptConfig>>(
    STORAGE_KEY_CUSTOM_SCRIPTS,
    {}
  )

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
