/**
 * IPC通信处理器
 * 负责处理主进程和渲染进程之间的通信
 */

import {
  ipcMain, IpcMainEvent, IpcMainInvokeEvent, dialog, app, session, shell
} from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { EventEmitter } from 'events'
import { WindowManager } from './WindowManager'
import { SessionManager } from './SessionManager'
import { WebViewManager } from './WebViewManager'
import { getSendMessageScript } from '../../src/utils/MessageScripts'
import { getStatusMonitorScript, getStopMonitorScript } from '../../src/utils/StatusMonitorScripts'
import { parseProviderIdFromElementId } from '../../src/utils/webviewHelper'
import { providerCookieLoginUrls } from '../../src/config/providers'
import {
  IPCChannel,
  MessageSendRequest,
  MessageSendResponse,
  SessionSaveRequest,
  SessionLoadRequest,
  SessionLoadResponse,
  ErrorReportRequest,
  PerformanceMetricsResponse,
  AIStatusStartMonitoringRequest,
  AIStatusStartMonitoringResponse,
  AIStatusInfo,
  AIStatusChangeEvent,
  FileOpenDialogRequest,
  FileOpenDialogResponse,
  FileReadRequest,
  FileReadResponse,
  FileUploadToWebViewRequest,
  FileUploadToWebViewResponse,
  ProviderImportCookiesRequest
} from '../../src/types/ipc'
import { getFileUploadScript } from '../../src/utils/UploadScripts'

/**
 * IPC处理器配置接口
 */
export interface IPCHandlerConfig {
  enableLogging?: boolean
  requestTimeout?: number
  maxRetries?: number
}

/**
 * IPC通信处理器类
 */
export class IPCHandler extends EventEmitter {
  private windowManager: WindowManager

  private sessionManager: SessionManager

  private webViewManager: WebViewManager

  private config: IPCHandlerConfig

  private requestMap: Map<string, {
    resolve: Function
    reject: Function
    timeout: ReturnType<typeof setTimeout>
  }> = new Map()

  private messageHandlers: Map<IPCChannel, Function> = new Map()

  private invokeHandlers: Map<IPCChannel, Function> = new Map()

  private aiStatusMonitorListeners?: { [webviewId: string]: (event: any) => void }

  constructor(
    windowManager: WindowManager,
    sessionManager: SessionManager,
    webViewManager: WebViewManager,
    config: IPCHandlerConfig = {}
  ) {
    super()
    this.windowManager = windowManager
    this.sessionManager = sessionManager
    this.webViewManager = webViewManager
    this.config = {
      enableLogging: true,
      requestTimeout: 30000,
      maxRetries: 3,
      ...config
    }

    this.initializeHandlers()
  }

  /**
   * 初始化IPC处理器
   */
  private initializeHandlers(): void {
    // 注册invoke处理器（双向通信）
    this.registerInvokeHandlers()

    // 注册send处理器（单向通信）
    this.registerSendHandlers()

    this.log('IPC handlers initialized')
  }

  /**
   * 注册invoke处理器
   */
  private registerInvokeHandlers(): void {
    // 应用信息和窗口控制
    ipcMain.handle('get-app-version', this.handleGetAppVersion.bind(this))
    ipcMain.handle('get-system-info', this.handleGetSystemInfo.bind(this))
    ipcMain.handle('minimize-window', this.handleMinimizeWindow.bind(this))
    ipcMain.handle('close-window', this.handleCloseWindow.bind(this))
    ipcMain.handle('maximize-window', this.handleMaximizeWindow.bind(this))
    ipcMain.handle('unmaximize-window', this.handleUnmaximizeWindow.bind(this))
    ipcMain.handle('is-maximized', this.handleIsMaximized.bind(this))
    ipcMain.handle('toggle-fullscreen', this.handleToggleFullScreen.bind(this))

    // WebView管理
    ipcMain.handle('send-message-to-webview', (event, data) => this.handleSendMessageToWebView(data))
    ipcMain.handle('refresh-webview', (event, webviewId) => this.handleRefreshWebView(webviewId))
    ipcMain.handle('load-webview', (event, data) => this.handleLoadWebView(data))
    ipcMain.handle('open-devtools', (event, webviewId) => this.handleOpenDevTools(webviewId))

    // WebViewManager 驱动的 WebView 操作
    ipcMain.handle('create-webview', async(event, data: { providerId: string; url: string }) => {
      const preloadPath = path.resolve(__dirname, 'webview-preload.js')
      await this.webViewManager.createView(data.providerId, data.url, preloadPath)
      return { success: true }
    })
    ipcMain.handle('destroy-webview', async(event, data: { providerId: string }) => {
      this.webViewManager.destroyView(data.providerId)
      return { success: true }
    })
    ipcMain.handle('update-webview-bounds', async(event, data: { providerId: string; bounds: { x: number; y: number; width: number; height: number } }) => {
      this.webViewManager.setBounds(data.providerId, data.bounds)
    })
    ipcMain.handle('set-webview-visibility', async(event, data: { providerId: string; visible: boolean }) => {
      this.webViewManager.setVisibility(data.providerId, data.visible)
    })
    ipcMain.handle('navigate-webview', async(event, data: { providerId: string; url: string }) => {
      this.webViewManager.navigateTo(data.providerId, data.url)
    })
    ipcMain.handle('reload-webview', async(event, data: { providerId: string }) => {
      this.webViewManager.reload(data.providerId)
    })
    ipcMain.handle('execute-webview-script', async(event, data: { providerId: string; script: string }) => this.webViewManager.executeScript(data.providerId, data.script))
    ipcMain.handle('open-webview-devtools', async(event, data: { providerId: string }) => {
      this.webViewManager.openDevTools(data.providerId)
    })

    // 应用控制
    this.handleInvoke(IPCChannel.APP_READY, this.handleAppReady.bind(this))
    this.handleInvoke(IPCChannel.APP_QUIT, this.handleAppQuit.bind(this))
    this.handleInvoke(IPCChannel.APP_MINIMIZE, this.handleAppMinimize.bind(this))
    this.handleInvoke(IPCChannel.APP_MAXIMIZE, this.handleAppMaximize.bind(this))
    this.handleInvoke(IPCChannel.APP_RESTORE, this.handleAppRestore.bind(this))

    // 消息处理
    this.handleInvoke(IPCChannel.MESSAGE_SEND, this.handleMessageSend.bind(this))
    this.handleInvoke(IPCChannel.MESSAGE_SEND_ALL, this.handleMessageSendAll.bind(this))

    // WebView管理
    this.handleInvoke(IPCChannel.WEBVIEW_SET_PROXY, this.handleWebViewSetProxy.bind(this))

    // 会话管理
    this.handleInvoke(IPCChannel.SESSION_SAVE, this.handleSessionSave.bind(this))
    this.handleInvoke(IPCChannel.SESSION_LOAD, this.handleSessionLoad.bind(this))
    this.handleInvoke(IPCChannel.SESSION_CLEAR, this.handleSessionClear.bind(this))
    this.handleInvoke(IPCChannel.SESSION_CHECK, this.handleSessionCheck.bind(this))

    // 性能监控
    this.handleInvoke(IPCChannel.PERFORMANCE_GET_METRICS, this.handlePerformanceGetMetrics.bind(this))

    // AI状态监控
    this.handleInvoke(IPCChannel.AI_STATUS_START_MONITORING, this.handleAIStatusStartMonitoring.bind(this))
    this.handleInvoke(IPCChannel.AI_STATUS_STOP_MONITORING, this.handleAIStatusStopMonitoring.bind(this))
    this.handleInvoke(IPCChannel.AI_STATUS_GET_CURRENT, this.handleAIStatusGetCurrent.bind(this))

    // 文件操作
    this.handleInvoke(IPCChannel.FILE_OPEN_DIALOG, this.handleFileOpenDialog.bind(this))
    this.handleInvoke(IPCChannel.FILE_READ, this.handleFileRead.bind(this))
    this.handleInvoke(IPCChannel.FILE_UPLOAD_TO_WEBVIEW, this.handleFileUploadToWebView.bind(this))

    // 新增：获取预加载脚本路径
    ipcMain.handle('get-preload-path', (event, preloadName: string) => path.resolve(__dirname, preloadName))

    // 新增：系统浏览器登录与 Cookie 注入（Gemini / ChatGPT / Grok / Copilot 等）
    ipcMain.handle(IPCChannel.PROVIDER_OPEN_SYSTEM_LOGIN, async(event, data: { providerId: string }) => {
      try {
        const loginUrl = providerCookieLoginUrls[data.providerId] || `https://${data.providerId}.com`
        this.log(`Opening system browser login for ${data.providerId}`, { loginUrl })
        await shell.openExternal(loginUrl)
        return { success: true }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        this.log(`Failed to open system browser login for ${data.providerId}:`, errorMessage)
        return { success: false, error: errorMessage }
      }
    })

    ipcMain.handle(IPCChannel.PROVIDER_IMPORT_COOKIES, async(event, data: ProviderImportCookiesRequest) => {
      try {
        this.log(`Importing cookies for ${data.providerId}`, { count: data.cookies.length })
        const result = await this.sessionManager.importCookies(data.providerId, data.cookies)
        return result
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        this.log(`Failed to import cookies for ${data.providerId}:`, errorMessage)
        return { success: false, imported: 0, error: errorMessage }
      }
    })

    // 新增：清除指定provider的存储数据（用于解决Gemini登录问题）
    ipcMain.handle('clear-provider-storage', async(event, providerId: string) => {
      try {
        console.log(`[IPCHandler] Clearing storage for provider: ${providerId}`)

        // 获取provider对应的session
        let electronSession = this.sessionManager.getElectronSession(providerId)

        if (!electronSession) {
          // 如果session不存在，尝试从partition创建
          electronSession = session.fromPartition(`persist:${providerId}`)
        }

        if (electronSession) {
          // 清除所有存储数据
          await electronSession.clearStorageData({
            storages: [
              'cookies',
              'filesystem',
              'indexdb',
              'localstorage',
              'shadercache',
              'websql',
              'serviceworkers',
              'cachestorage'
            ]
          })
          console.log(`[IPCHandler] Storage cleared successfully for ${providerId}`)
          return { success: true }
        }
        console.warn(`[IPCHandler] No session found for ${providerId}`)
        return { success: false, error: 'Session not found' }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error(`[IPCHandler] Failed to clear storage for ${providerId}:`, errorMessage)
        return { success: false, error: errorMessage }
      }
    })
  }

  /**
   * 注册send处理器
   */
  private registerSendHandlers(): void {
    // 错误报告
    this.handleSend(IPCChannel.ERROR_REPORT, this.handleErrorReport.bind(this))

    // 消息接收通知
    this.handleSend(IPCChannel.MESSAGE_RECEIVED, this.handleMessageReceived.bind(this))
    this.handleSend(IPCChannel.MESSAGE_ERROR, this.handleMessageError.bind(this))

    // 监听来自WebView preload脚本的AI状态变化事件
    ipcMain.on('webview-ai-status-change', (event, data) => {
      const { providerId, status, details } = data

      // 转换状态为统一格式
      const statusMap: Record<string, string> = {
        ai_responding: 'responding',
        ai_completed: 'completed',
        waiting_input: 'waiting_input'
      }
      const mappedStatus = statusMap[status] || status

      const statusChangeEvent: AIStatusChangeEvent = {
        providerId,
        status: mappedStatus as 'waiting_input' | 'responding' | 'completed',
        timestamp: Date.now(),
        details
      }

      this.sendToRenderer(IPCChannel.AI_STATUS_CHANGE, statusChangeEvent)
      this.log(`AI status changed for ${providerId}: ${mappedStatus}`)
    })

    // 内部AI状态变化事件
    ipcMain.on('internal-ai-status-change', (event, data) => {
      const { providerId, statusData } = data
      this.log(`Internal AI status changed for ${providerId}:`, statusData)

      // 转换状态为统一格式
      const statusMap: Record<string, string> = {
        ai_responding: 'responding',
        ai_completed: 'completed',
        waiting_input: 'waiting_input'
      }

      const status = statusMap[statusData.status] || statusData.status

      // 创建状态变化事件
      const statusChangeEvent: AIStatusChangeEvent = {
        providerId,
        status: status as 'waiting_input' | 'responding' | 'completed',
        timestamp: Date.now(),
        details: statusData.details
      }

      // 发送状态变化事件到渲染进程
      this.sendToRenderer(IPCChannel.AI_STATUS_CHANGE, statusChangeEvent)

      this.log(`AI status changed for ${providerId}: ${status}`)
    })
  }

  /**
   * 注册invoke处理器
   */
  private handleInvoke<T = any, R = any>(
    channel: IPCChannel,
    handler: (data: T, event: IpcMainInvokeEvent) => Promise<R> | R
  ): void {
    this.invokeHandlers.set(channel, handler)

    ipcMain.handle(channel, async(event: IpcMainInvokeEvent, data: T) => {
      try {
        this.log(`Handling invoke: ${channel}`, data)
        const result = await handler(data, event)
        this.log(`Invoke result: ${channel}`, result)
        return result
      } catch (error) {
        this.log(`Invoke error: ${channel}`, error)
        throw error
      }
    })
  }

  /**
   * 注册send处理器
   */
  private handleSend<T = any>(
    channel: IPCChannel,
    handler: (data: T, event: IpcMainEvent) => void
  ): void {
    this.messageHandlers.set(channel, handler)

    ipcMain.on(channel, (event: IpcMainEvent, data: T) => {
      try {
        this.log(`Handling send: ${channel}`, data)
        handler(data, event)
      } catch (error) {
        this.log(`Send error: ${channel}`, error)
      }
    })
  }

  /**
   * 发送消息到渲染进程
   */
  sendToRenderer<T = any>(channel: IPCChannel, data?: T, windowId?: string): void {
    const window = windowId ? this.windowManager.getWindow(windowId) : this.windowManager.getMainWindow()
    if (window && !window.isDestroyed()) {
      window.webContents.send(channel, data)
      this.log(`Sent to renderer: ${channel}`, data)
    }
  }

  /**
   * 广播消息到所有窗口
   */
  broadcast<T = any>(channel: IPCChannel, data?: T): void {
    const windows = this.windowManager.getAllWindows()
    windows.forEach((window, windowId) => {
      if (!window.isDestroyed()) {
        window.webContents.send(channel, data)
      }
    })
    this.log(`Broadcasted: ${channel}`, data)
  }

  // ==================== 处理器实现 ====================

  /**
   * 获取应用版本
   */
  private async handleGetAppVersion(): Promise<string> {
    return app.getVersion()
  }

  /**
   * 获取系统信息
   */
  private async handleGetSystemInfo(): Promise<{ platform: string; nodeVersion: string; electronVersion: string }> {
    return {
      platform: process.platform,
      nodeVersion: process.versions.node,
      electronVersion: process.versions.electron || 'Unknown'
    }
  }

  /**
   * 最小化窗口
   */
  private async handleMinimizeWindow(): Promise<void> {
    this.windowManager.minimizeWindow('main')
  }

  /**
   * 关闭窗口
   */
  private async handleCloseWindow(): Promise<void> {
    app.quit()
  }

  /**
   * 最大化窗口
   */
  private async handleMaximizeWindow(): Promise<void> {
    this.windowManager.maximizeWindow('main')
  }

  /**
   * 取消最大化窗口
   */
  private async handleUnmaximizeWindow(): Promise<void> {
    this.windowManager.unmaximizeWindow('main')
  }

  /**
   * 检查窗口是否最大化
   */
  private async handleIsMaximized(): Promise<boolean> {
    const window = this.windowManager.getMainWindow()
    return window ? window.isMaximized() : false
  }

  /**
   * 切换全屏状态
   */
  private async handleToggleFullScreen(): Promise<void> {
    this.windowManager.toggleFullScreen('main')
  }

  /**
   * 在WebView容器中执行脚本
   */
  private async executeInWebViewContainer(webviewId: string, innerScript: string, logPrefix: string): Promise<any> {
    const providerId = parseProviderIdFromElementId(webviewId)
    this.log(`${logPrefix} executing for provider:`, providerId)
    return this.webViewManager.executeScript(providerId, innerScript)
  }

  /**
   * 发送消息到WebView
   */
  private async handleSendMessageToWebView(data: { webviewId: string; message: string }): Promise<void> {
    try {
      this.log(`Sending message to WebView ${data.webviewId}:`, data.message)

      const extractedProviderId = parseProviderIdFromElementId(data.webviewId)

      let scriptProviderId = extractedProviderId
      if (scriptProviderId.startsWith('summary-')) {
        scriptProviderId = scriptProviderId.replace('summary-', '')
        this.log('[IPC] Detected summary provider, using original provider:', scriptProviderId)
      }

      const sendScript = getSendMessageScript(scriptProviderId, data.message)
      await this.webViewManager.executeScript(extractedProviderId, sendScript)
    } catch (error) {
      this.log(`Failed to send message to WebView ${data.webviewId}:`, error)
      throw error
    }
  }

  /**
   * 刷新WebView
   */
  private async handleRefreshWebView(webviewId: string): Promise<void> {
    try {
      this.log(`Refreshing WebView: ${webviewId}`)
      const providerId = parseProviderIdFromElementId(webviewId)
      this.webViewManager.reload(providerId)
    } catch (error) {
      this.log(`Failed to refresh WebView ${webviewId}:`, error)
      throw error
    }
  }

  /**
   * 加载WebView
   */
  private async handleLoadWebView(data: { webviewId: string; url: string }): Promise<void> {
    // 这里应该实现实际的WebView加载逻辑
    this.log(`Loading WebView ${data.webviewId} with URL:`, data.url)
  }

  /**
   * 打开WebView控制台
   */
  private async handleOpenDevTools(webviewId: string): Promise<void> {
    try {
      this.log(`Opening DevTools for WebView: ${webviewId}`)
      const providerId = parseProviderIdFromElementId(webviewId)
      this.webViewManager.openDevTools(providerId)
    } catch (error) {
      this.log(`Failed to open DevTools for WebView ${webviewId}:`, error)
      throw error
    }
  }

  /**
   * 处理应用就绪
   */
  private async handleAppReady(): Promise<{ success: boolean; version: string }> {
    return {
      success: true,
      version: app.getVersion()
    }
  }

  /**
   * 处理应用退出
   */
  private async handleAppQuit(): Promise<{ success: boolean }> {
    app.quit()
    return { success: true }
  }

  /**
   * 处理应用最小化
   */
  private async handleAppMinimize(): Promise<{ success: boolean }> {
    const success = this.windowManager.minimizeWindow('main')
    return { success }
  }

  /**
   * 处理应用最大化
   */
  private async handleAppMaximize(): Promise<{ success: boolean }> {
    const success = this.windowManager.maximizeWindow('main')
    return { success }
  }

  /**
   * 处理应用恢复
   */
  private async handleAppRestore(): Promise<{ success: boolean }> {
    const success = this.windowManager.showWindow('main')
    return { success }
  }

  /**
   * 处理消息发送
   */
  private async handleMessageSend(data: MessageSendRequest): Promise<MessageSendResponse> {
    const { content, targetProviders, messageId } = data
    const finalMessageId = messageId || this.generateId()
    const results: MessageSendResponse['results'] = []

    const providers = targetProviders || this.sessionManager.getActiveSessionIds()

    await Promise.all(providers.map(async(providerId) => {
      try {
        // 这里应该实现实际的消息发送逻辑
        // 暂时返回成功状态
        results.push({
          providerId,
          success: true
        })

        // 通知渲染进程消息已发送
        this.sendToRenderer(IPCChannel.MESSAGE_RECEIVED, {
          messageId: finalMessageId,
          providerId,
          content
        })
      } catch (error) {
        results.push({
          providerId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }))

    return {
      messageId: finalMessageId,
      results
    }
  }

  /**
   * 处理消息发送到所有提供商
   */
  private async handleMessageSendAll(data: MessageSendRequest): Promise<MessageSendResponse> {
    // 获取所有活跃的会话
    const allProviders = this.sessionManager.getActiveSessionIds()
    return this.handleMessageSend({
      ...data,
      targetProviders: allProviders
    })
  }

  /**
   * 处理会话保存
   */
  private async handleSessionSave(data: SessionSaveRequest): Promise<{ success: boolean }> {
    const success = await this.sessionManager.saveSession(data.providerId)
    return { success }
  }

  /**
   * 处理会话加载
   */
  private async handleSessionLoad(data: SessionLoadRequest): Promise<SessionLoadResponse> {
    const sessionData = await this.sessionManager.loadSession(data.providerId)
    return {
      sessionData: sessionData || undefined,
      exists: sessionData !== null
    }
  }

  /**
   * 处理会话清除
   */
  private async handleSessionClear(data: { providerId: string }): Promise<{ success: boolean }> {
    const success = await this.sessionManager.clearSession(data.providerId)
    return { success }
  }

  /**
   * 处理会话检查
   */
  private async handleSessionCheck(data: { providerId: string }): Promise<{ exists: boolean; active: boolean }> {
    const exists = await this.sessionManager.hasSession(data.providerId)
    const active = await this.sessionManager.isSessionActive(data.providerId)
    return { exists, active }
  }

  /**
   * 处理性能指标获取
   */
  private async handlePerformanceGetMetrics(): Promise<PerformanceMetricsResponse> {
    const metrics = app.getAppMetrics()

    return {
      cpu: {
        usage: metrics.reduce((sum: number, metric) => sum + (metric.cpu?.percentCPUUsage || 0), 0),
        timestamp: new Date()
      },
      memory: {
        used: metrics.reduce((sum: number, metric) => sum + (metric.memory?.workingSetSize || 0), 0),
        total: os.totalmem(),
        percentage: 0,
        timestamp: new Date()
      },
      webviews: {}
    }
  }

  /**
   * 处理错误报告
   */
  private handleErrorReport(data: ErrorReportRequest): void {
    this.log('Error reported:', data)
    this.emit('error-reported', data)
  }

  /**
   * 处理消息接收
   */
  private handleMessageReceived(data: { messageId: string; providerId: string; content: string }): void {
    this.emit('message-received', data)
  }

  /**
   * 处理消息错误
   */
  private handleMessageError(data: { messageId: string; providerId: string; error: string }): void {
    this.emit('message-error', data)
  }

  /**
   * 处理WebView代理设置
   */
  private async handleWebViewSetProxy(data: {
    webviewId: string
    proxyRules: string
    enabled: boolean
  }): Promise<{ success: boolean; error?: string }> {
    try {
      this.log(`Setting proxy for webview ${data.webviewId}: ${data.proxyRules}`)

      let providerId = parseProviderIdFromElementId(data.webviewId)

      // 对于总结模式的provider（id格式为summary-{originalId}），使用原始provider的session
      if (providerId.startsWith('summary-')) {
        providerId = providerId.replace('summary-', '')
        this.log('[IPC] Detected summary provider, using original provider session:', providerId)
      }

      // 检查会话是否存在，如果不存在则创建
      let electronSession = this.sessionManager.getSession(providerId)
      if (!electronSession) {
        this.log(`Session not found for webview: ${data.webviewId}, creating new session...`)
        electronSession = await this.sessionManager.createProviderSession(providerId)
      }

      if (data.enabled) {
        // 设置代理
        await electronSession.setProxy({
          proxyRules: data.proxyRules
        })
        this.log(`Proxy set successfully for webview ${data.webviewId}`)
      } else {
        // 禁用代理，使用直连
        await electronSession.setProxy({
          proxyRules: 'direct://'
        })
        this.log(`Proxy disabled for webview ${data.webviewId}`)
      }

      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.log(`Failed to set proxy for webview ${data.webviewId}:`, errorMessage)
      return {
        success: false,
        error: errorMessage
      }
    }
  }

  /**
   * 处理AI状态监控启动
   */
  private async handleAIStatusStartMonitoring(
    data: AIStatusStartMonitoringRequest
  ): Promise<AIStatusStartMonitoringResponse> {
    try {
      this.log(`Starting AI status monitoring for webview ${data.webviewId}, provider ${data.providerId}`)

      const statusMonitorScript = getStatusMonitorScript(data.providerId)

      const result = await this.webViewManager.executeScript(data.providerId, statusMonitorScript)

      // executeScript 返回 null 表示 webview 不存在；
      // 返回 undefined 表示脚本已成功执行（监控脚本为 IIFE，无返回值）。
      // executeJavaScript 在脚本抛错时会 reject，走到 catch 分支。
      if (result === null) {
        throw new Error(`WebView not found for provider ${data.providerId}`)
      }
      this.log(`AI status monitoring started successfully for ${data.webviewId}`)
      return { success: true }
    } catch (error) {
      this.log(`Failed to start AI status monitoring for ${data.webviewId}:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * 处理AI状态监控停止
   */
  private async handleAIStatusStopMonitoring(
    data: { providerId: string }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      this.log(`Stopping AI status monitoring for provider ${data.providerId}`)

      const stopScript = getStopMonitorScript()

      try {
        await this.webViewManager.executeScript(data.providerId, stopScript)
      } catch (execError) {
        this.log(`WebView not available for stopping monitoring ${data.providerId}, skipping script injection`)
      }

      if (this.aiStatusMonitorListeners) {
        Object.keys(this.aiStatusMonitorListeners).forEach((listenerWebviewId) => {
          if (listenerWebviewId.includes(data.providerId)) {
            const mainWindow = this.windowManager.getMainWindow()
            const listener = this.aiStatusMonitorListeners?.[listenerWebviewId]
            if (mainWindow && !mainWindow.isDestroyed() && listener) {
              mainWindow.webContents.off('ipc-message', listener)
            }
            if (this.aiStatusMonitorListeners) {
              delete this.aiStatusMonitorListeners[listenerWebviewId]
            }
          }
        })
      }

      this.log(`AI status monitoring stopped for provider ${data.providerId}`)
      return { success: true }
    } catch (error) {
      this.log(`Failed to stop AI status monitoring for ${data.providerId}:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * 处理获取当前AI状态
   */
  private async handleAIStatusGetCurrent(
    data: { providerId: string }
  ): Promise<AIStatusInfo> {
    try {
      this.log(`Getting current AI status for provider ${data.providerId}`)

      // 这里可以查询当前状态，暂时返回默认状态
      const defaultStatus: AIStatusInfo = {
        providerId: data.providerId,
        status: 'waiting_input',
        timestamp: Date.now()
      }

      return defaultStatus
    } catch (error) {
      this.log(`Failed to get current AI status for ${data.providerId}:`, error)
      throw error
    }
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 日志记录
   */
  private log(message: string, data?: any): void {
    if (this.config.enableLogging) {
      console.log(`[IPCHandler] ${message}`, data || '')
    }
  }

  private async handleFileUploadToWebView(
    data: FileUploadToWebViewRequest
  ): Promise<FileUploadToWebViewResponse> {
    const { webviewId, providerId, file } = data
    this.log(
      `[FileUpload:Main] START provider=${providerId} `
      + `webviewId=${webviewId} file=${file.name} size=${file.size} type=${file.mimeType}`
    )
    this.log(`[FileUpload:Main] base64 length=${file.base64.length}`)

    try {
      const script = getFileUploadScript(providerId, {
        name: file.name,
        mimeType: file.mimeType,
        base64: file.base64
      })

      const debugScript = script.replace(/\n/g, ' ').substring(0, 300)
      this.log(`[FileUpload:Main] Generated script (first 300 chars): ${debugScript}`)

      await this.webViewManager.executeScript(providerId, script)
      return { success: true, providerId }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const stack = error instanceof Error ? error.stack : ''
      this.log(`[FileUpload:Main] ERROR: ${errorMessage}`)
      this.log(`[FileUpload:Main] Stack: ${stack}`)
      return { success: false, providerId, error: errorMessage }
    }
  }

  /**
   * 打开文件选择对话框
   */
  private async handleFileOpenDialog(data: FileOpenDialogRequest): Promise<FileOpenDialogResponse> {
    const mainWindow = this.windowManager.getMainWindow()
    if (!mainWindow || mainWindow.isDestroyed()) {
      return { canceled: true, filePaths: [] }
    }

    const options: {
      properties: Array<'openFile' | 'multiSelections'>
      filters: Array<{ name: string; extensions: string[] }>
    } = {
      properties: ['openFile'],
      filters: data.filters || [
        {
          name: 'All Supported Files',
          extensions: [
            'txt', 'md', 'json', 'csv', 'py', 'js', 'ts', 'html', 'css', 'xml',
            'yaml', 'yml', 'log', 'sql', 'java', 'go', 'rs', 'c', 'cpp', 'h',
            'hpp', 'sh', 'bat', 'ps1', 'ini', 'cfg', 'conf', 'toml', 'properties',
            'env', 'png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg', 'webp',
            'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
            'zip', 'rar', '7z', 'tar', 'gz'
          ]
        }
      ]
    }

    if (data.multiSelections) {
      (options.properties as string[]).push('multiSelections')
    }

    const result = await dialog.showOpenDialog(mainWindow, options)
    return {
      canceled: result.canceled,
      filePaths: result.filePaths
    }
  }

  /**
   * 读取文件内容并返回base64
   */
  private async handleFileRead(data: FileReadRequest): Promise<FileReadResponse> {
    try {
      const { filePath } = data
      const buffer = fs.readFileSync(filePath)
      const base64 = buffer.toString('base64')
      const ext = path.extname(filePath).toLowerCase().replace('.', '')
      const mimeMap: Record<string, string> = {
        txt: 'text/plain',
        md: 'text/markdown',
        json: 'application/json',
        csv: 'text/csv',
        xml: 'application/xml',
        html: 'text/html',
        css: 'text/css',
        js: 'application/javascript',
        ts: 'application/typescript',
        py: 'text/x-python',
        java: 'text/x-java',
        go: 'text/x-go',
        rs: 'text/x-rust',
        sql: 'text/sql',
        yaml: 'text/yaml',
        yml: 'text/yaml',
        sh: 'text/x-shellscript',
        bat: 'text/plain',
        ps1: 'text/plain',
        ini: 'text/plain',
        cfg: 'text/plain',
        conf: 'text/plain',
        toml: 'text/plain',
        log: 'text/plain',
        env: 'text/plain',
        png: 'image/png',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        gif: 'image/gif',
        bmp: 'image/bmp',
        svg: 'image/svg+xml',
        webp: 'image/webp',
        pdf: 'application/pdf',
        doc: 'application/msword',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        xls: 'application/vnd.ms-excel',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ppt: 'application/vnd.ms-powerpoint',
        pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        zip: 'application/zip',
        rar: 'application/x-rar-compressed',
        '7z': 'application/x-7z-compressed',
        tar: 'application/x-tar',
        gz: 'application/gzip'
      }

      return {
        success: true,
        name: path.basename(filePath),
        size: buffer.length,
        mimeType: mimeMap[ext] || 'application/octet-stream',
        base64
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return {
        success: false,
        name: '',
        size: 0,
        mimeType: '',
        base64: '',
        error: errorMessage
      }
    }
  }

  /**
   * 销毁IPC处理器
   */
  destroy(): void {
    // 移除新的IPC处理器
    ipcMain.removeHandler(IPCChannel.PROVIDER_OPEN_SYSTEM_LOGIN)
    ipcMain.removeHandler(IPCChannel.PROVIDER_IMPORT_COOKIES)

    ipcMain.removeHandler('get-app-version')
    ipcMain.removeHandler('get-system-info')
    ipcMain.removeHandler('minimize-window')
    ipcMain.removeHandler('close-window')
    ipcMain.removeHandler('maximize-window')
    ipcMain.removeHandler('unmaximize-window')
    ipcMain.removeHandler('is-maximized')

    // 移除WebViewManager驱动的处理器
    ipcMain.removeHandler('create-webview')
    ipcMain.removeHandler('destroy-webview')
    ipcMain.removeHandler('update-webview-bounds')
    ipcMain.removeHandler('set-webview-visibility')
    ipcMain.removeHandler('navigate-webview')
    ipcMain.removeHandler('reload-webview')
    ipcMain.removeHandler('execute-webview-script')
    ipcMain.removeHandler('open-webview-devtools')

    // 移除所有IPC监听器
    this.invokeHandlers.forEach((_, channel) => {
      ipcMain.removeHandler(channel)
    })

    this.messageHandlers.forEach((_, channel) => {
      ipcMain.removeAllListeners(channel)
    })

    // 清理请求映射
    this.requestMap.forEach(({ timeout }) => {
      clearTimeout(timeout)
    })
    this.requestMap.clear()

    // 清理处理器映射
    this.invokeHandlers.clear()
    this.messageHandlers.clear()

    // 移除所有事件监听器
    this.removeAllListeners()

    this.log('IPC handler destroyed')
  }
}
