/**
 * WebView Preload Script
 * This script is injected into the <webview> tag.
 * It exposes a secure API for the guest page to communicate with the main process.
 */
import { contextBridge, ipcRenderer } from 'electron'

console.log('[WebView Preload] Script loaded.')

contextBridge.exposeInMainWorld('__WEBVIEW_API__', {
  /**
   * Sends a message to the main process.
   * @param channel The IPC channel to send the message on.
   * @param data The data to send.
   */
  sendToHost: (channel: string, data: any) => {
    ipcRenderer.send(channel, data)
  }
})
