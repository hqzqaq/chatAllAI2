/**
 * Electron主进程集成测试
 * 验证WindowManager、SessionManager和IPCHandler的基本功能
 */

import { describe, it, expect, vi } from 'vitest'

// Mock Electron modules for integration test
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
      openDevTools: vi.fn(),
      send: vi.fn()
    }
  })),
  screen: {
    getPrimaryDisplay: vi.fn().mockReturnValue({
      workArea: { x: 0, y: 0, width: 1920, height: 1080 },
      scaleFactor: 1
    }),
    getAllDisplays: vi.fn().mockReturnValue([])
  },
  session: {
    fromPartition: vi.fn().mockReturnValue({
      setUserAgent: vi.fn(),
      setPermissionRequestHandler: vi.fn(),
      setCertificateVerifyProc: vi.fn(),
      cookies: {
        get: vi.fn().mockResolvedValue([]),
        set: vi.fn().mockResolvedValue(undefined)
      },
      clearStorageData: vi.fn().mockResolvedValue(undefined)
    })
  },
  app: {
    getPath: vi.fn().mockReturnValue('/tmp/test'),
    getVersion: vi.fn().mockReturnValue('1.0.0'),
    quit: vi.fn(),
    getAppMetrics: vi.fn().mockReturnValue([])
  },
  ipcMain: {
    handle: vi.fn(),
    on: vi.fn(),
    removeHandler: vi.fn(),
    removeAllListeners: vi.fn()
  }
}))

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    promises: {
      mkdir: vi.fn().mockResolvedValue(undefined),
      writeFile: vi.fn().mockResolvedValue(undefined),
      readFile: vi.fn().mockResolvedValue(Buffer.from('test-data')),
      access: vi.fn().mockResolvedValue(undefined),
      unlink: vi.fn().mockResolvedValue(undefined)
    },
    readFileSync: vi.fn().mockReturnValue(Buffer.from('test-key')),
    writeFileSync: vi.fn()
  }
})

vi.mock('crypto', () => ({
  randomBytes: vi.fn().mockReturnValue(Buffer.from('test-random-bytes')),
  createCipher: vi.fn().mockReturnValue({
    update: vi.fn().mockReturnValue('encrypted'),
    final: vi.fn().mockReturnValue('data'),
    getAuthTag: vi.fn().mockReturnValue(Buffer.from('auth-tag'))
  }),
  createDecipher: vi.fn().mockReturnValue({
    setAuthTag: vi.fn(),
    update: vi.fn().mockReturnValue('{"providerId":"test"}'),
    final: vi.fn().mockReturnValue('')
  })
}))

vi.mock('../../../electron/utils', () => ({
  isDev: false
}))

describe('Electron Main Process Integration', () => {
  it('should import and instantiate managers without errors', async () => {
    // Test that we can import the managers
    const { WindowManager } = await import('../../../electron/managers/WindowManager')
    const { SessionManager } = await import('../../../electron/managers/SessionManager')
    const { IPCHandler } = await import('../../../electron/managers/IPCHandler')

    expect(WindowManager).toBeDefined()
    expect(SessionManager).toBeDefined()
    expect(IPCHandler).toBeDefined()

    // Test that we can create instances
    const windowManager = new WindowManager()
    const sessionManager = new SessionManager()
    const ipcHandler = new IPCHandler(windowManager, sessionManager)

    expect(windowManager).toBeInstanceOf(WindowManager)
    expect(sessionManager).toBeInstanceOf(SessionManager)
    expect(ipcHandler).toBeInstanceOf(IPCHandler)

    // Cleanup
    ipcHandler.destroy()
    await sessionManager.destroy()
    windowManager.destroyAllWindows()
  })

  it('should create main window successfully', async () => {
    const { WindowManager } = await import('../../../electron/managers/WindowManager')
    const windowManager = new WindowManager()

    const mainWindow = await windowManager.createMainWindow()
    
    expect(mainWindow).toBeDefined()
    expect(windowManager.getMainWindow()).toBe(mainWindow)

    // Cleanup
    windowManager.destroyAllWindows()
  })

  it('should create provider session successfully', async () => {
    const { SessionManager } = await import('../../../electron/managers/SessionManager')
    const sessionManager = new SessionManager()

    const session = await sessionManager.createProviderSession('chatgpt')
    
    expect(session).toBeDefined()
    expect(sessionManager.getElectronSession('chatgpt')).toBe(session)

    // Cleanup
    await sessionManager.destroy()
  })

  it('should handle basic IPC operations', async () => {
    const { WindowManager } = await import('../../../electron/managers/WindowManager')
    const { SessionManager } = await import('../../../electron/managers/SessionManager')
    const { IPCHandler } = await import('../../../electron/managers/IPCHandler')

    const windowManager = new WindowManager()
    const sessionManager = new SessionManager()
    const ipcHandler = new IPCHandler(windowManager, sessionManager)

    // Test that IPC handler has basic methods
    expect(typeof ipcHandler.sendToRenderer).toBe('function')
    expect(typeof ipcHandler.broadcast).toBe('function')
    expect(typeof ipcHandler.destroy).toBe('function')

    // Cleanup
    ipcHandler.destroy()
    await sessionManager.destroy()
    windowManager.destroyAllWindows()
  })

  it('should verify all required types are exported', async () => {
    // Test type imports
    const ipcTypes = await import('../../../src/types/ipc')
    const eventTypes = await import('../../../src/types/events')
    const errorTypes = await import('../../../src/types/errors')

    expect(ipcTypes.IPCChannel).toBeDefined()
    expect(eventTypes.EventType).toBeDefined()
    expect(errorTypes.ErrorType).toBeDefined()
  })
})