/**
 * UnifiedInput 集成测试
 * 测试统一输入系统的完整工作流程
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ElMessage } from 'element-plus'
import UnifiedInput from '../../../components/chat/UnifiedInput.vue'
import { useChatStore } from '../../../stores/chat'
import { messageDispatcher } from '../../../services/MessageDispatcher'
import type { AIProvider } from '../../../types'

// Mock Element Plus
vi.mock('element-plus', async () => {
    const actual = await vi.importActual('element-plus')
    return {
        ...actual,
        ElMessage: {
            success: vi.fn(),
            warning: vi.fn(),
            error: vi.fn()
        }
    }
})

// Mock window.electronAPI
const mockElectronAPI = {
    sendMessageToWebView: vi.fn(),
    refreshAllWebViews: vi.fn()
}

Object.defineProperty(window, 'electronAPI', {
    value: mockElectronAPI,
    writable: true
})

describe('UnifiedInput Integration Tests', () => {
    let wrapper: VueWrapper<any>
    let chatStore: ReturnType<typeof useChatStore>
    let pinia: ReturnType<typeof createPinia>

    beforeEach(() => {
        // 创建新的 Pinia 实例
        pinia = createPinia()
        setActivePinia(pinia)

        // 获取 store 实例
        chatStore = useChatStore()

        // 初始化测试数据
        chatStore.initializeConversations()

        // 设置一些提供商为已登录状态
        chatStore.updateProviderLoginStatus('chatgpt', true)
        chatStore.updateProviderLoginStatus('gemini', true)

        // 挂载组件
        wrapper = mount(UnifiedInput, {
            global: {
                plugins: [pinia]
            }
        })

        // 重置 mock
        vi.clearAllMocks()
    })

    afterEach(() => {
        wrapper?.unmount()
        messageDispatcher.resetAllStatus()
    })

    describe('消息发送流程', () => {
        it('应该完整执行消息发送流程', async () => {
            // Mock 成功的 API 调用
            mockElectronAPI.sendMessageToWebView.mockResolvedValue(undefined)

            // 设置输入内容
            const messageInput = wrapper.find('textarea')
            await messageInput.setValue('Hello, AI!')

            // 点击发送按钮
            const sendButton = wrapper.find('[data-testid="send-button"]') ||
                wrapper.find('button').filter(btn => btn.text().includes('发送'))

            if (sendButton.exists()) {
                await sendButton.trigger('click')
            } else {
                // 如果找不到按钮，直接调用发送方法
                await wrapper.vm.handleSend()
            }

            // 等待异步操作完成
            await wrapper.vm.$nextTick()
            await new Promise(resolve => setTimeout(resolve, 100))

            // 验证 API 调用
            expect(mockElectronAPI.sendMessageToWebView).toHaveBeenCalledTimes(2)
            expect(mockElectronAPI.sendMessageToWebView).toHaveBeenCalledWith('webview-chatgpt', 'Hello, AI!')
            expect(mockElectronAPI.sendMessageToWebView).toHaveBeenCalledWith('webview-gemini', 'Hello, AI!')

            // 验证成功消息
            expect(ElMessage.success).toHaveBeenCalledWith(expect.stringContaining('消息已成功发送到 2 个AI'))

            // 验证输入框已清空
            expect(wrapper.find('textarea').element.value).toBe('')

            // 验证消息已添加到对话历史
            const chatgptConversation = chatStore.getConversation('chatgpt')
            const geminiConversation = chatStore.getConversation('gemini')

            expect(chatgptConversation).toHaveLength(1)
            expect(geminiConversation).toHaveLength(1)
            expect(chatgptConversation[0].content).toBe('Hello, AI!')
            expect(geminiConversation[0].content).toBe('Hello, AI!')
        })

        it('应该处理部分发送失败的情况', async () => {
            // Mock 一个成功，一个持续失败（包括重试）
            mockElectronAPI.sendMessageToWebView
                .mockResolvedValueOnce(undefined) // chatgpt 成功
                .mockRejectedValue(new Error('Network error')) // gemini 失败（包括重试）

            // 设置输入内容
            const messageInput = wrapper.find('textarea')
            await messageInput.setValue('Hello, AI!')

            // 发送消息
            await wrapper.vm.handleSend()
            await wrapper.vm.$nextTick()
            await new Promise(resolve => setTimeout(resolve, 1000)) // 等待重试完成

            // 验证警告消息
            expect(ElMessage.warning).toHaveBeenCalledWith(expect.stringContaining('消息已发送到 1 个AI，1 个发送失败'))

            // 验证对话历史中包含错误信息
            const chatgptConversation = chatStore.getConversation('chatgpt')
            const geminiConversation = chatStore.getConversation('gemini')

            expect(chatgptConversation[0].status).toBe('sent')
            expect(geminiConversation[0].status).toBe('error')
            expect(geminiConversation[0].errorMessage).toBe('Network error')
        })

        it('应该处理所有发送失败的情况', async () => {
            // Mock 所有调用失败
            mockElectronAPI.sendMessageToWebView.mockRejectedValue(new Error('Network error'))

            // 设置输入内容
            const messageInput = wrapper.find('textarea')
            await messageInput.setValue('Hello, AI!')

            // 发送消息
            await wrapper.vm.handleSend()
            await wrapper.vm.$nextTick()
            await new Promise(resolve => setTimeout(resolve, 1000)) // 等待重试完成

            // 验证错误消息
            expect(ElMessage.error).toHaveBeenCalledWith('所有消息发送失败')
        }, 10000) // 增加超时时间
    })

    describe('输入验证', () => {
        it('应该阻止发送空消息', async () => {
            // 尝试发送空消息
            await wrapper.vm.handleSend()

            // 验证警告消息
            expect(ElMessage.warning).toHaveBeenCalledWith('请输入消息内容')

            // 验证没有调用 API
            expect(mockElectronAPI.sendMessageToWebView).not.toHaveBeenCalled()
        })

        it('应该阻止发送只包含空白字符的消息', async () => {
            // 设置只包含空白字符的输入
            const messageInput = wrapper.find('textarea')
            await messageInput.setValue('   \n\t   ')

            // 尝试发送消息
            await wrapper.vm.handleSend()

            // 验证警告消息
            expect(ElMessage.warning).toHaveBeenCalledWith('请输入消息内容')

            // 验证没有调用 API
            expect(mockElectronAPI.sendMessageToWebView).not.toHaveBeenCalled()
        })

        it('应该阻止在没有已登录提供商时发送消息', async () => {
            // 设置所有提供商为未登录状态
            chatStore.updateProviderLoginStatus('chatgpt', false)
            chatStore.updateProviderLoginStatus('gemini', false)

            // 等待响应式更新
            await wrapper.vm.$nextTick()

            // 设置输入内容
            const messageInput = wrapper.find('textarea')
            await messageInput.setValue('Hello, AI!')

            // 尝试发送消息
            await wrapper.vm.handleSend()

            // 验证警告消息（应该是没有登录提供商的警告，而不是空消息警告）
            expect(ElMessage.warning).toHaveBeenCalledWith('请先登录至少一个AI网站')

            // 验证没有调用 API
            expect(mockElectronAPI.sendMessageToWebView).not.toHaveBeenCalled()
        })
    })

    describe('状态管理', () => {
        it('应该正确显示连接状态', async () => {
            // 验证初始状态显示
            const statusTag = wrapper.find('.el-tag')
            expect(statusTag.text()).toContain('2/6 已连接')

            // 更改登录状态
            chatStore.updateProviderLoginStatus('deepseek', true)
            await wrapper.vm.$nextTick()

            // 验证状态更新
            expect(statusTag.text()).toContain('3/6 已连接')
        })

        it('应该在发送过程中禁用发送按钮', async () => {
            // Mock 延迟的 API 调用
            let resolvePromise: () => void
            const promise = new Promise<void>(resolve => {
                resolvePromise = resolve
            })
            mockElectronAPI.sendMessageToWebView.mockReturnValue(promise)

            // 设置输入内容
            const messageInput = wrapper.find('textarea')
            await messageInput.setValue('Hello, AI!')

            // 开始发送消息（不等待完成）
            const sendPromise = wrapper.vm.handleSend()

            // 等待状态更新
            await wrapper.vm.$nextTick()

            // 验证按钮被禁用
            const sendButton = wrapper.find('[data-testid="send-button"]')
            if (sendButton.exists()) {
                expect(sendButton.attributes('disabled')).toBeDefined()
            }

            // 完成发送
            resolvePromise!()
            await sendPromise
            await wrapper.vm.$nextTick()

            // 验证按钮重新启用
            if (sendButton.exists()) {
                expect(sendButton.attributes('disabled')).toBeUndefined()
            }
        })

        it('应该正确更新输入占位符', async () => {
            const messageInput = wrapper.find('textarea')

            // 验证有已登录提供商时的占位符
            expect(messageInput.attributes('placeholder')).toContain('输入您的消息，将同时发送给所有已登录的AI')

            // 设置所有提供商为未登录状态
            chatStore.updateProviderLoginStatus('chatgpt', false)
            chatStore.updateProviderLoginStatus('gemini', false)
            await wrapper.vm.$nextTick()

            // 验证无已登录提供商时的占位符
            expect(messageInput.attributes('placeholder')).toContain('请先登录至少一个AI网站')
        })
    })

    describe('键盘快捷键', () => {
        it('应该支持 Ctrl+Enter 发送消息', async () => {
            mockElectronAPI.sendMessageToWebView.mockResolvedValue(undefined)

            // 设置输入内容
            const messageInput = wrapper.find('textarea')
            await messageInput.setValue('Hello, AI!')

            // 模拟 Ctrl+Enter 按键
            await messageInput.trigger('keydown', {
                key: 'Enter',
                ctrlKey: true
            })

            // 等待异步操作完成
            await wrapper.vm.$nextTick()
            await new Promise(resolve => setTimeout(resolve, 100))

            // 验证消息已发送
            expect(mockElectronAPI.sendMessageToWebView).toHaveBeenCalledTimes(2)
        })

        it('应该支持 Cmd+Enter 发送消息 (macOS)', async () => {
            mockElectronAPI.sendMessageToWebView.mockResolvedValue(undefined)

            // 设置输入内容
            const messageInput = wrapper.find('textarea')
            await messageInput.setValue('Hello, AI!')

            // 模拟 Cmd+Enter 按键
            await messageInput.trigger('keydown', {
                key: 'Enter',
                metaKey: true
            })

            // 等待异步操作完成
            await wrapper.vm.$nextTick()
            await new Promise(resolve => setTimeout(resolve, 100))

            // 验证消息已发送
            expect(mockElectronAPI.sendMessageToWebView).toHaveBeenCalledTimes(2)
        })
    })

    describe('刷新功能', () => {
        it('应该能够刷新所有连接', async () => {
            mockElectronAPI.refreshAllWebViews.mockResolvedValue(undefined)

            // 点击刷新按钮
            const refreshButton = wrapper.find('[data-testid="refresh-button"]')

            if (refreshButton.exists()) {
                await refreshButton.trigger('click')
            } else {
                // 如果找不到按钮，直接调用刷新方法
                await wrapper.vm.handleRefresh()
            }

            // 验证 API 调用
            expect(mockElectronAPI.refreshAllWebViews).toHaveBeenCalledTimes(1)

            // 验证成功消息
            expect(ElMessage.success).toHaveBeenCalledWith('连接状态已刷新')
        })

        it('应该处理刷新失败的情况', async () => {
            mockElectronAPI.refreshAllWebViews.mockRejectedValue(new Error('Refresh failed'))

            // 调用刷新方法
            await wrapper.vm.handleRefresh()

            // 验证错误消息
            expect(ElMessage.error).toHaveBeenCalledWith('刷新连接失败')
        })
    })

    describe('清空功能', () => {
        it('应该能够清空输入内容', async () => {
            // 设置输入内容
            const messageInput = wrapper.find('textarea')
            await messageInput.setValue('Hello, AI!')

            // 点击清空按钮
            const clearButton = wrapper.find('[data-testid="clear-button"]')

            if (clearButton.exists()) {
                await clearButton.trigger('click')
            } else {
                // 如果找不到按钮，直接调用清空方法
                wrapper.vm.handleClear()
            }

            await wrapper.vm.$nextTick()

            // 验证输入框已清空
            expect(messageInput.element.value).toBe('')
        })
    })

    describe('事件监听', () => {
        it('应该正确处理消息分发器事件', async () => {
            // 模拟状态变化事件
            messageDispatcher.emit('status-changed', {
                providerId: 'chatgpt',
                status: 'sending',
                messageId: 'test-message-id'
            })

            await wrapper.vm.$nextTick()

            // 验证状态已更新
            expect(chatStore.getSendingStatus('chatgpt')).toBe('sending')
        })

        it('应该在组件卸载时清理事件监听器', () => {
            const offSpy = vi.spyOn(messageDispatcher, 'off')

            // 卸载组件
            wrapper.unmount()

            // 验证事件监听器已移除
            expect(offSpy).toHaveBeenCalledWith('status-changed', expect.any(Function))
            expect(offSpy).toHaveBeenCalledWith('message-sent', expect.any(Function))
        })
    })
})