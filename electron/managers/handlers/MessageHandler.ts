/**
 * 消息处理处理器
 * 处理消息发送和接收相关的IPC通信
 */

import { IpcMainEvent, IpcMainInvokeEvent } from 'electron'
import {
  IPCChannel,
  MessageSendRequest,
  MessageSendResponse
} from '../../../src/types/ipc'
import { BaseIPCHandler, ISessionManager, ILogger } from './types'

/**
 * 消息处理器接口
 * 用于向渲染进程发送消息
 */
export interface IMessageSender {
  sendToRenderer<T = any>(channel: IPCChannel, data?: T, windowId?: string): void
}

export class MessageHandler extends BaseIPCHandler {
  private sessionManager: ISessionManager

  private messageSender: IMessageSender

  constructor(sessionManager: ISessionManager, messageSender: IMessageSender, logger?: ILogger) {
    super(logger)
    this.sessionManager = sessionManager
    this.messageSender = messageSender
  }

  protected getHandlerName(): string {
    return 'MessageHandler'
  }

  getChannels(): IPCChannel[] {
    return [
      IPCChannel.MESSAGE_SEND,
      IPCChannel.MESSAGE_SEND_ALL,
      IPCChannel.MESSAGE_RECEIVED,
      IPCChannel.MESSAGE_ERROR
    ]
  }

  async handleInvoke(channel: IPCChannel, data: any, event: IpcMainInvokeEvent): Promise<any> {
    return this.executeSafely(async() => {
      switch (channel) {
        case IPCChannel.MESSAGE_SEND:
          return this.handleMessageSend(data)
        case IPCChannel.MESSAGE_SEND_ALL:
          return this.handleMessageSendAll(data)
        default:
          throw new Error(`Unknown invoke channel: ${channel}`)
      }
    }, `MessageHandler.handleInvoke(${channel})`)
  }

  handleSend(channel: IPCChannel, data: any, event: IpcMainEvent): void {
    this.executeSafelySync(() => {
      switch (channel) {
        case IPCChannel.MESSAGE_RECEIVED:
          this.handleMessageReceived(data)
          break
        case IPCChannel.MESSAGE_ERROR:
          this.handleMessageError(data)
          break
        default:
          throw new Error(`Unknown send channel: ${channel}`)
      }
    }, `MessageHandler.handleSend(${channel})`)
  }

  /**
   * 处理消息发送
   */
  private async handleMessageSend(data: MessageSendRequest): Promise<MessageSendResponse> {
    const { content, targetProviders, messageId } = data
    const finalMessageId = messageId || this.generateId()
    const results: MessageSendResponse['results'] = []

    const providers = targetProviders || this.sessionManager.getActiveSessionIds()

    this.logger.info('Sending message to providers:', providers)

    await Promise.all(providers.map(async(providerId) => {
      try {
        // 这里应该实现实际的消息发送逻辑
        // 暂时返回成功状态
        results.push({
          providerId,
          success: true
        })

        // 通知渲染进程消息已发送
        this.messageSender.sendToRenderer(IPCChannel.MESSAGE_RECEIVED, {
          messageId: finalMessageId,
          providerId,
          content
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        results.push({
          providerId,
          success: false,
          error: errorMessage
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
    const allProviders = this.sessionManager.getActiveSessionIds()
    return this.handleMessageSend({
      ...data,
      targetProviders: allProviders
    })
  }

  /**
   * 处理消息接收
   */
  private handleMessageReceived(data: { messageId: string; providerId: string; content: string }): void {
    this.logger.info('Message received:', data)
    // 这里可以触发事件或进行其他处理
  }

  /**
   * 处理消息错误
   */
  private handleMessageError(data: { messageId: string; providerId: string; error: string }): void {
    this.logger.error('Message error:', data)
    // 这里可以触发事件或进行其他处理
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}
