/**
 * IPC通信处理器
 * 负责处理主进程和渲染进程之间的通信
 */

import {
  ipcMain, IpcMainEvent, IpcMainInvokeEvent, BrowserWindow
} from 'electron'
import { EventEmitter } from 'events'
import { WindowManager } from './WindowManager'
import { SessionManager } from './SessionManager'
import { getSendMessageScript } from '../../src/utils/MessageScripts'
import {
  IPCChannel,
  IPCRequest,
  IPCResponse,
  IPCEventDataMap,
  MessageSendRequest,
  MessageSendResponse,
  WebViewCreateRequest,
  WebViewCreateResponse,
  WebViewExecuteScriptRequest,
  WebViewExecuteScriptResponse,
  SessionSaveRequest,
  SessionLoadRequest,
  SessionLoadResponse,
  StorageRequest,
  StorageResponse,
  SettingsRequest,
  SettingsResponse,
  ErrorReportRequest,
  PerformanceMetricsResponse
} from '../../src/types/ipc'

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

  private config: IPCHandlerConfig

  private requestMap: Map<string, { resolve: Function; reject: Function; timeout: NodeJS.Timeout }> = new Map()

  private messageHandlers: Map<IPCChannel, Function> = new Map()

  private invokeHandlers: Map<IPCChannel, Function> = new Map()

  constructor(
    windowManager: WindowManager,
    sessionManager: SessionManager,
    config: IPCHandlerConfig = {}
  ) {
    super()
    this.windowManager = windowManager
    this.sessionManager = sessionManager
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

    // WebView管理
    ipcMain.handle('send-message-to-webview', (event, data) => this.handleSendMessageToWebView(data))
    ipcMain.handle('refresh-webview', (event, webviewId) => this.handleRefreshWebView(webviewId))
    ipcMain.handle('refresh-all-webviews', () => this.handleRefreshAllWebViews())
    ipcMain.handle('load-webview', (event, data) => this.handleLoadWebView(data))
    ipcMain.handle('open-devtools', (event, webviewId) => this.handleOpenDevTools(webviewId))

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
    this.handleInvoke(IPCChannel.WEBVIEW_CREATE, this.handleWebViewCreate.bind(this))
    this.handleInvoke(IPCChannel.WEBVIEW_DESTROY, this.handleWebViewDestroy.bind(this))
    this.handleInvoke(IPCChannel.WEBVIEW_RELOAD, this.handleWebViewReload.bind(this))
    this.handleInvoke(IPCChannel.WEBVIEW_NAVIGATE, this.handleWebViewNavigate.bind(this))
    this.handleInvoke(IPCChannel.WEBVIEW_EXECUTE_SCRIPT, this.handleWebViewExecuteScript.bind(this))
    this.handleInvoke(IPCChannel.WEBVIEW_INSERT_CSS, this.handleWebViewInsertCSS.bind(this))
    this.handleInvoke(IPCChannel.WEBVIEW_SET_PROXY, this.handleWebViewSetProxy.bind(this))

    // 会话管理
    this.handleInvoke(IPCChannel.SESSION_SAVE, this.handleSessionSave.bind(this))
    this.handleInvoke(IPCChannel.SESSION_LOAD, this.handleSessionLoad.bind(this))
    this.handleInvoke(IPCChannel.SESSION_CLEAR, this.handleSessionClear.bind(this))
    this.handleInvoke(IPCChannel.SESSION_CHECK, this.handleSessionCheck.bind(this))

    // 存储操作
    this.handleInvoke(IPCChannel.STORAGE_GET, this.handleStorageGet.bind(this))
    this.handleInvoke(IPCChannel.STORAGE_SET, this.handleStorageSet.bind(this))
    this.handleInvoke(IPCChannel.STORAGE_DELETE, this.handleStorageDelete.bind(this))
    this.handleInvoke(IPCChannel.STORAGE_CLEAR, this.handleStorageClear.bind(this))

    // 设置管理
    this.handleInvoke(IPCChannel.SETTINGS_GET, this.handleSettingsGet.bind(this))
    this.handleInvoke(IPCChannel.SETTINGS_SET, this.handleSettingsSet.bind(this))
    this.handleInvoke(IPCChannel.SETTINGS_RESET, this.handleSettingsReset.bind(this))

    // 性能监控
    this.handleInvoke(IPCChannel.PERFORMANCE_GET_METRICS, this.handlePerformanceGetMetrics.bind(this))
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
    const { app } = require('electron')
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
    const { app } = require('electron')
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
   * 发送消息到WebView
   */
  private async handleSendMessageToWebView(data: { webviewId: string; message: string }): Promise<void> {
    try {
      this.log(`Sending message to WebView ${data.webviewId}:`, data.message)

      const mainWindow = this.windowManager.getMainWindow()
      if (!mainWindow || mainWindow.isDestroyed()) {
        throw new Error('Main window not available')
      }

      // 从webviewId推断providerId（webview-webview-kimi -> kimi）
      const providerId = data.webviewId.replace('webview-', '')

      this.log('[IPC] Provider ID:', providerId)

      // 使用MessageScripts工具类获取对应的发送脚本
      const sendScript = getSendMessageScript(providerId, data.message)

      this.log('[IPC] Generated send script:', sendScript)

      // 避免两层转义：直接将sendScript作为字符串传递给WebView
      const script = `
        (async function() {
          try {
            console.log('[IPC] Starting message send process...');
            
            const webviewElement = document.querySelector('#${data.webviewId}-element');
            console.log('[IPC] WebView element:', webviewElement);
            
            if (!webviewElement) {
              console.error('[IPC] WebView element not found:', '${data.webviewId}');
              return false;
            }
            
            console.log('[IPC] Executing script in WebView...');
            
            // 直接执行sendScript，避免两层转义
            const result = await webviewElement.executeJavaScript(${JSON.stringify(sendScript)});
            
            console.log('[IPC] Script result:', result);
            return result;
          } catch (error) {
            console.error('[IPC] Error in script execution:', error);
            return false;
          }
        })()
      `

      // 执行脚本
      const result = await mainWindow.webContents.executeJavaScript(script)
      this.log(`Message send script executed for ${data.webviewId}, result:`, result)
    } catch (error) {
      this.log(`Failed to send message to WebView ${data.webviewId}:`, error)
      throw error
    }
  }

  /**
   * 刷新WebView
   */
  private async handleRefreshWebView(webviewId: string): Promise<void> {
    // 这里应该实现实际的WebView刷新逻辑
    this.log(`Refreshing WebView: ${webviewId}`)
  }

  /**
   * 刷新所有WebView
   */
  private async handleRefreshAllWebViews(): Promise<void> {
    // 这里应该实现刷新所有WebView的逻辑
    this.log('Refreshing all WebViews')
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

      const mainWindow = this.windowManager.getMainWindow()
      if (!mainWindow || mainWindow.isDestroyed()) {
        throw new Error('Main window not available')
      }

      // 执行JavaScript代码来打开WebView的控制台
      const script = `
        (function() {
          try {
            const webviewElement = document.querySelector('#${webviewId}-element');
            if (webviewElement && webviewElement.openDevTools) {
              webviewElement.openDevTools();
              console.log('DevTools opened for WebView: ${webviewId}');
              return true;
            } else {
              console.error('WebView element not found or does not support openDevTools: ${webviewId}');
              return false;
            }
          } catch (error) {
            console.error('Error opening DevTools:', error);
            return false;
          }
        })()
      `

      const result = await mainWindow.webContents.executeJavaScript(script)
      this.log(`DevTools open result for ${webviewId}:`, result)

      if (!result) {
        throw new Error('Failed to open DevTools - WebView may not be ready')
      }
    } catch (error) {
      this.log(`Failed to open DevTools for WebView ${webviewId}:`, error)
      throw error
    }
  }

  /**
   * 处理应用就绪
   */
  private async handleAppReady(): Promise<{ success: boolean; version: string }> {
    const { app } = require('electron')
    return {
      success: true,
      version: app.getVersion()
    }
  }

  /**
   * 处理应用退出
   */
  private async handleAppQuit(): Promise<{ success: boolean }> {
    const { app } = require('electron')
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

    for (const providerId of providers) {
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
    }

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
   * 处理WebView创建
   */
  private async handleWebViewCreate(data: WebViewCreateRequest): Promise<WebViewCreateResponse> {
    try {
      const { providerId, url } = data
      const webviewId = this.generateId()

      // 创建会话
      await this.sessionManager.createProviderSession(providerId)

      return {
        webviewId,
        providerId,
        success: true
      }
    } catch (error) {
      return {
        webviewId: '',
        providerId: data.providerId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * 处理WebView销毁
   */
  private async handleWebViewDestroy(data: { webviewId: string }): Promise<{ success: boolean }> {
    // 实现WebView销毁逻辑
    return { success: true }
  }

  /**
   * 处理WebView重新加载
   */
  private async handleWebViewReload(data: { webviewId: string }): Promise<{ success: boolean }> {
    // 实现WebView重新加载逻辑
    return { success: true }
  }

  /**
   * 处理WebView导航
   */
  private async handleWebViewNavigate(data: { webviewId: string; url: string }): Promise<{ success: boolean }> {
    // 实现WebView导航逻辑
    return { success: true }
  }

  /**
   * 处理WebView脚本执行
   */
  private async handleWebViewExecuteScript(data: WebViewExecuteScriptRequest): Promise<WebViewExecuteScriptResponse> {
    try {
      // 实现脚本执行逻辑
      return {
        result: null
      }
    } catch (error) {
      return {
        result: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * 处理WebView CSS插入
   */
  private async handleWebViewInsertCSS(data: { webviewId: string; css: string }): Promise<{ success: boolean }> {
    // 实现CSS插入逻辑
    return { success: true }
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
   * 处理存储获取
   */
  private async handleStorageGet(data: StorageRequest): Promise<StorageResponse> {
    try {
      // 实现存储获取逻辑
      return {
        value: null,
        success: true
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * 处理存储设置
   */
  private async handleStorageSet(data: StorageRequest): Promise<StorageResponse> {
    try {
      // 实现存储设置逻辑
      return {
        success: true
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * 处理存储删除
   */
  private async handleStorageDelete(data: StorageRequest): Promise<StorageResponse> {
    try {
      // 实现存储删除逻辑
      return {
        success: true
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * 处理存储清除
   */
  private async handleStorageClear(data: { namespace?: string }): Promise<StorageResponse> {
    try {
      // 实现存储清除逻辑
      return {
        success: true
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * 处理设置获取
   */
  private async handleSettingsGet(data: SettingsRequest): Promise<SettingsResponse> {
    try {
      // 实现设置获取逻辑
      return {
        settings: {},
        success: true
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * 处理设置设置
   */
  private async handleSettingsSet(data: SettingsRequest): Promise<SettingsResponse> {
    try {
      // 实现设置设置逻辑
      return {
        success: true
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * 处理设置重置
   */
  private async handleSettingsReset(data: { section?: string }): Promise<SettingsResponse> {
    try {
      // 实现设置重置逻辑
      return {
        success: true
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * 处理性能指标获取
   */
  private async handlePerformanceGetMetrics(): Promise<PerformanceMetricsResponse> {
    const { app } = require('electron')
    const metrics = app.getAppMetrics()

    return {
      cpu: {
        usage: metrics.reduce((sum, metric) => sum + (metric.cpu?.percentCPUUsage || 0), 0),
        timestamp: new Date()
      },
      memory: {
        used: metrics.reduce((sum, metric) => sum + (metric.memory?.workingSetSize || 0), 0),
        total: require('os').totalmem(),
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
      
      // 获取webview对应的session - 使用providerId而不是webviewId
      // 首先需要从webviewId映射到providerId
      const providerId = data.webviewId.replace('webview-', '')
      
      // 检查会话是否存在，如果不存在则创建
      let session = this.sessionManager.getSession(providerId)
      if (!session) {
        this.log(`Session not found for webview: ${data.webviewId}, creating new session...`)
        session = await this.sessionManager.createProviderSession(providerId)
      }

      if (data.enabled) {
        // 设置代理
        await session.setProxy({
          proxyRules: data.proxyRules
        })
        this.log(`Proxy set successfully for webview ${data.webviewId}`)
      } else {
        // 禁用代理，使用直连
        await session.setProxy({
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

  /**
   * 销毁IPC处理器
   */
  destroy(): void {
    // 移除新的IPC处理器
    ipcMain.removeHandler('get-app-version')
    ipcMain.removeHandler('get-system-info')
    ipcMain.removeHandler('minimize-window')
    ipcMain.removeHandler('close-window')
    ipcMain.removeHandler('maximize-window')
    ipcMain.removeHandler('unmaximize-window')
    ipcMain.removeHandler('is-maximized')
    ipcMain.removeHandler('send-message-to-webview')
    ipcMain.removeHandler('refresh-webview')
    ipcMain.removeHandler('refresh-all-webviews')
    ipcMain.removeHandler('load-webview')

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
