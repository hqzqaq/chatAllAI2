/**
 * AI状态监控脚本工具类
 * 提供不同AI网站的状态监控脚本，用于检测AI是否正在回复
 *
 * @author huquanzhi
 * @since 2025-10-11 15:57
 * @version 1.0
 */

/**
 * 获取AI状态监控脚本
 * @param providerId AI提供商ID
 * @returns 对应的JavaScript脚本字符串
 */
import { resolveScript } from './ScriptResolver'

export function getStatusMonitorScript(providerId: string): string {
  const scripts: Record<string, (id: string) => string> = {
    doubao: getDouBaoStatusMonitorScript,
    kimi: getKimiStatusMonitorScript,
    grok: getGrokStatusMonitorScript,
    deepseek: getDeepSeekStatusMonitorScript,
    qwen: getQwenStatusMonitorScript,
    copilot: getCopilotStatusMonitorScript,
    glm: getGLMStatusMonitorScript,
    yuanbao: getYuanBaoStatusMonitorScript,
    miromind: getMiromindStatusMonitorScript,
    chatgpt: getChatGPTStatusMonitorScript,
    mimo: getMimoStatusMonitorScript,
    minimax: getMinimaxStatusMonitorScript,
    gemini: getGeminiStatusMonitorScript,
    stepfun: getStepFunStatusMonitorScript,
    'qwen-studio': getQwenStudioStatusMonitorScript,
    'gemini-studio': getGeminiStudioStatusMonitorScript
  }

  const scriptGenerator = scripts[providerId]
  const defaultScript = scriptGenerator ? scriptGenerator(providerId) : getGenericStatusMonitorScript(providerId, '')
  return resolveScript(providerId, 'statusMonitor', defaultScript, { providerId })
}

export function getStopMonitorScript(): string {
  return `
    (function() {
      if (window.__AI_MONITOR__) {
        window.__AI_MONITOR__.stop();
      }
    })();
  `
}

/**
 * 豆包状态监控脚本
 */
function getDouBaoStatusMonitorScript(providerId: string): string {
  return `
    (function() {
      if (window.__AI_MONITOR__) {
        window.__AI_MONITOR__.stop();
      }

      let lastStatus = '';
      let observer = null;
      let lastMessageElement = null;
      let completionTimeout = null;
      let lastMessageContent = '';
      let isMonitoring = false;
      let isDeepThinking = false;
      let intervalId = null;

      function postStatus(status, details = {}) {
        if (status === lastStatus) return;
        lastStatus = status;
        if (window.__WEBVIEW_API__ && window.__WEBVIEW_API__.sendToHost) {
          window.__WEBVIEW_API__.sendToHost('webview-ai-status-change', {
            providerId: '${providerId}',
            status: status,
            details: details
          });
        } else {
          console.error('[DouBao Monitor] Preload API not available.');
        }
        console.log('[DouBao Monitor] Status changed:' + status);
      }

      function checkDeepThinkingStatus() {
        const collapseButton = document.querySelector('[data-testid="collapse_button"]');
        if (collapseButton && collapseButton.textContent && collapseButton.textContent.includes('深度思考中')) {
          if (!isDeepThinking) {
            isDeepThinking = true;
            console.log('[DouBao Monitor] Deep thinking mode detected');
            return true;
          }
        } else {
          if (isDeepThinking) {
            isDeepThinking = false;
            console.log('[DouBao Monitor] Deep thinking mode ended');
          }
        }
        return isDeepThinking;
      }

      function monitorMessage(element) {
        if (observer) {
          observer.disconnect();
        }
        
        lastMessageContent = element.textContent || '';

        observer = new MutationObserver((mutations) => {
          let hasContentChange = false;
          
          mutations.forEach((mutation) => {
            if (mutation.type === 'characterData' || 
                (mutation.type === 'childList' && mutation.addedNodes.length > 0)) {
              const currentContent = element.textContent || '';
              if (currentContent !== lastMessageContent) {
                hasContentChange = true;
                lastMessageContent = currentContent;
              }
            }
          });
          
          if (hasContentChange) {
            postStatus('ai_responding');
            if (completionTimeout) {
              clearTimeout(completionTimeout);
            }
            completionTimeout = setTimeout(() => {
              if (checkDeepThinkingStatus()) {
                completionTimeout = setTimeout(() => {
                  postStatus('ai_completed');
                }, 2000);
              } else {
                postStatus('ai_completed');
              }
            }, 3000);
          }
        });

        observer.observe(element, {
          childList: true,
          subtree: true,
          characterData: true,
          attributes: false
        });
      }

      function checkForAIResponse() {
        const deepThinkingActive = checkDeepThinkingStatus();
        
        const messageElements = document.querySelectorAll(
          'div[data-testid="message_text_content"], div[data-testid="think_quota_block"]'
        );
        const currentLastMessage = messageElements.length > 0 ? messageElements[messageElements.length - 1] : null;

        if (currentLastMessage || deepThinkingActive) {
          if (currentLastMessage !== lastMessageElement || deepThinkingActive) {
            if (currentLastMessage && currentLastMessage !== lastMessageElement) {
              lastMessageElement = currentLastMessage;
              monitorMessage(lastMessageElement);
            }
            postStatus('ai_responding');
            if (completionTimeout) clearTimeout(completionTimeout);
            
            const timeoutDuration = deepThinkingActive ? 3000 : 3000;
            completionTimeout = setTimeout(() => {
              if (checkDeepThinkingStatus()) {
                completionTimeout = setTimeout(() => {
                  postStatus('ai_completed');
                }, 2000);
              } else {
                postStatus('ai_completed');
              }
            }, timeoutDuration);
          }
        } else {
          if (lastMessageElement) {
            if (observer) observer.disconnect();
            observer = null;
            lastMessageElement = null;
            lastMessageContent = '';
            if (completionTimeout) clearTimeout(completionTimeout);
            postStatus('ai_completed');
          }
          postStatus('waiting_input');
        }
      }

      intervalId = setInterval(checkForAIResponse, 3000);

      window.__AI_MONITOR__ = {
        intervalId: intervalId,
        observer: observer,
        stop: function() {
          if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
          }
          if (observer) {
            observer.disconnect();
            observer = null;
          }
          if (completionTimeout) {
            clearTimeout(completionTimeout);
            completionTimeout = null;
          }
          window.__AI_MONITOR__ = null;
          console.log('[DouBao Monitor] Stopped.');
        }
      };

      console.log('[DouBao Monitor] Initialized with deep thinking support.');
      postStatus('waiting_input');
    })();
  `
}

/**
 * Kimi状态监控脚本
 */
function getKimiStatusMonitorScript(providerId: string): string {
  return getGenericStatusMonitorScript(providerId, '[class="chat-content-list"]')
}

/**
 * Grok状态监控脚本
 */
function getGrokStatusMonitorScript(providerId: string): string {
  return getGenericStatusMonitorScript(providerId, '[data-testid="assistant-message"]')
}

/**
 * DeepSeek状态监控脚本
 */
function getDeepSeekStatusMonitorScript(providerId: string): string {
  return getGenericStatusMonitorScript(providerId, '.ds-markdown')
}

/**
 * 通义千问状态监控脚本
 */
function getQwenStatusMonitorScript(providerId: string): string {
  return getGenericStatusMonitorScript(providerId, '[class^="wrapper"]')
}

/**
 * Copilot状态监控脚本
 */
function getCopilotStatusMonitorScript(providerId: string): string {
  return getGenericStatusMonitorScript(providerId, '[data-content="conversation"]')
}

/**
 * GLM状态监控脚本
 */
function getGLMStatusMonitorScript(providerId: string): string {
  return getGenericStatusMonitorScript(providerId, '[class="detail chatScrollContainer conversation-list"]')
}

/**
 * 元宝状态监控脚本
 */
function getYuanBaoStatusMonitorScript(providerId: string): string {
  return getGenericStatusMonitorScript(providerId, '[class="agent-chat__list__content-wrapper"]')
}

/**
 * miromind状态监控脚本
 */
function getMiromindStatusMonitorScript(providerId: string): string {
  return `
    (function() {
      if (window.__AI_MONITOR__) {
        window.__AI_MONITOR__.stop();
      }

      let lastStatus = '';
      let completionTimeout = null;
      let intervalId = null;

      function postStatus(status, details = {}) {
        if (status === lastStatus) return;
        lastStatus = status;
        if (window.__WEBVIEW_API__ && window.__WEBVIEW_API__.sendToHost) {
          window.__WEBVIEW_API__.sendToHost('webview-ai-status-change', {
            providerId: '${providerId}',
            status: status,
            details: details
          });
        } else {
          console.error('[${providerId} Monitor] Preload API not available.');
        }
        console.log('[${providerId} Monitor] Status changed:' + status);
      }

      function checkForAIResponse() {
        let buttons = document.querySelectorAll('.items-center.justify-center button');
        let buttonElement = Array.from(buttons).find(btn => btn.textContent.trim() === '取消');
        
        if (buttonElement) {
          postStatus('ai_responding');
          if (completionTimeout) {
            clearTimeout(completionTimeout);
          }
          completionTimeout = setTimeout(() => {
            postStatus('ai_completed');
          }, 3000);
        } else {
          if (completionTimeout) {
            clearTimeout(completionTimeout);
            completionTimeout = null;
          }
          postStatus('waiting_input');
        }
      }

      intervalId = setInterval(checkForAIResponse, 3000);

      window.__AI_MONITOR__ = {
        intervalId: intervalId,
        stop: function() {
          if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
          }
          if (completionTimeout) {
            clearTimeout(completionTimeout);
            completionTimeout = null;
          }
          window.__AI_MONITOR__ = null;
          console.log('[miromind Monitor] Stopped.');
        }
      };

      console.log('[miromind Monitor] Initialized.');
      postStatus('waiting_input');
    })();
  `
}

/**
 * 通用状态监控脚本
 */
function getGenericStatusMonitorScript(providerId: string, elementSelector: string): string {
  return `
    (function() {
      if (window.__AI_MONITOR__) {
        window.__AI_MONITOR__.stop();
      }

      let lastStatus = '';
      let observer = null;
      let lastMessageElement = null;
      let completionTimeout = null;
      let lastMessageContent = '';
      let isMonitoring = false;
      let intervalId = null;

      function postStatus(status, details = {}) {
        if (status === lastStatus) return;
        lastStatus = status;
        if (window.__WEBVIEW_API__ && window.__WEBVIEW_API__.sendToHost) {
          window.__WEBVIEW_API__.sendToHost('webview-ai-status-change', {
            providerId: '${providerId}',
            status: status,
            details: details
          });
        } else {
          console.error('[${providerId} Monitor] Preload API not available.');
        }
        console.log('[${providerId} Monitor] Status changed:' + status);
      }

      function monitorMessage(element) {
        if (observer) {
          observer.disconnect();
        }
        
        lastMessageContent = element.textContent || '';

        observer = new MutationObserver((mutations) => {
          let hasContentChange = false;
          
          mutations.forEach((mutation) => {
            if (mutation.type === 'characterData' || 
                (mutation.type === 'childList' && mutation.addedNodes.length > 0)) {
              const currentContent = element.textContent || '';
              if (currentContent !== lastMessageContent) {
                hasContentChange = true;
                lastMessageContent = currentContent;
              }
            }
          });
          
          if (hasContentChange) {
            postStatus('ai_responding');
            if (completionTimeout) {
              clearTimeout(completionTimeout);
            }
            completionTimeout = setTimeout(() => {
              postStatus('ai_completed');
            }, 3000);
          }
        });

        observer.observe(element, {
          childList: true,
          subtree: true,
          characterData: true,
          attributes: false
        });
      }

      function checkForAIResponse() {
        const messageElements = document.querySelectorAll('${elementSelector}');
        const currentLastMessage = messageElements.length > 0 ? messageElements[messageElements.length - 1] : null;

        if (currentLastMessage) {
          if (currentLastMessage !== lastMessageElement) {
            lastMessageElement = currentLastMessage;
            monitorMessage(lastMessageElement);
            postStatus('ai_responding');
            if (completionTimeout) clearTimeout(completionTimeout);
            completionTimeout = setTimeout(() => {
              postStatus('ai_completed');
            }, 3000);
          }
        } else {
          if (lastMessageElement) {
            if (observer) observer.disconnect();
            observer = null;
            lastMessageElement = null;
            lastMessageContent = '';
            if (completionTimeout) clearTimeout(completionTimeout);
            postStatus('ai_completed');
          }
          postStatus('waiting_input');
        }
      }

      intervalId = setInterval(checkForAIResponse, 3000);

      window.__AI_MONITOR__ = {
        intervalId: intervalId,
        observer: observer,
        stop: function() {
          if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
          }
          if (observer) {
            observer.disconnect();
            observer = null;
          }
          if (completionTimeout) {
            clearTimeout(completionTimeout);
            completionTimeout = null;
          }
          window.__AI_MONITOR__ = null;
          console.log('[${providerId} Monitor] Stopped.');
        }
      };

      console.log('[${providerId} Monitor] Initialized.');
      postStatus('waiting_input');
    })();
  `
}

/**
 * 通用状态监控脚本
 */
function getProviderStatusMonitorScript(providerId: string): string {
  return getGenericStatusMonitorScript(providerId, '[data-test-id="chat-history-container"]')
}

/**
 * ChatGPT状态监控脚本
 */
function getChatGPTStatusMonitorScript(providerId: string): string {
  return getGenericStatusMonitorScript(providerId, '[data-message-author-role="assistant"]')
}

/**
 * mimo状态监控脚本
 */
function getMimoStatusMonitorScript(providerId: string): string {
  return getGenericStatusMonitorScript(providerId, '#message-list')
}

/**
 * minimax状态监控脚本
 */
function getMinimaxStatusMonitorScript(providerId: string): string {
  return getGenericStatusMonitorScript(providerId, '#message-container')
}

/**
 * gemini状态监控脚本
 */
function getGeminiStatusMonitorScript(providerId: string): string {
  return getGenericStatusMonitorScript(providerId, 'model-response')
}

/**
 * stepfun状态监控脚本
 */
function getStepFunStatusMonitorScript(providerId: string): string {
  return getGenericStatusMonitorScript(providerId, '.max-w-none.text-sm.leading-relaxed.text-foreground')
}

/**
 * qwen-studio状态监控脚本
 */
function getQwenStudioStatusMonitorScript(providerId: string): string {
  return getGenericStatusMonitorScript(providerId, '.custom-qwen-markdown')
}

/**
 * gemini-studio状态监控脚本
 */
function getGeminiStudioStatusMonitorScript(providerId: string): string {
  return getGenericStatusMonitorScript(providerId, '.text-chunk-host')
}

/**
 * 获取所有支持的AI提供商列表
 */
export function getSupportedProviders(): string[] {
  return [
    'doubao',
    'kimi',
    'grok',
    'deepseek',
    'qwen',
    'copilot',
    'glm',
    'yuanbao',
    'miromind',
    'gemini',
    'chatgpt',
    'mimo',
    'minimax',
    'stepfun',
    'qwen-studio',
    'gemini-studio'
  ]
}

/**
 * 检查是否支持指定的AI提供商
 */
export function isProviderSupported(providerId: string): boolean {
  return getSupportedProviders().includes(providerId)
}
