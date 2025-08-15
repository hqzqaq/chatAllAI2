import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ElMessage } from 'element-plus'
import WebView from '../../../components/webview/WebView.vue'
import type { AIProvider } from '../../../types'

// Mock Element Plus
vi.mock('element-plus', () => ({
    ElMessage: {
        error: vi.fn(),
        success: vi.fn(),
        warning: vi.fn()
    }
}))

// Mock window.electronAPI
const mockElectronAPI = {
    openExternal: vi.fn()
}

Object.defineProperty(window, 'electronAPI', {
    value: mockElectronAPI,
    writable: true
})

// Mock document methods
const mockWebViewElement = {
    id: 'test-webview',
    src: '',
    style: {},
    setAttribute: vi.fn(),
    addEventListener: vi.fn(),
    insertCSS: vi.fn().mockResolvedValue(undefined),
    executeJavaScript: vi.fn().mockResolvedValue(true),
    reload: vi.fn()
}

const mockCreateElement = vi.fn().mockReturnValue(mockWebViewElement)
const mockGetElementById = vi.fn().mockReturnValue({
    innerHTML: '',
    appendChild: vi.fn()
})

Object.defineProperty(document, 'createElement', {
    value: mockCreateElement,
    writable: true
})

Object.defineProperty(document, 'getElementById', {
    value: mockGetElementById,
    writable: true
})

describe('WebView Component', () => {
    let mockProvider: AIProvider

    beforeEach(() => {
        mockProvider = {
            id: 'chatgpt',
            name: 'ChatGPT',
            url: 'https://chat.openai.com',
            icon: '/icons/chatgpt.svg',
            isLoggedIn: false,
            sessionData: {
                cookies: [],
                localStorage: {},
                sessionStorage: {},
                isActive: false,
                lastActiveTime: new Date()
            },
            webviewId: 'webview-chatgpt',
            isEnabled: true,
            loadingState: 'idle',
            retryCount: 0
        }

        // Reset mocks
        vi.clearAllMocks()
    })

    afterEach(() => {
        vi.clearAllMocks()
    })

    it('should render correctly', () => {
        const wrapper = mount(WebView, {
            props: {
                provider: mockProvider,
                width: 800,
                height: 600,
                autoLoad: true
            }
        })

        expect(wrapper.find('.webview-wrapper').exists()).toBe(true)
        expect(wrapper.find('.webview-container').exists()).toBe(true)
    })

    it('should show loading state initially when autoLoad is true', () => {
        const wrapper = mount(WebView, {
            props: {
                provider: mockProvider,
                autoLoad: true
            }
        })

        expect(wrapper.find('.loading-overlay').exists()).toBe(true)
        expect(wrapper.find('.loading-icon').exists()).toBe(true)
        expect(wrapper.text()).toContain('正在加载 ChatGPT...')
    })

    it('should not auto-load when autoLoad is false', () => {
        const wrapper = mount(WebView, {
            props: {
                provider: mockProvider,
                autoLoad: false
            }
        })

        expect(wrapper.find('.loading-overlay').exists()).toBe(false)
    })

    it('should emit loading event when WebView starts loading', async () => {
        const wrapper = mount(WebView, {
            props: {
                provider: mockProvider,
                autoLoad: true
            }
        })

        // Simulate WebView loading event
        const webviewElement = mockWebViewElement
        const loadingCallback = mockWebViewElement.addEventListener.mock.calls
            .find(call => call[0] === 'did-start-loading')?.[1]

        if (loadingCallback) {
            loadingCallback()
        }

        await wrapper.vm.$nextTick()

        expect(wrapper.emitted('loading')).toBeTruthy()
        expect(wrapper.emitted('loading')?.[0]).toEqual([true])
    })

    it('should emit ready event when WebView finishes loading', async () => {
        const wrapper = mount(WebView, {
            props: {
                provider: mockProvider,
                autoLoad: true
            }
        })

        // Simulate WebView load complete event
        const loadCompleteCallback = mockWebViewElement.addEventListener.mock.calls
            .find(call => call[0] === 'did-finish-load')?.[1]

        if (loadCompleteCallback) {
            loadCompleteCallback()
        }

        await wrapper.vm.$nextTick()

        expect(wrapper.emitted('ready')).toBeTruthy()
        expect(wrapper.emitted('loading')).toBeTruthy()
        expect(wrapper.emitted('loading')?.[1]).toEqual([false])
    })

    it('should emit error event when WebView fails to load', async () => {
        const wrapper = mount(WebView, {
            props: {
                provider: mockProvider,
                autoLoad: true
            }
        })

        const errorEvent = {
            errorCode: -2,
            errorDescription: 'Network error'
        }

        // Simulate WebView load error event
        const errorCallback = mockWebViewElement.addEventListener.mock.calls
            .find(call => call[0] === 'did-fail-load')?.[1]

        if (errorCallback) {
            errorCallback(errorEvent)
        }

        await wrapper.vm.$nextTick()

        expect(wrapper.emitted('error')).toBeTruthy()
        expect(wrapper.emitted('error')?.[0]).toEqual(['加载失败: Network error'])
        expect(wrapper.find('.error-overlay').exists()).toBe(true)
    })

    it('should handle retry functionality', async () => {
        const wrapper = mount(WebView, {
            props: {
                provider: mockProvider,
                autoLoad: true
            }
        })

        // Simulate error state
        const errorEvent = {
            errorCode: -2,
            errorDescription: 'Network error'
        }

        const errorCallback = mockWebViewElement.addEventListener.mock.calls
            .find(call => call[0] === 'did-fail-load')?.[1]

        if (errorCallback) {
            errorCallback(errorEvent)
        }

        await wrapper.vm.$nextTick()

        // Find and click retry button
        const retryButton = wrapper.find('.error-overlay button')
        expect(retryButton.exists()).toBe(true)

        await retryButton.trigger('click')

        expect(mockWebViewElement.reload).toHaveBeenCalled()
    })

    it('should emit login-status-changed event', async () => {
        const wrapper = mount(WebView, {
            props: {
                provider: mockProvider,
                autoLoad: true
            }
        })

        // Mock login check result
        mockWebViewElement.executeJavaScript.mockResolvedValueOnce(true)

        // Simulate DOM ready event to trigger login check
        const domReadyCallback = mockWebViewElement.addEventListener.mock.calls
            .find(call => call[0] === 'dom-ready')?.[1]

        if (domReadyCallback) {
            domReadyCallback()
        }

        await wrapper.vm.$nextTick()
        await new Promise(resolve => setTimeout(resolve, 0)) // Wait for async operations

        expect(wrapper.emitted('login-status-changed')).toBeTruthy()
        expect(wrapper.emitted('login-status-changed')?.[0]).toEqual([true])
    })

    it('should emit title-changed event', async () => {
        const wrapper = mount(WebView, {
            props: {
                provider: mockProvider,
                autoLoad: true
            }
        })

        const titleEvent = {
            title: 'ChatGPT - New Chat'
        }

        // Simulate title change event
        const titleCallback = mockWebViewElement.addEventListener.mock.calls
            .find(call => call[0] === 'page-title-updated')?.[1]

        if (titleCallback) {
            titleCallback(titleEvent)
        }

        await wrapper.vm.$nextTick()

        expect(wrapper.emitted('title-changed')).toBeTruthy()
        expect(wrapper.emitted('title-changed')?.[0]).toEqual(['ChatGPT - New Chat'])
    })

    it('should handle new window requests', async () => {
        const wrapper = mount(WebView, {
            props: {
                provider: mockProvider,
                autoLoad: true
            }
        })

        const newWindowEvent = {
            url: 'https://example.com'
        }

        // Simulate new window event
        const newWindowCallback = mockWebViewElement.addEventListener.mock.calls
            .find(call => call[0] === 'new-window')?.[1]

        if (newWindowCallback) {
            newWindowCallback(newWindowEvent)
        }

        await wrapper.vm.$nextTick()

        expect(mockElectronAPI.openExternal).toHaveBeenCalledWith('https://example.com')
    })

    it('should send messages correctly', async () => {
        const wrapper = mount(WebView, {
            props: {
                provider: mockProvider,
                autoLoad: true
            }
        })

        // Set WebView as ready
        const loadCompleteCallback = mockWebViewElement.addEventListener.mock.calls
            .find(call => call[0] === 'did-finish-load')?.[1]

        if (loadCompleteCallback) {
            loadCompleteCallback()
        }

        await wrapper.vm.$nextTick()

        // Mock successful message send
        mockWebViewElement.executeJavaScript.mockResolvedValueOnce({ success: true })

        // Send message using exposed method
        const result = await wrapper.vm.sendMessage('Hello, ChatGPT!')

        expect(mockWebViewElement.executeJavaScript).toHaveBeenCalled()
        expect(result).toBe(undefined) // Method doesn't return value in current implementation
    })

    it('should handle message send errors', async () => {
        const wrapper = mount(WebView, {
            props: {
                provider: mockProvider,
                autoLoad: true
            }
        })

        // Set WebView as ready
        const loadCompleteCallback = mockWebViewElement.addEventListener.mock.calls
            .find(call => call[0] === 'did-finish-load')?.[1]

        if (loadCompleteCallback) {
            loadCompleteCallback()
        }

        await wrapper.vm.$nextTick()

        // Mock failed message send
        mockWebViewElement.executeJavaScript.mockRejectedValueOnce(new Error('Send failed'))

        // Attempt to send message
        try {
            await wrapper.vm.sendMessage('Hello, ChatGPT!')
        } catch (error) {
            expect(error).toBeInstanceOf(Error)
        }
    })

    it('should refresh WebView correctly', async () => {
        const wrapper = mount(WebView, {
            props: {
                provider: mockProvider,
                autoLoad: true
            }
        })

        // Set WebView as ready
        const loadCompleteCallback = mockWebViewElement.addEventListener.mock.calls
            .find(call => call[0] === 'did-finish-load')?.[1]

        if (loadCompleteCallback) {
            loadCompleteCallback()
        }

        await wrapper.vm.$nextTick()

        // Call refresh method
        wrapper.vm.refresh()

        expect(mockWebViewElement.reload).toHaveBeenCalled()
    })

    it('should navigate to new URL correctly', async () => {
        const wrapper = mount(WebView, {
            props: {
                provider: mockProvider,
                autoLoad: true
            }
        })

        const newUrl = 'https://new-url.com'

        // Call navigateTo method
        wrapper.vm.navigateTo(newUrl)

        expect(mockWebViewElement.src).toBe(newUrl)
    })

    it('should destroy WebView correctly', async () => {
        const wrapper = mount(WebView, {
            props: {
                provider: mockProvider,
                autoLoad: true
            }
        })

        // Call destroy method
        wrapper.vm.destroy()

        expect(mockGetElementById).toHaveBeenCalled()
    })

    it('should inject custom CSS correctly', async () => {
        const wrapper = mount(WebView, {
            props: {
                provider: mockProvider,
                autoLoad: true
            }
        })

        // Simulate DOM ready event
        const domReadyCallback = mockWebViewElement.addEventListener.mock.calls
            .find(call => call[0] === 'dom-ready')?.[1]

        if (domReadyCallback) {
            domReadyCallback()
        }

        await wrapper.vm.$nextTick()

        expect(mockWebViewElement.insertCSS).toHaveBeenCalled()
    })

    it('should handle different provider login check scripts', async () => {
        const providers = ['chatgpt', 'gemini', 'deepseek', 'doubao', 'qwen', 'copilot']

        for (const providerId of providers) {
            const testProvider = { ...mockProvider, id: providerId, name: providerId }

            const wrapper = mount(WebView, {
                props: {
                    provider: testProvider,
                    autoLoad: true
                }
            })

            // Simulate DOM ready event
            const domReadyCallback = mockWebViewElement.addEventListener.mock.calls
                .find(call => call[0] === 'dom-ready')?.[1]

            if (domReadyCallback) {
                domReadyCallback()
            }

            await wrapper.vm.$nextTick()

            // Check that executeJavaScript was called (login check)
            expect(mockWebViewElement.executeJavaScript).toHaveBeenCalled()

            // Reset mock for next iteration
            vi.clearAllMocks()
        }
    })

    it('should handle console messages correctly', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { })

        const wrapper = mount(WebView, {
            props: {
                provider: mockProvider,
                autoLoad: true
            }
        })

        const consoleEvent = {
            level: 0, // Error level
            message: 'Test error message'
        }

        // Simulate console message event
        const consoleCallback = mockWebViewElement.addEventListener.mock.calls
            .find(call => call[0] === 'console-message')?.[1]

        if (consoleCallback) {
            consoleCallback(consoleEvent)
        }

        await wrapper.vm.$nextTick()

        expect(consoleSpy).toHaveBeenCalledWith(
            `WebView Console [${mockProvider.name}]:`,
            'Test error message'
        )

        consoleSpy.mockRestore()
    })
})