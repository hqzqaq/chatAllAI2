import { app, BrowserWindow } from 'electron'
import { WindowManager } from './managers/WindowManager'
import { SessionManager } from './managers/SessionManager'
import { IPCHandler } from './managers/IPCHandler'

/**
 * 配置Electron命令行开关
 * 解决Gemini登录的Cookie和第三方Cookie拦截问题
 */
function configureCommandLineSwitches(): void {
  console.log('[Main] Configuring command line switches for Gemini compatibility')

  // 禁用站点隔离试验 - 减少跨域限制
  app.commandLine.appendSwitch('disable-site-isolation-trials')

  // 禁用所有影响Cookie的特性 - 确保Google登录流程正常
  // 将所有需要禁用的特性合并到一个逗号分隔的列表中
  const disabledFeatures = [
    'ThirdPartyCookieBlocking', // 禁用第三方Cookie拦截
    'SameSiteByDefaultCookies', // 禁用默认SameSite策略
    'CookiesWithoutSameSiteMustBeSecure', // 禁用SameSite=None必须Secure的限制
    'PartitionedCookies', // 禁用分区Cookie
    'StorageAccessAPI', // 禁用存储访问API限制
    'BlockInsecurePrivateNetworkRequests', // 禁用不安全私有网络请求拦截
    'InterestCohort', // 禁用FLoC
    'PrivacySandboxSettings', // 禁用隐私沙盒设置
    'TrackingProtection', // 禁用跟踪保护
    'CookieDeprecationFacilitatedTesting' // 禁用Cookie弃用测试
  ]
  app.commandLine.appendSwitch('disable-features', disabledFeatures.join(','))

  // 从Blink引擎层面禁用SameSite策略
  app.commandLine.appendSwitch('disable-blink-features', 'SameSiteByDefaultCookies')

  // 允许跨域Cookie - 解决Google登录时的Cookie设置问题
  app.commandLine.appendSwitch('disable-web-security')

  // 允许不安全的本地主机
  app.commandLine.appendSwitch('allow-insecure-localhost')

  // 禁用同源策略限制
  app.commandLine.appendSwitch('disable-site-isolation-for-passwords')

  console.log('[Main] Command line switches configured:', {
    disabledFeatures,
    disableBlinkFeatures: 'SameSiteByDefaultCookies'
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

/**
 * 初始化应用
 */
async function initializeApp(): Promise<void> {
  try {
    // 创建管理器实例
    windowManager = new WindowManager()
    sessionManager = new SessionManager()
    ipcHandler = new IPCHandler(windowManager, sessionManager)

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
