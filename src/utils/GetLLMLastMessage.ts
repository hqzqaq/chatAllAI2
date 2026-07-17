/**
 * 获取AI最后回复消息的脚本
 * 使用配置驱动模式，通过 selector 配置生成获取最后一条消息的脚本
 *
 * @author huquanzhi
 * @since 2024-12-19 14:30
 * @version 2.0
 */

import { resolveScript } from './ScriptResolver'

/**
 * 最后一条消息选择器配置
 * key: providerId
 * value: 消息元素的 CSS 选择器
 */
const lastMessageSelectors: Record<string, string> = {
  kimi: '.segment-content',
  grok: '[data-testid="assistant-message"]',
  deepseek: '.ds-markdown',
  doubao: '[data-target-id="message-box-target-id"]',
  qwen: '.markdown-pc-special-class',
  copilot: '[data-testid="ai-message-body"]',
  glm: '.answer-content-wrap',
  yuanbao: '.agent-chat__list__item__content',
  miromind: '.report-container',
  gemini: 'model-response',
  chatgpt: '[data-message-author-role="assistant"]',
  mimo: '.markdown-prose',
  minimax: '.message-content',
  stepfun: '.max-w-none.text-sm.leading-relaxed.text-foreground',
  'qwen-studio': '.custom-qwen-markdown',
  'gemini-studio': '.text-chunk-host'
}

/**
 * 根据选择器生成获取最后一条消息的脚本
 * @param selector 消息元素的 CSS 选择器
 * @returns JavaScript 脚本字符串
 */
function createLastMessageScript(selector: string): string {
  return `(() => {
    const messages = document.querySelectorAll('${selector}');
    const lastMessage = messages[messages.length - 1];
    return lastMessage ? lastMessage.textContent || '' : '';
  })()`
}

/**
 * 获取AI最后回复消息的脚本
 * @param providerId AI提供商ID
 * @returns 对应的JavaScript脚本字符串
 */
export function getLLMLastMessageScript(providerId: string): string {
  const selector = lastMessageSelectors[providerId]
  const defaultScript = selector ? createLastMessageScript(selector) : ''
  return resolveScript(providerId, 'getLLMLastMessage', defaultScript)
}
