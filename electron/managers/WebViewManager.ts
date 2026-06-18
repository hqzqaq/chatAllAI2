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

export class WebViewManager extends EventEmitter {
  private windowManager: WindowManager

  private sessionManager: SessionManager

  private views: Map<string, WebContentsView> = new Map()

  private bounds: Map<string, { x: number; y: number; width: number; height: number }> = new Map()

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

    console.log(`[WebViewManager] Destroyed WebContentsView for ${providerId}`)
  }

  setBounds(providerId: string, bounds: { x: number; y: number; width: number; height: number }): void {
    this.bounds.set(providerId, bounds)
    const view = this.views.get(providerId)
    if (view) {
      view.setBounds(bounds)
    }
  }

  setVisibility(providerId: string, visible: boolean): void {
    const view = this.views.get(providerId)
    if (!view) return

    if (!visible) {
      view.setBounds({
        x: -9999, y: -9999, width: 1, height: 1
      })
    } else {
      const storedBounds = this.bounds.get(providerId)
      if (storedBounds) {
        view.setBounds(storedBounds)
      }
    }
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
      mainWindow.webContents.send('webview:event', { providerId, ...data })
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

    ipcMain.on('webview-ai-status-change', (_event, data) => {
      if (data.providerId === providerId) {
        sendEvent({ type: 'ai-status-change', ...data })
      }
    })
  }
}
