/**
 * MessageDispatcher 单元测试
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest'
import { MessageDispatcher } from '../../services/MessageDispatcher'
import type { AIProvider } from '../../types'

// Mock window.electronAPI
const mockElectronAPI = {
    sendMessageToWebView: vi.fn()
}

Object.defineProperty(window, 'electronAPI', {
    value: mockElectronAPI,
    writable: true
})

describe('MessageDispatcher', () => {
    let dispatcher: MessageDispatcher
    let mockProviders: AIProvider[]

    beforeEach(() => {
        dispatcher = new MessageDispatcher({
            timeout: 1000,
            retryAttempts: 2,
            retryDelay: 100,
            enableLogging: false
        })

        mockProviders = [
            {
                id: 'chatgpt',
                name: 'ChatGPT',
                url: 'https://chat.openai.com',
                icon: '/icons/chatgpt.svg',
                isLoggedIn: true,
                sessionData: {
                    cookies: [],
                    localStorage: {},
                    sessionStorage: {},
                    isActive: true,
                    lastActiveTime: new Date()
                },
                webviewId: 'webview-chatgpt',
                isEnabled: true,
                loadingState: 'loaded'
            },
            {
                id: 'gemini',
                name: 'Gemini',
                url: 'https://gemini.google.com',
                icon: '/icons/gemini.svg',
                isLoggedIn: true,
                sessionData: {
                    cookies: [],
                    localStorage: {},
                    sessionStorage: {},
                    isActive: true,
                    lastActiveTime: new Date()
                },
                webviewId: 'webview-gemini',
                isEnabled: true,
                loadingState: 'loaded'
            }
        ]

        // 重置 mock
        vi.clearAllMocks()
    })

    afterEach(() => {
        dispatcher.destroy()
    })

    describe('构造函数', () => {
        it('应该使用默认配置创建实例', () => {
            const defaultDispatcher = new MessageDispatcher()
            expect(defaultDispatcher).toBeInstanceOf(MessageDispatcher)
            defaultDispatcher.destroy()
        })

        it('应该使用自定义配置创建实例', () => {
            const customDispatcher = new MessageDispatcher({
                timeout: 5000,
                retryAttempts: 5,
                retryDelay: 500,
                enableLogging: true
            })
            expect(customDispatcher).toBeInstanceOf(MessageDispatcher)
            customDispatcher.destroy()
        })
    })

    describe('sendMessage', () => {
        it('应该成功发送消息到所有提供商', async () => {
            // Mock 成功的 API 调用
            mockElectronAPI.sendMessageToWebView.mockResolvedValue(undefined)

            const content = 'Hello, AI!'
            const results = await dispatcher.sendMessage(content, mockProviders)

            expect(results).toHaveLength(2)
            expect(results[0].success).toBe(true)
            expect(results[0].providerId).toBe('chatgpt')
            expect(results[1].success).toBe(true)
            expect(results[1].providerId).toBe('gemini')

            expect(mockElectronAPI.sendMessageToWebView).toHaveBeenCalledTimes(2)
            expect(mockElectronAPI.sendMessageToWebView).toHaveBeenCalledWith('webview-chatgpt', content)
            expect(mockElectronAPI.sendMessageToWebView).toHaveBeenCalledWith('webview-gemini', content)
        })

        it('应该处理部分发送失败的情况', async () => {
            // Mock 一个成功，一个持续失败（包括重试）
            mockElectronAPI.sendMessageToWebView
                .mockResolvedValueOnce(undefined) // chatgpt 成功
                .mockRejectedValue(new Error('Network error')) // gemini 失败（包括重试）

            const content = 'Hello, AI!'
            const results = await dispatcher.sendMessage(content, mockProviders)

            expect(results).toHaveLength(2)

            // 找到对应的结果（顺序可能不同）
            const chatgptResult = results.find(r => r.providerId === 'chatgpt')
            const geminiResult = results.find(r => r.providerId === 'gemini')

            expect(chatgptResult?.success).toBe(true)
            expect(geminiResult?.success).toBe(false)
            expect(geminiResult?.error).toBe('Network error')
        })

        it('应该在超时后失败', async () => {
            // Mock 超时
            mockElectronAPI.sendMessageToWebView.mockImplementation(
                () => new Promise(resolve => setTimeout(resolve, 2000))
            )

            const content = 'Hello, AI!'
            const results = await dispatcher.sendMessage(content, mockProviders)

            expect(results).toHaveLength(2)
            expect(results[0].success).toBe(false)
            expect(results[0].error).toContain('timeout')
            expect(results[1].success).toBe(false)
            expect(results[1].error).toContain('timeout')
        })

        it('应该在重试后成功', async () => {
            let callCount = 0
            mockElectronAPI.sendMessageToWebView.mockImplementation(() => {
                callCount++
                if (callCount <= 2) {
                    return Promise.reject(new Error('Temporary error'))
                }
                return Promise.resolve()
            })

            const content = 'Hello, AI!'
            const results = await dispatcher.sendMessage(content, [mockProviders[0]])

            expect(results).toHaveLength(1)
            expect(results[0].success).toBe(true)
            expect(mockElectronAPI.sendMessageToWebView).toHaveBeenCalledTimes(3) // 1 + 2 重试
        })

        it('应该在达到最大重试次数后失败', async () => {
            mockElectronAPI.sendMessageToWebView.mockRejectedValue(new Error('Persistent error'))

            const content = 'Hello, AI!'
            const results = await dispatcher.sendMessage(content, [mockProviders[0]])

            expect(results).toHaveLength(1)
            expect(results[0].success).toBe(false)
            expect(results[0].error).toBe('Persistent error')
            expect(mockElectronAPI.sendMessageToWebView).toHaveBeenCalledTimes(3) // 1 + 2 重试
        })

        it('应该生成唯一的消息ID', async () => {
            mockElectronAPI.sendMessageToWebView.mockResolvedValue(undefined)

            const content = 'Hello, AI!'
            const results1 = await dispatcher.sendMessage(content, [mockProviders[0]])
            const results2 = await dispatcher.sendMessage(content, [mockProviders[0]])

            expect(results1[0].messageId).not.toBe(results2[0].messageId)
        })

        it('应该使用提供的消息ID', async () => {
            mockElectronAPI.sendMessageToWebView.mockResolvedValue(undefined)

            const content = 'Hello, AI!'
            const customMessageId = 'custom-message-id'
            const results = await dispatcher.sendMessage(content, [mockProviders[0]], customMessageId)

            expect(results[0].messageId).toBe(customMessageId)
        })
    })

    describe('状态管理', () => {
        it('应该正确跟踪发送状态', async () => {
            let resolvePromise: () => void
            const promise = new Promise<void>(resolve => {
                resolvePromise = resolve
            })

            mockElectronAPI.sendMessageToWebView.mockReturnValue(promise)

            // 开始发送消息（不等待完成）
            const sendPromise = dispatcher.sendMessage('Hello', [mockProviders[0]])

            // 检查状态是否为 sending
            expect(dispatcher.getSendingStatus('chatgpt')).toBe('sending')
            expect(dispatcher.hasSendingMessages()).toBe(true)

            // 完成发送
            resolvePromise!()
            await sendPromise

            // 检查状态是否为 sent
            expect(dispatcher.getSendingStatus('chatgpt')).toBe('sent')
            expect(dispatcher.hasSendingMessages()).toBe(false)
        })

        it('应该正确获取所有发送状态', async () => {
            mockElectronAPI.sendMessageToWebView.mockResolvedValue(undefined)

            await dispatcher.sendMessage('Hello', mockProviders)

            const allStatus = dispatcher.getAllSendingStatus()
            expect(allStatus.chatgpt).toBe('sent')
            expect(allStatus.gemini).toBe('sent')
        })

        it('应该重置提供商状态', async () => {
            mockElectronAPI.sendMessageToWebView.mockResolvedValue(undefined)

            await dispatcher.sendMessage('Hello', [mockProviders[0]])
            expect(dispatcher.getSendingStatus('chatgpt')).toBe('sent')

            dispatcher.resetProviderStatus('chatgpt')
            expect(dispatcher.getSendingStatus('chatgpt')).toBe('idle')
        })

        it('应该重置所有状态', async () => {
            mockElectronAPI.sendMessageToWebView.mockResolvedValue(undefined)

            await dispatcher.sendMessage('Hello', mockProviders)
            expect(dispatcher.getSendingStatus('chatgpt')).toBe('sent')
            expect(dispatcher.getSendingStatus('gemini')).toBe('sent')

            dispatcher.resetAllStatus()
            expect(dispatcher.getSendingStatus('chatgpt')).toBe('idle')
            expect(dispatcher.getSendingStatus('gemini')).toBe('idle')
        })
    })

    describe('队列管理', () => {
        it('应该正确跟踪队列大小', async () => {
            let resolvePromise: () => void
            const promise = new Promise<void>(resolve => {
                resolvePromise = resolve
            })

            mockElectronAPI.sendMessageToWebView.mockReturnValue(promise)

            // 开始发送消息（不等待完成）
            const sendPromise = dispatcher.sendMessage('Hello', [mockProviders[0]])

            // 检查队列大小
            expect(dispatcher.getQueueSize()).toBe(1)

            // 完成发送
            resolvePromise!()
            await sendPromise

            // 检查队列是否清空
            expect(dispatcher.getQueueSize()).toBe(0)
        })

        it('应该能够取消消息', async () => {
            let resolvePromise: () => void
            const promise = new Promise<void>(resolve => {
                resolvePromise = resolve
            })

            mockElectronAPI.sendMessageToWebView.mockReturnValue(promise)

            // 开始发送消息
            const sendPromise = dispatcher.sendMessage('Hello', [mockProviders[0]], 'test-message-id')

            // 取消消息
            dispatcher.cancelMessage('test-message-id')
            expect(dispatcher.getQueueSize()).toBe(0)

            // 完成原始 promise
            resolvePromise!()
            await sendPromise
        })
    })

    describe('事件发射', () => {
        it('应该发射状态变化事件', async () => {
            mockElectronAPI.sendMessageToWebView.mockResolvedValue(undefined)

            const statusChangedEvents: any[] = []
            dispatcher.on('status-changed', (data) => {
                statusChangedEvents.push(data)
            })

            await dispatcher.sendMessage('Hello', [mockProviders[0]])

            expect(statusChangedEvents).toHaveLength(2) // sending -> sent
            expect(statusChangedEvents[0].status).toBe('sending')
            expect(statusChangedEvents[1].status).toBe('sent')
        })

        it('应该发射消息发送完成事件', async () => {
            mockElectronAPI.sendMessageToWebView.mockResolvedValue(undefined)

            const messageSentEvents: any[] = []
            dispatcher.on('message-sent', (data) => {
                messageSentEvents.push(data)
            })

            await dispatcher.sendMessage('Hello', [mockProviders[0]])

            expect(messageSentEvents).toHaveLength(1)
            expect(messageSentEvents[0].results).toHaveLength(1)
            expect(messageSentEvents[0].results[0].success).toBe(true)
        })
    })

    describe('错误处理', () => {
        it('应该处理 Electron API 不可用的情况', async () => {
            // 临时移除 electronAPI
            const originalAPI = window.electronAPI
                ; (window as any).electronAPI = undefined

            const content = 'Hello, AI!'
            const results = await dispatcher.sendMessage(content, [mockProviders[0]])

            expect(results).toHaveLength(1)
            expect(results[0].success).toBe(false)
            expect(results[0].error).toBe('Electron API not available')

                // 恢复 electronAPI
                ; (window as any).electronAPI = originalAPI
        })

        it('应该处理空提供商列表', async () => {
            const content = 'Hello, AI!'
            const results = await dispatcher.sendMessage(content, [])

            expect(results).toHaveLength(0)
        })
    })

    describe('销毁', () => {
        it('应该正确清理资源', () => {
            const statusChangedSpy = vi.fn()
            dispatcher.on('status-changed', statusChangedSpy)

            dispatcher.destroy()

            // 检查是否清理了状态
            expect(dispatcher.getQueueSize()).toBe(0)
            expect(dispatcher.hasSendingMessages()).toBe(false)

            // 检查是否移除了事件监听器
            dispatcher.emit('status-changed', { test: 'data' })
            expect(statusChangedSpy).not.toHaveBeenCalled()
        })
    })
})