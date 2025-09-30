/**
 * IPC通信类型定义
 */

/**
 * IPC通道枚举
 */
export enum IPCChannel {
  // 应用控制
  APP_READY = 'app:ready',
  APP_QUIT = 'app:quit',
  APP_MINIMIZE = 'app:minimize',
  APP_MAXIMIZE = 'app:maximize',
  APP_RESTORE = 'app:restore',

  // 消息处理
  MESSAGE_SEND = 'message:send',
  MESSAGE_SEND_ALL = 'message:send-all',
  MESSAGE_RECEIVED = 'message:received',
  MESSAGE_ERROR = 'message:error',

  // WebView管理
  WEBVIEW_CREATE = 'webview:create',
  WEBVIEW_DESTROY = 'webview:destroy',
  WEBVIEW_RELOAD = 'webview:reload',
  WEBVIEW_NAVIGATE = 'webview:navigate',
  WEBVIEW_EXECUTE_SCRIPT = 'webview:execute-script',
  WEBVIEW_INSERT_CSS = 'webview:insert-css',
  WEBVIEW_SET_PROXY = 'webview:set-proxy',

  // 会话管理
  SESSION_SAVE = 'session:save',
  SESSION_LOAD = 'session:load',
  SESSION_CLEAR = 'session:clear',
  SESSION_CHECK = 'session:check',

  // 存储操作
  STORAGE_GET = 'storage:get',
  STORAGE_SET = 'storage:set',
  STORAGE_DELETE = 'storage:delete',
  STORAGE_CLEAR = 'storage:clear',

  // 插件管理
  PLUGIN_LOAD = 'plugin:load',
  PLUGIN_UNLOAD = 'plugin:unload',
  PLUGIN_ENABLE = 'plugin:enable',
  PLUGIN_DISABLE = 'plugin:disable',
  PLUGIN_GET_LIST = 'plugin:get-list',

  // 设置管理
  SETTINGS_GET = 'settings:get',
  SETTINGS_SET = 'settings:set',
  SETTINGS_RESET = 'settings:reset',

  // 错误处理
  ERROR_REPORT = 'error:report',
  ERROR_HANDLE = 'error:handle',

  // 性能监控
  PERFORMANCE_GET_METRICS = 'performance:get-metrics',
  PERFORMANCE_START_MONITORING = 'performance:start-monitoring',
  PERFORMANCE_STOP_MONITORING = 'performance:stop-monitoring'
}

/**
 * IPC请求接口
 */
export interface IPCRequest<T = any> {
  id: string
  channel: IPCChannel
  data?: T
  timestamp: Date
  source: 'main' | 'renderer'
}

/**
 * IPC响应接口
 */
export interface IPCResponse<T = any> {
  id: string
  channel: IPCChannel
  success: boolean
  data?: T
  error?: string
  timestamp: Date
}

/**
 * 消息发送请求
 */
export interface MessageSendRequest {
  content: string
  targetProviders?: string[]
  messageId?: string
}

/**
 * 消息发送响应
 */
export interface MessageSendResponse {
  messageId: string
  results: Array<{
    providerId: string
    success: boolean
    error?: string
  }>
}

/**
 * WebView创建请求
 */
export interface WebViewCreateRequest {
  providerId: string
  url: string
  preload?: string
  nodeIntegration?: boolean
  contextIsolation?: boolean
  webSecurity?: boolean
}

/**
 * WebView创建响应
 */
export interface WebViewCreateResponse {
  webviewId: string
  providerId: string
  success: boolean
  error?: string
}

/**
 * WebView脚本执行请求
 */
export interface WebViewExecuteScriptRequest {
  webviewId: string
  script: string
  worldId?: number
}

/**
 * WebView脚本执行响应
 */
export interface WebViewExecuteScriptResponse {
  result: any
  error?: string
}

/**
 * 会话保存请求
 */
export interface SessionSaveRequest {
  providerId: string
  sessionData: {
    cookies: any[]
    localStorage: Record<string, string>
    sessionStorage: Record<string, string>
  }
}

/**
 * 会话加载请求
 */
export interface SessionLoadRequest {
  providerId: string
}

/**
 * 会话加载响应
 */
export interface SessionLoadResponse {
  sessionData?: {
    cookies: any[]
    localStorage: Record<string, string>
    sessionStorage: Record<string, string>
  }
  exists: boolean
}

/**
 * 存储操作请求
 */
export interface StorageRequest {
  key: string
  value?: any
  namespace?: string
}

/**
 * 存储操作响应
 */
export interface StorageResponse {
  value?: any
  success: boolean
  error?: string
}

/**
 * 插件操作请求
 */
export interface PluginRequest {
  pluginId: string
  action: 'load' | 'unload' | 'enable' | 'disable'
  config?: any
}

/**
 * 插件列表响应
 */
export interface PluginListResponse {
  plugins: Array<{
    id: string
    name: string
    version: string
    enabled: boolean
    loaded: boolean
  }>
}

/**
 * 设置操作请求
 */
export interface SettingsRequest {
  key?: string
  value?: any
  section?: string
}

/**
 * 设置操作响应
 */
export interface SettingsResponse {
  settings?: any
  success: boolean
  error?: string
}

/**
 * 错误报告请求
 */
export interface ErrorReportRequest {
  error: {
    type: string
    message: string
    stack?: string
    context?: any
  }
  userAgent: string
  timestamp: Date
}

/**
 * 性能指标响应
 */
export interface PerformanceMetricsResponse {
  cpu: {
    usage: number
    timestamp: Date
  }
  memory: {
    used: number
    total: number
    percentage: number
    timestamp: Date
  }
  webviews: Record<string, {
    loadTime: number
    memoryUsage: number
    cpuUsage: number
  }>
}

/**
 * IPC处理器接口
 */
export interface IPCHandler {
  handle<TRequest = any, TResponse = any>(
    channel: IPCChannel,
    handler: (request: TRequest) => Promise<TResponse> | TResponse
  ): void

  invoke<TRequest = any, TResponse = any>(
    channel: IPCChannel,
    data?: TRequest
  ): Promise<TResponse>

  send<T = any>(channel: IPCChannel, data?: T): void

  on<T = any>(
    channel: IPCChannel,
    listener: (data: T) => void
  ): void

  off(channel: IPCChannel, listener?: Function): void
}

/**
 * IPC事件数据类型映射
 */
export interface IPCEventDataMap {
  [IPCChannel.MESSAGE_SEND]: MessageSendRequest
  [IPCChannel.MESSAGE_SEND_ALL]: MessageSendRequest
  [IPCChannel.MESSAGE_RECEIVED]: { messageId: string; providerId: string; content: string }
  [IPCChannel.MESSAGE_ERROR]: { messageId: string; providerId: string; error: string }

  [IPCChannel.WEBVIEW_CREATE]: WebViewCreateRequest
  [IPCChannel.WEBVIEW_DESTROY]: { webviewId: string }
  [IPCChannel.WEBVIEW_RELOAD]: { webviewId: string }
  [IPCChannel.WEBVIEW_NAVIGATE]: { webviewId: string; url: string }
  [IPCChannel.WEBVIEW_EXECUTE_SCRIPT]: WebViewExecuteScriptRequest
  [IPCChannel.WEBVIEW_INSERT_CSS]: { webviewId: string; css: string }

  [IPCChannel.SESSION_SAVE]: SessionSaveRequest
  [IPCChannel.SESSION_LOAD]: SessionLoadRequest
  [IPCChannel.SESSION_CLEAR]: { providerId: string }
  [IPCChannel.SESSION_CHECK]: { providerId: string }

  [IPCChannel.STORAGE_GET]: StorageRequest
  [IPCChannel.STORAGE_SET]: StorageRequest
  [IPCChannel.STORAGE_DELETE]: StorageRequest
  [IPCChannel.STORAGE_CLEAR]: { namespace?: string }

  [IPCChannel.PLUGIN_LOAD]: PluginRequest
  [IPCChannel.PLUGIN_UNLOAD]: PluginRequest
  [IPCChannel.PLUGIN_ENABLE]: PluginRequest
  [IPCChannel.PLUGIN_DISABLE]: PluginRequest
  [IPCChannel.PLUGIN_GET_LIST]: {}

  [IPCChannel.SETTINGS_GET]: SettingsRequest
  [IPCChannel.SETTINGS_SET]: SettingsRequest
  [IPCChannel.SETTINGS_RESET]: { section?: string }

  [IPCChannel.ERROR_REPORT]: ErrorReportRequest
  [IPCChannel.ERROR_HANDLE]: { errorId: string; action: string }

  [IPCChannel.PERFORMANCE_GET_METRICS]: {}
  [IPCChannel.PERFORMANCE_START_MONITORING]: { interval?: number }
  [IPCChannel.PERFORMANCE_STOP_MONITORING]: {}
}
