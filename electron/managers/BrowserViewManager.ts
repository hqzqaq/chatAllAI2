/**
 * BrowserView 管理器
 * 负责管理多个 BrowserView 实例的生命周期、事件处理和通信
 *
 * @author huquanzhi
 * @since 2026-03-26
 * @version 1.0
 */

import {
  BrowserView,
  BrowserWindow,
  session,
  Rectangle,
  WebContents,
  Session
} from 'electron'
import { EventEmitter } from 'events'
import { SessionManager } from './SessionManager'

/**
 * BrowserView 配置接口
 */
export interface BrowserViewConfig {
  /** 是否启用开发者工具 */
  enableDevTools?: boolean
  /** 背景颜色 */
  backgroundColor?: string
  /** 是否启用 JavaScript */
  javascript?: boolean
  /** 是否启用图片 */
  images?: boolean
  /** 是否启用 WebGL */
  webgl?: boolean
  /** 是否启用 Node.js 集成 */
  nodeIntegration?: boolean
  /** 是否启用上下文隔离 */
  contextIsolation?: boolean
  /** 预加载脚本路径 */
  preload?: string
}

/**
 * BrowserView 元数据接口
 */
export interface BrowserViewMetadata {
  providerId: string
  url: string
  partition: string
  createdAt: Date
  lastUsedAt: Date
  loadCount: number
  errorCount: number
}

/**
 * BrowserView 事件类型
 */
export type BrowserViewEventType =
  | 'did-finish-load'
  | 'did-fail-load'
  | 'page-title-updated'
  | 'will-navigate'
  | 'did-navigate'
  | 'dom-ready'
  | 'destroyed'

/**
 * BrowserView 管理器类
 */
export class BrowserViewManager extends EventEmitter {
  /** BrowserView 实例映射表 */
  private browserViews: Map<string, BrowserView> = new Map()

  /** BrowserView 元数据映射表 */
  private viewMetadata: Map<string, BrowserViewMetadata> = new Map()

  /** 主窗口引用 */
  private mainWindow: BrowserWindow

  /** 会话管理器引用 */
  private sessionManager: SessionManager

  /** 默认配置 */
  private defaultConfig: BrowserViewConfig = {
    enableDevTools: false,
    backgroundColor: '#ffffff',
    javascript: true,
    images: true,
    webgl: true,
    nodeIntegration: false,
    contextIsolation: true
  }

  /** 是否启用日志记录 */
  private enableLogging: boolean = true

  /**
   * 构造函数
   * @param mainWindow 主窗口实例
   * @param sessionManager 会话管理器实例
   * @param config 可选的默认配置
   */
  constructor(
    mainWindow: BrowserWindow,
    sessionManager: SessionManager,
    config?: Partial<BrowserViewConfig>
  ) {
    super()
    this.mainWindow = mainWindow
    this.sessionManager = sessionManager
    this.defaultConfig = { ...this.defaultConfig, ...config }

    this.log('BrowserViewManager initialized')
  }

  /**
   * 创建 BrowserView 实例
   * @param providerId 提供商 ID
   * @param url 初始 URL
   * @param partition 会话分区名称
   * @param config 可选的配置
   * @returns 创建的 BrowserView 实例
   */
  createBrowserView(
    providerId: string,
    url: string,
    partition: string,
    config?: Partial<BrowserViewConfig>
  ): BrowserView {
    // 检查是否已存在
    if (this.browserViews.has(providerId)) {
      this.log(`BrowserView for ${providerId} already exists, returning existing instance`)
      return this.browserViews.get(providerId)!
    }

    try {
      // 合并配置
      const mergedConfig = { ...this.defaultConfig, ...config }

      // 获取或创建会话
      let electronSession: Session
      try {
        electronSession = this.sessionManager.getElectronSession(providerId)
          || session.fromPartition(`persist:${partition}`)
      } catch {
        electronSession = session.fromPartition(`persist:${partition}`)
      }

      // 创建 BrowserView
      const browserView = new BrowserView({
        webPreferences: {
          nodeIntegration: mergedConfig.nodeIntegration ?? false,
          contextIsolation: mergedConfig.contextIsolation ?? true,
          backgroundThrottling: false,
          enableWebSQL: false,
          session: electronSession,
          preload: mergedConfig.preload,
          devTools: mergedConfig.enableDevTools ?? false
        }
      })

      // 设置背景颜色
      if (mergedConfig.backgroundColor) {
        browserView.setBackgroundColor(mergedConfig.backgroundColor)
      }

      // 加载初始 URL
      browserView.webContents.loadURL(url)

      // 设置初始边界（默认为不可见）
      browserView.setBounds({
        x: 0, y: 0, width: 0, height: 0
      })

      // 注册事件监听器
      this.attachEventListeners(providerId, browserView)

      // 存储实例
      this.browserViews.set(providerId, browserView)

      // 创建元数据
      const metadata: BrowserViewMetadata = {
        providerId,
        url,
        partition,
        createdAt: new Date(),
        lastUsedAt: new Date(),
        loadCount: 0,
        errorCount: 0
      }
      this.viewMetadata.set(providerId, metadata)

      this.log(`BrowserView created for ${providerId} with URL: ${url}`)
      this.emit('view-created', { providerId, url, browserView })

      return browserView
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.log(`Failed to create BrowserView for ${providerId}:`, errorMessage)
      throw new Error(`Failed to create BrowserView: ${errorMessage}`)
    }
  }

  /**
   * 销毁指定的 BrowserView 实例
   * @param providerId 提供商 ID
   */
  destroyBrowserView(providerId: string): void {
    const browserView = this.browserViews.get(providerId)

    if (!browserView) {
      this.log(`BrowserView for ${providerId} not found`)
      return
    }

    try {
      // 从主窗口中移除
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.removeBrowserView(browserView)
      }

      // 销毁 WebContents
      if (!browserView.webContents.isDestroyed()) {
        (browserView.webContents as any).destroy()
      }

      // 清理存储
      this.browserViews.delete(providerId)
      this.viewMetadata.delete(providerId)

      this.log(`BrowserView destroyed for ${providerId}`)
      this.emit('view-destroyed', { providerId })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.log(`Error destroying BrowserView for ${providerId}:`, errorMessage)
    }
  }

  /**
   * 设置 BrowserView 的边界
   * @param providerId 提供商 ID
   * @param bounds 边界矩形
   */
  setBounds(providerId: string, bounds: Rectangle): void {
    const browserView = this.browserViews.get(providerId)

    if (!browserView) {
      this.log(`Cannot set bounds: BrowserView for ${providerId} not found`)
      return
    }

    try {
      // 获取主窗口的位置，用于调试
      const windowBounds = this.mainWindow.getBounds()
      console.log(`[BrowserViewManager] Setting bounds for ${providerId}:`, bounds, 'Window bounds:', windowBounds)
      
      browserView.setBounds(bounds)
      this.log(`Bounds set for ${providerId}:`, bounds)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.log(`Error setting bounds for ${providerId}:`, errorMessage)
    }
  }

  /**
   * 显示 BrowserView
   * @param providerId 提供商 ID
   */
  showBrowserView(providerId: string): void {
    const browserView = this.browserViews.get(providerId)

    if (!browserView) {
      this.log(`Cannot show: BrowserView for ${providerId} not found`)
      return
    }

    try {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.addBrowserView(browserView)
        browserView.webContents.focus()

        // 更新元数据
        const metadata = this.viewMetadata.get(providerId)
        if (metadata) {
          metadata.lastUsedAt = new Date()
        }

        this.log(`BrowserView shown for ${providerId}`)
        this.emit('view-shown', { providerId })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.log(`Error showing BrowserView for ${providerId}:`, errorMessage)
    }
  }

  /**
   * 隐藏 BrowserView
   * @param providerId 提供商 ID
   */
  hideBrowserView(providerId: string): void {
    const browserView = this.browserViews.get(providerId)

    if (!browserView) {
      this.log(`Cannot hide: BrowserView for ${providerId} not found`)
      return
    }

    try {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.removeBrowserView(browserView)
        this.log(`BrowserView hidden for ${providerId}`)
        this.emit('view-hidden', { providerId })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.log(`Error hiding BrowserView for ${providerId}:`, errorMessage)
    }
  }

  /**
   * 在 BrowserView 中执行 JavaScript 脚本
   * @param providerId 提供商 ID
   * @param script 要执行的脚本
   * @returns 脚本执行结果
   */
  async executeScript(providerId: string, script: string): Promise<any> {
    const browserView = this.browserViews.get(providerId)

    if (!browserView) {
      throw new Error(`BrowserView for ${providerId} not found`)
    }

    if (browserView.webContents.isDestroyed()) {
      throw new Error(`WebContents for ${providerId} is destroyed`)
    }

    try {
      this.log(`Executing script in BrowserView ${providerId}`)
      const result = await browserView.webContents.executeJavaScript(script, true)
      this.log(`Script executed successfully in ${providerId}`)
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.log(`Script execution failed in ${providerId}:`, errorMessage)
      throw new Error(`Script execution failed: ${errorMessage}`)
    }
  }

  /**
   * 向 BrowserView 发送消息
   * @param providerId 提供商 ID
   * @param message 消息内容
   * @returns 是否发送成功
   */
  async sendMessage(providerId: string, message: string): Promise<boolean> {
    const browserView = this.browserViews.get(providerId)

    if (!browserView) {
      this.log(`Cannot send message: BrowserView for ${providerId} not found`)
      return false
    }

    if (browserView.webContents.isDestroyed()) {
      this.log(`Cannot send message: WebContents for ${providerId} is destroyed`)
      return false
    }

    try {
      // 使用 IPC 发送消息到渲染进程
      browserView.webContents.send('browser-view-message', {
        providerId,
        message,
        timestamp: Date.now()
      })

      this.log(`Message sent to BrowserView ${providerId}`)
      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.log(`Failed to send message to ${providerId}:`, errorMessage)
      return false
    }
  }

  /**
   * 打开开发者工具
   * @param providerId 提供商 ID
   */
  openDevTools(providerId: string): void {
    const browserView = this.browserViews.get(providerId)

    if (!browserView) {
      this.log(`Cannot open DevTools: BrowserView for ${providerId} not found`)
      return
    }

    try {
      browserView.webContents.openDevTools({ mode: 'detach' })
      this.log(`DevTools opened for ${providerId}`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.log(`Error opening DevTools for ${providerId}:`, errorMessage)
    }
  }

  /**
   * 关闭开发者工具
   * @param providerId 提供商 ID
   */
  closeDevTools(providerId: string): void {
    const browserView = this.browserViews.get(providerId)

    if (!browserView) {
      this.log(`Cannot close DevTools: BrowserView for ${providerId} not found`)
      return
    }

    try {
      browserView.webContents.closeDevTools()
      this.log(`DevTools closed for ${providerId}`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.log(`Error closing DevTools for ${providerId}:`, errorMessage)
    }
  }

  /**
   * 获取 BrowserView 实例
   * @param providerId 提供商 ID
   * @returns BrowserView 实例或 undefined
   */
  getBrowserView(providerId: string): BrowserView | undefined {
    return this.browserViews.get(providerId)
  }

  /**
   * 获取 BrowserView 的 WebContents
   * @param providerId 提供商 ID
   * @returns WebContents 实例或 undefined
   */
  getWebContents(providerId: string): WebContents | undefined {
    const browserView = this.browserViews.get(providerId)
    return browserView?.webContents
  }

  /**
   * 获取 BrowserView 元数据
   * @param providerId 提供商 ID
   * @returns 元数据或 undefined
   */
  getMetadata(providerId: string): BrowserViewMetadata | undefined {
    return this.viewMetadata.get(providerId)
  }

  /**
   * 获取所有 BrowserView 的 providerId 列表
   * @returns providerId 数组
   */
  getAllProviderIds(): string[] {
    return Array.from(this.browserViews.keys())
  }

  /**
   * 检查 BrowserView 是否存在
   * @param providerId 提供商 ID
   * @returns 是否存在
   */
  hasBrowserView(providerId: string): boolean {
    return this.browserViews.has(providerId)
  }

  /**
   * 检查 BrowserView 是否已加载完成
   * @param providerId 提供商 ID
   * @returns 是否已加载
   */
  isLoaded(providerId: string): boolean {
    const browserView = this.browserViews.get(providerId)
    if (!browserView || browserView.webContents.isDestroyed()) {
      return false
    }
    return !browserView.webContents.isLoading()
  }

  /**
   * 重新加载 BrowserView
   * @param providerId 提供商 ID
   */
  reloadBrowserView(providerId: string): void {
    const browserView = this.browserViews.get(providerId)

    if (!browserView) {
      this.log(`Cannot reload: BrowserView for ${providerId} not found`)
      return
    }

    try {
      browserView.webContents.reload()
      this.log(`BrowserView reloaded for ${providerId}`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.log(`Error reloading BrowserView for ${providerId}:`, errorMessage)
    }
  }

  /**
   * 导航到指定 URL
   * @param providerId 提供商 ID
   * @param url 目标 URL
   */
  navigateTo(providerId: string, url: string): void {
    const browserView = this.browserViews.get(providerId)

    if (!browserView) {
      this.log(`Cannot navigate: BrowserView for ${providerId} not found`)
      return
    }

    try {
      browserView.webContents.loadURL(url)
      this.log(`BrowserView ${providerId} navigating to: ${url}`)

      // 更新元数据
      const metadata = this.viewMetadata.get(providerId)
      if (metadata) {
        metadata.url = url
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.log(`Error navigating BrowserView ${providerId}:`, errorMessage)
    }
  }

  /**
   * 销毁所有 BrowserView 实例
   */
  destroyAllBrowserViews(): void {
    this.log(`Destroying all BrowserViews (${this.browserViews.size} total)`)

    const providerIds = Array.from(this.browserViews.keys())

    providerIds.forEach((providerId) => {
      this.destroyBrowserView(providerId)
    })

    this.browserViews.clear()
    this.viewMetadata.clear()

    this.log('All BrowserViews destroyed')
    this.emit('all-views-destroyed')
  }

  /**
   * 获取 BrowserView 数量
   * @returns BrowserView 数量
   */
  getBrowserViewCount(): number {
    return this.browserViews.size
  }

  /**
   * 设置 BrowserView 自动调整大小
   * @param providerId 提供商 ID
   * @param options 自动调整选项
   */
  setAutoResize(
    providerId: string,
    options: { width?: boolean; height?: boolean; horizontal?: boolean; vertical?: boolean }
  ): void {
    const browserView = this.browserViews.get(providerId)

    if (!browserView) {
      this.log(`Cannot set auto resize: BrowserView for ${providerId} not found`)
      return
    }

    try {
      browserView.setAutoResize(options)
      this.log(`Auto resize set for ${providerId}:`, options)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.log(`Error setting auto resize for ${providerId}:`, errorMessage)
    }
  }

  /**
   * 附加事件监听器到 BrowserView
   * @param providerId 提供商 ID
   * @param browserView BrowserView 实例
   */
  private attachEventListeners(providerId: string, browserView: BrowserView): void {
    const { webContents } = browserView

    // 页面加载完成
    webContents.on('did-finish-load', () => {
      this.log(`Page finished loading for ${providerId}`)

      const metadata = this.viewMetadata.get(providerId)
      if (metadata) {
        metadata.loadCount += 1
        metadata.lastUsedAt = new Date()
      }

      this.emit('did-finish-load', { providerId, url: webContents.getURL() })
    })

    // 页面加载失败
    webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      this.log(`Page failed to load for ${providerId}:`, { errorCode, errorDescription, validatedURL })

      const metadata = this.viewMetadata.get(providerId)
      if (metadata) {
        metadata.errorCount += 1
      }

      this.emit('did-fail-load', {
        providerId,
        errorCode,
        errorDescription,
        validatedURL
      })
    })

    // 页面标题更新
    webContents.on('page-title-updated', (event, title) => {
      this.log(`Page title updated for ${providerId}: ${title}`)
      this.emit('page-title-updated', { providerId, title })
    })

    // 即将导航
    webContents.on('will-navigate', (event, url) => {
      this.log(`Will navigate for ${providerId} to: ${url}`)
      this.emit('will-navigate', { providerId, url })
    })

    // 导航完成
    webContents.on('did-navigate', (event, url) => {
      this.log(`Did navigate for ${providerId} to: ${url}`)

      const metadata = this.viewMetadata.get(providerId)
      if (metadata) {
        metadata.url = url
      }

      this.emit('did-navigate', { providerId, url })
    })

    // DOM 准备就绪
    webContents.on('dom-ready', () => {
      this.log(`DOM ready for ${providerId}`)
      this.emit('dom-ready', { providerId })
    })

    // 控制台消息
    webContents.on('console-message', (event, level, message, line, sourceId) => {
      const levelMap = ['debug', 'info', 'warning', 'error']
      const levelName = levelMap[level] || 'unknown'

      if (level >= 3) { // 只记录警告和错误
        this.log(`Console [${levelName}] for ${providerId}:`, { message, line, sourceId })
      }

      this.emit('console-message', {
        providerId,
        level: levelName,
        message,
        line,
        sourceId
      })
    })

    // 页面崩溃
    webContents.on('crashed', (event, killed) => {
      this.log(`BrowserView crashed for ${providerId}, killed: ${killed}`)
      this.emit('crashed', { providerId, killed })
    })

    // GPU 崩溃
    webContents.on('gpu-process-crashed' as any, (event: any, killed: boolean) => {
      this.log(`GPU process crashed for ${providerId}, killed: ${killed}`)
      this.emit('gpu-crashed', { providerId, killed })
    })

    // 插件崩溃
    webContents.on('plugin-crashed', (event, name, version) => {
      this.log(`Plugin crashed for ${providerId}:`, { name, version })
      this.emit('plugin-crashed', { providerId, name, version })
    })

    // 渲染进程被终止
    webContents.on('render-process-gone', (event, details) => {
      this.log(`Render process gone for ${providerId}:`, details)
      this.emit('render-process-gone', { providerId, details })
    })

    // 新建窗口请求
    webContents.setWindowOpenHandler(({ url }) => {
      this.log(`Window open requested for ${providerId}: ${url}`)
      this.emit('window-open-requested', { providerId, url })

      // 默认阻止新建窗口，可以在外部处理
      return { action: 'deny' }
    })
  }

  /**
   * 日志记录
   * @param message 消息
   * @param data 可选的数据
   */
  private log(message: string, data?: any): void {
    if (this.enableLogging) {
      console.log(`[BrowserViewManager] ${message}`, data || '')
    }
  }

  /**
   * 销毁管理器
   * 清理所有资源
   */
  destroy(): void {
    this.log('Destroying BrowserViewManager...')

    // 销毁所有 BrowserView
    this.destroyAllBrowserViews()

    // 移除所有事件监听器
    this.removeAllListeners()

    this.log('BrowserViewManager destroyed')
  }
}
