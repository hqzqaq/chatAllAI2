/**
 * 应用控制处理器
 * 处理应用级别的IPC通信，如应用就绪、退出、最小化、最大化等
 */

import { IpcMainInvokeEvent } from 'electron'
import { app } from 'electron'
import { IPCChannel } from '../../../src/types/ipc'
import { BaseIPCHandler, IPCHandlerConfig, ILogger } from './types'

export class AppControlHandler extends BaseIPCHandler {
  private config: IPCHandlerConfig

  constructor(config: IPCHandlerConfig, logger?: ILogger) {
    super(logger)
    this.config = config
  }

  protected getHandlerName(): string {
    return 'AppControlHandler'
  }

  getChannels(): IPCChannel[] {
    return [
      IPCChannel.APP_READY,
      IPCChannel.APP_QUIT,
      IPCChannel.APP_MINIMIZE,
      IPCChannel.APP_MAXIMIZE,
      IPCChannel.APP_RESTORE
    ]
  }

  async handleInvoke(channel: IPCChannel, data: any, event: IpcMainInvokeEvent): Promise<any> {
    return this.executeSafely(async() => {
      switch (channel) {
        case IPCChannel.APP_READY:
          return this.handleAppReady()
        case IPCChannel.APP_QUIT:
          return this.handleAppQuit()
        case IPCChannel.APP_MINIMIZE:
          return this.handleAppMinimize()
        case IPCChannel.APP_MAXIMIZE:
          return this.handleAppMaximize()
        case IPCChannel.APP_RESTORE:
          return this.handleAppRestore()
        default:
          throw new Error(`Unknown channel: ${channel}`)
      }
    }, `AppControlHandler.handleInvoke(${channel})`)
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleSend(channel: IPCChannel, data: any, event: any): void {
    // 应用控制不需要send类型的通道
  }

  /**
   * 处理应用就绪
   */
  private async handleAppReady(): Promise<{ success: boolean; version: string }> {
    this.logger.info('Application ready')
    return {
      success: true,
      version: app.getVersion()
    }
  }

  /**
   * 处理应用退出
   */
  private async handleAppQuit(): Promise<{ success: boolean }> {
    this.logger.info('Application quitting')
    app.quit()
    return { success: true }
  }

  /**
   * 处理应用最小化
   */
  private async handleAppMinimize(): Promise<{ success: boolean }> {
    this.logger.info('Application minimizing')
    // 应用最小化由窗口管理器处理，这里只返回成功状态
    return { success: true }
  }

  /**
   * 处理应用最大化
   */
  private async handleAppMaximize(): Promise<{ success: boolean }> {
    this.logger.info('Application maximizing')
    // 应用最大化由窗口管理器处理，这里只返回成功状态
    return { success: true }
  }

  /**
   * 处理应用恢复
   */
  private async handleAppRestore(): Promise<{ success: boolean }> {
    this.logger.info('Application restoring')
    // 应用恢复由窗口管理器处理，这里只返回成功状态
    return { success: true }
  }
}
