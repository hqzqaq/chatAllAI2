import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { WebViewService } from '../../services/WebViewService'
import type { AIProvider } from '../../types'

describe('WebViewService', () => {
    let webViewService: WebViewService
    let mockProviders: AIProvider[]

    beforeEach(() => {
        webViewService = new WebViewService()

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
    })

    afterEach(() => {
        webViewService.cleanup()
    })

    describe('Initialization', () => {
        it('should initialize WebView configurations correctly', () => {
            webViewService.initializeWebViewConfigs(mockProviders)

            const chatgptConfig = webViewService.getWebViewConfig('chatgpt')
            const geminiConfig = webViewService.getWebViewConfig('gemini')

            expect(chatgptConfig).toBeDefined()
            expect(chatgptConfig?.id).toBe('webview-chatgpt')
            expect(chatgptConfig?.url).toBe('https://chat.openai.com')
            expect(chatgptConfig?.nodeIntegration).toBe(false)
            expect(chatgptConfig?.webSecurity).toBe(true)
            expect(chatgptConfig?.allowPopups).toBe(true)

            expect(geminiConfig).toBeDefined()
            expect(geminiConfig?.id).toBe('webview-gemini')
            expect(geminiConfig?.url).toBe('https://gemini.google.com')
        })

        it('should initialize WebView states correctly', () => {
            webViewService.initializeWebViewConfigs(mockProviders)

            const chatgptState = webViewService.getWebViewState('chatgpt')
            const geminiState = webViewService.getWebViewState('gemini')

            expect(chatgptState).toBeDefined()
            expect(chatgptState?.isReady).toBe(false)
            expect(chatgptState?.isLoading).toBe(false)
            expect(chatgptState?.hasError).toBe(false)
            expect(chatgptState?.zoomFactor).toBe(1.0)

            expect(geminiState).toBeDefined()
        })
    })

    describe('State Management', () => {
        beforeEach(() => {
            webViewService.initializeWebViewConfigs(mockProviders)
        })

        it('should update WebView state correctly', () => {
            webViewService.updateWebViewState('chatgpt', {
                isReady: true,
                isLoading: false,
                title: 'ChatGPT - New Chat'
            })

            const state = webViewService.getWebViewState('chatgpt')
            expect(state?.isReady).toBe(true)
            expect(state?.isLoading).toBe(false)
            expect(state?.title).toBe('ChatGPT - New Chat')
        })

        it('should get all WebView states correctly', () => {
            webViewService.updateWebViewState('chatgpt', { isReady: true })
            webViewService.updateWebViewState('gemini', { isLoading: true })

            const allStates = webViewService.getAllWebViewStates()

            expect(allStates.chatgpt).toBeDefined()
            expect(allStates.gemini).toBeDefined()
            expect(allStates.chatgpt.isReady).toBe(true)
            expect(allStates.gemini.isLoading).toBe(true)
        })
    })

    describe('Login Check Scripts', () => {
        beforeEach(() => {
            webViewService.initializeWebViewConfigs(mockProviders)
        })

        it('should generate correct login check script for ChatGPT', () => {
            const script = webViewService.getLoginCheckScript('chatgpt')

            expect(script).toContain('[data-testid="profile-button"]')
            expect(script).toContain('auth')
            expect(script).toContain('login')
        })

        it('should generate correct login check script for Gemini', () => {
            const script = webViewService.getLoginCheckScript('gemini')

            expect(script).toContain('[data-ved]')
            expect(script).toContain('accounts.google.com')
        })

        it('should generate correct login check script for DeepSeek', () => {
            const script = webViewService.getLoginCheckScript('deepseek')

            expect(script).toContain('.user-avatar')
            expect(script).toContain('[class*="avatar"]')
        })

        it('should generate correct login check script for all supported providers', () => {
            const providers = ['chatgpt', 'gemini', 'deepseek', 'doubao', 'qwen', 'copilot']

            providers.forEach(providerId => {
                const script = webViewService.getLoginCheckScript(providerId)
                expect(script).toBeTruthy()
                expect(script).not.toBe('false')
            })
        })

        it('should return false for unsupported providers', () => {
            const script = webViewService.getLoginCheckScript('unsupported')
            expect(script).toBe('false')
        })
    })

    describe('Message Send Scripts', () => {
        beforeEach(() => {
            webViewService.initializeWebViewConfigs(mockProviders)
        })

        it('should generate correct send message script for ChatGPT', () => {
            const message = 'Hello, ChatGPT!'
            const script = webViewService.getSendMessageScript('chatgpt', message)

            expect(script).toContain('Hello, ChatGPT!')
            expect(script).toContain('textarea')
            expect(script).toContain('send-button')
            expect(script).toContain('success')
        })

        it('should properly escape message content', () => {
            const message = 'Hello "world" with \'quotes\' and \n newlines'
            const script = webViewService.getSendMessageScript('chatgpt', message)

            expect(script).toContain('\\"world\\"')
            expect(script).toContain("\\'quotes\\'")
            expect(script).toContain('\\n')
        })

        it('should generate scripts for all supported providers', () => {
            const providers = ['chatgpt', 'gemini', 'deepseek', 'doubao', 'qwen', 'copilot']
            const message = 'Test message'

            providers.forEach(providerId => {
                const script = webViewService.getSendMessageScript(providerId, message)
                expect(script).toBeTruthy()
                expect(script).toContain('Test message')
                expect(script).toContain('success')
            })
        })

        it('should handle unsupported providers', () => {
            const script = webViewService.getSendMessageScript('unsupported', 'test')
            expect(script).toContain('Provider not supported')
        })
    })

    describe('Message Queue', () => {
        beforeEach(() => {
            webViewService.initializeWebViewConfigs(mockProviders)
        })

        it('should add messages to queue correctly', () => {
            webViewService.addMessageToQueue('chatgpt', 'Message 1')
            webViewService.addMessageToQueue('chatgpt', 'Message 2')
            webViewService.addMessageToQueue('gemini', 'Message 3')

            // We can't directly access the queue, but we can test through processMessageQueue
            // This is tested indirectly through the processing functionality
        })

        it('should process message queue correctly', async () => {
            webViewService.addMessageToQueue('chatgpt', 'Message 1')
            webViewService.addMessageToQueue('chatgpt', 'Message 2')

            // Set WebView as ready
            webViewService.updateWebViewState('chatgpt', { isReady: true })

            const results = await webViewService.processMessageQueue('chatgpt')

            expect(results).toHaveLength(2)
            expect(results[0].providerId).toBe('chatgpt')
            expect(results[1].providerId).toBe('chatgpt')
        })

        it('should handle empty message queue', async () => {
            const results = await webViewService.processMessageQueue('chatgpt')
            expect(results).toHaveLength(0)
        })
    })

    describe('Retry Management', () => {
        beforeEach(() => {
            webViewService.initializeWebViewConfigs(mockProviders)
        })

        it('should manage retry counters correctly', () => {
            expect(webViewService.canRetry('chatgpt')).toBe(true)

            webViewService.incrementRetryCounter('chatgpt')
            expect(webViewService.canRetry('chatgpt')).toBe(true)

            webViewService.incrementRetryCounter('chatgpt')
            webViewService.incrementRetryCounter('chatgpt')
            expect(webViewService.canRetry('chatgpt')).toBe(false)

            webViewService.resetRetryCounter('chatgpt')
            expect(webViewService.canRetry('chatgpt')).toBe(true)
        })

        it('should calculate retry delay with exponential backoff', () => {
            const initialDelay = webViewService.getRetryDelay('chatgpt')
            expect(initialDelay).toBe(2000)

            webViewService.incrementRetryCounter('chatgpt')
            const secondDelay = webViewService.getRetryDelay('chatgpt')
            expect(secondDelay).toBe(4000)

            webViewService.incrementRetryCounter('chatgpt')
            const thirdDelay = webViewService.getRetryDelay('chatgpt')
            expect(thirdDelay).toBe(8000)
        })
    })

    describe('Statistics', () => {
        beforeEach(() => {
            webViewService.initializeWebViewConfigs(mockProviders)
        })

        it('should provide correct statistics', () => {
            // Set different states
            webViewService.updateWebViewState('chatgpt', { isReady: true })
            webViewService.updateWebViewState('gemini', { isLoading: true })

            // Add messages to queue
            webViewService.addMessageToQueue('chatgpt', 'Message 1')
            webViewService.addMessageToQueue('gemini', 'Message 2')
            webViewService.addMessageToQueue('gemini', 'Message 3')

            const stats = webViewService.getStatistics()

            expect(stats.totalWebViews).toBe(2)
            expect(stats.readyWebViews).toBe(1)
            expect(stats.loadingWebViews).toBe(1)
            expect(stats.errorWebViews).toBe(0)
            expect(stats.queuedMessages).toBe(3)
        })

        it('should handle error states in statistics', () => {
            webViewService.updateWebViewState('chatgpt', { hasError: true })

            const stats = webViewService.getStatistics()

            expect(stats.errorWebViews).toBe(1)
        })
    })

    describe('Cleanup', () => {
        it('should cleanup resources correctly', () => {
            webViewService.initializeWebViewConfigs(mockProviders)

            // Verify resources exist
            expect(webViewService.getWebViewConfig('chatgpt')).toBeDefined()
            expect(webViewService.getWebViewState('chatgpt')).toBeDefined()

            // Cleanup
            webViewService.cleanup()

            // Verify resources are cleared
            expect(webViewService.getWebViewConfig('chatgpt')).toBeUndefined()
            expect(webViewService.getWebViewState('chatgpt')).toBeUndefined()

            const stats = webViewService.getStatistics()
            expect(stats.totalWebViews).toBe(0)
            expect(stats.queuedMessages).toBe(0)
        })
    })

    describe('User Agent', () => {
        it('should generate user agent without Electron identifier', () => {
            webViewService.initializeWebViewConfigs(mockProviders)

            const config = webViewService.getWebViewConfig('chatgpt')
            expect(config?.userAgent).toBeDefined()
            expect(config?.userAgent).not.toContain('Electron')
            expect(config?.userAgent).not.toContain('ChatAllAI')
        })
    })

    describe('WebView Configuration', () => {
        it('should create correct WebView configuration', () => {
            webViewService.initializeWebViewConfigs(mockProviders)

            const config = webViewService.getWebViewConfig('chatgpt')

            expect(config).toEqual({
                id: 'webview-chatgpt',
                url: 'https://chat.openai.com',
                userAgent: expect.any(String),
                nodeIntegration: false,
                webSecurity: true,
                allowPopups: true,
                partition: 'persist:chatgpt'
            })
        })

        it('should use unique partitions for each provider', () => {
            webViewService.initializeWebViewConfigs(mockProviders)

            const chatgptConfig = webViewService.getWebViewConfig('chatgpt')
            const geminiConfig = webViewService.getWebViewConfig('gemini')

            expect(chatgptConfig?.partition).toBe('persist:chatgpt')
            expect(geminiConfig?.partition).toBe('persist:gemini')
            expect(chatgptConfig?.partition).not.toBe(geminiConfig?.partition)
        })
    })
})