import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ElMessage } from 'element-plus'
import WebViewManager from '../../../components/webview/WebViewManager.vue'
import { useChatStore, useLayoutStore } from '../../../stores'
import type { AIProvider } from '../../../types'

// Mock Element Plus
vi.mock('element-plus', () => ({
    ElMessage: {
        error: vi.fn(),
        success: vi.fn(),
        warning: vi.fn()
    }
}))

// Mock WebView component
vi.mock('../../../components/webview/WebView.vue', () => ({
    default: {
        name: 'WebView',
        template: '<div class="mock-webview"></div>',
        props: ['provider', 'width', 'height', 'autoLoad'],
        emits: ['ready', 'loading', 'error', 'login-status-changed', 'title-changed', 'url-changed'],
        methods: {
            refresh: vi.fn(),
            navigateTo: vi.fn(),
            executeScript: vi.fn(),
            sendMessage: vi.fn().mockResolvedValue(undefined),
            destroy: vi.fn(),
            checkLoginStatus: vi.fn()
        }
    }
}))

describe('WebViewManager Component', () => {
    let pinia: ReturnType<typeof createPinia>
    let chatStore: ReturnType<typeof useChatStore>
    let layoutStore: ReturnType<typeof useLayoutStore>
    let mockProviders: AIProvider[]

    beforeEach(() => {
        pinia = createPinia()
        setActivePinia(pinia)

        chatStore = useChatStore()
        layoutStore = useLayoutStore()

        mockProviders = [
            {
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
                loadingState: 'loaded',
                retryCount: 0
            }
        ]

        // Initialize layout store with card configs
        layoutStore.initializeCardConfigs(['chatgpt', 'gemini'])

        vi.clearAllMocks()
    })

    afterEach(() => {
        vi.clearAllMocks()
    })

    it('should render correctly with providers', () => {
        const wrapper = mount(WebViewManager, {
            props: {
                providers: mockProviders
            },
            global: {
                plugins: [pinia]
            }
        })

        expect(wrapper.find('.webview-manager').exists()).toBe(true)
        expect(wrapper.findAll('.mock-webview')).toHaveLength(2)
    })

    it('should initialize WebView states correctly', () => {
        const wrapper = mount(WebViewManager, {
            props: {
                providers: mockProviders
            },
            global: {
                plugins: [pinia]
            }
        })

        const vm = wrapper.vm as any

        expect(vm.webViewStates.chatgpt).toBeDefined()
        expect(vm.webViewStates.gemini).toBeDefined()
        expect(vm.retryCounters.chatgpt).toBe(0)
        expect(vm.retryCounters.gemini).toBe(0)
    })

    it('should handle WebView ready event', async () => {
        const wrapper = mount(WebViewManager, {
            props: {
                providers: mockProviders
            },
            global: {
                plugins: [pinia]
            }
        })

        // Simulate WebView ready event
        await wrapper.vm.handleWebViewReady('chatgpt')

        expect(wrapper.emitted('provider-ready')).toBeTruthy()
        expect(wrapper.emitted('provider-ready')?.[0]).toEqual(['chatgpt'])

        const vm = wrapper.vm as any
        expect(vm.webViewStates.chatgpt.isReady).toBe(true)
        expect(vm.webViewStates.chatgpt.isLoading).toBe(false)
        expect(vm.webViewStates.chatgpt.hasError).toBe(false)
    })

    it('should handle WebView loading state', async () => {
        const wrapper = mount(WebViewManager, {
            props: {
                providers: mockProviders
            },
            global: {
                plugins: [pinia]
            }
        })

        // Simulate WebView loading event
        await wrapper.vm.handleWebViewLoading('chatgpt', true)

        const vm = wrapper.vm as any
        expect(vm.webViewStates.chatgpt.isLoading).toBe(true)

        const provider = mockProviders.find(p => p.id === 'chatgpt')
        expect(provider?.loadingState).toBe('loading')
    })

    it('should handle WebView error with retry mechanism', async () => {
        vi.useFakeTimers()

        const wrapper = mount(WebViewManager, {
            props: {
                providers: mockProviders
            },
            global: {
                plugins: [pinia]
            }
        })

        const restartSpy = vi.spyOn(wrapper.vm, 'restartWebView')

        // Simulate WebView error event
        await wrapper.vm.handleWebViewError('chatgpt', 'Network error')

        expect(wrapper.emitted('provider-error')).toBeTruthy()
        expect(wrapper.emitted('provider-error')?.[0]).toEqual(['chatgpt', 'Network error'])

        const vm = wrapper.vm as any
        expect(vm.webViewStates.chatgpt.hasError).toBe(true)
        expect(vm.webViewStates.chatgpt.errorMessage).toBe('Network error')

        // Fast-forward time to trigger retry
        vi.advanceTimersByTime(2000)
        await wrapper.vm.$nextTick()

        expect(restartSpy).toHaveBeenCalledWith('chatgpt')

        vi.useRealTimers()
    })

    it('should handle login status changes', async () => {
        const wrapper = mount(WebViewManager, {
            props: {
                providers: mockProviders
            },
            global: {
                plugins: [pinia]
            }
        })

        const updateSpy = vi.spyOn(chatStore, 'updateProviderLoginStatus')

        // Simulate login status change
        await wrapper.vm.handleLoginStatusChanged('chatgpt', true)

        expect(wrapper.emitted('login-status-changed')).toBeTruthy()
        expect(wrapper.emitted('login-status-changed')?.[0]).toEqual(['chatgpt', true])
        expect(updateSpy).toHaveBeenCalledWith('chatgpt', true)
    })

    it('should handle title changes', async () => {
        const wrapper = mount(WebViewManager, {
            props: {
                providers: mockProviders
            },
            global: {
                plugins: [pinia]
            }
        })

        const updateTitleSpy = vi.spyOn(layoutStore, 'updateCardTitle')

        // Simulate title change
        await wrapper.vm.handleTitleChanged('chatgpt', 'New Chat - ChatGPT')

        const vm = wrapper.vm as any
        expect(vm.webViewStates.chatgpt.title).toBe('New Chat - ChatGPT')
        expect(updateTitleSpy).toHaveBeenCalledWith('chatgpt', 'New Chat - ChatGPT')
    })

    it('should handle URL changes', async () => {
        const wrapper = mount(WebViewManager, {
            props: {
                providers: mockProviders
            },
            global: {
                plugins: [pinia]
            }
        })

        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { })

        // Simulate URL change
        await wrapper.vm.handleUrlChanged('chatgpt', 'https://chat.openai.com/new')

        const vm = wrapper.vm as any
        expect(vm.webViewStates.chatgpt.currentUrl).toBe('https://chat.openai.com/new')
        expect(consoleSpy).toHaveBeenCalledWith('ChatGPT URL changed:', 'https://chat.openai.com/new')

        consoleSpy.mockRestore()
    })

    it('should send message to specific WebView', async () => {
        const wrapper = mount(WebViewManager, {
            props: {
                providers: mockProviders
            },
            global: {
                plugins: [pinia]
            }
        })

        // Set WebView as ready
        const vm = wrapper.vm as any
        vm.webViewStates.chatgpt.isReady = true

        // Mock WebView ref
        const mockWebViewRef = {
            sendMessage: vi.fn().mockResolvedValue(undefined)
        }
        vm.webViewRefs.chatgpt = mockWebViewRef

        // Send message
        const result = await wrapper.vm.sendMessageToWebView('chatgpt', 'Hello!')

        expect(result).toBe(true)
        expect(mockWebViewRef.sendMessage).toHaveBeenCalledWith('Hello!')
        expect(wrapper.emitted('message-sent')).toBeTruthy()
        expect(wrapper.emitted('message-sent')?.[0]).toEqual(['chatgpt', true])
    })

    it('should handle message send failure', async () => {
        const wrapper = mount(WebViewManager, {
            props: {
                providers: mockProviders
            },
            global: {
                plugins: [pinia]
            }
        })

        // Set WebView as ready
        const vm = wrapper.vm as any
        vm.webViewStates.chatgpt.isReady = true

        // Mock WebView ref with error
        const mockWebViewRef = {
            sendMessage: vi.fn().mockRejectedValue(new Error('Send failed'))
        }
        vm.webViewRefs.chatgpt = mockWebViewRef

        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { })

        // Send message
        const result = await wrapper.vm.sendMessageToWebView('chatgpt', 'Hello!')

        expect(result).toBe(false)
        expect(wrapper.emitted('message-sent')?.[0]).toEqual(['chatgpt', false])
        expect(consoleSpy).toHaveBeenCalled()

        consoleSpy.mockRestore()
    })

    it('should send message to all WebViews', async () => {
        const wrapper = mount(WebViewManager, {
            props: {
                providers: mockProviders
            },
            global: {
                plugins: [pinia]
            }
        })

        // Set both WebViews as ready and logged in
        const vm = wrapper.vm as any
        vm.webViewStates.chatgpt.isReady = true
        vm.webViewStates.gemini.isReady = true

        // Mock WebView refs
        const mockWebViewRefs = {
            chatgpt: { sendMessage: vi.fn().mockResolvedValue(undefined) },
            gemini: { sendMessage: vi.fn().mockResolvedValue(undefined) }
        }
        vm.webViewRefs = mockWebViewRefs

        const addMessageSpy = vi.spyOn(chatStore, 'addMessage')
        const setSendingStatusSpy = vi.spyOn(chatStore, 'setSendingStatus')

        // Send message to all
        const results = await wrapper.vm.sendMessageToAllWebViews('Hello everyone!')

        expect(results.chatgpt).toBe(false) // Not logged in
        expect(results.gemini).toBe(true) // Logged in and enabled
        expect(mockWebViewRefs.gemini.sendMessage).toHaveBeenCalledWith('Hello everyone!')
        expect(addMessageSpy).toHaveBeenCalled()
        expect(setSendingStatusSpy).toHaveBeenCalled()
    })

    it('should refresh specific WebView', () => {
        const wrapper = mount(WebViewManager, {
            props: {
                providers: mockProviders
            },
            global: {
                plugins: [pinia]
            }
        })

        // Mock WebView ref
        const vm = wrapper.vm as any
        const mockWebViewRef = {
            refresh: vi.fn()
        }
        vm.webViewRefs.chatgpt = mockWebViewRef

        // Refresh WebView
        wrapper.vm.refreshWebView('chatgpt')

        expect(mockWebViewRef.refresh).toHaveBeenCalled()
    })

    it('should refresh all WebViews', () => {
        const wrapper = mount(WebViewManager, {
            props: {
                providers: mockProviders
            },
            global: {
                plugins: [pinia]
            }
        })

        // Mock WebView refs
        const vm = wrapper.vm as any
        const mockWebViewRefs = {
            chatgpt: { refresh: vi.fn() },
            gemini: { refresh: vi.fn() }
        }
        vm.webViewRefs = mockWebViewRefs

        // Refresh all WebViews
        wrapper.vm.refreshAllWebViews()

        expect(mockWebViewRefs.chatgpt.refresh).toHaveBeenCalled()
        expect(mockWebViewRefs.gemini.refresh).toHaveBeenCalled()
    })

    it('should check all login status', async () => {
        const wrapper = mount(WebViewManager, {
            props: {
                providers: mockProviders
            },
            global: {
                plugins: [pinia]
            }
        })

        // Set WebViews as ready
        const vm = wrapper.vm as any
        vm.webViewStates.chatgpt.isReady = true
        vm.webViewStates.gemini.isReady = true

        // Mock WebView refs
        const mockWebViewRefs = {
            chatgpt: { checkLoginStatus: vi.fn().mockResolvedValue(undefined) },
            gemini: { checkLoginStatus: vi.fn().mockResolvedValue(undefined) }
        }
        vm.webViewRefs = mockWebViewRefs

        // Check all login status
        await wrapper.vm.checkAllLoginStatus()

        expect(mockWebViewRefs.chatgpt.checkLoginStatus).toHaveBeenCalled()
        expect(mockWebViewRefs.gemini.checkLoginStatus).toHaveBeenCalled()
    })

    it('should restart WebView correctly', async () => {
        const wrapper = mount(WebViewManager, {
            props: {
                providers: mockProviders
            },
            global: {
                plugins: [pinia]
            }
        })

        // Mock WebView ref
        const vm = wrapper.vm as any
        const mockWebViewRef = {
            destroy: vi.fn(),
            navigateTo: vi.fn()
        }
        vm.webViewRefs.chatgpt = mockWebViewRef

        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { })

        // Restart WebView
        await wrapper.vm.restartWebView('chatgpt')

        expect(vm.retryCounters.chatgpt).toBe(1)
        expect(mockWebViewRef.destroy).toHaveBeenCalled()
        expect(consoleSpy).toHaveBeenCalledWith(
            'WebView restarted: chatgpt (attempt 1)'
        )

        consoleSpy.mockRestore()
    })

    it('should toggle WebView enabled state', () => {
        const wrapper = mount(WebViewManager, {
            props: {
                providers: mockProviders
            },
            global: {
                plugins: [pinia]
            }
        })

        // Mock WebView ref
        const vm = wrapper.vm as any
        const mockWebViewRef = {
            destroy: vi.fn()
        }
        vm.webViewRefs.chatgpt = mockWebViewRef

        // Disable WebView
        wrapper.vm.toggleWebView('chatgpt', false)

        const provider = mockProviders.find(p => p.id === 'chatgpt')
        expect(provider?.isEnabled).toBe(false)
        expect(provider?.loadingState).toBe('idle')
        expect(mockWebViewRef.destroy).toHaveBeenCalled()

        // Enable WebView
        wrapper.vm.toggleWebView('chatgpt', true)

        expect(provider?.isEnabled).toBe(true)
        expect(provider?.loadingState).toBe('loading')
    })

    it('should get WebView state correctly', () => {
        const wrapper = mount(WebViewManager, {
            props: {
                providers: mockProviders
            },
            global: {
                plugins: [pinia]
            }
        })

        const state = wrapper.vm.getWebViewState('chatgpt')

        expect(state).toBeDefined()
        expect(state?.isReady).toBe(false)
        expect(state?.isLoading).toBe(false)
        expect(state?.hasError).toBe(false)
    })

    it('should get all WebView states correctly', () => {
        const wrapper = mount(WebViewManager, {
            props: {
                providers: mockProviders
            },
            global: {
                plugins: [pinia]
            }
        })

        const states = wrapper.vm.getAllWebViewStates()

        expect(states).toBeDefined()
        expect(states.chatgpt).toBeDefined()
        expect(states.gemini).toBeDefined()
    })

    it('should handle maximum retry limit', async () => {
        const wrapper = mount(WebViewManager, {
            props: {
                providers: mockProviders
            },
            global: {
                plugins: [pinia]
            }
        })

        const vm = wrapper.vm as any

        // Set retry counter to maximum
        vm.retryCounters.chatgpt = 3

        // Simulate error (should not trigger retry)
        await wrapper.vm.handleWebViewError('chatgpt', 'Network error')

        expect(ElMessage.error).toHaveBeenCalledWith(
            'ChatGPT 加载失败，已达到最大重试次数'
        )
    })

    it('should cleanup on unmount', () => {
        const wrapper = mount(WebViewManager, {
            props: {
                providers: mockProviders
            },
            global: {
                plugins: [pinia]
            }
        })

        // Mock WebView refs
        const vm = wrapper.vm as any
        const mockWebViewRefs = {
            chatgpt: { destroy: vi.fn() },
            gemini: { destroy: vi.fn() }
        }
        vm.webViewRefs = mockWebViewRefs

        // Unmount component
        wrapper.unmount()

        expect(mockWebViewRefs.chatgpt.destroy).toHaveBeenCalled()
        expect(mockWebViewRefs.gemini.destroy).toHaveBeenCalled()
    })
})