/**
 * 通用脚本解析工具
 * 从scriptConfigStore获取自定义脚本，支持参数替换
 *
 * @author huquanzhi
 * @since 2025-05-15 14:30
 * @version 1.0
 */

import { useScriptConfigStore } from '../stores/scriptConfig'
import type { ScriptType } from '../types/scriptConfig'

export function resolveScript(
  providerId: string,
  scriptType: ScriptType,
  defaultScript: string,
  params?: Record<string, string>
): string {
  try {
    const store = useScriptConfigStore()
    const custom = store.getCustomScript(providerId, scriptType)
    if (custom) {
      let result = custom
      if (params) {
        Object.keys(params).forEach((key) => {
          result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), params[key])
        })
      }
      return result
    }
  } catch {
    // Store not available, use default
  }
  return defaultScript
}
