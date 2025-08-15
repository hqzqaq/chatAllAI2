/**
 * 错误类型定义
 */

/**
 * 错误类型枚举
 */
export enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUTH_ERROR = 'AUTH_ERROR',
  WEBVIEW_ERROR = 'WEBVIEW_ERROR',
  PLUGIN_ERROR = 'PLUGIN_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR'
}

/**
 * 错误严重程度枚举
 */
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

/**
 * 基础错误接口
 */
export interface BaseError {
  type: ErrorType
  code: string
  message: string
  severity: ErrorSeverity
  timestamp: Date
  stack?: string
  context?: Record<string, any>
}

/**
 * 网络错误接口
 */
export interface NetworkError extends BaseError {
  type: ErrorType.NETWORK_ERROR
  url?: string
  statusCode?: number
  timeout?: number
  retryCount?: number
}

/**
 * 认证错误接口
 */
export interface AuthError extends BaseError {
  type: ErrorType.AUTH_ERROR
  providerId: string
  authMethod?: string
  tokenExpired?: boolean
  requiresReauth?: boolean
}

/**
 * WebView错误接口
 */
export interface WebViewError extends BaseError {
  type: ErrorType.WEBVIEW_ERROR
  webviewId: string
  providerId: string
  url?: string
  crashed?: boolean
  canRecover?: boolean
}

/**
 * 插件错误接口
 */
export interface PluginError extends BaseError {
  type: ErrorType.PLUGIN_ERROR
  pluginId: string
  pluginName: string
  version?: string
  conflictsWith?: string[]
}

/**
 * 存储错误接口
 */
export interface StorageError extends BaseError {
  type: ErrorType.STORAGE_ERROR
  operation: 'read' | 'write' | 'delete' | 'clear'
  key?: string
  storageType: 'localStorage' | 'sessionStorage' | 'fileSystem' | 'database'
}

/**
 * 系统错误接口
 */
export interface SystemError extends BaseError {
  type: ErrorType.SYSTEM_ERROR
  platform?: string
  osVersion?: string
  electronVersion?: string
  nodeVersion?: string
}

/**
 * 验证错误接口
 */
export interface ValidationError extends BaseError {
  type: ErrorType.VALIDATION_ERROR
  field?: string
  value?: any
  constraint?: string
  validationRule?: string
}

/**
 * 超时错误接口
 */
export interface TimeoutError extends BaseError {
  type: ErrorType.TIMEOUT_ERROR
  operation: string
  timeoutMs: number
  elapsedMs?: number
}

/**
 * 权限错误接口
 */
export interface PermissionError extends BaseError {
  type: ErrorType.PERMISSION_ERROR
  permission: string
  resource?: string
  action?: string
}

/**
 * 应用错误联合类型
 */
export type AppError = 
  | NetworkError 
  | AuthError 
  | WebViewError 
  | PluginError 
  | StorageError 
  | SystemError 
  | ValidationError 
  | TimeoutError 
  | PermissionError

/**
 * 错误处理结果接口
 */
export interface ErrorHandlingResult {
  handled: boolean
  recovered: boolean
  retryable: boolean
  userAction?: 'retry' | 'login' | 'restart' | 'ignore' | 'report'
  message?: string
}

/**
 * 错误恢复选项接口
 */
export interface ErrorRecoveryOptions {
  autoRetry: boolean
  maxRetries: number
  retryDelay: number
  fallbackAction?: () => Promise<void>
  userNotification: boolean
  logError: boolean
}

/**
 * 错误处理器接口
 */
export interface ErrorHandler {
  canHandle(error: AppError): boolean
  handle(error: AppError, options?: ErrorRecoveryOptions): Promise<ErrorHandlingResult>
  getRecoveryOptions(error: AppError): ErrorRecoveryOptions
}

/**
 * 错误报告接口
 */
export interface ErrorReport {
  id: string
  error: AppError
  userAgent: string
  appVersion: string
  timestamp: Date
  userId?: string
  sessionId?: string
  additionalInfo?: Record<string, any>
}

/**
 * 错误统计接口
 */
export interface ErrorStatistics {
  totalErrors: number
  errorsByType: Record<ErrorType, number>
  errorsBySeverity: Record<ErrorSeverity, number>
  recentErrors: AppError[]
  topErrors: Array<{ error: AppError; count: number }>
  timeRange: { start: Date; end: Date }
}