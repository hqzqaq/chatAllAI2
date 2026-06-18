/**
 * IPC处理器基础类型定义
 * 提供处理器接口、错误处理和日志记录的基础架构
 */

/* eslint-disable max-classes-per-file */

import {
  IpcMainEvent, IpcMainInvokeEvent, BrowserWindow, Session
} from 'electron'
import { IPCChannel, ProviderCookieInput, ProviderImportCookiesResponse } from '../../../src/types/ipc'

// ==================== 依赖接口 ====================

/**
 * 窗口管理器接口
 * 用于解耦处理器与具体实现，便于测试
 */
export interface IWindowManager {
  getWindow(windowId: string): BrowserWindow | null
  getMainWindow(): BrowserWindow | null
  getAllWindows(): Map<string, BrowserWindow>
  minimizeWindow(windowId: string): boolean
  maximizeWindow(windowId: string): boolean
  unmaximizeWindow(windowId: string): boolean
  showWindow(windowId: string): boolean
  toggleFullScreen(windowId: string): void
}

/**
 * 会话管理器接口
 * 用于解耦处理器与具体实现，便于测试
 */
export interface ISessionManager {
  saveSession(providerId: string): Promise<boolean>
  loadSession(providerId: string): Promise<any | null>
  clearSession(providerId: string): Promise<boolean>
  hasSession(providerId: string): Promise<boolean>
  isSessionActive(providerId: string): Promise<boolean>
  getActiveSessionIds(): string[]
  getElectronSession(providerId: string): Session | null
  getSession(providerId: string): Session | null
  createProviderSession(providerId: string): Promise<Session>
  importCookies(
    providerId: string,
    cookies: ProviderCookieInput[]
  ): Promise<ProviderImportCookiesResponse>
}

/**
 * IPC处理器配置接口
 */
export interface IPCHandlerConfig {
  enableLogging?: boolean
  requestTimeout?: number
  maxRetries?: number
}

// ==================== 日志接口 ====================

/**
 * 结构化日志记录器接口
 */
export interface ILogger {
  info(message: string, meta?: any): void
  error(message: string, meta?: any): void
  warn(message: string, meta?: any): void
  debug(message: string, meta?: any): void
}

/**
 * 控制台日志实现
 */
export class ConsoleLogger implements ILogger {
  private prefix: string

  constructor(prefix: string) {
    this.prefix = prefix
  }

  info(message: string, meta?: any): void {
    console.log(`[${this.prefix}] INFO: ${message}`, meta || '')
  }

  error(message: string, meta?: any): void {
    console.error(`[${this.prefix}] ERROR: ${message}`, meta || '')
  }

  warn(message: string, meta?: any): void {
    console.warn(`[${this.prefix}] WARN: ${message}`, meta || '')
  }

  debug(message: string, meta?: any): void {
    console.debug(`[${this.prefix}] DEBUG: ${message}`, meta || '')
  }
}

// ==================== 错误处理 ====================

/**
 * IPC自定义错误类型
 */
export class IPCError extends Error {
  constructor(
    message: string,
    public readonly context: string,
    public readonly originalStack?: string
  ) {
    super(message)
    this.name = 'IPCError'
  }
}

/**
 * 统一错误处理器
 */
export class IPCErrorHandler {
  static handle(error: unknown, context: string, logger: ILogger): never {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined

    logger.error(`${context}: ${errorMessage}`, { stack: errorStack })

    throw new IPCError(errorMessage, context, errorStack)
  }
}

// ==================== 处理器接口 ====================

/**
 * IPC处理器基础接口
 * 所有处理器必须实现此接口
 */
export interface IIPCHandler {
  /**
   * 获取处理器支持的通道列表
   */
  getChannels(): (IPCChannel | string)[]

  /**
   * 处理invoke类型请求（双向通信）
   */
  handleInvoke(channel: IPCChannel | string, data: any, event: IpcMainInvokeEvent): Promise<any>

  /**
   * 处理send类型请求（单向通信）
   */
  handleSend(channel: IPCChannel | string, data: any, event: IpcMainEvent): void
}

/**
 * IPC处理器基类
 * 提供统一的错误处理和日志记录机制
 */
export abstract class BaseIPCHandler implements IIPCHandler {
  protected logger: ILogger

  constructor(logger?: ILogger) {
    this.logger = logger || new ConsoleLogger(this.getHandlerName())
  }

  /**
   * 获取处理器名称，用于日志前缀
   */
  protected abstract getHandlerName(): string

  /**
   * 安全执行异步操作，统一错误处理
   */
  protected async executeSafely<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<T> {
    try {
      return await operation()
    } catch (error) {
      return IPCErrorHandler.handle(error, context, this.logger)
    }
  }

  /**
   * 安全执行同步操作，统一错误处理
   */
  protected executeSafelySync<T>(
    operation: () => T,
    context: string
  ): T {
    try {
      return operation()
    } catch (error) {
      return IPCErrorHandler.handle(error, context, this.logger)
    }
  }

  /**
   * 子类实现：获取支持的通道列表
   */
  abstract getChannels(): (IPCChannel | string)[]

  /**
   * 子类实现：处理invoke请求
   */
  abstract handleInvoke(channel: IPCChannel | string, data: any, event: IpcMainInvokeEvent): Promise<any>

  /**
   * 子类实现：处理send请求
   */
  abstract handleSend(channel: IPCChannel | string, data: any, event: IpcMainEvent): void
}
