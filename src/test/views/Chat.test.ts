import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import Chat from '../../views/Chat.vue'
import { useChatStore, useLayoutStore } from '../../stores'

// Mock components
vi.mock('../../components/chat/UnifiedInput.vue', () => ({
    default: {
        name: 'UnifiedInput',
        template: '<div class="mock-unified-input">Unified Input</div>'
    }
}))

vi.mock('../../components/chat/AICard.vue', () => ({
    default: {
        name: 'AICard',
        template: '<div class="mock-ai-card">{{ provider.name }}</div>',
        props: ['provider', 'config']
    }
}))

describe('Chat View', () => {
    let pinia: ReturnType<typeof createPinia>
    let chatStore: ReturnType<typeof useChatStore>
    let layoutStore: ReturnType<typeof useLayoutStore>

    beforeEach(() => {
        pinia = createPinia()
        setActivePinia(pinia)

        chatStore = useChatStore()
        layoutStore = useLayoutStore()

        // Mock window resize
        Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: 1024
        })

        Object.defineProperty(window, 'innerHeight', {
            writable: true,
            configurable: true,
            value: 768
        })
    })

    it('should render correctly', () => {
        const wrapper = mount(Chat, {
            global: {
                plugins: [pinia]
            }
        })

        expect(wrapper.find('.chat-view').exists()).toBe(true)
        expect(wrapper.find('.chat-container').exists()).toBe(true)
        expect(wrapper.find('.input-section').exists()).toBe(true)
        expect(wrapper.find('.cards-grid').exists()).toBe(true)
    })

    it('should display all visible providers', () => {
        const wrapper = mount(Chat, {
            global: {
                plugins: [pinia]
            }
        })

        // Should show all 6 providers by default
        const cards = wrapper.findAll('.mock-ai-card')
        expect(cards).toHaveLength(6)
    })

    it('should apply grid styles correctly', () => {
        const wrapper = mount(Chat, {
            global: {
                plugins: [pinia]
            }
        })

        const grid = wrapper.find('.cards-grid')
        const style = grid.attributes('style')

        expect(style).toContain('display: grid')
        expect(style).toContain('grid-template-columns')
        expect(style).toContain('gap')
    })

    it('should handle window resize', async () => {
        const wrapper = mount(Chat, {
            global: {
                plugins: [pinia]
            }
        })

        // Simulate window resize
        Object.defineProperty(window, 'innerWidth', { value: 600 })
        window.dispatchEvent(new Event('resize'))

        await wrapper.vm.$nextTick()

        // Should adjust grid columns for smaller screen
        expect(layoutStore.gridSettings.columns).toBe(1)
    })

    it('should initialize stores correctly', () => {
        mount(Chat, {
            global: {
                plugins: [pinia]
            }
        })

        // Check that stores are initialized
        expect(chatStore.providers).toHaveLength(6)
        expect(Object.keys(layoutStore.cardConfigs)).toHaveLength(6)
    })

    it('should filter visible providers', async () => {
        const wrapper = mount(Chat, {
            global: {
                plugins: [pinia]
            }
        })

        // Hide one provider
        layoutStore.toggleCardVisibility('chatgpt')

        await wrapper.vm.$nextTick()

        // Should show 5 providers (one hidden)
        const cards = wrapper.findAll('.mock-ai-card')
        expect(cards).toHaveLength(5)
    })

    it('should handle responsive breakpoints', async () => {
        const wrapper = mount(Chat, {
            global: {
                plugins: [pinia]
            }
        })

        // Test different screen sizes
        const testSizes = [
            { width: 1400, expectedColumns: 3 },
            { width: 1000, expectedColumns: 2 },
            { width: 600, expectedColumns: 1 }
        ]

        for (const { width, expectedColumns } of testSizes) {
            Object.defineProperty(window, 'innerWidth', { value: width })
            window.dispatchEvent(new Event('resize'))

            await wrapper.vm.$nextTick()

            expect(layoutStore.gridSettings.columns).toBe(expectedColumns)
        }
    })
})