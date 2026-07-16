/**
 * 窗口与应用控制处理器
 * 统一处理窗口控制、应用信息和应用生命周期相关的 IPC 通信
 */

import { IpcMainInvokeEvent, app } from 'electron'
import { IPCChannel } from '../../../src/types/ipc'
import { BaseIPCHandler, IWindowManager, ILogger } from './types'

export class WindowControlHandler extends BaseIPCHandler {
  private windowManager: IWindowManager

  constructor(windowManager: IWindowManager, logger?: ILogger) {
    super(logger)
    this.windowManager = windowManager
  }

  protected getHandlerName(): string {
    return 'WindowControlHandler'
  }

  getChannels(): (IPCChannel | string)[] {
    return [
      // 窗口控制
      IPCChannel.MINIMIZE_WINDOW,
      IPCChannel.MAXIMIZE_WINDOW,
      IPCChannel.UNMAXIMIZE_WINDOW,
      IPCChannel.CLOSE_WINDOW,
      IPCChannel.TOGGLE_FULLSCREEN,
      IPCChannel.IS_MAXIMIZED,

      // 应用信息
      IPCChannel.GET_APP_VERSION,
      IPCChannel.GET_SYSTEM_INFO,

      // 应用生命周期
      IPCChannel.APP_READY,
      IPCChannel.APP_QUIT
    ]
  }

  async handleInvoke(channel: IPCChannel | string, data: any, event: IpcMainInvokeEvent): Promise<any> {
    return this.executeSafely(async() => {
      switch (channel) {
        // 窗口控制
        case IPCChannel.MINIMIZE_WINDOW:
          return this.handleMinimizeWindow()
        case IPCChannel.MAXIMIZE_WINDOW:
          return this.handleMaximizeWindow()
        case IPCChannel.UNMAXIMIZE_WINDOW:
          return this.handleUnmaximizeWindow()
        case IPCChannel.CLOSE_WINDOW:
          return this.handleCloseWindow()
        case IPCChannel.TOGGLE_FULLSCREEN:
          return this.handleToggleFullScreen()
        case IPCChannel.IS_MAXIMIZED:
          return this.handleIsMaximized()

        // 应用信息
        case IPCChannel.GET_APP_VERSION:
          return this.handleGetAppVersion()
        case IPCChannel.GET_SYSTEM_INFO:
          return this.handleGetSystemInfo()

        // 应用生命周期
        case IPCChannel.APP_READY:
          return this.handleAppReady()
        case IPCChannel.APP_QUIT:
          return this.handleAppQuit()

        default:
          throw new Error(`Unknown channel: ${channel}`)
      }
    }, `WindowControlHandler.handleInvoke(${channel})`)
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleSend(channel: IPCChannel | string, data: any, event: any): void {
    // 窗口与应用控制不需要 send 类型的通道
  }

  /**
   * 最小化窗口
   */
  private async handleMinimizeWindow(): Promise<{ success: boolean }> {
    this.logger.info('Minimizing window')
    const success = this.windowManager.minimizeWindow('main')
    return { success }
  }

  /**
   * 最大化窗口
   */
  private async handleMaximizeWindow(): Promise<{ success: boolean }> {
    this.logger.info('Maximizing window')
    const success = this.windowManager.maximizeWindow('main')
    return { success }
  }

  /**
   * 取消最大化窗口
   */
  private async handleUnmaximizeWindow(): Promise<{ success: boolean }> {
    this.logger.info('Unmaximizing window')
    const success = this.windowManager.unmaximizeWindow('main')
    return { success }
  }

  /**
   * 关闭窗口并退出应用
   */
  private async handleCloseWindow(): Promise<{ success: boolean }> {
    this.logger.info('Closing window')
    app.quit()
    return { success: true }
  }

  /**
   * 切换全屏状态
   */
  private async handleToggleFullScreen(): Promise<{ success: boolean }> {
    this.logger.info('Toggling fullscreen')
    const success = this.windowManager.toggleFullScreen('main')
    return { success }
  }

  /**
   * 检查窗口是否最大化
   */
  private async handleIsMaximized(): Promise<boolean> {
    this.logger.info('Checking if window is maximized')
    const window = this.windowManager.getMainWindow()
    return window ? window.isMaximized() : false
  }

  /**
   * 获取应用版本
   */
  private async handleGetAppVersion(): Promise<string> {
    this.logger.info('Getting app version')
    return app.getVersion()
  }

  /**
   * 获取系统信息
   */
  private async handleGetSystemInfo(): Promise<{ platform: string; nodeVersion: string; electronVersion: string }> {
    this.logger.info('Getting system info')
    return {
      platform: process.platform,
      nodeVersion: process.versions.node,
      electronVersion: process.versions.electron || 'Unknown'
    }
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
}
