/**
 * SessionManager 单元测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { promises as fs } from 'fs'
import { SessionManager, SessionData } from '../../../electron/managers/SessionManager'

// Mock Electron modules
vi.mock('electron', () => ({
  session: {
    fromPartition: vi.fn().mockReturnValue({
      setUserAgent: vi.fn(),
      setPermissionRequestHandler: vi.fn(),
      setCertificateVerifyProc: vi.fn(),
      cookies: {
        get: vi.fn().mockResolvedValue([
          {
            name: 'test-cookie',
            value: 'test-value',
            domain: 'example.com',
            path: '/',
            secure: true,
            httpOnly: false
          }
        ]),
        set: vi.fn().mockResolvedValue(undefined)
      },
      clearStorageData: vi.fn().mockResolvedValue(undefined)
    })
  },
  app: {
    getPath: vi.fn().mockReturnValue('/mock/user/data')
  }
}))

// Mock Node.js modules
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    promises: {
      mkdir: vi.fn().mockResolvedValue(undefined),
      writeFile: vi.fn().mockResolvedValue(undefined),
      readFile: vi.fn().mockResolvedValue(Buffer.from('encrypted-data')),
      access: vi.fn().mockResolvedValue(undefined),
      unlink: vi.fn().mockResolvedValue(undefined)
    },
    readFileSync: vi.fn().mockReturnValue(Buffer.from('mock-key')),
    writeFileSync: vi.fn()
  }
})

vi.mock('crypto', () => ({
  randomBytes: vi.fn().mockReturnValue(Buffer.from('mock-random-bytes')),
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

describe('SessionManager', () => {
  let sessionManager: SessionManager

  beforeEach(() => {
    sessionManager = new SessionManager()
    vi.clearAllMocks()
  })

  afterEach(async () => {
    await sessionManager.destroy()
  })

  describe('createProviderSession', () => {
    it('should create new session for provider', async () => {
      const { session } = require('electron')
      const mockSession = session.fromPartition()

      const result = await sessionManager.createProviderSession('chatgpt')

      expect(session.fromPartition).toHaveBeenCalledWith('persist:chatgpt')
      expect(result).toBe(mockSession)
      expect(mockSession.setUserAgent).toHaveBeenCalled()
      expect(mockSession.setPermissionRequestHandler).toHaveBeenCalled()
      expect(mockSession.setCertificateVerifyProc).toHaveBeenCalled()
    })

    it('should return existing session if already created', async () => {
      const session1 = await sessionManager.createProviderSession('chatgpt')
      const session2 = await sessionManager.createProviderSession('chatgpt')

      expect(session1).toBe(session2)
    })

    it('should emit session-created event', async () => {
      const eventSpy = vi.fn()
      sessionManager.on('session-created', eventSpy)

      await sessionManager.createProviderSession('chatgpt')

      expect(eventSpy).toHaveBeenCalledWith({ providerId: 'chatgpt' })
    })
  })

  describe('saveSession', () => {
    it('should save session data successfully', async () => {
      const { session } = require('electron')
      const mockElectronSession = session.fromPartition()

      await sessionManager.createProviderSession('chatgpt')
      const result = await sessionManager.saveSession('chatgpt')

      expect(result).toBe(true)
      expect(mockElectronSession.cookies.get).toHaveBeenCalledWith({})
      expect(fs.writeFile).toHaveBeenCalled()
    })

    it('should emit session-saved event on success', async () => {
      const eventSpy = vi.fn()
      sessionManager.on('session-saved', eventSpy)

      await sessionManager.createProviderSession('chatgpt')
      await sessionManager.saveSession('chatgpt')

      expect(eventSpy).toHaveBeenCalledWith({ providerId: 'chatgpt' })
    })

    it('should return false and emit error event on failure', async () => {
      const eventSpy = vi.fn()
      sessionManager.on('session-save-error', eventSpy)

      const result = await sessionManager.saveSession('non-existent')

      expect(result).toBe(false)
      expect(eventSpy).toHaveBeenCalledWith({
        providerId: 'non-existent',
        error: expect.any(Error)
      })
    })
  })

  describe('loadSession', () => {
    it('should load session data successfully', async () => {
      const mockSessionData: SessionData = {
        providerId: 'chatgpt',
        cookies: [],
        localStorage: {},
        sessionStorage: {},
        lastAccess: new Date(),
        isActive: true
      }

      // Mock successful file read and decryption
      vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('encrypted-data'))
      
      const result = await sessionManager.loadSession('chatgpt')

      expect(fs.access).toHaveBeenCalled()
      expect(fs.readFile).toHaveBeenCalled()
      expect(result).toEqual(expect.objectContaining({
        providerId: 'test' // From mocked decryption
      }))
    })

    it('should return null if session file does not exist', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('File not found'))

      const result = await sessionManager.loadSession('non-existent')

      expect(result).toBeNull()
    })

    it('should emit session-loaded event on success', async () => {
      const eventSpy = vi.fn()
      sessionManager.on('session-loaded', eventSpy)

      await sessionManager.loadSession('chatgpt')

      expect(eventSpy).toHaveBeenCalledWith({ providerId: 'chatgpt' })
    })

    it('should emit session-load-error event on failure', async () => {
      const eventSpy = vi.fn()
      sessionManager.on('session-load-error', eventSpy)

      vi.mocked(fs.readFile).mockRejectedValue(new Error('Read error'))

      const result = await sessionManager.loadSession('chatgpt')

      expect(result).toBeNull()
      expect(eventSpy).toHaveBeenCalledWith({
        providerId: 'chatgpt',
        error: expect.any(Error)
      })
    })
  })

  describe('clearSession', () => {
    it('should clear session data successfully', async () => {
      const { session } = require('electron')
      const mockElectronSession = session.fromPartition()

      await sessionManager.createProviderSession('chatgpt')
      const result = await sessionManager.clearSession('chatgpt')

      expect(result).toBe(true)
      expect(mockElectronSession.clearStorageData).toHaveBeenCalled()
      expect(fs.unlink).toHaveBeenCalled()
    })

    it('should emit session-cleared event on success', async () => {
      const eventSpy = vi.fn()
      sessionManager.on('session-cleared', eventSpy)

      await sessionManager.createProviderSession('chatgpt')
      await sessionManager.clearSession('chatgpt')

      expect(eventSpy).toHaveBeenCalledWith({ providerId: 'chatgpt' })
    })

    it('should handle file deletion errors gracefully', async () => {
      vi.mocked(fs.unlink).mockRejectedValue(new Error('File not found'))

      const result = await sessionManager.clearSession('chatgpt')

      expect(result).toBe(true) // Should still return true as it's not critical
    })
  })

  describe('hasSession', () => {
    it('should return true if session file exists', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined)

      const result = await sessionManager.hasSession('chatgpt')

      expect(result).toBe(true)
      expect(fs.access).toHaveBeenCalled()
    })

    it('should return false if session file does not exist', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('File not found'))

      const result = await sessionManager.hasSession('chatgpt')

      expect(result).toBe(false)
    })
  })

  describe('isSessionActive', () => {
    it('should return true for active session', async () => {
      await sessionManager.createProviderSession('chatgpt')
      sessionManager.setSessionActive('chatgpt', true)

      const result = sessionManager.isSessionActive('chatgpt')

      expect(result).toBe(true)
    })

    it('should return false for inactive session', async () => {
      await sessionManager.createProviderSession('chatgpt')
      sessionManager.setSessionActive('chatgpt', false)

      const result = sessionManager.isSessionActive('chatgpt')

      expect(result).toBe(false)
    })

    it('should return false for non-existent session', () => {
      const result = sessionManager.isSessionActive('non-existent')

      expect(result).toBe(false)
    })
  })

  describe('getSessionData', () => {
    it('should return session data if exists', async () => {
      await sessionManager.createProviderSession('chatgpt')

      const result = sessionManager.getSessionData('chatgpt')

      expect(result).toEqual(expect.objectContaining({
        providerId: 'chatgpt',
        cookies: [],
        localStorage: {},
        sessionStorage: {},
        isActive: false
      }))
    })

    it('should return null if session does not exist', () => {
      const result = sessionManager.getSessionData('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('getElectronSession', () => {
    it('should return electron session if exists', async () => {
      const electronSession = await sessionManager.createProviderSession('chatgpt')

      const result = sessionManager.getElectronSession('chatgpt')

      expect(result).toBe(electronSession)
    })

    it('should return null if session does not exist', () => {
      const result = sessionManager.getElectronSession('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('getAllSessionIds', () => {
    it('should return all session IDs', async () => {
      await sessionManager.createProviderSession('chatgpt')
      await sessionManager.createProviderSession('gemini')

      const result = sessionManager.getAllSessionIds()

      expect(result).toEqual(expect.arrayContaining(['chatgpt', 'gemini']))
      expect(result).toHaveLength(2)
    })

    it('should return empty array if no sessions', () => {
      const result = sessionManager.getAllSessionIds()

      expect(result).toEqual([])
    })
  })

  describe('getActiveSessionIds', () => {
    it('should return only active session IDs', async () => {
      await sessionManager.createProviderSession('chatgpt')
      await sessionManager.createProviderSession('gemini')
      await sessionManager.createProviderSession('deepseek')

      sessionManager.setSessionActive('chatgpt', true)
      sessionManager.setSessionActive('gemini', false)
      sessionManager.setSessionActive('deepseek', true)

      const result = sessionManager.getActiveSessionIds()

      expect(result).toEqual(expect.arrayContaining(['chatgpt', 'deepseek']))
      expect(result).toHaveLength(2)
    })
  })

  describe('setSessionActive', () => {
    it('should set session active status and emit event', async () => {
      const eventSpy = vi.fn()
      sessionManager.on('session-status-changed', eventSpy)

      await sessionManager.createProviderSession('chatgpt')
      sessionManager.setSessionActive('chatgpt', true)

      expect(sessionManager.isSessionActive('chatgpt')).toBe(true)
      expect(eventSpy).toHaveBeenCalledWith({
        providerId: 'chatgpt',
        isActive: true
      })
    })

    it('should update last access time', async () => {
      await sessionManager.createProviderSession('chatgpt')
      const beforeTime = new Date()
      
      sessionManager.setSessionActive('chatgpt', true)
      
      const sessionData = sessionManager.getSessionData('chatgpt')
      expect(sessionData?.lastAccess.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime())
    })
  })

  describe('isSessionExpired', () => {
    it('should return true for expired session', async () => {
      await sessionManager.createProviderSession('chatgpt')
      const sessionData = sessionManager.getSessionData('chatgpt')
      
      if (sessionData) {
        // Set last access to 2 days ago
        sessionData.lastAccess = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      }

      const result = sessionManager.isSessionExpired('chatgpt', 24 * 60 * 60 * 1000) // 1 day

      expect(result).toBe(true)
    })

    it('should return false for non-expired session', async () => {
      await sessionManager.createProviderSession('chatgpt')

      const result = sessionManager.isSessionExpired('chatgpt', 24 * 60 * 60 * 1000) // 1 day

      expect(result).toBe(false)
    })

    it('should return true for non-existent session', () => {
      const result = sessionManager.isSessionExpired('non-existent')

      expect(result).toBe(true)
    })
  })

  describe('cleanupExpiredSessions', () => {
    it('should cleanup expired sessions and emit event', async () => {
      const eventSpy = vi.fn()
      sessionManager.on('sessions-cleaned', eventSpy)

      await sessionManager.createProviderSession('chatgpt')
      await sessionManager.createProviderSession('gemini')

      // Make chatgpt session expired
      const chatgptSession = sessionManager.getSessionData('chatgpt')
      if (chatgptSession) {
        chatgptSession.lastAccess = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      }

      const expiredSessions = await sessionManager.cleanupExpiredSessions(24 * 60 * 60 * 1000)

      expect(expiredSessions).toContain('chatgpt')
      expect(expiredSessions).not.toContain('gemini')
      expect(eventSpy).toHaveBeenCalledWith({
        expiredSessions: expect.arrayContaining(['chatgpt'])
      })
    })
  })

  describe('destroy', () => {
    it('should save all sessions and cleanup', async () => {
      const eventSpy = vi.fn()
      sessionManager.on('session-manager-destroyed', eventSpy)

      await sessionManager.createProviderSession('chatgpt')
      await sessionManager.createProviderSession('gemini')

      await sessionManager.destroy()

      expect(eventSpy).toHaveBeenCalled()
    })
  })
})