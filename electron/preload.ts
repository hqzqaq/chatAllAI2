import type { IpcRendererEvent } from 'electron'
import { contextBridge, ipcRenderer } from 'electron'
import { IPCChannel } from '../src/types/ipc'

contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke(IPCChannel.GET_APP_VERSION),
  getSystemInfo: () => ipcRenderer.invoke(IPCChannel.GET_SYSTEM_INFO),

  minimizeWindow: () => ipcRenderer.invoke(IPCChannel.MINIMIZE_WINDOW),
  closeWindow: () => ipcRenderer.invoke(IPCChannel.CLOSE_WINDOW),
  maximizeWindow: () => ipcRenderer.invoke(IPCChannel.MAXIMIZE_WINDOW),
  unmaximizeWindow: () => ipcRenderer.invoke(IPCChannel.UNMAXIMIZE_WINDOW),
  isMaximized: () => ipcRenderer.invoke(IPCChannel.IS_MAXIMIZED),
  toggleFullScreen: () => ipcRenderer.invoke(IPCChannel.TOGGLE_FULLSCREEN),

  createWebView: (data: { providerId: string, url: string }) => (
    ipcRenderer.invoke(IPCChannel.CREATE_WEBVIEW, data)
  ),
  destroyWebView: (providerId: string) => ipcRenderer.invoke(IPCChannel.DESTROY_WEBVIEW, { providerId }),
  updateWebViewBounds: (data: {
    providerId: string
    bounds: { x: number, y: number, width: number, height: number }
  }) => ipcRenderer.invoke(IPCChannel.UPDATE_WEBVIEW_BOUNDS, data),
  setWebViewVisibility: (data: { providerId: string, visible: boolean }) => (
    ipcRenderer.invoke(IPCChannel.SET_WEBVIEW_VISIBILITY, data)
  ),
  updateWebViewState: (data: {
    providerId: string
    bounds?: { x: number, y: number, width: number, height: number }
    visible: boolean
  }) => ipcRenderer.invoke(IPCChannel.UPDATE_WEBVIEW_STATE, data),
  executeWebViewScript: (data: { providerId: string, script: string }) => (
    ipcRenderer.invoke(IPCChannel.EXECUTE_WEBVIEW_SCRIPT, data)
  ),
  reloadWebView: (providerId: string) => ipcRenderer.invoke(IPCChannel.RELOAD_WEBVIEW, { providerId }),
  navigateWebView: (data: { providerId: string, url: string }) => (
    ipcRenderer.invoke(IPCChannel.NAVIGATE_WEBVIEW, data)
  ),
  openWebViewDevTools: (providerId: string) => ipcRenderer.invoke(IPCChannel.OPEN_WEBVIEW_DEVTOOLS, { providerId }),

  sendMessageToWebView: (webviewId: string, message: string) => (
    ipcRenderer.invoke(IPCChannel.SEND_MESSAGE_TO_WEBVIEW, { webviewId, message })
  ),

  appReady: () => ipcRenderer.invoke(IPCChannel.APP_READY),
  appQuit: () => ipcRenderer.invoke(IPCChannel.APP_QUIT),
  appMinimize: () => ipcRenderer.invoke(IPCChannel.APP_MINIMIZE),
  appMaximize: () => ipcRenderer.invoke(IPCChannel.APP_MAXIMIZE),
  appRestore: () => ipcRenderer.invoke(IPCChannel.APP_RESTORE),

  sendMessage: (data: any) => ipcRenderer.invoke(IPCChannel.MESSAGE_SEND, data),
  sendMessageAll: (data: any) => ipcRenderer.invoke(IPCChannel.MESSAGE_SEND_ALL, data),

  setProxy: (data: any) => ipcRenderer.invoke(IPCChannel.WEBVIEW_SET_PROXY, data),

  saveSession: (data: any) => ipcRenderer.invoke(IPCChannel.SESSION_SAVE, data),
  loadSession: (data: any) => ipcRenderer.invoke(IPCChannel.SESSION_LOAD, data),
  clearSession: (data: any) => ipcRenderer.invoke(IPCChannel.SESSION_CLEAR, data),
  checkSession: (data: any) => ipcRenderer.invoke(IPCChannel.SESSION_CHECK, data),

  getStorage: (data: any) => ipcRenderer.invoke(IPCChannel.STORAGE_GET, data),
  setStorage: (data: any) => ipcRenderer.invoke(IPCChannel.STORAGE_SET, data),
  deleteStorage: (data: any) => ipcRenderer.invoke(IPCChannel.STORAGE_DELETE, data),
  clearStorage: (data: any) => ipcRenderer.invoke(IPCChannel.STORAGE_CLEAR, data),

  getSettings: (data: any) => ipcRenderer.invoke(IPCChannel.SETTINGS_GET, data),
  setSettings: (data: any) => ipcRenderer.invoke(IPCChannel.SETTINGS_SET, data),
  resetSettings: (data: any) => ipcRenderer.invoke(IPCChannel.SETTINGS_RESET, data),

  getPerformanceMetrics: () => ipcRenderer.invoke(IPCChannel.PERFORMANCE_GET_METRICS),

  startAIStatusMonitoring: (data: any) => ipcRenderer.invoke(IPCChannel.AI_STATUS_START_MONITORING, data),
  stopAIStatusMonitoring: (data: any) => ipcRenderer.invoke(IPCChannel.AI_STATUS_STOP_MONITORING, data),

  openFileDialog: (data: any) => ipcRenderer.invoke(IPCChannel.FILE_OPEN_DIALOG, data),
  readFile: (data: any) => ipcRenderer.invoke(IPCChannel.FILE_READ, data),
  uploadFileToWebView: (data: any) => ipcRenderer.invoke(IPCChannel.FILE_UPLOAD_TO_WEBVIEW, data),

  getPreloadPath: (preloadName: string) => ipcRenderer.invoke(IPCChannel.GET_PRELOAD_PATH, preloadName),

  clearProviderStorage: (providerId: string) => ipcRenderer.invoke(IPCChannel.CLEAR_PROVIDER_STORAGE, providerId),

  providerOpenSystemLogin: (providerId: string) => ipcRenderer.invoke(
    IPCChannel.PROVIDER_OPEN_SYSTEM_LOGIN,
    { providerId }
  ),
  providerImportCookies: (data: { providerId: string, cookies: any[] }) => (
    ipcRenderer.invoke(IPCChannel.PROVIDER_IMPORT_COOKIES, data)
  ),

  onAIStatusChange: (callback: (data: any) => void) => {
    const handler = (event: IpcRendererEvent, data: any) => callback(data)
    ipcRenderer.on(IPCChannel.AI_STATUS_CHANGE, handler)
    return () => {
      ipcRenderer.removeListener(IPCChannel.AI_STATUS_CHANGE, handler)
    }
  },

  onWebViewEvent: (callback: (data: { providerId: string, type: string, data: any }) => void) => {
    const handler = (event: any, data: any) => callback(data)
    ipcRenderer.on(IPCChannel.WEBVIEW_EVENT, handler)
    return () => {
      ipcRenderer.removeListener(IPCChannel.WEBVIEW_EVENT, handler)
    }
  },

  reportError: (data: any) => ipcRenderer.send(IPCChannel.ERROR_REPORT, data),

  removeListener: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.removeListener(channel, callback)
  },

  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel)
  },

  send: (channel: string, data: any) => {
    ipcRenderer.send(channel, data)
  }
})

declare global {
  interface Window {
    electronAPI: {
      getAppVersion: () => Promise<string>
      getSystemInfo: () => Promise<{ platform: string; nodeVersion: string; electronVersion: string }>

      minimizeWindow: () => Promise<void>
      closeWindow: () => Promise<void>
      maximizeWindow: () => Promise<void>
      unmaximizeWindow: () => Promise<void>
      isMaximized: () => Promise<boolean>
      toggleFullScreen: () => Promise<void>

      createWebView: (data: { providerId: string, url: string }) => Promise<any>
      destroyWebView: (providerId: string) => Promise<any>
      updateWebViewBounds: (data: {
        providerId: string
        bounds: { x: number, y: number, width: number, height: number }
      }) => Promise<any>
      setWebViewVisibility: (data: { providerId: string, visible: boolean }) => Promise<any>
      updateWebViewState: (data: {
        providerId: string
        bounds?: { x: number, y: number, width: number, height: number }
        visible: boolean
      }) => Promise<any>
      executeWebViewScript: (data: { providerId: string, script: string }) => Promise<any>
      reloadWebView: (providerId: string) => Promise<any>
      navigateWebView: (data: { providerId: string, url: string }) => Promise<any>
      openWebViewDevTools: (providerId: string) => Promise<any>

      sendMessageToWebView: (webviewId: string, message: string) => Promise<any>

      appReady: () => Promise<any>
      appQuit: () => Promise<any>
      appMinimize: () => Promise<any>
      appMaximize: () => Promise<any>
      appRestore: () => Promise<any>

      sendMessage: (data: any) => Promise<any>
      sendMessageAll: (data: any) => Promise<any>

      setProxy: (data: any) => Promise<any>

      saveSession: (data: any) => Promise<any>
      loadSession: (data: any) => Promise<any>
      clearSession: (data: any) => Promise<any>
      checkSession: (data: any) => Promise<any>

      getStorage: (data: any) => Promise<any>
      setStorage: (data: any) => Promise<any>
      deleteStorage: (data: any) => Promise<any>
      clearStorage: (data: any) => Promise<any>

      getSettings: (data: any) => Promise<any>
      setSettings: (data: any) => Promise<any>
      resetSettings: (data: any) => Promise<any>

      getPerformanceMetrics: () => Promise<any>

      startAIStatusMonitoring: (data: any) => Promise<any>
      stopAIStatusMonitoring: (data: any) => Promise<any>

      openFileDialog: (data: any) => Promise<any>
      readFile: (data: any) => Promise<any>
      uploadFileToWebView: (data: any) => Promise<any>

      getPreloadPath: (preloadName: string) => Promise<string>

      clearProviderStorage: (providerId: string) => Promise<{ success: boolean; error?: string }>

      providerOpenSystemLogin: (providerId: string) => Promise<{ success: boolean; error?: string }>
      providerImportCookies: (data: {
        providerId: string
        cookies: Array<{
          name: string
          value: string
          domain?: string
          path?: string
          secure?: boolean
          httpOnly?: boolean
          expirationDate?: number
        }>
      }) => Promise<{ success: boolean; imported: number; error?: string }>

      onAIStatusChange: (callback: (data: any) => void) => () => void
      onWebViewEvent: (callback: (data: { providerId: string, type: string, data: any }) => void) => () => void

      reportError: (data: any) => void

      removeListener: (channel: string, callback: (...args: any[]) => void) => void
      removeAllListeners: (channel: string) => void
      send: (channel: string, data: any) => void
    }
  }
}
