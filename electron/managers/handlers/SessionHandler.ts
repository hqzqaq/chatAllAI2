/**
 * 会话管理处理器
 * 处理会话相关的IPC通信，如保存、加载、清除、检查会话等
 */

import { IpcMainInvokeEvent } from 'electron'
import {
  IPCChannel,
  SessionSaveRequest,
  SessionLoadRequest,
  SessionLoadResponse
} from '../../../src/types/ipc'
import { BaseIPCHandler, ISessionManager, ILogger } from './types'

export class SessionHandler extends BaseIPCHandler {
  private sessionManager: ISessionManager

  constructor(sessionManager: ISessionManager, logger?: ILogger) {
    super(logger)
    this.sessionManager = sessionManager
  }

  protected getHandlerName(): string {
    return 'SessionHandler'
  }

  getChannels(): IPCChannel[] {
    return [
      IPCChannel.SESSION_SAVE,
      IPCChannel.SESSION_LOAD,
      IPCChannel.SESSION_CLEAR,
      IPCChannel.SESSION_CHECK
    ]
  }

  async handleInvoke(channel: IPCChannel, data: any, event: IpcMainInvokeEvent): Promise<any> {
    return this.executeSafely(async() => {
      switch (channel) {
        case IPCChannel.SESSION_SAVE:
          return this.handleSessionSave(data)
        case IPCChannel.SESSION_LOAD:
          return this.handleSessionLoad(data)
        case IPCChannel.SESSION_CLEAR:
          return this.handleSessionClear(data)
        case IPCChannel.SESSION_CHECK:
          return this.handleSessionCheck(data)
        default:
          throw new Error(`Unknown channel: ${channel}`)
      }
    }, `SessionHandler.handleInvoke(${channel})`)
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleSend(channel: IPCChannel, data: any, event: any): void {
    // 会话管理不需要send类型的通道
  }

  /**
   * 处理会话保存
   */
  private async handleSessionSave(data: SessionSaveRequest): Promise<{ success: boolean }> {
    this.logger.info(`Saving session for provider: ${data.providerId}`)
    const success = await this.sessionManager.saveSession(data.providerId)
    return { success }
  }

  /**
   * 处理会话加载
   */
  private async handleSessionLoad(data: SessionLoadRequest): Promise<SessionLoadResponse> {
    this.logger.info(`Loading session for provider: ${data.providerId}`)
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
    this.logger.info(`Clearing session for provider: ${data.providerId}`)
    const success = await this.sessionManager.clearSession(data.providerId)
    return { success }
  }

  /**
   * 处理会话检查
   */
  private async handleSessionCheck(data: { providerId: string }): Promise<{ exists: boolean; active: boolean }> {
    this.logger.info(`Checking session for provider: ${data.providerId}`)
    const exists = await this.sessionManager.hasSession(data.providerId)
    const active = await this.sessionManager.isSessionActive(data.providerId)
    return { exists, active }
  }
}
