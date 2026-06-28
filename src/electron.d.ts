/**
 * Electron API 类型定义
 */

// NodeJS 类型声明
declare namespace NodeJS {
  interface Timeout {
    [Symbol.toPrimitive](): number
    ref(): this
    unref(): this
    hasRef(): boolean
    refresh(): this
    [Symbol.dispose](): void
  }
}

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
  createWebView(data: { providerId: string; url: string }): Promise<{ success: boolean; error?: string }>
  destroyWebView(providerId: string): Promise<{ success: boolean }>
  updateWebViewBounds(data: {
    providerId: string
    bounds: { x: number; y: number; width: number; height: number }
  }): Promise<void>
  setWebViewVisibility(data: { providerId: string; visible: boolean }): Promise<void>
  updateWebViewState(data: {
    providerId: string
    bounds?: { x: number; y: number; width: number; height: number }
    visible: boolean
  }): Promise<void>
  executeWebViewScript(data: { providerId: string; script: string }): Promise<any>
  reloadWebView(providerId: string): Promise<void>
  navigateWebView(data: { providerId: string; url: string }): Promise<void>
  openWebViewDevTools(providerId: string): Promise<void>
  sendMessageToWebView(webviewId: string, message: string): Promise<void>
  onWebViewEvent(callback: (data: { providerId: string; type: string; data: any }) => void): () => void
  setProxy(data: {
    webviewId: string
    proxyRules: string
    enabled: boolean
  }): Promise<void>

  // 会话管理
  saveSession(data: { providerId: string }): Promise<{ success: boolean }>
  loadSession(data: {
    providerId: string
  }): Promise<{ sessionData?: any; exists: boolean }>
  clearSession(data: { providerId: string }): Promise<{ success: boolean }>

  // 其他功能
  openExternal(url: string): Promise<void>

  // 系统浏览器登录与 Cookie 注入（Gemini / ChatGPT / Grok / Copilot 等）
  providerOpenSystemLogin(providerId: string): Promise<{ success: boolean; error?: string }>
  providerImportCookies(data: {
    providerId: string
    cookies: Array<{
      name: string
      value: string
      domain?: string
      path?: string
      secure?: boolean
      httpOnly?: boolean
      expirationDate?: number
    }>
  }): Promise<{ success: boolean; imported: number; error?: string }>

  // AI状态监控
  startAIStatusMonitoring(data: {
    webviewId: string
    providerId: string
  }): Promise<{ success: boolean; error?: string }>
  stopAIStatusMonitoring(data: {
    providerId: string
  }): Promise<{ success: boolean; error?: string }>
  onAIStatusChange(callback: (data: any) => void): () => void
  removeAllListeners(channel: string): void

  // 文件操作
  openFileDialog(data?: {
    filters?: Array<{ name: string; extensions: string[] }>
    multiSelections?: boolean
  }): Promise<{ canceled: boolean; filePaths: string[] }>
  readFile(data: {
    filePath: string
  }): Promise<{
    success: boolean
    name: string
    size: number
    mimeType: string
    base64: string
    error?: string
  }>
  uploadFileToWebView(data: {
    webviewId: string
    providerId: string
    file: { name: string; size: number; mimeType: string; base64: string }
  }): Promise<{ success: boolean; providerId: string; error?: string }>
}

interface Window {
  electronAPI: ElectronAPI
}
