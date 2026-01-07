/**
 * 窗口管理器
 * 负责管理应用的所有窗口实例
 */

import {
  BrowserWindow, BrowserWindowConstructorOptions, screen, app
} from 'electron'
import { join } from 'path'
import { isDev } from '../utils'
import { EventEmitter } from 'events'

app.commandLine.appendSwitch('remote-debugging-port', '9222')
/**
 * 窗口配置接口
 */
export interface WindowConfig extends BrowserWindowConstructorOptions {
  id: string
  url?: string
  route?: string
  persistent?: boolean,
  userAgent?: string
}

/**
 * 窗口状态接口
 */
export interface WindowState {
  id: string
  isVisible: boolean
  isMinimized: boolean
  isMaximized: boolean
  isFullScreen: boolean
  bounds: {
    x: number
    y: number
    width: number
    height: number
  }
}

/**
 * 窗口管理器类
 */
export class WindowManager extends EventEmitter {
  private windows: Map<string, BrowserWindow> = new Map()

  private windowConfigs: Map<string, WindowConfig> = new Map()

  private mainWindowId: string | null = null

  /**
   * 创建主窗口
   */
  async createMainWindow(): Promise<BrowserWindow> {
    const isDev = process.env.NODE_ENV === 'development'

    const config: WindowConfig = {
      id: 'main',
      width: 1400,
      height: 900,
      minWidth: 1200,
      minHeight: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,

        preload: join(__dirname, 'preload.js'),
        webSecurity: false, // 允许加载外部网站
        webviewTag: true // 启用webview标签
      },
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
      show: false,
      persistent: true,
      icon: join(__dirname, '../../public/icons/chatallai.png'),
      // 开发环境显示菜单栏，生产环境隐藏
      autoHideMenuBar: !isDev,
      // 开发环境显示窗口框架，生产环境隐藏窗口框架（无边框窗口）
      frame: isDev,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }

    const window = await this.createWindow(config)
    this.mainWindowId = 'main'

    // 开发环境下自动打开开发者工具
    if (isDev) {
      window.webContents.openDevTools()
    }

    return window
  }

  /**
   * 创建窗口
   */
  async createWindow(config: WindowConfig): Promise<BrowserWindow> {
    if (this.windows.has(config.id)) {
      throw new Error(`Window with id "${config.id}" already exists`)
    }

    // 创建窗口
    const window = new BrowserWindow(config)

    // 存储窗口和配置
    this.windows.set(config.id, window)
    this.windowConfigs.set(config.id, config)

    // 设置窗口事件监听
    this.setupWindowEvents(config.id, window)

    // 加载内容
    await this.loadWindowContent(config.id, config.url || config.route)

    // 发射窗口创建事件
    this.emit('window-created', { id: config.id, window })

    return window
  }

  /**
   * 获取窗口
   */
  getWindow(id: string): BrowserWindow | null {
    return this.windows.get(id) || null
  }

  /**
   * 获取主窗口
   */
  getMainWindow(): BrowserWindow | null {
    return this.mainWindowId ? this.getWindow(this.mainWindowId) : null
  }

  /**
   * 获取所有窗口
   */
  getAllWindows(): Map<string, BrowserWindow> {
    return new Map(this.windows)
  }

  /**
   * 显示窗口
   */
  showWindow(id: string): boolean {
    const window = this.getWindow(id)
    if (!window) return false

    if (window.isMinimized()) {
      window.restore()
    }

    window.show()
    window.focus()

    this.emit('window-shown', { id })
    return true
  }

  /**
   * 隐藏窗口
   */
  hideWindow(id: string): boolean {
    const window = this.getWindow(id)
    if (!window) return false

    window.hide()
    this.emit('window-hidden', { id })
    return true
  }

  /**
   * 最小化窗口
   */
  minimizeWindow(id: string): boolean {
    const window = this.getWindow(id)
    if (!window) return false

    window.minimize()
    this.emit('window-minimized', { id })
    return true
  }

  /**
   * 最大化窗口
   */
  maximizeWindow(id: string): boolean {
    const window = this.getWindow(id)
    if (!window) return false

    if (window.isMaximized()) {
      window.unmaximize()
    } else {
      window.maximize()
    }

    this.emit('window-maximized', { id, isMaximized: window.isMaximized() })
    return true
  }

  /**
   * 取消最大化窗口
   */
  unmaximizeWindow(id: string): boolean {
    const window = this.getWindow(id)
    if (!window) return false

    if (window.isMaximized()) {
      window.unmaximize()
    }

    this.emit('window-unmaximized', { id })
    return true
  }

  /**
   * 切换全屏状态
   */
  toggleFullScreen(id: string): boolean {
    const window = this.getWindow(id)
    if (!window) return false

    if (window.isFullScreen()) {
      window.setFullScreen(false)
    } else {
      window.setFullScreen(true)
    }

    this.emit('window-fullscreen-toggled', { id, isFullScreen: window.isFullScreen() })
    return true
  }

  /**
   * 关闭窗口
   */
  closeWindow(id: string): boolean {
    const window = this.getWindow(id)
    if (!window) return false

    window.close()
    return true
  }

  /**
   * 销毁窗口
   */
  destroyWindow(id: string): boolean {
    const window = this.getWindow(id)
    if (!window) return false

    // 移除事件监听器
    window.removeAllListeners()

    // 销毁窗口
    if (!window.isDestroyed()) {
      window.destroy()
    }

    // 从管理器中移除
    this.windows.delete(id)
    this.windowConfigs.delete(id)

    // 如果是主窗口，清除主窗口ID
    if (this.mainWindowId === id) {
      this.mainWindowId = null
    }

    this.emit('window-destroyed', { id })
    return true
  }

  /**
   * 获取窗口状态
   */
  getWindowState(id: string): WindowState | null {
    const window = this.getWindow(id)
    if (!window) return null

    const bounds = window.getBounds()

    return {
      id,
      isVisible: window.isVisible(),
      isMinimized: window.isMinimized(),
      isMaximized: window.isMaximized(),
      isFullScreen: window.isFullScreen(),
      bounds
    }
  }

  /**
   * 设置窗口位置
   */
  setWindowPosition(id: string, x: number, y: number): boolean {
    const window = this.getWindow(id)
    if (!window) return false

    window.setPosition(x, y)
    this.emit('window-moved', { id, x, y })
    return true
  }

  /**
   * 设置窗口大小
   */
  setWindowSize(id: string, width: number, height: number): boolean {
    const window = this.getWindow(id)
    if (!window) return false

    window.setSize(width, height)
    this.emit('window-resized', { id, width, height })
    return true
  }

  /**
   * 居中窗口
   */
  centerWindow(id: string): boolean {
    const window = this.getWindow(id)
    if (!window) return false

    window.center()
    this.emit('window-centered', { id })
    return true
  }

  /**
   * 获取屏幕信息
   */
  getScreenInfo() {
    const primaryDisplay = screen.getPrimaryDisplay()
    const allDisplays = screen.getAllDisplays()

    return {
      primary: primaryDisplay,
      all: allDisplays,
      workArea: primaryDisplay.workArea,
      scaleFactor: primaryDisplay.scaleFactor
    }
  }

  /**
   * 关闭所有窗口
   */
  closeAllWindows(): void {
    const windowIds = Array.from(this.windows.keys())
    windowIds.forEach((id) => {
      this.closeWindow(id)
    })
  }

  /**
   * 销毁所有窗口
   */
  destroyAllWindows(): void {
    const windowIds = Array.from(this.windows.keys())
    windowIds.forEach((id) => {
      this.destroyWindow(id)
    })
  }

  /**
   * 设置窗口事件监听
   */
  private setupWindowEvents(id: string, window: BrowserWindow): void {
    // 窗口准备显示
    window.once('ready-to-show', () => {
      window.show()
      this.emit('window-ready', { id })
    })

    // 窗口关闭
    window.on('closed', () => {
      this.destroyWindow(id)
    })

    // 窗口最小化
    window.on('minimize', () => {
      this.emit('window-minimized', { id })
    })

    // 窗口恢复
    window.on('restore', () => {
      this.emit('window-restored', { id })
    })

    // 窗口最大化
    window.on('maximize', () => {
      this.emit('window-maximized', { id, isMaximized: true })
    })

    // 窗口取消最大化
    window.on('unmaximize', () => {
      this.emit('window-maximized', { id, isMaximized: false })
    })

    // 窗口移动
    window.on('moved', () => {
      const bounds = window.getBounds()
      this.emit('window-moved', { id, x: bounds.x, y: bounds.y })
    })

    // 窗口大小改变
    window.on('resized', () => {
      const bounds = window.getBounds()
      this.emit('window-resized', { id, width: bounds.width, height: bounds.height })
    })

    // 窗口获得焦点
    window.on('focus', () => {
      this.emit('window-focused', { id })
    })

    // 窗口失去焦点
    window.on('blur', () => {
      this.emit('window-blurred', { id })
    })

    // 窗口进入全屏
    window.on('enter-full-screen', () => {
      this.emit('window-fullscreen', { id, isFullScreen: true })
    })

    // 窗口退出全屏
    window.on('leave-full-screen', () => {
      this.emit('window-fullscreen', { id, isFullScreen: false })
    })
  }

  /**
   * 加载窗口内容
   */
  private async loadWindowContent(id: string, urlOrRoute?: string): Promise<void> {
    const window = this.getWindow(id)
    if (!window) return

    if (urlOrRoute) {
      // 如果是外部URL
      if (urlOrRoute.startsWith('http')) {
        await window.loadURL(urlOrRoute)
      } else {
        // 如果是应用路由
        const isDev = process.env.NODE_ENV === 'development'
        // 动态获取输出目录
        const outDir = process.env.VITE_OUT_DIR || 'dist'
        const baseUrl = isDev ? 'http://localhost:5173' : `file://${join(app.getAppPath(), outDir, '/index.html')}`
        const fullUrl = urlOrRoute.startsWith('/') ? `${baseUrl}#${urlOrRoute}` : `${baseUrl}#/${urlOrRoute}`
        await window.loadURL(fullUrl)
      }
    } else {
      // 加载默认页面
      const isDev = process.env.NODE_ENV === 'development'
      if (isDev) {
        await window.loadURL('http://localhost:5173')
      } else {
        // 动态获取输出目录
        const outDir = process.env.VITE_OUT_DIR || 'dist'
        // 生产环境下使用app.getAppPath()获取应用安装路径
        const appPath = app.getAppPath()
        await window.loadFile(join(appPath, outDir, '/index.html'))
      }
    }
  }
}
