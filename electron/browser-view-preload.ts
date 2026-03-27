/**
 * BrowserView Preload Script
 * This script is injected into the BrowserView.
 * It exposes a secure API for the guest page to communicate with the main process.
 *
 * 针对Gemini登录问题的特殊处理：
 * 1. 隐藏navigator.webdriver标志
 * 2. 模拟正常浏览器环境
 * 3. 覆盖Permissions-Policy相关API
 */
import { contextBridge, ipcRenderer } from 'electron'

console.log('[BrowserView Preload] Script loaded.')

// 检测是否在Gemini或Google域名
const isGoogleDomain = () => {
  const { hostname } = window.location
  return hostname.includes('google.com') || hostname.includes('googleusercontent.com')
}

// 针对Google域名的特殊处理
if (isGoogleDomain()) {
  console.log('[BrowserView Preload] Detected Google domain, applying security bypasses')

  // 1. 隐藏navigator.webdriver
  Object.defineProperty(navigator, 'webdriver', {
    get: () => false,
    configurable: true,
    enumerable: true
  })

  // 2. 模拟plugins（正常浏览器有插件）
  Object.defineProperty(navigator, 'plugins', {
    get: () => [
      { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
      { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
      { name: 'Native Client', filename: 'internal-nacl-plugin' }
    ],
    configurable: true,
    enumerable: true
  })

  // 3. 模拟languages
  Object.defineProperty(navigator, 'languages', {
    get: () => ['zh-CN', 'zh', 'en-US', 'en'],
    configurable: true,
    enumerable: true
  })

  // 4. 覆盖Notification.permission为default（避免被检测为自动化）
  try {
    const originalNotification = window.Notification
    Object.defineProperty(window, 'Notification', {
      get: () => class extends originalNotification {
        static get permission() {
          return 'default'
        }
      },
      configurable: true
    })
  } catch (e) {
    console.warn('[BrowserView Preload] Failed to override Notification:', e)
  }

  // 5. 修改chrome对象，使其更像真实Chrome
  if (!window.chrome) {
    // @ts-ignore
    window.chrome = {}
  }
  // @ts-ignore
  if (!window.chrome.runtime) {
    // @ts-ignore
    window.chrome.runtime = {
      // @ts-ignore
      OnInstalledReason: {
        CHROME_UPDATE: 'chrome_update', EXTENSION_UPDATE: 'extension_update', INSTALL: 'install', SHARED_MODULE_UPDATE: 'shared_module_update'
      },
      // @ts-ignore
      OnRestartRequiredReason: { APP_UPDATE: 'app_update', OS_UPDATE: 'os_update', PERIODIC: 'periodic' },
      // @ts-ignore
      PlatformArch: {
        ARM: 'arm', ARM64: 'arm64', MIPS: 'mips', MIPS64: 'mips64', X86_32: 'x86-32', X86_64: 'x86-64'
      },
      // @ts-ignore
      PlatformNaclArch: {
        ARM: 'arm', MIPS: 'mips', MIPS64: 'mips64', MIPS64EL: 'mips64el', MIPSEL: 'mipsel', X86_32: 'x86-32', X86_64: 'x86-64'
      },
      // @ts-ignore
      PlatformOs: {
        ANDROID: 'android', CROS: 'cros', LINUX: 'linux', MAC: 'mac', OPENBSD: 'openbsd', WIN: 'win'
      },
      // @ts-ignore
      RequestUpdateCheckStatus: { NO_UPDATE: 'no_update', THROTTLED: 'throttled', UPDATE_AVAILABLE: 'update_available' }
    }
  }

  // 6. 覆盖Permissions-Policy的客户端API
  // 这可以处理ch-ua-form-factors相关的错误
  try {
    if (document.featurePolicy) {
      const originalAllowsFeature = document.featurePolicy.allowsFeature
      document.featurePolicy.allowsFeature = function(feature: string, origin?: string) {
        // 对于ch-ua-form-factors返回false，避免错误
        if (feature === 'ch-ua-form-factors') {
          return false
        }
        return originalAllowsFeature.call(this, feature, origin)
      }
    }
  } catch (e) {
    console.warn('[BrowserView Preload] Failed to override featurePolicy:', e)
  }

  // 7. 修改window.outerWidth/outerHeight，模拟真实窗口
  try {
    const screenWidth = window.screen.width
    const screenHeight = window.screen.height
    Object.defineProperty(window, 'outerWidth', {
      get: () => screenWidth,
      configurable: true
    })
    Object.defineProperty(window, 'outerHeight', {
      get: () => screenHeight,
      configurable: true
    })
  } catch (e) {
    console.warn('[BrowserView Preload] Failed to override window dimensions:', e)
  }

  // 8. 移除Electron特有的全局变量
  // @ts-ignore
  delete window.ELECTRON_DISABLE_SECURITY_WARNINGS
  // @ts-ignore
  delete window.ELECTRON_ENABLE_SECURITY_WARNINGS

  console.log('[BrowserView Preload] Security bypasses applied successfully')
}

contextBridge.exposeInMainWorld('__BROWSERVIEW_API__', {
  /**
   * Sends a message to the main process.
   * @param channel The IPC channel to send the message on.
   * @param data The data to send.
   */
  sendToHost: (channel: string, data: any) => {
    ipcRenderer.send(channel, data)
  }
})
