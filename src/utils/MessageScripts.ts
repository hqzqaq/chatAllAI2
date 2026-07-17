/**
 * 消息发送脚本工具类
 * 提供不同AI网站的消息发送脚本
 * 使用配置驱动模式，通过工厂函数生成不同类型的发送脚本
 *
 * @author huquanzhi
 * @since 2024-12-19 14:30
 * @version 2.0
 */

import { resolveScript } from './ScriptResolver'

/**
 * 安全转义字符串，用于JavaScript字符串字面量
 * 使用 JSON.stringify 进行标准化转义，确保所有特殊字符都被正确处理
 * @param str 要转义的字符串
 * @returns 转义后的安全字符串
 */
function escapeJavaScriptString(str: string): string {
  const jsonStr = JSON.stringify(str)
  return jsonStr.slice(1, -1)
}

/**
 * 发送脚本类型枚举
 */
type ScriptType =
  | 'textarea-enter' // textarea + native setter + enter发送
  | 'editable-button' // contenteditable + 按钮点击发送
  | 'exec-command-button' // execCommand + 按钮点击发送
  | 'richtext-button' // 富文本编辑器 + 按钮点击发送
  | 'editable-beforeinput' // contenteditable + beforeinput事件 + enter发送
  | 'editable-enter' // 简单 contenteditable + enter发送
  | 'macos-combo' // Mac系统兼容 + 组合键发送

/**
 * 发送脚本配置接口
 */
interface ScriptConfig {
  type: ScriptType
  inputSelector: string
  sendButtonSelector?: string
  sendDelay?: number
  useNativeSetter?: boolean
  sendAsCombo?: boolean
}

/**
 * Provider 发送脚本配置表
 */
const scriptConfigs: Record<string, ScriptConfig> = {
  deepseek: {
    type: 'textarea-enter',
    inputSelector: 'textarea',
    sendDelay: 500,
    useNativeSetter: true
  },
  doubao: {
    type: 'textarea-enter',
    inputSelector: 'textarea[placeholder]',
    sendDelay: 200,
    useNativeSetter: true
  },
  glm: {
    type: 'textarea-enter',
    inputSelector: 'textarea',
    sendDelay: 500,
    useNativeSetter: true
  },
  copilot: {
    type: 'textarea-enter',
    inputSelector: 'textarea',
    sendDelay: 500,
    useNativeSetter: true
  },
  miromind: {
    type: 'textarea-enter',
    inputSelector: 'textarea',
    sendDelay: 500,
    useNativeSetter: true
  },
  mimo: {
    type: 'textarea-enter',
    inputSelector: 'textarea',
    sendDelay: 500,
    useNativeSetter: true
  },
  stepfun: {
    type: 'textarea-enter',
    inputSelector: 'textarea',
    sendDelay: 500,
    useNativeSetter: true
  },
  'qwen-studio': {
    type: 'textarea-enter',
    inputSelector: 'textarea',
    sendDelay: 500,
    useNativeSetter: false
  },
  'gemini-studio': {
    type: 'macos-combo',
    inputSelector: 'textarea',
    sendDelay: 500,
    useNativeSetter: true
  },
  chatgpt: {
    type: 'editable-button',
    inputSelector: '[id="prompt-textarea"]',
    sendButtonSelector: '[data-testid="send-button"]',
    sendDelay: 500
  },
  grok: {
    type: 'editable-button',
    inputSelector: '[contenteditable="true"]',
    sendButtonSelector: '[type="submit"]',
    sendDelay: 500
  },
  gemini: {
    type: 'editable-button',
    inputSelector: '[data-placeholder="Ask Gemini"]',
    sendButtonSelector: '[aria-label="Send message"]',
    sendDelay: 500
  },
  kimi: {
    type: 'exec-command-button',
    inputSelector: '[role="textbox"][contenteditable="true"]',
    sendButtonSelector: '[class="send-button-container"]',
    sendDelay: 500
  },
  yuanbao: {
    type: 'richtext-button',
    inputSelector: '.ql-editor',
    sendButtonSelector: '#yuanbao-send-btn',
    sendDelay: 500
  },
  qwen: {
    type: 'editable-beforeinput',
    inputSelector: '[data-testid="chat-input-content-measure"]',
    sendDelay: 1000
  },
  minimax: {
    type: 'editable-enter',
    inputSelector: '[contenteditable="true"]',
    sendDelay: 500
  }
}

/**
 * 获取发送消息的脚本
 * @param providerId AI提供商ID
 * @param message 要发送的消息
 * @returns 对应的JavaScript脚本字符串
 */
export function getSendMessageScript(providerId: string, message: string): string {
  const escapedMessage = escapeJavaScriptString(message)
  const config = scriptConfigs[providerId]
  const defaultScript = config ? generateScript(config, escapedMessage) : getGenericScript(escapedMessage)
  return resolveScript(providerId, 'sendMessage', defaultScript, { message: escapedMessage })
}

/**
 * 根据配置生成发送脚本
 * @param config 脚本配置
 * @param escapedMessage 转义后的消息
 * @returns 生成的脚本字符串
 */
function generateScript(config: ScriptConfig, escapedMessage: string): string {
  switch (config.type) {
    case 'textarea-enter':
      return getTextareaEnterScript(
        escapedMessage,
        config.inputSelector,
        config.sendDelay ?? 500,
        config.useNativeSetter ?? true
      )
    case 'editable-button':
      return getEditableButtonScript(
        escapedMessage,
        config.inputSelector,
        config.sendButtonSelector!,
        config.sendDelay ?? 500
      )
    case 'exec-command-button':
      return getExecCommandButtonScript(
        escapedMessage,
        config.inputSelector,
        config.sendButtonSelector!,
        config.sendDelay ?? 500
      )
    case 'richtext-button':
      return getRichTextButtonScript(
        escapedMessage,
        config.inputSelector,
        config.sendButtonSelector!,
        config.sendDelay ?? 500
      )
    case 'editable-beforeinput':
      return getEditableBeforeInputScript(
        escapedMessage,
        config.inputSelector,
        config.sendDelay ?? 1000
      )
    case 'editable-enter':
      return getEditableEnterScript(
        escapedMessage,
        config.inputSelector,
        config.sendDelay ?? 500
      )
    case 'macos-combo':
      return getMacOSComboScript(
        escapedMessage,
        config.inputSelector,
        config.sendDelay ?? 500,
        config.useNativeSetter ?? true
      )
    default:
      return getGenericScript(escapedMessage)
  }
}

/**
 * Textarea + Enter 发送脚本（DeepSeek风格）
 * 使用 native setter 设置值，触发 input 事件，发送 Enter 键
 */
function getTextareaEnterScript(
  escapedMessage: string,
  inputSelector: string,
  sendDelay: number,
  useNativeSetter: boolean
): string {
  const nativeSetterCode = useNativeSetter
    ? `
        try {
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLTextAreaElement.prototype, 'value'
          ).set;
          if (nativeInputValueSetter) {
            nativeInputValueSetter.call(inputElement, newValue);
            console.log("Successfully set input value using native setter:", newValue);
          } else {
            inputElement.value = newValue;
            console.warn("Native value setter not available. Set input value using direct assignment.");
          }
        } catch (e) {
          console.error("Error setting input value using native setter:", e);
          if (inputElement.value !== newValue) {
            inputElement.value = newValue;
            console.warn("Forced input value setting after error.");
          }
        }`
    : `
        inputElement.textContent = newValue;`

  return `
    (function() {
      // --- Configuration ---
      const CHAT_INPUT_SELECTOR = '${inputSelector}';
      const INPUT_SEND_DELAY_MS = ${sendDelay};

      // --- Input Handling ---
      function findChatInput() {
        const elements = document.querySelectorAll(CHAT_INPUT_SELECTOR);
        for (const element of elements) {
          if (element.tagName === 'TEXTAREA') {
            return element;
          }
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
        ${nativeSetterCode}

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
          const status = !dispatched;
          console.log("[Input] Dispatched 'keydown' (Enter) after delay. Event cancellation status: " + status + '.');
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
 * Contenteditable + 按钮点击发送脚本（ChatGPT风格）
 */
function getEditableButtonScript(
  escapedMessage: string,
  inputSelector: string,
  sendButtonSelector: string,
  sendDelay: number
): string {
  return `
    (function() {
      // --- Configuration ---
      const CHAT_INPUT_SELECTOR = '${inputSelector}';
      const SEND_BUTTON_SELECTOR = '${sendButtonSelector}';
      const INPUT_SEND_DELAY_MS = ${sendDelay};

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
        console.error("[Input] Chat input element not found using selector:", CHAT_INPUT_SELECTOR);
        return false;
      }

      try {
        inputElement.focus();
        console.log("[Input] Focused the input element.");

        const newValue = '${escapedMessage}';

        // 设置输入值
        try {
          inputElement.innerText = newValue;
        } catch (e) {
          console.error("Error setting input value:", e);
          if (inputElement.innerText !== newValue) {
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

        // 延迟后点击发送按钮
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
 * execCommand + 按钮点击发送脚本（Kimi风格）
 */
function getExecCommandButtonScript(
  escapedMessage: string,
  inputSelector: string,
  sendButtonSelector: string,
  sendDelay: number
): string {
  return `
    (function() {
      function setInputValue(text = '${escapedMessage}') {
        const input = document.querySelector('${inputSelector}'); 
        
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

      function sendMessage(text = '${escapedMessage}') {
        const result = setInputValue(text);
        console.log(result);
        setTimeout(() => {
            const sendButton = document.querySelector('${sendButtonSelector}')
            
            if (sendButton && !sendButton.disabled) {
                sendButton.click();
                console.log('已点击发送按钮');
            } else {
                console.error('未找到可用的发送按钮或按钮被禁用');
                console.log('找到的按钮:', sendButton);
            }
        }, ${sendDelay});
      }
      sendMessage('${escapedMessage}');
      return true;
    })()
  `
}

/**
 * 富文本编辑器 + 按钮点击发送脚本（Yuanbao风格）
 */
function getRichTextButtonScript(
  escapedMessage: string,
  inputSelector: string,
  sendButtonSelector: string,
  sendDelay: number
): string {
  return `
    (function() {
      /**
       * 对HTML特殊字符进行转义，防止插入内容破坏编辑器DOM结构
       * @param {string} str 原始文本
       * @returns {string} 转义后的文本
       */
      function escapeHtml(str) {
        return str
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
      }

      function setInputValue(text = '${escapedMessage}') {
        const input = document.querySelector('${inputSelector}');

        if (!input) {
          return '未找到输入框';
        }

        input.focus();
        document.execCommand('selectAll', false, null);
        document.execCommand('delete', false, null);

        // 将文本按换行符分割，每行用<p>包裹后通过 insertHTML 插入。
        const lines = text.split('\\n');
        const html = lines.map(line => '<p>' + escapeHtml(line) + '</p>').join('');
        const success = document.execCommand('insertHTML', false, html);

        if (success) {
          ['input', 'change', 'keydown', 'keyup', 'keypress', 'focus', 'blur'].forEach(eventType => {
            const event = new Event(eventType, { bubbles: true });
            input.dispatchEvent(event);
          });
          return '使用execCommand成功设置文本';
        }
        return '设置文本失败';
      }

      function sendMessage(text = '${escapedMessage}') {
        const result = setInputValue(text);
        console.log(result);
        setTimeout(() => {
          const sendButton = document.querySelector('${sendButtonSelector}')

          if (sendButton && !sendButton.disabled) {
            sendButton.click();
            console.log('已点击发送按钮');
          } else {
            console.error('未找到可用的发送按钮或按钮被禁用');
            console.log('找到的按钮:', sendButton);
          }
        }, ${sendDelay});
      }
      sendMessage('${escapedMessage}');
      return true;
    })()
  `
}

/**
 * Contenteditable + beforeinput事件 + Enter发送脚本（Qwen风格）
 */
function getEditableBeforeInputScript(
  escapedMessage: string,
  inputSelector: string,
  sendDelay: number
): string {
  return `
    (function() {
      // --- Configuration ---
      const CHAT_INPUT_SELECTOR = '${inputSelector}';
      const INPUT_SEND_DELAY_MS = ${sendDelay};

      // --- Input Handling ---
      function findChatInputContainer() {
        return document.querySelector(CHAT_INPUT_SELECTOR);
      }

      function resolveEditableElement(container) {
        if (!container) {
          return null;
        }
        if (container.isContentEditable) {
          return container;
        }
        const editableChild = container.querySelector('[contenteditable="true"]');
        if (editableChild) {
          return editableChild;
        }
        const textboxChild = container.querySelector('[role="textbox"]');
        if (textboxChild) {
          return textboxChild;
        }
        return container;
      }

      function isInputElement(element) {
        return element && (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT');
      }

      function setNativeValue(element, value) {
        if (element.isContentEditable) {
          element.textContent = value;
          return;
        }

        if (!isInputElement(element)) {
          element.textContent = value;
          return;
        }

        const targetPrototype = element.tagName === 'TEXTAREA'
          ? window.HTMLTextAreaElement.prototype
          : window.HTMLInputElement.prototype;

        try {
          const descriptor = Object.getOwnPropertyDescriptor(targetPrototype, 'value');
          if (descriptor && descriptor.set) {
            descriptor.set.call(element, value);
            return;
          }
        } catch (e) {
          console.warn('[Input] Native value setter failed, falling back to direct assignment:', e);
        }

        element.value = value;
      }

      function dispatchInputEvents(element, value) {
        if (element.isContentEditable) {
          // Slate 等富文本编辑器依赖 beforeinput 事件更新内部状态
          element.dispatchEvent(new InputEvent('beforeinput', {
            bubbles: true,
            cancelable: true,
            inputType: 'insertText',
            data: value,
            isComposing: false,
          }));
        }

        element.dispatchEvent(new InputEvent('input', {
          bubbles: true,
          cancelable: false,
          inputType: 'insertText',
          data: value,
          isComposing: false,
        }));
      }

      const inputContainer = findChatInputContainer();

      if (!inputContainer) {
        console.error("[Input] Chat input element not found using selector:", CHAT_INPUT_SELECTOR);
        return false;
      }

      const inputElement = resolveEditableElement(inputContainer);

      try {
        inputElement.focus();
        console.log("[Input] Focused the input element.", inputElement.tagName, inputElement.isContentEditable);

        const newValue = '${escapedMessage}';
        setNativeValue(inputElement, newValue);
        dispatchInputEvents(inputElement, newValue);
        console.log("[Input] Set input value to:", newValue);

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
          const eventStatus = !dispatched;
          console.log("[Input] Dispatched 'keydown' (Enter) after delay. Event cancellation status: " + eventStatus + '.');
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
 * 简单 contenteditable + Enter 发送脚本（Minimax风格）
 */
function getEditableEnterScript(
  escapedMessage: string,
  inputSelector: string,
  sendDelay: number
): string {
  return `
    (function() {
      // --- Configuration ---
      const CHAT_INPUT_SELECTOR = '${inputSelector}';
      const INPUT_SEND_DELAY_MS = ${sendDelay};

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
        console.error("[Input] Chat input element not found using selector:", CHAT_INPUT_SELECTOR);
        return false;
      }

      try {
        inputElement.focus();
        console.log("[Input] Focused the input element.");

        const newValue = '${escapedMessage}';
        inputElement.textContent = newValue;

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
          const keyStatus = !dispatched;
          console.log("[Input] Dispatched 'keydown' (Enter) after delay. Event cancellation status: " + keyStatus + '.');
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
 * Mac系统兼容 + 组合键发送脚本（Gemini Studio风格）
 */
function getMacOSComboScript(
  escapedMessage: string,
  inputSelector: string,
  sendDelay: number,
  useNativeSetter: boolean
): string {
  const setterCode = useNativeSetter
    ? `
      try {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype, 'value'
        ).set;
        if (nativeInputValueSetter) {
          nativeInputValueSetter.call(inputElement, newValue);
          console.log("Successfully set input value using native setter.");
        } else {
          inputElement.value = newValue;
          console.warn("Native value setter not available. Using direct assignment.");
        }
      } catch (e) {
        console.error("Error setting input value:", e);
        inputElement.value = newValue;
      }`
    : `
      inputElement.value = newValue;`

  return `
    (function() {
      // --- Configuration ---
      const CHAT_INPUT_SELECTOR = '${inputSelector}';
      const INPUT_SEND_DELAY_MS = ${sendDelay};

      // --- Utility: 检测是否为 Mac ---
      const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);

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
        console.log("[Input] Focused the textarea element. OS detected as:", isMac ? "Mac" : "Windows/Other");

        const newValue = '${escapedMessage}';

        // 设置值
        ${setterCode}

        // 触发 input 事件
        const inputEvent = new Event('input', {
          bubbles: true,
          cancelable: false,
        });
        inputElement.dispatchEvent(inputEvent);

        // 延迟后发送组合键事件
        setTimeout(() => {
          // 构造键盘事件
          // Mac: metaKey = true (Command)
          // Win/Linux: ctrlKey = true (Control)
          const enterEvent = new KeyboardEvent('keydown', {
            bubbles: true,
            cancelable: true,
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            ctrlKey: !isMac,
            metaKey: isMac
          });

          inputElement.dispatchEvent(enterEvent);
          
          // 某些复杂的 Web 应用可能还需要 dispatch 'keyup' 才能触发发送
          const upEvent = new KeyboardEvent('keyup', {
            bubbles: true,
            cancelable: true,
            key: 'Enter',
            code: 'Enter',
            ctrlKey: !isMac,
            metaKey: isMac
          });
          inputElement.dispatchEvent(upEvent);
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
 * 通用发送脚本（用于未知提供商）
 * 尝试多种选择器，优先使用 textarea
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
