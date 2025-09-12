<template>
  <div class="webview-wrapper" :class="{ 'loading': isLoading, 'error': hasError }">
    <!-- 加载状态 -->
    <div v-if="isLoading" class="loading-overlay">
      <el-icon class="loading-icon"><Loading /></el-icon>
      <p>正在加载 {{ provider.name }}...</p>
    </div>
    
    <!-- 错误状态 -->
    <div v-if="hasError" class="error-overlay">
      <el-icon class="error-icon"><Warning /></el-icon>
      <p>{{ errorMessage }}</p>
      <el-button type="primary" @click="retry">重试</el-button>
    </div>
    
    <!-- WebView容器 -->
    <div 
      :id="webviewId"
      class="webview-container"
      :style="{ 
        visibility: hasError ? 'hidden' : 'visible',
        opacity: isLoading && isInitialLoad ? '0.5' : '1'
      }"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { Loading, Warning } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { AIProvider } from '../../types'

// Props
interface Props {
  provider: AIProvider
  width?: number
  height?: number
  autoLoad?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  width: 800,
  height: 600,
  autoLoad: true
})

// Emits
interface Emits {
  (e: 'ready'): void
  (e: 'loading', loading: boolean): void
  (e: 'error', error: string): void
  (e: 'login-status-changed', isLoggedIn: boolean): void
  (e: 'title-changed', title: string): void
  (e: 'url-changed', url: string): void
}

const emit = defineEmits<Emits>()

// 响应式数据
const isLoading = ref(false)
const hasError = ref(false)
const errorMessage = ref('')
const webviewElement = ref<Electron.WebviewTag | null>(null)
const retryCount = ref(0)
const maxRetries = 3
const saveSessionTimer = ref<NodeJS.Timeout | null>(null)
const loginCheckTimer = ref<NodeJS.Timeout | null>(null)
const sessionLoaded = ref(false)
const isInitialLoad = ref(true)
const currentUrl = ref('')

// 计算属性
const webviewId = computed(() => `webview-${props.provider.id}`)

/**
 * 创建WebView元素
 */
const createWebView = (): void => {
  console.log(`Creating WebView for ${props.provider.name}`)
  
  const container = document.getElementById(webviewId.value)
  if (!container) {
    console.error(`WebView container not found: ${webviewId.value}`)
    return
  }

  // 清空容器
  container.innerHTML = ''

  // 创建webview元素
  const webview = document.createElement('webview') as Electron.WebviewTag
  webview.id = `${webviewId.value}-element`
  webview.src = props.provider.url
  webview.style.width = '100%'
  webview.style.height = '100%'
  webview.style.border = 'none'
  
  // 初始化URL状态
  currentUrl.value = props.provider.url
  isInitialLoad.value = true
  
  // 设置webview属性
  webview.setAttribute('nodeintegration', 'false')
  webview.setAttribute('websecurity', 'true')
  webview.setAttribute('allowpopups', 'true')
  webview.setAttribute('useragent', getUserAgent())
  webview.setAttribute('partition', `persist:${props.provider.id}`)
  
  // 为Qwen添加特殊属性
  if (props.provider.id === 'qwen') {
    webview.setAttribute('disablewebsecurity', 'true')
    webview.setAttribute('webpreferences', 'contextIsolation=false')
  }
  
  console.log(`WebView created for ${props.provider.name}, URL: ${props.provider.url}`)
  
  // 添加到容器
  container.appendChild(webview)
  webviewElement.value = webview

  // 绑定事件
  bindWebViewEvents(webview)
}

/**
 * 获取用户代理字符串
 */
const getUserAgent = (): string => {
  const baseUA = navigator.userAgent
  // 添加自定义标识，避免被某些网站检测为自动化工具
  return baseUA.replace(/Electron\/[\d.]+\s/, '')
}

/**
 * 判断是否是重要的导航（需要显示加载状态）
 */
const isSignificantNavigation = (newUrl: string): boolean => {
  if (!currentUrl.value) return true // 首次加载
  
  try {
    const current = new URL(currentUrl.value)
    const next = new URL(newUrl)
    
    // 如果域名不同，认为是重要导航
    if (current.hostname !== next.hostname) {
      return true
    }
    
    // 针对不同AI网站的特殊处理
    const hostname = current.hostname
    
    // ChatGPT - 对话ID变化不算重要导航
    if (hostname.includes('openai.com')) {
      const currentPath = current.pathname
      const nextPath = next.pathname
      
      // /c/xxx 到 /c/yyy 的变化不重要
      if (/^\/c\/[a-f0-9-]+/.test(currentPath) && /^\/c\/[a-f0-9-]+/.test(nextPath)) {
        return false
      }
    }
    
    // 豆包 - 聊天相关的导航不重要
    if (hostname.includes('doubao.com')) {
      const currentPath = current.pathname
      const nextPath = next.pathname
      
      // 聊天页面内的导航不重要
      if (currentPath.includes('/chat') && nextPath.includes('/chat')) {
        return false
      }
      
      // 对话ID变化不重要
      if (/\/chat\/[a-f0-9-]+/.test(currentPath) && /\/chat\/[a-f0-9-]+/.test(nextPath)) {
        return false
      }
    }
    
    // Gemini - 对话相关导航不重要
    if (hostname.includes('gemini.google.com')) {
      const currentPath = current.pathname
      const nextPath = next.pathname
      
      // 对话页面内导航不重要
      if (currentPath.includes('/app') && nextPath.includes('/app')) {
        return false
      }
    }
    
    // DeepSeek - 聊天导航不重要
    if (hostname.includes('deepseek.com')) {
      const currentPath = current.pathname
      const nextPath = next.pathname
      
      if (currentPath.includes('/chat') && nextPath.includes('/chat')) {
        return false
      }
    }
    
    // Qwen - 对话导航不重要
    if (hostname.includes('tongyi.aliyun.com')) {
      const currentPath = current.pathname
      const nextPath = next.pathname
      
      if (currentPath.includes('/qianwen') && nextPath.includes('/qianwen')) {
        return false
      }
    }
    
    // Copilot - 聊天导航不重要
    if (hostname.includes('copilot.microsoft.com')) {
      const currentPath = current.pathname
      const nextPath = next.pathname
      
      if (currentPath.includes('/chats') && nextPath.includes('/chats')) {
        return false
      }
    }
    
    // 通用规则：查询参数或锚点变化不重要
    if (current.origin + current.pathname === next.origin + next.pathname) {
      return false
    }
    
    return true // 其他情况认为是重要导航
  } catch (error) {
    console.warn(`Failed to parse URLs for navigation check: ${error}`)
    // URL解析失败，保守起见认为是重要导航
    return true
  }
}

/**
 * 绑定WebView事件
 */
const bindWebViewEvents = (webview: Electron.WebviewTag): void => {
  // 页面开始加载
  webview.addEventListener('did-start-loading', () => {
    const isSignificant = isInitialLoad.value || isSignificantNavigation(webview.src)
    console.log(`${props.provider.name} did-start-loading, significant: ${isSignificant}, URL: ${webview.src}`)
    
    // 只有在初始加载或URL发生重大变化时才显示加载状态
    if (isSignificant) {
      isLoading.value = true
      hasError.value = false
      emit('loading', true)
    }
  })

  // 页面加载完成
  webview.addEventListener('did-finish-load', () => {
    const newUrl = webview.src
    const wasInitialLoad = isInitialLoad.value
    
    // 更新当前URL
    currentUrl.value = newUrl
    
    const isSignificant = wasInitialLoad || isSignificantNavigation(newUrl)
    console.log(`${props.provider.name} did-finish-load, significant: ${isSignificant}, URL: ${newUrl}`)
    
    // 只有在初始加载或重大导航时才更新加载状态
    if (isSignificant) {
      isLoading.value = false
      hasError.value = false
      retryCount.value = 0
      emit('loading', false)
      emit('ready')
      
      // 检查登录状态
      checkLoginStatus()
      
      // 设置定期保存会话（每15分钟），但只设置一次
      if (!saveSessionTimer.value) {
        saveSessionTimer.value = setInterval(() => {
          // 只有在登录状态下才保存会话
          if (props.provider.isLoggedIn) {
            saveSession()
          }
          
          // 为Qwen定期检查页面状态
          if (props.provider.id === 'qwen' && webviewElement.value) {
            webviewElement.value.executeJavaScript(`
              // 确保页面不会变灰
              if (document.body.style.opacity !== '1') {
                document.body.style.opacity = '1';
                document.body.style.backgroundColor = 'white';
              }
              
              // 移除可能的遮罩层
              const masks = document.querySelectorAll('.ant-modal-mask, .overlay, [class*="mask"]');
              masks.forEach(mask => {
                if (mask && mask.style.display !== 'none') {
                  mask.style.display = 'none';
                }
              });
            `).catch(error => {
              console.warn('Failed to maintain Qwen page state:', error)
            })
          }
        }, 15 * 60 * 1000)
      }
      
      // 设置定期检查登录状态（每30秒），特别是对于豆包
      if (!loginCheckTimer.value) {
        loginCheckTimer.value = setInterval(() => {
          if (webviewElement.value && !isLoading.value) {
            checkLoginStatus()
          }
        }, 30 * 1000) // 30秒检查一次
      }
    }
    
    // 标记初始加载完成
    isInitialLoad.value = false
  })

  // 页面加载失败
  webview.addEventListener('did-fail-load', (event) => {
    if (event.errorCode === -3) return // 用户取消加载，忽略
    
    isLoading.value = false
    hasError.value = true
    errorMessage.value = `加载失败: ${event.errorDescription || '未知错误'}`
    emit('loading', false)
    emit('error', errorMessage.value)
  })

  // 页面标题变化
  webview.addEventListener('page-title-updated', (event) => {
    emit('title-changed', event.title)
  })

  // URL变化
  webview.addEventListener('will-navigate', (event) => {
    console.log(`${props.provider.name} navigating to: ${event.url}`)
    emit('url-changed', event.url)
  })
  
  // 页面内导航完成
  webview.addEventListener('did-navigate-in-page', (event) => {
    console.log(`${props.provider.name} in-page navigation: ${event.url}`)
    // 页面内导航不需要显示加载状态
    
    // 为Qwen重新注入样式，防止页面变灰
    if (props.provider.id === 'qwen') {
      setTimeout(() => {
        injectCustomStyles(webview)
      }, 500)
    }
  })
  
  // 监听WebView的focus事件
  webview.addEventListener('focus', () => {
    if (props.provider.id === 'qwen') {
      // 确保Qwen页面在获得焦点时不会变灰
      webview.executeJavaScript(`
        document.body.style.opacity = '1';
        document.body.style.backgroundColor = 'white';
        const masks = document.querySelectorAll('.ant-modal-mask, .overlay, [class*="mask"]');
        masks.forEach(mask => {
          if (mask) mask.style.display = 'none';
        });
      `).catch(error => {
        console.warn('Failed to fix Qwen focus issue:', error)
      })
    }
  })
  
  // 监听WebView的blur事件
  webview.addEventListener('blur', () => {
    if (props.provider.id === 'qwen') {
      // 防止失去焦点时页面变灰
      setTimeout(() => {
        webview.executeJavaScript(`
          document.body.style.opacity = '1';
          document.body.style.backgroundColor = 'white';
        `).catch(error => {
          console.warn('Failed to fix Qwen blur issue:', error)
        })
      }, 100)
    }
  })

  // 新窗口请求
  webview.addEventListener('new-window', (event) => {
    // 在默认浏览器中打开新窗口
    if (window.electronAPI) {
      window.electronAPI.openExternal(event.url)
    }
  })

  // 控制台消息（用于调试）
  webview.addEventListener('console-message', (event) => {
    if (event.level === 0) { // 错误级别
      console.error(`WebView Console [${props.provider.name}]:`, event.message)
    }
  })

  // DOM准备就绪
  webview.addEventListener('dom-ready', () => {
    // 注入自定义样式或脚本（如果需要）
    injectCustomStyles(webview)
    
    // 为Qwen添加特殊的焦点处理
    if (props.provider.id === 'qwen') {
      // 延迟执行，确保页面完全加载
      setTimeout(() => {
        webview.executeJavaScript(`
          // 移除可能导致页面变灰的事件监听器
          document.addEventListener('click', function(e) {
            // 阻止可能的遮罩层显示
            const masks = document.querySelectorAll('.ant-modal-mask, .overlay, [class*="mask"]');
            masks.forEach(mask => {
              if (mask) mask.style.display = 'none';
            });
          });
          
          // 确保输入框焦点正常
          document.addEventListener('focus', function(e) {
            if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
              e.target.style.opacity = '1';
              e.target.style.backgroundColor = 'white';
            }
          }, true);
        `).catch(error => {
          console.warn('Failed to inject Qwen focus handling:', error)
        })
      }, 1000)
    }
  })
}

/**
 * 注入自定义样式
 */
const injectCustomStyles = (webview: Electron.WebviewTag): void => {
  // 基础样式
  let customCSS = `
    /* 隐藏可能的广告或不需要的元素 */
    .advertisement,
    .ads,
    [data-testid="advertisement"] {
      display: none !important;
    }
    
    /* 优化滚动条样式 */
    ::-webkit-scrollbar {
      width: 8px;
    }
    
    ::-webkit-scrollbar-track {
      background: #f1f1f1;
    }
    
    ::-webkit-scrollbar-thumb {
      background: #c1c1c1;
      border-radius: 4px;
    }
    
    ::-webkit-scrollbar-thumb:hover {
      background: #a8a8a8;
    }
    
    /* 确保页面背景不会变灰 */
    body, html {
      background-color: white !important;
    }
  `

  // 针对不同AI网站的特殊样式
  if (props.provider.id === 'qwen') {
    customCSS += `
      /* Qwen特殊样式 - 修复页面变灰问题 */
      .ant-modal-mask,
      .ant-drawer-mask,
      .overlay,
      .modal-mask {
        display: none !important;
      }
      
      /* 确保输入框和表单元素正常显示 */
      input, textarea, select, button {
        opacity: 1 !important;
        background-color: white !important;
      }
      
      /* 修复可能的遮罩层问题 */
      [class*="mask"],
      [class*="overlay"],
      [class*="backdrop"] {
        display: none !important;
      }
      
      /* 确保登录表单可见 */
      .login-form,
      .auth-form,
      [class*="login"],
      [class*="auth"] {
        z-index: 9999 !important;
        opacity: 1 !important;
        background-color: white !important;
      }
    `
  } else if (props.provider.id === 'doubao') {
    customCSS += `
      /* 豆包特殊样式 */
      .modal-mask,
      .overlay {
        display: none !important;
      }
    `
  } else if (props.provider.id === 'chatgpt') {
    customCSS += `
      /* ChatGPT特殊样式 */
      [data-testid="modal-backdrop"] {
        display: none !important;
      }
    `
  }

  webview.insertCSS(customCSS).catch(error => {
    console.warn('Failed to inject CSS:', error)
  })
}

/**
 * 检查登录状态
 */
const checkLoginStatus = async (): Promise<void> => {
  if (!webviewElement.value) return

  try {
    // 根据不同的AI网站检查不同的登录标识
    const loginCheckScript = getLoginCheckScript(props.provider.id)
    const result = await webviewElement.value.executeJavaScript(loginCheckScript)
    
    const isLoggedIn = Boolean(result)
    
    // 只有在登录状态真正发生变化时才触发事件和保存会话
    if (isLoggedIn !== props.provider.isLoggedIn) {
      emit('login-status-changed', isLoggedIn)
      
      // 如果登录成功，保存会话
      if (isLoggedIn && window.electronAPI) {
        await saveSession()
      }
    }
  } catch (error) {
    console.warn(`Failed to check login status for ${props.provider.name}:`, error)
  }
}

/**
 * 保存会话数据
 */
const saveSession = async (): Promise<void> => {
  if (!window.electronAPI) return
  
  try {
    await window.electronAPI.saveSession({ providerId: props.provider.id })
    console.log(`Session saved for ${props.provider.name}`)
  } catch (error) {
    console.warn(`Failed to save session for ${props.provider.name}:`, error)
  }
}

/**
 * 加载会话数据
 */
const loadSession = async (): Promise<void> => {
  if (!window.electronAPI || sessionLoaded.value) return
  
  sessionLoaded.value = true
  
  try {
    const response = await window.electronAPI.loadSession({ providerId: props.provider.id })
    if (response.exists && response.sessionData) {
      console.log(`Session loaded for ${props.provider.name}`)
      // 会话数据已经在后端恢复，这里只需要检查登录状态
      setTimeout(() => {
        checkLoginStatus()
      }, 2000) // 等待页面加载完成后检查
    }
  } catch (error) {
    console.warn(`Failed to load session for ${props.provider.name}:`, error)
  }
}

/**
 * 获取登录状态检查脚本
 */
const getLoginCheckScript = (providerId: string): string => {
  const scripts: Record<string, string> = {
    chatgpt: `
      // 检查是否存在用户头像或登录相关元素
      !!(document.querySelector('[data-testid="profile-button"]') || 
         document.querySelector('.flex.items-center.gap-2') ||
         document.querySelector('[aria-label*="User"]'))
    `,
    gemini: `
      // 检查Gemini的登录状态
      !!(document.querySelector('[data-ved]') ||
         document.querySelector('.gb_d') ||
         document.querySelector('[aria-label*="Account"]'))
    `,
    deepseek: `
      // 检查DeepSeek的登录状态
      !!(document.querySelector('.user-avatar') ||
         document.querySelector('.login-user') ||
         document.querySelector('[class*="avatar"]'))
    `,
    doubao: `
      // 检查豆包的登录状态 - 更准确的检测方法
      (function() {
        // 检查多种可能的登录状态指示器
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
            console.log('[Login Check] Found login indicator:', selector);
            return true;
          }
        }
        
        // 检查是否在登录页面（如果在登录页面，认为未登录）
        const isLoginPage = window.location.href.includes('login') ||
                           window.location.href.includes('auth') ||
                           window.location.href.includes('signin') ||
                           document.querySelector('.login-form') ||
                           document.querySelector('.auth-form') ||
                           document.querySelector('[class*="login"]') ||
                           document.querySelector('input[type="password"]');
        
        if (isLoginPage) {
          console.log('[Login Check] On login page, not logged in');
          return false;
        }
        
        // 检查页面内容，如果有聊天界面相关元素，可能已登录
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
            console.log('[Login Check] Found chat interface, likely logged in:', selector);
            return true;
          }
        }
        
        console.log('[Login Check] No clear login indicators found');
        return false;
      })()
    `,
    qwen: `
      // 检查通义千问的登录状态
      !!(document.querySelector('.user-avatar') ||
         document.querySelector('.login-info') ||
         document.querySelector('[class*="avatar"]'))
    `,
    copilot: `
      // 检查Copilot的登录状态
      !!(document.querySelector('[data-testid="user-menu"]') ||
         document.querySelector('.user-profile') ||
         document.querySelector('[aria-label*="Profile"]'))
    `
  }

  return scripts[providerId] || 'false'
}

/**
 * 重试加载
 */
const retry = (): void => {
  if (retryCount.value >= maxRetries) {
    ElMessage.error(`${props.provider.name} 重试次数已达上限`)
    return
  }

  retryCount.value++
  hasError.value = false
  errorMessage.value = ''
  
  if (webviewElement.value) {
    webviewElement.value.reload()
  } else {
    createWebView()
  }
}

/**
 * 刷新WebView
 */
const refresh = (): void => {
  if (webviewElement.value) {
    webviewElement.value.reload()
  }
}

/**
 * 导航到指定URL
 */
const navigateTo = (url: string): void => {
  if (webviewElement.value) {
    webviewElement.value.src = url
  }
}

/**
 * 执行JavaScript代码
 */
const executeScript = async (script: string): Promise<any> => {
  if (!webviewElement.value) {
    throw new Error('WebView not ready')
  }
  
  return await webviewElement.value.executeJavaScript(script)
}

/**
 * 发送消息到WebView
 */
const sendMessage = async (message: string): Promise<void> => {
  if (!webviewElement.value) {
    throw new Error('WebView not ready')
  }

  try {
    console.log('[WebView] Sending message:', message)
    const sendScript = getSendMessageScript(props.provider.id, message)
    await webviewElement.value.executeJavaScript(sendScript)
  } catch (error) {
    console.error(`Failed to send message to ${props.provider.name}:`, error)
    throw error
  }
}

/**
 * 获取发送消息的脚本
 */
const getSendMessageScript = (providerId: string, message: string): string => {
  const escapedMessage = message.replace(/'/g, "\\'").replace(/\n/g, '\\n')
  console.log('escapedMessage',escapedMessage)
  const scripts: Record<string, string> = {
    chatgpt: `
      (function() {
        const textarea = document.querySelector('textarea[placeholder*="Message"]') || 
                        document.querySelector('#prompt-textarea') ||
                        document.querySelector('textarea');
        if (textarea) {
          textarea.value = '${escapedMessage}';
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
          
          // 查找发送按钮
          const sendButton = document.querySelector('[data-testid="send-button"]') ||
                           document.querySelector('button[aria-label*="Send"]') ||
                           document.querySelector('button:has(svg)');
          if (sendButton && !sendButton.disabled) {
            sendButton.click();
          }
          return true;
        }
        return false;
      })()
    `,
    gemini: `
      (function() {
        const textarea = document.querySelector('textarea') ||
                        document.querySelector('[contenteditable="true"]');
        if (textarea) {
          if (textarea.tagName === 'TEXTAREA') {
            textarea.value = '${escapedMessage}';
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
          } else {
            textarea.textContent = '${escapedMessage}';
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
          }
          
          // 查找发送按钮
          const sendButton = document.querySelector('button[aria-label*="Send"]') ||
                           document.querySelector('button:has(svg)');
          if (sendButton && !sendButton.disabled) {
            sendButton.click();
          }
          return true;
        }
        return false;
      })()
    `,
    deepseek: `
      (function() {
        const textarea = document.querySelector('textarea') ||
                        document.querySelector('.input-area textarea');
        if (textarea) {
          textarea.value = '${escapedMessage}';
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
          
          const sendButton = document.querySelector('.send-button') ||
                           document.querySelector('button:has(svg)');
          if (sendButton && !sendButton.disabled) {
            sendButton.click();
          }
          return true;
        }
        return false;
      })()
    `,
    doubao: `
      (function() {
        // --- Configuration ---
        const CHAT_INPUT_SELECTOR = '[data-testid="chat_input_input"]';
        const INPUT_SEND_DELAY_MS = 200;
        
        // --- Input Handling ---
        function findChatInput() {
          const element = document.querySelector(CHAT_INPUT_SELECTOR);
          if (element && element.tagName === 'TEXTAREA') {
            return element;
          }
          return null;
        }
        
        const inputElement = findChatInput();
        
        if (!inputElement) {
          console.error("[Input] Chat input TEXTAREA element not found using selector:", CHAT_INPUT_SELECTOR);
          return false;
        }
        
        try {
          inputElement.focus();
          console.log("[Input] Focused the textarea element.");
          
          const newValue = '${escapedMessage}';
          
          // 使用更可靠的方式设置input值
          try {
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
            if (nativeInputValueSetter) {
              nativeInputValueSetter.call(inputElement, newValue);
              console.log("Successfully set input value using native setter:", newValue);
            } else {
              inputElement.value = newValue;
              console.warn("Native value setter not available. Set input value using direct assignment as a fallback.");
            }
          } catch (e) {
            console.error("Error setting input value using native setter or direct assignment:", e);
            if (inputElement.value !== newValue) {
              inputElement.value = newValue;
              console.warn("Forced input value setting after error.");
            }
          }
          
          // 触发input事件
          const inputEvent = new Event('input', {
            bubbles: true,
            cancelable: false,
          });
          
          inputElement.dispatchEvent(inputEvent);
          console.log("Simulated 'input' event dispatched.");
          
          // 延迟后发送Enter键事件
          setTimeout(() => {
            const enterEvent = new KeyboardEvent('keydown', {
              bubbles: true,
              cancelable: true,
              key: 'Enter',
              code: 'Enter',
              keyCode: 13,
              which: 13,
            });
            
            const dispatched = inputElement.dispatchEvent(enterEvent);
            console.log(\`[Input] Dispatched 'keydown' (Enter) after delay. Event cancellation status: \${!dispatched}.\`);
          }, INPUT_SEND_DELAY_MS);
          
          return true;
        } catch (e) {
          console.error("[Input] Error during input simulation:", e);
          return false;
        }
      })()
    `,
    qwen: `
      (function() {
        const textarea = document.querySelector('textarea') ||
                        document.querySelector('.input-box textarea');
        if (textarea) {
          textarea.value = '${escapedMessage}';
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
          
          const sendButton = document.querySelector('.send-button') ||
                           document.querySelector('button:has(svg)');
          if (sendButton && !sendButton.disabled) {
            sendButton.click();
          }
          return true;
        }
        return false;
      })()
    `,
    copilot: `
      (function() {
        const textarea = document.querySelector('textarea') ||
                        document.querySelector('.chat-input textarea');
        if (textarea) {
          textarea.value = '${escapedMessage}';
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
          
          const sendButton = document.querySelector('button[aria-label*="Send"]') ||
                           document.querySelector('button:has(svg)');
          if (sendButton && !sendButton.disabled) {
            sendButton.click();
          }
          return true;
        }
        return false;
      })()
    `
  }

  return scripts[providerId] || 'false'
}

/**
 * 销毁WebView
 */
const destroy = (): void => {
  // 清除定时器
  if (saveSessionTimer.value) {
    clearInterval(saveSessionTimer.value)
    saveSessionTimer.value = null
  }
  
  if (loginCheckTimer.value) {
    clearInterval(loginCheckTimer.value)
    loginCheckTimer.value = null
  }
  
  if (webviewElement.value) {
    const container = document.getElementById(webviewId.value)
    if (container) {
      container.innerHTML = ''
    }
    webviewElement.value = null
  }
}

/**
 * 手动创建WebView（用于按需加载）
 */
const create = async (): Promise<void> => {
  console.log(`Manual create WebView for ${props.provider.name}`)
  
  if (!webviewElement.value) {
    console.log(`Loading session and creating WebView for ${props.provider.name}`)
    await loadSession()
    
    // 等待一小段时间确保DOM已经渲染
    await new Promise(resolve => setTimeout(resolve, 100))
    
    createWebView()
  } else {
    console.log(`WebView already exists for ${props.provider.name}`)
  }
}

// 暴露方法给父组件
defineExpose({
  refresh,
  navigateTo,
  executeScript,
  sendMessage,
  destroy,
  checkLoginStatus,
  saveSession,
  loadSession,
  create
})

// 生命周期
onMounted(async () => {
  console.log(`WebView mounted for ${props.provider.name}, autoLoad: ${props.autoLoad}`)
  
  if (props.autoLoad) {
    // 先尝试加载保存的会话
    await loadSession()
    // 然后创建WebView
    createWebView()
  }
})

onUnmounted(() => {
  destroy()
})

// 监听provider变化
watch(() => props.provider.url, (newUrl) => {
  if (webviewElement.value && newUrl) {
    navigateTo(newUrl)
  }
})
</script>

<style scoped>
.webview-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  background: var(--el-bg-color-page);
}

.webview-container {
  width: 100%;
  height: 100%;
}

.loading-overlay,
.error-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--el-bg-color-page);
  z-index: 10;
}

.loading-icon {
  font-size: 32px;
  color: var(--el-color-primary);
  animation: rotate 1s linear infinite;
  margin-bottom: 12px;
}

.error-icon {
  font-size: 32px;
  color: var(--el-color-danger);
  margin-bottom: 12px;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.loading-overlay p,
.error-overlay p {
  color: var(--el-text-color-secondary);
  margin-bottom: 16px;
}

.webview-wrapper.loading .webview-container {
  opacity: 0.5;
}

.webview-wrapper.error .webview-container {
  display: none;
}
</style>