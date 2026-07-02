/**
 * 登录状态检查脚本工具类
 * 提供不同AI网站的登录状态检查脚本
 *
 * @author huquanzhi
 * @since 2024-12-19 14:30
 * @version 1.0
 */

/**
 * 获取登录状态检查脚本
 * @param providerId AI提供商ID
 * @returns 对应的JavaScript脚本字符串
 */
import { resolveScript } from './ScriptResolver'

export function getLoginCheckScript(providerId: string): string {
  const scripts: Record<string, string> = {
    kimi: `
      // 检查是否存在用户头像或登录相关元素
      !!(
        document.querySelector(".user-info") && 
        !["登录", "Log In"].includes(document.querySelector(".user-info").innerText.trim())
      )
    `,
    grok: `
      // 检查grok的登录状态
      // 如果 [data-slot="button"] 元素中存在 textContent 为"登录"的按钮，则认为未登录
      !Array.from(document.querySelectorAll('[data-slot="button"]'))
        .some(el => el.textContent && el.textContent.trim() === '登录')
    `,
    deepseek: `
      // 检查DeepSeek的登录状态
      !(document.querySelector('.ds-sign-up-form__register-button') && 
      document.querySelector('.ds-sign-up-form__register-button').textContent.trim() === '登录')
    `,
    doubao: `
      // 检查豆包的登录状态
      // 如果 .semi-button-content 元素存在且文本包含"登录"，则认为未登录
      !Array.from(document.querySelectorAll('.semi-button-content'))
        .some(el => el.textContent && el.textContent.includes('登录'))
    `,
    qwen: `
      // 检查通义千问的登录状态
      !Array.from(document.querySelectorAll('button'))
        .some(btn => btn.textContent.trim() === '立即登录')
    `,
    copilot: `
      !document.querySelector('[data-testid="sign-in-exp-landing-header-button"]')
    `,
    glm: '!document.querySelector(".login-btn")',
    yuanbao: `
      // 检查yuanbao的登录状态
      !(document.querySelector('.agent-dialogue__tool__login') && 
      (document.querySelector('.agent-dialogue__tool__login').textContent === '登录'))
    `,
    miromind: `
      !((document.querySelector('[class="ant-space-item"]')) &&   
      (document.querySelector('[class="ant-space-item"]').innerText === '登录'))
    `,
    gemini: `
      !document.querySelector('[data-test-id="sign-in-button"]')
    `,
    chatgpt: `
      !!document.querySelector('[data-testid="login-button"]')
    `,
    mimo: `
      !Array.from(document.querySelectorAll('[type="button"]'))
                   .some(btn => btn.textContent.trim() === '立即登录');
    `,
    minimax: `
      !Array.from(document.querySelectorAll('button'))
        .some(btn => btn.textContent.trim() === '登 录')
    `,
    stepfun: `
      document.querySelector('[aria-label="登录"]')
    `,
    'qwen-studio': `
      !Array.from(document.querySelectorAll('.qwen-chat-button-content'))
        .some(btn => btn.textContent.trim() === '登录' || btn.textContent.trim() === 'Sign in')
    `
  }

  return resolveScript(providerId, 'loginCheck', scripts[providerId] || '(() => { try { return false; } catch (e) { return false; } })()')
}
