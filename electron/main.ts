import { app, BrowserWindow } from 'electron'
import { WindowManager } from './managers/WindowManager'
import { SessionManager } from './managers/SessionManager'
import { IPCHandler } from './managers/IPCHandler'
import { WebViewManager } from './managers/WebViewManager'

/**
 * 配置Electron命令行开关
 * Gemini 登录改为系统浏览器登录后注入 Cookie，
 * 因此只保留对第三方 Cookie 兼容性的最小开关，移除不必要的安全降级。
 */
function configureCommandLineSwitches(): void {
  console.log('[Main] Configuring command line switches for Gemini cookie compatibility')

  // 放宽部分 Cookie 策略，便于注入后的 Google 会话 Cookie 在 gemini.google.com 生效
  const disabledFeatures = [
    'ThirdPartyCookieBlocking', // 禁用第三方Cookie拦截
    'SameSiteByDefaultCookies', // 禁用默认SameSite策略
    'CookiesWithoutSameSiteMustBeSecure' // 禁用SameSite=None必须Secure的限制
  ]
  app.commandLine.appendSwitch('disable-features', disabledFeatures.join(','))

  console.log('[Main] Command line switches configured:', {
    disabledFeatures
  })
}

// 在应用ready之前配置命令行开关
configureCommandLineSwitches()

/**
 * 应用管理器实例
 */
let windowManager: WindowManager | null = null
let sessionManager: SessionManager | null = null
let ipcHandler: IPCHandler | null = null
let webViewManager: WebViewManager | null = null

/**
 * 初始化应用
 */
async function initializeApp(): Promise<void> {
  try {
    // 创建管理器实例
    windowManager = new WindowManager()
    sessionManager = new SessionManager()
    webViewManager = new WebViewManager(windowManager, sessionManager)
    ipcHandler = new IPCHandler(windowManager, sessionManager, webViewManager)

    // 创建主窗口
    await windowManager.createMainWindow()

    // 设置事件监听
    setupEventListeners()

    console.log('Application initialized successfully')
  } catch (error) {
    console.error('Failed to initialize application:', error)
    app.quit()
  }
}

/**
 * 设置事件监听器
 */
function setupEventListeners(): void {
  if (!windowManager || !sessionManager || !ipcHandler) return

  // 窗口管理器事件
  windowManager.on('window-created', ({ id }) => {
    console.log(`Window created: ${id}`)
  })

  windowManager.on('window-destroyed', ({ id }) => {
    console.log(`Window destroyed: ${id}`)
  })

  // 会话管理器事件
  sessionManager.on('session-created', ({ providerId }) => {
    console.log(`Session created for provider: ${providerId}`)
  })

  sessionManager.on('session-saved', ({ providerId }) => {
    console.log(`Session saved for provider: ${providerId}`)
  })

  sessionManager.on('session-loaded', ({ providerId }) => {
    console.log(`Session loaded for provider: ${providerId}`)
  })

  // IPC处理器事件
  ipcHandler.on('error-reported', (error) => {
    console.error('Error reported from renderer:', error)
  })

  ipcHandler.on('message-received', ({ messageId, providerId }) => {
    console.log(`Message received: ${messageId} from ${providerId}`)
  })
}

/**
 * 应用准备就绪时初始化
 */
app.whenReady().then(() => {
  initializeApp()
  app.on('activate', async() => {
    // 在 macOS 上，当点击 dock 图标并且没有其他窗口打开时，
    // 通常在应用程序中重新创建一个窗口。
    if (BrowserWindow.getAllWindows().length === 0) {
      if (windowManager) {
        await windowManager.createMainWindow()
      }
    }
  })
})

/**
 * 当所有窗口都被关闭时退出应用
 */
app.on('window-all-closed', () => {
  // 在 macOS 上，除非用户用 Cmd + Q 确定地退出，
  // 否则绝大部分应用及其菜单栏会保持激活。
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

/**
 * 应用即将退出时的清理工作
 */
app.on('before-quit', async() => {
  console.log('Application is quitting, performing cleanup...')

  try {
    // 保存所有会话
    if (sessionManager) {
      await sessionManager.destroy()
    }

    // 销毁IPC处理器
    if (ipcHandler) {
      ipcHandler.destroy()
    }

    // 销毁WebView管理器
    if (webViewManager) {
      webViewManager.destroyAll()
    }

    // 销毁所有窗口
    if (windowManager) {
      windowManager.destroyAllWindows()
    }

    console.log('Cleanup completed')
  } catch (error) {
    console.error('Error during cleanup:', error)
  }
})

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
  app.quit()
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
  app.quit()
})
