import { contextBridge, ipcRenderer } from 'electron'
import { IPCChannel } from '../src/types/ipc'

/**
 * 预加载脚本 - 在渲染进程中暴露安全的 API
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // 应用信息
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),

  // 窗口控制
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  unmaximizeWindow: () => ipcRenderer.invoke('unmaximize-window'),
  isMaximized: () => ipcRenderer.invoke('is-maximized'),

  // WebView管理
  sendMessageToWebView: (webviewId: string, message: string) =>
    ipcRenderer.invoke('send-message-to-webview', { webviewId, message }),
  refreshWebView: (webviewId: string) =>
    ipcRenderer.invoke('refresh-webview', webviewId),
  refreshAllWebViews: () =>
    ipcRenderer.invoke('refresh-all-webviews'),
  loadWebView: (webviewId: string, url: string) =>
    ipcRenderer.invoke('load-webview', { webviewId, url }),

  // 应用控制
  appReady: () => ipcRenderer.invoke(IPCChannel.APP_READY),
  appQuit: () => ipcRenderer.invoke(IPCChannel.APP_QUIT),
  appMinimize: () => ipcRenderer.invoke(IPCChannel.APP_MINIMIZE),
  appMaximize: () => ipcRenderer.invoke(IPCChannel.APP_MAXIMIZE),
  appRestore: () => ipcRenderer.invoke(IPCChannel.APP_RESTORE),

  // 消息处理
  sendMessage: (data: any) => ipcRenderer.invoke(IPCChannel.MESSAGE_SEND, data),
  sendMessageAll: (data: any) => ipcRenderer.invoke(IPCChannel.MESSAGE_SEND_ALL, data),

  // WebView管理
  createWebView: (data: any) => ipcRenderer.invoke(IPCChannel.WEBVIEW_CREATE, data),
  destroyWebView: (data: any) => ipcRenderer.invoke(IPCChannel.WEBVIEW_DESTROY, data),
  reloadWebView: (data: any) => ipcRenderer.invoke(IPCChannel.WEBVIEW_RELOAD, data),
  navigateWebView: (data: any) => ipcRenderer.invoke(IPCChannel.WEBVIEW_NAVIGATE, data),
  executeScript: (data: any) => ipcRenderer.invoke(IPCChannel.WEBVIEW_EXECUTE_SCRIPT, data),
  insertCSS: (data: any) => ipcRenderer.invoke(IPCChannel.WEBVIEW_INSERT_CSS, data),

  // 会话管理
  saveSession: (data: any) => ipcRenderer.invoke(IPCChannel.SESSION_SAVE, data),
  loadSession: (data: any) => ipcRenderer.invoke(IPCChannel.SESSION_LOAD, data),
  clearSession: (data: any) => ipcRenderer.invoke(IPCChannel.SESSION_CLEAR, data),
  checkSession: (data: any) => ipcRenderer.invoke(IPCChannel.SESSION_CHECK, data),

  // 存储操作
  getStorage: (data: any) => ipcRenderer.invoke(IPCChannel.STORAGE_GET, data),
  setStorage: (data: any) => ipcRenderer.invoke(IPCChannel.STORAGE_SET, data),
  deleteStorage: (data: any) => ipcRenderer.invoke(IPCChannel.STORAGE_DELETE, data),
  clearStorage: (data: any) => ipcRenderer.invoke(IPCChannel.STORAGE_CLEAR, data),

  // 设置管理
  getSettings: (data: any) => ipcRenderer.invoke(IPCChannel.SETTINGS_GET, data),
  setSettings: (data: any) => ipcRenderer.invoke(IPCChannel.SETTINGS_SET, data),
  resetSettings: (data: any) => ipcRenderer.invoke(IPCChannel.SETTINGS_RESET, data),

  // 性能监控
  getPerformanceMetrics: () => ipcRenderer.invoke(IPCChannel.PERFORMANCE_GET_METRICS),

  // 事件监听
  onMessageReceived: (callback: (data: any) => void) => {
    ipcRenderer.on(IPCChannel.MESSAGE_RECEIVED, (event, data) => callback(data))
  },
  onMessageError: (callback: (data: any) => void) => {
    ipcRenderer.on(IPCChannel.MESSAGE_ERROR, (event, data) => callback(data))
  },

  // 错误报告
  reportError: (data: any) => ipcRenderer.send(IPCChannel.ERROR_REPORT, data),

  // 移除监听器
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel)
  }
})

// 类型声明
declare global {
  interface Window {
    electronAPI: {
      // 应用信息
      getAppVersion: () => Promise<string>
      getSystemInfo: () => Promise<{ platform: string; nodeVersion: string; electronVersion: string }>

      // 窗口控制
      minimizeWindow: () => Promise<void>
      closeWindow: () => Promise<void>
      maximizeWindow: () => Promise<void>
      unmaximizeWindow: () => Promise<void>
      isMaximized: () => Promise<boolean>

      // WebView管理
      sendMessageToWebView: (webviewId: string, message: string) => Promise<void>
      refreshWebView: (webviewId: string) => Promise<void>
      refreshAllWebViews: () => Promise<void>
      loadWebView: (webviewId: string, url: string) => Promise<void>

      // 应用控制
      appReady: () => Promise<any>
      appQuit: () => Promise<any>
      appMinimize: () => Promise<any>
      appMaximize: () => Promise<any>
      appRestore: () => Promise<any>

      // 消息处理
      sendMessage: (data: any) => Promise<any>
      sendMessageAll: (data: any) => Promise<any>

      // WebView管理
      createWebView: (data: any) => Promise<any>
      destroyWebView: (data: any) => Promise<any>
      reloadWebView: (data: any) => Promise<any>
      navigateWebView: (data: any) => Promise<any>
      executeScript: (data: any) => Promise<any>
      insertCSS: (data: any) => Promise<any>

      // 会话管理
      saveSession: (data: any) => Promise<any>
      loadSession: (data: any) => Promise<any>
      clearSession: (data: any) => Promise<any>
      checkSession: (data: any) => Promise<any>

      // 存储操作
      getStorage: (data: any) => Promise<any>
      setStorage: (data: any) => Promise<any>
      deleteStorage: (data: any) => Promise<any>
      clearStorage: (data: any) => Promise<any>

      // 设置管理
      getSettings: (data: any) => Promise<any>
      setSettings: (data: any) => Promise<any>
      resetSettings: (data: any) => Promise<any>

      // 性能监控
      getPerformanceMetrics: () => Promise<any>

      // 事件监听
      onMessageReceived: (callback: (data: any) => void) => void
      onMessageError: (callback: (data: any) => void) => void

      // 错误报告
      reportError: (data: any) => void

      // 移除监听器
      removeAllListeners: (channel: string) => void
    }
  }
}
