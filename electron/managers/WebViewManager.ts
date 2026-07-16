/**
 * WebView管理器
 * 负责管理所有 WebContentsView 实例的生命周期、事件转发和IPC通信
 */

import {
  WebContentsView, BrowserWindow, shell, ipcMain
} from 'electron'
import { EventEmitter } from 'events'
import { WindowManager } from './WindowManager'
import { SessionManager } from './SessionManager'
import { IPCChannel } from '../../src/types/ipc'

export class WebViewManager extends EventEmitter {
  private windowManager: WindowManager

  private sessionManager: SessionManager

  private views: Map<string, WebContentsView> = new Map()

  private bounds: Map<string, { x: number; y: number; width: number; height: number }> = new Map()

  /** 已挂载到父窗口的视图 ID 集合 */
  private attachedViews: Set<string> = new Set()

  constructor(windowManager: WindowManager, sessionManager: SessionManager) {
    super()
    this.windowManager = windowManager
    this.sessionManager = sessionManager
  }

  async createView(providerId: string, url: string, preloadPath: string): Promise<void> {
    const mainWindow = this.windowManager.getMainWindow()
    if (!mainWindow) {
      throw new Error('Main window not available')
    }

    if (this.views.has(providerId)) {
      return
    }

    let electronSession = this.sessionManager.getSession(providerId)
    if (!electronSession) {
      electronSession = await this.sessionManager.createProviderSession(providerId)
    }

    const view = new WebContentsView({
      webPreferences: {
        preload: preloadPath,
        nodeIntegration: false,
        contextIsolation: true,
        session: electronSession,
        sandbox: false
      }
    })

    view.webContents.loadURL(url)
    mainWindow.contentView.addChildView(view)
    this.views.set(providerId, view)
    this.attachedViews.add(providerId)

    this.setupEventForwarding(providerId, view, mainWindow)

    console.log(`[WebViewManager] Created WebContentsView for ${providerId}`)
  }

  destroyView(providerId: string): void {
    const view = this.views.get(providerId)
    if (!view) return

    const mainWindow = this.windowManager.getMainWindow()
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.contentView.removeChildView(view)
    }

    view.webContents.close()
    this.views.delete(providerId)
    this.bounds.delete(providerId)
    this.attachedViews.delete(providerId)

    console.log(`[WebViewManager] Destroyed WebContentsView for ${providerId}`)
  }

  setBounds(providerId: string, bounds: { x: number; y: number; width: number; height: number }): void {
    this.bounds.set(providerId, bounds)
    const view = this.views.get(providerId)
    if (view) {
      view.setBounds(bounds)
    }
  }

  /**
   * 原子化更新视图的位置与显隐状态
   * 在单次调用内同时完成 bounds 写入与显隐切换，避免显隐与位置更新之间出现 1 帧间隙
   * 导致原生视图短暂出现在旧位置（可能覆盖到 UnifiedInput 区域）
   *
   * @param providerId 提供商唯一标识
   * @param state 待更新的状态对象
   *   - visible 为 false 时：直接把视图移出可视区域，不依赖任何缓存的 bounds
   *   - visible 为 true 且 bounds 存在时：先更新缓存再应用新 bounds，不读取旧缓存
   *   - visible 为 true 但 bounds 缺省时：回退到缓存 bounds（兼容旧调用方），无缓存则不操作
   */
  updateState(
    providerId: string,
    state: { bounds?: { x: number; y: number; width: number; height: number }; visible: boolean }
  ): void {
    const view = this.views.get(providerId)
    if (!view) return

    const mainWindow = this.windowManager.getMainWindow()
    if (!mainWindow || mainWindow.isDestroyed()) return

    const isAttached = this.attachedViews.has(providerId)

    if (!state.visible) {
      // 隐藏：从父窗口移除，避免缩小到 1x1 导致页面布局崩溃
      if (isAttached) {
        mainWindow.contentView.removeChildView(view)
        this.attachedViews.delete(providerId)
      }
      return
    }

    // 显示：重新挂载到父窗口
    if (!isAttached) {
      mainWindow.contentView.addChildView(view)
      this.attachedViews.add(providerId)
    }

    if (state.bounds) {
      this.bounds.set(providerId, state.bounds)
      view.setBounds(state.bounds)
    } else {
      const storedBounds = this.bounds.get(providerId)
      if (storedBounds) {
        view.setBounds(storedBounds)
      }
    }
  }

  /**
   * 设置视图显隐
   * @deprecated 请使用 updateState 替代，避免显隐竞态
   * 内部委托给 updateState，visible 为 true 时走 bounds 缺省的回退路径，使用旧缓存恢复位置
   *
   * @param providerId 提供商唯一标识
   * @param visible 是否可见
   */
  setVisibility(providerId: string, visible: boolean): void {
    this.updateState(providerId, { visible })
  }

  navigateTo(providerId: string, url: string): void {
    const view = this.views.get(providerId)
    if (view) {
      view.webContents.loadURL(url)
    }
  }

  reload(providerId: string): void {
    const view = this.views.get(providerId)
    if (view) {
      view.webContents.reload()
    }
  }

  async executeScript(providerId: string, script: string): Promise<any> {
    const view = this.views.get(providerId)
    if (!view) return null

    return view.webContents.executeJavaScript(script)
  }

  openDevTools(providerId: string): void {
    const view = this.views.get(providerId)
    if (view) {
      view.webContents.openDevTools()
    }
  }

  getWebContents(providerId: string): import('electron').WebContents | null {
    const view = this.views.get(providerId)
    return view?.webContents || null
  }

  destroyAll(): void {
    const providerIds = Array.from(this.views.keys())
    providerIds.forEach((providerId) => {
      this.destroyView(providerId)
    })
  }

  private setupEventForwarding(
    providerId: string,
    view: WebContentsView,
    mainWindow: BrowserWindow
  ): void {
    const sendEvent = (data: Record<string, unknown>) => {
      if (mainWindow.isDestroyed()) return
      mainWindow.webContents.send(IPCChannel.WEBVIEW_EVENT, { providerId, ...data })
    }

    view.webContents.on('did-start-loading', () => {
      sendEvent({ type: 'loading-start' })
    })

    view.webContents.on('did-finish-load', () => {
      sendEvent({ type: 'loading-finish' })
    })

    view.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
      sendEvent({ type: 'loading-error', errorCode, errorDescription })
    })

    view.webContents.on('page-title-updated', (_event, title) => {
      sendEvent({ type: 'title-changed', title })
    })

    view.webContents.on('did-navigate', (_event, url) => {
      sendEvent({ type: 'url-changed', url })
    })

    view.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url)
      return { action: 'deny' }
    })

    view.webContents.on('console-message', (event) => {
      if (event.level === 3) {
        sendEvent({ type: 'console-error', message: event.message })
      }
    })

    ipcMain.on(IPCChannel.WEBVIEW_AI_STATUS_CHANGE, (_event, data) => {
      if (data.providerId === providerId) {
        sendEvent({ type: 'ai-status-change', ...data })
      }
    })
  }
}
