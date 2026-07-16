/**
 * WebView管理处理器
 * 处理WebView相关的IPC通信，如消息发送、刷新、脚本执行、代理设置等
 */

import { IpcMainInvokeEvent, session } from 'electron'
import * as path from 'path'
import {
  IPCChannel,
  WebViewExecuteScriptRequest,
  WebViewExecuteScriptResponse
} from '../../../src/types/ipc'
import { getSendMessageScript } from '../../../src/utils/MessageScripts'
import { buildWebViewElementId, parseProviderIdFromElementId } from '../../../src/utils/webviewHelper'
import {
  BaseIPCHandler, IWindowManager, ISessionManager, ILogger
} from './types'

export class WebViewHandler extends BaseIPCHandler {
  private windowManager: IWindowManager

  private sessionManager: ISessionManager

  constructor(windowManager: IWindowManager, sessionManager: ISessionManager, logger?: ILogger) {
    super(logger)
    this.windowManager = windowManager
    this.sessionManager = sessionManager
  }

  protected getHandlerName(): string {
    return 'WebViewHandler'
  }

  getChannels(): (IPCChannel | string)[] {
    return [
      'send-message-to-webview',
      'refresh-webview',
      'load-webview',
      'open-devtools',
      IPCChannel.WEBVIEW_EXECUTE_SCRIPT,
      IPCChannel.WEBVIEW_SET_PROXY,
      'get-preload-path',
      'clear-provider-storage'
    ]
  }

  async handleInvoke(channel: IPCChannel | string, data: any, event: IpcMainInvokeEvent): Promise<any> {
    return this.executeSafely(async() => {
      switch (channel) {
        case 'send-message-to-webview':
          return this.handleSendMessageToWebView(data)
        case 'refresh-webview':
          return this.handleRefreshWebView(data)
        case 'load-webview':
          return this.handleLoadWebView(data)
        case 'open-devtools':
          return this.handleOpenDevTools(data)
        case IPCChannel.WEBVIEW_EXECUTE_SCRIPT:
          return this.handleWebViewExecuteScript(data)
        case IPCChannel.WEBVIEW_SET_PROXY:
          return this.handleWebViewSetProxy(data)
        case 'get-preload-path':
          return this.handleGetPreloadPath(data)
        case 'clear-provider-storage':
          return this.handleClearProviderStorage(data)
        default:
          throw new Error(`Unknown channel: ${channel}`)
      }
    }, `WebViewHandler.handleInvoke(${channel})`)
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleSend(channel: IPCChannel | string, data: any, event: any): void {
    // WebView管理不需要send类型的通道
  }

  /**
   * 在WebView容器中执行脚本
   */
  private async executeInWebViewContainer(
    webviewId: string,
    innerScript: string,
    logPrefix: string
  ): Promise<any> {
    const mainWindow = this.windowManager.getMainWindow()
    if (!mainWindow || mainWindow.isDestroyed()) {
      throw new Error('Main window not available')
    }

    const elementId = buildWebViewElementId(parseProviderIdFromElementId(webviewId))
    const script = `
      (async function() {
        try {
          console.log('[IPC] ${logPrefix}...');
          const webviewElement = document.querySelector('webview[id="${elementId}"]');
          if (!webviewElement) {
            console.error('[IPC] WebView element not found: ${elementId}');
            return null;
          }
          ${innerScript}
        } catch (error) {
          console.error('[IPC] Error in ${logPrefix}:', error);
          return null;
        }
      })()
    `
    const result = await mainWindow.webContents.executeJavaScript(script)
    this.logger.info(`${logPrefix} result for ${webviewId}:`, result)
    return result
  }

  /**
   * 发送消息到WebView
   */
  private async handleSendMessageToWebView(data: { webviewId: string; message: string }): Promise<void> {
    this.logger.info(`Sending message to WebView ${data.webviewId}:`, data.message)

    const extractedProviderId = parseProviderIdFromElementId(data.webviewId)

    let scriptProviderId = extractedProviderId
    if (scriptProviderId.startsWith('summary-')) {
      scriptProviderId = scriptProviderId.replace('summary-', '')
      this.logger.info('Detected summary provider, using original provider:', scriptProviderId)
    }

    this.logger.info('Provider ID:', scriptProviderId)

    const sendScript = getSendMessageScript(scriptProviderId, data.message)
    this.logger.info('Generated send script:', sendScript)

    await this.executeInWebViewContainer(
      data.webviewId,
      `const result = await webviewElement.executeJavaScript(${JSON.stringify(sendScript)});
      return result;`,
      'Message send'
    )
  }

  /**
   * 刷新WebView
   */
  private async handleRefreshWebView(webviewId: string): Promise<void> {
    this.logger.info(`Refreshing WebView: ${webviewId}`)
    const result = await this.executeInWebViewContainer(
      webviewId,
      `if (webviewElement && webviewElement.reload) {
        webviewElement.reload();
        console.log('WebView reloaded successfully');
        return true;
      }
      return false;`,
      'WebView refresh'
    )
    if (!result) {
      throw new Error('Failed to refresh WebView - WebView may not be ready')
    }
  }

  /**
   * 加载WebView
   */
  private async handleLoadWebView(data: { webviewId: string; url: string }): Promise<void> {
    this.logger.info(`Loading WebView ${data.webviewId} with URL:`, data.url)
    // 这里应该实现实际的WebView加载逻辑
  }

  /**
   * 打开WebView控制台
   */
  private async handleOpenDevTools(webviewId: string): Promise<void> {
    this.logger.info(`Opening DevTools for WebView: ${webviewId}`)
    const result = await this.executeInWebViewContainer(
      webviewId,
      `if (webviewElement && webviewElement.openDevTools) {
        webviewElement.openDevTools();
        console.log('DevTools opened');
        return true;
      }
      return false;`,
      'DevTools open'
    )
    if (!result) {
      throw new Error('Failed to open DevTools - WebView may not be ready')
    }
  }

  /**
   * 处理WebView脚本执行
   */
  private async handleWebViewExecuteScript(
    data: WebViewExecuteScriptRequest
  ): Promise<WebViewExecuteScriptResponse> {
    this.logger.info(`Executing script in WebView ${data.webviewId}`)
    const result = await this.executeInWebViewContainer(
      data.webviewId,
      `const result = await webviewElement.executeJavaScript(${JSON.stringify(data.script)});
      return result;`,
      'Script execution'
    )
    return {
      result
    }
  }

  /**
   * 处理WebView代理设置
   */
  private async handleWebViewSetProxy(data: {
    webviewId: string
    proxyRules: string
    enabled: boolean
  }): Promise<{ success: boolean; error?: string }> {
    this.logger.info(`Setting proxy for webview ${data.webviewId}: ${data.proxyRules}`)

    let providerId = data.webviewId.replace('webview-', '')

    // 对于总结模式的provider，使用原始provider的session
    if (providerId.startsWith('summary-')) {
      providerId = providerId.replace('summary-', '')
      this.logger.info('Detected summary provider, using original provider session:', providerId)
    }

    // 检查会话是否存在，如果不存在则创建
    let electronSession = this.sessionManager.getSession(providerId)
    if (!electronSession) {
      this.logger.info(`Session not found for webview: ${data.webviewId}, creating new session...`)
      electronSession = await this.sessionManager.createProviderSession(providerId)
    }

    if (data.enabled) {
      await electronSession.setProxy({
        proxyRules: data.proxyRules
      })
      this.logger.info(`Proxy set successfully for webview ${data.webviewId}`)
    } else {
      await electronSession.setProxy({
        proxyRules: 'direct://'
      })
      this.logger.info(`Proxy disabled for webview ${data.webviewId}`)
    }

    return { success: true }
  }

  /**
   * 获取预加载脚本路径
   */
  private async handleGetPreloadPath(preloadName: string): Promise<string> {
    return path.resolve(__dirname, preloadName)
  }

  /**
   * 清除指定provider的存储数据
   */
  private async handleClearProviderStorage(providerId: string): Promise<{ success: boolean; error?: string }> {
    this.logger.info(`Clearing storage for provider: ${providerId}`)

    try {
      let electronSession = this.sessionManager.getElectronSession(providerId)

      if (!electronSession) {
        electronSession = session.fromPartition(`persist:${providerId}`)
      }

      if (electronSession) {
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
        this.logger.info(`Storage cleared successfully for ${providerId}`)
        return { success: true }
      }

      this.logger.warn(`No session found for ${providerId}`)
      return { success: false, error: 'Session not found' }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.logger.error(`Failed to clear storage for ${providerId}:`, errorMessage)
      return { success: false, error: errorMessage }
    }
  }
}
