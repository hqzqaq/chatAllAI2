/**
 * 核心类型接口单元测试
 */

import { describe, it, expect } from 'vitest'
import type {
  AIProvider,
  Message,
  Session,
  SessionData,
  Cookie,
  CardConfig,
  LayoutConfig,
  UserPreferences,
  PluginConfig,
  AppState,
  PerformanceMetrics,
  MemoryUsage,
  CPUUsage
} from '@/types'

describe('Core Types', () => {
  describe('Cookie Interface', () => {
    it('should have required properties', () => {
      const cookie: Cookie = {
        name: 'test-cookie',
        value: 'test-value',
        domain: 'example.com',
        path: '/'
      }

      expect(cookie.name).toBe('test-cookie')
      expect(cookie.value).toBe('test-value')
      expect(cookie.domain).toBe('example.com')
      expect(cookie.path).toBe('/')
    })

    it('should support optional properties', () => {
      const cookie: Cookie = {
        name: 'secure-cookie',
        value: 'secure-value',
        domain: 'secure.com',
        path: '/',
        expires: Date.now() + 86400000,
        httpOnly: true,
        secure: true
      }

      expect(cookie.expires).toBeDefined()
      expect(cookie.httpOnly).toBe(true)
      expect(cookie.secure).toBe(true)
    })
  })

  describe('SessionData Interface', () => {
    it('should have required properties', () => {
      const sessionData: SessionData = {
        cookies: [],
        localStorage: {},
        sessionStorage: {},
        isActive: true,
        lastActiveTime: new Date()
      }

      expect(Array.isArray(sessionData.cookies)).toBe(true)
      expect(typeof sessionData.localStorage).toBe('object')
      expect(typeof sessionData.sessionStorage).toBe('object')
      expect(sessionData.isActive).toBe(true)
      expect(sessionData.lastActiveTime).toBeInstanceOf(Date)
    })

    it('should support optional loginUrl', () => {
      const sessionData: SessionData = {
        cookies: [],
        localStorage: {},
        sessionStorage: {},
        isActive: false,
        lastActiveTime: new Date(),
        loginUrl: 'https://example.com/login'
      }

      expect(sessionData.loginUrl).toBe('https://example.com/login')
    })
  })

  describe('Message Interface', () => {
    it('should have required properties', () => {
      const message: Message = {
        id: 'msg-123',
        content: 'Hello, AI!',
        timestamp: new Date(),
        sender: 'user',
        providerId: 'chatgpt',
        status: 'sent'
      }

      expect(message.id).toBe('msg-123')
      expect(message.content).toBe('Hello, AI!')
      expect(message.timestamp).toBeInstanceOf(Date)
      expect(message.sender).toBe('user')
      expect(message.providerId).toBe('chatgpt')
      expect(message.status).toBe('sent')
    })

    it('should support optional error properties', () => {
      const message: Message = {
        id: 'msg-error',
        content: 'Failed message',
        timestamp: new Date(),
        sender: 'user',
        providerId: 'gemini',
        status: 'error',
        errorMessage: 'Network timeout',
        retryCount: 2
      }

      expect(message.errorMessage).toBe('Network timeout')
      expect(message.retryCount).toBe(2)
    })

    it('should validate sender types', () => {
      const userMessage: Message = {
        id: 'user-msg',
        content: 'User message',
        timestamp: new Date(),
        sender: 'user',
        providerId: 'test',
        status: 'sent'
      }

      const aiMessage: Message = {
        id: 'ai-msg',
        content: 'AI response',
        timestamp: new Date(),
        sender: 'ai',
        providerId: 'test',
        status: 'received'
      }

      expect(userMessage.sender).toBe('user')
      expect(aiMessage.sender).toBe('ai')
    })

    it('should validate status types', () => {
      const statuses: Message['status'][] = ['sending', 'sent', 'received', 'error']
      
      statuses.forEach(status => {
        const message: Message = {
          id: `msg-${status}`,
          content: 'Test message',
          timestamp: new Date(),
          sender: 'user',
          providerId: 'test',
          status
        }
        expect(message.status).toBe(status)
      })
    })
  })

  describe('AIProvider Interface', () => {
    it('should have required properties', () => {
      const provider: AIProvider = {
        id: 'chatgpt',
        name: 'ChatGPT',
        url: 'https://chat.openai.com',
        icon: 'chatgpt-icon.svg',
        isLoggedIn: true,
        sessionData: {
          cookies: [],
          localStorage: {},
          sessionStorage: {},
          isActive: true,
          lastActiveTime: new Date()
        },
        webviewId: 'webview-chatgpt',
        isEnabled: true,
        loadingState: 'loaded'
      }

      expect(provider.id).toBe('chatgpt')
      expect(provider.name).toBe('ChatGPT')
      expect(provider.url).toBe('https://chat.openai.com')
      expect(provider.isLoggedIn).toBe(true)
      expect(provider.isEnabled).toBe(true)
      expect(provider.loadingState).toBe('loaded')
    })

    it('should validate loading states', () => {
      const loadingStates: AIProvider['loadingState'][] = ['idle', 'loading', 'loaded', 'error']
      
      loadingStates.forEach(state => {
        const provider: AIProvider = {
          id: 'test',
          name: 'Test Provider',
          url: 'https://test.com',
          icon: 'test.svg',
          isLoggedIn: false,
          sessionData: {
            cookies: [],
            localStorage: {},
            sessionStorage: {},
            isActive: false,
            lastActiveTime: new Date()
          },
          webviewId: 'test-webview',
          isEnabled: true,
          loadingState: state
        }
        expect(provider.loadingState).toBe(state)
      })
    })
  })

  describe('Session Interface', () => {
    it('should have required properties', () => {
      const session: Session = {
        providerId: 'chatgpt',
        cookies: [],
        localStorage: {},
        sessionStorage: {},
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      expect(session.providerId).toBe('chatgpt')
      expect(session.isActive).toBe(true)
      expect(session.createdAt).toBeInstanceOf(Date)
      expect(session.updatedAt).toBeInstanceOf(Date)
    })

    it('should support optional expiresAt', () => {
      const expiryDate = new Date(Date.now() + 86400000)
      const session: Session = {
        providerId: 'gemini',
        cookies: [],
        localStorage: {},
        sessionStorage: {},
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: expiryDate
      }

      expect(session.expiresAt).toBe(expiryDate)
    })
  })

  describe('CardConfig Interface', () => {
    it('should have required properties', () => {
      const cardConfig: CardConfig = {
        id: 'card-1',
        providerId: 'chatgpt',
        position: { x: 100, y: 200 },
        size: { width: 400, height: 300 },
        isVisible: true,
        isMinimized: false,
        zIndex: 1,
        title: 'ChatGPT'
      }

      expect(cardConfig.id).toBe('card-1')
      expect(cardConfig.providerId).toBe('chatgpt')
      expect(cardConfig.position).toEqual({ x: 100, y: 200 })
      expect(cardConfig.size).toEqual({ width: 400, height: 300 })
      expect(cardConfig.isVisible).toBe(true)
      expect(cardConfig.isMinimized).toBe(false)
      expect(cardConfig.zIndex).toBe(1)
      expect(cardConfig.title).toBe('ChatGPT')
    })
  })

  describe('UserPreferences Interface', () => {
    it('should have required properties', () => {
      const preferences: UserPreferences = {
        theme: 'dark',
        language: 'zh-CN',
        autoSave: true,
        notifications: true,
        shortcuts: { 'send': 'Ctrl+Enter' },
        fontSize: 14,
        animationEnabled: true,
        soundEnabled: false
      }

      expect(preferences.theme).toBe('dark')
      expect(preferences.language).toBe('zh-CN')
      expect(preferences.autoSave).toBe(true)
      expect(preferences.notifications).toBe(true)
      expect(preferences.fontSize).toBe(14)
      expect(preferences.animationEnabled).toBe(true)
      expect(preferences.soundEnabled).toBe(false)
    })

    it('should validate theme options', () => {
      const themes: UserPreferences['theme'][] = ['light', 'dark', 'auto']
      
      themes.forEach(theme => {
        const preferences: UserPreferences = {
          theme,
          language: 'en-US',
          autoSave: false,
          notifications: false,
          shortcuts: {},
          fontSize: 12,
          animationEnabled: true,
          soundEnabled: true
        }
        expect(preferences.theme).toBe(theme)
      })
    })

    it('should validate language options', () => {
      const languages: UserPreferences['language'][] = ['zh-CN', 'en-US']
      
      languages.forEach(language => {
        const preferences: UserPreferences = {
          theme: 'light',
          language,
          autoSave: false,
          notifications: false,
          shortcuts: {},
          fontSize: 12,
          animationEnabled: true,
          soundEnabled: true
        }
        expect(preferences.language).toBe(language)
      })
    })
  })

  describe('PluginConfig Interface', () => {
    it('should have required properties', () => {
      const pluginConfig: PluginConfig = {
        id: 'ghelper',
        name: 'GHelper',
        version: '1.0.0',
        enabled: true,
        settings: { apiKey: 'test-key' },
        permissions: ['webRequest', 'storage']
      }

      expect(pluginConfig.id).toBe('ghelper')
      expect(pluginConfig.name).toBe('GHelper')
      expect(pluginConfig.version).toBe('1.0.0')
      expect(pluginConfig.enabled).toBe(true)
      expect(pluginConfig.settings).toEqual({ apiKey: 'test-key' })
      expect(pluginConfig.permissions).toEqual(['webRequest', 'storage'])
    })

    it('should support optional manifestUrl', () => {
      const pluginConfig: PluginConfig = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '2.0.0',
        enabled: false,
        settings: {},
        permissions: [],
        manifestUrl: 'https://example.com/manifest.json'
      }

      expect(pluginConfig.manifestUrl).toBe('https://example.com/manifest.json')
    })
  })

  describe('AppState Interface', () => {
    it('should have required properties', () => {
      const appState: AppState = {
        providers: [],
        currentMessage: '',
        conversations: {},
        layoutConfig: {
          cardPositions: [],
          cardSizes: [],
          gridLayout: { columns: 2, rows: 3, gap: 10, containerWidth: 1200, containerHeight: 800 },
          theme: { mode: 'light', primaryColor: '#007bff', backgroundColor: '#ffffff', textColor: '#000000', borderColor: '#dee2e6', shadowColor: 'rgba(0,0,0,0.1)' },
          version: '1.0.0'
        },
        userPreferences: {
          theme: 'light',
          language: 'en-US',
          autoSave: true,
          notifications: true,
          shortcuts: {},
          fontSize: 14,
          animationEnabled: true,
          soundEnabled: true
        },
        pluginSettings: {
          plugins: [],
          globalSettings: {},
          autoUpdate: true
        },
        isInitialized: false
      }

      expect(Array.isArray(appState.providers)).toBe(true)
      expect(typeof appState.currentMessage).toBe('string')
      expect(typeof appState.conversations).toBe('object')
      expect(appState.isInitialized).toBe(false)
    })

    it('should support optional lastSaveTime', () => {
      const saveTime = new Date()
      const appState: AppState = {
        providers: [],
        currentMessage: '',
        conversations: {},
        layoutConfig: {
          cardPositions: [],
          cardSizes: [],
          gridLayout: { columns: 2, rows: 3, gap: 10, containerWidth: 1200, containerHeight: 800 },
          theme: { mode: 'light', primaryColor: '#007bff', backgroundColor: '#ffffff', textColor: '#000000', borderColor: '#dee2e6', shadowColor: 'rgba(0,0,0,0.1)' },
          version: '1.0.0'
        },
        userPreferences: {
          theme: 'light',
          language: 'en-US',
          autoSave: true,
          notifications: true,
          shortcuts: {},
          fontSize: 14,
          animationEnabled: true,
          soundEnabled: true
        },
        pluginSettings: {
          plugins: [],
          globalSettings: {},
          autoUpdate: true
        },
        isInitialized: true,
        lastSaveTime: saveTime
      }

      expect(appState.lastSaveTime).toBe(saveTime)
    })
  })

  describe('PerformanceMetrics Interface', () => {
    it('should have required properties', () => {
      const metrics: PerformanceMetrics = {
        startupTime: 1500,
        messageSendLatency: 200,
        webviewLoadTime: { 'chatgpt': 2000, 'gemini': 1800 },
        memoryUsage: {
          used: 512,
          total: 1024,
          percentage: 50,
          timestamp: new Date()
        },
        cpuUsage: {
          percentage: 25,
          timestamp: new Date()
        }
      }

      expect(metrics.startupTime).toBe(1500)
      expect(metrics.messageSendLatency).toBe(200)
      expect(metrics.webviewLoadTime).toEqual({ 'chatgpt': 2000, 'gemini': 1800 })
      expect(metrics.memoryUsage.percentage).toBe(50)
      expect(metrics.cpuUsage.percentage).toBe(25)
    })
  })

  describe('MemoryUsage Interface', () => {
    it('should have required properties', () => {
      const memoryUsage: MemoryUsage = {
        used: 256,
        total: 512,
        percentage: 50,
        timestamp: new Date()
      }

      expect(memoryUsage.used).toBe(256)
      expect(memoryUsage.total).toBe(512)
      expect(memoryUsage.percentage).toBe(50)
      expect(memoryUsage.timestamp).toBeInstanceOf(Date)
    })

    it('should calculate percentage correctly', () => {
      const memoryUsage: MemoryUsage = {
        used: 300,
        total: 1000,
        percentage: (300 / 1000) * 100,
        timestamp: new Date()
      }

      expect(memoryUsage.percentage).toBe(30)
    })
  })

  describe('CPUUsage Interface', () => {
    it('should have required properties', () => {
      const cpuUsage: CPUUsage = {
        percentage: 75.5,
        timestamp: new Date()
      }

      expect(cpuUsage.percentage).toBe(75.5)
      expect(cpuUsage.timestamp).toBeInstanceOf(Date)
    })

    it('should handle edge cases', () => {
      const zeroCpu: CPUUsage = {
        percentage: 0,
        timestamp: new Date()
      }

      const maxCpu: CPUUsage = {
        percentage: 100,
        timestamp: new Date()
      }

      expect(zeroCpu.percentage).toBe(0)
      expect(maxCpu.percentage).toBe(100)
    })
  })
})