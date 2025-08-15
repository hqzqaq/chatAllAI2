/**
 * IPC通信类型接口单元测试
 */

import { describe, it, expect } from 'vitest'
import {
  IPCChannel,
  type IPCRequest,
  type IPCResponse,
  type MessageSendRequest,
  type MessageSendResponse,
  type WebViewCreateRequest,
  type WebViewCreateResponse,
  type WebViewExecuteScriptRequest,
  type WebViewExecuteScriptResponse,
  type SessionSaveRequest,
  type SessionLoadRequest,
  type SessionLoadResponse,
  type StorageRequest,
  type StorageResponse,
  type PluginRequest,
  type PluginListResponse,
  type SettingsRequest,
  type SettingsResponse,
  type ErrorReportRequest,
  type PerformanceMetricsResponse,
  type IPCEventDataMap
} from '@/types/ipc'

describe('IPC Types', () => {
  describe('IPCChannel Enum', () => {
    it('should have all app control channels', () => {
      expect(IPCChannel.APP_READY).toBe('app:ready')
      expect(IPCChannel.APP_QUIT).toBe('app:quit')
      expect(IPCChannel.APP_MINIMIZE).toBe('app:minimize')
      expect(IPCChannel.APP_MAXIMIZE).toBe('app:maximize')
      expect(IPCChannel.APP_RESTORE).toBe('app:restore')
    })

    it('should have all message handling channels', () => {
      expect(IPCChannel.MESSAGE_SEND).toBe('message:send')
      expect(IPCChannel.MESSAGE_SEND_ALL).toBe('message:send-all')
      expect(IPCChannel.MESSAGE_RECEIVED).toBe('message:received')
      expect(IPCChannel.MESSAGE_ERROR).toBe('message:error')
    })

    it('should have all webview management channels', () => {
      expect(IPCChannel.WEBVIEW_CREATE).toBe('webview:create')
      expect(IPCChannel.WEBVIEW_DESTROY).toBe('webview:destroy')
      expect(IPCChannel.WEBVIEW_RELOAD).toBe('webview:reload')
      expect(IPCChannel.WEBVIEW_NAVIGATE).toBe('webview:navigate')
      expect(IPCChannel.WEBVIEW_EXECUTE_SCRIPT).toBe('webview:execute-script')
      expect(IPCChannel.WEBVIEW_INSERT_CSS).toBe('webview:insert-css')
    })

    it('should have all session management channels', () => {
      expect(IPCChannel.SESSION_SAVE).toBe('session:save')
      expect(IPCChannel.SESSION_LOAD).toBe('session:load')
      expect(IPCChannel.SESSION_CLEAR).toBe('session:clear')
      expect(IPCChannel.SESSION_CHECK).toBe('session:check')
    })

    it('should have all storage operation channels', () => {
      expect(IPCChannel.STORAGE_GET).toBe('storage:get')
      expect(IPCChannel.STORAGE_SET).toBe('storage:set')
      expect(IPCChannel.STORAGE_DELETE).toBe('storage:delete')
      expect(IPCChannel.STORAGE_CLEAR).toBe('storage:clear')
    })

    it('should have all plugin management channels', () => {
      expect(IPCChannel.PLUGIN_LOAD).toBe('plugin:load')
      expect(IPCChannel.PLUGIN_UNLOAD).toBe('plugin:unload')
      expect(IPCChannel.PLUGIN_ENABLE).toBe('plugin:enable')
      expect(IPCChannel.PLUGIN_DISABLE).toBe('plugin:disable')
      expect(IPCChannel.PLUGIN_GET_LIST).toBe('plugin:get-list')
    })

    it('should have all settings management channels', () => {
      expect(IPCChannel.SETTINGS_GET).toBe('settings:get')
      expect(IPCChannel.SETTINGS_SET).toBe('settings:set')
      expect(IPCChannel.SETTINGS_RESET).toBe('settings:reset')
    })

    it('should have all error handling channels', () => {
      expect(IPCChannel.ERROR_REPORT).toBe('error:report')
      expect(IPCChannel.ERROR_HANDLE).toBe('error:handle')
    })

    it('should have all performance monitoring channels', () => {
      expect(IPCChannel.PERFORMANCE_GET_METRICS).toBe('performance:get-metrics')
      expect(IPCChannel.PERFORMANCE_START_MONITORING).toBe('performance:start-monitoring')
      expect(IPCChannel.PERFORMANCE_STOP_MONITORING).toBe('performance:stop-monitoring')
    })
  })

  describe('IPCRequest Interface', () => {
    it('should have required properties', () => {
      const request: IPCRequest = {
        id: 'req-123',
        channel: IPCChannel.MESSAGE_SEND,
        timestamp: new Date(),
        source: 'renderer'
      }

      expect(request.id).toBe('req-123')
      expect(request.channel).toBe(IPCChannel.MESSAGE_SEND)
      expect(request.timestamp).toBeInstanceOf(Date)
      expect(request.source).toBe('renderer')
    })

    it('should support optional data property', () => {
      const request: IPCRequest<{ content: string }> = {
        id: 'req-456',
        channel: IPCChannel.MESSAGE_SEND,
        data: { content: 'Hello, AI!' },
        timestamp: new Date(),
        source: 'renderer'
      }

      expect(request.data).toEqual({ content: 'Hello, AI!' })
    })

    it('should validate source types', () => {
      const sources: IPCRequest['source'][] = ['main', 'renderer']

      sources.forEach(source => {
        const request: IPCRequest = {
          id: 'test-req',
          channel: IPCChannel.APP_READY,
          timestamp: new Date(),
          source
        }
        expect(request.source).toBe(source)
      })
    })
  })

  describe('IPCResponse Interface', () => {
    it('should have required properties', () => {
      const response: IPCResponse = {
        id: 'req-123',
        channel: IPCChannel.MESSAGE_SEND,
        success: true,
        timestamp: new Date()
      }

      expect(response.id).toBe('req-123')
      expect(response.channel).toBe(IPCChannel.MESSAGE_SEND)
      expect(response.success).toBe(true)
      expect(response.timestamp).toBeInstanceOf(Date)
    })

    it('should support optional data and error properties', () => {
      const successResponse: IPCResponse<{ messageId: string }> = {
        id: 'req-123',
        channel: IPCChannel.MESSAGE_SEND,
        success: true,
        data: { messageId: 'msg-456' },
        timestamp: new Date()
      }

      const errorResponse: IPCResponse = {
        id: 'req-789',
        channel: IPCChannel.MESSAGE_SEND,
        success: false,
        error: 'Network timeout',
        timestamp: new Date()
      }

      expect(successResponse.data).toEqual({ messageId: 'msg-456' })
      expect(errorResponse.error).toBe('Network timeout')
    })
  })

  describe('MessageSendRequest Interface', () => {
    it('should have required content property', () => {
      const request: MessageSendRequest = {
        content: 'Hello, AI!'
      }

      expect(request.content).toBe('Hello, AI!')
    })

    it('should support optional properties', () => {
      const request: MessageSendRequest = {
        content: 'Hello, specific AIs!',
        targetProviders: ['chatgpt', 'gemini'],
        messageId: 'msg-123'
      }

      expect(request.targetProviders).toEqual(['chatgpt', 'gemini'])
      expect(request.messageId).toBe('msg-123')
    })
  })

  describe('MessageSendResponse Interface', () => {
    it('should have required properties', () => {
      const response: MessageSendResponse = {
        messageId: 'msg-123',
        results: [
          { providerId: 'chatgpt', success: true },
          { providerId: 'gemini', success: false, error: 'Network error' }
        ]
      }

      expect(response.messageId).toBe('msg-123')
      expect(response.results).toHaveLength(2)
      expect(response.results[0].success).toBe(true)
      expect(response.results[1].success).toBe(false)
      expect(response.results[1].error).toBe('Network error')
    })
  })

  describe('WebViewCreateRequest Interface', () => {
    it('should have required properties', () => {
      const request: WebViewCreateRequest = {
        providerId: 'chatgpt',
        url: 'https://chat.openai.com'
      }

      expect(request.providerId).toBe('chatgpt')
      expect(request.url).toBe('https://chat.openai.com')
    })

    it('should support optional security properties', () => {
      const request: WebViewCreateRequest = {
        providerId: 'gemini',
        url: 'https://gemini.google.com',
        preload: './preload.js',
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: true
      }

      expect(request.preload).toBe('./preload.js')
      expect(request.nodeIntegration).toBe(false)
      expect(request.contextIsolation).toBe(true)
      expect(request.webSecurity).toBe(true)
    })
  })

  describe('WebViewCreateResponse Interface', () => {
    it('should have required properties', () => {
      const response: WebViewCreateResponse = {
        webviewId: 'webview-123',
        providerId: 'chatgpt',
        success: true
      }

      expect(response.webviewId).toBe('webview-123')
      expect(response.providerId).toBe('chatgpt')
      expect(response.success).toBe(true)
    })

    it('should support error property for failed creation', () => {
      const response: WebViewCreateResponse = {
        webviewId: '',
        providerId: 'gemini',
        success: false,
        error: 'Failed to create webview'
      }

      expect(response.success).toBe(false)
      expect(response.error).toBe('Failed to create webview')
    })
  })

  describe('WebViewExecuteScriptRequest Interface', () => {
    it('should have required properties', () => {
      const request: WebViewExecuteScriptRequest = {
        webviewId: 'webview-123',
        script: 'document.title'
      }

      expect(request.webviewId).toBe('webview-123')
      expect(request.script).toBe('document.title')
    })

    it('should support optional worldId', () => {
      const request: WebViewExecuteScriptRequest = {
        webviewId: 'webview-456',
        script: 'console.log("Hello")',
        worldId: 1
      }

      expect(request.worldId).toBe(1)
    })
  })

  describe('WebViewExecuteScriptResponse Interface', () => {
    it('should have result property', () => {
      const response: WebViewExecuteScriptResponse = {
        result: 'ChatGPT'
      }

      expect(response.result).toBe('ChatGPT')
    })

    it('should support error property', () => {
      const response: WebViewExecuteScriptResponse = {
        result: null,
        error: 'Script execution failed'
      }

      expect(response.result).toBe(null)
      expect(response.error).toBe('Script execution failed')
    })
  })

  describe('SessionSaveRequest Interface', () => {
    it('should have required properties', () => {
      const request: SessionSaveRequest = {
        providerId: 'chatgpt',
        sessionData: {
          cookies: [{ name: 'session', value: 'abc123', domain: 'openai.com', path: '/' }],
          localStorage: { theme: 'dark' },
          sessionStorage: { tempData: 'value' }
        }
      }

      expect(request.providerId).toBe('chatgpt')
      expect(request.sessionData.cookies).toHaveLength(1)
      expect(request.sessionData.localStorage.theme).toBe('dark')
      expect(request.sessionData.sessionStorage.tempData).toBe('value')
    })
  })

  describe('SessionLoadRequest Interface', () => {
    it('should have required providerId', () => {
      const request: SessionLoadRequest = {
        providerId: 'gemini'
      }

      expect(request.providerId).toBe('gemini')
    })
  })

  describe('SessionLoadResponse Interface', () => {
    it('should indicate if session exists', () => {
      const existingSession: SessionLoadResponse = {
        sessionData: {
          cookies: [],
          localStorage: {},
          sessionStorage: {}
        },
        exists: true
      }

      const nonExistingSession: SessionLoadResponse = {
        exists: false
      }

      expect(existingSession.exists).toBe(true)
      expect(existingSession.sessionData).toBeDefined()
      expect(nonExistingSession.exists).toBe(false)
      expect(nonExistingSession.sessionData).toBeUndefined()
    })
  })

  describe('StorageRequest Interface', () => {
    it('should have required key property', () => {
      const request: StorageRequest = {
        key: 'user-preferences'
      }

      expect(request.key).toBe('user-preferences')
    })

    it('should support optional properties', () => {
      const request: StorageRequest = {
        key: 'app-settings',
        value: { theme: 'dark', language: 'zh-CN' },
        namespace: 'user-config'
      }

      expect(request.value).toEqual({ theme: 'dark', language: 'zh-CN' })
      expect(request.namespace).toBe('user-config')
    })
  })

  describe('StorageResponse Interface', () => {
    it('should have required properties', () => {
      const response: StorageResponse = {
        success: true
      }

      expect(response.success).toBe(true)
    })

    it('should support optional value and error', () => {
      const successResponse: StorageResponse = {
        value: { theme: 'light' },
        success: true
      }

      const errorResponse: StorageResponse = {
        success: false,
        error: 'Key not found'
      }

      expect(successResponse.value).toEqual({ theme: 'light' })
      expect(errorResponse.error).toBe('Key not found')
    })
  })

  describe('PluginRequest Interface', () => {
    it('should have required properties', () => {
      const request: PluginRequest = {
        pluginId: 'ghelper',
        action: 'load'
      }

      expect(request.pluginId).toBe('ghelper')
      expect(request.action).toBe('load')
    })

    it('should validate action types', () => {
      const actions: PluginRequest['action'][] = ['load', 'unload', 'enable', 'disable']

      actions.forEach(action => {
        const request: PluginRequest = {
          pluginId: 'test-plugin',
          action
        }
        expect(request.action).toBe(action)
      })
    })

    it('should support optional config', () => {
      const request: PluginRequest = {
        pluginId: 'test-plugin',
        action: 'enable',
        config: { apiKey: 'test-key', enabled: true }
      }

      expect(request.config).toEqual({ apiKey: 'test-key', enabled: true })
    })
  })

  describe('PluginListResponse Interface', () => {
    it('should have plugins array', () => {
      const response: PluginListResponse = {
        plugins: [
          {
            id: 'ghelper',
            name: 'GHelper',
            version: '1.0.0',
            enabled: true,
            loaded: true
          },
          {
            id: 'test-plugin',
            name: 'Test Plugin',
            version: '2.0.0',
            enabled: false,
            loaded: false
          }
        ]
      }

      expect(response.plugins).toHaveLength(2)
      expect(response.plugins[0].id).toBe('ghelper')
      expect(response.plugins[0].enabled).toBe(true)
      expect(response.plugins[1].enabled).toBe(false)
    })
  })

  describe('SettingsRequest Interface', () => {
    it('should support all optional properties', () => {
      const getRequest: SettingsRequest = {
        key: 'theme'
      }

      const setRequest: SettingsRequest = {
        key: 'language',
        value: 'zh-CN'
      }

      const sectionRequest: SettingsRequest = {
        section: 'user-preferences'
      }

      expect(getRequest.key).toBe('theme')
      expect(setRequest.value).toBe('zh-CN')
      expect(sectionRequest.section).toBe('user-preferences')
    })
  })

  describe('SettingsResponse Interface', () => {
    it('should have required properties', () => {
      const response: SettingsResponse = {
        success: true
      }

      expect(response.success).toBe(true)
    })

    it('should support optional settings and error', () => {
      const successResponse: SettingsResponse = {
        settings: { theme: 'dark', language: 'en-US' },
        success: true
      }

      const errorResponse: SettingsResponse = {
        success: false,
        error: 'Settings not found'
      }

      expect(successResponse.settings).toEqual({ theme: 'dark', language: 'en-US' })
      expect(errorResponse.error).toBe('Settings not found')
    })
  })

  describe('ErrorReportRequest Interface', () => {
    it('should have required properties', () => {
      const request: ErrorReportRequest = {
        error: {
          type: 'NETWORK_ERROR',
          message: 'Connection failed',
          stack: 'Error: Connection failed\n    at ...',
          context: { url: 'https://api.example.com' }
        },
        userAgent: 'ChatAllAI/1.0.0',
        timestamp: new Date()
      }

      expect(request.error.type).toBe('NETWORK_ERROR')
      expect(request.error.message).toBe('Connection failed')
      expect(request.userAgent).toBe('ChatAllAI/1.0.0')
      expect(request.timestamp).toBeInstanceOf(Date)
    })
  })

  describe('PerformanceMetricsResponse Interface', () => {
    it('should have required properties', () => {
      const response: PerformanceMetricsResponse = {
        cpu: {
          usage: 25.5,
          timestamp: new Date()
        },
        memory: {
          used: 512,
          total: 1024,
          percentage: 50,
          timestamp: new Date()
        },
        webviews: {
          'chatgpt': {
            loadTime: 2000,
            memoryUsage: 128,
            cpuUsage: 10
          },
          'gemini': {
            loadTime: 1800,
            memoryUsage: 96,
            cpuUsage: 8
          }
        }
      }

      expect(response.cpu.usage).toBe(25.5)
      expect(response.memory.percentage).toBe(50)
      expect(response.webviews.chatgpt.loadTime).toBe(2000)
      expect(response.webviews.gemini.memoryUsage).toBe(96)
    })
  })

  describe('IPCEventDataMap Interface', () => {
    it('should map channels to correct data types', () => {
      // This is a type-level test - if it compiles, the mapping is correct
      const messageData: IPCEventDataMap[IPCChannel.MESSAGE_SEND] = {
        content: 'Hello, AI!'
      }

      const webviewData: IPCEventDataMap[IPCChannel.WEBVIEW_CREATE] = {
        providerId: 'chatgpt',
        url: 'https://chat.openai.com'
      }

      const sessionData: IPCEventDataMap[IPCChannel.SESSION_SAVE] = {
        providerId: 'gemini',
        sessionData: {
          cookies: [],
          localStorage: {},
          sessionStorage: {}
        }
      }

      expect(messageData.content).toBe('Hello, AI!')
      expect(webviewData.providerId).toBe('chatgpt')
      expect(sessionData.providerId).toBe('gemini')
    })
  })
})