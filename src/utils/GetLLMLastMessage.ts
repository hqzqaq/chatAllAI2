/**
 * 获取发送消息的脚本
 * @param providerId AI提供商ID
 * @returns 对应的JavaScript脚本字符串
 */
import { resolveScript } from './ScriptResolver'

export function getSendMessageScript(providerId: string): string {
  const scripts: Record<string, () => string> = {
    kimi: () => getKimiLastMessageScript(),
    grok: () => getGrokLastMessageScript(),
    deepseek: () => getDeepSeekLastMessageScript(),
    doubao: () => getDouBaoLastMessageScript(),
    qwen: () => getQwenLastMessageScript(),
    copilot: () => getCopilotLastMessageScript(),
    glm: () => getGLMLastMessageScript(),
    yuanbao: () => getYuanBaoLastMessageScript(),
    miromind: () => getMiromindLastMessageScript(),
    gemini: () => getGeminiLastMessageScript(),
    chatgpt: () => getChatGPTLastMessageScript(),
    mimo: () => getMimoLastMessageScript(),
    minimax: () => getMinimaxLastMessageScript()
  }

  const scriptGenerator = scripts[providerId]
  const defaultScript = scriptGenerator ? scriptGenerator() : ''
  return resolveScript(providerId, 'getLLMLastMessage', defaultScript)
}

function getKimiLastMessageScript(): string {
  return `(() => {
    const messages = document.querySelectorAll('.segment-content');
    const lastMessage = messages[messages.length - 1];
    return lastMessage ? lastMessage.textContent || '' : '';
  })()`
}

function getGrokLastMessageScript(): string {
  return `(() => {
    const messages = document.querySelectorAll('[data-testid="assistant-message"]');
    const lastMessage = messages[messages.length - 1];
    return lastMessage ? lastMessage.textContent || '' : '';
  })()`
}

function getDeepSeekLastMessageScript(): string {
  return `(() => {
    const messages = document.querySelectorAll('.ds-markdown');
    const lastMessage = messages[messages.length - 1];
    return lastMessage ? lastMessage.textContent || '' : '';
  })()`
}

function getDouBaoLastMessageScript(): string {
  return `(() => {
    const messages = document.querySelectorAll('[data-target-id="message-box-target-id"]');
    const lastMessage = messages[messages.length - 1];
    return lastMessage ? lastMessage.textContent || '' : '';
  })()`
}

function getQwenLastMessageScript(): string {
  return `(() => {
    const messages = document.querySelectorAll('.markdown-pc-special-class');
    const lastMessage = messages[messages.length - 1];
    return lastMessage ? lastMessage.textContent || '' : '';
  })()`
}

function getCopilotLastMessageScript(): string {
  return ''
}

function getGLMLastMessageScript(): string {
  return `(() => {
    const messages = document.querySelectorAll('.answer-content-wrap');
    const lastMessage = messages[messages.length - 1];
    return lastMessage ? lastMessage.textContent || '' : '';
  })()`
}

function getYuanBaoLastMessageScript(): string {
  return `(() => {
    const messages = document.querySelectorAll('.agent-chat__list__item__content');
    const lastMessage = messages[messages.length - 1];
    return lastMessage ? lastMessage.textContent || '' : '';
  })()`
}

function getMiromindLastMessageScript(): string {
  return `(() => {
    const messages = document.querySelectorAll('.report-container');
    const lastMessage = messages[messages.length - 1];
    return lastMessage ? lastMessage.textContent || '' : '';
  })()`
}

function getGeminiLastMessageScript(): string {
  return `(() => {
    const messages = document.querySelectorAll('model-response');
    const lastMessage = messages[messages.length - 1];
    return lastMessage ? lastMessage.textContent || '' : '';
  })()`
}

function getChatGPTLastMessageScript(): string {
  return `(() => {
    const messages = document.querySelectorAll('[data-message-author-role="assistant"]');
    const lastMessage = messages[messages.length - 1];
    return lastMessage ? lastMessage.textContent || '' : '';
  })()`
}

function getMimoLastMessageScript(): string {
  return `(() => {
    const messages = document.querySelectorAll('.markdown-prose');
    const lastMessage = messages[messages.length - 1];
    return lastMessage ? lastMessage.textContent || '' : '';
  })()`
}

function getMinimaxLastMessageScript(): string {
  return `(() => {
    const messages = document.querySelectorAll('.message-content');
    const lastMessage = messages[messages.length - 1];
    return lastMessage ? lastMessage.textContent || '' : '';
  })()`
}
