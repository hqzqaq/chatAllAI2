import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import AppLayout from '../../../components/layout/AppLayout.vue'
import { useAppStore } from '../../../stores'

// Mock子组件
vi.mock('../../../components/layout/AppHeader.vue', () => ({
    default: {
        name: 'AppHeader',
        template: '<div data-testid="app-header">Header</div>'
    }
}))

vi.mock('../../../components/layout/AppFooter.vue', () => ({
    default: {
        name: 'AppFooter',
        template: '<div data-testid="app-footer">Footer</div>'
    }
}))

// 创建测试路由
const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: '/', component: { template: '<div>Home</div>' } }
    ]
})

describe('AppLayout', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
    })

    it('应该正确渲染布局结构', () => {
        const wrapper = mount(AppLayout, {
            global: {
                plugins: [router]
            }
        })

        expect(wrapper.find('.app-layout').exists()).toBe(true)
        expect(wrapper.find('[data-testid="app-header"]').exists()).toBe(true)
        expect(wrapper.find('.main-content').exists()).toBe(true)
        expect(wrapper.find('[data-testid="app-footer"]').exists()).toBe(true)
    })

    it('应该根据主题状态应用正确的CSS类', async () => {
        const wrapper = mount(AppLayout, {
            global: {
                plugins: [router]
            }
        })

        const appStore = useAppStore()

        // 测试浅色模式
        appStore.userPreferences.theme = 'light'
        await wrapper.vm.$nextTick()
        expect(wrapper.find('.app-layout').classes()).not.toContain('dark-mode')

        // 测试深色模式
        appStore.userPreferences.theme = 'dark'
        await wrapper.vm.$nextTick()
        expect(wrapper.find('.app-layout').classes()).toContain('dark-mode')
    })

    it('应该包含router-view用于渲染页面内容', () => {
        const wrapper = mount(AppLayout, {
            global: {
                plugins: [router]
            }
        })

        expect(wrapper.findComponent({ name: 'RouterView' }).exists()).toBe(true)
    })
})