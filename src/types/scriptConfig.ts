export type ScriptType = 'getLLMLastMessage' | 'loginCheck' | 'sendMessage' | 'newChat' | 'statusMonitor'

export interface ProviderScriptConfig {
  providerId: string
  scripts: Partial<Record<ScriptType, string>>
}

export interface ScriptConfigState {
  customScripts: Record<string, ProviderScriptConfig>
}

export interface ScriptConfigExport {
  version: string
  exportTime: string
  customScripts: Record<string, ProviderScriptConfig>
}

export const SCRIPT_TYPES: { value: ScriptType; label: string }[] = [
  { value: 'getLLMLastMessage', label: '获取AI回复' },
  { value: 'loginCheck', label: '登录状态检查' },
  { value: 'sendMessage', label: '发送消息' },
  { value: 'newChat', label: '新建对话' },
  { value: 'statusMonitor', label: '状态监控' }
]

export const STORAGE_KEY_CUSTOM_SCRIPTS = 'chatallai_custom_scripts'
