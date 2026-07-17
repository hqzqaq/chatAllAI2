/**
 * AI状态监控脚本工具类
 * 提供不同AI网站的状态监控脚本，用于检测AI是否正在回复
 * 使用配置驱动模式，通过 selector 配置生成状态监控脚本
 *
 * @author huquanzhi
 * @since 2025-10-11 15:57
 * @version 2.0
 */

import { resolveScript } from './ScriptResolver'

/**
 * 消息元素选择器配置
 * key: providerId
 * value: 消息元素的 CSS 选择器
 */
const statusMonitorSelectors: Record<string, string> = {
  doubao: '[data-target-id="message-box-target-id"]',
  kimi: '[class="chat-content-list"]',
  grok: '[data-testid="assistant-message"]',
  deepseek: '.ds-markdown',
  qwen: '[class^="wrapper"]',
  copilot: '[data-content="conversation"]',
  glm: '[class="detail chatScrollContainer conversation-list"]',
  yuanbao: '[class="agent-chat__list__content-wrapper"]',
  chatgpt: '[data-message-author-role="assistant"]',
  mimo: '#message-list',
  minimax: '#message-container',
  gemini: 'model-response',
  stepfun: '.max-w-none.text-sm.leading-relaxed.text-foreground',
  'qwen-studio': '.custom-qwen-markdown',
  'gemini-studio': '.text-chunk-host'
}

/**
 * 获取AI状态监控脚本
 * @param providerId AI提供商ID
 * @returns 对应的JavaScript脚本字符串
 */
export function getStatusMonitorScript(providerId: string): string {
  let defaultScript: string

  if (providerId === 'miromind') {
    defaultScript = getMiromindStatusMonitorScript(providerId)
  } else {
    const selector = statusMonitorSelectors[providerId] || ''
    defaultScript = getGenericStatusMonitorScript(providerId, selector)
  }

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
 * miromind状态监控脚本（基于按钮检测的特殊实现）
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
 * 通用状态监控脚本（基于 DOM 元素 + MutationObserver 检测）
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
