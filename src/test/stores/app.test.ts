import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAppStore } from '../../stores/app'

// Mock localStorage
const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn()
}

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true
})

// Mock window.electronAPI
const mockElectronAPI = {
    getAppVersion: vi.fn().mockResolvedValue('1.0.0')
}

Object.defineProperty(window, 'electronAPI', {
    value: mockElectronAPI,
    writable: true
})

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
})

describe('useAppStore', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.clearAllMocks()
    })

    it('应该有正确的初始状态', () => {
        const store = useAppStore()

        expect(store.appVersion).toBe('')
        expect(store.isInitialized).toBe(false)
        expect(store.userPreferences).toEqual({
            theme: 'auto',
            language: 'zh-CN',
            autoSave: true,
            notifications: true,
            shortcuts: {}
        })
    })

    it('应该能够初始化应用', async () => {
        const store = useAppStore()

        await store.initializeApp()

        expect(mockElectronAPI.getAppVersion).toHaveBeenCalled()
        expect(store.appVersion).toBe('1.0.0')
        expect(store.isInitialized).toBe(true)
    })

    it('应该能够加载用户偏好设置', async () => {
        const mockPreferences = {
            theme: 'dark',
            language: 'en-US',
            autoSave: false,
            notifications: false,
            shortcuts: { 'send': 'Ctrl+Enter' }
        }

        localStorageMock.getItem.mockReturnValue(JSON.stringify(mockPreferences))

        const store = useAppStore()
        await store.loadUserPreferences()

        expect(store.userPreferences.theme).toBe('dark')
        expect(store.userPreferences.language).toBe('en-US')
        expect(store.userPreferences.autoSave).toBe(false)
    })

    it('应该能够保存用户偏好设置', async () => {
        const store = useAppStore()
        store.userPreferences.theme = 'dark'

        await store.saveUserPreferences()

        expect(localStorageMock.setItem).toHaveBeenCalledWith(
            'userPreferences',
            JSON.stringify(store.userPreferences)
        )
    })

    it('应该能够更新主题', () => {
        const store = useAppStore()

        store.updateTheme('dark')

        expect(store.userPreferences.theme).toBe('dark')
    })

    it('应该正确计算isDarkMode', () => {
        const store = useAppStore()

        // 测试明确设置为dark
        store.userPreferences.theme = 'dark'
        expect(store.isDarkMode).toBe(true)

        // 测试明确设置为light
        store.userPreferences.theme = 'light'
        expect(store.isDarkMode).toBe(false)

        // 测试auto模式（依赖于matchMedia mock的返回值）
        store.userPreferences.theme = 'auto'
        expect(store.isDarkMode).toBe(false) // 因为mock返回false
    })

    it('应该能够加载和保存布局配置', async () => {
        const mockLayoutConfig = {
            cardPositions: [],
            cardSizes: [],
            gridLayout: { columns: 2, rows: 3, gap: 20 },
            theme: { primaryColor: '#ff0000', backgroundColor: '#ffffff' }
        }

        localStorageMock.getItem.mockReturnValue(JSON.stringify(mockLayoutConfig))

        const store = useAppStore()
        await store.loadLayoutConfig()

        expect(store.layoutConfig.gridLayout.columns).toBe(2)
        expect(store.layoutConfig.gridLayout.rows).toBe(3)

        await store.saveLayoutConfig()

        expect(localStorageMock.setItem).toHaveBeenCalledWith(
            'layoutConfig',
            JSON.stringify(store.layoutConfig)
        )
    })

    it('应该处理localStorage错误', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { })
        localStorageMock.getItem.mockImplementation(() => {
            throw new Error('localStorage error')
        })

        const store = useAppStore()
        await store.loadUserPreferences()

        expect(consoleSpy).toHaveBeenCalledWith('Failed to load user preferences:', expect.any(Error))

        consoleSpy.mockRestore()
    })
})