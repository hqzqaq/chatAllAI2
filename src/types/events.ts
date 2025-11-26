/**
 * 事件类型定义
 */

/**
 * 事件类型枚举
 */
export enum EventType {
  // 应用事件
  APP_READY = 'APP_READY',
  APP_QUIT = 'APP_QUIT',
  APP_ERROR = 'APP_ERROR',

  // 消息事件
  MESSAGE_SEND = 'MESSAGE_SEND',
  MESSAGE_RECEIVED = 'MESSAGE_RECEIVED',
  MESSAGE_ERROR = 'MESSAGE_ERROR',
  MESSAGE_RETRY = 'MESSAGE_RETRY',

  // WebView事件
  WEBVIEW_READY = 'WEBVIEW_READY',
  WEBVIEW_LOADING = 'WEBVIEW_LOADING',
  WEBVIEW_LOADED = 'WEBVIEW_LOADED',
  WEBVIEW_ERROR = 'WEBVIEW_ERROR',
  WEBVIEW_CRASHED = 'WEBVIEW_CRASHED',
  WEBVIEW_NAVIGATION = 'WEBVIEW_NAVIGATION',

  // 会话事件
  SESSION_LOGIN = 'SESSION_LOGIN',
  SESSION_LOGOUT = 'SESSION_LOGOUT',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  SESSION_RESTORED = 'SESSION_RESTORED',

  // 布局事件
  LAYOUT_CHANGED = 'LAYOUT_CHANGED',
  CARD_RESIZED = 'CARD_RESIZED',
  CARD_MOVED = 'CARD_MOVED',
  CARD_MINIMIZED = 'CARD_MINIMIZED',
  CARD_MAXIMIZED = 'CARD_MAXIMIZED',

  // 插件事件
  PLUGIN_LOADED = 'PLUGIN_LOADED',
  PLUGIN_UNLOADED = 'PLUGIN_UNLOADED',
  PLUGIN_ERROR = 'PLUGIN_ERROR',
  PLUGIN_ENABLED = 'PLUGIN_ENABLED',
  PLUGIN_DISABLED = 'PLUGIN_DISABLED',

  // 设置事件
  SETTINGS_CHANGED = 'SETTINGS_CHANGED',
  THEME_CHANGED = 'THEME_CHANGED',
  LANGUAGE_CHANGED = 'LANGUAGE_CHANGED',

  // 存储事件
  DATA_SAVED = 'DATA_SAVED',
  DATA_LOADED = 'DATA_LOADED',
  DATA_ERROR = 'DATA_ERROR'
}

/**
 * 基础事件接口
 */
export interface BaseEvent {
  type: EventType
  timestamp: Date
  source: string
  data?: any
}

/**
 * 应用事件接口
 */
export interface AppEvent extends BaseEvent {
  type: EventType.APP_READY | EventType.APP_QUIT | EventType.APP_ERROR
  version?: string
  platform?: string
}

/**
 * 消息事件接口
 */
export interface MessageEvent extends BaseEvent {
  type: EventType.MESSAGE_SEND | EventType.MESSAGE_RECEIVED | EventType.MESSAGE_ERROR | EventType.MESSAGE_RETRY
  messageId: string
  providerId: string
  content?: string
  error?: string
}

/**
 * WebView事件接口
 */
export interface WebViewEvent extends BaseEvent {
  type:
    | EventType.WEBVIEW_READY
    | EventType.WEBVIEW_LOADING
    | EventType.WEBVIEW_LOADED
    | EventType.WEBVIEW_ERROR
    | EventType.WEBVIEW_CRASHED
    | EventType.WEBVIEW_NAVIGATION
  webviewId: string
  providerId: string
  url?: string
  title?: string
  error?: string
}

/**
 * 会话事件接口
 */
export interface SessionEvent extends BaseEvent {
  type: EventType.SESSION_LOGIN | EventType.SESSION_LOGOUT | EventType.SESSION_EXPIRED | EventType.SESSION_RESTORED
  providerId: string
  sessionId?: string
  userId?: string
}

/**
 * 布局事件接口
 */
export interface LayoutEvent extends BaseEvent {
  type:
    | EventType.LAYOUT_CHANGED
    | EventType.CARD_RESIZED
    | EventType.CARD_MOVED
    | EventType.CARD_MINIMIZED
    | EventType.CARD_MAXIMIZED
  cardId?: string
  position?: { x: number; y: number }
  size?: { width: number; height: number }
  layoutConfig?: any
}

/**
 * 插件事件接口
 */
export interface PluginEvent extends BaseEvent {
  type:
    | EventType.PLUGIN_LOADED
    | EventType.PLUGIN_UNLOADED
    | EventType.PLUGIN_ERROR
    | EventType.PLUGIN_ENABLED
    | EventType.PLUGIN_DISABLED
  pluginId: string
  pluginName: string
  version?: string
  error?: string
}

/**
 * 设置事件接口
 */
export interface SettingsEvent extends BaseEvent {
  type: EventType.SETTINGS_CHANGED | EventType.THEME_CHANGED | EventType.LANGUAGE_CHANGED
  setting: string
  oldValue?: any
  newValue?: any
}

/**
 * 存储事件接口
 */
export interface StorageEvent extends BaseEvent {
  type: EventType.DATA_SAVED | EventType.DATA_LOADED | EventType.DATA_ERROR
  key?: string
  operation: 'save' | 'load' | 'delete' | 'clear'
  error?: string
}

/**
 * 应用事件联合类型
 */
export type AppEventUnion =
  | AppEvent
  | MessageEvent
  | WebViewEvent
  | SessionEvent
  | LayoutEvent
  | PluginEvent
  | SettingsEvent
  | StorageEvent

/**
 * 事件监听器接口
 */
export interface EventListener<T extends BaseEvent = BaseEvent> {
  (event: T): void | Promise<void>
}

/**
 * 事件发射器接口
 */
export interface EventEmitter {
  on<T extends BaseEvent>(eventType: EventType, listener: EventListener<T>): void
  off<T extends BaseEvent>(eventType: EventType, listener: EventListener<T>): void
  emit<T extends BaseEvent>(event: T): void
  once<T extends BaseEvent>(eventType: EventType, listener: EventListener<T>): void
  removeAllListeners(eventType?: EventType): void
}

/**
 * 事件过滤器接口
 */
export interface EventFilter {
  types?: EventType[]
  sources?: string[]
  timeRange?: { start: Date; end: Date }
  customFilter?: (event: BaseEvent) => boolean
}

/**
 * 事件历史接口
 */
export interface EventHistory {
  events: BaseEvent[]
  maxSize: number
  filter?: EventFilter
  addEvent(event: BaseEvent): void
  getEvents(filter?: EventFilter): BaseEvent[]
  clear(): void
}
