/**
 * IPCHandler 单元测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { IPCHandler } from '../../../electron/managers/IPCHandler'
import { WindowManager } from '../../../electron/managers/WindowManager'
import { SessionManager } from '../../../electron/managers/SessionManager'
import { IPCChannel } from '../../../src/types/ipc'

// Mock Electron modules
const mockIpcMain = {
  handle: vi.fn(),
  on: vi.fn(),
  removeHandler: vi.fn(),
  removeAllListeners: vi.fn()
}

vi.mock('electron', () => ({
  ipcMain: mockIpcMain,
  BrowserWindow: vi.fn(),
  app: {
    getVersion: vi.fn().mockReturnValue('1.0.0'),
    quit: vi.fn(),
    getAppMetrics: vi.fn().mockReturnValue([
      {
        cpu: { percentCPUUsage: 10 },
        memory: { workingSetSize: 1024 * 1024 }
      }
    ])
  }
}))

// Mock os module
vi.mock('os', () => ({
  totalmem: vi.fn().mockReturnValue(8 * 1024 * 1024 * 1024) // 8GB
}))

// Mock managers
const mockWindowManager = {
  getWindow: vi.fn(),
  getMainWindow: vi.fn().mockReturnValue({
    webContents: {
      send: vi.fn()
    },
    isDestroyed: vi.fn().mockReturnValue(false)
  }),
  getAllWindows: vi.fn().mockReturnValue(new Map()),
  minimizeWindow: vi.fn().mockReturnValue(true),
  maximizeWindow: vi.fn().mockReturnValue(true),
  showWindow: vi.fn().mockReturnValue(true)
} as unknown as WindowManager

const mockSessionManager = {
  createProviderSession: vi.fn().mockResolvedValue({}),
  saveSession: vi.fn().mockResolvedValue(true),
  loadSession: vi.fn().mockResolvedValue({
    providerId: 'chatgpt',
    cookies: [],
    localStorage: {},
    sessionStorage: {},
    lastAccess: new Date(),
    isActive: true
  }),
  clearSession: vi.fn().mockResolvedValue(true),
  hasSession: vi.fn().mockResolvedValue(true),
  isSessionActive: vi.fn().mockReturnValue(true),
  getActiveSessionIds: vi.fn().mockReturnValue(['chatgpt', 'gemini'])
} as unknown as SessionManager

describe('IPCHandler', () => {
  let ipcHandler: IPCHandler

  beforeEach(() => {
    ipcHandler = new IPCHandler(mockWindowManager, mockSessionManager)
    vi.clearAllMocks()
  })

  afterEach(() => {
    ipcHandler.destroy()
  })

  describe('initialization', () => {
    it('should initialize with managers', () => {
      expect(ipcHandler).toBeDefined()
    })

    it('should register invoke handlers', () => {
      // Verify that handle was called for various channels
      expect(mockIpcMain.handle).toHaveBeenCalledWith(
        IPCChannel.APP_READY,
        expect.any(Function)
      )
      expect(mockIpcMain.handle).toHaveBeenCalledWith(
        IPCChannel.MESSAGE_SEND,
        expect.any(Function)
      )
      expect(mockIpcMain.handle).toHaveBeenCalledWith(
        IPCChannel.SESSION_SAVE,
        expect.any(Function)
      )
    })

    it('should register send handlers', () => {
      expect(mockIpcMain.on).toHaveBeenCalledWith(
        IPCChannel.ERROR_REPORT,
        expect.any(Function)
      )
    })
  })

  describe('sendToRenderer', () => {
    it('should send message to main window', () => {
      const mockWindow = mockWindowManager.getMainWindow()
      
      ipcHandler.sendToRenderer(IPCChannel.MESSAGE_RECEIVED, { test: 'data' })

      expect(mockWindow?.webContents.send).toHaveBeenCalledWith(
        IPCChannel.MESSAGE_RECEIVED,
        { test: 'data' }
      )
    })

    it('should send message to specific window', () => {
      const mockWindow = {
        webContents: { send: vi.fn() },
        isDestroyed: vi.fn().mockReturnValue(false)
      }
      
      vi.mocked(mockWindowManager.getWindow).mockReturnValue(mockWindow as any)

      ipcHandler.sendToRenderer(IPCChannel.MESSAGE_RECEIVED, { test: 'data' }, 'test-window')

      expect(mockWindowManager.getWindow).toHaveBeenCalledWith('test-window')
      expect(mockWindow.webContents.send).toHaveBeenCalledWith(
        IPCChannel.MESSAGE_RECEIVED,
        { test: 'data' }
      )
    })

    it('should not send to destroyed window', () => {
      const mockWindow = {
        webContents: { send: vi.fn() },
        isDestroyed: vi.fn().mockReturnValue(true)
      }
      
      vi.mocked(mockWindowManager.getWindow).mockReturnValue(mockWindow as any)

      ipcHandler.sendToRenderer(IPCChannel.MESSAGE_RECEIVED, { test: 'data' }, 'test-window')

      expect(mockWindow.webContents.send).not.toHaveBeenCalled()
    })
  })

  describe('broadcast', () => {
    it('should send message to all windows', () => {
      const mockWindow1 = {
        webContents: { send: vi.fn() },
        isDestroyed: vi.fn().mockReturnValue(false)
      }
      const mockWindow2 = {
        webContents: { send: vi.fn() },
        isDestroyed: vi.fn().mockReturnValue(false)
      }

      const windowsMap = new Map([
        ['window1', mockWindow1],
        ['window2', mockWindow2]
      ])

      vi.mocked(mockWindowManager.getAllWindows).mockReturnValue(windowsMap as any)

      ipcHandler.broadcast(IPCChannel.MESSAGE_RECEIVED, { test: 'data' })

      expect(mockWindow1.webContents.send).toHaveBeenCalledWith(
        IPCChannel.MESSAGE_RECEIVED,
        { test: 'data' }
      )
      expect(mockWindow2.webContents.send).toHaveBeenCalledWith(
        IPCChannel.MESSAGE_RECEIVED,
        { test: 'data' }
      )
    })
  })

  describe('basic functionality', () => {
    it('should handle basic IPC operations', () => {
      // Test that the handler was created and basic methods work
      expect(typeof ipcHandler.sendToRenderer).toBe('function')
      expect(typeof ipcHandler.broadcast).toBe('function')
      expect(typeof ipcHandler.destroy).toBe('function')
    })

    it('should cleanup on destroy', () => {
      ipcHandler.destroy()
      expect(mockIpcMain.removeHandler).toHaveBeenCalled()
      expect(mockIpcMain.removeAllListeners).toHaveBeenCalled()
    })
  })
})