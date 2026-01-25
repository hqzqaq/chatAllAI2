/**
 * 消息发送脚本工具类
 * 提供不同AI网站的消息发送脚本
 *
 * @author huquanzhi
 * @since 2024-12-19 14:30
 * @version 1.0
 */

/**
 * 安全转义字符串，用于JavaScript字符串字面量
 * @param str 要转义的字符串
 * @returns 转义后的安全字符串
 */
function escapeJavaScriptString(str: string): string {
  // 使用更安全的转义方式，确保字符串在JavaScript中安全使用
  return str
    .replace(/\\/g, '\\\\') // 转义反斜杠
    .replace(/\'/g, '\\\'') // 转义单引号
    .replace(/"/g, '\\"') // 转义双引号
    .replace(/\n/g, '\\n') // 转义换行符
    .replace(/\r/g, '\\r') // 转义回车符
    .replace(/\t/g, '\\t') // 转义制表符
    .replace(/\f/g, '\\f') // 转义换页符
    .replace(/\v/g, '\\v') // 转义垂直制表符
}

/**
 * 获取发送消息的脚本
 * @param providerId AI提供商ID
 * @param message 要发送的消息
 * @returns 对应的JavaScript脚本字符串
 */
export function getSendMessageScript(providerId: string, message: string): string {
  const escapedMessage = escapeJavaScriptString(message)
  const scripts: Record<string, string> = {
    kimi: getKimiScript(escapedMessage),
    grok: getGrokScript(escapedMessage),
    deepseek: getDeepSeekScript(escapedMessage),
    doubao: getDouBaoScript(escapedMessage),
    qwen: getQwenScript(escapedMessage),
    copilot: getCopilotScript(escapedMessage),
    glm: getGLMScript(escapedMessage),
    yuanbao: getYuanBaoScript(escapedMessage),
    miromind: getMiromindScript(escapedMessage),
    gemini: getGeminiScript(escapedMessage),
    chatgpt: getChatGPTScript(escapedMessage),
    mimo: getMimoScript(escapedMessage),
  }

  return scripts[providerId] || getGenericScript(escapedMessage)
}

/**
 * kimi发送脚本
 */
function getKimiScript(escapedMessage: string): string {
  return `
    (function() {
        function setKimiInputValue(text = '${escapedMessage}') {
          const input = document.querySelector('[role="textbox"][contenteditable="true"]'); 
          
          if (input) { 
              input.focus();
              document.execCommand('selectAll', false, null);
              document.execCommand('delete', false, null);
              const success = document.execCommand('insertText', false, text);
              if (success) {
                  ['input', 'change', 'keydown', 'keyup', 'keypress', 'focus', 'blur'].forEach(eventType => {
                      const event = new Event(eventType, { bubbles: true });
                      input.dispatchEvent(event);
                  });
                  return '使用execCommand成功设置文本: ' + text;
              }
          } else {
              return '未找到输入框'; 
          }
        } 

    function sendKimiMessage(text = '${escapedMessage}') {
        const result = setKimiInputValue(text);
        console.log(result);
        setTimeout(() => {
            const sendButton = document.querySelector('[class="send-button-container"]')
            
            if (sendButton && !sendButton.disabled) {
                sendButton.click();
                console.log('已点击发送按钮');
            } else {
                console.error('未找到可用的发送按钮或按钮被禁用');
                console.log('找到的按钮:', sendButton);
            }
        }, 500);
      }
      sendKimiMessage('${escapedMessage}');
      return true;
    })()
  `
}

/**
 * yuanbao发送脚本
 */
function getYuanBaoScript(escapedMessage: string): string {
  return `
    (function() {
      function setYuanbaoInputValue(text = '${escapedMessage}') {
        const input = document.querySelector('.ql-editor');
    
        if (input) {
          input.focus();
          document.execCommand('selectAll', false, null);
          document.execCommand('delete', false, null);
          const success = document.execCommand('insertText', false, text);
          if (success) {
            ['input', 'change', 'keydown', 'keyup', 'keypress', 'focus', 'blur'].forEach(eventType => {
              const event = new Event(eventType, { bubbles: true });
              input.dispatchEvent(event);
            });
            return '使用execCommand成功设置文本: ' + text;
          }
        } else {
          return '未找到输入框';
        }
      }
    
      function sendYuanbaoMessage(text = '${escapedMessage}') {
        const result = setYuanbaoInputValue(text);
        console.log(result);
        setTimeout(() => {
          const sendButton = document.querySelector('#yuanbao-send-btn')
    
          if (sendButton && !sendButton.disabled) {
            sendButton.click();
            console.log('已点击发送按钮');
          } else {
            console.error('未找到可用的发送按钮或按钮被禁用');
            console.log('找到的按钮:', sendButton);
          }
        }, 500);
      }
      sendYuanbaoMessage('${escapedMessage}');
      return true;
    })()
  `
}

/**
 * grok发送脚本
 */
function getGrokScript(escapedMessage: string): string {
  return getChatGPTScript(escapedMessage, '[contenteditable="true"]', '[type="submit"]')
}

/**
 * GLM发送脚本
 */
function getGLMScript(escapedMessage: string): string {
  return getDeepSeekScript(escapedMessage)
}

/**
 * DeepSeek发送脚本
 */
function getDeepSeekScript(escapedMessage: string): string {
  return `
    (function() {
      // --- Configuration ---
      const CHAT_INPUT_SELECTOR = 'textarea';
      const INPUT_SEND_DELAY_MS = 500;

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
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLTextAreaElement.prototype, 'value'
          ).set;
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
          console.log("[Input] Dispatched 'keydown' (Enter) after delay. Event cancellation status: " + !dispatched + '.');
        }, INPUT_SEND_DELAY_MS);

        return true;
      } catch (e) {
        console.error("[Input] Error during input simulation:", e);
        return false;
      }
    })()
  `
}

/**
 * 豆包发送脚本
 */
function getDouBaoScript(escapedMessage: string): string {
  return `
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
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLTextAreaElement.prototype, 'value'
          ).set;
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
          console.log("[Input] Dispatched 'keydown' (Enter) after delay. Event cancellation status: " + !dispatched + '.');
        }, INPUT_SEND_DELAY_MS);

        return true;
      } catch (e) {
        console.error("[Input] Error during input simulation:", e);
        return false;
      }
    })()
  `
}

/**
 * 通义千问发送脚本
 */
function getQwenScript(escapedMessage: string): string {
  return `
    (function() {
      // --- Configuration ---
      const CHAT_INPUT_SELECTOR = 'textarea';
      const INPUT_SEND_DELAY_MS = 1000;

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
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLTextAreaElement.prototype, 'value'
          ).set;
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
          console.log("[Input] Dispatched 'keydown' (Enter) after delay. Event cancellation status: " + !dispatched + '.');
        }, INPUT_SEND_DELAY_MS);

        return true;
      } catch (e) {
        console.error("[Input] Error during input simulation:", e);
        return false;
      }
    })()
  `
}

/**
 * Copilot发送脚本
 */
function getCopilotScript(escapedMessage: string): string {
  return getDeepSeekScript(escapedMessage)
}

/**
 * 通用发送脚本（用于未知提供商）
 */
function getGenericScript(escapedMessage: string): string {
  return `
    (function() {
      // 尝试多种选择器
      const selectors = [
        'textarea[placeholder*="Message"]',
        'textarea[placeholder*="消息"]',
        'textarea',
        '[contenteditable="true"]',
        '.chat-input',
        '.input-box'
      ];
      
      let inputElement = null;
      for (const selector of selectors) {
        inputElement = document.querySelector(selector);
        if (inputElement) break;
      }
      
      if (!inputElement) {
        console.error('No suitable input element found');
        return false;
      }
      
      try {
        inputElement.focus();
        
        if (inputElement.tagName === 'TEXTAREA') {
          inputElement.value = '${escapedMessage}';
        } else {
          inputElement.textContent = '${escapedMessage}';
        }
        
        inputElement.dispatchEvent(new Event('input', { bubbles: true }));
        
        // 尝试发送
        setTimeout(() => {
          const enterEvent = new KeyboardEvent('keydown', {
            bubbles: true,
            cancelable: true,
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
          });
          inputElement.dispatchEvent(enterEvent);
        }, 100);
        
        return true;
      } catch (e) {
        console.error('Error in generic script:', e);
        return false;
      }
    })()
  `
}

/**
 * Copilot发送脚本
 */
function getMiromindScript(escapedMessage: string): string {
  return getDeepSeekScript(escapedMessage)
}

/**
 * Gemini发送脚本
 */
function getGeminiScript(escapedMessage: string): string {
  return `
      (function() {
      // --- Configuration ---
      const CHAT_INPUT_SELECTOR = '[data-placeholder="Ask Gemini 3"]';
      const SEND_BUTTON_SELECTOR = '[aria-label="Send message"]';
      const INPUT_SEND_DELAY_MS = 500;

      // --- Input Handling ---
      function findChatInput() {
        const element = document.querySelector(CHAT_INPUT_SELECTOR);
        if (element) {
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
          inputElement.innerText = newValue;
        } catch (e) {
          console.error("Error setting input value using native setter or direct assignment:", e);
          if (inputElement.innerText !== newValue) {
            inputElement.value = newValue;
            console.warn("Forced input value setting after error.");
          }
        }

        // 延迟后发送Enter键事件
        setTimeout(() => {
          const sendButton = document.querySelector(SEND_BUTTON_SELECTOR);
          if (sendButton) {
            sendButton.click();
            console.log("Simulated 'click' event on send button.");
          } else {
            console.error("[Input] Send button element not found using selector:", SEND_BUTTON_SELECTOR);
          }
        }, INPUT_SEND_DELAY_MS);
        return true;
      } catch (e) {
        console.error("[Input] Error during input simulation:", e);
        return false;
      }
    })()
  `
}

/**
 * ChatGPT发送脚本
 */
function getChatGPTScript(escapedMessage: string, chatInputSelector: string = '[id="prompt-textarea"]', sendButtonSelector: string = '[data-testid="send-button"]'): string {
  return `
      (function() {
      // --- Configuration ---
      const CHAT_INPUT_SELECTOR = '${chatInputSelector}';
      const SEND_BUTTON_SELECTOR = '${sendButtonSelector}';
      const INPUT_SEND_DELAY_MS = 500;

      // --- Input Handling ---
      function findChatInput() {
        const element = document.querySelector(CHAT_INPUT_SELECTOR);
        if (element) {
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
          inputElement.innerText = newValue;
        } catch (e) {
          console.error("Error setting input value using native setter or direct assignment:", e);
          if (inputElement.innerText !== newValue) {
            inputElement.value = newValue;
            console.warn("Forced input value setting after error.");
          }
        }

        // 延迟后发送Enter键事件
        setTimeout(() => {
          const sendButton = document.querySelector(SEND_BUTTON_SELECTOR);
          if (sendButton) {
            sendButton.click();
            console.log("Simulated 'click' event on send button.");
          } else {
            console.error("[Input] Send button element not found using selector:", SEND_BUTTON_SELECTOR);
          }
        }, INPUT_SEND_DELAY_MS);
        return true;
      } catch (e) {
        console.error("[Input] Error during input simulation:", e);
        return false;
      }
    })()
  `
}

/**
 * mimo发送脚本
 */
function getMimoScript(escapedMessage: string): string {
  return getDeepSeekScript(escapedMessage)
}

/**
 * 获取所有支持的提供商列表
 */
export function getSupportedProviders(): string[] {
  return ['kimi', 'grok', 'deepseek', 'doubao', 'qwen', 'copilot', 'glm', 'yuanbao', 'miromind', 'gemini', 'chatgpt', 'mimo']
}

/**
 * 检查提供商是否支持
 */
export function isProviderSupported(providerId: string): boolean {
  return getSupportedProviders().includes(providerId)
}
