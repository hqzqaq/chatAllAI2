/**
 * 窗口控制处理器
 * 处理窗口管理相关的IPC通信，如最小化、最大化、关闭、全屏等
 */

import { IpcMainInvokeEvent } from 'electron'
import { app } from 'electron'
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

  getChannels(): string[] {
    return [
      'get-app-version',
      'get-system-info',
      'minimize-window',
      'close-window',
      'maximize-window',
      'unmaximize-window',
      'is-maximized',
      'toggle-fullscreen'
    ]
  }

  async handleInvoke(channel: string, data: any, event: IpcMainInvokeEvent): Promise<any> {
    return this.executeSafely(async() => {
      switch (channel) {
        case 'get-app-version':
          return this.handleGetAppVersion()
        case 'get-system-info':
          return this.handleGetSystemInfo()
        case 'minimize-window':
          return this.handleMinimizeWindow()
        case 'close-window':
          return this.handleCloseWindow()
        case 'maximize-window':
          return this.handleMaximizeWindow()
        case 'unmaximize-window':
          return this.handleUnmaximizeWindow()
        case 'is-maximized':
          return this.handleIsMaximized()
        case 'toggle-fullscreen':
          return this.handleToggleFullScreen()
        default:
          throw new Error(`Unknown channel: ${channel}`)
      }
    }, `WindowControlHandler.handleInvoke(${channel})`)
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleSend(channel: string, data: any, event: any): void {
    // 窗口控制不需要send类型的通道
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
   * 最小化窗口
   */
  private async handleMinimizeWindow(): Promise<void> {
    this.logger.info('Minimizing window')
    this.windowManager.minimizeWindow('main')
  }

  /**
   * 关闭窗口
   */
  private async handleCloseWindow(): Promise<void> {
    this.logger.info('Closing window')
    app.quit()
  }

  /**
   * 最大化窗口
   */
  private async handleMaximizeWindow(): Promise<void> {
    this.logger.info('Maximizing window')
    this.windowManager.maximizeWindow('main')
  }

  /**
   * 取消最大化窗口
   */
  private async handleUnmaximizeWindow(): Promise<void> {
    this.logger.info('Unmaximizing window')
    this.windowManager.unmaximizeWindow('main')
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
   * 切换全屏状态
   */
  private async handleToggleFullScreen(): Promise<void> {
    this.logger.info('Toggling fullscreen')
    this.windowManager.toggleFullScreen('main')
  }
}
