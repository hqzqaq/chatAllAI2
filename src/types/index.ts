/**
 * 全局类型定义
 */

/**
 * Cookie接口
 */
export interface Cookie {
  name: string
  value: string
  domain: string
  path: string
  expires?: number
  httpOnly?: boolean
  secure?: boolean
}

/**
 * 会话数据接口
 */
export interface SessionData {
  cookies: Cookie[]
  localStorage: Record<string, string>
  sessionStorage: Record<string, string>
  isActive: boolean
  lastActiveTime: Date
  loginUrl?: string
}

/**
 * 消息接口
 */
export interface Message {
  id: string
  content: string
  timestamp: Date
  sender: 'user' | 'ai'
  providerId: string
  status: 'sending' | 'sent' | 'received' | 'error'
  errorMessage?: string
  retryCount?: number
}

/**
 * AI提供商接口
 */
export interface AIProvider {
  id: string
  name: string
  url: string
  icon: string
  isLoggedIn: boolean
  sessionData: SessionData
  webviewId: string
  isEnabled: boolean
  loadingState: 'idle' | 'loading' | 'loaded' | 'error'
  lastError?: string
  retryCount?: number
  lastActiveTime?: Date
}

/**
 * 会话接口
 */
export interface Session {
  providerId: string
  cookies: Cookie[]
  localStorage: Record<string, string>
  sessionStorage: Record<string, string>
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  expiresAt?: Date
}

/**
 * 卡片位置接口
 */
export interface CardPosition {
  id: string
  x: number
  y: number
}

/**
 * 卡片大小接口
 */
export interface CardSize {
  id: string
  width: number
  height: number
  minWidth: number
  minHeight: number
  maxWidth?: number
  maxHeight?: number
}

/**
 * 卡片配置接口
 */
export interface CardConfig {
  id: string
  providerId: string
  position: { x: number; y: number }
  size: { width: number; height: number }
  isVisible: boolean
  isHidden?: boolean // 新增：临时隐藏状态，用于最大化时隐藏其他卡片但不销毁WebView
  isMinimized: boolean
  isMaximized: boolean
  originalSize?: { width: number; height: number }
  originalPosition?: { x: number; y: number }
  zIndex: number
  title: string
}

/**
 * 网格布局接口
 */
export interface GridLayout {
  columns: number
  rows: number
  gap: number
  containerWidth: number
  containerHeight: number
}

/**
 * 主题配置接口
 */
export interface ThemeConfig {
  mode: 'light' | 'dark' | 'auto'
  primaryColor: string
  backgroundColor: string
  textColor: string
  borderColor: string
  shadowColor: string
}

/**
 * 布局配置接口
 */
export interface LayoutConfig {
  cardPositions: CardPosition[]
  cardSizes: CardSize[]
  gridLayout: GridLayout
  theme: ThemeConfig
  version: string
}

/**
 * 用户偏好设置接口
 */
export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto'
  language: 'zh-CN' | 'en-US'
  autoSave: boolean
  notifications: boolean
  shortcuts: Record<string, string>
  fontSize: number
  animationEnabled: boolean
  soundEnabled: boolean
}

/**
 * 插件配置接口
 */
export interface PluginConfig {
  id: string
  name: string
  version: string
  enabled: boolean
  settings: Record<string, any>
  permissions: string[]
  manifestUrl?: string
}

/**
 * 插件设置接口
 */
export interface PluginSettings {
  plugins: PluginConfig[]
  globalSettings: Record<string, any>
  autoUpdate: boolean
}

/**
 * WebView实例接口
 */
export interface WebViewInstance {
  id: string
  providerId: string
  url: string
  isReady: boolean
  isLoading: boolean
  canGoBack: boolean
  canGoForward: boolean
  title: string
  favicon?: string
}

/**
 * 应用状态接口
 */
export interface AppState {
  providers: AIProvider[]
  currentMessage: string
  conversations: Record<string, Message[]>
  layoutConfig: LayoutConfig
  userPreferences: UserPreferences
  pluginSettings: PluginSettings
  isInitialized: boolean
  lastSaveTime?: Date
}

/**
 * 内存使用情况接口
 */
export interface MemoryUsage {
  used: number
  total: number
  percentage: number
  timestamp: Date
}

/**
 * CPU使用情况接口
 */
export interface CPUUsage {
  percentage: number
  timestamp: Date
}

/**
 * 性能指标接口
 */
export interface PerformanceMetrics {
  startupTime: number
  messageSendLatency: number
  webviewLoadTime: Record<string, number>
  memoryUsage: MemoryUsage
  cpuUsage: CPUUsage
}

// 导出其他类型模块
export * from './errors'
export * from './events'
export * from './ipc'
