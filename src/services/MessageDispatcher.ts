/**
 * 消息分发器服务
 * 负责统一输入消息的分发和状态管理
 */

import type { AIProvider, Message } from '../types'

/**
 * 浏览器兼容的事件发射器
 */
class BrowserEventEmitter {
    private listeners: Map<string, Function[]> = new Map()

    on(event: string, listener: Function): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, [])
        }
        this.listeners.get(event)!.push(listener)
    }

    off(event: string, listener: Function): void {
        const eventListeners = this.listeners.get(event)
        if (eventListeners) {
            const index = eventListeners.indexOf(listener)
            if (index > -1) {
                eventListeners.splice(index, 1)
            }
        }
    }

    emit(event: string, ...args: any[]): void {
        const eventListeners = this.listeners.get(event)
        if (eventListeners) {
            eventListeners.forEach(listener => {
                try {
                    listener(...args)
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error)
                }
            })
        }
    }

    removeAllListeners(): void {
        this.listeners.clear()
    }
}

/**
 * 消息发送状态
 */
export type MessageSendStatus = 'idle' | 'sending' | 'sent' | 'error'

/**
 * 消息发送结果
 */
export interface MessageSendResult {
    providerId: string
    success: boolean
    messageId: string
    error?: string
    timestamp: Date
}

/**
 * 消息分发配置
 */
export interface MessageDispatcherConfig {
    timeout: number
    retryAttempts: number
    retryDelay: number
    enableLogging: boolean
}

/**
 * 消息分发器类
 */
export class MessageDispatcher extends BrowserEventEmitter {
    private config: MessageDispatcherConfig
    private sendingStatus: Map<string, MessageSendStatus> = new Map()
    private messageQueue: Map<string, Message> = new Map()
    private retryCount: Map<string, number> = new Map()

    constructor(config: Partial<MessageDispatcherConfig> = {}) {
        super()
        this.config = {
            timeout: 30000,
            retryAttempts: 3,
            retryDelay: 1000,
            enableLogging: true,
            ...config
        }
    }

    /**
     * 发送消息到指定提供商
     */
    async sendMessage(
        content: string,
        providers: AIProvider[],
        messageId?: string
    ): Promise<MessageSendResult[]> {
        const finalMessageId = messageId || this.generateMessageId()
        const results: MessageSendResult[] = []

        this.log(`Starting message dispatch for ${providers.length} providers`, { messageId: finalMessageId, content })

        // 创建消息对象
        const message: Message = {
            id: finalMessageId,
            content,
            timestamp: new Date(),
            sender: 'user',
            providerId: '',
            status: 'sending'
        }

        // 将消息添加到队列
        this.messageQueue.set(finalMessageId, message)

        // 并发发送到所有提供商
        const sendPromises = providers.map(provider =>
            this.sendToProvider(provider, message)
        )

        try {
            const settledResults = await Promise.allSettled(sendPromises)

            settledResults.forEach((result, index) => {
                const provider = providers[index]
                if (result.status === 'fulfilled') {
                    results.push(result.value)
                } else {
                    results.push({
                        providerId: provider.id,
                        success: false,
                        messageId: finalMessageId,
                        error: result.reason?.message || 'Unknown error',
                        timestamp: new Date()
                    })
                }
            })

            // 清理队列
            this.messageQueue.delete(finalMessageId)

            this.log(`Message dispatch completed`, { messageId: finalMessageId, results })
            this.emit('message-sent', { messageId: finalMessageId, results })

            return results
        } catch (error) {
            this.log(`Message dispatch failed`, { messageId: finalMessageId, error })
            this.messageQueue.delete(finalMessageId)
            throw error
        }
    }

    /**
     * 发送消息到单个提供商
     */
    private async sendToProvider(
        provider: AIProvider,
        message: Message
    ): Promise<MessageSendResult> {
        const providerId = provider.id
        const messageId = message.id

        try {
            // 设置发送状态
            this.setSendingStatus(providerId, 'sending')
            this.emit('status-changed', { providerId, status: 'sending', messageId })

            this.log(`Sending message to provider ${providerId}`, { messageId, webviewId: provider.webviewId })

            // 通过IPC发送消息到WebView
            if (window.electronAPI) {
                await Promise.race([
                    window.electronAPI.sendMessageToWebView(provider.webviewId, message.content),
                    this.createTimeoutPromise(this.config.timeout)
                ])

                // 设置成功状态
                this.setSendingStatus(providerId, 'sent')
                this.emit('status-changed', { providerId, status: 'sent', messageId })

                const result: MessageSendResult = {
                    providerId,
                    success: true,
                    messageId,
                    timestamp: new Date()
                }

                this.log(`Message sent successfully to provider ${providerId}`, result)
                return result
            } else {
                throw new Error('Electron API not available')
            }
        } catch (error) {
            this.log(`Failed to send message to provider ${providerId}`, { messageId, error })

            // 设置错误状态
            this.setSendingStatus(providerId, 'error')
            this.emit('status-changed', { providerId, status: 'error', messageId, error })

            // 检查是否需要重试
            const currentRetryCount = this.retryCount.get(`${messageId}-${providerId}`) || 0
            if (currentRetryCount < this.config.retryAttempts) {
                this.retryCount.set(`${messageId}-${providerId}`, currentRetryCount + 1)

                this.log(`Retrying message send to provider ${providerId} (attempt ${currentRetryCount + 1})`)

                // 延迟后重试
                await this.delay(this.config.retryDelay * (currentRetryCount + 1))
                return this.sendToProvider(provider, message)
            }

            const result: MessageSendResult = {
                providerId,
                success: false,
                messageId,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date()
            }

            return result
        }
    }

    /**
     * 获取提供商的发送状态
     */
    getSendingStatus(providerId: string): MessageSendStatus {
        return this.sendingStatus.get(providerId) || 'idle'
    }

    /**
     * 设置提供商的发送状态
     */
    private setSendingStatus(providerId: string, status: MessageSendStatus): void {
        this.sendingStatus.set(providerId, status)
    }

    /**
     * 获取所有提供商的发送状态
     */
    getAllSendingStatus(): Record<string, MessageSendStatus> {
        const status: Record<string, MessageSendStatus> = {}
        this.sendingStatus.forEach((value, key) => {
            status[key] = value
        })
        return status
    }

    /**
     * 重置提供商状态
     */
    resetProviderStatus(providerId: string): void {
        this.sendingStatus.set(providerId, 'idle')
        // 清理重试计数
        const keysToDelete = Array.from(this.retryCount.keys()).filter(key =>
            key.endsWith(`-${providerId}`)
        )
        keysToDelete.forEach(key => this.retryCount.delete(key))
    }

    /**
     * 重置所有状态
     */
    resetAllStatus(): void {
        this.sendingStatus.clear()
        this.retryCount.clear()
        this.messageQueue.clear()
    }

    /**
     * 检查是否有正在发送的消息
     */
    hasSendingMessages(): boolean {
        return Array.from(this.sendingStatus.values()).some(status => status === 'sending')
    }

    /**
     * 获取队列中的消息数量
     */
    getQueueSize(): number {
        return this.messageQueue.size
    }

    /**
     * 取消消息发送
     */
    cancelMessage(messageId: string): void {
        this.messageQueue.delete(messageId)
        this.emit('message-cancelled', { messageId })
        this.log(`Message cancelled`, { messageId })
    }

    /**
     * 创建超时Promise
     */
    private createTimeoutPromise(timeout: number): Promise<never> {
        return new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Message send timeout after ${timeout}ms`))
            }, timeout)
        })
    }

    /**
     * 延迟函数
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms))
    }

    /**
     * 生成消息ID
     */
    private generateMessageId(): string {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    /**
     * 日志记录
     */
    private log(message: string, data?: any): void {
        if (this.config.enableLogging) {
            console.log(`[MessageDispatcher] ${message}`, data || '')
        }
    }

    /**
     * 销毁分发器
     */
    destroy(): void {
        this.resetAllStatus()
        this.removeAllListeners()
        this.log('MessageDispatcher destroyed')
    }
}

/**
 * 全局消息分发器实例
 */
export const messageDispatcher = new MessageDispatcher()