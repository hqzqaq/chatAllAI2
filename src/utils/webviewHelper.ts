/**
 * WebView ID 工具函数
 * 提供 WebView 元素 ID 的构建和解析功能
 *
 * @author huquanzhi
 * @since 2026-05-15
 * @version 1.0
 */

/**
 * 根据 providerId 构建 WebView 元素的 ID
 * @param providerId - 提供商ID，如 'kimi' 或 'summary-kimi'
 * @returns WebView 元素 ID，格式为 `webview-${providerId}-element`
 * @example buildWebViewElementId('kimi') => 'webview-kimi-element'
 */
export function buildWebViewElementId(providerId: string): string {
  return `webview-${providerId}-element`
}

/**
 * 从 WebView 元素 ID 中解析出 providerId
 * 支持带或不带 `webview-` 前缀、带或不带 `-element` 后缀的输入
 * @param elementId - WebView 元素 ID，如 'webview-kimi-element'、'webview-kimi' 或 'kimi'
 * @returns 解析出的 providerId
 * @example parseProviderIdFromElementId('webview-kimi-element') => 'kimi'
 * @example parseProviderIdFromElementId('webview-summary-kimi-element') => 'summary-kimi'
 */
export function parseProviderIdFromElementId(elementId: string): string {
  let providerId = elementId
  if (providerId.startsWith('webview-')) {
    providerId = providerId.slice('webview-'.length)
  }
  if (providerId.endsWith('-element')) {
    providerId = providerId.slice(0, -'-element'.length)
  }
  return providerId
}
