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
export function getStatusMonitorScript(providerId: string): string {
  const scripts: Record<string, (id: string) => string> = {
    doubao: getDouBaoStatusMonitorScript,
    kimi: getKimiStatusMonitorScript,
    grok: getGrokStatusMonitorScript,
    deepseek: getDeepSeekStatusMonitorScript,
    qwen: getQwenStatusMonitorScript,
    copilot: getCopilotStatusMonitorScript,
    glm: getGLMStatusMonitorScript,
    yuanbao: getYuanBaoStatusMonitorScript
  }

  const scriptGenerator = scripts[providerId]
  return scriptGenerator ? scriptGenerator(providerId) : getGenericStatusMonitorScript(providerId, '')
}

/**
 * 豆包状态监控脚本
 */
function getDouBaoStatusMonitorScript(providerId: string): string {
  return `
    (function() {
      let lastStatus = '';
      let observer = null;
      let lastMessageElement = null;
      let completionTimeout = null;
      let lastMessageContent = ''; // 跟踪消息内容变化
      let isMonitoring = false; // 防止重复监控
      let isDeepThinking = false; // 跟踪深度思考状态

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
          // Fallback or error for when preload API is not available
          console.error('[DouBao Monitor] Preload API not available.');
        }
        console.log('[DouBao Monitor] Status changed:' + status);
      }

      // 检查深度思考状态
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
        
        // 记录初始内容
        lastMessageContent = element.textContent || '';

        observer = new MutationObserver((mutations) => {
          // 检查是否有实际内容变化，排除UI变化
          let hasContentChange = false;
          
          mutations.forEach((mutation) => {
            if (mutation.type === 'characterData' || 
                (mutation.type === 'childList' && mutation.addedNodes.length > 0)) {
              // 检查变化是否影响文本内容
              const currentContent = element.textContent || '';
              if (currentContent !== lastMessageContent) {
                hasContentChange = true;
                lastMessageContent = currentContent;
              }
            }
          });
          
          // 只有内容真正变化时才触发状态更新
          if (hasContentChange) {
            postStatus('ai_responding');
            if (completionTimeout) {
              clearTimeout(completionTimeout);
            }
            completionTimeout = setTimeout(() => {
              // 检查是否仍在深度思考模式
              if (checkDeepThinkingStatus()) {
                // 如果仍在深度思考，延长超时时间
                completionTimeout = setTimeout(() => {
                  postStatus('ai_completed');
                }, 2000); // 深度思考模式下使用更长的超时时间
              } else {
                postStatus('ai_completed');
              }
            }, 3000); // 1 second of inactivity to mark as complete
          }
        });

        // 只观察内容变化，忽略样式和属性变化
        observer.observe(element, {
          childList: true,
          subtree: true,
          characterData: true,
          attributes: false // 不观察属性变化，减少UI变化干扰
        });
      }

      function checkForAIResponse() {
        // 首先检查深度思考状态
        const deepThinkingActive = checkDeepThinkingStatus();
        
        const messageElements = document.querySelectorAll(
          'div[data-testid="message_text_content"], div[data-testid="think_quota_block"]'
        );
        const currentLastMessage = messageElements.length > 0 ? messageElements[messageElements.length - 1] : null;

        if (currentLastMessage || deepThinkingActive) {
          // 如果处于深度思考模式或检测到消息，则认为是AI正在响应
          if (currentLastMessage !== lastMessageElement || deepThinkingActive) {
            if (currentLastMessage && currentLastMessage !== lastMessageElement) {
              lastMessageElement = currentLastMessage;
              monitorMessage(lastMessageElement);
            }
            postStatus('ai_responding');
            if (completionTimeout) clearTimeout(completionTimeout);
            
            // 根据是否深度思考设置不同的超时时间
            const timeoutDuration = deepThinkingActive ? 3000 : 3000;
            completionTimeout = setTimeout(() => {
              // 再次检查深度思考状态
              if (checkDeepThinkingStatus()) {
                // 如果仍在深度思考，继续等待
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

      // 降低检查频率，减少性能开销
      setInterval(checkForAIResponse, 3000);
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
function getGrokStatusMonitorScript(): string {
  return `
    (function() {
      console.log('Grok状态监控脚本已加载');
      // Grok特定的状态监控逻辑
      return {
        message: 'Grok状态监控器已启动',
        status: 'waiting_input'
      };
    })()
  `
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
function getCopilotStatusMonitorScript(): string {
  return `
    (function() {
      console.log('Copilot状态监控脚本已加载');
      // Copilot特定的状态监控逻辑
      return {
        message: 'Copilot状态监控器已启动',
        status: 'waiting_input'
      };
    })()
  `
}

/**
 * GLM状态监控脚本
 */
function getGLMStatusMonitorScript(): string {
  return getGenericStatusMonitorScript('glm', '[class="detail chatScrollContainer conversation-list"]')
}

/**
 * 元宝状态监控脚本
 */
function getYuanBaoStatusMonitorScript(): string {
  return getGenericStatusMonitorScript('yuanbao', '[class="agent-chat__list__content-wrapper"]')
}

/**
 * 通用状态监控脚本
 */
function getGenericStatusMonitorScript(providerId: string, elementSelector: string): string {
  return `
    (function() {
      let lastStatus = '';
      let observer = null;
      let lastMessageElement = null;
      let completionTimeout = null;
      let lastMessageContent = ''; // 跟踪消息内容变化
      let isMonitoring = false; // 防止重复监控

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
          // Fallback or error for when preload API is not available
          console.error('[${providerId} Monitor] Preload API not available.');
        }
        console.log('[${providerId} Monitor] Status changed:' + status);
      }

      function monitorMessage(element) {
        if (observer) {
          observer.disconnect();
        }
        
        // 记录初始内容
        lastMessageContent = element.textContent || '';

        observer = new MutationObserver((mutations) => {
          // 检查是否有实际内容变化，排除UI变化
          let hasContentChange = false;
          
          mutations.forEach((mutation) => {
            if (mutation.type === 'characterData' || 
                (mutation.type === 'childList' && mutation.addedNodes.length > 0)) {
              // 检查变化是否影响文本内容
              const currentContent = element.textContent || '';
              if (currentContent !== lastMessageContent) {
                hasContentChange = true;
                lastMessageContent = currentContent;
              }
            }
          });
          
          // 只有内容真正变化时才触发状态更新
          if (hasContentChange) {
            postStatus('ai_responding');
            if (completionTimeout) {
              clearTimeout(completionTimeout);
            }
            completionTimeout = setTimeout(() => {
              postStatus('ai_completed');
            }, 3000); // 1 second of inactivity to mark as complete
          }
        });

        // 只观察内容变化，忽略样式和属性变化
        observer.observe(element, {
          childList: true,
          subtree: true,
          characterData: true,
          attributes: false // 不观察属性变化，减少UI变化干扰
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

      // 降低检查频率，减少性能开销
      setInterval(checkForAIResponse, 3000);
      console.log('[DeepSeek Monitor] Initialized.');
      postStatus('waiting_input');
    })();
  `
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
    'yuanbao'
  ]
}

/**
 * 检查是否支持指定的AI提供商
 */
export function isProviderSupported(providerId: string): boolean {
  return getSupportedProviders().includes(providerId)
}
