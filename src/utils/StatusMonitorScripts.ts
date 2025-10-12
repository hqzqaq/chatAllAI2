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
    // ... (add other provider script functions here if they also need the id)
  }

  const scriptGenerator = scripts[providerId]
  return scriptGenerator ? scriptGenerator(providerId) : getGenericStatusMonitorScript(providerId)
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

      function monitorMessage(element) {
        if (observer) {
          observer.disconnect();
        }

        observer = new MutationObserver(() => {
          postStatus('ai_responding');
          if (completionTimeout) {
            clearTimeout(completionTimeout);
          }
          completionTimeout = setTimeout(() => {
            postStatus('ai_completed');
          }, 1000); // 1 second of inactivity to mark as complete
        });

        observer.observe(element, {
          childList: true,
          subtree: true,
          characterData: true
        });
      }

      function checkForAIResponse() {
        const messageElements = document.querySelectorAll('div[data-testid="message_text_content"], div[data-testid="think_quota_block"]');
        const currentLastMessage = messageElements.length > 0 ? messageElements[messageElements.length - 1] : null;

        if (currentLastMessage) {
          if (currentLastMessage !== lastMessageElement) {
            lastMessageElement = currentLastMessage;
            monitorMessage(lastMessageElement);
            postStatus('ai_responding');
            if (completionTimeout) clearTimeout(completionTimeout);
            completionTimeout = setTimeout(() => {
              postStatus('ai_completed');
            }, 1000);
          }
        } else {
          if (lastMessageElement) {
            if (observer) observer.disconnect();
            observer = null;
            lastMessageElement = null;
            if (completionTimeout) clearTimeout(completionTimeout);
            postStatus('ai_completed');
          }
          postStatus('waiting_input');
        }
      }

      setInterval(checkForAIResponse, 500);
      console.log('[DouBao Monitor] Initialized.');
      postStatus('waiting_input');
    })();
  `
}

/**
 * Kimi状态监控脚本
 */
function getKimiStatusMonitorScript(): string {
  return `
    (function() {
      console.log('Kimi状态监控脚本已加载');
      // Kimi特定的状态监控逻辑
      return {
        message: 'Kimi状态监控器已启动',
        status: 'waiting_input'
      };
    })()
  `
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
function getDeepSeekStatusMonitorScript(): string {
  return `
    (function() {
      console.log('DeepSeek状态监控脚本已加载');
      // DeepSeek特定的状态监控逻辑
      return {
        message: 'DeepSeek状态监控器已启动',
        status: 'waiting_input'
      };
    })()
  `
}

/**
 * 通义千问状态监控脚本
 */
function getQwenStatusMonitorScript(): string {
  return `
    (function() {
      console.log('通义千问状态监控脚本已加载');
      // 通义千问特定的状态监控逻辑
      return {
        message: '通义千问状态监控器已启动',
        status: 'waiting_input'
      };
    })()
  `
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
  return `
    (function() {
      console.log('GLM状态监控脚本已加载');
      // GLM特定的状态监控逻辑
      return {
        message: 'GLM状态监控器已启动',
        status: 'waiting_input'
      };
    })()
  `
}

/**
 * 元宝状态监控脚本
 */
function getYuanBaoStatusMonitorScript(): string {
  return `
    (function() {
      console.log('元宝状态监控脚本已加载');
      // 元宝特定的状态监控逻辑
      return {
        message: '元宝状态监控器已启动',
        status: 'waiting_input'
      };
    })()
  `
}

/**
 * 通用状态监控脚本
 */
function getGenericStatusMonitorScript(): string {
  return `
    (function() {
      console.log('通用状态监控脚本已加载');
      // 通用状态监控逻辑
      return {
        message: '通用状态监控器已启动',
        status: 'waiting_input'
      };
    })()
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