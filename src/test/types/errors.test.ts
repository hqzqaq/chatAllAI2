/**
 * 错误类型接口单元测试
 */

import { describe, it, expect } from 'vitest'
import {
  ErrorType,
  ErrorSeverity,
  type BaseError,
  type NetworkError,
  type AuthError,
  type WebViewError,
  type PluginError,
  type StorageError,
  type SystemError,
  type ValidationError,
  type TimeoutError,
  type PermissionError,
  type AppError,
  type ErrorHandlingResult,
  type ErrorRecoveryOptions,
  type ErrorReport,
  type ErrorStatistics
} from '@/types/errors'

describe('Error Types', () => {
  describe('ErrorType Enum', () => {
    it('should have all required error types', () => {
      expect(ErrorType.NETWORK_ERROR).toBe('NETWORK_ERROR')
      expect(ErrorType.AUTH_ERROR).toBe('AUTH_ERROR')
      expect(ErrorType.WEBVIEW_ERROR).toBe('WEBVIEW_ERROR')
      expect(ErrorType.PLUGIN_ERROR).toBe('PLUGIN_ERROR')
      expect(ErrorType.STORAGE_ERROR).toBe('STORAGE_ERROR')
      expect(ErrorType.SYSTEM_ERROR).toBe('SYSTEM_ERROR')
      expect(ErrorType.VALIDATION_ERROR).toBe('VALIDATION_ERROR')
      expect(ErrorType.TIMEOUT_ERROR).toBe('TIMEOUT_ERROR')
      expect(ErrorType.PERMISSION_ERROR).toBe('PERMISSION_ERROR')
    })
  })

  describe('ErrorSeverity Enum', () => {
    it('should have all severity levels', () => {
      expect(ErrorSeverity.LOW).toBe('LOW')
      expect(ErrorSeverity.MEDIUM).toBe('MEDIUM')
      expect(ErrorSeverity.HIGH).toBe('HIGH')
      expect(ErrorSeverity.CRITICAL).toBe('CRITICAL')
    })
  })

  describe('BaseError Interface', () => {
    it('should have required properties', () => {
      const baseError: BaseError = {
        type: ErrorType.SYSTEM_ERROR,
        code: 'SYS_001',
        message: 'System error occurred',
        severity: ErrorSeverity.HIGH,
        timestamp: new Date()
      }

      expect(baseError.type).toBe(ErrorType.SYSTEM_ERROR)
      expect(baseError.code).toBe('SYS_001')
      expect(baseError.message).toBe('System error occurred')
      expect(baseError.severity).toBe(ErrorSeverity.HIGH)
      expect(baseError.timestamp).toBeInstanceOf(Date)
    })

    it('should support optional properties', () => {
      const baseError: BaseError = {
        type: ErrorType.VALIDATION_ERROR,
        code: 'VAL_001',
        message: 'Validation failed',
        severity: ErrorSeverity.MEDIUM,
        timestamp: new Date(),
        stack: 'Error stack trace',
        context: { field: 'email', value: 'invalid-email' }
      }

      expect(baseError.stack).toBe('Error stack trace')
      expect(baseError.context).toEqual({ field: 'email', value: 'invalid-email' })
    })
  })

  describe('NetworkError Interface', () => {
    it('should extend BaseError with network-specific properties', () => {
      const networkError: NetworkError = {
        type: ErrorType.NETWORK_ERROR,
        code: 'NET_001',
        message: 'Network request failed',
        severity: ErrorSeverity.HIGH,
        timestamp: new Date(),
        url: 'https://api.example.com',
        statusCode: 500,
        timeout: 5000,
        retryCount: 3
      }

      expect(networkError.type).toBe(ErrorType.NETWORK_ERROR)
      expect(networkError.url).toBe('https://api.example.com')
      expect(networkError.statusCode).toBe(500)
      expect(networkError.timeout).toBe(5000)
      expect(networkError.retryCount).toBe(3)
    })
  })

  describe('AuthError Interface', () => {
    it('should extend BaseError with auth-specific properties', () => {
      const authError: AuthError = {
        type: ErrorType.AUTH_ERROR,
        code: 'AUTH_001',
        message: 'Authentication failed',
        severity: ErrorSeverity.HIGH,
        timestamp: new Date(),
        providerId: 'chatgpt',
        authMethod: 'oauth',
        tokenExpired: true,
        requiresReauth: true
      }

      expect(authError.type).toBe(ErrorType.AUTH_ERROR)
      expect(authError.providerId).toBe('chatgpt')
      expect(authError.authMethod).toBe('oauth')
      expect(authError.tokenExpired).toBe(true)
      expect(authError.requiresReauth).toBe(true)
    })
  })

  describe('WebViewError Interface', () => {
    it('should extend BaseError with webview-specific properties', () => {
      const webviewError: WebViewError = {
        type: ErrorType.WEBVIEW_ERROR,
        code: 'WV_001',
        message: 'WebView crashed',
        severity: ErrorSeverity.CRITICAL,
        timestamp: new Date(),
        webviewId: 'webview-chatgpt',
        providerId: 'chatgpt',
        url: 'https://chat.openai.com',
        crashed: true,
        canRecover: false
      }

      expect(webviewError.type).toBe(ErrorType.WEBVIEW_ERROR)
      expect(webviewError.webviewId).toBe('webview-chatgpt')
      expect(webviewError.providerId).toBe('chatgpt')
      expect(webviewError.crashed).toBe(true)
      expect(webviewError.canRecover).toBe(false)
    })
  })

  describe('PluginError Interface', () => {
    it('should extend BaseError with plugin-specific properties', () => {
      const pluginError: PluginError = {
        type: ErrorType.PLUGIN_ERROR,
        code: 'PLG_001',
        message: 'Plugin initialization failed',
        severity: ErrorSeverity.MEDIUM,
        timestamp: new Date(),
        pluginId: 'ghelper',
        pluginName: 'GHelper',
        version: '1.0.0',
        conflictsWith: ['other-plugin']
      }

      expect(pluginError.type).toBe(ErrorType.PLUGIN_ERROR)
      expect(pluginError.pluginId).toBe('ghelper')
      expect(pluginError.pluginName).toBe('GHelper')
      expect(pluginError.version).toBe('1.0.0')
      expect(pluginError.conflictsWith).toEqual(['other-plugin'])
    })
  })

  describe('StorageError Interface', () => {
    it('should extend BaseError with storage-specific properties', () => {
      const storageError: StorageError = {
        type: ErrorType.STORAGE_ERROR,
        code: 'STG_001',
        message: 'Failed to write to storage',
        severity: ErrorSeverity.HIGH,
        timestamp: new Date(),
        operation: 'write',
        key: 'user-preferences',
        storageType: 'localStorage'
      }

      expect(storageError.type).toBe(ErrorType.STORAGE_ERROR)
      expect(storageError.operation).toBe('write')
      expect(storageError.key).toBe('user-preferences')
      expect(storageError.storageType).toBe('localStorage')
    })

    it('should validate storage operations', () => {
      const operations: StorageError['operation'][] = ['read', 'write', 'delete', 'clear']
      
      operations.forEach(operation => {
        const error: StorageError = {
          type: ErrorType.STORAGE_ERROR,
          code: 'STG_TEST',
          message: `${operation} operation failed`,
          severity: ErrorSeverity.MEDIUM,
          timestamp: new Date(),
          operation,
          storageType: 'fileSystem'
        }
        expect(error.operation).toBe(operation)
      })
    })

    it('should validate storage types', () => {
      const storageTypes: StorageError['storageType'][] = ['localStorage', 'sessionStorage', 'fileSystem', 'database']
      
      storageTypes.forEach(storageType => {
        const error: StorageError = {
          type: ErrorType.STORAGE_ERROR,
          code: 'STG_TEST',
          message: `${storageType} error`,
          severity: ErrorSeverity.MEDIUM,
          timestamp: new Date(),
          operation: 'read',
          storageType
        }
        expect(error.storageType).toBe(storageType)
      })
    })
  })

  describe('ValidationError Interface', () => {
    it('should extend BaseError with validation-specific properties', () => {
      const validationError: ValidationError = {
        type: ErrorType.VALIDATION_ERROR,
        code: 'VAL_001',
        message: 'Email format is invalid',
        severity: ErrorSeverity.LOW,
        timestamp: new Date(),
        field: 'email',
        value: 'invalid-email',
        constraint: 'format',
        validationRule: 'email'
      }

      expect(validationError.type).toBe(ErrorType.VALIDATION_ERROR)
      expect(validationError.field).toBe('email')
      expect(validationError.value).toBe('invalid-email')
      expect(validationError.constraint).toBe('format')
      expect(validationError.validationRule).toBe('email')
    })
  })

  describe('TimeoutError Interface', () => {
    it('should extend BaseError with timeout-specific properties', () => {
      const timeoutError: TimeoutError = {
        type: ErrorType.TIMEOUT_ERROR,
        code: 'TMO_001',
        message: 'Operation timed out',
        severity: ErrorSeverity.MEDIUM,
        timestamp: new Date(),
        operation: 'api-request',
        timeoutMs: 5000,
        elapsedMs: 5100
      }

      expect(timeoutError.type).toBe(ErrorType.TIMEOUT_ERROR)
      expect(timeoutError.operation).toBe('api-request')
      expect(timeoutError.timeoutMs).toBe(5000)
      expect(timeoutError.elapsedMs).toBe(5100)
    })
  })

  describe('PermissionError Interface', () => {
    it('should extend BaseError with permission-specific properties', () => {
      const permissionError: PermissionError = {
        type: ErrorType.PERMISSION_ERROR,
        code: 'PRM_001',
        message: 'Permission denied',
        severity: ErrorSeverity.HIGH,
        timestamp: new Date(),
        permission: 'file-system-access',
        resource: '/user/documents',
        action: 'write'
      }

      expect(permissionError.type).toBe(ErrorType.PERMISSION_ERROR)
      expect(permissionError.permission).toBe('file-system-access')
      expect(permissionError.resource).toBe('/user/documents')
      expect(permissionError.action).toBe('write')
    })
  })

  describe('ErrorHandlingResult Interface', () => {
    it('should have required properties', () => {
      const result: ErrorHandlingResult = {
        handled: true,
        recovered: false,
        retryable: true,
        userAction: 'retry',
        message: 'Please try again'
      }

      expect(result.handled).toBe(true)
      expect(result.recovered).toBe(false)
      expect(result.retryable).toBe(true)
      expect(result.userAction).toBe('retry')
      expect(result.message).toBe('Please try again')
    })

    it('should validate user actions', () => {
      const actions: ErrorHandlingResult['userAction'][] = ['retry', 'login', 'restart', 'ignore', 'report']
      
      actions.forEach(action => {
        const result: ErrorHandlingResult = {
          handled: true,
          recovered: false,
          retryable: false,
          userAction: action
        }
        expect(result.userAction).toBe(action)
      })
    })
  })

  describe('ErrorRecoveryOptions Interface', () => {
    it('should have required properties', () => {
      const options: ErrorRecoveryOptions = {
        autoRetry: true,
        maxRetries: 3,
        retryDelay: 1000,
        userNotification: true,
        logError: true
      }

      expect(options.autoRetry).toBe(true)
      expect(options.maxRetries).toBe(3)
      expect(options.retryDelay).toBe(1000)
      expect(options.userNotification).toBe(true)
      expect(options.logError).toBe(true)
    })

    it('should support optional fallback action', () => {
      const fallbackAction = async () => { console.log('Fallback executed') }
      const options: ErrorRecoveryOptions = {
        autoRetry: false,
        maxRetries: 0,
        retryDelay: 0,
        fallbackAction,
        userNotification: false,
        logError: false
      }

      expect(options.fallbackAction).toBe(fallbackAction)
    })
  })

  describe('ErrorReport Interface', () => {
    it('should have required properties', () => {
      const error: NetworkError = {
        type: ErrorType.NETWORK_ERROR,
        code: 'NET_001',
        message: 'Network error',
        severity: ErrorSeverity.HIGH,
        timestamp: new Date()
      }

      const report: ErrorReport = {
        id: 'report-123',
        error,
        userAgent: 'ChatAllAI/1.0.0',
        appVersion: '1.0.0',
        timestamp: new Date()
      }

      expect(report.id).toBe('report-123')
      expect(report.error).toBe(error)
      expect(report.userAgent).toBe('ChatAllAI/1.0.0')
      expect(report.appVersion).toBe('1.0.0')
      expect(report.timestamp).toBeInstanceOf(Date)
    })

    it('should support optional properties', () => {
      const error: SystemError = {
        type: ErrorType.SYSTEM_ERROR,
        code: 'SYS_001',
        message: 'System error',
        severity: ErrorSeverity.CRITICAL,
        timestamp: new Date()
      }

      const report: ErrorReport = {
        id: 'report-456',
        error,
        userAgent: 'ChatAllAI/1.0.0',
        appVersion: '1.0.0',
        timestamp: new Date(),
        userId: 'user-123',
        sessionId: 'session-456',
        additionalInfo: { platform: 'macOS', version: '14.0' }
      }

      expect(report.userId).toBe('user-123')
      expect(report.sessionId).toBe('session-456')
      expect(report.additionalInfo).toEqual({ platform: 'macOS', version: '14.0' })
    })
  })

  describe('ErrorStatistics Interface', () => {
    it('should have required properties', () => {
      const startTime = new Date(Date.now() - 86400000)
      const endTime = new Date()
      
      const statistics: ErrorStatistics = {
        totalErrors: 10,
        errorsByType: {
          [ErrorType.NETWORK_ERROR]: 5,
          [ErrorType.AUTH_ERROR]: 2,
          [ErrorType.WEBVIEW_ERROR]: 1,
          [ErrorType.PLUGIN_ERROR]: 1,
          [ErrorType.STORAGE_ERROR]: 1,
          [ErrorType.SYSTEM_ERROR]: 0,
          [ErrorType.VALIDATION_ERROR]: 0,
          [ErrorType.TIMEOUT_ERROR]: 0,
          [ErrorType.PERMISSION_ERROR]: 0
        },
        errorsBySeverity: {
          [ErrorSeverity.LOW]: 2,
          [ErrorSeverity.MEDIUM]: 4,
          [ErrorSeverity.HIGH]: 3,
          [ErrorSeverity.CRITICAL]: 1
        },
        recentErrors: [],
        topErrors: [],
        timeRange: { start: startTime, end: endTime }
      }

      expect(statistics.totalErrors).toBe(10)
      expect(statistics.errorsByType[ErrorType.NETWORK_ERROR]).toBe(5)
      expect(statistics.errorsBySeverity[ErrorSeverity.HIGH]).toBe(3)
      expect(Array.isArray(statistics.recentErrors)).toBe(true)
      expect(Array.isArray(statistics.topErrors)).toBe(true)
      expect(statistics.timeRange.start).toBe(startTime)
      expect(statistics.timeRange.end).toBe(endTime)
    })
  })

  describe('AppError Union Type', () => {
    it('should accept all error types', () => {
      const networkError: AppError = {
        type: ErrorType.NETWORK_ERROR,
        code: 'NET_001',
        message: 'Network error',
        severity: ErrorSeverity.HIGH,
        timestamp: new Date()
      }

      const authError: AppError = {
        type: ErrorType.AUTH_ERROR,
        code: 'AUTH_001',
        message: 'Auth error',
        severity: ErrorSeverity.HIGH,
        timestamp: new Date(),
        providerId: 'test'
      }

      expect(networkError.type).toBe(ErrorType.NETWORK_ERROR)
      expect(authError.type).toBe(ErrorType.AUTH_ERROR)
    })
  })
})