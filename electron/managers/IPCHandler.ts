/**
 * IPC通信处理器
 * 负责处理主进程和渲染进程之间的通信
 * 重构后作为协调器，将具体业务逻辑委托给各个专职处理器
 */

import {
  ipcMain, IpcMainEvent, IpcMainInvokeEvent
} from 'electron'
import { EventEmitter } from 'events'
import { WindowManager } from './WindowManager'
import { SessionManager } from './SessionManager'
import { IPCChannel } from '../../src/types/ipc'

import {
  IIPCHandler,
  IPCHandlerConfig,
  ILogger,
  ConsoleLogger,
  AppControlHandler,
  WindowControlHandler,
  WebViewHandler,
  SessionHandler,
  MessageHandler,
  FileOperationHandler,
  MonitoringHandler,
  IMessageSender
} from './handlers'

/**
 * IPC通信处理器类
 * 协调各个业务处理器，负责注册和路由IPC通信
 */
export class IPCHandler extends EventEmitter implements IMessageSender {
  private windowManager: WindowManager

  private sessionManager: SessionManager

  private config: IPCHandlerConfig

  private logger: ILogger

  private handlers: IIPCHandler[] = []

  private invokeHandlers: Map<string, Function> = new Map()

  private messageHandlers: Map<string, Function> = new Map()

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
    this.logger = new ConsoleLogger('IPCHandler')

    this.initializeHandlers()
  }

  /**
   * 初始化IPC处理器
   * 创建并注册各个业务处理器
   */
  private initializeHandlers(): void {
    this.log('Initializing IPC handlers...')

    // 创建各个专职处理器
    const handlers: IIPCHandler[] = [
      new AppControlHandler(this.config),
      new WindowControlHandler(this.windowManager),
      new WebViewHandler(this.windowManager, this.sessionManager),
      new SessionHandler(this.sessionManager),
      new MessageHandler(this.sessionManager, this),
      new FileOperationHandler(this.windowManager),
      new MonitoringHandler(this.windowManager, this.sessionManager, this)
    ]

    // 注册所有处理器
    handlers.forEach((handler) => this.registerHandler(handler))

    this.log('IPC handlers initialized')
  }

  /**
   * 注册处理器
   */
  private registerHandler(handler: IIPCHandler): void {
    this.handlers.push(handler)

    // 注册invoke处理器（双向通信）
    handler.getChannels().forEach((channel) => {
      this.registerInvokeHandler(channel, handler)
    })

    // 注册send处理器（单向通信）
    handler.getChannels().forEach((channel) => {
      this.registerSendHandler(channel, handler)
    })
  }

  /**
   * 注册invoke处理器
   */
  private registerInvokeHandler(channel: string, handler: IIPCHandler): void {
    this.invokeHandlers.set(channel, handler)

    ipcMain.handle(channel, async(event: IpcMainInvokeEvent, data: any) => {
      try {
        this.log(`Handling invoke: ${channel}`, data)
        const result = await handler.handleInvoke(channel, data, event)
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
  private registerSendHandler(channel: string, handler: IIPCHandler): void {
    this.messageHandlers.set(channel, handler)

    ipcMain.on(channel, (event: IpcMainEvent, data: any) => {
      try {
        this.log(`Handling send: ${channel}`, data)
        handler.handleSend(channel, data, event)
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
    // 移除所有IPC处理器
    this.invokeHandlers.forEach((_, channel) => {
      ipcMain.removeHandler(channel)
    })

    this.messageHandlers.forEach((_, channel) => {
      ipcMain.removeAllListeners(channel)
    })

    // 清理处理器映射
    this.invokeHandlers.clear()
    this.messageHandlers.clear()
    this.handlers = []

    // 移除所有事件监听器
    this.removeAllListeners()

    this.log('IPC handler destroyed')
  }
}
