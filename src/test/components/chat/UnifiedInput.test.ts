import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ElMessage } from 'element-plus'
import UnifiedInput from '../../../components/chat/UnifiedInput.vue'
import { useChatStore } from '../../../stores'
import { messageDispatcher } from '../../../services/MessageDispatcher'

// Mock ElMessage
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
    sendMessageToWebView: vi.fn().mockResolvedValue(undefined),
    refreshAllWebViews: vi.fn().mockResolvedValue(undefined)
}

Object.defineProperty(window, 'electronAPI', {
    value: mockElectronAPI,
    writable: true
})

describe('UnifiedInput', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.clearAllMocks()
    })

    afterEach(() => {
        messageDispatcher.resetAllStatus()
    })

    it('应该正确渲染输入组件', () => {
        const wrapper = mount(UnifiedInput)

        expect(wrapper.find('.unified-input').exists()).toBe(true)
        expect(wrapper.find('.input-card').exists()).toBe(true)
        expect(wrapper.find('.message-input').exists()).toBe(true)
        expect(wrapper.find('.input-actions').exists()).toBe(true)
    })

    it('应该显示正确的连接状态', async () => {
        const wrapper = mount(UnifiedInput)
        const chatStore = useChatStore()

        // 设置一些提供商为已登录状态
        chatStore.providers[0].isLoggedIn = true
        chatStore.providers[1].isLoggedIn = true

        // 等待响应式更新
        await wrapper.vm.$nextTick()

        expect(wrapper.find('.header-right .el-tag').text()).toContain('2/6 已连接')
    })

    it('应该在没有登录提供商时禁用输入', () => {
        const wrapper = mount(UnifiedInput)
        const chatStore = useChatStore()

        // 确保所有提供商都未登录
        chatStore.providers.forEach(provider => {
            provider.isLoggedIn = false
        })

        const textarea = wrapper.find('textarea')
        expect(textarea.attributes('disabled')).toBeDefined()
        expect(textarea.attributes('placeholder')).toContain('请先登录至少一个AI网站')
    })

    it('应该能够输入和清空消息', async () => {
        const wrapper = mount(UnifiedInput)
        const chatStore = useChatStore()

        // 直接设置消息
        chatStore.currentMessage = '测试消息'
        await wrapper.vm.$nextTick()
        expect(chatStore.currentMessage).toBe('测试消息')

        // 清空消息
        wrapper.vm.handleClear()
        await wrapper.vm.$nextTick()
        expect(chatStore.currentMessage).toBe('')
    })

    it('应该能够发送消息到已登录的提供商', async () => {
        const wrapper = mount(UnifiedInput)
        const chatStore = useChatStore()

        // 设置一些提供商为已登录状态
        chatStore.providers[0].isLoggedIn = true
        chatStore.providers[1].isLoggedIn = true
        chatStore.currentMessage = '测试消息'

        await wrapper.vm.$nextTick()

        const sendButton = wrapper.find('[data-testid="send-button"]')
        await sendButton.trigger('click')

        // 等待异步操作完成
        await new Promise(resolve => setTimeout(resolve, 100))

        // 验证消息发送到WebView
        expect(mockElectronAPI.sendMessageToWebView).toHaveBeenCalledTimes(2)
        expect(mockElectronAPI.sendMessageToWebView).toHaveBeenCalledWith('webview-chatgpt', '测试消息')
        expect(mockElectronAPI.sendMessageToWebView).toHaveBeenCalledWith('webview-gemini', '测试消息')

        // 验证成功消息
        expect(ElMessage.success).toHaveBeenCalledWith(expect.stringContaining('消息已成功发送到 2 个AI'))
    })

    it('应该在没有消息内容时显示警告', async () => {
        const wrapper = mount(UnifiedInput)
        const chatStore = useChatStore()

        chatStore.providers[0].isLoggedIn = true
        chatStore.currentMessage = ''

        await wrapper.vm.$nextTick()

        await wrapper.vm.handleSend()

        expect(ElMessage.warning).toHaveBeenCalledWith('请输入消息内容')
    })

    it('应该在没有登录提供商时显示警告', async () => {
        const wrapper = mount(UnifiedInput)
        const chatStore = useChatStore()

        chatStore.currentMessage = '测试消息'
        // 所有提供商都未登录

        await wrapper.vm.$nextTick()

        const sendButton = wrapper.find('[data-testid="send-button"]')
        await sendButton.trigger('click')

        expect(ElMessage.warning).toHaveBeenCalledWith('请先登录至少一个AI网站')
    })

    it('应该能够刷新连接', async () => {
        const wrapper = mount(UnifiedInput)

        const refreshButton = wrapper.find('[data-testid="refresh-button"]')
        await refreshButton.trigger('click')

        expect(mockElectronAPI.refreshAllWebViews).toHaveBeenCalled()
        expect(ElMessage.success).toHaveBeenCalledWith('连接状态已刷新')
    })

    it('应该支持Ctrl+Enter快捷键发送', async () => {
        const wrapper = mount(UnifiedInput)
        const chatStore = useChatStore()

        chatStore.providers[0].isLoggedIn = true
        chatStore.currentMessage = '测试消息'

        await wrapper.vm.$nextTick()

        const textarea = wrapper.find('[data-testid="message-input"] textarea')
        await textarea.trigger('keydown', {
            key: 'Enter',
            ctrlKey: true
        })

        // 等待异步操作完成
        await new Promise(resolve => setTimeout(resolve, 100))

        expect(mockElectronAPI.sendMessageToWebView).toHaveBeenCalled()
    })
})