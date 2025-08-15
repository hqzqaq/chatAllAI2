import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useChatStore } from '../../stores/chat'

describe('useChatStore', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
    })

    it('应该有正确的初始状态', () => {
        const store = useChatStore()

        expect(store.providers).toHaveLength(6)
        expect(store.currentMessage).toBe('')
        expect(store.conversations).toEqual({})
        expect(store.sessions).toEqual({})
        expect(store.sendingStatus).toEqual({})
    })

    it('应该包含所有预期的AI提供商', () => {
        const store = useChatStore()

        const expectedProviders = ['chatgpt', 'gemini', 'deepseek', 'doubao', 'qwen', 'copilot']
        const actualProviders = store.providers.map(p => p.id)

        expectedProviders.forEach(id => {
            expect(actualProviders).toContain(id)
        })
    })

    it('应该能够初始化对话历史', () => {
        const store = useChatStore()
        store.initializeConversations()

        store.providers.forEach(provider => {
            expect(store.conversations[provider.id]).toEqual([])
            expect(store.sessions[provider.id]).toBeDefined()
            expect(store.sendingStatus[provider.id]).toBe('idle')
        })
    })

    it('应该能够添加消息到对话历史', () => {
        const store = useChatStore()
        store.initializeConversations()

        const message = {
            id: '1',
            content: '测试消息',
            timestamp: new Date(),
            sender: 'user' as const,
            providerId: 'chatgpt',
            status: 'sent' as const
        }

        store.addMessage('chatgpt', message)

        expect(store.conversations.chatgpt).toHaveLength(1)
        expect(store.conversations.chatgpt[0]).toEqual(message)
    })

    it('应该能够更新提供商登录状态', () => {
        const store = useChatStore()

        expect(store.providers[0].isLoggedIn).toBe(false)

        store.updateProviderLoginStatus('chatgpt', true)

        expect(store.providers[0].isLoggedIn).toBe(true)
    })

    it('应该能够更新会话数据', () => {
        const store = useChatStore()
        store.initializeConversations()

        const sessionUpdate = {
            isActive: true,
            cookies: [{ name: 'test', value: 'value' }]
        }

        store.updateSession('chatgpt', sessionUpdate)

        expect(store.sessions.chatgpt.isActive).toBe(true)
        expect(store.sessions.chatgpt.cookies).toEqual([{ name: 'test', value: 'value' }])
    })

    it('应该能够设置消息发送状态', () => {
        const store = useChatStore()
        store.initializeConversations()

        store.setSendingStatus('chatgpt', 'sending')

        expect(store.sendingStatus.chatgpt).toBe('sending')
    })

    it('应该能够清空当前消息', () => {
        const store = useChatStore()
        store.currentMessage = '测试消息'

        store.clearCurrentMessage()

        expect(store.currentMessage).toBe('')
    })

    it('应该正确计算已登录提供商数量', () => {
        const store = useChatStore()

        expect(store.loggedInCount).toBe(0)

        store.updateProviderLoginStatus('chatgpt', true)
        store.updateProviderLoginStatus('gemini', true)

        expect(store.loggedInCount).toBe(2)
    })

    it('应该正确返回已登录的提供商', () => {
        const store = useChatStore()

        store.updateProviderLoginStatus('chatgpt', true)
        store.updateProviderLoginStatus('gemini', true)

        const loggedInProviders = store.loggedInProviders

        expect(loggedInProviders).toHaveLength(2)
        expect(loggedInProviders.map(p => p.id)).toEqual(['chatgpt', 'gemini'])
    })

    it('应该能够获取提供商信息', () => {
        const store = useChatStore()

        const provider = store.getProvider('chatgpt')

        expect(provider).toBeDefined()
        expect(provider?.id).toBe('chatgpt')
        expect(provider?.name).toBe('ChatGPT')
    })

    it('应该能够获取对话历史', () => {
        const store = useChatStore()
        store.initializeConversations()

        const message = {
            id: '1',
            content: '测试消息',
            timestamp: new Date(),
            sender: 'user' as const,
            providerId: 'chatgpt',
            status: 'sent' as const
        }

        store.addMessage('chatgpt', message)

        const conversation = store.getConversation('chatgpt')

        expect(conversation).toHaveLength(1)
        expect(conversation[0]).toEqual(message)
    })

    it('应该为不存在的提供商返回空对话历史', () => {
        const store = useChatStore()

        const conversation = store.getConversation('nonexistent')

        expect(conversation).toEqual([])
    })
})