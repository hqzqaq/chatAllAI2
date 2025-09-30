/**
 * WebView服务 - 处理WebView相关的业务逻辑
 */

import type { AIProvider, Message, Session } from '../types'

export interface WebViewConfig {
  id: string
  url: string
  userAgent?: string
  preload?: string
  nodeIntegration?: boolean
  webSecurity?: boolean
  allowPopups?: boolean
  partition?: string
}

export interface WebViewState {
  isReady: boolean
  isLoading: boolean
  hasError: boolean
  errorMessage: string
  title: string
  url: string
  canGoBack: boolean
  canGoForward: boolean
  zoomFactor: number
}

export interface MessageSendResult {
  providerId: string
  success: boolean
  error?: string
  timestamp: Date
}

/**
 * WebView服务类
 */
export class WebViewService {
  private webViewConfigs: Map<string, WebViewConfig> = new Map()

  private webViewStates: Map<string, WebViewState> = new Map()

  private messageQueue: Map<string, string[]> = new Map()

  private retryCounters: Map<string, number> = new Map()

  private readonly MAX_RETRIES = 3

  private readonly RETRY_DELAY = 2000

  private readonly MESSAGE_TIMEOUT = 10000

  /**
   * 初始化WebView配置
   */
  public initializeWebViewConfigs(providers: AIProvider[]): void {
    providers.forEach((provider) => {
      const config: WebViewConfig = {
        id: provider.webviewId,
        url: provider.url,
        userAgent: this.getUserAgent(),
        nodeIntegration: false,
        webSecurity: true,
        allowPopups: true,
        partition: `persist:${provider.id}`
      }

      this.webViewConfigs.set(provider.id, config)
      this.initializeWebViewState(provider.id)
      this.messageQueue.set(provider.id, [])
      this.retryCounters.set(provider.id, 0)
    })
  }

  /**
   * 初始化WebView状态
   */
  private initializeWebViewState(providerId: string): void {
    const state: WebViewState = {
      isReady: false,
      isLoading: false,
      hasError: false,
      errorMessage: '',
      title: '',
      url: '',
      canGoBack: false,
      canGoForward: false,
      zoomFactor: 1.0
    }

    this.webViewStates.set(providerId, state)
  }

  /**
   * 获取用户代理字符串
   */
  private getUserAgent(): string {
    const baseUA = navigator.userAgent
    // 移除Electron标识，避免被检测
    return baseUA.replace(/Electron\/[\d.]+\s/, '').replace(/ChatAllAI\/[\d.]+\s/, '')
  }

  /**
   * 获取WebView配置
   */
  public getWebViewConfig(providerId: string): WebViewConfig | undefined {
    return this.webViewConfigs.get(providerId)
  }

  /**
   * 获取WebView状态
   */
  public getWebViewState(providerId: string): WebViewState | undefined {
    return this.webViewStates.get(providerId)
  }

  /**
   * 更新WebView状态
   */
  public updateWebViewState(providerId: string, updates: Partial<WebViewState>): void {
    const currentState = this.webViewStates.get(providerId)
    if (currentState) {
      this.webViewStates.set(providerId, { ...currentState, ...updates })
    }
  }

  /**
   * 获取登录检查脚本
   */
  public getLoginCheckScript(providerId: string): string {
    const scripts: Record<string, string> = {
      kimi: `
        (function() {
          // 检查kimi登录状态的多种方式
          const selectors = [
            '[data-testid="profile-button"]',
            '.flex.items-center.gap-2 img',
            '[aria-label*="User"]',
            '.user-avatar',
            '[data-headlessui-state]'
          ];
          
          for (const selector of selectors) {
            if (document.querySelector(selector)) {
              return true;
            }
          }
          
          // 检查是否在登录页面
          const isLoginPage = window.location.href.includes('auth') || 
                             document.querySelector('button[data-action="login"]') ||
                             document.querySelector('.login-form');
          
          return !isLoginPage;
        })()
      `,
      gork: `
        (function() {
          const selectors = [
            '[data-ved]',
            '.gb_d',
            '[aria-label*="Account"]',
            '.user-info',
            '[data-ogsr-up]'
          ];
          
          for (const selector of selectors) {
            if (document.querySelector(selector)) {
              return true;
            }
          }
          
          return !window.location.href.includes('accounts.google.com');
        })()
      `,
      deepseek: `
        (function() {
          const selectors = [
            '.user-avatar',
            '.login-user',
            '[class*="avatar"]',
            '.user-info',
            '.profile-menu'
          ];
          
          return selectors.some(selector => document.querySelector(selector));
        })()
      `,
      doubao: `
        (function() {
          // 检查豆包的登录状态 - 更准确的检测方法
          const loginIndicators = [
            // 用户头像或个人信息
            '.user-avatar',
            '.avatar-wrapper', 
            '.profile-avatar',
            '.user-info',
            '[class*="avatar"]',
            '[class*="user-info"]',
            '[class*="profile"]',
            
            // 导航栏中的用户相关元素
            '.nav-user',
            '.header-user', 
            '.top-user',
            
            // 特定的数据属性或ID
            '[data-testid*="user"]',
            '[data-testid*="avatar"]',
            '[data-testid*="profile"]',
            
            // 通用的用户指示器
            '.login-user',
            '.user-menu',
            '.account-info'
          ];
          
          // 检查登录指示器
          for (const selector of loginIndicators) {
            const element = document.querySelector(selector);
            if (element && element.offsetWidth > 0 && element.offsetHeight > 0) {
              return true;
            }
          }
          
          // 检查是否在登录页面
          const isLoginPage = window.location.href.includes('login') ||
                             window.location.href.includes('auth') ||
                             window.location.href.includes('signin') ||
                             document.querySelector('.login-form') ||
                             document.querySelector('.auth-form') ||
                             document.querySelector('[class*="login"]') ||
                             document.querySelector('input[type="password"]');
          
          if (isLoginPage) {
            return false;
          }
          
          // 检查聊天界面相关元素
          const chatIndicators = [
            '[data-testid="chat_input_input"]',
            '.chat-input',
            '.message-input',
            '.conversation',
            '.chat-container',
            '.dialogue'
          ];
          
          for (const selector of chatIndicators) {
            const element = document.querySelector(selector);
            if (element && element.offsetWidth > 0 && element.offsetHeight > 0) {
              return true;
            }
          }
          
          return false;
        })()
      `,
      qwen: `
        (function() {
          const selectors = [
            '.user-avatar',
            '.login-info',
            '[class*="avatar"]',
            '.user-profile',
            '.account-info'
          ];
          
          return selectors.some(selector => document.querySelector(selector));
        })()
      `,
      copilot: `
        (function() {
          const selectors = [
            '[data-testid="user-menu"]',
            '.user-profile',
            '[aria-label*="Profile"]',
            '.account-button',
            '.user-avatar'
          ];
          
          return selectors.some(selector => document.querySelector(selector));
        })()
      `
    }

    return scripts[providerId] || 'false'
  }

  /**
   * 获取发送消息脚本
   */
  public getSendMessageScript(providerId: string, message: string): string {
    const escapedMessage = this.escapeMessage(message)

    const scripts: Record<string, string> = {
      kimi: `
        (function() {
          try {
            // 查找输入框的多种方式
            const textareaSelectors = [
              'textarea[placeholder*="Message"]',
              '#prompt-textarea',
              'textarea[data-id="root"]',
              'textarea',
              '[contenteditable="true"]'
            ];
            
            let textarea = null;
            for (const selector of textareaSelectors) {
              textarea = document.querySelector(selector);
              if (textarea) break;
            }
            
            if (!textarea) {
              return { success: false, error: 'Input field not found' };
            }
            
            // 设置消息内容
            if (textarea.tagName === 'TEXTAREA') {
              textarea.value = '${escapedMessage}';
              textarea.dispatchEvent(new Event('input', { bubbles: true }));
              textarea.dispatchEvent(new Event('change', { bubbles: true }));
            } else {
              textarea.textContent = '${escapedMessage}';
              textarea.dispatchEvent(new Event('input', { bubbles: true }));
            }
            
            // 等待一小段时间让界面更新
            setTimeout(() => {
              // 查找发送按钮
              const buttonSelectors = [
                '[data-testid="send-button"]',
                'button[aria-label*="Send"]',
                'button:has(svg[data-icon="send"])',
                'button[type="submit"]',
                '.send-button'
              ];
              
              let sendButton = null;
              for (const selector of buttonSelectors) {
                sendButton = document.querySelector(selector);
                if (sendButton && !sendButton.disabled) break;
              }
              
              if (sendButton && !sendButton.disabled) {
                sendButton.click();
                return { success: true };
              } else {
                // 尝试按Enter键
                const enterEvent = new KeyboardEvent('keydown', {
                  key: 'Enter',
                  code: 'Enter',
                  keyCode: 13,
                  which: 13,
                  bubbles: true
                });
                textarea.dispatchEvent(enterEvent);
                return { success: true };
              }
            }, 100);
            
            return { success: true };
          } catch (error) {
            return { success: false, error: error.message };
          }
        })()
      `,
      gork: `
        (function() {
          try {
            const textarea = document.querySelector('textarea') ||
                            document.querySelector('[contenteditable="true"]') ||
                            document.querySelector('.input-area');
            
            if (!textarea) {
              return { success: false, error: 'Input field not found' };
            }
            
            if (textarea.tagName === 'TEXTAREA') {
              textarea.value = '${escapedMessage}';
              textarea.dispatchEvent(new Event('input', { bubbles: true }));
            } else {
              textarea.textContent = '${escapedMessage}';
              textarea.dispatchEvent(new Event('input', { bubbles: true }));
            }
            
            setTimeout(() => {
              const sendButton = document.querySelector('button[aria-label*="Send"]') ||
                               document.querySelector('button:has(svg)') ||
                               document.querySelector('.send-button');
              
              if (sendButton && !sendButton.disabled) {
                sendButton.click();
              }
            }, 100);
            
            return { success: true };
          } catch (error) {
            return { success: false, error: error.message };
          }
        })()
      `,
      deepseek: `
        (function() {
          try {
            const textarea = document.querySelector('textarea') ||
                            document.querySelector('.input-area textarea') ||
                            document.querySelector('[contenteditable="true"]');
            
            if (!textarea) {
              return { success: false, error: 'Input field not found' };
            }
            
            textarea.value = '${escapedMessage}';
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            
            setTimeout(() => {
              const sendButton = document.querySelector('.send-button') ||
                               document.querySelector('button:has(svg)') ||
                               document.querySelector('[type="submit"]');
              
              if (sendButton && !sendButton.disabled) {
                sendButton.click();
              }
            }, 100);
            
            return { success: true };
          } catch (error) {
            return { success: false, error: error.message };
          }
        })()
      `,
      doubao: `
        (function() {
          try {
            const textarea = document.querySelector('textarea') ||
                            document.querySelector('.chat-input textarea') ||
                            document.querySelector('[contenteditable="true"]');
            
            if (!textarea) {
              return { success: false, error: 'Input field not found' };
            }
            
            textarea.value = '${escapedMessage}';
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            
            setTimeout(() => {
              const sendButton = document.querySelector('.send-btn') ||
                               document.querySelector('button:has(svg)') ||
                               document.querySelector('.submit-button');
              
              if (sendButton && !sendButton.disabled) {
                sendButton.click();
              }
            }, 100);
            
            return { success: true };
          } catch (error) {
            return { success: false, error: error.message };
          }
        })()
      `,
      qwen: `
        (function() {
          try {
            const textarea = document.querySelector('textarea') ||
                            document.querySelector('.input-box textarea') ||
                            document.querySelector('[contenteditable="true"]');
            
            if (!textarea) {
              return { success: false, error: 'Input field not found' };
            }
            
            textarea.value = '${escapedMessage}';
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            
            setTimeout(() => {
              const sendButton = document.querySelector('.send-button') ||
                               document.querySelector('button:has(svg)') ||
                               document.querySelector('[type="submit"]');
              
              if (sendButton && !sendButton.disabled) {
                sendButton.click();
              }
            }, 100);
            
            return { success: true };
          } catch (error) {
            return { success: false, error: error.message };
          }
        })()
      `,
      copilot: `
        (function() {
          try {
            const textarea = document.querySelector('textarea') ||
                            document.querySelector('.chat-input textarea') ||
                            document.querySelector('[contenteditable="true"]');
            
            if (!textarea) {
              return { success: false, error: 'Input field not found' };
            }
            
            textarea.value = '${escapedMessage}';
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            
            setTimeout(() => {
              const sendButton = document.querySelector('button[aria-label*="Send"]') ||
                               document.querySelector('button:has(svg)') ||
                               document.querySelector('.send-button');
              
              if (sendButton && !sendButton.disabled) {
                sendButton.click();
              }
            }, 100);
            
            return { success: true };
          } catch (error) {
            return { success: false, error: error.message };
          }
        })()
      `
    }

    return scripts[providerId] || '{ success: false, error: \'Provider not supported\' }'
  }

  /**
   * 转义消息内容
   */
  private escapeMessage(message: string): string {
    return message
      .replace(/\\/g, '\\\\')
      .replace(/'/g, '\\\'')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t')
  }

  /**
   * 添加消息到队列
   */
  public addMessageToQueue(providerId: string, message: string): void {
    const queue = this.messageQueue.get(providerId)
    if (queue) {
      queue.push(message)
    }
  }

  /**
   * 处理消息队列
   */
  public async processMessageQueue(providerId: string): Promise<MessageSendResult[]> {
    const queue = this.messageQueue.get(providerId)
    if (!queue || queue.length === 0) {
      return []
    }

    const results: MessageSendResult[] = []
    const messages = [...queue]
    queue.length = 0 // 清空队列

    for (const message of messages) {
      const result = await this.sendMessage(providerId, message)
      results.push(result)

      // 如果发送失败，重新加入队列
      if (!result.success) {
        this.addMessageToQueue(providerId, message)
      }

      // 添加延迟避免发送过快
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    return results
  }

  /**
   * 发送消息（模拟实现，实际需要与WebView交互）
   */
  private async sendMessage(providerId: string, message: string): Promise<MessageSendResult> {
    const result: MessageSendResult = {
      providerId,
      success: false,
      timestamp: new Date()
    }

    try {
      const state = this.webViewStates.get(providerId)
      if (!state || !state.isReady) {
        result.error = 'WebView not ready'
        return result
      }

      // 这里应该调用实际的WebView发送消息方法
      // 由于这是服务层，我们返回脚本让WebView组件执行
      const script = this.getSendMessageScript(providerId, message)

      // 模拟发送成功
      result.success = true
    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown error'
    }

    return result
  }

  /**
   * 重置重试计数器
   */
  public resetRetryCounter(providerId: string): void {
    this.retryCounters.set(providerId, 0)
  }

  /**
   * 增加重试计数器
   */
  public incrementRetryCounter(providerId: string): number {
    const current = this.retryCounters.get(providerId) || 0
    const newCount = current + 1
    this.retryCounters.set(providerId, newCount)
    return newCount
  }

  /**
   * 检查是否可以重试
   */
  public canRetry(providerId: string): boolean {
    const count = this.retryCounters.get(providerId) || 0
    return count < this.MAX_RETRIES
  }

  /**
   * 获取重试延迟时间
   */
  public getRetryDelay(providerId: string): number {
    const count = this.retryCounters.get(providerId) || 0
    return this.RETRY_DELAY * 2 ** count // 指数退避
  }

  /**
   * 清理资源
   */
  public cleanup(): void {
    this.webViewConfigs.clear()
    this.webViewStates.clear()
    this.messageQueue.clear()
    this.retryCounters.clear()
  }

  /**
   * 获取所有WebView状态
   */
  public getAllWebViewStates(): Record<string, WebViewState> {
    const states: Record<string, WebViewState> = {}
    this.webViewStates.forEach((state, providerId) => {
      states[providerId] = { ...state }
    })
    return states
  }

  /**
   * 获取统计信息
   */
  public getStatistics(): {
    totalWebViews: number
    readyWebViews: number
    loadingWebViews: number
    errorWebViews: number
    queuedMessages: number
    } {
    let readyCount = 0
    let loadingCount = 0
    let errorCount = 0
    let queuedMessages = 0

    this.webViewStates.forEach((state) => {
      if (state.isReady) readyCount++
      if (state.isLoading) loadingCount++
      if (state.hasError) errorCount++
    })

    this.messageQueue.forEach((queue) => {
      queuedMessages += queue.length
    })

    return {
      totalWebViews: this.webViewStates.size,
      readyWebViews: readyCount,
      loadingWebViews: loadingCount,
      errorWebViews: errorCount,
      queuedMessages
    }
  }
}

// 创建单例实例
export const webViewService = new WebViewService()
