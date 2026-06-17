/**
 * 会话管理器
 * 负责管理AI网站的登录状态和会话数据
 */

import { session, Session, Cookie } from 'electron'
import { ProviderCookieInput, ProviderImportCookiesResponse } from '../../src/types/ipc'
import { promises as fs } from 'fs'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import { EventEmitter } from 'events'
import * as crypto from 'crypto'

/**
 * 会话数据接口
 */
export interface SessionData {
  providerId: string
  cookies: Cookie[]
  localStorage: Record<string, string>
  sessionStorage: Record<string, string>
  userAgent?: string
  lastAccess: Date
  isActive: boolean
  userId?: string
  sessionId?: string
}

/**
 * 加密配置接口
 */
interface EncryptionConfig {
  algorithm: string
  keyLength: number
  ivLength: number
}

/**
 * 会话管理器类
 */
export class SessionManager extends EventEmitter {
  private sessions: Map<string, SessionData> = new Map()

  private electronSessions: Map<string, Session> = new Map()

  private dataPath: string

  private encryptionKey: Buffer

  private encryptionConfig: EncryptionConfig = {
    algorithm: 'aes-256-cbc',
    keyLength: 32,
    ivLength: 16
  }

  constructor() {
    super()
    // 为开发环境和生产环境使用不同的会话存储路径
    const isDev = process.env.NODE_ENV === 'development'
    const basePath = isDev
      ? join(app.getPath('userData'), 'dev-sessions')
      : join(app.getPath('userData'), 'sessions')
    this.dataPath = basePath
    this.encryptionKey = this.generateEncryptionKey()
    this.initializeDataDirectory()
  }

  /**
   * 初始化数据目录
   */
  private async initializeDataDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.dataPath, { recursive: true })
    } catch (error) {
      console.error('Failed to create sessions directory:', error)
    }
  }

  /**
   * 生成加密密钥
   */
  private generateEncryptionKey(): Buffer {
    // 为开发环境和生产环境使用不同的密钥文件
    const isDev = process.env.NODE_ENV === 'development'
    const keyFileName = isDev ? 'dev-session.key' : 'session.key'
    const keyPath = join(app.getPath('userData'), keyFileName)

    try {
      // 尝试读取现有密钥
      const existingKey = readFileSync(keyPath)
      return existingKey
    } catch {
      // 生成新密钥
      const newKey = crypto.randomBytes(this.encryptionConfig.keyLength)
      writeFileSync(keyPath, newKey)
      return newKey
    }
  }

  /**
   * 创建AI提供商会话
   */
  async createProviderSession(providerId: string, proxyRules?: string): Promise<Session> {
    if (this.electronSessions.has(providerId)) {
      return this.electronSessions.get(providerId)!
    }

    // 创建独立的会话分区
    const partition = `persist:${providerId}`
    const electronSession = session.fromPartition(partition)

    // 配置会话
    await this.configureSession(electronSession, providerId)

    // 如果提供了代理配置，立即设置
    if (proxyRules) {
      console.log(`[${providerId}] Setting proxy: ${proxyRules}`)
      await electronSession.setProxy({ proxyRules })
      console.log(`[${providerId}] Proxy set successfully`)
    }

    // 存储会话
    this.electronSessions.set(providerId, electronSession)

    // 检查是否已有会话文件存在
    const hasExistingSession = await this.hasSession(providerId)
    let sessionData: SessionData

    if (hasExistingSession) {
      // 加载现有会话数据
      const loadedSession = await this.loadSession(providerId)
      if (loadedSession) {
        sessionData = loadedSession
        // 更新最后访问时间并标记为活跃
        sessionData.lastAccess = new Date()
        sessionData.isActive = true // 有会话文件存在，说明之前登录过
      } else {
        // 如果加载失败，创建新的会话数据
        sessionData = {
          providerId,
          cookies: [],
          localStorage: {},
          sessionStorage: {},
          lastAccess: new Date(),
          isActive: false
        }
      }
    } else {
      // 创建新的会话数据
      sessionData = {
        providerId,
        cookies: [],
        localStorage: {},
        sessionStorage: {},
        lastAccess: new Date(),
        isActive: false
      }
    }

    // 确保会话数据正确设置到内存中
    this.sessions.set(providerId, sessionData)

    this.emit('session-created', { providerId })
    return electronSession
  }

  /**
   * 配置会话
   * 针对指定的provider添加特殊的请求头拦截和Cookie处理
   */
  private async configureSession(electronSession: Session, providerId: string): Promise<void> {
    // 设置用户代理
    const userAgent = this.getUserAgent(providerId)
    if (userAgent) {
      electronSession.setUserAgent(userAgent)
      console.log(`[SessionManager] Set User-Agent for ${providerId}: ${userAgent}`)
    }

    // 针对Gemini的特殊配置
    if (providerId === 'gemini') {
      this.configureGeminiSession(electronSession)
    }

    // 设置权限处理
    electronSession.setPermissionRequestHandler((webContents, permission, callback) => {
      // 允许必要的权限
      const allowedPermissions = ['notifications', 'clipboard-read', 'clipboard-write']
      callback(allowedPermissions.includes(permission))
    })

    // 设置证书验证
    electronSession.setCertificateVerifyProc((request, callback) => {
      // 在生产环境中应该进行适当的证书验证
      callback(0) // 0 表示信任证书
    })

    // 设置代理（如果需要）
    // await electronSession.setProxy({ proxyRules: 'direct://' })
  }

  /**
   * 配置 Gemini 会话
   * 仅保留持久化 session、基础 UA 和必要权限，
   * 登录流程改为系统浏览器登录后注入 Cookie，不再依赖 UA/Header 伪装绕过风控。
   */
  private configureGeminiSession(electronSession: Session): void {
    console.log('[SessionManager] Configuring Gemini session for cookie-injected login')

    // User-Agent 中移除 Electron 标识，降低第一道检测触发概率
    const userAgent = this.getUserAgent('gemini')
    if (userAgent) {
      electronSession.setUserAgent(userAgent)
    }

    console.log('[SessionManager] Gemini session configured successfully')
  }

  /**
   * 获取用户代理字符串
   * 针对Gemini使用更完善的UA伪装，包含Windows Chrome的完整标识
   */
  private getUserAgent(providerId: string): string | undefined {
    const macChromeUa = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
      + 'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36'
    const winChromeUa = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
      + 'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36'

    const userAgents: Record<string, string> = {
      kimi: macChromeUa,
      grok: macChromeUa,
      deepseek: macChromeUa,
      doubao: macChromeUa,
      qwen: macChromeUa,
      copilot: macChromeUa,
      // Gemini使用Windows Chrome UA，更不容易被识别为Electron
      gemini: winChromeUa
    }

    return userAgents[providerId]
  }

  /**
   * 获取Sec-Ch-Ua头信息
   * 用于完善浏览器伪装
   */
  private getSecChUa(): string {
    return '"Chromium";v="134", "Not:A-Brand";v="24", "Google Chrome";v="134"'
  }

  /**
   * 保存会话数据
   */
  async saveSession(providerId: string): Promise<boolean> {
    try {
      console.log(`Starting to save session for ${providerId}`)
      let electronSession = this.electronSessions.get(providerId)

      // 如果会话不存在，尝试创建会话
      if (!electronSession) {
        console.log(`Creating new session for ${providerId}`)
        electronSession = await this.createProviderSession(providerId)
      }

      // 获取cookies
      const cookies = await electronSession.cookies.get({})
      console.log(`Retrieved ${cookies.length} cookies for ${providerId}`)

      // 获取当前会话数据
      const sessionData = this.sessions.get(providerId) || {
        providerId,
        cookies: [],
        localStorage: {},
        sessionStorage: {},
        lastAccess: new Date(),
        isActive: false
      }

      // 更新会话数据
      sessionData.cookies = cookies
      sessionData.lastAccess = new Date()
      sessionData.isActive = true

      // 加密并保存到文件
      console.log(`Encrypting session data for ${providerId}`)
      const encryptedData = this.encryptData(sessionData)
      const filePath = join(this.dataPath, `${providerId}.session`)
      console.log(`Writing session file to: ${filePath}, size: ${encryptedData.length} bytes`)
      await fs.writeFile(filePath, encryptedData)

      // 更新内存中的会话数据
      this.sessions.set(providerId, sessionData)

      console.log(`Successfully saved session for ${providerId}`)
      this.emit('session-saved', { providerId })
      return true
    } catch (error) {
      console.error(`Failed to save session for ${providerId}:`, error)
      this.emit('session-save-error', { providerId, error })
      return false
    }
  }

  /**
   * 加载会话数据
   */
  async loadSession(providerId: string): Promise<SessionData | null> {
    try {
      const filePath = join(this.dataPath, `${providerId}.session`)
      console.log(`Loading session for ${providerId}, file path: ${filePath}`)

      // 检查文件是否存在
      try {
        await fs.access(filePath)
        console.log(`Session file exists for ${providerId}`)
      } catch {
        console.log(`Session file does not exist for ${providerId}`)
        return null // 文件不存在
      }

      // 读取并解密数据
      const encryptedData = await fs.readFile(filePath)
      console.log(`Read encrypted data for ${providerId}, size: ${encryptedData.length} bytes`)

      try {
        const sessionData = this.decryptData(encryptedData) as SessionData
        console.log(`Successfully decrypted session data for ${providerId}`)

        // 验证数据完整性
        if (!sessionData || sessionData.providerId !== providerId) {
          console.error(`Invalid session data for ${providerId}`)
          throw new Error('Invalid session data')
        }

        // 恢复会话
        await this.restoreSession(providerId, sessionData)

        this.emit('session-loaded', { providerId })
        return sessionData
      } catch (decryptError) {
        console.error(`Failed to decrypt session data for ${providerId}:`, decryptError)
        throw decryptError
      }
    } catch (error) {
      console.error(`Failed to load session for ${providerId}:`, error)
      this.emit('session-load-error', { providerId, error })
      return null
    }
  }

  /**
   * 恢复会话
   */
  private async restoreSession(providerId: string, sessionData: SessionData): Promise<void> {
    // 获取或创建Electron会话
    let electronSession = this.electronSessions.get(providerId)
    if (!electronSession) {
      electronSession = await this.createProviderSession(providerId)
    }

    // 恢复cookies
    sessionData.cookies.forEach((cookie) => {
      electronSession!.cookies.set({
        url: cookie.domain?.startsWith('.') ? `https://${cookie.domain.slice(1)}` : `https://${cookie.domain}`,
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path,
        secure: cookie.secure,
        httpOnly: cookie.httpOnly,
        expirationDate: cookie.expirationDate
      }).catch((error) => {
        console.warn(`Failed to restore cookie ${cookie.name}:`, error)
      })
    })

    // 创建新的会话数据对象，避免修改参数
    const updatedSessionData: SessionData = {
      ...sessionData,
      isActive: true,
      lastAccess: new Date()
    }

    // 更新内存中的会话数据
    this.sessions.set(providerId, updatedSessionData)
  }

  /**
   * 导入 Cookie 到指定 provider 的会话中
   * 用于 provider 等需要通过系统浏览器登录后再注入登录态的场景
   */
  async importCookies(
    providerId: string,
    cookies: ProviderCookieInput[]
  ): Promise<ProviderImportCookiesResponse> {
    try {
      console.log(`[SessionManager] Importing ${cookies.length} cookies for ${providerId}`)

      const electronSession = await this.createProviderSession(providerId)
      const failures: string[] = []

      // 先清空该会话中已有的所有 Cookie，避免旧登录态与新 Cookie 冲突
      const existingCookies = await electronSession.cookies.get({})
      await Promise.all(
        existingCookies.map((cookie) => electronSession.cookies.remove(
          cookie.domain?.startsWith('.') ? `https://${cookie.domain.slice(1)}` : `https://${cookie.domain}`,
          cookie.name
        ))
      )
      console.log(`[SessionManager] Cleared ${existingCookies.length} existing cookies for ${providerId}`)

      const results = await Promise.all(
        cookies.map(async(cookie) => {
          if (!cookie.name || !cookie.value) {
            console.warn(`[SessionManager] Skipping invalid cookie for ${providerId}:`, cookie)
            return false
          }

          const domain = cookie.domain || '.google.com'
          const path = cookie.path || '/'
          const cookieUrl = domain.startsWith('.')
            ? `https://${domain.slice(1)}`
            : `https://${domain}`

          // 优先保留浏览器插件导出的 sameSite；未指定时使用 unspecified，由 Chromium 按默认策略处理
          let sameSite: 'unspecified' | 'no_restriction' | 'lax' | 'strict' = 'unspecified'
          if (cookie.sameSite === 'no_restriction') {
            sameSite = 'no_restriction'
          } else if (cookie.sameSite === 'lax') {
            sameSite = 'lax'
          } else if (cookie.sameSite === 'strict') {
            sameSite = 'strict'
          }

          try {
            await electronSession.cookies.set({
              url: cookieUrl,
              name: cookie.name,
              value: cookie.value,
              domain,
              path,
              secure: cookie.secure ?? true,
              httpOnly: cookie.httpOnly ?? true,
              expirationDate: cookie.expirationDate,
              sameSite
            })
            return true
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            console.warn(`[SessionManager] Failed to import cookie ${cookie.name}:`, errorMessage)
            failures.push(`${cookie.name}: ${errorMessage}`)
            return false
          }
        })
      )

      const imported = results.filter(Boolean).length

      // 更新会话状态为活跃
      const sessionData = this.sessions.get(providerId)
      if (sessionData) {
        sessionData.isActive = true
        sessionData.lastAccess = new Date()
      }

      // 持久化到磁盘
      await this.saveSession(providerId)

      // 验证实际写入的 Cookie
      const storedCookies = await electronSession.cookies.get({})
      const storedGoogleCookies = storedCookies.filter(
        (cookie) => cookie.domain?.includes('google.com')
      )
      console.log(
        `[SessionManager] Imported ${imported}/${cookies.length} cookies for ${providerId}. `
        + `Total stored cookies: ${storedCookies.length}, Google domains: ${storedGoogleCookies.length}`
      )

      if (imported === 0) {
        return {
          success: false,
          imported: 0,
          error: `没有 Cookie 成功导入。${failures.slice(0, 3).join('; ')}`
        }
      }

      return { success: true, imported }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[SessionManager] Failed to import cookies for ${providerId}:`, errorMessage)
      return { success: false, imported: 0, error: errorMessage }
    }
  }

  /**
   * 清除会话数据
   */
  async clearSession(providerId: string): Promise<boolean> {
    try {
      const electronSession = this.electronSessions.get(providerId)
      if (electronSession) {
        // 清除cookies
        await electronSession.clearStorageData()
      }

      // 删除会话文件
      const filePath = join(this.dataPath, `${providerId}.session`)
      try {
        await fs.unlink(filePath)
      } catch {
        // 文件可能不存在，忽略错误
      }

      // 从内存中移除
      this.sessions.delete(providerId)
      this.electronSessions.delete(providerId)

      this.emit('session-cleared', { providerId })
      return true
    } catch (error) {
      console.error(`Failed to clear session for ${providerId}:`, error)
      this.emit('session-clear-error', { providerId, error })
      return false
    }
  }

  /**
   * 检查会话是否存在
   */
  async hasSession(providerId: string): Promise<boolean> {
    const filePath = join(this.dataPath, `${providerId}.session`)
    try {
      await fs.access(filePath)
      return true
    } catch {
      return false
    }
  }

  /**
   * 检查会话是否活跃
   */
  async isSessionActive(providerId: string): Promise<boolean> {
    const sessionData = this.sessions.get(providerId)

    // 如果内存中有活跃状态，直接返回
    if (sessionData?.isActive) {
      return true
    }

    // 检查会话文件是否存在
    const hasSessionFile = await this.hasSession(providerId)
    if (!hasSessionFile) {
      return false
    }

    // 如果会话文件存在但内存中没有数据，尝试加载会话
    if (!sessionData) {
      const loadedSession = await this.loadSession(providerId)
      if (loadedSession) {
        // 检查会话是否过期
        return !this.isSessionExpired(providerId)
      }
      return false
    }

    // 检查会话是否过期
    return !this.isSessionExpired(providerId)
  }

  /**
   * 获取会话数据
   */
  getSessionData(providerId: string): SessionData | null {
    return this.sessions.get(providerId) || null
  }

  /**
   * 获取Electron会话
   */
  getElectronSession(providerId: string): Session | null {
    return this.electronSessions.get(providerId) || null
  }

  /**
   * 获取会话（兼容性方法，与getElectronSession相同）
   */
  getSession(providerId: string): Session | null {
    return this.getElectronSession(providerId)
  }

  /**
   * 获取所有会话ID
   */
  getAllSessionIds(): string[] {
    return Array.from(this.sessions.keys())
  }

  /**
   * 获取活跃会话ID
   */
  getActiveSessionIds(): string[] {
    return Array.from(this.sessions.entries())
      .filter(([, data]) => data.isActive)
      .map(([id]) => id)
  }

  /**
   * 设置会话活跃状态
   */
  setSessionActive(providerId: string, isActive: boolean): void {
    const sessionData = this.sessions.get(providerId)
    if (sessionData) {
      sessionData.isActive = isActive
      sessionData.lastAccess = new Date()
      this.emit('session-status-changed', { providerId, isActive })
    }
  }

  /**
   * 检查会话是否过期
   */
  isSessionExpired(providerId: string, maxAge: number = 24 * 60 * 60 * 1000): boolean {
    const sessionData = this.sessions.get(providerId)
    if (!sessionData) return true

    const now = new Date().getTime()
    const lastAccess = sessionData.lastAccess.getTime()
    return (now - lastAccess) > maxAge
  }

  /**
   * 清理过期会话
   */
  async cleanupExpiredSessions(maxAge: number = 24 * 60 * 60 * 1000): Promise<string[]> {
    const expiredSessions: string[] = []
    const entries = Array.from(this.sessions.entries())

    await Promise.all(
      entries.map(async([providerId]) => {
        if (this.isSessionExpired(providerId, maxAge)) {
          await this.clearSession(providerId)
          expiredSessions.push(providerId)
        }
      })
    )

    if (expiredSessions.length > 0) {
      this.emit('sessions-cleaned', { expiredSessions })
    }

    return expiredSessions
  }

  /**
   * 加密数据
   */
  private encryptData(data: any): Buffer {
    const iv = crypto.randomBytes(this.encryptionConfig.ivLength)
    const cipher = crypto.createCipheriv(this.encryptionConfig.algorithm, this.encryptionKey, iv)

    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex')
    encrypted += cipher.final('hex')

    // 组合IV和加密数据
    return Buffer.concat([iv, Buffer.from(encrypted, 'hex')])
  }

  /**
   * 解密数据
   */
  private decryptData(encryptedBuffer: Buffer): any {
    const iv = encryptedBuffer.slice(0, this.encryptionConfig.ivLength)
    const encrypted = encryptedBuffer.slice(this.encryptionConfig.ivLength)

    const decipher = crypto.createDecipheriv(this.encryptionConfig.algorithm, this.encryptionKey, iv)

    let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return JSON.parse(decrypted)
  }

  /**
   * 销毁会话管理器
   */
  async destroy(): Promise<void> {
    // 保存所有活跃会话
    const savePromises = Array.from(this.sessions.keys()).map((providerId) => this.saveSession(providerId))

    await Promise.allSettled(savePromises)

    // 清理内存
    this.sessions.clear()
    this.electronSessions.clear()

    // 移除所有监听器
    this.removeAllListeners()

    this.emit('session-manager-destroyed')
  }
}
