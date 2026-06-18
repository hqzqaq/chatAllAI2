/**
 * 监控功能处理器
 * 处理性能监控和AI状态监控相关的IPC通信
 */

import { IpcMainInvokeEvent, IpcMainEvent, app } from 'electron'
import * as os from 'os'
import {
  IPCChannel,
  PerformanceMetricsResponse,
  AIStatusStartMonitoringRequest,
  AIStatusStartMonitoringResponse,
  AIStatusInfo,
  AIStatusChangeEvent
} from '../../../src/types/ipc'
import { getStatusMonitorScript, getStopMonitorScript } from '../../../src/utils/StatusMonitorScripts'
import {
  BaseIPCHandler, IWindowManager, ISessionManager, ILogger
} from './types'

/**
 * 消息发送器接口
 */
export interface IMessageSender {
  sendToRenderer<T = any>(channel: IPCChannel, data?: T, windowId?: string): void
}

export class MonitoringHandler extends BaseIPCHandler {
  private windowManager: IWindowManager

  private sessionManager: ISessionManager

  private messageSender: IMessageSender

  private aiStatusMonitorListeners?: { [webviewId: string]: (event: any) => void }

  constructor(
    windowManager: IWindowManager,
    sessionManager: ISessionManager,
    messageSender: IMessageSender,
    logger?: ILogger
  ) {
    super(logger)
    this.windowManager = windowManager
    this.sessionManager = sessionManager
    this.messageSender = messageSender
  }

  protected getHandlerName(): string {
    return 'MonitoringHandler'
  }

  getChannels(): (IPCChannel | string)[] {
    return [
      IPCChannel.PERFORMANCE_GET_METRICS,
      IPCChannel.AI_STATUS_START_MONITORING,
      IPCChannel.AI_STATUS_STOP_MONITORING,
      IPCChannel.AI_STATUS_GET_CURRENT,
      'webview-ai-status-change',
      'internal-ai-status-change'
    ]
  }

  async handleInvoke(channel: IPCChannel | string, data: any, event: IpcMainInvokeEvent): Promise<any> {
    return this.executeSafely(async() => {
      switch (channel) {
        case IPCChannel.PERFORMANCE_GET_METRICS:
          return this.handlePerformanceGetMetrics()
        case IPCChannel.AI_STATUS_START_MONITORING:
          return this.handleAIStatusStartMonitoring(data)
        case IPCChannel.AI_STATUS_STOP_MONITORING:
          return this.handleAIStatusStopMonitoring(data)
        case IPCChannel.AI_STATUS_GET_CURRENT:
          return this.handleAIStatusGetCurrent(data)
        default:
          throw new Error(`Unknown invoke channel: ${channel}`)
      }
    }, `MonitoringHandler.handleInvoke(${channel})`)
  }

  handleSend(channel: IPCChannel | string, data: any, event: IpcMainEvent): void {
    this.executeSafelySync(() => {
      switch (channel) {
        case 'webview-ai-status-change':
          this.handleWebViewAIStatusChange(data)
          break
        case 'internal-ai-status-change':
          this.handleInternalAIStatusChange(data)
          break
        default:
          throw new Error(`Unknown send channel: ${channel}`)
      }
    }, `MonitoringHandler.handleSend(${channel})`)
  }

  /**
   * 处理性能指标获取
   */
  private async handlePerformanceGetMetrics(): Promise<PerformanceMetricsResponse> {
    this.logger.info('Getting performance metrics')
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
   * 处理AI状态监控启动
   */
  private async handleAIStatusStartMonitoring(
    data: AIStatusStartMonitoringRequest
  ): Promise<AIStatusStartMonitoringResponse> {
    this.logger.info(`Starting AI status monitoring for webview ${data.webviewId}, provider ${data.providerId}`)

    if (data.providerId === 'chatgpt') {
      return { success: false }
    }

    try {
      const statusMonitorScript = getStatusMonitorScript(data.providerId)

      // 在WebView中执行监控脚本
      const mainWindow = this.windowManager.getMainWindow()
      if (!mainWindow || mainWindow.isDestroyed()) {
        throw new Error('Main window not available')
      }

      const script = `
        (async function() {
          try {
            const webviewElement = document.querySelector('webview[id="webview-${data.providerId}"]');
            if (!webviewElement) {
              console.error('[IPC] WebView element not found');
              return false;
            }
            await webviewElement.executeJavaScript(${JSON.stringify(statusMonitorScript)});
            return true;
          } catch (error) {
            console.error('[IPC] Error starting AI status monitoring:', error);
            return false;
          }
        })()
      `

      const result = await mainWindow.webContents.executeJavaScript(script)

      if (result) {
        this.logger.info(`AI status monitoring started successfully for ${data.webviewId}`)
        return { success: true }
      }
      throw new Error('Failed to start AI status monitoring script.')
    } catch (error) {
      this.logger.error(`Failed to start AI status monitoring for ${data.webviewId}:`, error)
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
    this.logger.info(`Stopping AI status monitoring for provider ${data.providerId}`)

    try {
      const webviewId = `webview-${data.providerId}`
      const stopScript = getStopMonitorScript()

      try {
        const mainWindow = this.windowManager.getMainWindow()
        if (mainWindow && !mainWindow.isDestroyed()) {
          const script = `
            (async function() {
              try {
                const webviewElement = document.querySelector('webview[id="${webviewId}"]');
                if (!webviewElement) return false;
                await webviewElement.executeJavaScript(${JSON.stringify(stopScript)});
                return true;
              } catch (error) {
                return false;
              }
            })()
          `
          await mainWindow.webContents.executeJavaScript(script)
        }
      } catch (execError) {
        this.logger.warn(`WebView not available for stopping monitoring ${data.providerId}, skipping script injection`)
      }

      // 清理监听器
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

      this.logger.info(`AI status monitoring stopped for provider ${data.providerId}`)
      return { success: true }
    } catch (error) {
      this.logger.error(`Failed to stop AI status monitoring for ${data.providerId}:`, error)
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
    this.logger.info(`Getting current AI status for provider ${data.providerId}`)

    // 这里可以查询当前状态，暂时返回默认状态
    const defaultStatus: AIStatusInfo = {
      providerId: data.providerId,
      status: 'waiting_input',
      timestamp: Date.now()
    }

    return defaultStatus
  }

  /**
   * 处理WebView AI状态变化
   */
  private handleWebViewAIStatusChange(data: {
    providerId: string
    status: string
    details?: any
  }): void {
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

    this.messageSender.sendToRenderer(IPCChannel.AI_STATUS_CHANGE, statusChangeEvent)
    this.logger.info(`AI status changed for ${providerId}: ${mappedStatus}`)
  }

  /**
   * 处理内部AI状态变化
   */
  private handleInternalAIStatusChange(data: {
    providerId: string
    statusData: {
      status: string
      details?: any
    }
  }): void {
    const { providerId, statusData } = data
    this.logger.info(`Internal AI status changed for ${providerId}:`, statusData)

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
    this.messageSender.sendToRenderer(IPCChannel.AI_STATUS_CHANGE, statusChangeEvent)
    this.logger.info(`AI status changed for ${providerId}: ${status}`)
  }
}
