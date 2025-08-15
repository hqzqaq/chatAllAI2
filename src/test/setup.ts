/**
 * 测试环境设置
 */

import { vi } from 'vitest'
import { config } from '@vue/test-utils'
import ElementPlus from 'element-plus'

// 配置Vue Test Utils全局组件
config.global.plugins = [ElementPlus]

// 全局测试配置
global.console = {
  ...console,
  // 在测试中静默某些日志
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
}

// Mock Electron API
const mockElectronAPI = {
  invoke: vi.fn(),
  send: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  getAppVersion: vi.fn().mockResolvedValue('1.0.0'),
  minimizeWindow: vi.fn(),
  closeWindow: vi.fn(),
  maximizeWindow: vi.fn(),
  unmaximizeWindow: vi.fn(),
  isMaximized: vi.fn().mockResolvedValue(false),
  onWindowStateChange: vi.fn(),
  removeAllListeners: vi.fn(),
  sendMessageToWebView: vi.fn().mockResolvedValue(undefined),
  refreshWebView: vi.fn().mockResolvedValue(undefined),
  refreshAllWebViews: vi.fn().mockResolvedValue(undefined),
  loadWebView: vi.fn().mockResolvedValue(undefined)
}

// 设置全局 electronAPI
Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true
})

global.electronAPI = mockElectronAPI

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
})

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
})

// Mock performance.memory
Object.defineProperty(performance, 'memory', {
  writable: true,
  value: {
    usedJSHeapSize: 1024 * 1024 * 50, // 50MB
    totalJSHeapSize: 1024 * 1024 * 100, // 100MB
    jsHeapSizeLimit: 1024 * 1024 * 200 // 200MB
  }
})