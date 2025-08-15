/**
 * 事件类型接口单元测试
 */

import { describe, it, expect } from 'vitest'
import {
  EventType,
  type BaseEvent,
  type AppEvent,
  type MessageEvent,
  type WebViewEvent,
  type SessionEvent,
  type LayoutEvent,
  type PluginEvent,
  type SettingsEvent,
  type StorageEvent,
  type AppEventUnion,
  type EventListener,
  type EventFilter,
  type EventHistory
} from '@/types/events'

describe('Event Types', () => {
  describe('EventType Enum', () => {
    it('should have all app event types', () => {
      expect(EventType.APP_READY).toBe('APP_READY')
      expect(EventType.APP_QUIT).toBe('APP_QUIT')
      expect(EventType.APP_ERROR).toBe('APP_ERROR')
    })

    it('should have all message event types', () => {
      expect(EventType.MESSAGE_SEND).toBe('MESSAGE_SEND')
      expect(EventType.MESSAGE_RECEIVED).toBe('MESSAGE_RECEIVED')
      expect(EventType.MESSAGE_ERROR).toBe('MESSAGE_ERROR')
      expect(EventType.MESSAGE_RETRY).toBe('MESSAGE_RETRY')
    })

    it('should have all webview event types', () => {
      expect(EventType.WEBVIEW_READY).toBe('WEBVIEW_READY')
      expect(EventType.WEBVIEW_LOADING).toBe('WEBVIEW_LOADING')
      expect(EventType.WEBVIEW_LOADED).toBe('WEBVIEW_LOADED')
      expect(EventType.WEBVIEW_ERROR).toBe('WEBVIEW_ERROR')
      expect(EventType.WEBVIEW_CRASHED).toBe('WEBVIEW_CRASHED')
      expect(EventType.WEBVIEW_NAVIGATION).toBe('WEBVIEW_NAVIGATION')
    })

    it('should have all session event types', () => {
      expect(EventType.SESSION_LOGIN).toBe('SESSION_LOGIN')
      expect(EventType.SESSION_LOGOUT).toBe('SESSION_LOGOUT')
      expect(EventType.SESSION_EXPIRED).toBe('SESSION_EXPIRED')
      expect(EventType.SESSION_RESTORED).toBe('SESSION_RESTORED')
    })

    it('should have all layout event types', () => {
      expect(EventType.LAYOUT_CHANGED).toBe('LAYOUT_CHANGED')
      expect(EventType.CARD_RESIZED).toBe('CARD_RESIZED')
      expect(EventType.CARD_MOVED).toBe('CARD_MOVED')
      expect(EventType.CARD_MINIMIZED).toBe('CARD_MINIMIZED')
      expect(EventType.CARD_MAXIMIZED).toBe('CARD_MAXIMIZED')
    })

    it('should have all plugin event types', () => {
      expect(EventType.PLUGIN_LOADED).toBe('PLUGIN_LOADED')
      expect(EventType.PLUGIN_UNLOADED).toBe('PLUGIN_UNLOADED')
      expect(EventType.PLUGIN_ERROR).toBe('PLUGIN_ERROR')
      expect(EventType.PLUGIN_ENABLED).toBe('PLUGIN_ENABLED')
      expect(EventType.PLUGIN_DISABLED).toBe('PLUGIN_DISABLED')
    })

    it('should have all settings event types', () => {
      expect(EventType.SETTINGS_CHANGED).toBe('SETTINGS_CHANGED')
      expect(EventType.THEME_CHANGED).toBe('THEME_CHANGED')
      expect(EventType.LANGUAGE_CHANGED).toBe('LANGUAGE_CHANGED')
    })

    it('should have all storage event types', () => {
      expect(EventType.DATA_SAVED).toBe('DATA_SAVED')
      expect(EventType.DATA_LOADED).toBe('DATA_LOADED')
      expect(EventType.DATA_ERROR).toBe('DATA_ERROR')
    })
  })

  describe('BaseEvent Interface', () => {
    it('should have required properties', () => {
      const baseEvent: BaseEvent = {
        type: EventType.APP_READY,
        timestamp: new Date(),
        source: 'main-process'
      }

      expect(baseEvent.type).toBe(EventType.APP_READY)
      expect(baseEvent.timestamp).toBeInstanceOf(Date)
      expect(baseEvent.source).toBe('main-process')
    })

    it('should support optional data property', () => {
      const baseEvent: BaseEvent = {
        type: EventType.APP_ERROR,
        timestamp: new Date(),
        source: 'renderer-process',
        data: { errorCode: 'APP_001', message: 'Application error' }
      }

      expect(baseEvent.data).toEqual({ errorCode: 'APP_001', message: 'Application error' })
    })
  })

  describe('AppEvent Interface', () => {
    it('should extend BaseEvent with app-specific properties', () => {
      const appEvent: AppEvent = {
        type: EventType.APP_READY,
        timestamp: new Date(),
        source: 'main-process',
        version: '1.0.0',
        platform: 'darwin'
      }

      expect(appEvent.type).toBe(EventType.APP_READY)
      expect(appEvent.version).toBe('1.0.0')
      expect(appEvent.platform).toBe('darwin')
    })

    it('should validate app event types', () => {
      const appEventTypes: AppEvent['type'][] = [
        EventType.APP_READY,
        EventType.APP_QUIT,
        EventType.APP_ERROR
      ]

      appEventTypes.forEach(type => {
        const event: AppEvent = {
          type,
          timestamp: new Date(),
          source: 'main-process'
        }
        expect(event.type).toBe(type)
      })
    })
  })

  describe('MessageEvent Interface', () => {
    it('should extend BaseEvent with message-specific properties', () => {
      const messageEvent: MessageEvent = {
        type: EventType.MESSAGE_SEND,
        timestamp: new Date(),
        source: 'renderer-process',
        messageId: 'msg-123',
        providerId: 'chatgpt',
        content: 'Hello, AI!'
      }

      expect(messageEvent.type).toBe(EventType.MESSAGE_SEND)
      expect(messageEvent.messageId).toBe('msg-123')
      expect(messageEvent.providerId).toBe('chatgpt')
      expect(messageEvent.content).toBe('Hello, AI!')
    })

    it('should support error property for error events', () => {
      const errorEvent: MessageEvent = {
        type: EventType.MESSAGE_ERROR,
        timestamp: new Date(),
        source: 'webview-process',
        messageId: 'msg-456',
        providerId: 'gemini',
        error: 'Network timeout'
      }

      expect(errorEvent.error).toBe('Network timeout')
    })

    it('should validate message event types', () => {
      const messageEventTypes: MessageEvent['type'][] = [
        EventType.MESSAGE_SEND,
        EventType.MESSAGE_RECEIVED,
        EventType.MESSAGE_ERROR,
        EventType.MESSAGE_RETRY
      ]

      messageEventTypes.forEach(type => {
        const event: MessageEvent = {
          type,
          timestamp: new Date(),
          source: 'test',
          messageId: 'test-msg',
          providerId: 'test-provider'
        }
        expect(event.type).toBe(type)
      })
    })
  })

  describe('WebViewEvent Interface', () => {
    it('should extend BaseEvent with webview-specific properties', () => {
      const webviewEvent: WebViewEvent = {
        type: EventType.WEBVIEW_LOADED,
        timestamp: new Date(),
        source: 'webview-process',
        webviewId: 'webview-chatgpt',
        providerId: 'chatgpt',
        url: 'https://chat.openai.com',
        title: 'ChatGPT'
      }

      expect(webviewEvent.type).toBe(EventType.WEBVIEW_LOADED)
      expect(webviewEvent.webviewId).toBe('webview-chatgpt')
      expect(webviewEvent.providerId).toBe('chatgpt')
      expect(webviewEvent.url).toBe('https://chat.openai.com')
      expect(webviewEvent.title).toBe('ChatGPT')
    })

    it('should support error property for error events', () => {
      const errorEvent: WebViewEvent = {
        type: EventType.WEBVIEW_ERROR,
        timestamp: new Date(),
        source: 'webview-process',
        webviewId: 'webview-gemini',
        providerId: 'gemini',
        error: 'Failed to load page'
      }

      expect(errorEvent.error).toBe('Failed to load page')
    })

    it('should validate webview event types', () => {
      const webviewEventTypes: WebViewEvent['type'][] = [
        EventType.WEBVIEW_READY,
        EventType.WEBVIEW_LOADING,
        EventType.WEBVIEW_LOADED,
        EventType.WEBVIEW_ERROR,
        EventType.WEBVIEW_CRASHED,
        EventType.WEBVIEW_NAVIGATION
      ]

      webviewEventTypes.forEach(type => {
        const event: WebViewEvent = {
          type,
          timestamp: new Date(),
          source: 'webview',
          webviewId: 'test-webview',
          providerId: 'test-provider'
        }
        expect(event.type).toBe(type)
      })
    })
  })

  describe('SessionEvent Interface', () => {
    it('should extend BaseEvent with session-specific properties', () => {
      const sessionEvent: SessionEvent = {
        type: EventType.SESSION_LOGIN,
        timestamp: new Date(),
        source: 'auth-manager',
        providerId: 'chatgpt',
        sessionId: 'session-123',
        userId: 'user-456'
      }

      expect(sessionEvent.type).toBe(EventType.SESSION_LOGIN)
      expect(sessionEvent.providerId).toBe('chatgpt')
      expect(sessionEvent.sessionId).toBe('session-123')
      expect(sessionEvent.userId).toBe('user-456')
    })

    it('should validate session event types', () => {
      const sessionEventTypes: SessionEvent['type'][] = [
        EventType.SESSION_LOGIN,
        EventType.SESSION_LOGOUT,
        EventType.SESSION_EXPIRED,
        EventType.SESSION_RESTORED
      ]

      sessionEventTypes.forEach(type => {
        const event: SessionEvent = {
          type,
          timestamp: new Date(),
          source: 'session-manager',
          providerId: 'test-provider'
        }
        expect(event.type).toBe(type)
      })
    })
  })

  describe('LayoutEvent Interface', () => {
    it('should extend BaseEvent with layout-specific properties', () => {
      const layoutEvent: LayoutEvent = {
        type: EventType.CARD_RESIZED,
        timestamp: new Date(),
        source: 'layout-manager',
        cardId: 'card-chatgpt',
        position: { x: 100, y: 200 },
        size: { width: 400, height: 300 }
      }

      expect(layoutEvent.type).toBe(EventType.CARD_RESIZED)
      expect(layoutEvent.cardId).toBe('card-chatgpt')
      expect(layoutEvent.position).toEqual({ x: 100, y: 200 })
      expect(layoutEvent.size).toEqual({ width: 400, height: 300 })
    })

    it('should support layout config for layout changed events', () => {
      const layoutEvent: LayoutEvent = {
        type: EventType.LAYOUT_CHANGED,
        timestamp: new Date(),
        source: 'layout-manager',
        layoutConfig: { columns: 2, rows: 3, gap: 10 }
      }

      expect(layoutEvent.layoutConfig).toEqual({ columns: 2, rows: 3, gap: 10 })
    })

    it('should validate layout event types', () => {
      const layoutEventTypes: LayoutEvent['type'][] = [
        EventType.LAYOUT_CHANGED,
        EventType.CARD_RESIZED,
        EventType.CARD_MOVED,
        EventType.CARD_MINIMIZED,
        EventType.CARD_MAXIMIZED
      ]

      layoutEventTypes.forEach(type => {
        const event: LayoutEvent = {
          type,
          timestamp: new Date(),
          source: 'layout-manager'
        }
        expect(event.type).toBe(type)
      })
    })
  })

  describe('PluginEvent Interface', () => {
    it('should extend BaseEvent with plugin-specific properties', () => {
      const pluginEvent: PluginEvent = {
        type: EventType.PLUGIN_LOADED,
        timestamp: new Date(),
        source: 'plugin-manager',
        pluginId: 'ghelper',
        pluginName: 'GHelper',
        version: '1.0.0'
      }

      expect(pluginEvent.type).toBe(EventType.PLUGIN_LOADED)
      expect(pluginEvent.pluginId).toBe('ghelper')
      expect(pluginEvent.pluginName).toBe('GHelper')
      expect(pluginEvent.version).toBe('1.0.0')
    })

    it('should support error property for error events', () => {
      const errorEvent: PluginEvent = {
        type: EventType.PLUGIN_ERROR,
        timestamp: new Date(),
        source: 'plugin-manager',
        pluginId: 'test-plugin',
        pluginName: 'Test Plugin',
        error: 'Plugin initialization failed'
      }

      expect(errorEvent.error).toBe('Plugin initialization failed')
    })

    it('should validate plugin event types', () => {
      const pluginEventTypes: PluginEvent['type'][] = [
        EventType.PLUGIN_LOADED,
        EventType.PLUGIN_UNLOADED,
        EventType.PLUGIN_ERROR,
        EventType.PLUGIN_ENABLED,
        EventType.PLUGIN_DISABLED
      ]

      pluginEventTypes.forEach(type => {
        const event: PluginEvent = {
          type,
          timestamp: new Date(),
          source: 'plugin-manager',
          pluginId: 'test-plugin',
          pluginName: 'Test Plugin'
        }
        expect(event.type).toBe(type)
      })
    })
  })

  describe('SettingsEvent Interface', () => {
    it('should extend BaseEvent with settings-specific properties', () => {
      const settingsEvent: SettingsEvent = {
        type: EventType.THEME_CHANGED,
        timestamp: new Date(),
        source: 'settings-manager',
        setting: 'theme',
        oldValue: 'light',
        newValue: 'dark'
      }

      expect(settingsEvent.type).toBe(EventType.THEME_CHANGED)
      expect(settingsEvent.setting).toBe('theme')
      expect(settingsEvent.oldValue).toBe('light')
      expect(settingsEvent.newValue).toBe('dark')
    })

    it('should validate settings event types', () => {
      const settingsEventTypes: SettingsEvent['type'][] = [
        EventType.SETTINGS_CHANGED,
        EventType.THEME_CHANGED,
        EventType.LANGUAGE_CHANGED
      ]

      settingsEventTypes.forEach(type => {
        const event: SettingsEvent = {
          type,
          timestamp: new Date(),
          source: 'settings-manager',
          setting: 'test-setting'
        }
        expect(event.type).toBe(type)
      })
    })
  })

  describe('StorageEvent Interface', () => {
    it('should extend BaseEvent with storage-specific properties', () => {
      const storageEvent: StorageEvent = {
        type: EventType.DATA_SAVED,
        timestamp: new Date(),
        source: 'storage-manager',
        key: 'user-preferences',
        operation: 'save'
      }

      expect(storageEvent.type).toBe(EventType.DATA_SAVED)
      expect(storageEvent.key).toBe('user-preferences')
      expect(storageEvent.operation).toBe('save')
    })

    it('should support error property for error events', () => {
      const errorEvent: StorageEvent = {
        type: EventType.DATA_ERROR,
        timestamp: new Date(),
        source: 'storage-manager',
        operation: 'load',
        error: 'File not found'
      }

      expect(errorEvent.error).toBe('File not found')
    })

    it('should validate storage operations', () => {
      const operations: StorageEvent['operation'][] = ['save', 'load', 'delete', 'clear']

      operations.forEach(operation => {
        const event: StorageEvent = {
          type: EventType.DATA_SAVED,
          timestamp: new Date(),
          source: 'storage-manager',
          operation
        }
        expect(event.operation).toBe(operation)
      })
    })

    it('should validate storage event types', () => {
      const storageEventTypes: StorageEvent['type'][] = [
        EventType.DATA_SAVED,
        EventType.DATA_LOADED,
        EventType.DATA_ERROR
      ]

      storageEventTypes.forEach(type => {
        const event: StorageEvent = {
          type,
          timestamp: new Date(),
          source: 'storage-manager',
          operation: 'save'
        }
        expect(event.type).toBe(type)
      })
    })
  })

  describe('EventFilter Interface', () => {
    it('should have optional filter properties', () => {
      const filter: EventFilter = {
        types: [EventType.MESSAGE_SEND, EventType.MESSAGE_RECEIVED],
        sources: ['renderer-process'],
        timeRange: {
          start: new Date(Date.now() - 86400000),
          end: new Date()
        }
      }

      expect(filter.types).toEqual([EventType.MESSAGE_SEND, EventType.MESSAGE_RECEIVED])
      expect(filter.sources).toEqual(['renderer-process'])
      expect(filter.timeRange?.start).toBeInstanceOf(Date)
      expect(filter.timeRange?.end).toBeInstanceOf(Date)
    })

    it('should support custom filter function', () => {
      const customFilter = (event: BaseEvent) => event.source === 'test'
      const filter: EventFilter = {
        customFilter
      }

      expect(filter.customFilter).toBe(customFilter)
    })
  })

  describe('EventHistory Interface', () => {
    it('should have required properties', () => {
      const history: EventHistory = {
        events: [],
        maxSize: 1000,
        addEvent: vi.fn(),
        getEvents: vi.fn(),
        clear: vi.fn()
      }

      expect(Array.isArray(history.events)).toBe(true)
      expect(history.maxSize).toBe(1000)
      expect(typeof history.addEvent).toBe('function')
      expect(typeof history.getEvents).toBe('function')
      expect(typeof history.clear).toBe('function')
    })

    it('should support optional filter', () => {
      const filter: EventFilter = {
        types: [EventType.APP_READY]
      }

      const history: EventHistory = {
        events: [],
        maxSize: 500,
        filter,
        addEvent: vi.fn(),
        getEvents: vi.fn(),
        clear: vi.fn()
      }

      expect(history.filter).toBe(filter)
    })
  })

  describe('AppEventUnion Type', () => {
    it('should accept all event types', () => {
      const appEvent: AppEventUnion = {
        type: EventType.APP_READY,
        timestamp: new Date(),
        source: 'main-process'
      }

      const messageEvent: AppEventUnion = {
        type: EventType.MESSAGE_SEND,
        timestamp: new Date(),
        source: 'renderer-process',
        messageId: 'msg-123',
        providerId: 'chatgpt'
      }

      const webviewEvent: AppEventUnion = {
        type: EventType.WEBVIEW_LOADED,
        timestamp: new Date(),
        source: 'webview-process',
        webviewId: 'webview-1',
        providerId: 'gemini'
      }

      expect(appEvent.type).toBe(EventType.APP_READY)
      expect(messageEvent.type).toBe(EventType.MESSAGE_SEND)
      expect(webviewEvent.type).toBe(EventType.WEBVIEW_LOADED)
    })
  })

  describe('EventListener Interface', () => {
    it('should be a function that accepts an event', () => {
      const listener: EventListener<MessageEvent> = (event) => {
        expect(event.type).toBeDefined()
        expect(event.timestamp).toBeInstanceOf(Date)
      }

      const mockEvent: MessageEvent = {
        type: EventType.MESSAGE_SEND,
        timestamp: new Date(),
        source: 'test',
        messageId: 'test-msg',
        providerId: 'test-provider'
      }

      listener(mockEvent)
    })

    it('should support async listeners', async () => {
      const asyncListener: EventListener<AppEvent> = async (event) => {
        await new Promise(resolve => setTimeout(resolve, 10))
        expect(event.type).toBe(EventType.APP_READY)
      }

      const mockEvent: AppEvent = {
        type: EventType.APP_READY,
        timestamp: new Date(),
        source: 'main-process'
      }

      await asyncListener(mockEvent)
    })
  })
})