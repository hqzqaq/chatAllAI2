/**
 * 会话管理器
 * 负责管理AI网站的登录状态和会话数据
 */

import { session, Session, Cookie } from 'electron'
import { promises as fs } from 'fs'
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
      const existingKey = require('fs').readFileSync(keyPath)
      return existingKey
    } catch {
      // 生成新密钥
      const newKey = crypto.randomBytes(this.encryptionConfig.keyLength)
      require('fs').writeFileSync(keyPath, newKey)
      return newKey
    }
  }

  /**
   * 创建AI提供商会话
   */
  async createProviderSession(providerId: string): Promise<Session> {
    if (this.electronSessions.has(providerId)) {
      return this.electronSessions.get(providerId)!
    }

    // 创建独立的会话分区
    const partition = `persist:${providerId}`
    const electronSession = session.fromPartition(partition)

    // 配置会话
    await this.configureSession(electronSession, providerId)

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
   */
  private async configureSession(electronSession: Session, providerId: string): Promise<void> {
    // 设置用户代理
    const userAgent = this.getUserAgent(providerId)
    if (userAgent) {
      electronSession.setUserAgent(userAgent)
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
   * 获取用户代理字符串
   */
  private getUserAgent(providerId: string): string | undefined {
    const userAgents: Record<string, string> = {
      kimi: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      grok: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      deepseek: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      doubao: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      qwen: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      copilot: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }

    return userAgents[providerId]
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
    for (const cookie of sessionData.cookies) {
      try {
        await electronSession.cookies.set({
          url: cookie.domain?.startsWith('.') ? `https://${cookie.domain.slice(1)}` : `https://${cookie.domain}`,
          name: cookie.name,
          value: cookie.value,
          domain: cookie.domain,
          path: cookie.path,
          secure: cookie.secure,
          httpOnly: cookie.httpOnly,
          expirationDate: cookie.expirationDate
        })
      } catch (error) {
        console.warn(`Failed to restore cookie ${cookie.name}:`, error)
      }
    }

    // 更新会话状态为活跃，并更新最后访问时间
    sessionData.isActive = true
    sessionData.lastAccess = new Date()

    // 更新内存中的会话数据
    this.sessions.set(providerId, sessionData)
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

    for (const [providerId, sessionData] of Array.from(this.sessions.entries())) {
      if (this.isSessionExpired(providerId, maxAge)) {
        await this.clearSession(providerId)
        expiredSessions.push(providerId)
      }
    }

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

    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
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
