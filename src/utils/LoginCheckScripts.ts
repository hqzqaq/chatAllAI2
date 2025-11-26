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
export function getLoginCheckScript(providerId: string): string {
  const scripts: Record<string, string> = {
    kimi: `
      // 检查是否存在用户头像或登录相关元素
      !!(document.querySelector("[class='user-name']") && 
      document.querySelector("[class='user-name']").innerText != '登录')
    `,
    grok: `
      // 检查grok的登录状态
      !!(document.querySelector('[data-ved]') ||
         document.querySelector('.gb_d') ||
         document.querySelector('[aria-label*="Account"]') ||
         document.querySelector('[alt="pfp"]'))
    `,
    deepseek: `
      // 检查DeepSeek的登录状态
      !(document.querySelector('.ds-sign-up-form__register-button') && 
      document.querySelector('.ds-sign-up-form__register-button').textContent.trim() === '登录')
    `,
    doubao: `
      // 检查豆包的登录状态
      !!(document.querySelector("[data-testid='chat_header_avatar_button']"))
    `,
    qwen: `
      // 检查通义千问的登录状态
      !Array.from(document.querySelectorAll('button'))
        .some(btn => btn.textContent.trim() === '立即登录')
    `,
    copilot: `
      // 检查Copilot的登录状态
      !(document.querySelector('[alt="Profile image"]'))
    `,
    glm: `
      // 检查GLM的登录状态
      !((document.querySelector(".login-btn") && 
      document.querySelector(".login-btn").textContent === '登录') ||
      (document.querySelector(".submit-btn") && document.querySelector(".submit-btn").textContent === '登录'))
      `,
    yuanbao: `
      // 检查yuanbao的登录状态
      !(document.querySelector('.agent-dialogue__tool__login') && 
      (document.querySelector('.agent-dialogue__tool__login').textContent === '登录'))
    `
  }

  return scripts[providerId] || 'false'
}
