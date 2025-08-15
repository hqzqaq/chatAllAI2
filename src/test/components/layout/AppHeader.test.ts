import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import AppHeader from '../../../components/layout/AppHeader.vue'
import { useAppStore, useChatStore } from '../../../stores'

// Mock window.electronAPI
const mockElectronAPI = {
    minimizeWindow: vi.fn(),
    closeWindow: vi.fn()
}

Object.defineProperty(window, 'electronAPI', {
    value: mockElectronAPI,
    writable: true
})

// 创建测试路由
const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: '/', component: { template: '<div>Home</div>' } },
        { path: '/chat', component: { template: '<div>Chat</div>' } },
        { path: '/settings', component: { template: '<div>Settings</div>' } }
    ]
})

describe('AppHeader', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.clearAllMocks()
    })

    it('应该正确渲染头部结构', () => {
        const wrapper = mount(AppHeader, {
            global: {
                plugins: [router]
            }
        })

        expect(wrapper.find('.app-header').exists()).toBe(true)
        expect(wrapper.find('.app-title').exists()).toBe(true)
        expect(wrapper.find('.app-title').text()).toContain('ChatAllAI')
    })

    it('应该显示正确的菜单项', () => {
        const wrapper = mount(AppHeader, {
            global: {
                plugins: [router]
            }
        })

        const menuItems = wrapper.findAll('.el-menu-item')
        expect(menuItems).toHaveLength(3)

        expect(menuItems[0].text()).toContain('首页')
        expect(menuItems[1].text()).toContain('对话')
        expect(menuItems[2].text()).toContain('设置')
    })

    it('应该显示登录状态指示器', () => {
        const wrapper = mount(AppHeader, {
            global: {
                plugins: [router]
            }
        })

        const chatStore = useChatStore()
        chatStore.providers[0].isLoggedIn = true
        chatStore.providers[1].isLoggedIn = true

        expect(wrapper.find('.login-status').exists()).toBe(true)
        expect(wrapper.find('.status-text').text()).toContain('2/6')
    })

    it('应该能够切换主题', async () => {
        const wrapper = mount(AppHeader, {
            global: {
                plugins: [router]
            }
        })

        const appStore = useAppStore()
        const themeButton = wrapper.find('.theme-toggle')

        expect(themeButton.exists()).toBe(true)

        await themeButton.trigger('click')

        // 验证主题切换逻辑
        expect(appStore.userPreferences.theme).toBe('dark')
    })

    it('应该能够最小化和关闭窗口', async () => {
        const wrapper = mount(AppHeader, {
            global: {
                plugins: [router]
            }
        })

        const windowControls = wrapper.find('.window-controls')
        const buttons = windowControls.findAll('.el-button')

        expect(buttons).toHaveLength(2)

        // 测试最小化
        await buttons[0].trigger('click')
        expect(mockElectronAPI.minimizeWindow).toHaveBeenCalled()

        // 测试关闭
        await buttons[1].trigger('click')
        expect(mockElectronAPI.closeWindow).toHaveBeenCalled()
    })

    it('应该能够处理菜单选择', async () => {
        const wrapper = mount(AppHeader, {
            global: {
                plugins: [router]
            }
        })

        const menu = wrapper.findComponent({ name: 'ElMenu' })

        // 模拟菜单选择
        await menu.vm.$emit('select', '/chat')

        expect(router.currentRoute.value.path).toBe('/chat')
    })
})