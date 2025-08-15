/**
 * WindowManager 单元测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { BrowserWindow } from 'electron'
import { WindowManager, WindowConfig } from '../../../electron/managers/WindowManager'

// Mock Electron modules
vi.mock('electron', () => ({
  BrowserWindow: vi.fn().mockImplementation(() => ({
    loadURL: vi.fn().mockResolvedValue(undefined),
    loadFile: vi.fn().mockResolvedValue(undefined),
    show: vi.fn(),
    hide: vi.fn(),
    minimize: vi.fn(),
    maximize: vi.fn(),
    unmaximize: vi.fn(),
    restore: vi.fn(),
    close: vi.fn(),
    destroy: vi.fn(),
    focus: vi.fn(),
    center: vi.fn(),
    setPosition: vi.fn(),
    setSize: vi.fn(),
    getBounds: vi.fn().mockReturnValue({ x: 0, y: 0, width: 1400, height: 900 }),
    isVisible: vi.fn().mockReturnValue(true),
    isMinimized: vi.fn().mockReturnValue(false),
    isMaximized: vi.fn().mockReturnValue(false),
    isFullScreen: vi.fn().mockReturnValue(false),
    isDestroyed: vi.fn().mockReturnValue(false),
    removeAllListeners: vi.fn(),
    once: vi.fn(),
    on: vi.fn(),
    webContents: {
      openDevTools: vi.fn()
    }
  })),
  screen: {
    getPrimaryDisplay: vi.fn().mockReturnValue({
      workArea: { x: 0, y: 0, width: 1920, height: 1080 },
      scaleFactor: 1
    }),
    getAllDisplays: vi.fn().mockReturnValue([])
  }
}))

vi.mock('../../../electron/utils', () => ({
  isDev: false
}))

describe('WindowManager', () => {
  let windowManager: WindowManager

  beforeEach(() => {
    windowManager = new WindowManager()
    vi.clearAllMocks()
  })

  afterEach(() => {
    windowManager.destroyAllWindows()
  })

  describe('createMainWindow', () => {
    it('should create main window with correct configuration', async () => {
      const window = await windowManager.createMainWindow()

      expect(BrowserWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          width: 1400,
          height: 900,
          minWidth: 1200,
          minHeight: 800,
          show: false,
          persistent: true
        })
      )

      expect(window).toBeDefined()
      expect(windowManager.getMainWindow()).toBe(window)
    })

    it('should emit window-created event', async () => {
      const eventSpy = vi.fn()
      windowManager.on('window-created', eventSpy)

      await windowManager.createMainWindow()

      expect(eventSpy).toHaveBeenCalledWith({
        id: 'main',
        window: expect.any(Object)
      })
    })
  })

  describe('createWindow', () => {
    it('should create window with custom configuration', async () => {
      const config: WindowConfig = {
        id: 'test-window',
        width: 800,
        height: 600,
        url: 'https://example.com'
      }

      const window = await windowManager.createWindow(config)

      expect(BrowserWindow).toHaveBeenCalledWith(config)
      expect(window).toBeDefined()
      expect(windowManager.getWindow('test-window')).toBe(window)
    })

    it('should throw error if window with same id already exists', async () => {
      const config: WindowConfig = {
        id: 'duplicate-window',
        width: 800,
        height: 600
      }

      await windowManager.createWindow(config)

      await expect(windowManager.createWindow(config)).rejects.toThrow(
        'Window with id "duplicate-window" already exists'
      )
    })

    it('should load URL if provided', async () => {
      const config: WindowConfig = {
        id: 'url-window',
        width: 800,
        height: 600,
        url: 'https://example.com'
      }

      const window = await windowManager.createWindow(config)
      
      expect(window.loadURL).toHaveBeenCalledWith('https://example.com')
    })
  })

  describe('getWindow', () => {
    it('should return window if exists', async () => {
      const config: WindowConfig = {
        id: 'test-window',
        width: 800,
        height: 600
      }

      const window = await windowManager.createWindow(config)
      const retrievedWindow = windowManager.getWindow('test-window')

      expect(retrievedWindow).toBe(window)
    })

    it('should return null if window does not exist', () => {
      const window = windowManager.getWindow('non-existent')
      expect(window).toBeNull()
    })
  })

  describe('showWindow', () => {
    it('should show window and return true if window exists', async () => {
      const config: WindowConfig = {
        id: 'test-window',
        width: 800,
        height: 600
      }

      const window = await windowManager.createWindow(config)
      const result = windowManager.showWindow('test-window')

      expect(result).toBe(true)
      expect(window.show).toHaveBeenCalled()
      expect(window.focus).toHaveBeenCalled()
    })

    it('should restore window if minimized', async () => {
      const config: WindowConfig = {
        id: 'test-window',
        width: 800,
        height: 600
      }

      const window = await windowManager.createWindow(config)
      window.isMinimized = vi.fn().mockReturnValue(true)

      windowManager.showWindow('test-window')

      expect(window.restore).toHaveBeenCalled()
    })

    it('should return false if window does not exist', () => {
      const result = windowManager.showWindow('non-existent')
      expect(result).toBe(false)
    })

    it('should emit window-shown event', async () => {
      const config: WindowConfig = {
        id: 'test-window',
        width: 800,
        height: 600
      }

      const eventSpy = vi.fn()
      windowManager.on('window-shown', eventSpy)

      await windowManager.createWindow(config)
      windowManager.showWindow('test-window')

      expect(eventSpy).toHaveBeenCalledWith({ id: 'test-window' })
    })
  })

  describe('hideWindow', () => {
    it('should hide window and return true if window exists', async () => {
      const config: WindowConfig = {
        id: 'test-window',
        width: 800,
        height: 600
      }

      const window = await windowManager.createWindow(config)
      const result = windowManager.hideWindow('test-window')

      expect(result).toBe(true)
      expect(window.hide).toHaveBeenCalled()
    })

    it('should return false if window does not exist', () => {
      const result = windowManager.hideWindow('non-existent')
      expect(result).toBe(false)
    })

    it('should emit window-hidden event', async () => {
      const config: WindowConfig = {
        id: 'test-window',
        width: 800,
        height: 600
      }

      const eventSpy = vi.fn()
      windowManager.on('window-hidden', eventSpy)

      await windowManager.createWindow(config)
      windowManager.hideWindow('test-window')

      expect(eventSpy).toHaveBeenCalledWith({ id: 'test-window' })
    })
  })

  describe('maximizeWindow', () => {
    it('should maximize window if not maximized', async () => {
      const config: WindowConfig = {
        id: 'test-window',
        width: 800,
        height: 600
      }

      const window = await windowManager.createWindow(config)
      window.isMaximized = vi.fn().mockReturnValue(false)

      const result = windowManager.maximizeWindow('test-window')

      expect(result).toBe(true)
      expect(window.maximize).toHaveBeenCalled()
    })

    it('should unmaximize window if already maximized', async () => {
      const config: WindowConfig = {
        id: 'test-window',
        width: 800,
        height: 600
      }

      const window = await windowManager.createWindow(config)
      window.isMaximized = vi.fn().mockReturnValue(true)

      windowManager.maximizeWindow('test-window')

      expect(window.unmaximize).toHaveBeenCalled()
    })
  })

  describe('destroyWindow', () => {
    it('should destroy window and remove from manager', async () => {
      const config: WindowConfig = {
        id: 'test-window',
        width: 800,
        height: 600
      }

      const window = await windowManager.createWindow(config)
      const result = windowManager.destroyWindow('test-window')

      expect(result).toBe(true)
      expect(window.removeAllListeners).toHaveBeenCalled()
      expect(window.destroy).toHaveBeenCalled()
      expect(windowManager.getWindow('test-window')).toBeNull()
    })

    it('should clear main window id if destroying main window', async () => {
      await windowManager.createMainWindow()
      windowManager.destroyWindow('main')

      expect(windowManager.getMainWindow()).toBeNull()
    })

    it('should emit window-destroyed event', async () => {
      const config: WindowConfig = {
        id: 'test-window',
        width: 800,
        height: 600
      }

      const eventSpy = vi.fn()
      windowManager.on('window-destroyed', eventSpy)

      await windowManager.createWindow(config)
      windowManager.destroyWindow('test-window')

      expect(eventSpy).toHaveBeenCalledWith({ id: 'test-window' })
    })
  })

  describe('getWindowState', () => {
    it('should return window state if window exists', async () => {
      const config: WindowConfig = {
        id: 'test-window',
        width: 800,
        height: 600
      }

      await windowManager.createWindow(config)
      const state = windowManager.getWindowState('test-window')

      expect(state).toEqual({
        id: 'test-window',
        isVisible: true,
        isMinimized: false,
        isMaximized: false,
        isFullScreen: false,
        bounds: { x: 0, y: 0, width: 1400, height: 900 }
      })
    })

    it('should return null if window does not exist', () => {
      const state = windowManager.getWindowState('non-existent')
      expect(state).toBeNull()
    })
  })

  describe('setWindowPosition', () => {
    it('should set window position and emit event', async () => {
      const config: WindowConfig = {
        id: 'test-window',
        width: 800,
        height: 600
      }

      const eventSpy = vi.fn()
      windowManager.on('window-moved', eventSpy)

      const window = await windowManager.createWindow(config)
      const result = windowManager.setWindowPosition('test-window', 100, 200)

      expect(result).toBe(true)
      expect(window.setPosition).toHaveBeenCalledWith(100, 200)
      expect(eventSpy).toHaveBeenCalledWith({ id: 'test-window', x: 100, y: 200 })
    })
  })

  describe('setWindowSize', () => {
    it('should set window size and emit event', async () => {
      const config: WindowConfig = {
        id: 'test-window',
        width: 800,
        height: 600
      }

      const eventSpy = vi.fn()
      windowManager.on('window-resized', eventSpy)

      const window = await windowManager.createWindow(config)
      const result = windowManager.setWindowSize('test-window', 1000, 700)

      expect(result).toBe(true)
      expect(window.setSize).toHaveBeenCalledWith(1000, 700)
      expect(eventSpy).toHaveBeenCalledWith({ id: 'test-window', width: 1000, height: 700 })
    })
  })

  describe('centerWindow', () => {
    it('should center window and emit event', async () => {
      const config: WindowConfig = {
        id: 'test-window',
        width: 800,
        height: 600
      }

      const eventSpy = vi.fn()
      windowManager.on('window-centered', eventSpy)

      const window = await windowManager.createWindow(config)
      const result = windowManager.centerWindow('test-window')

      expect(result).toBe(true)
      expect(window.center).toHaveBeenCalled()
      expect(eventSpy).toHaveBeenCalledWith({ id: 'test-window' })
    })
  })

  describe('getAllWindows', () => {
    it('should return all windows', async () => {
      const config1: WindowConfig = { id: 'window1', width: 800, height: 600 }
      const config2: WindowConfig = { id: 'window2', width: 800, height: 600 }

      const window1 = await windowManager.createWindow(config1)
      const window2 = await windowManager.createWindow(config2)

      const allWindows = windowManager.getAllWindows()

      expect(allWindows.size).toBe(2)
      expect(allWindows.get('window1')).toBe(window1)
      expect(allWindows.get('window2')).toBe(window2)
    })
  })

  describe('closeAllWindows', () => {
    it('should close all windows', async () => {
      const config1: WindowConfig = { id: 'window1', width: 800, height: 600 }
      const config2: WindowConfig = { id: 'window2', width: 800, height: 600 }

      const window1 = await windowManager.createWindow(config1)
      const window2 = await windowManager.createWindow(config2)

      windowManager.closeAllWindows()

      expect(window1.close).toHaveBeenCalled()
      expect(window2.close).toHaveBeenCalled()
    })
  })

  describe('destroyAllWindows', () => {
    it('should destroy all windows', async () => {
      const config1: WindowConfig = { id: 'window1', width: 800, height: 600 }
      const config2: WindowConfig = { id: 'window2', width: 800, height: 600 }

      await windowManager.createWindow(config1)
      await windowManager.createWindow(config2)

      windowManager.destroyAllWindows()

      expect(windowManager.getAllWindows().size).toBe(0)
    })
  })

  describe('getScreenInfo', () => {
    it('should return screen information', () => {
      const screenInfo = windowManager.getScreenInfo()

      expect(screenInfo).toEqual({
        primary: expect.objectContaining({
          workArea: { x: 0, y: 0, width: 1920, height: 1080 },
          scaleFactor: 1
        }),
        all: [],
        workArea: { x: 0, y: 0, width: 1920, height: 1080 },
        scaleFactor: 1
      })
    })
  })
})