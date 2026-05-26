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

// Electron 类型声明
declare namespace Electron {
  interface WebviewTag extends HTMLElement {
    src: string
    nodeintegration: string
    websecurity: string
    allowpopups: string
    useragent: string
    partition: string
    preload: string
    addEventListener<K extends keyof WebviewTagEventMap>(
      type: K,
      listener: (this: WebviewTag, ev: WebviewTagEventMap[K]) => void,
      useCapture?: boolean
    ): void
    addEventListener(
      type: string,
      listener: ((evt: Event) => void) | null,
      useCapture?: boolean
    ): void
    removeEventListener<K extends keyof WebviewTagEventMap>(
      type: K,
      listener: (this: WebviewTag, ev: WebviewTagEventMap[K]) => void,
      useCapture?: boolean
    ): void
    removeEventListener(
      type: string,
      listener: ((evt: Event) => void) | null,
      useCapture?: boolean
    ): void
    executeJavaScript(code: string, userGesture?: boolean): Promise<unknown>
    reload(): void
    setAttribute(name: string, value: string): void
    getAttribute(name: string): string | null
    removeAttribute(name: string): void
  }

  interface WebviewTagEventMap {
    'did-start-loading': Event
    'did-finish-load': Event
    'did-fail-load': DidFailLoadEvent
    'page-title-updated': PageTitleUpdatedEvent
    'will-navigate': WillNavigateEvent
    'new-window': NewWindowEvent
    'console-message': ConsoleMessageEvent
  }

  interface DidFailLoadEvent extends Event {
    errorCode: number
    errorDescription: string
    validatedURL: string
    isMainFrame: boolean
  }

  interface PageTitleUpdatedEvent extends Event {
    title: string
    explicitSet: boolean
  }

  interface WillNavigateEvent extends Event {
    url: string
  }

  interface NewWindowEvent extends Event {
    url: string
    frameName: string
    disposition:
      | 'default'
      | 'foreground-tab'
      | 'background-tab'
      | 'new-window'
      | 'save-to-disk'
      | 'other'
    options: any
  }

  interface ConsoleMessageEvent extends Event {
    level: number
    message: string
    line: number
    sourceId: string
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
  sendMessageToWebView(webviewId: string, message: string): Promise<void>
  executeScriptInWebView(webviewId: string, script: string): Promise<any>
  refreshWebView(webviewId: string): Promise<void>
  refreshAllWebViews(): Promise<void>
  loadWebView(data: { webviewId: string; url: string }): Promise<void>
  openDevTools(webviewId: string): Promise<void>
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
