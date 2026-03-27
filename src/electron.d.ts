/**
 * Electron API 类型定义
 */

interface ElectronAPI {
  // 应用控制
  getAppVersion(): Promise<string>
  getSystemInfo(): Promise<any>
  minimizeWindow(): Promise<void>
  closeWindow(): Promise<void>
  maximizeWindow(): Promise<void>
  unmaximizeWindow(): Promise<void>
  isMaximized(): Promise<boolean>
  toggleFullScreen(): Promise<void>

  // WebView管理
  sendMessageToWebView(webviewId: string, message: string): Promise<void>
  executeScriptInWebView(webviewId: string, script: string): Promise<any>
  refreshWebView(webviewId: string): Promise<void>
  refreshAllWebViews(): Promise<void>
  loadWebView(data: { webviewId: string; url: string }): Promise<void>
  openDevTools(webviewId: string): Promise<void>
  setProxy(data: { webviewId: string; proxy: string }): Promise<void>

  // BrowserView管理 (新增)
  createBrowserView(data: { providerId: string; url: string; partition: string; preload?: string }): Promise<{ providerId: string; success: boolean; error?: string }>
  destroyBrowserView(data: { providerId: string }): Promise<{ success: boolean; error?: string }>
  setBrowserViewBounds(data: { providerId: string; bounds: { x: number; y: number; width: number; height: number } }): Promise<{ success: boolean; error?: string }>
  showBrowserView(data: { providerId: string }): Promise<{ success: boolean; error?: string }>
  hideBrowserView(data: { providerId: string }): Promise<{ success: boolean; error?: string }>
  executeScriptInBrowserView(data: { providerId: string; script: string }): Promise<{ result: any; error?: string }>
  sendMessageToBrowserView(data: { providerId: string; message: string }): Promise<{ success: boolean; error?: string }>
  reloadBrowserView(data: { providerId: string }): Promise<{ success: boolean; error?: string }>
  navigateBrowserView(data: { providerId: string; url: string }): Promise<{ success: boolean; error?: string }>
  openBrowserViewDevTools(data: { providerId: string }): Promise<{ success: boolean; error?: string }>

  // 会话管理
  saveSession(data: { providerId: string }): Promise<{ success: boolean }>
  loadSession(data: { providerId: string }): Promise<{ sessionData?: any; exists: boolean }>
  clearSession(data: { providerId: string }): Promise<{ success: boolean }>

  // 其他功能
  openExternal(url: string): Promise<void>

  // AI状态监控
  startAIStatusMonitoring(data: { webviewId: string; providerId: string }): Promise<{ success: boolean; error?: string }>
  stopAIStatusMonitoring(data: { providerId: string }): Promise<{ success: boolean; error?: string }>
  onAIStatusChange(callback: (data: any) => void): () => void
  removeAllListeners(channel: string): void

  // 通用发送方法
  send(channel: string, data: any): void
}

interface Window {
  electronAPI: ElectronAPI
}
