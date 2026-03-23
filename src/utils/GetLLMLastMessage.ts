/**
 * 获取发送消息的脚本
 * @param providerId AI提供商ID
 * @returns 对应的JavaScript脚本字符串
 */
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
  }

  const scriptGenerator = scripts[providerId]
  return scriptGenerator ? scriptGenerator() : ''
}

function getKimiLastMessageScript(): string {
  return ''
}

function getGrokLastMessageScript(): string {
  return ''
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
    const messages = document.querySelectorAll('[data-testid="receive_message"]');
    const lastMessage = messages[messages.length - 1];
    return lastMessage ? lastMessage.textContent || '' : '';
  })()`
}

function getQwenLastMessageScript(): string {
  return ''
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
  return ''
}

function getMiromindLastMessageScript(): string {
  return `(() => {
    const messages = document.querySelectorAll('.report-container');
    const lastMessage = messages[messages.length - 1];
    return lastMessage ? lastMessage.textContent || '' : '';
  })()`
}

function getGeminiLastMessageScript(): string {
  return ''
}

function getChatGPTLastMessageScript(): string {
  return ''
}

function getMimoLastMessageScript(): string {
  return ''
}